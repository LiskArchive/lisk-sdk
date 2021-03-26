/*
 * Copyright © 2020 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

import { BaseAsset } from '../../base_asset';
import { ValidationError } from '../../../errors';
import { MAX_UNLOCKING, MAX_VOTE, TEN_UNIT } from '../constants';
import { DPOSAccountProps, VoteTransactionAssetContext } from '../types';
import { sortUnlocking } from '../utils';
import { ApplyAssetContext, ValidateAssetContext } from '../../../types';

export class VoteTransactionAsset extends BaseAsset<VoteTransactionAssetContext> {
	public name = 'voteDelegate';
	public id = 1;
	public schema = {
		$id: 'lisk/dpos/vote',
		type: 'object',
		required: ['votes'],
		properties: {
			votes: {
				type: 'array',
				minItems: 1,
				maxItems: 20,
				items: {
					type: 'object',
					required: ['delegateAddress', 'amount'],
					properties: {
						delegateAddress: {
							dataType: 'bytes',
							fieldNumber: 1,
							minLength: 20,
							maxLength: 20,
						},
						amount: {
							dataType: 'sint64',
							fieldNumber: 2,
						},
					},
				},
				fieldNumber: 1,
			},
		},
	};

	public validate({ asset }: ValidateAssetContext<VoteTransactionAssetContext>): void {
		let upVoteCount = 0;
		let downVoteCount = 0;
		const addressSet: { [addressStr: string]: boolean } = {};

		for (const vote of asset.votes) {
			addressSet[vote.delegateAddress.toString('hex')] = true;

			if (vote.amount === BigInt(0)) {
				throw new ValidationError('Amount cannot be 0.', '');
			}

			if (vote.amount % TEN_UNIT !== BigInt(0)) {
				throw new ValidationError(
					'Amount should be multiple of 10 * 10^8.',
					vote.amount.toString(),
				);
			}

			if (vote.amount > BigInt(0)) {
				upVoteCount += 1;
			} else if (vote.amount < BigInt(0)) {
				downVoteCount += 1;
			}
		}

		if (upVoteCount > MAX_VOTE) {
			throw new ValidationError('Upvote can only be casted upto 10.', upVoteCount.toString());
		}

		if (downVoteCount > MAX_VOTE) {
			throw new ValidationError('Downvote can only be casted upto 10.', downVoteCount.toString());
		}

		if (Object.keys(addressSet).length !== asset.votes.length) {
			throw new ValidationError(
				'Delegate address must be unique.',
				asset.votes.map(v => v.delegateAddress.toString('hex')).join(),
			);
		}
	}

	public async apply({
		asset,
		transaction,
		stateStore: store,
		reducerHandler,
	}: ApplyAssetContext<VoteTransactionAssetContext>): Promise<void> {
		// Only order should be change, so no need to copy object itself
		const assetCopy = [...asset.votes];

		// Sort by ascending amount
		assetCopy.sort((a, b) => {
			const diff = a.amount - b.amount;
			if (diff > BigInt(0)) {
				return 1;
			}
			if (diff < BigInt(0)) {
				return -1;
			}

			return 0;
		});

		for (const vote of assetCopy) {
			const sender = await store.account.get<DPOSAccountProps>(transaction.senderAddress);
			const votedDelegate = await store.account.get<DPOSAccountProps>(vote.delegateAddress);

			if (votedDelegate.dpos.delegate.username === '') {
				throw new Error(
					`Voted delegate address ${votedDelegate.address.toString('hex')} is not registered.`,
				);
			}

			if (vote.amount < BigInt(0)) {
				const originalUpvoteIndex = sender.dpos.sentVotes.findIndex(senderVote =>
					senderVote.delegateAddress.equals(vote.delegateAddress),
				);

				if (originalUpvoteIndex < 0) {
					throw new Error('Cannot cast downvote to delegate who is not upvoted.');
				}

				sender.dpos.sentVotes[originalUpvoteIndex].amount += vote.amount;

				if (sender.dpos.sentVotes[originalUpvoteIndex].amount < BigInt(0)) {
					throw new Error('The downvote amount cannot be greater than upvoted amount.');
				}

				// Delete entry when amount becomes 0
				if (sender.dpos.sentVotes[originalUpvoteIndex].amount === BigInt(0)) {
					sender.dpos.sentVotes = sender.dpos.sentVotes.filter(
						senderVote => !senderVote.delegateAddress.equals(vote.delegateAddress),
					);
				}

				// Create unlocking object
				// Amount is converted to +BigInt for unlocking
				sender.dpos.unlocking.push({
					delegateAddress: vote.delegateAddress,
					amount: BigInt(-1) * vote.amount,
					unvoteHeight: store.chain.lastBlockHeaders[0].height + 1,
				});

				// Sort account.unlocking
				sortUnlocking(sender.dpos.unlocking);

				// Unlocking object should not exceed maximum
				if (sender.dpos.unlocking.length > MAX_UNLOCKING) {
					throw new Error(
						`Cannot downvote which exceeds account.dpos.unlocking to have more than ${MAX_UNLOCKING.toString()}.`,
					);
				}
			} else {
				// Upvote amount case
				const originalUpvoteIndex = sender.dpos.sentVotes.findIndex(senderVote =>
					senderVote.delegateAddress.equals(vote.delegateAddress),
				);
				const index = originalUpvoteIndex > -1 ? originalUpvoteIndex : sender.dpos.sentVotes.length;
				const upvote =
					originalUpvoteIndex > -1
						? sender.dpos.sentVotes[originalUpvoteIndex]
						: {
								delegateAddress: vote.delegateAddress,
								amount: BigInt(0),
						  };
				upvote.amount += vote.amount;

				// Balance is checked in the token module
				await reducerHandler.invoke('token:debit', {
					address: transaction.senderAddress,
					amount: vote.amount,
				});

				sender.dpos.sentVotes[index] = upvote;

				// Sort account.votes
				sender.dpos.sentVotes.sort((a, b) => a.delegateAddress.compare(b.delegateAddress));
				if (sender.dpos.sentVotes.length > MAX_VOTE) {
					throw new Error(`Account can only vote upto ${MAX_VOTE.toString()}.`);
				}
			}

			await store.account.set(sender.address, sender);

			// In case of self-vote, sender needs to be set and re-fetched to reflect both account change
			const delegate = await store.account.get<DPOSAccountProps>(vote.delegateAddress);
			delegate.dpos.delegate.totalVotesReceived += vote.amount;
			await store.account.set(delegate.address, delegate);
		}
	}
}
