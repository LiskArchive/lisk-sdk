/*
 * Copyright © 2022 Lisk Foundation
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

import { BaseEndpoint } from '../../base_endpoint';
import { SidechainInteroperabilityStore } from './store';
import { ImmutableStoreCallback, StoreCallback } from '../types';
import { BaseInteroperableAPI } from '../base_interoperable_api';
import { ModuleEndpointContext } from '../../../types';

export class SidechainInteroperabilityEndpoint extends BaseEndpoint {
	protected readonly interoperableCCAPIs = new Map<number, BaseInteroperableAPI>();

	public constructor(moduleID: Buffer, interoperableCCAPIs: Map<number, BaseInteroperableAPI>) {
		super(moduleID);
		this.interoperableCCAPIs = interoperableCCAPIs;
	}

	public async getChainAccount(context: ModuleEndpointContext, chainID: Buffer) {
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);
		await interoperabilityStore.getChainAccount(chainID);
	}

	public async getChannel(context: ModuleEndpointContext, chainID: Buffer) {
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);

		await interoperabilityStore.getChannel(chainID);
	}

	public async getOwnChainAccount(context: ModuleEndpointContext) {
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);

		await interoperabilityStore.getOwnChainAccount();
	}

	public async getTerminatedStateAccount(context: ModuleEndpointContext, chainID: Buffer) {
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);

		await interoperabilityStore.getTerminatedStateAccount(chainID);
	}

	public async getTerminatedOutboxAccount(context: ModuleEndpointContext, chainID: Buffer) {
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);

		await interoperabilityStore.getTerminatedOutboxAccount(chainID);
	}

	protected getInteroperabilityStore(
		getStore: StoreCallback | ImmutableStoreCallback,
	): SidechainInteroperabilityStore {
		return new SidechainInteroperabilityStore(this.moduleID, getStore, this.interoperableCCAPIs);
	}
}
