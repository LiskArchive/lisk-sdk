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

import { address as cryptoAddress } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { NotFoundError } from '@liskhq/lisk-db';
import { validator } from '@liskhq/lisk-validator';
import { dataStructures, math } from '@liskhq/lisk-utils';
import { ModuleEndpointContext } from '../../types';
import { BaseEndpoint } from '../base_endpoint';
import { ValidatorAccountJSON, ValidatorStore, validatorStoreSchema } from './stores/validator';
import { StakerStore, stakerStoreSchema } from './stores/staker';
import {
	GetClaimableRewardsRequest,
	ClaimableReward,
	GetPoSTokenIDResponse,
	GetLockedRewardsRequest,
	GetLockedRewardsResponse,
	GetUnlockHeightResponse,
	GetValidatorsByStakeRequest,
	GetValidatorsByStakeResponse,
	ModuleConfig,
	ModuleConfigJSON,
	TokenMethod,
	StakerData,
	StakerDataJSON,
} from './types';
import { getPunishTime, getWaitTime, isCertificateGenerated, calculateStakeRewards } from './utils';
import { GenesisDataStore } from './stores/genesis';
import { EMPTY_KEY } from './constants';
import { EligibleValidatorsStore } from './stores/eligible_validators';
import {
	getClaimableRewardsRequestSchema,
	getLockedRewardsRequestSchema,
	getLockedStakedAmountRequestSchema,
	getValidatorsByStakeRequestSchema,
} from './schemas';
import { ImmutableMethodContext } from '../../state_machine';

const { q96 } = math;

export class PoSEndpoint extends BaseEndpoint {
	private _moduleConfig!: ModuleConfig;
	private _moduleName!: string;
	private _tokenMethod!: TokenMethod;

	public init(moduleName: string, moduleConfig: ModuleConfig, tokenMethod: TokenMethod) {
		this._moduleName = moduleName;
		this._moduleConfig = moduleConfig;
		this._tokenMethod = tokenMethod;
	}

	public async getStaker(ctx: ModuleEndpointContext): Promise<StakerDataJSON> {
		const stakerSubStore = this.stores.get(StakerStore);
		const { address } = ctx.params;
		if (typeof address !== 'string') {
			throw new Error('Parameter address must be a string.');
		}
		cryptoAddress.validateLisk32Address(address);
		const stakerData = await stakerSubStore.get(
			ctx,
			cryptoAddress.getAddressFromLisk32Address(address),
		);

		return codec.toJSON(stakerStoreSchema, stakerData);
	}

	public async getValidator(
		ctx: ModuleEndpointContext,
	): Promise<ValidatorAccountJSON & { address: string }> {
		const validatorSubStore = this.stores.get(ValidatorStore);
		const { address } = ctx.params;
		if (typeof address !== 'string') {
			throw new Error('Parameter address must be a string.');
		}
		cryptoAddress.validateLisk32Address(address);
		const validatorData = await validatorSubStore.get(
			ctx,
			cryptoAddress.getAddressFromLisk32Address(address),
		);

		return {
			...codec.toJSON<ValidatorAccountJSON>(validatorStoreSchema, validatorData),
			address,
		};
	}

	public async getAllValidators(
		ctx: ModuleEndpointContext,
	): Promise<{ validators: (ValidatorAccountJSON & { address: string })[] }> {
		const validatorSubStore = this.stores.get(ValidatorStore);
		const startBuf = Buffer.alloc(20);
		const endBuf = Buffer.alloc(20, 255);
		const storeData = await validatorSubStore.iterate(ctx, { gte: startBuf, lte: endBuf });

		const response = [];
		for (const data of storeData) {
			const validatorData = await validatorSubStore.get(ctx, data.key);
			const validatorJSON = {
				...codec.toJSON<ValidatorAccountJSON>(validatorStoreSchema, validatorData),
				address: cryptoAddress.getLisk32AddressFromAddress(data.key),
			};
			response.push(validatorJSON);
		}

		return { validators: response };
	}

