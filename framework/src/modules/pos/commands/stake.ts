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
import { ValidatorStakedEvent } from '../events/validator_staked';
import { InternalMethod } from '../internal_method';
import { stakeCommandParamsSchema } from '../schemas';
import { ValidatorStore } from '../stores/validator';
import { EligibleValidatorsStore } from '../stores/eligible_validators';
import { StakerStore } from '../stores/staker';
import { TokenMethod, TokenID, StakeTransactionParams } from '../types';
import { sortUnlocking, getValidatorWeight } from '../utils';

export class StakeCommand extends BaseCommand {
	public schema = stakeCommandParamsSchema;

	private _tokenMethod!: TokenMethod;
	private _posTokenID!: TokenID;
	private _internalMethod!: InternalMethod;
	private _factorSelfStakes!: bigint;

	public addDependencies(args: { tokenMethod: TokenMethod; internalMethod: InternalMethod }) {
		this._tokenMethod = args.tokenMethod;
		this._internalMethod = args.internalMethod;
	}

	public init(args: { posTokenID: TokenID; factorSelfStakes: bigint }) {
		this._posTokenID = args.posTokenID;
		this._factorSelfStakes = args.factorSelfStakes;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<StakeTransactionParams>,
	): Promise<VerificationResult> {
		const {
			params: { stakes },
		} = context;

		try {
			validator.validate(this.schema, context.params);
		} catch (err) {
			return {
				status: VerifyStatus.FAIL,
				error: new AggregateValidationError('Parameter is not valid.', err),
			};
		}

		let upstakeCount = 0;
		let downstakeCount = 0;
		const addressSet = new dataStructures.BufferMap<boolean>();
		for (const stake of stakes) {
			addressSet.set(stake.validatorAddress, true);

			if (stake.amount === BigInt(0)) {
				return {
					status: VerifyStatus.FAIL,
					error: new ValidationError('Amount cannot be 0.', ''),
				};
			}

			if (stake.amount % BASE_VOTE_AMOUNT !== BigInt(0)) {
				return {
					status: VerifyStatus.FAIL,
					error: new ValidationError(
						'Amount should be multiple of 10 * 10^8.',
						stake.amount.toString(),
					),
				};
			}

			if (stake.amount > BigInt(0)) {
				upstakeCount += 1;
			} else if (stake.amount < BigInt(0)) {
				downstakeCount += 1;
			}
		}

		if (upstakeCount > MAX_NUMBER_SENT_VOTES) {
			return {
				status: VerifyStatus.FAIL,
				error: new ValidationError(
					`Upstake can only be casted up to ${MAX_NUMBER_SENT_VOTES}.`,
					upstakeCount.toString(),
				),
			};
		}

		if (downstakeCount > MAX_NUMBER_SENT_VOTES) {
			return {
				status: VerifyStatus.FAIL,
				error: new ValidationError(
					'Downstake can only be casted up to 10.',
					downstakeCount.toString(),
				),
			};
		}

		if (addressSet.entries().length !== stakes.length) {
			return {
				status: VerifyStatus.FAIL,
				error: new ValidationError(
					'Validator address must be unique.',
					stakes.map(stake => stake.validatorAddress.toString('hex')).join(),
				),
			};
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(context: CommandExecuteContext<StakeTransactionParams>): Promise<void> {
		const {
			transaction: { senderAddress },
			params: { stakes },
			getMethodContext,
			header: { height },
		} = context;

		stakes.sort((a, b) => {
			const diff = a.amount - b.amount;
			if (diff > BigInt(0)) {
				return 1;
			}
			if (diff < BigInt(0)) {
				return -1;
			}

			return 0;
		});

		const stakerStore = this.stores.get(StakerStore);
		const validatorStore = this.stores.get(ValidatorStore);
		for (const stake of stakes) {
			const stakerData = await stakerStore.getOrDefault(context, senderAddress);

			const validatorExists = await validatorStore.has(context, stake.validatorAddress);

			if (!validatorExists) {
				this.events.get(ValidatorStakedEvent).error(
					context,
					{
						senderAddress,
						validatorAddress: stake.validatorAddress,
						amount: stake.amount,
					},
					PoSEventResult.VOTE_FAILED_NON_REGISTERED_DELEGATE,
				);

				throw new Error('Invalid stake: no registered validator with the specified address');
			}

			const validatorData = await validatorStore.get(context, stake.validatorAddress);

			const originalUpstakeIndex = stakerData.sentStakes.findIndex(senderStake =>
				senderStake.validatorAddress.equals(stake.validatorAddress),
			);
			const index = originalUpstakeIndex > -1 ? originalUpstakeIndex : stakerData.sentStakes.length;

			if (stake.amount < BigInt(0)) {
				// unstake
				if (originalUpstakeIndex < 0) {
					this.events.get(ValidatorStakedEvent).error(
						context,
						{
							senderAddress,
							validatorAddress: stake.validatorAddress,
							amount: stake.amount,
						},
						PoSEventResult.VOTE_FAILED_INVALID_UNVOTE_PARAMETERS,
					);

					throw new Error(
						'Invalid unstake: Cannot cast downstake to validator who is not upstaked.',
					);
				}

				if (stakerData.sentStakes[originalUpstakeIndex].amount + stake.amount < BigInt(0)) {
					this.events.get(ValidatorStakedEvent).error(
						context,
						{
							senderAddress,
							validatorAddress: stake.validatorAddress,
							amount: stake.amount,
						},
						PoSEventResult.VOTE_FAILED_INVALID_UNVOTE_PARAMETERS,
					);

					throw new Error(
						'Invalid unstake: The unstake amount exceeds the staked amount for this validator.',
					);
				}

				await this._internalMethod.assignStakeRewards(
					context,
					senderAddress,
					stakerData.sentStakes[originalUpstakeIndex],
					validatorData,
				);

				stakerData.sentStakes[originalUpstakeIndex].amount += stake.amount;
				stakerData.sentStakes[originalUpstakeIndex].stakeSharingCoefficients =
					validatorData.sharingCoefficients;

				if (stakerData.sentStakes[originalUpstakeIndex].amount === BigInt(0)) {
					stakerData.sentStakes = stakerData.sentStakes.filter(
						senderStake => !senderStake.validatorAddress.equals(stake.validatorAddress),
					);
				}

				// Create unlocking object
				// Amount is converted to +BigInt for unlocking
				stakerData.pendingUnlocks.push({
					validatorAddress: stake.validatorAddress,
					amount: BigInt(-1) * stake.amount,
					unstakeHeight: height + 1,
				});

				// Sort account.unlocking
				sortUnlocking(stakerData.pendingUnlocks);

				if (stakerData.pendingUnlocks.length > MAX_NUMBER_PENDING_UNLOCKS) {
					this.events.get(ValidatorStakedEvent).error(
						context,
						{
							senderAddress,
							validatorAddress: stake.validatorAddress,
							amount: stake.amount,
						},
						PoSEventResult.VOTE_FAILED_TOO_MANY_PENDING_UNLOCKS,
					);

					throw new Error(
						`Pending unlocks cannot exceed ${MAX_NUMBER_PENDING_UNLOCKS.toString()}.`,
					);
				}
			} else {
				// Upstake amount case
				let upstake;

				await this._tokenMethod.lock(
					getMethodContext(),
					senderAddress,
					MODULE_NAME_DPOS,
					this._posTokenID,
					stake.amount,
				);

				if (originalUpstakeIndex > -1) {
					upstake = stakerData.sentStakes[originalUpstakeIndex];

					await this._internalMethod.assignStakeRewards(
						context.getMethodContext(),
						senderAddress,
						stakerData.sentStakes[originalUpstakeIndex],
						validatorData,
					);

					stakerData.sentStakes[index].stakeSharingCoefficients = validatorData.sharingCoefficients;
				} else {
					upstake = {
						validatorAddress: stake.validatorAddress,
						amount: BigInt(0),
						stakeSharingCoefficients: validatorData.sharingCoefficients,
					};
				}

				upstake.amount += stake.amount;

				stakerData.sentStakes[index] = {
					...upstake,
				};

				stakerData.sentStakes.sort((a, b) => a.validatorAddress.compare(b.validatorAddress));
				if (stakerData.sentStakes.length > MAX_NUMBER_SENT_VOTES) {
					this.events.get(ValidatorStakedEvent).error(
						context,
						{
							senderAddress,
							validatorAddress: stake.validatorAddress,
							amount: stake.amount,
						},
						PoSEventResult.VOTE_FAILED_TOO_MANY_SENT_VOTES,
					);

					throw new Error(`Sender can only stake upto ${MAX_NUMBER_SENT_VOTES.toString()}.`);
				}
			}

			const previousValidatorWeight = getValidatorWeight(
				this._factorSelfStakes,
				validatorData.selfStake,
				validatorData.totalStakeReceived,
			);
			// Change validator.selfStake if this stake is a self stake
			if (senderAddress.equals(stake.validatorAddress)) {
				validatorData.selfStake += stake.amount;
			}

			validatorData.totalStakeReceived += stake.amount;

			const eligibleValidatorsStore = this.stores.get(EligibleValidatorsStore);

			await eligibleValidatorsStore.update(
				context,
				stake.validatorAddress,
				previousValidatorWeight,
				validatorData,
			);

			await stakerStore.set(context, senderAddress, stakerData);
			await validatorStore.set(context, stake.validatorAddress, validatorData);

			this.events.get(ValidatorStakedEvent).log(context, {
				senderAddress,
				validatorAddress: stake.validatorAddress,
				amount: stake.amount,
			});
		}
	}
}
