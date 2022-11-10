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

import { codec } from '@liskhq/lisk-codec';
import { bls, utils } from '@liskhq/lisk-cryptography';
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { objects } from '@liskhq/lisk-utils';
import {
	EMPTY_BYTES,
	MAINCHAIN_ID,
	EMPTY_FEE_ADDRESS,
	CROSS_CHAIN_COMMAND_NAME_CHANNEL_TERMINATED,
	MODULE_NAME_INTEROPERABILITY,
	CCMStatusCode,
	MESSAGE_TAG_CERTIFICATE,
} from './constants';
import { ccmSchema } from './schemas';
import {
	CCMsg,
	SendInternalContext,
	TerminateChainContext,
	CreateTerminatedStateAccountContext,
	CrossChainUpdateTransactionParams,
} from './types';
import { computeValidatorsHash, getIDAsKeyForStore } from './utils';
import { BaseInteroperableMethod } from './base_interoperable_method';
import { ImmutableStoreGetter, StoreGetter } from '../base_store';
import { NamedRegistry } from '../named_registry';
import { OwnChainAccountStore } from './stores/own_chain_account';
import { ChannelDataStore } from './stores/channel_data';
import { OutboxRootStore } from './stores/outbox_root';
import { TerminatedStateAccount, TerminatedStateStore } from './stores/terminated_state';
import { ChainAccountStore, ChainStatus } from './stores/chain_account';
import { TerminatedOutboxAccount, TerminatedOutboxStore } from './stores/terminated_outbox';
import { ChainAccountUpdatedEvent } from './events/chain_account_updated';
import { TerminatedStateCreatedEvent } from './events/terminated_state_created';
import { BaseInternalMethod } from '../BaseInternalMethod';
import { MethodContext, ImmutableMethodContext } from '../../state_machine';
import { ChainValidatorsStore, updateActiveValidators } from './stores/chain_validators';
import { certificateSchema } from '../../engine/consensus/certificate_generation/schema';
import { Certificate } from '../../engine/consensus/certificate_generation/types';

export abstract class BaseInteroperabilityInternalMethod extends BaseInternalMethod {
	public readonly context: StoreGetter;
	protected readonly interoperableModuleMethods = new Map<string, BaseInteroperableMethod>();

	public constructor(
		stores: NamedRegistry,
		events: NamedRegistry,
		context: StoreGetter | ImmutableStoreGetter,
		interoperableModuleMethods: Map<string, BaseInteroperableMethod>,
	) {
		super(stores, events);
		this.context = context as StoreGetter;
		this.interoperableModuleMethods = interoperableModuleMethods;
	}

	public async appendToInboxTree(chainID: Buffer, appendData: Buffer) {
		const channelSubstore = this.stores.get(ChannelDataStore);
		const channel = await channelSubstore.get(this.context, chainID);
		const updatedInbox = regularMerkleTree.calculateMerkleRoot({
			value: utils.hash(appendData),
			appendPath: channel.inbox.appendPath,
			size: channel.inbox.size,
		});
		await channelSubstore.set(this.context, chainID, {
			...channel,
			inbox: updatedInbox,
		});
	}

	public async appendToOutboxTree(chainID: Buffer, appendData: Buffer) {
		const channelSubstore = this.stores.get(ChannelDataStore);
		const channel = await channelSubstore.get(this.context, chainID);
		const updatedOutbox = regularMerkleTree.calculateMerkleRoot({
			value: utils.hash(appendData),
			appendPath: channel.outbox.appendPath,
			size: channel.outbox.size,
		});
		await channelSubstore.set(this.context, chainID, {
			...channel,
			outbox: updatedOutbox,
		});
	}

	public async addToOutbox(chainID: Buffer, ccm: CCMsg) {
		const serializedMessage = codec.encode(ccmSchema, ccm);
		await this.appendToOutboxTree(chainID, serializedMessage);

		const channelSubstore = this.stores.get(ChannelDataStore);
		const channel = await channelSubstore.get(this.context, chainID);

		const outboxRootSubstore = this.stores.get(OutboxRootStore);
		await outboxRootSubstore.set(this.context, chainID, channel.outbox);
	}

	public async createTerminatedOutboxAccount(
		chainID: Buffer,
		outboxRoot: Buffer,
		outboxSize: number,
		partnerChainInboxSize: number,
	): Promise<void> {
		const terminatedOutboxSubstore = this.stores.get(TerminatedOutboxStore);

		const terminatedOutbox = {
			outboxRoot,
			outboxSize,
			partnerChainInboxSize,
		};

		await terminatedOutboxSubstore.set(this.context, chainID, terminatedOutbox);
	}

