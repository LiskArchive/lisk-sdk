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
	CHAIN_ID_MAINCHAIN,
	MESSAGE_TAG_CERTIFICATE,
} from './constants';
import { ccmSchema } from './schemas';
import { CCMsg, CrossChainUpdateTransactionParams, ChainAccount } from './types';
import { computeValidatorsHash, getIDAsKeyForStore, validateFormat } from './utils';
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
import { MethodContext, ImmutableMethodContext, NotFoundError } from '../../state_machine';
import { calculateNewActiveValidators, ChainValidatorsStore } from './stores/chain_validators';
import { certificateSchema } from '../../engine/consensus/certificate_generation/schema';
import { Certificate } from '../../engine/consensus/certificate_generation/types';
import { CCMSentFailedCode, CcmSentFailedEvent } from './events/ccm_send_fail';
import { CcmSendSuccessEvent } from './events/ccm_send_success';
import { TokenMethod } from '../token';
import { CCM_STATUS_OK } from '../token/constants';
import { TerminatedOutboxCreatedEvent } from './events/terminated_outbox_created';
import { BaseCCMethod } from './base_cc_method';

export abstract class BaseInteroperabilityInternalMethod extends BaseInternalMethod {
	protected readonly interoperableModuleMethods = new Map<string, BaseCCMethod>();
	protected _tokenMethod!: TokenMethod & {
		payMessageFee: (
			context: MethodContext,
			payFromAddress: Buffer,
			fee: bigint,
			receivingChainID: Buffer,
		) => Promise<void>;
	};
	public constructor(
		stores: NamedRegistry,
		events: NamedRegistry,
		interoperableModuleMethods: Map<string, BaseCCMethod>,
	) {
		super(stores, events);
		this.interoperableModuleMethods = interoperableModuleMethods;
	}

	public addDependencies(
		tokenMethod: TokenMethod & {
			// TODO: Remove this after token module update
			payMessageFee: (
				context: MethodContext,
				payFromAddress: Buffer,
				fee: bigint,
				receivingChainID: Buffer,
			) => Promise<void>;
		},
	) {
		this._tokenMethod = tokenMethod;
	}

	public async appendToInboxTree(context: MethodContext, chainID: Buffer, appendData: Buffer) {
		const channelSubstore = this.stores.get(ChannelDataStore);
		const channel = await channelSubstore.get(context, chainID);
		const updatedInbox = regularMerkleTree.calculateMerkleRoot({
			value: utils.hash(appendData),
			appendPath: channel.inbox.appendPath,
			size: channel.inbox.size,
		});
		await channelSubstore.set(context, chainID, {
			...channel,
			inbox: updatedInbox,
		});
	}

	public async appendToOutboxTree(context: MethodContext, chainID: Buffer, appendData: Buffer) {
		const channelSubstore = this.stores.get(ChannelDataStore);
		const channel = await channelSubstore.get(context, chainID);
		const updatedOutbox = regularMerkleTree.calculateMerkleRoot({
			value: utils.hash(appendData),
			appendPath: channel.outbox.appendPath,
			size: channel.outbox.size,
		});
		await channelSubstore.set(context, chainID, {
			...channel,
			outbox: updatedOutbox,
		});
	}

	public async addToOutbox(context: MethodContext, chainID: Buffer, ccm: CCMsg) {
		const serializedMessage = codec.encode(ccmSchema, ccm);
		await this.appendToOutboxTree(context, chainID, serializedMessage);

		const channelSubstore = this.stores.get(ChannelDataStore);
		const channel = await channelSubstore.get(context, chainID);

		const outboxRootSubstore = this.stores.get(OutboxRootStore);
		await outboxRootSubstore.set(context, chainID, channel.outbox);
	}