	public async getLockedStakedAmount(ctx: ModuleEndpointContext): Promise<{ amount: string }> {
		const { params } = ctx;
		validator.validate<{ address: string }>(getLockedStakedAmountRequestSchema, params);

		const amount = await this._getLockedStakedAmount(
			ctx,
			cryptoAddress.getAddressFromLisk32Address(params.address),
		);
		return {
			amount: amount.toString(),
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getConstants(): Promise<ModuleConfigJSON> {
		return {
			factorSelfStakes: this._moduleConfig.factorSelfStakes,
			maxLengthName: this._moduleConfig.maxLengthName,
			maxNumberSentStakes: this._moduleConfig.maxNumberSentStakes,
			maxNumberPendingUnlocks: this._moduleConfig.maxNumberPendingUnlocks,
			failSafeMissedBlocks: this._moduleConfig.failSafeMissedBlocks,
			failSafeInactiveWindow: this._moduleConfig.failSafeInactiveWindow,
			punishmentWindow: this._moduleConfig.punishmentWindow,
			roundLength: this._moduleConfig.roundLength,
			minWeightStandby: this._moduleConfig.minWeightStandby.toString(),
			numberActiveValidators: this._moduleConfig.numberActiveValidators,
			numberStandbyValidators: this._moduleConfig.numberStandbyValidators,
			posTokenID: this._moduleConfig.posTokenID.toString('hex'),
			validatorRegistrationFee: this._moduleConfig.validatorRegistrationFee.toString(),
			maxBFTWeightCap: this._moduleConfig.maxBFTWeightCap,
			commissionIncreasePeriod: this._moduleConfig.commissionIncreasePeriod,
			maxCommissionIncreaseRate: this._moduleConfig.maxCommissionIncreaseRate,
		};
	}

	public async getPendingUnlocks(ctx: ModuleEndpointContext): Promise<GetUnlockHeightResponse> {
		const { address } = ctx.params;
		if (typeof address !== 'string') {
			throw new Error('Parameter address must be a string.');
		}
		cryptoAddress.validateLisk32Address(address);
		const addressBytes = cryptoAddress.getAddressFromLisk32Address(address);
		const stakerSubStore = this.stores.get(StakerStore);
		let stakerData: StakerData;
		try {
			stakerData = await stakerSubStore.get(ctx, addressBytes);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			// If staker does not exist, nothing is pending
			return {
				pendingUnlocks: [],
			};
		}

		const genesisDataStore = this.stores.get(GenesisDataStore);
		const { height: genesisHeight } = await genesisDataStore.get(ctx, EMPTY_KEY);

		const result = [];

		for (const unlock of stakerData.pendingUnlocks) {
			const expectedUnlockableHeight = await this._getExpectedUnlockHeight(
				ctx,
				addressBytes,
				unlock.validatorAddress,
				unlock.unstakeHeight,
			);
			const isCertified = isCertificateGenerated({
				maxHeightCertified: ctx.header.aggregateCommit.height,
				roundLength: this._moduleConfig.roundLength,
				unlockObject: unlock,
				genesisHeight,
			});
			result.push({
				...unlock,
				unlockable: ctx.header.height > expectedUnlockableHeight && isCertified,
				amount: unlock.amount.toString(),
				validatorAddress: cryptoAddress.getLisk32AddressFromAddress(unlock.validatorAddress),
				expectedUnlockableHeight,
			});
		}

		return {
			pendingUnlocks: result,
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getPoSTokenID(_ctx: ModuleEndpointContext): Promise<GetPoSTokenIDResponse> {
		return {
			tokenID: this._moduleConfig.posTokenID.toString('hex'),
		};
	}

	public async getValidatorsByStake(
		ctx: ModuleEndpointContext,
	): Promise<GetValidatorsByStakeResponse> {
		validator.validate<GetValidatorsByStakeRequest>(getValidatorsByStakeRequestSchema, ctx.params);

		const eligibleValidatorStore = this.stores.get(EligibleValidatorsStore);
		const validatorSubStore = this.stores.get(ValidatorStore);
		const response = [];

		const validatorsList = await eligibleValidatorStore.getTop(
			ctx,
			(ctx.params.limit as number | undefined) ?? 100,
		);
		for (const { key } of validatorsList) {
			const [address] = eligibleValidatorStore.splitKey(key);
			const validatorData = await validatorSubStore.get(ctx, address);
			const validatorJSON = {
				...codec.toJSON<ValidatorAccountJSON>(validatorStoreSchema, validatorData),
				address: cryptoAddress.getLisk32AddressFromAddress(address),
			};
			response.push(validatorJSON);
		}

		return { validators: response };
	}

	public async getLockedRewards(ctx: ModuleEndpointContext): Promise<GetLockedRewardsResponse> {
		validator.validate<GetLockedRewardsRequest>(getLockedRewardsRequestSchema, ctx.params);

		const tokenID = Buffer.from(ctx.params.tokenID, 'hex');
		const address = cryptoAddress.getAddressFromLisk32Address(ctx.params.address);
		let locked = await this._tokenMethod.getLockedAmount(
			ctx.getImmutableMethodContext(),
			address,
			tokenID,
			this._moduleName,
		);
		if (!tokenID.equals(this._moduleConfig.posTokenID)) {
			return {
				reward: locked.toString(),
			};
		}
		// if the token is the same as governance tokenID, subtract the locked amount for stake
		const lockedAmountForStakes = await this._getLockedStakedAmount(ctx, address);
		locked -= lockedAmountForStakes;

		return {
			reward: locked.toString(),
		};
	}

	public async getClaimableRewards(
		context: ModuleEndpointContext,
	): Promise<{ rewards: ClaimableReward[] }> {
		validator.validate<GetClaimableRewardsRequest>(
			getClaimableRewardsRequestSchema,
			context.params,
		);

		const rewards = new dataStructures.BufferMap<bigint>();
		const address = cryptoAddress.getAddressFromLisk32Address(context.params.address);
		const { sentStakes: stakes } = await this.stores
			.get(StakerStore)
			.getOrDefault(context, address);

		for (const stake of stakes) {
			if (stake.validatorAddress.equals(address)) {
				continue;
			}
			const validatorData = await this.stores
				.get(ValidatorStore)
				.get(context, stake.validatorAddress);

			for (const validatorSharingCoefficient of validatorData.sharingCoefficients) {
				const stakeSharingConefficient = stake.stakeSharingCoefficients.find(sc =>
					sc.tokenID.equals(validatorSharingCoefficient.tokenID),
				) ?? {
					tokenID: validatorSharingCoefficient.tokenID,
					coefficient: q96(BigInt(0)).toBuffer(),
				};
				const reward = calculateStakeRewards(
					stakeSharingConefficient,
					stake.amount,
					validatorSharingCoefficient,
				);
				const currentReward = rewards.get(validatorSharingCoefficient.tokenID) ?? BigInt(0);
				rewards.set(validatorSharingCoefficient.tokenID, reward + currentReward);
			}
		}

		return {
			rewards: rewards.entries().map(([tokenID, reward]) => ({
				tokenID: tokenID.toString('hex'),
				reward: reward.toString(),
			})),
		};
	}

	private async _getLockedStakedAmount(
		ctx: ImmutableMethodContext,
		address: Buffer,
	): Promise<bigint> {
		const staker = await this.stores.get(StakerStore).getOrDefault(ctx, address);
		let lockedAmount = BigInt(0);
		for (const stakes of staker.sentStakes) {
			lockedAmount += stakes.amount;
		}
		for (const unlock of staker.pendingUnlocks) {
			lockedAmount += unlock.amount;
		}
		return lockedAmount;
	}

	private async _getExpectedUnlockHeight(
		ctx: ModuleEndpointContext,
		callerAddress: Buffer,
		validatorAddress: Buffer,
		unstakeHeight: number,
	): Promise<number> {
		const validatorSubStore = this.stores.get(ValidatorStore);
		const validatorData = await validatorSubStore.get(ctx, validatorAddress);
		const waitTime = getWaitTime(callerAddress, validatorAddress) + unstakeHeight;
		if (!validatorData.pomHeights.length) {
			return waitTime;
		}
		const lastPomHeight = validatorData.pomHeights[validatorData.pomHeights.length - 1];
		// if last pom height is greater than unstake height + wait time, the validator is not punished
		if (lastPomHeight >= unstakeHeight + waitTime) {
			return waitTime;
		}
		return Math.max(
			getPunishTime(callerAddress, validatorAddress) + lastPomHeight,
			getWaitTime(callerAddress, validatorAddress) + unstakeHeight,
		);
	}
}
