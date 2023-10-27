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
import { ValidationError } from '../../../errors';
import {
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
	CommandExecuteContext,
} from '../../../state_machine';
import { BaseCommand } from '../../base_command';
import { MODULE_NAME_POS, PoSEventResult } from '../constants';
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
	private _factorSelfStakes!: number;
	private _baseStakeAmount!: bigint;
	private _maxNumberPendingUnlocks!: number;
	private _maxNumberSentStakes!: number;

	public addDependencies(args: { tokenMethod: TokenMethod; internalMethod: InternalMethod }) {
		this._tokenMethod = args.tokenMethod;
		this._internalMethod = args.internalMethod;
	}

	public init(args: {
		posTokenID: TokenID;
		factorSelfStakes: number;
		baseStakeAmount: bigint;
		maxNumberPendingUnlocks: number;
		maxNumberSentStakes: number;
	}) {
		this._posTokenID = args.posTokenID;
		this._factorSelfStakes = args.factorSelfStakes;
		this._baseStakeAmount = args.baseStakeAmount;
		this._maxNumberPendingUnlocks = args.maxNumberPendingUnlocks;
		this._maxNumberSentStakes = args.maxNumberSentStakes;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(
		context: CommandVerifyContext<StakeTransactionParams>,
	): Promise<VerificationResult> {
		const {
			params: { stakes },
		} = context;

		let upstakeCount = 0;
		let downstakeCount = 0;
		const validatorAddressSet = new dataStructures.BufferSet();

		for (const stake of stakes) {
			if (validatorAddressSet.has(stake.validatorAddress)) {
				return {
					status: VerifyStatus.FAIL,
					error: new ValidationError(
						'Validator address must be unique.',
						stake.validatorAddress.toString('hex'),
					),
				};
			}

			validatorAddressSet.add(stake.validatorAddress);

			if (stake.amount === BigInt(0)) {
				return {
					status: VerifyStatus.FAIL,
					error: new ValidationError('Amount cannot be 0.', ''),
				};
			}

			if (stake.amount % this._baseStakeAmount !== BigInt(0)) {
				return {
					status: VerifyStatus.FAIL,
					error: new ValidationError(
						`Amount should be multiple of ${this._baseStakeAmount}.`,
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

		if (upstakeCount > this._maxNumberSentStakes) {
			return {
				status: VerifyStatus.FAIL,
				error: new ValidationError(
					`Upstake can only be casted up to ${this._maxNumberSentStakes}.`,
					upstakeCount.toString(),
				),
			};
		}

		if (downstakeCount > this._maxNumberSentStakes) {
			return {
				status: VerifyStatus.FAIL,
				error: new ValidationError(
					`Downstake can only be casted up to ${this._maxNumberSentStakes}.`,
					downstakeCount.toString(),
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
					PoSEventResult.STAKE_FAILED_NON_REGISTERED_VALIDATOR,
				);

				throw new Error('Invalid stake: no registered validator with the specified address');
			}

			const validatorData = await validatorStore.get(context, stake.validatorAddress);

			const existingStakeIndex = stakerData.stakes.findIndex(senderStake =>
				senderStake.validatorAddress.equals(stake.validatorAddress),
			);

			// downstake
			if (stake.amount < BigInt(0)) {
				if (existingStakeIndex < 0) {
					this.events.get(ValidatorStakedEvent).error(
						context,
						{
							senderAddress,
							validatorAddress: stake.validatorAddress,
							amount: stake.amount,
						},
						PoSEventResult.STAKE_FAILED_INVALID_UNSTAKE_PARAMETERS,
					);

					throw new Error(
						'Invalid unstake: Cannot cast downstake to validator who is not upstaked.',
					);
				}

				if (stakerData.stakes[existingStakeIndex].amount + stake.amount < BigInt(0)) {
					this.events.get(ValidatorStakedEvent).error(
						context,
						{
							senderAddress,
							validatorAddress: stake.validatorAddress,
							amount: stake.amount,
						},
						PoSEventResult.STAKE_FAILED_INVALID_UNSTAKE_PARAMETERS,
					);

					throw new Error(
						'Invalid unstake: The unstake amount exceeds the staked amount for this validator.',
					);
				}

				await this._internalMethod.assignStakeRewards(
					context,
					senderAddress,
					stakerData.stakes[existingStakeIndex],
					validatorData,
				);

				stakerData.stakes[existingStakeIndex].amount += stake.amount;
				stakerData.stakes[existingStakeIndex].sharingCoefficients =
					validatorData.sharingCoefficients;

				if (stakerData.stakes[existingStakeIndex].amount === BigInt(0)) {
					stakerData.stakes = stakerData.stakes.filter(
						senderStake => !senderStake.validatorAddress.equals(stake.validatorAddress),
					);
				}

				// Create unlocking object
				// Amount is converted to +BigInt for unlocking
				stakerData.pendingUnlocks.push({
					validatorAddress: stake.validatorAddress,
					amount: BigInt(-1) * stake.amount,
					unstakeHeight: height,
				});

				// Sort account.unlocking
				sortUnlocking(stakerData.pendingUnlocks);

				if (stakerData.pendingUnlocks.length > this._maxNumberPendingUnlocks) {
					this.events.get(ValidatorStakedEvent).error(
						context,
						{
							senderAddress,
							validatorAddress: stake.validatorAddress,
							amount: stake.amount,
						},
						PoSEventResult.STAKE_FAILED_TOO_MANY_PENDING_UNLOCKS,
					);

					throw new Error(`Pending unlocks cannot exceed ${this._maxNumberPendingUnlocks}.`);
				}
			}
			// upstake
			else {
				await this._tokenMethod.lock(
					getMethodContext(),
					senderAddress,
					MODULE_NAME_POS,
					this._posTokenID,
					stake.amount,
				);

				if (existingStakeIndex > -1) {
					await this._internalMethod.assignStakeRewards(
						context.getMethodContext(),
						senderAddress,
						stakerData.stakes[existingStakeIndex],
						validatorData,
					);

					stakerData.stakes[existingStakeIndex].amount += stake.amount;
					stakerData.stakes[existingStakeIndex].sharingCoefficients =
						validatorData.sharingCoefficients;
				} else {
					stakerData.stakes.push({
						validatorAddress: stake.validatorAddress,
						amount: stake.amount,
						sharingCoefficients: validatorData.sharingCoefficients,
					});
				}

				stakerData.stakes.sort((a, b) => a.validatorAddress.compare(b.validatorAddress));
				if (stakerData.stakes.length > this._maxNumberSentStakes) {
					this.events.get(ValidatorStakedEvent).error(
						context,
						{
							senderAddress,
							validatorAddress: stake.validatorAddress,
							amount: stake.amount,
						},
						PoSEventResult.STAKE_FAILED_TOO_MANY_SENT_STAKES,
					);

					throw new Error(`Sender can only stake upto ${this._maxNumberSentStakes}.`);
				}
			}

			const previousValidatorWeight = getValidatorWeight(
				this._factorSelfStakes,
				validatorData.selfStake,
				validatorData.totalStake,
			);
			// Change validator.selfStake if this stake is a self stake
			if (senderAddress.equals(stake.validatorAddress)) {
				validatorData.selfStake += stake.amount;
			}

			validatorData.totalStake += stake.amount;

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