	public async setTerminatedOutboxAccount(
		chainID: Buffer,
		params: Partial<TerminatedOutboxAccount>,
	): Promise<boolean> {
		// Passed params is empty, no need to call this method
		if (Object.keys(params).length === 0) {
			return false;
		}
		const terminatedOutboxSubstore = this.stores.get(TerminatedOutboxStore);

		const doesOutboxExist = await terminatedOutboxSubstore.has(this.context, chainID);

		if (!doesOutboxExist) {
			return false;
		}

		const account = await terminatedOutboxSubstore.get(this.context, chainID);

		const terminatedOutbox = {
			...account,
			...params,
		};

		await terminatedOutboxSubstore.set(this.context, chainID, terminatedOutbox);

		return true;
	}

	public async getTerminatedOutboxAccount(chainID: Buffer) {
		const terminatedOutboxSubstore = this.stores.get(TerminatedOutboxStore);

		return terminatedOutboxSubstore.get(this.context, chainID);
	}

	public async createTerminatedStateAccount(
		context: CreateTerminatedStateAccountContext,
		chainID: Buffer,
		stateRoot?: Buffer,
	): Promise<void> {
		const chainSubstore = this.stores.get(ChainAccountStore);
		let terminatedState: TerminatedStateAccount;

		const chainAccountExists = await chainSubstore.has(this.context, chainID);
		if (chainAccountExists) {
			const chainAccount = await chainSubstore.get(this.context, chainID);
			await chainSubstore.set(this.context, chainID, {
				...chainAccount,
				status: ChainStatus.TERMINATED,
			});
			const outboxRootSubstore = this.stores.get(OutboxRootStore);
			await outboxRootSubstore.del(this.context, chainID);

			terminatedState = {
				stateRoot: stateRoot ?? chainAccount.lastCertificate.stateRoot,
				mainchainStateRoot: EMPTY_BYTES,
				initialized: true,
			};
			this.events
				.get(ChainAccountUpdatedEvent)
				.log({ eventQueue: context.eventQueue }, chainID, chainAccount);
		} else {
			// Processing on the mainchain
			const ownChainAccount = await this.stores
				.get(OwnChainAccountStore)
				.get(this.context, EMPTY_BYTES);
			if (ownChainAccount.chainID.equals(getIDAsKeyForStore(MAINCHAIN_ID))) {
				// If the account does not exist on the mainchain, the input chainID is invalid.
				throw new Error('Chain to be terminated is not valid.');
			}

			const mainchainAccount = await chainSubstore.get(
				this.context,
				getIDAsKeyForStore(MAINCHAIN_ID),
			);
			// State root is not available, set it to empty bytes temporarily.
			// This should only happen on a sidechain.
			terminatedState = {
				stateRoot: EMPTY_BYTES,
				mainchainStateRoot: mainchainAccount.lastCertificate.stateRoot,
				initialized: false,
			};
		}

		const terminatedStateSubstore = this.stores.get(TerminatedStateStore);
		await terminatedStateSubstore.set(this.context, chainID, terminatedState);
		this.events
			.get(TerminatedStateCreatedEvent)
			.log({ eventQueue: context.eventQueue }, chainID, terminatedState);
	}

	public async terminateChainInternal(
		chainID: Buffer,
		terminateChainContext: TerminateChainContext,
	): Promise<void> {
		const terminatedStateSubstore = this.stores.get(TerminatedStateStore);
		const terminatedStateExists = await terminatedStateSubstore.has(terminateChainContext, chainID);

		// Chain was already terminated, do nothing.
		if (terminatedStateExists) {
			return;
		}

		await this.sendInternal({
			module: MODULE_NAME_INTEROPERABILITY,
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_CHANNEL_TERMINATED,
			receivingChainID: chainID,
			fee: BigInt(0),
			status: CCMStatusCode.OK,
			params: EMPTY_BYTES,
			eventQueue: terminateChainContext.eventQueue,
			feeAddress: EMPTY_FEE_ADDRESS,
			getMethodContext: terminateChainContext.getMethodContext,
			getStore: terminateChainContext.getStore,
			logger: terminateChainContext.logger,
			chainID: terminateChainContext.chainID,
		});

		await this.createTerminatedStateAccount(terminateChainContext, chainID);
	}

	public async updateValidators(
		context: MethodContext,
		ccu: CrossChainUpdateTransactionParams,
	): Promise<void> {
		await this.stores.get(ChainValidatorsStore).updateValidators(context, ccu.sendingChainID, {
			activeValidators: ccu.activeValidatorsUpdate,
			certificateThreshold: ccu.newCertificateThreshold,
		});
	}

