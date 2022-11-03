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
import { ModuleEndpointContext } from '../../types';
import { BaseEndpoint } from '../base_endpoint';
import { DelegateAccountJSON, DelegateStore, delegateStoreSchema } from './stores/delegate';
import { VoterData, VoterStore, voterStoreSchema } from './stores/voter';
import {
	GetGovernanceTokenIDResponse,
	GetLockedRewardsRequest,
	GetLockedRewardsResponse,
	GetUnlockHeightResponse,
	GetValidatorsByStakeRequest,
	GetValidatorsByStakeResponse,
	ModuleConfig,
	ModuleConfigJSON,
	TokenMethod,
	VoterDataJSON,
} from './types';
import { getPunishTime, getWaitTime, isCertificateGenerated } from './utils';
import { GenesisDataStore } from './stores/genesis';
import { EMPTY_KEY } from './constants';
import { EligibleDelegatesStore } from './stores/eligible_delegates';
import {
	getLockedRewardsRequestSchema,
	getLockedVotedAmountRequestSchema,
	getValidatorsByStakeRequestSchema,
} from './schemas';
import { ImmutableMethodContext } from '../../state_machine';

export class DPoSEndpoint extends BaseEndpoint {
	private _moduleConfig!: ModuleConfig;
	private _moduleName!: string;
	private _tokenMethod!: TokenMethod;

	public init(moduleName: string, moduleConfig: ModuleConfig, tokenMethod: TokenMethod) {
		this._moduleName = moduleName;
		this._moduleConfig = moduleConfig;
		this._tokenMethod = tokenMethod;
	}

	public async getVoter(ctx: ModuleEndpointContext): Promise<VoterDataJSON> {
		const voterSubStore = this.stores.get(VoterStore);
		const { address } = ctx.params;
		if (typeof address !== 'string') {
			throw new Error('Parameter address must be a string.');
		}
		cryptoAddress.validateLisk32Address(address);
		const voterData = await voterSubStore.get(
			ctx,
			cryptoAddress.getAddressFromLisk32Address(address),
		);

		return codec.toJSON(voterStoreSchema, voterData);
	}

	public async getDelegate(
		ctx: ModuleEndpointContext,
	): Promise<DelegateAccountJSON & { address: string }> {
		const delegateSubStore = this.stores.get(DelegateStore);
		const { address } = ctx.params;
		if (typeof address !== 'string') {
			throw new Error('Parameter address must be a string.');
		}
		cryptoAddress.validateLisk32Address(address);
		const delegate = await delegateSubStore.get(
			ctx,
			cryptoAddress.getAddressFromLisk32Address(address),
		);

		return {
			...codec.toJSON<DelegateAccountJSON>(delegateStoreSchema, delegate),
			address,
		};
	}

	public async getAllDelegates(
		ctx: ModuleEndpointContext,
	): Promise<{ delegates: (DelegateAccountJSON & { address: string })[] }> {
		const delegateSubStore = this.stores.get(DelegateStore);
		const startBuf = Buffer.alloc(20);
		const endBuf = Buffer.alloc(20, 255);
		const storeData = await delegateSubStore.iterate(ctx, { gte: startBuf, lte: endBuf });

		const response = [];
		for (const data of storeData) {
			const delegate = await delegateSubStore.get(ctx, data.key);
			const delegateJSON = {
				...codec.toJSON<DelegateAccountJSON>(delegateStoreSchema, delegate),
				address: cryptoAddress.getLisk32AddressFromAddress(data.key),
			};
			response.push(delegateJSON);
		}

		return { delegates: response };
	}

	public async getLockedVotedAmount(ctx: ModuleEndpointContext): Promise<{ amount: string }> {
		const { params } = ctx;
		validator.validate<{ address: string }>(getLockedVotedAmountRequestSchema, params);

		const amount = await this._getLockedVotedAmount(
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
			factorSelfVotes: this._moduleConfig.factorSelfVotes,
			maxLengthName: this._moduleConfig.maxLengthName,
			maxNumberSentVotes: this._moduleConfig.maxNumberSentVotes,
			maxNumberPendingUnlocks: this._moduleConfig.maxNumberPendingUnlocks,
			failSafeMissedBlocks: this._moduleConfig.failSafeMissedBlocks,
			failSafeInactiveWindow: this._moduleConfig.failSafeInactiveWindow,
			punishmentWindow: this._moduleConfig.punishmentWindow,
			roundLength: this._moduleConfig.roundLength,
			bftThreshold: this._moduleConfig.bftThreshold,
			minWeightStandby: this._moduleConfig.minWeightStandby.toString(),
			numberActiveDelegates: this._moduleConfig.numberActiveDelegates,
			numberStandbyDelegates: this._moduleConfig.numberStandbyDelegates,
			governanceTokenID: this._moduleConfig.governanceTokenID.toString('hex'),
		};
	}

