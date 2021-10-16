/*
 * Copyright © 2021 Lisk Foundation
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

import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { dataStructures } from '@liskhq/lisk-utils';
import { ValidationError } from '../../../errors';
import {
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
	CommandExecuteContext,
} from '../../../node/state_machine/types';
import { BaseCommand } from '../../base_command';
import {
	COMMAND_ID_VOTE,
	MAX_UNLOCKING,
	MAX_VOTE,
	STORE_PREFIX_DELEGATE,
	STORE_PREFIX_VOTER,
	TEN_UNIT,
} from '../constants';
import { delegateStoreSchema, voteCommandParamsSchema, voterStoreSchema } from '../schemas';
import {
	DelegateAccount,
	TokenAPI,
	TokenIDDPoS,
	VoteCommandDependencies,
	VoteTransactionParams,
} from '../types';
import { getDefaultVoter, sortUnlocking } from '../utils';

export class VoteCommand extends BaseCommand {
	public id = COMMAND_ID_VOTE;
	public name = 'voteDelegate';
	public schema = voteCommandParamsSchema;

	private _tokenAPI!: TokenAPI;
	private _tokenIDDPoS!: TokenIDDPoS;

	public addDependencies(args: VoteCommandDependencies) {
		this._tokenAPI = args.tokenAPI;
		this._tokenIDDPoS = args.tokenIDDPoS;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<VoteTransactionParams>,
	): Promise<VerificationResult> {
		const {
			params: { votes },
		} = context;

		let upvoteCount = 0;
		let downvoteCount = 0;
		const addressSet = new dataStructures.BufferMap<boolean>();
		for (const vote of votes) {
			addressSet.set(vote.delegateAddress, true);

			if (vote.amount === BigInt(0)) {
				return {
					status: VerifyStatus.FAIL,
					error: new ValidationError('Amount cannot be 0.', ''),
				};
			}

			if (vote.amount % TEN_UNIT !== BigInt(0)) {
				return {
					status: VerifyStatus.FAIL,
					error: new ValidationError(
						'Amount should be multiple of 10 * 10^8.',
						vote.amount.toString(),
					),
				};
			}

			if (vote.amount > BigInt(0)) {
				upvoteCount += 1;
			} else if (vote.amount < BigInt(0)) {
				downvoteCount += 1;
			}
		}

		if (upvoteCount > MAX_VOTE) {
			return {
				status: VerifyStatus.FAIL,
				error: new ValidationError('Upvote can only be casted upto 10.', upvoteCount.toString()),
			};
		}

		if (downvoteCount > MAX_VOTE) {
			return {
				status: VerifyStatus.FAIL,
				error: new ValidationError(
					'Downvote can only be casted upto 10.',
					downvoteCount.toString(),
				),
			};
		}

		if (addressSet.entries().length !== votes.length) {
			return {
				status: VerifyStatus.FAIL,
				error: new ValidationError(
					'Delegate address must be unique.',
					votes.map(vote => vote.delegateAddress.toString('hex')).join(),
				),
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<VoteTransactionParams>): Promise<void> {
		const {
			transaction,
			params: { votes },
			getStore,
			getAPIContext,
			header: { height },
		} = context;

		const senderAddress = getAddressFromPublicKey(transaction.senderPublicKey);
		votes.sort((a, b) => {
			const diff = a.amount - b.amount;
			if (diff > BigInt(0)) {
				return 1;
			}
			if (diff < BigInt(0)) {
				return -1;
			}

			return 0;
		});

		const voterStore = getStore(this.moduleID, STORE_PREFIX_VOTER);
		const delegateStore = getStore(this.moduleID, STORE_PREFIX_DELEGATE);
		for (const vote of votes) {
			const voterData = await getDefaultVoter(voterStore, senderAddress);

			let delegateData;

			try {
				delegateData = await delegateStore.getWithSchema<DelegateAccount>(
					vote.delegateAddress,
					delegateStoreSchema,
				);
			} catch {
				throw new Error(
					`Voted delegate address ${vote.delegateAddress.toString('hex')} is not registered.`,
				);
			}

			if (vote.amount < BigInt(0)) {
				// unvote
				const originalUpvoteIndex = voterData.sentVotes.findIndex(senderVote =>
					senderVote.delegateAddress.equals(vote.delegateAddress),
				);

				if (originalUpvoteIndex < 0) {
					throw new Error('Cannot cast downvote to delegate who is not upvoted.');
				}

				voterData.sentVotes[originalUpvoteIndex].amount += vote.amount;

				if (voterData.sentVotes[originalUpvoteIndex].amount < BigInt(0)) {
					throw new Error('The downvote amount cannot be greater than upvoted amount.');
				}

				// Change delegate.selfVote if this vote is a self vote
				if (senderAddress.equals(vote.delegateAddress)) {
					delegateData.selfVotes = voterData.sentVotes[originalUpvoteIndex].amount;
				}

				// Delete entry when amount becomes 0
				if (voterData.sentVotes[originalUpvoteIndex].amount === BigInt(0)) {
					voterData.sentVotes = voterData.sentVotes.filter(
						senderVote => !senderVote.delegateAddress.equals(vote.delegateAddress),
					);
				}

				// Create unlocking object
				// Amount is converted to +BigInt for unlocking
				voterData.pendingUnlocks.push({
					delegateAddress: vote.delegateAddress,
					amount: BigInt(-1) * vote.amount,
					unvoteHeight: height + 1,
				});

				// Sort account.unlocking
				sortUnlocking(voterData.pendingUnlocks);

				if (voterData.pendingUnlocks.length > MAX_UNLOCKING) {
					throw new Error(`Pending unlocks cannot exceed ${MAX_UNLOCKING.toString()}.`);
				}
			} else {
				// Upvote amount case
				const originalUpvoteIndex = voterData.sentVotes.findIndex(senderVote =>
					senderVote.delegateAddress.equals(vote.delegateAddress),
				);
				const index = originalUpvoteIndex > -1 ? originalUpvoteIndex : voterData.sentVotes.length;
				const upvote =
					originalUpvoteIndex > -1
						? voterData.sentVotes[originalUpvoteIndex]
						: {
								delegateAddress: vote.delegateAddress,
								amount: BigInt(0),
						  };
				upvote.amount += vote.amount;

				await this._tokenAPI.lock(
					getAPIContext(),
					senderAddress,
					this.moduleID,
					this._tokenIDDPoS,
					vote.amount,
				);

				voterData.sentVotes[index] = upvote;

				// Change delegate.selfVote if this vote is a self vote
				if (senderAddress.equals(vote.delegateAddress)) {
					delegateData.selfVotes = voterData.sentVotes[index].amount;
				}

				voterData.sentVotes.sort((a, b) => a.delegateAddress.compare(b.delegateAddress));
				if (voterData.sentVotes.length > MAX_VOTE) {
					throw new Error(`Sender can only vote upto ${MAX_VOTE.toString()}.`);
				}
			}

			await voterStore.setWithSchema(senderAddress, voterData, voterStoreSchema);
			delegateData.totalVotesReceived += vote.amount;
			await delegateStore.setWithSchema(vote.delegateAddress, delegateData, delegateStoreSchema);
		}
	}
}