	public async createTerminatedOutboxAccount(
		context: MethodContext,
		chainID: Buffer,
		outboxRoot: Buffer,
		outboxSize: number,
		partnerChainInboxSize: number,
	): Promise<void> {
		const terminatedOutbox = {
			outboxRoot,
			outboxSize,
			partnerChainInboxSize,
		};

		const terminatedOutboxSubstore = this.stores.get(TerminatedOutboxStore);
		await terminatedOutboxSubstore.set(context, chainID, terminatedOutbox);
		this.events.get(TerminatedOutboxCreatedEvent).log(context, chainID, terminatedOutbox);
	}

	public async setTerminatedOutboxAccount(
		context: MethodContext,
		chainID: Buffer,
		params: Partial<TerminatedOutboxAccount>,
	): Promise<boolean> {
		// Passed params is empty, no need to call this method
		if (Object.keys(params).length === 0) {
			return false;
		}
		const terminatedOutboxSubstore = this.stores.get(TerminatedOutboxStore);

		const doesOutboxExist = await terminatedOutboxSubstore.has(context, chainID);

		if (!doesOutboxExist) {
			return false;
		}

		const account = await terminatedOutboxSubstore.get(context, chainID);

		const terminatedOutbox = {
			...account,
			...params,
		};

		await terminatedOutboxSubstore.set(context, chainID, terminatedOutbox);

		return true;
	}

	public async createTerminatedStateAccount(
		context: MethodContext,
		chainID: Buffer,
		stateRoot?: Buffer,
	): Promise<void> {
		const chainSubstore = this.stores.get(ChainAccountStore);
		let terminatedState: TerminatedStateAccount;

		const chainAccountExists = await chainSubstore.has(context, chainID);
		if (chainAccountExists) {
			const chainAccount = await chainSubstore.get(context, chainID);
			await chainSubstore.set(context, chainID, {
				...chainAccount,
				status: ChainStatus.TERMINATED,
			});
			const outboxRootSubstore = this.stores.get(OutboxRootStore);
			await outboxRootSubstore.del(context, chainID);

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
			const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(context, EMPTY_BYTES);
			if (ownChainAccount.chainID.equals(getIDAsKeyForStore(MAINCHAIN_ID))) {
				// If the account does not exist on the mainchain, the input chainID is invalid.
				throw new Error('Chain to be terminated is not valid.');
			}

			const mainchainAccount = await chainSubstore.get(context, getIDAsKeyForStore(MAINCHAIN_ID));
			// State root is not available, set it to empty bytes temporarily.
			// This should only happen on a sidechain.
			terminatedState = {
				stateRoot: EMPTY_BYTES,
				mainchainStateRoot: mainchainAccount.lastCertificate.stateRoot,
				initialized: false,
			};
		}

		const terminatedStateSubstore = this.stores.get(TerminatedStateStore);
		await terminatedStateSubstore.set(context, chainID, terminatedState);
		this.events
			.get(TerminatedStateCreatedEvent)
			.log({ eventQueue: context.eventQueue }, chainID, terminatedState);
	}

