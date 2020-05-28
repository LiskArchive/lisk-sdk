/*
 * Copyright © 2019 Lisk Foundation
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
 *
 */

import { BaseTransaction, StateStore } from './base_transaction';
import { MAX_INT64 } from './constants';
import { TransactionError } from './errors';
import { sortUnlocking } from './utils';
import { BaseTransactionInput } from './types';

export interface Vote {
	readonly delegateAddress: Buffer;
	readonly amount: bigint;
}

export interface RawAssetVote {
	readonly delegateAddress: string;
	readonly amount: string;
}

export interface VoteAsset {
	readonly votes: ReadonlyArray<Vote>;
}

const voteAssetSchema = {
	$id: 'lisk/vote-transaction',
	type: 'object',
	required: ['votes'],
	properties: {
		votes: {
			type: 'array',
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

const TEN_UNIT = BigInt(10) * BigInt(10) ** BigInt(8);
const MAX_VOTE = 10;
const MAX_UNLOCKING = 20;

export class VoteTransaction extends BaseTransaction {
	public static TYPE = 13;
	public static ASSET_SCHEMA = voteAssetSchema;
	public readonly asset: VoteAsset;

	public constructor(transaction: BaseTransactionInput<VoteAsset>) {
		super(transaction);

		this.asset = transaction.asset;
	}

	protected validateAsset(): ReadonlyArray<TransactionError> {
		const errors = [];
		let upvoteCount = 0;
		let downvoteCount = 0;
		const addressSet = new Set();
		for (const vote of this.asset.votes) {
			addressSet.add(vote.delegateAddress);
			if (vote.amount > BigInt(0)) {
				upvoteCount += 1;
			} else if (vote.amount < BigInt(0)) {
				downvoteCount += 1;
			} else {
				errors.push(
					new TransactionError(
						'Amount cannot be 0',
						this.id,
						'.asset.votes.amount',
					),
				);
			}
			if (vote.amount % TEN_UNIT !== BigInt(0)) {
				errors.push(
					new TransactionError(
						'Amount should be multiple of 10 * 10^8',
						this.id,
						'.asset.votes.amount',
						vote.amount.toString(),
					),
				);
			}
		}
		if (upvoteCount > MAX_VOTE) {
			errors.push(
				new TransactionError(
					'Upvote can only be casted upto 10',
					this.id,
					'.asset.votes',
					upvoteCount,
					'10',
				),
			);
		}
		if (downvoteCount > MAX_VOTE) {
			errors.push(
				new TransactionError(
					'Downvote can only be casted upto 10',
					this.id,
					'.asset.votes',
					upvoteCount,
					'10',
				),
			);
		}
		if (addressSet.size !== this.asset.votes.length) {
			errors.push(
				new TransactionError(
					'Delegate address must be unique',
					this.id,
					'.asset.votes.delegateAddress',
				),
			);
		}

		return errors;
	}

	protected async applyAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>> {
		// Only order should be change, so no need to copy object itself
		const assetCopy = [...this.asset.votes];
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
		const errors = [];

		for (const vote of assetCopy) {
			const sender = await store.account.get(this.senderId);
			const votedDelegate = await store.account.getOrDefault(
				vote.delegateAddress,
			);

			if (!votedDelegate.username) {
				errors.push(
					new TransactionError(
						'Voted delegate is not registered',
						this.id,
						'.asset.votes.delegateAddress',
					),
				);
				// eslint-disable-next-line no-continue
				continue;
			}
			if (vote.amount < BigInt(0)) {
				const originalUpvoteIndex = sender.votes.findIndex(
					senderVote => senderVote.delegateAddress.equals(vote.delegateAddress),
				);
				if (originalUpvoteIndex < 0) {
					errors.push(
						new TransactionError(
							'Cannot cast downvote to delegate who is not upvoted',
							this.id,
							'.asset.votes.delegateAddress',
						),
					);
					// eslint-disable-next-line no-continue
					continue;
				}
				sender.votes[originalUpvoteIndex].amount += vote.amount;
				if (sender.votes[originalUpvoteIndex].amount < BigInt(0)) {
					errors.push(
						new TransactionError(
							'Cannot downvote more than upvoted',
							this.id,
							'.asset.votes.amount',
						),
					);
				}
				// Delete entry when amount becomes 0
				if (sender.votes[originalUpvoteIndex].amount === BigInt(0)) {
					sender.votes = sender.votes.filter(
						senderVote => senderVote.delegateAddress !== vote.delegateAddress,
					);
				}
				// Create unlocking object
				sender.unlocking.push({
					delegateAddress: vote.delegateAddress,
					amount: BigInt(-1) * vote.amount,
					unvoteHeight: store.chain.lastBlockHeader.height + 1,
				});
				// Sort account.unlocking
				sortUnlocking(sender.unlocking);

				// Unlocking object should not exceed maximum
				if (sender.unlocking.length > MAX_UNLOCKING) {
					errors.push(
						new TransactionError(
							`Cannot downvote which exceeds account.unlocking to have more than ${MAX_UNLOCKING.toString()}`,
							this.id,
							'.asset.votes',
						),
					);
				}
			} else {
				// Upvote amount case
				const originalUpvoteIndex = sender.votes.findIndex(
					senderVote => senderVote.delegateAddress === vote.delegateAddress,
				);
				const index =
					originalUpvoteIndex > -1 ? originalUpvoteIndex : sender.votes.length;
				const upvote =
					originalUpvoteIndex > -1
						? sender.votes[originalUpvoteIndex]
						: {
							delegateAddress: vote.delegateAddress,
							amount: BigInt(0),
						};
				upvote.amount += vote.amount;
				// Special case for postgres because maximum is int64 for bigint in postgres
				if (upvote.amount > BigInt(MAX_INT64)) {
					errors.push(
						new TransactionError(
							'Cannot upvote which exceeds int64',
							this.id,
							'.asset.votes.amount',
						),
					);
				}
				// Balance is checked in the base transaction
				sender.balance -= vote.amount;
				sender.votes[index] = upvote;
				// Sort account.votes
				sender.votes.sort((a, b) =>
					a.delegateAddress.compare(b.delegateAddress),
				);
				if (sender.votes.length > MAX_VOTE) {
					errors.push(
						new TransactionError(
							`Account can only vote upto ${MAX_VOTE.toString()}`,
							this.id,
							'.asset.votes.amount',
						),
					);
				}
			}
			store.account.set(sender.address, sender);
			// In case of self-vote, sender needs to be set and re-fetched to reflect both account change
			const delegate = await store.account.get(vote.delegateAddress);
			delegate.totalVotesReceived += vote.amount;
			store.account.set(delegate.address, delegate);
		}

		return errors;
	}

	protected async undoAsset(
		store: StateStore,
	): Promise<ReadonlyArray<TransactionError>> {
		const assetCopy = [...this.asset.votes];
		// Sort by descending amount
		assetCopy.sort((a, b) => {
			const diff = b.amount - a.amount;
			if (diff > BigInt(0)) {
				return 1;
			}
			if (diff < BigInt(0)) {
				return -1;
			}

			return 0;
		});
		for (const vote of assetCopy) {
			const sender = await store.account.get(this.senderId);
			if (vote.amount < BigInt(0)) {
				const originalUpvoteIndex = sender.votes.findIndex(
					senderVote => senderVote.delegateAddress === vote.delegateAddress,
				);
				const index =
					originalUpvoteIndex > -1 ? originalUpvoteIndex : sender.votes.length;
				// If upvote does not exist anymore, it needs to re-adde them
				const upvote =
					originalUpvoteIndex > -1
						? sender.votes[originalUpvoteIndex]
						: {
							delegateAddress: vote.delegateAddress,
							amount: BigInt(0),
						};
				// Add back the vote
				upvote.amount += vote.amount * BigInt(-1);
				sender.votes[index] = upvote;

				// Remove unlocking object
				const unlockingIndex = sender.unlocking.findIndex(
					unlock =>
						unlock.delegateAddress === vote.delegateAddress &&
						unlock.amount === vote.amount * BigInt(-1) &&
						unlock.unvoteHeight === store.chain.lastBlockHeader.height + 1,
				);
				if (unlockingIndex < 0) {
					throw new Error(
						'Invalid data. unlocking object should exist while undo',
					);
				}
				sender.unlocking.splice(unlockingIndex, 1);

				// Sort votes in case of reading
				sender.votes.sort((a, b) =>
					a.delegateAddress.compare(b.delegateAddress),
				);
				// Sort account.unlocking
				sortUnlocking(sender.unlocking);
			} else {
				const originalUpvoteIndex = sender.votes.findIndex(
					senderVote => senderVote.delegateAddress === vote.delegateAddress,
				);
				if (originalUpvoteIndex < 0) {
					throw new Error('Invalid data. Upvote should exist while undo');
				}
				sender.votes[originalUpvoteIndex].amount -= vote.amount;
				if (sender.votes[originalUpvoteIndex].amount === BigInt(0)) {
					sender.votes.splice(originalUpvoteIndex, 1);
				}
				sender.balance += vote.amount;
				// Sort account.votes
				sender.votes.sort((a, b) =>
					a.delegateAddress.compare(b.delegateAddress),
				);
			}
			store.account.set(sender.address, sender);
			// In case of self-vote, sender needs to be set and re-fetched to reflect both account change
			const delegate = await store.account.get(vote.delegateAddress);
			delegate.totalVotesReceived += vote.amount * BigInt(-1);
			store.account.set(delegate.address, delegate);
		}

		return [];
	}
}
