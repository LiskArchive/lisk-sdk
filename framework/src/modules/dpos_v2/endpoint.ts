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
import { ModuleEndpointContext } from '../../types';
import { BaseEndpoint } from '../base_endpoint';
import { DelegateStore } from './stores/delegate';
import { VoterData, VoterStore, voterStoreSchema } from './stores/voter';
import {
	DelegateAccountJSON,
	GetUnlockHeightResponse,
	ModuleConfig,
	ModuleConfigJSON,
	VoterDataJSON,
} from './types';
import { getPunishTime, getWaitTime, isCertificateGenerated } from './utils';
import { GenesisDataStore } from './stores/genesis';
import { EMPTY_KEY } from './constants';

export class DPoSEndpoint extends BaseEndpoint {
	private _moduleConfig!: ModuleConfig;

	public init(moduleConfig: ModuleConfig) {
		this._moduleConfig = moduleConfig;
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

	public async getDelegate(ctx: ModuleEndpointContext): Promise<DelegateAccountJSON> {
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
			...delegate,
			totalVotesReceived: delegate.totalVotesReceived.toString(),
			selfVotes: delegate.selfVotes.toString(),
			address,
		};
	}

	public async getAllDelegates(
		ctx: ModuleEndpointContext,
	): Promise<{ delegates: DelegateAccountJSON[] }> {
		const delegateSubStore = this.stores.get(DelegateStore);
		const startBuf = Buffer.alloc(20);
		const endBuf = Buffer.alloc(20, 255);
		const storeData = await delegateSubStore.iterate(ctx, { gte: startBuf, lte: endBuf });

		const response = [];
		for (const data of storeData) {
			const delegate = await delegateSubStore.get(ctx, data.key);
			const delegateJSON = {
				...delegate,
				totalVotesReceived: delegate.totalVotesReceived.toString(),
				selfVotes: delegate.selfVotes.toString(),
				address: cryptoAddress.getLisk32AddressFromAddress(data.key),
			};
			response.push(delegateJSON);
		}

		return { delegates: response };
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
			tokenIDDPoS: this._moduleConfig.tokenIDDPoS.toString('hex'),
			tokenIDFee: this._moduleConfig.tokenIDFee.toString('hex'),
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