	public async terminateChainInternal(context: MethodContext, chainID: Buffer): Promise<void> {
		const terminatedStateSubstore = this.stores.get(TerminatedStateStore);
		const terminatedStateExists = await terminatedStateSubstore.has(context, chainID);

		// Chain was already terminated, do nothing.
		if (terminatedStateExists) {
			return;
		}

		await this.sendInternal(
			context,
			EMPTY_FEE_ADDRESS,
			MODULE_NAME_INTEROPERABILITY,
			CROSS_CHAIN_COMMAND_NAME_CHANNEL_TERMINATED,
			chainID,
			BigInt(0),
			CCM_STATUS_OK,
			EMPTY_BYTES,
		);

		await this.createTerminatedStateAccount(context, chainID);
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

		const newActiveValidators = calculateNewActiveValidators(
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

	public async sendInternal(
		context: MethodContext,
		sendingAddress: Buffer,
		module: string,
		crossChainCommand: string,
		receivingChainID: Buffer,
		fee: bigint,
		status: number,
		params: Buffer,
		timestamp?: number,
	): Promise<void> {
		const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(context, EMPTY_BYTES);
		const ccm = {
			module,
			crossChainCommand,
			fee,
			nonce: ownChainAccount.nonce,
			params,
			receivingChainID,
			sendingChainID: ownChainAccount.chainID,
			status,
		};
		// Not possible to send messages to the own chain.
		if (receivingChainID.equals(ownChainAccount.chainID)) {
			this.events.get(CcmSentFailedEvent).log(
				context,
				{
					ccm: { ...ccm, params: EMPTY_BYTES },
					code: CCMSentFailedCode.INVALID_RECEIVING_CHAIN,
				},
				true,
			);
			throw new Error('Sending chain cannot be the receiving chain.');
		}

		// Validate ccm size.
		try {
			validateFormat(ccm);
		} catch (error) {
			this.events.get(CcmSentFailedEvent).log(
				context,
				{
					ccm: { ...ccm, params: EMPTY_BYTES },
					code: CCMSentFailedCode.INVALID_FORMAT,
				},
				true,
			);

			throw new Error('Invalid CCM format.');
		}
		// From now on, we can assume that the ccm is valid.

		// receivingChainID must correspond to a live chain.
		const isReceivingChainLive = await this.isLive(
			context,
			receivingChainID,
			timestamp ?? Date.now(),
		);
		if (!isReceivingChainLive) {
			this.events.get(CcmSentFailedEvent).log(
				context,
				{
					ccm: { ...ccm, params: EMPTY_BYTES },
					code: CCMSentFailedCode.CHANNEL_UNAVAILABLE,
				},
				true,
			);

			throw new Error('Receiving chain is not live.');
		}

		let receivingChainAccount: ChainAccount | undefined;
		try {
			receivingChainAccount = await this.stores
				.get(ChainAccountStore)
				.get(context, receivingChainID);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
		}
		let partnerChainID: Buffer;
		// Processing on the mainchain.
		if (ownChainAccount.chainID.equals(CHAIN_ID_MAINCHAIN)) {
			partnerChainID = receivingChainID;
		} else {
			// Processing on a sidechain.
			// eslint-disable-next-line no-lonely-if
			if (!receivingChainAccount) {
				partnerChainID = CHAIN_ID_MAINCHAIN;
			} else {
				partnerChainID = receivingChainID;
			}
		}

		// partnerChainID must correspond to an active chain (in this case, not registered).
		if (receivingChainAccount && receivingChainAccount.status !== ChainStatus.ACTIVE) {
			this.events.get(CcmSentFailedEvent).log(
				context,
				{
					ccm: { ...ccm, params: EMPTY_BYTES },
					code: CCMSentFailedCode.CHANNEL_UNAVAILABLE,
				},
				true,
			);

			throw new Error('Receiving chain is not active.');
		}

		// Pay message fee.
		if (fee > 0) {
			try {
				// eslint-disable-next-line no-lonely-if
				await this._tokenMethod.payMessageFee(context, sendingAddress, fee, partnerChainID);
			} catch (error) {
				this.events.get(CcmSentFailedEvent).log(
					context,
					{
						ccm: { ...ccm, params: EMPTY_BYTES },
						code: CCMSentFailedCode.MESSAGE_FEE_EXCEPTION,
					},
					true,
				);

				throw new Error('Failed to pay message fee.');
			}
		}

		const ccmID = utils.hash(codec.encode(ccmSchema, ccm));
		await this.addToOutbox(context, partnerChainID, ccm);
		ownChainAccount.nonce += BigInt(1);
		await this.stores.get(OwnChainAccountStore).set(context, EMPTY_BYTES, ownChainAccount);

		// Emit CCM Processed Event.
		this.events
			.get(CcmSendSuccessEvent)
			.log(context, ccm.sendingChainID, ccm.receivingChainID, ccmID, { ccmID });
	}

	// Different in mainchain and sidechain so to be implemented in each module store separately
	public abstract isLive(
		context: ImmutableMethodContext,
		chainID: Buffer,
		timestamp?: number,
	): Promise<boolean>;
}
