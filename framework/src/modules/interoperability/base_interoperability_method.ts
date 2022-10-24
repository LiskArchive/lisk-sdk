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

import { BaseMethod } from '../base_method';
import { BaseInteroperableMethod } from './base_interoperable_method';
import { NamedRegistry } from '../named_registry';
import { ImmutableMethodContext, MethodContext } from '../../state_machine';
import { ChainAccount } from './stores/chain_account';
import { CCMsg } from './types';
import { StoreGetter, ImmutableStoreGetter } from '../base_store';
import { BaseInteroperabilityStore } from './base_interoperability_store';
import { MAINCHAIN_ID_BUFFER } from './constants';

export abstract class BaseInteroperabilityMethod<
	T extends BaseInteroperabilityStore
> extends BaseMethod {
	protected readonly interoperableCCMethods = new Map<string, BaseInteroperableMethod>();
	protected abstract getInteroperabilityStore: (context: StoreGetter | ImmutableStoreGetter) => T;

	public constructor(
		stores: NamedRegistry,
		events: NamedRegistry,
		interoperableCCMethods: Map<string, BaseInteroperableMethod>,
	) {
		super(stores, events);
		this.interoperableCCMethods = interoperableCCMethods;
	}

	public async getChainAccount(
		context: ImmutableMethodContext,
		chainID: Buffer,
	): Promise<ChainAccount> {
		return this.getInteroperabilityStore(context).getChainAccount(chainID);
	}

	public async getChannel(context: ImmutableMethodContext, chainID: Buffer) {
		return this.getInteroperabilityStore(context).getChannel(chainID);
	}

	public async getOwnChainAccount(context: ImmutableMethodContext) {
		return this.getInteroperabilityStore(context).getOwnChainAccount();
	}

	public async getTerminatedStateAccount(context: ImmutableMethodContext, chainID: Buffer) {
		return this.getInteroperabilityStore(context).getTerminatedStateAccount(chainID);
	}

	public async getTerminatedOutboxAccount(context: ImmutableMethodContext, chainID: Buffer) {
		return this.getInteroperabilityStore(context).getTerminatedOutboxAccount(chainID);
	}

	public async getMessageFeeTokenID(
		context: ImmutableMethodContext,
		chainID: Buffer,
	): Promise<Buffer> {
		const updatedChainID = !(await this.getInteroperabilityStore(context).hasChainAccount(chainID))
			? MAINCHAIN_ID_BUFFER
			: chainID;
		return (await this.getChannel(context, updatedChainID)).messageFeeTokenID.localID;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async send(
		_methodContext: MethodContext,
		_feeAddress: Buffer,
		_module: string,
		_crossChainCommandID: string,
		_receivingChainID: Buffer,
		_fee: bigint,
		_status: number,
		_parameters: Buffer,
	): Promise<boolean> {
		throw new Error('Need to be implemented');
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async error(_methodContext: MethodContext, _ccm: CCMsg, _code: number): Promise<void> {
		throw new Error('Need to be implemented');
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async terminateChain(_methodContext: MethodContext, _chainID: Buffer): Promise<void> {
		throw new Error('Need to be implemented');
	}
}
