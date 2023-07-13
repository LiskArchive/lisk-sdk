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
/* eslint-disable no-bitwise */

import { codec } from '@liskhq/lisk-codec';
import { SparseMerkleTree } from '@liskhq/lisk-db';
import { utils } from '@liskhq/lisk-cryptography';
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { objects } from '@liskhq/lisk-utils';
import {
	EMPTY_BYTES,
	EMPTY_FEE_ADDRESS,
	CROSS_CHAIN_COMMAND_CHANNEL_TERMINATED,
	MODULE_NAME_INTEROPERABILITY,
	EMPTY_HASH,
	MAX_NUM_VALIDATORS,
} from './constants';
import { ccmSchema } from './schemas';
import { CCMsg, CrossChainUpdateTransactionParams, ChainAccount } from './types';
import {
	computeValidatorsHash,
	getEncodedCCMAndID,
	getMainchainID,
	validateFormat,
	calculateNewActiveValidators,
	emptyActiveValidatorsUpdate,
	validateCertificate,
} from './utils';
import { NamedRegistry } from '../named_registry';
import { OwnChainAccountStore } from './stores/own_chain_account';
import { ChannelDataStore } from './stores/channel_data';
import { outboxRootSchema, OutboxRootStore } from './stores/outbox_root';
import { TerminatedStateAccount, TerminatedStateStore } from './stores/terminated_state';
import { ChainAccountStore, ChainStatus } from './stores/chain_account';
import { TerminatedOutboxAccount, TerminatedOutboxStore } from './stores/terminated_outbox';
import { ChainAccountUpdatedEvent } from './events/chain_account_updated';
import { TerminatedStateCreatedEvent } from './events/terminated_state_created';
import { BaseInternalMethod } from '../BaseInternalMethod';
import { MethodContext, ImmutableMethodContext, NotFoundError } from '../../state_machine';
import { ChainValidatorsStore } from './stores/chain_validators';
import { certificateSchema } from '../../engine/consensus/certificate_generation/schema';
import { Certificate } from '../../engine/consensus/certificate_generation/types';
import { CCMSentFailedCode, CcmSentFailedEvent } from './events/ccm_send_fail';
import { CcmSendSuccessEvent } from './events/ccm_send_success';
import { TokenMethod } from '../token';
import { CCM_STATUS_OK } from '../token/constants';
import { TerminatedOutboxCreatedEvent } from './events/terminated_outbox_created';
import { BaseCCMethod } from './base_cc_method';
import { verifyAggregateCertificateSignature } from '../../engine/consensus/certificate_generation/utils';
import { InvalidCertificateSignatureEvent } from './events/invalid_certificate_signature';

export abstract class BaseInteroperabilityInternalMethod extends BaseInternalMethod {
	protected readonly interoperableModuleMethods = new Map<string, BaseCCMethod>();
	protected _tokenMethod!: TokenMethod;

	public constructor(
		stores: NamedRegistry,
		events: NamedRegistry,
		interoperableModuleMethods: Map<string, BaseCCMethod>,
	) {
		super(stores, events);
		this.interoperableModuleMethods = interoperableModuleMethods;
	}

	public addDependencies(tokenMethod: TokenMethod) {
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
		await outboxRootSubstore.set(context, chainID, { root: channel.outbox.root });
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
		stateRoot = EMPTY_HASH,
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
			this.events
				.get(ChainAccountUpdatedEvent)
				.log({ eventQueue: context.eventQueue }, chainID, chainAccount);
			const outboxRootSubstore = this.stores.get(OutboxRootStore);
			await outboxRootSubstore.del(context, chainID);

			terminatedState = {
				// If no stateRoot is given as input, get it from the state
				stateRoot: stateRoot.equals(EMPTY_HASH)
					? chainAccount.lastCertificate.stateRoot
					: stateRoot,
				mainchainStateRoot: EMPTY_HASH,
				initialized: true,
			};
		} else {
			// Processing on the mainchain
			const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(context, EMPTY_BYTES);
			const mainchainID = getMainchainID(ownChainAccount.chainID);
			if (ownChainAccount.chainID.equals(mainchainID)) {
				// If the account does not exist on the mainchain, the input chainID is invalid.
				throw new Error('Chain to be terminated is not valid.');
			}

			const mainchainAccount = await chainSubstore.get(context, mainchainID);
			// State root is not available, set it to empty bytes temporarily.
			// This should only happen on a sidechain.
			if (stateRoot.equals(EMPTY_HASH)) {
				terminatedState = {
					stateRoot: EMPTY_HASH,
					mainchainStateRoot: mainchainAccount.lastCertificate.stateRoot,
					initialized: false,
				};
			} else {
				terminatedState = {
					stateRoot,
					mainchainStateRoot: EMPTY_HASH,
					initialized: true,
				};
			}
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
			CROSS_CHAIN_COMMAND_CHANNEL_TERMINATED,
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
		const chainValidatorsStore = this.stores.get(ChainValidatorsStore);
		const currentValidators = await chainValidatorsStore.get(context, ccu.sendingChainID);
		await chainValidatorsStore.set(context, ccu.sendingChainID, {
			activeValidators: calculateNewActiveValidators(
				currentValidators.activeValidators,
				ccu.activeValidatorsUpdate.blsKeysUpdate,
				ccu.activeValidatorsUpdate.bftWeightsUpdate,
				ccu.activeValidatorsUpdate.bftWeightsUpdateBitmap,
			),
			certificateThreshold: ccu.certificateThreshold,
		});
	}

