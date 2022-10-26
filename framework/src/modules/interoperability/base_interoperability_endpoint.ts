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

import { BaseEndpoint } from '../base_endpoint';
import { BaseInteroperableMethod } from './base_interoperable_method';
import {
	ChainAccountJSON,
	ChannelDataJSON,
	Inbox,
	InboxJSON,
	Outbox,
	OutboxJSON,
	OwnChainAccountJSON,
} from './types';
import { ModuleEndpointContext } from '../../types';
import { NamedRegistry } from '../named_registry';
import { TerminatedStateAccountJSON } from './stores/terminated_state';
import { TerminatedOutboxAccountJSON } from './stores/terminated_outbox';
import { BaseInteroperabilityStore } from './base_interoperability_store';
import { chainAccountToJSON } from './utils';
import { ImmutableStoreGetter, StoreGetter } from '../base_store';

export abstract class BaseInteroperabilityEndpoint<
	T extends BaseInteroperabilityStore
> extends BaseEndpoint {
	protected readonly interoperableCCMethods = new Map<string, BaseInteroperableMethod>();
	protected abstract getInteroperabilityStore: (context: StoreGetter | ImmutableStoreGetter) => T;

	public constructor(
		protected stores: NamedRegistry,
		protected offchainStores: NamedRegistry,
		interoperableCCMethods: Map<string, BaseInteroperableMethod>,
		protected events: NamedRegistry,
	) {
		super(stores, offchainStores, events);
		this.interoperableCCMethods = interoperableCCMethods;
	}

	public async getChainAccount(
		context: ModuleEndpointContext,
		chainID: Buffer,
	): Promise<ChainAccountJSON> {
		const interoperabilityStore = this.getInteroperabilityStore(context);
		return chainAccountToJSON(await interoperabilityStore.getChainAccount(chainID));
	}

	public async getAllChainAccounts(
		context: ModuleEndpointContext,
		startChainID: Buffer,
	): Promise<{ chains: ChainAccountJSON[] }> {
		const interoperabilityStore = this.getInteroperabilityStore(context);

		const chainAccounts = (
			await interoperabilityStore.getAllChainAccounts(startChainID)
		).map(chainAccount => chainAccountToJSON(chainAccount));

		return { chains: chainAccounts };
	}

	public async getChannel(
		context: ModuleEndpointContext,
		chainID: Buffer,
	): Promise<ChannelDataJSON> {
		const interoperabilityStore = this.getInteroperabilityStore(context);

		const {
			inbox,
			messageFeeTokenID,
			outbox,
			partnerChainOutboxRoot,
		} = await interoperabilityStore.getChannel(chainID);

		const inboxJSON = this._toBoxJSON(inbox) as InboxJSON;
		const outboxJSON = this._toBoxJSON(outbox) as OutboxJSON;

		return {
			messageFeeTokenID: messageFeeTokenID.toString('hex'),
			outbox: outboxJSON,
			inbox: inboxJSON,
			partnerChainOutboxRoot: partnerChainOutboxRoot.toString('hex'),
		};
	}

	public async getOwnChainAccount(context: ModuleEndpointContext): Promise<OwnChainAccountJSON> {
		const interoperabilityStore = this.getInteroperabilityStore(context);

		const { chainID, name, nonce } = await interoperabilityStore.getOwnChainAccount();

		return {
			chainID: chainID.toString('hex'),
			name,
			nonce: nonce.toString(),
		};
	}

	public async getTerminatedStateAccount(
		context: ModuleEndpointContext,
		chainID: Buffer,
	): Promise<TerminatedStateAccountJSON> {
		const interoperabilityStore = this.getInteroperabilityStore(context);

		const {
			stateRoot,
			initialized,
			mainchainStateRoot,
		} = await interoperabilityStore.getTerminatedStateAccount(chainID);

		return {
			stateRoot: stateRoot.toString('hex'),
			initialized,
			mainchainStateRoot: mainchainStateRoot?.toString('hex'),
		};
	}

	public async getTerminatedOutboxAccount(
		context: ModuleEndpointContext,
		chainID: Buffer,
	): Promise<TerminatedOutboxAccountJSON> {
		const interoperabilityStore = this.getInteroperabilityStore(context);

		const {
			outboxRoot,
			outboxSize,
			partnerChainInboxSize,
		} = await interoperabilityStore.getTerminatedOutboxAccount(chainID);

		return {
			outboxRoot: outboxRoot.toString('hex'),
			outboxSize,
			partnerChainInboxSize,
		};
	}

	private _toBoxJSON(box: Inbox | Outbox) {
		return {
			appendPath: box.appendPath.map(ap => ap.toString('hex')),
			root: box.root.toString('hex'),
			size: box.size,
		};
	}
}
