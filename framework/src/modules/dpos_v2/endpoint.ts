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
import { ModuleEndpointContext } from '../../types';
import { BaseEndpoint } from '../base_endpoint';
import { DelegateStore } from './stores/delegate';
import { VoterStore, voterStoreSchema } from './stores/voter';
import { DelegateAccountJSON, ModuleConfig, ModuleConfigJSON, VoterDataJSON } from './types';

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
		};
	}
}