	public async updateCertificate(
		context: MethodContext,
		ccu: CrossChainUpdateTransactionParams,
	): Promise<void> {
		const certificate = codec.decode<Certificate>(certificateSchema, ccu.certificate);
		validateCertificate(certificate);

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
		const { bftWeightsUpdate, bftWeightsUpdateBitmap, blsKeysUpdate } = ccu.activeValidatorsUpdate;
		if (!objects.isBufferArrayOrdered(blsKeysUpdate)) {
			throw new Error('Keys are not sorted lexicographic order.');
		}
		const { activeValidators } = await this.stores
			.get(ChainValidatorsStore)
			.get(context, ccu.sendingChainID);

		const allBLSKeys = [...activeValidators.map(v => v.blsKey), ...blsKeysUpdate];
		allBLSKeys.sort((a, b) => a.compare(b));

		if (!objects.bufferArrayUniqueItems(allBLSKeys)) {
			throw new Error('Keys have duplicated entry.');
		}
		// using bigint for integer division
		const expectedBitmapLength = BigInt(allBLSKeys.length + 7) / BigInt(8);
		if (BigInt(bftWeightsUpdateBitmap.length) !== expectedBitmapLength) {
			throw new Error(`Invalid bftWeightsUpdateBitmap. Expected length ${expectedBitmapLength}.`);
		}
		const bftWeightsUpdateBitmapBin = BigInt(`0x${bftWeightsUpdateBitmap.toString('hex')}`);
		const expectedWeightLength = (bftWeightsUpdateBitmapBin.toString(2).match(/1/g) ?? []).length;
		if (expectedWeightLength !== bftWeightsUpdate.length) {
			throw new Error(
				'The number of 1s in the bitmap is not equal to the number of new BFT weights.',
			);
		}
		for (let i = 0; i < allBLSKeys.length; i += 1) {
			// existing key does not need to be checked
			if (!objects.bufferArrayIncludes(blsKeysUpdate, allBLSKeys[i])) {
				continue;
			}
			const digit = (bftWeightsUpdateBitmapBin >> BigInt(i)) & BigInt(1);
			if (digit !== BigInt(1)) {
				throw new Error('New validators must have a BFT weight update.');
			}
			if (bftWeightsUpdate[i] === BigInt(0)) {
				throw new Error('New validators must have a positive BFT weight.');
			}
		}

		const newActiveValidators = calculateNewActiveValidators(
			activeValidators,
			ccu.activeValidatorsUpdate.blsKeysUpdate,
			ccu.activeValidatorsUpdate.bftWeightsUpdate,
			ccu.activeValidatorsUpdate.bftWeightsUpdateBitmap,
		);
		if (newActiveValidators.length < 1 || newActiveValidators.length > MAX_NUM_VALIDATORS) {
			throw new Error(
				`Invalid validators array. It must have at least 1 element and at most ${MAX_NUM_VALIDATORS} elements.`,
			);
		}

		const certificate = codec.decode<Certificate>(certificateSchema, ccu.certificate);
		validateCertificate(certificate);

		const newValidatorsHash = computeValidatorsHash(newActiveValidators, ccu.certificateThreshold);
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
		validateCertificate(certificate);

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
		const partnerchainValidators = await this.stores
			.get(ChainValidatorsStore)
			.get(context, params.sendingChainID);

		// If the certified validators hash differs from the one stored in the chain account,
		// the CCU must contain a validators update (which is verified in verifyValidatorsUpdate).
		if (
			!certificate.validatorsHash.equals(partnerchainAccount.lastCertificate.validatorsHash) &&
			emptyActiveValidatorsUpdate(params.activeValidatorsUpdate) &&
			params.certificateThreshold === partnerchainValidators.certificateThreshold
		) {
			throw new Error(
				'Certifying an update to the validators hash requires an active validators update.',
			);
		}
	}

