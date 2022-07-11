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

import { BaseAPI } from '../../base_api';
import { MainchainInteroperabilityStore } from './store';
import { StoreCallback } from '../types';
import { BaseInteroperableAPI } from '../base_interoperable_api';
import { APIContext } from '../../../state_machine/types';

export class MainchainInteroperabilityAPI extends BaseAPI {
	protected readonly interoperableCCAPIs = new Map<number, BaseInteroperableAPI>();

	public constructor(moduleID: Buffer, interoperableCCAPIs: Map<number, BaseInteroperableAPI>) {
		super(moduleID);
		this.interoperableCCAPIs = interoperableCCAPIs;
	}

	public async getChainAccount(context: APIContext, chainID: Buffer) {
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);
		await interoperabilityStore.getChainAccount(chainID);
	}

	public async getChannel(context: APIContext, chainID: Buffer) {
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);

		await interoperabilityStore.getChannel(chainID);
	}

	public async getOwnChainAccount(context: APIContext) {
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);

		await interoperabilityStore.getOwnChainAccount();
	}

	public async getTerminatedStateAccount(context: APIContext, chainID: Buffer) {
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);

		await interoperabilityStore.getTerminatedStateAccount(chainID);
	}

	public async getTerminatedOutboxAccount(context: APIContext, chainID: Buffer) {
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);

		await interoperabilityStore.getTerminatedOutboxAccount(chainID);
	}

	protected getInteroperabilityStore(getStore: StoreCallback): MainchainInteroperabilityStore {
		return new MainchainInteroperabilityStore(this.moduleID, getStore, this.interoperableCCAPIs);
	}
}
