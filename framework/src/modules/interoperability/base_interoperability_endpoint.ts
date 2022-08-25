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
import { BaseInteroperableAPI } from './base_interoperable_api';
import { ModuleEndpointContext } from '../../types';
import {
	ChainAccountJSON,
	ChannelDataJSON,
	ImmutableStoreCallback,
	Inbox,
	InboxJSON,
	MessageFeeTokenIDJSON,
	Outbox,
	OutboxJSON,
	OwnChainAccountJSON,
	StoreCallback,
	TerminatedOutboxAccountJSON,
	TerminatedStateAccountJSON,
} from './types';
import { BaseInteroperabilityStore } from './base_interoperability_store';
import { chainAccountToJSON } from './utils';

export abstract class BaseInteroperabilityEndpoint<
	T extends BaseInteroperabilityStore
> extends BaseEndpoint {
	protected readonly interoperableCCAPIs = new Map<number, BaseInteroperableAPI>();

	public constructor(moduleID: Buffer, interoperableCCAPIs: Map<number, BaseInteroperableAPI>) {
		super(moduleID);
		this.interoperableCCAPIs = interoperableCCAPIs;
	}

	public async getChainAccount(
		context: ModuleEndpointContext,
		chainID: Buffer,
	): Promise<ChainAccountJSON> {
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);
		return chainAccountToJSON(await interoperabilityStore.getChainAccount(chainID));
	}

	public async getAllChainAccounts(
		context: ModuleEndpointContext,
		startChainID: Buffer,
	): Promise<{ chains: ChainAccountJSON[] }> {
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);

		const chainAccounts = (
			await interoperabilityStore.getAllChainAccounts(startChainID)
		).map(chainAccount => chainAccountToJSON(chainAccount));

		return { chains: chainAccounts };
	}

	public async getChannel(
		context: ModuleEndpointContext,
		chainID: Buffer,
	): Promise<ChannelDataJSON> {
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);

		const {
			inbox,
			messageFeeTokenID,
			outbox,
			partnerChainOutboxRoot,
		} = await interoperabilityStore.getChannel(chainID);

		const inboxJSON = this._toBoxJSON(inbox) as InboxJSON;
		const outboxJSON = this._toBoxJSON(outbox) as OutboxJSON;

		const messageFeeTokenIDJSON: MessageFeeTokenIDJSON = {
			chainID: messageFeeTokenID.chainID.toString('hex'),
			localID: messageFeeTokenID.localID.toString('hex'),
		};

		return {
			messageFeeTokenID: messageFeeTokenIDJSON,
			outbox: outboxJSON,
			inbox: inboxJSON,
			partnerChainOutboxRoot: partnerChainOutboxRoot.toString('hex'),
		};
	}

	public async getOwnChainAccount(context: ModuleEndpointContext): Promise<OwnChainAccountJSON> {
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);

		const { id, name, nonce } = await interoperabilityStore.getOwnChainAccount();

		return {
			id: id.toString('hex'),
			name,
			nonce: nonce.toString(),
		};
	}

	public async getTerminatedStateAccount(
		context: ModuleEndpointContext,
		chainID: Buffer,
	): Promise<TerminatedStateAccountJSON> {
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);

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
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);

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

	protected abstract getInteroperabilityStore(getStore: StoreCallback | ImmutableStoreCallback): T;
}