	public async updateCertificate(
		context: MethodContext,
		ccu: CrossChainUpdateTransactionParams,
	): Promise<void> {
		const certificate = codec.decode<Certificate>(certificateSchema, ccu.certificate);
		const chainAccountStore = this.stores.get(ChainAccountStore);
		const chainAccount = await chainAccountStore.get(context, ccu.sendingChainID);
		const updatedChainAccount = {
			...chainAccount,
			lastCertificate: {
				height: certificate.height,
				stateRoot: certificate.stateRoot,
				timestamp: certificate.timestamp,
				validatorsHash: certificate.validatorsHash,
			},
		};
		await chainAccountStore.set(context, ccu.sendingChainID, updatedChainAccount);

		this.events.get(ChainAccountUpdatedEvent).log(context, ccu.sendingChainID, updatedChainAccount);
	}

	public async updatePartnerChainOutboxRoot(
		context: MethodContext,
		ccu: CrossChainUpdateTransactionParams,
	): Promise<void> {
		await this.stores
			.get(ChannelDataStore)
			.updatePartnerChainOutboxRoot(
				context,
				ccu.sendingChainID,
				ccu.inboxUpdate.messageWitnessHashes,
			);
	}
	public async verifyValidatorsUpdate(
		context: ImmutableMethodContext,
		ccu: CrossChainUpdateTransactionParams,
	): Promise<void> {
		if (ccu.certificate.length === 0) {
			throw new Error('Certificate must be non-empty if validators have been updated.');
		}
		const blsKeys = ccu.activeValidatorsUpdate.map(v => v.blsKey);

		if (!objects.bufferArrayOrderByLex(blsKeys)) {
			throw new Error('Keys are not sorted lexicographic order.');
		}
		if (!objects.bufferArrayUniqueItems(blsKeys)) {
			throw new Error('Keys have duplicated entry.');
		}
		const { activeValidators } = await this.stores
			.get(ChainValidatorsStore)
			.get(context, ccu.sendingChainID);

		const newActiveValidators = updateActiveValidators(
			activeValidators,
			ccu.activeValidatorsUpdate,
		);
		const certificate = codec.decode<Certificate>(certificateSchema, ccu.certificate);
		const newValidatorsHash = computeValidatorsHash(
			newActiveValidators,
			ccu.newCertificateThreshold,
		);
		if (!certificate.validatorsHash.equals(newValidatorsHash)) {
			throw new Error('ValidatorsHash in certificate and the computed values do not match.');
		}
	}

	public async verifyCertificate(
		context: ImmutableMethodContext,
		params: CrossChainUpdateTransactionParams,
		blockTimestamp: number,
	): Promise<void> {
		const certificate = codec.decode<Certificate>(certificateSchema, params.certificate);
		const partnerchainAccount = await this.stores
			.get(ChainAccountStore)
			.get(context, params.sendingChainID);

		if (certificate.height <= partnerchainAccount.lastCertificate.height) {
			throw new Error('Certificate height is not greater than last certificate height.');
		}
		if (certificate.timestamp >= blockTimestamp) {
			throw new Error(
				'Certificate timestamp is not smaller than timestamp of the block including the CCU.',
			);
		}
	}

	public async verifyCertificateSignature(
		context: ImmutableMethodContext,
		params: CrossChainUpdateTransactionParams,
	): Promise<void> {
		const certificate = codec.decode<Certificate>(certificateSchema, params.certificate);
		const chainValidators = await this.stores
			.get(ChainValidatorsStore)
			.get(context, params.sendingChainID);
		const blsKeys = [];
		const blsWeights = [];
		for (const validator of chainValidators.activeValidators) {
			blsKeys.push(validator.blsKey);
			blsWeights.push(validator.bftWeight);
		}

		const verifySignature = bls.verifyWeightedAggSig(
			blsKeys,
			certificate.aggregationBits as Buffer,
			certificate.signature as Buffer,
			MESSAGE_TAG_CERTIFICATE,
			params.sendingChainID,
			params.certificate,
			blsWeights,
			params.newCertificateThreshold,
		);

		if (!verifySignature) {
			throw new Error('Certificate is not a valid aggregate signature.');
		}
	}

	// Different in mainchain and sidechain so to be implemented in each module store separately
	public abstract isLive(chainID: Buffer, timestamp?: number): Promise<boolean>;
	public abstract sendInternal(sendContext: SendInternalContext): Promise<boolean>;

	// To be implemented in base class
	public abstract getInboxRoot(chainID: Buffer): Promise<void>;
	public abstract getOutboxRoot(chainID: Buffer): Promise<void>;
}
