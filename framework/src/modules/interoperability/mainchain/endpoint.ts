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
import { MainchainInteroperabilityStore } from './store';
import {
	ChainAccountJSON,
	ChannelDataJSON,
	ImmutableStoreCallback,
	InboxJSON,
	LastCertificateJSON,
	MessageFeeTokenIDJSON,
	OutboxJSON,
	OwnChainAccountJSON,
	StoreCallback,
	TerminatedOutboxAccountJSON,
	TerminatedStateAccountJSON,
} from '../types';
import { BaseInteroperableAPI } from '../base_interoperable_api';
import { ModuleEndpointContext } from '../../../types';

export class MainchainInteroperabilityEndpoint extends BaseEndpoint {
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
		const {
			lastCertificate,
			name,
			networkID,
			status,
		} = await interoperabilityStore.getChainAccount(chainID);

		const lastCertificateJSON: LastCertificateJSON = {
			height: lastCertificate.height,
			timestamp: lastCertificate.timestamp,
			stateRoot: lastCertificate.stateRoot.toString('hex'),
			validatorsHash: lastCertificate.validatorsHash.toString('hex'),
		};

		return {
			lastCertificate: lastCertificateJSON,
			name,
			status,
			networkID: networkID.toString('hex'),
		};
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

		const inboxJSON: InboxJSON = {
			appendPath: inbox.appendPath.map(ap => ap.toString('hex')),
			root: inbox.root.toString('hex'),
			size: inbox.size,
		};

		const outboxJSON: OutboxJSON = {
			appendPath: outbox.appendPath.map(ap => ap.toString('hex')),
			root: outbox.root.toString('hex'),
			size: outbox.size,
		};

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

	protected getInteroperabilityStore(
		getStore: StoreCallback | ImmutableStoreCallback,
	): MainchainInteroperabilityStore {
		return new MainchainInteroperabilityStore(this.moduleID, getStore, this.interoperableCCAPIs);
	}
}