	public async getPendingUnlocks(ctx: ModuleEndpointContext): Promise<GetUnlockHeightResponse> {
		const { address } = ctx.params;
		if (typeof address !== 'string') {
			throw new Error('Parameter address must be a string.');
		}
		cryptoAddress.validateLisk32Address(address);
		const addressBytes = cryptoAddress.getAddressFromLisk32Address(address);
		const voterSubStore = this.stores.get(VoterStore);
		let voterData: VoterData;
		try {
			voterData = await voterSubStore.get(ctx, addressBytes);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			// If voter does not exist, nothing is pending
			return {
				pendingUnlocks: [],
			};
		}

		const genesisDataStore = this.stores.get(GenesisDataStore);
		const { height: genesisHeight } = await genesisDataStore.get(ctx, EMPTY_KEY);

		const result = [];

		for (const unlock of voterData.pendingUnlocks) {
			const expectedUnlockableHeight = await this._getExpectedUnlockHeight(
				ctx,
				addressBytes,
				unlock.delegateAddress,
				unlock.unvoteHeight,
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
				delegateAddress: cryptoAddress.getLisk32AddressFromAddress(unlock.delegateAddress),
				expectedUnlockableHeight,
			});
		}

		return {
			pendingUnlocks: result,
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getGovernanceTokenID(
		_ctx: ModuleEndpointContext,
	): Promise<GetGovernanceTokenIDResponse> {
		return {
			tokenID: this._moduleConfig.governanceTokenID.toString('hex'),
		};
	}

	public async getValidatorsByStake(
		ctx: ModuleEndpointContext,
	): Promise<GetValidatorsByStakeResponse> {
		validator.validate<GetValidatorsByStakeRequest>(getValidatorsByStakeRequestSchema, ctx.params);

		const eligibleDelegateStore = this.stores.get(EligibleDelegatesStore);
		const delegateSubStore = this.stores.get(DelegateStore);
		const response = [];

		const delegatesList = await eligibleDelegateStore.getTop(
			ctx,
			(ctx.params.limit as number | undefined) ?? 100,
		);
		for (const { key } of delegatesList) {
			const [address] = eligibleDelegateStore.splitKey(key);
			const delegate = await delegateSubStore.get(ctx, address);
			const delegateJSON = {
				...codec.toJSON<DelegateAccountJSON>(delegateStoreSchema, delegate),
				address: cryptoAddress.getLisk32AddressFromAddress(address),
			};
			response.push(delegateJSON);
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
		if (!tokenID.equals(this._moduleConfig.governanceTokenID)) {
			return {
				reward: locked.toString(),
			};
		}
		// if the token is the same as governance tokenID, subtract the locked amount for vote
		const lockedAmountForVotes = await this._getLockedVotedAmount(ctx, address);
		locked -= lockedAmountForVotes;

		return {
			reward: locked.toString(),
		};
	}

	private async _getLockedVotedAmount(
		ctx: ImmutableMethodContext,
		address: Buffer,
	): Promise<bigint> {
		const voter = await this.stores.get(VoterStore).getOrDefault(ctx, address);
		let lockedAmount = BigInt(0);
		for (const votes of voter.sentVotes) {
			lockedAmount += votes.amount;
		}
		for (const unlock of voter.pendingUnlocks) {
			lockedAmount += unlock.amount;
		}
		return lockedAmount;
	}

	private async _getExpectedUnlockHeight(
		ctx: ModuleEndpointContext,
		callerAddress: Buffer,
		delegateAddress: Buffer,
		unvoteHeight: number,
	): Promise<number> {
		const delegateSubStore = this.stores.get(DelegateStore);
		const delegate = await delegateSubStore.get(ctx, delegateAddress);
		const waitTime = getWaitTime(callerAddress, delegateAddress) + unvoteHeight;
		if (!delegate.pomHeights.length) {
			return waitTime;
		}
		const lastPomHeight = delegate.pomHeights[delegate.pomHeights.length - 1];
		// if last pom height is greater than unvote height + wait time, the delegate is not punished
		if (lastPomHeight >= unvoteHeight + waitTime) {
			return waitTime;
		}
		return Math.max(
			getPunishTime(callerAddress, delegateAddress) + lastPomHeight,
			getWaitTime(callerAddress, delegateAddress) + unvoteHeight,
		);
	}
}
