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

import { dataStructures } from '@liskhq/lisk-utils';
import { validator } from '@liskhq/lisk-validator';
import { AggregateValidationError, ValidationError } from '../../../errors';
import {
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
	CommandExecuteContext,
} from '../../../state_machine';
import { BaseCommand } from '../../base_command';
import { MAX_UNLOCKING, MAX_VOTE, MODULE_NAME_DPOS, TEN_UNIT } from '../constants';
import { voteCommandParamsSchema } from '../schemas';
import { DelegateStore } from '../stores/delegate';
import { VoterStore } from '../stores/voter';
import { TokenMethod, TokenID, VoteCommandDependencies, VoteTransactionParams } from '../types';
import { sortUnlocking } from '../utils';

export class VoteDelegateCommand extends BaseCommand {
	public schema = voteCommandParamsSchema;

	private _tokenMethod!: TokenMethod;
	private _governanceTokenID!: TokenID;

	public addDependencies(args: VoteCommandDependencies) {
		this._tokenMethod = args.tokenMethod;
	}

	public init(args: { governanceTokenID: TokenID }) {
		this._governanceTokenID = args.governanceTokenID;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<VoteTransactionParams>,
	): Promise<VerificationResult> {
		const {
			params: { votes },
		} = context;

		try {
			validator.validate(this.schema, context.params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: new AggregateValidationError('Parameter is not valid.', err),
			};
		}

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
				error: new ValidationError('Upvote can only be casted up to 10.', upvoteCount.toString()),
			};
		}

		if (downvoteCount > MAX_VOTE) {
			return {
				status: VerifyStatus.FAIL,
				error: new ValidationError(
					'Downvote can only be casted up to 10.',
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
			transaction: { senderAddress },
			params: { votes },
			getMethodContext,
			header: { height },
		} = context;

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

		const voterStore = this.stores.get(VoterStore);
		const delegateStore = this.stores.get(DelegateStore);
		for (const vote of votes) {
			const voterData = await voterStore.getOrDefault(context, senderAddress);

			const delegateData = await delegateStore.get(context, vote.delegateAddress);

			const originalUpvoteIndex = voterData.sentVotes.findIndex(senderVote =>
				senderVote.delegateAddress.equals(vote.delegateAddress),
			);
			const index = originalUpvoteIndex > -1 ? originalUpvoteIndex : voterData.sentVotes.length;

			if (vote.amount < BigInt(0)) {
				// unvote
				if (originalUpvoteIndex < 0) {
					throw new Error('Cannot cast downvote to delegate who is not upvoted.');
				}

				voterData.sentVotes[originalUpvoteIndex].amount += vote.amount;

				if (voterData.sentVotes[originalUpvoteIndex].amount < BigInt(0)) {
					throw new Error('The downvote amount cannot be greater than upvoted amount.');
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
				const upvote =
					originalUpvoteIndex > -1
						? voterData.sentVotes[originalUpvoteIndex]
						: {
								delegateAddress: vote.delegateAddress,
								amount: BigInt(0),
						  };
				upvote.amount += vote.amount;

				await this._tokenMethod.lock(
					getMethodContext(),
					senderAddress,
					MODULE_NAME_DPOS,
					this._governanceTokenID,
					vote.amount,
				);

				// TODO: Issue #7666
				voterData.sentVotes[index] = {
					...upvote,
					delegateAddress: Buffer.from('00'),
					amount: BigInt(10),
					voteSharingCoefficients: [] as never,
				};

				voterData.sentVotes.sort((a, b) => a.delegateAddress.compare(b.delegateAddress));
				if (voterData.sentVotes.length > MAX_VOTE) {
					throw new Error(`Sender can only vote upto ${MAX_VOTE.toString()}.`);
				}
			}

			// Change delegate.selfVote if this vote is a self vote
			if (senderAddress.equals(vote.delegateAddress)) {
				delegateData.selfVotes = voterData.sentVotes[index].amount;
			}

			await voterStore.set(context, senderAddress, voterData);
			delegateData.totalVotesReceived += vote.amount;
			await delegateStore.set(context, vote.delegateAddress, delegateData);
		}
	}
}
