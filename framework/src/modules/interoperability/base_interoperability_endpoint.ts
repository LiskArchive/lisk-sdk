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
	ChainValidators,
	ChannelDataJSON,
	Inbox,
	InboxJSON,
	Outbox,
	OutboxJSON,
	OwnChainAccountJSON,
} from './types';
import { ModuleEndpointContext } from '../../types';
import { NamedRegistry } from '../named_registry';
import { TerminatedStateAccountJSON, TerminatedStateStore } from './stores/terminated_state';
import { TerminatedOutboxAccountJSON } from './stores/terminated_outbox';
import { BaseInteroperabilityInternalMethod } from './base_interoperability_internal_methods';
import { chainAccountToJSON } from './utils';
import { ImmutableStoreGetter, StoreGetter } from '../base_store';
import { ChainValidatorsStore } from './stores/chain_validators';
import { ChainAccountStore } from './stores/chain_account';
import { ChannelDataStore } from './stores/channel_data';
import { OwnChainAccountStore } from './stores/own_chain_account';
import { EMPTY_BYTES } from './constants';

export abstract class BaseInteroperabilityEndpoint<
	T extends BaseInteroperabilityInternalMethod
> extends BaseEndpoint {
	protected readonly interoperableCCMethods = new Map<string, BaseInteroperableMethod>();
	protected abstract getInteroperabilityInternalMethod: (
		context: StoreGetter | ImmutableStoreGetter,
	) => T;

	public constructor(
		protected stores: NamedRegistry,
		protected offchainStores: NamedRegistry,
		interoperableCCMethods: Map<string, BaseInteroperableMethod>,
		protected events: NamedRegistry,
	) {
		super(stores, offchainStores);
		this.interoperableCCMethods = interoperableCCMethods;
	}

	public async getChainAccount(
		context: ModuleEndpointContext,
		chainID: Buffer,
	): Promise<ChainAccountJSON> {
		return chainAccountToJSON(await this.stores.get(ChainAccountStore).get(context, chainID));
	}

	public async getAllChainAccounts(
		context: ModuleEndpointContext,
		startChainID: Buffer,
	): Promise<{ chains: ChainAccountJSON[] }> {
		const InteroperabilityInternalMethod = this.getInteroperabilityInternalMethod(context);

		const chainAccounts = (
			await InteroperabilityInternalMethod.getAllChainAccounts(startChainID)
		).map(chainAccount => chainAccountToJSON(chainAccount));

		return { chains: chainAccounts };
	}

	public async getChannel(
		context: ModuleEndpointContext,
		chainID: Buffer,
	): Promise<ChannelDataJSON> {
		const { inbox, messageFeeTokenID, outbox, partnerChainOutboxRoot } = await this.stores
			.get(ChannelDataStore)
			.get(context, chainID);

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
		const { chainID, name, nonce } = await this.stores
			.get(OwnChainAccountStore)
			.get(context, EMPTY_BYTES);

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
		const { stateRoot, initialized, mainchainStateRoot } = await this.stores
			.get(TerminatedStateStore)
			.get(context, chainID);

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
		const InteroperabilityInternalMethod = this.getInteroperabilityInternalMethod(context);

		const {
			outboxRoot,
			outboxSize,
			partnerChainInboxSize,
		} = await InteroperabilityInternalMethod.getTerminatedOutboxAccount(chainID);

		return {
			outboxRoot: outboxRoot.toString('hex'),
			outboxSize,
			partnerChainInboxSize,
		};
	}

	public async getChainValidators(
		context: ModuleEndpointContext,
		chainID: Buffer,
	): Promise<ChainValidators> {
		const chainAccountStore = this.stores.get(ChainAccountStore);
		const chainAccountExists = await chainAccountStore.has(context, chainID);
		if (!chainAccountExists) {
			throw new Error('Chain account does not exist.');
		}

		const chainValidatorsStore = this.stores.get(ChainValidatorsStore);

		const validators = await chainValidatorsStore.get(context, chainID);

		return validators;
	}

	public async isChainIDAvailable(
		context: ModuleEndpointContext,
		chainID: Buffer,
	): Promise<boolean> {
		const chainSubstore = this.stores.get(ChainAccountStore);
		const chainAccountExists = await chainSubstore.has(context, chainID);

		return !chainAccountExists;
	}

	private _toBoxJSON(box: Inbox | Outbox) {
		return {
			appendPath: box.appendPath.map(ap => ap.toString('hex')),
			root: box.root.toString('hex'),
			size: box.size,
		};
	}
}
