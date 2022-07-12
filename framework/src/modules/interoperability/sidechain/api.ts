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

import { APIContext } from '../../../state_machine';
import { BaseAPI } from '../../base_api';
import { SidechainInteroperabilityStore } from './store';
import { CCMsg, StoreCallback } from '../types';
import { BaseInteroperableAPI } from '../base_interoperable_api';

export class SidechainInteroperabilityAPI extends BaseAPI {
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

	protected getInteroperabilityStore(getStore: StoreCallback): SidechainInteroperabilityStore {
		return new SidechainInteroperabilityStore(this.moduleID, getStore, this.interoperableCCAPIs);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async send(
		_apiContext: APIContext,
		_feeAddress: Buffer,
		_moduleID: Buffer,
		_crossChainCommandID: Buffer,
		_receivingChainID: Buffer,
		_fee: bigint,
		_status: number,
		_parameters: Buffer,
	): Promise<boolean> {
		throw new Error('Need to be implemented');
	}
	// eslint-disable-next-line @typescript-eslint/require-await
	public async error(_apiContext: APIContext, _ccm: CCMsg, _code: number): Promise<void> {
		throw new Error('Need to be implemented');
	}
	// eslint-disable-next-line @typescript-eslint/require-await
	public async terminateChain(_apiContext: APIContext, _chainID: Buffer): Promise<void> {
		throw new Error('Need to be implemented');
	}
}
