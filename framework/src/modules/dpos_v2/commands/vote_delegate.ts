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
import {
	MAX_NUMBER_PENDING_UNLOCKS,
	MAX_NUMBER_SENT_VOTES,
	MODULE_NAME_DPOS,
	PoSEventResult,
	BASE_VOTE_AMOUNT,
} from '../constants';
import { DelegateVotedEvent } from '../events/delegate_voted';
import { InternalMethod } from '../internal_method';
import { voteCommandParamsSchema } from '../schemas';
import { DelegateStore } from '../stores/delegate';
import { EligibleDelegatesStore } from '../stores/eligible_delegates';
import { VoterStore } from '../stores/voter';
import { TokenMethod, TokenID, VoteTransactionParams } from '../types';
import { sortUnlocking, getDelegateWeight } from '../utils';

export class VoteDelegateCommand extends BaseCommand {
	public schema = voteCommandParamsSchema;

	private _tokenMethod!: TokenMethod;
	private _governanceTokenID!: TokenID;
	private _internalMethod!: InternalMethod;
	private _factorSelfVotes!: bigint;

	public addDependencies(args: { tokenMethod: TokenMethod; internalMethod: InternalMethod }) {
		this._tokenMethod = args.tokenMethod;
		this._internalMethod = args.internalMethod;
	}

	public init(args: { governanceTokenID: TokenID; factorSelfVotes: bigint }) {
		this._governanceTokenID = args.governanceTokenID;
		this._factorSelfVotes = args.factorSelfVotes;
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

			if (vote.amount % BASE_VOTE_AMOUNT !== BigInt(0)) {
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

		if (upvoteCount > MAX_NUMBER_SENT_VOTES) {
			return {
				status: VerifyStatus.FAIL,
				error: new ValidationError(
					`Upvote can only be casted up to ${MAX_NUMBER_SENT_VOTES}.`,
					upvoteCount.toString(),
				),
			};
		}

		if (downvoteCount > MAX_NUMBER_SENT_VOTES) {
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

			const delegateExists = await delegateStore.has(context, vote.delegateAddress);

			if (!delegateExists) {
				this.events.get(DelegateVotedEvent).error(
					context,
					{
						senderAddress,
						delegateAddress: vote.delegateAddress,
						amount: vote.amount,
					},
					PoSEventResult.VOTE_FAILED_NON_REGISTERED_DELEGATE,
				);

				throw new Error('Invalid vote: no registered delegate with the specified address');
			}

			const delegateData = await delegateStore.get(context, vote.delegateAddress);

			const originalUpvoteIndex = voterData.sentVotes.findIndex(senderVote =>
				senderVote.delegateAddress.equals(vote.delegateAddress),
			);
			const index = originalUpvoteIndex > -1 ? originalUpvoteIndex : voterData.sentVotes.length;

			if (vote.amount < BigInt(0)) {
				// unvote
				if (originalUpvoteIndex < 0) {
					this.events.get(DelegateVotedEvent).error(
						context,
						{
							senderAddress,
							delegateAddress: vote.delegateAddress,
							amount: vote.amount,
						},
						PoSEventResult.VOTE_FAILED_INVALID_UNVOTE_PARAMETERS,
					);

					throw new Error('Invalid unvote: Cannot cast downvote to delegate who is not upvoted.');
				}

				voterData.sentVotes[originalUpvoteIndex].amount += vote.amount;

				if (voterData.sentVotes[originalUpvoteIndex].amount < BigInt(0)) {
					this.events.get(DelegateVotedEvent).error(
						context,
						{
							senderAddress,
							delegateAddress: vote.delegateAddress,
							amount: vote.amount,
						},
						PoSEventResult.VOTE_FAILED_INVALID_UNVOTE_PARAMETERS,
					);

					throw new Error(
						'Invalid unvote: The unvote amount exceeds the voted amount for this delegate.',
					);
				}

				await this._internalMethod.assignVoteRewards(
					context,
					senderAddress,
					voterData.sentVotes[originalUpvoteIndex],
					delegateData,
				);

				voterData.sentVotes[originalUpvoteIndex].voteSharingCoefficients =
					delegateData.sharingCoefficients;

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

				if (voterData.pendingUnlocks.length > MAX_NUMBER_PENDING_UNLOCKS) {
					this.events.get(DelegateVotedEvent).error(
						context,
						{
							senderAddress,
							delegateAddress: vote.delegateAddress,
							amount: vote.amount,
						},
						PoSEventResult.VOTE_FAILED_TOO_MANY_PENDING_UNLOCKS,
					);

					throw new Error(
						`Pending unlocks cannot exceed ${MAX_NUMBER_PENDING_UNLOCKS.toString()}.`,
					);
				}
			} else {
				// Upvote amount case
				let upvote;

				await this._tokenMethod.lock(
					getMethodContext(),
					senderAddress,
					MODULE_NAME_DPOS,
					this._governanceTokenID,
					vote.amount,
				);

				if (originalUpvoteIndex > -1) {
					upvote = voterData.sentVotes[originalUpvoteIndex];

					await this._internalMethod.assignVoteRewards(
						context.getMethodContext(),
						senderAddress,
						voterData.sentVotes[originalUpvoteIndex],
						delegateData,
					);

					voterData.sentVotes[index].voteSharingCoefficients = delegateData.sharingCoefficients;
				} else {
					upvote = {
						delegateAddress: vote.delegateAddress,
						amount: BigInt(0),
						voteSharingCoefficients: delegateData.sharingCoefficients,
					};
				}

				upvote.amount += vote.amount;

				voterData.sentVotes[index] = {
					...upvote,
				};

				voterData.sentVotes.sort((a, b) => a.delegateAddress.compare(b.delegateAddress));
				if (voterData.sentVotes.length > MAX_NUMBER_SENT_VOTES) {
					this.events.get(DelegateVotedEvent).error(
						context,
						{
							senderAddress,
							delegateAddress: vote.delegateAddress,
							amount: vote.amount,
						},
						PoSEventResult.VOTE_FAILED_TOO_MANY_SENT_VOTES,
					);

					throw new Error(`Sender can only vote upto ${MAX_NUMBER_SENT_VOTES.toString()}.`);
				}
			}

			const previousDelegateWeight = getDelegateWeight(
				this._factorSelfVotes,
				delegateData.selfVotes,
				delegateData.totalVotesReceived,
			);
			// Change delegate.selfVote if this vote is a self vote
			if (senderAddress.equals(vote.delegateAddress)) {
				delegateData.selfVotes += vote.amount;
			}

			delegateData.totalVotesReceived += vote.amount;

			const eligibleDelegatesStore = this.stores.get(EligibleDelegatesStore);

			await eligibleDelegatesStore.update(
				context,
				vote.delegateAddress,
				previousDelegateWeight,
				delegateData,
			);

			await voterStore.set(context, senderAddress, voterData);
			await delegateStore.set(context, vote.delegateAddress, delegateData);

			this.events.get(DelegateVotedEvent).log(context, {
				senderAddress,
				delegateAddress: vote.delegateAddress,
				amount: vote.amount,
			});
		}
	}
}