	public async verifyCertificateSignature(
		context: MethodContext,
		params: CrossChainUpdateTransactionParams,
	): Promise<void> {
		const certificate = codec.decode<Certificate>(certificateSchema, params.certificate);
		validateCertificate(certificate);

		const chainValidators = await this.stores
			.get(ChainValidatorsStore)
			.get(context, params.sendingChainID);

		const verifySignature = verifyAggregateCertificateSignature(
			chainValidators.activeValidators,
			chainValidators.certificateThreshold,
			params.sendingChainID,
			certificate,
		);

		if (!verifySignature) {
			this.events
				.get(InvalidCertificateSignatureEvent)
				.add(context, undefined, [params.sendingChainID], true);

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
		// receivingChainID must correspond to a live chain.
		// `timestamp` is only used in MainchainInteroperabilityInternalMethod::isLive
		// but not in SidechainInteroperabilityInternalMethod::isLive
		let isReceivingChainLive;
		const mainchainID = getMainchainID(ownChainAccount.chainID);
		if (ownChainAccount.chainID.equals(mainchainID)) {
			if (!timestamp) {
				throw new Error('Timestamp must be provided in mainchain context.');
			}
			isReceivingChainLive = await this.isLive(context, receivingChainID, timestamp);
		} else {
			isReceivingChainLive = await this.isLive(context, receivingChainID);
		}

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

		// Pay message fee.
		if (fee > 0) {
			try {
				// eslint-disable-next-line no-lonely-if
				await this._tokenMethod.payMessageFee(context, sendingAddress, ccm.receivingChainID, fee);
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

		let partnerChainID: Buffer;
		// Processing on the mainchain.
		if (ownChainAccount.chainID.equals(mainchainID)) {
			partnerChainID = receivingChainID;
		} else {
			// Processing on a sidechain.
			// eslint-disable-next-line no-lonely-if
			if (!receivingChainAccount) {
				partnerChainID = mainchainID;
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

		const { ccmID } = getEncodedCCMAndID(ccm);
		await this.addToOutbox(context, partnerChainID, ccm);
		ownChainAccount.nonce += BigInt(1);
		await this.stores.get(OwnChainAccountStore).set(context, EMPTY_BYTES, ownChainAccount);

		// Emit CCM Processed Event.
		this.events
			.get(CcmSendSuccessEvent)
			.log(context, ccm.sendingChainID, ccm.receivingChainID, ccmID, { ccm });
	}

	/**
	 * @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0053.md#verifypartnerchainoutboxroot
	 */
	public async verifyPartnerChainOutboxRoot(
		context: ImmutableMethodContext,
		params: CrossChainUpdateTransactionParams,
	): Promise<void> {
		const channel = await this.stores.get(ChannelDataStore).get(context, params.sendingChainID);
		let { appendPath, size } = channel.inbox;
		for (const ccm of params.inboxUpdate.crossChainMessages) {
			const updatedMerkleTree = regularMerkleTree.calculateMerkleRoot({
				appendPath,
				size,
				value: utils.hash(ccm),
			});
			appendPath = updatedMerkleTree.appendPath;
			size = updatedMerkleTree.size;
		}
		const newInboxRoot = regularMerkleTree.calculateRootFromRightWitness(
			size,
			appendPath,
			params.inboxUpdate.messageWitnessHashes,
		);

		const { outboxRootWitness } = params.inboxUpdate;
		// The outbox root witness properties must be set either both to their default values
		// or both to a non-default value.
		if (outboxRootWitness.bitmap.length === 0 && outboxRootWitness.siblingHashes.length > 0) {
			throw new Error(
				'The bitmap in the outbox root witness must be non-mepty if the sibling hashes are non-empty.',
			);
		}
		if (outboxRootWitness.bitmap.length !== 0 && outboxRootWitness.siblingHashes.length === 0) {
			throw new Error(
				'The sibling hashes in the outbox root witness must be non-mepty if the bitmap is non-empty.',
			);
		}

		// The outbox root witness is empty if and only if the certificate is empty
		if (outboxRootWitness.bitmap.length === 0 && params.certificate.length > 0) {
			throw new Error(
				'The outbox root witness must be non-empty to authenticate the new partnerChainOutboxRoot.',
			);
		}
		if (outboxRootWitness.bitmap.length !== 0 && params.certificate.length === 0) {
			throw new Error(
				'The outbox root witness can be non-empty only if the certificate is non-empty.',
			);
		}

		if (params.certificate.length === 0) {
			if (!newInboxRoot.equals(channel.partnerChainOutboxRoot)) {
				throw new Error('Inbox root does not match partner chain outbox root.');
			}
			return;
		}
		const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(context, EMPTY_BYTES);

		const outboxRootStore = this.stores.get(OutboxRootStore);
		const outboxKey = Buffer.concat([outboxRootStore.key, utils.hash(ownChainAccount.chainID)]);
		const proof = {
			siblingHashes: outboxRootWitness.siblingHashes,
			queries: [
				{
					key: outboxKey,
					value: utils.hash(codec.encode(outboxRootSchema, { root: newInboxRoot })),
					bitmap: outboxRootWitness.bitmap,
				},
			],
		};
		const certificate = codec.decode<Certificate>(certificateSchema, params.certificate);
		validateCertificate(certificate);

		const smt = new SparseMerkleTree();
		const valid = await smt.verify(certificate.stateRoot, [outboxKey], proof);
		if (!valid) {
			throw new Error('Invalid inclusion proof for inbox update.');
		}
	}

	// Different in mainchain and sidechain so to be implemented in each module store separately
	public abstract isLive(
		context: ImmutableMethodContext,
		chainID: Buffer,
		timestamp?: number,
	): Promise<boolean>;
}
