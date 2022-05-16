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
import { hash, verifyWeightedAggSig } from '@liskhq/lisk-cryptography';
import { regularMerkleTree, sparseMerkleTree } from '@liskhq/lisk-tree';
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { certificateSchema } from '../../../../node/consensus/certificate_generation/schema';
import { Certificate } from '../../../../node/consensus/certificate_generation/types';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../../node/state_machine';
import { createBeforeSendCCMsgAPIContext } from '../../../../testing';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import {
	CHAIN_ACTIVE,
	CHAIN_REGISTERED,
	CHAIN_TERMINATED,
	COMMAND_ID_SIDECHAIN_CCU,
	CROSS_CHAIN_COMMAND_ID_REGISTRATION,
	EMPTY_BYTES,
	LIVENESS_LIMIT,
	MESSAGE_TAG_CERTIFICATE,
	SMT_KEY_LENGTH,
	STORE_PREFIX_CHAIN_DATA,
	STORE_PREFIX_CHAIN_VALIDATORS,
	STORE_PREFIX_CHANNEL_DATA,
	STORE_PREFIX_OUTBOX_ROOT,
	VALID_BLS_KEY_LENGTH,
} from '../../constants';
import { createCCMsgBeforeSendContext } from '../../context';
import {
	ccmSchema,
	chainAccountSchema,
	chainValidatorsSchema,
	channelSchema,
	crossChainUpdateTransactionParams,
} from '../../schema';
import {
	CCMsg,
	ChainAccount,
	ChainValidators,
	ChannelData,
	CrossChainUpdateTransactionParams,
	StoreCallback,
} from '../../types';
import {
	computeValidatorsHash,
	getIDAsKeyForStore,
	rawStateStoreKey,
	updateActiveValidators,
	validateFormat,
} from '../../utils';
import { SidechainInteroperabilityStore } from '../store';

export class SidechainCCUpdateCommand extends BaseInteroperabilityCommand {
	public name = 'sidechainCCUpdate';
	public id = COMMAND_ID_SIDECHAIN_CCU;
	public schema = crossChainUpdateTransactionParams;

	public async verify(
		context: CommandVerifyContext<CrossChainUpdateTransactionParams>,
	): Promise<VerificationResult> {
		const { params: txParams, transaction } = context;
		const errors = validator.validate(crossChainUpdateTransactionParams, context.params);

		if (errors.length > 0) {
			return {
				status: VerifyStatus.FAIL,
				error: new LiskValidationError(errors),
			};
		}

		const partnerChainIDBuffer = getIDAsKeyForStore(txParams.sendingChainID);
		const partnerChainStore = context.getStore(transaction.moduleID, STORE_PREFIX_CHAIN_DATA);
		const partnerChainAccount = await partnerChainStore.getWithSchema<ChainAccount>(
			partnerChainIDBuffer,
			chainAccountSchema,
		);

		// Section: Liveness of Partner Chain
		if (partnerChainAccount.status === CHAIN_TERMINATED) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(`Sending partner chain ${txParams.sendingChainID} is terminated.`),
			};
		}
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore as StoreCallback);
		const isChainLive = await interoperabilityStore.isLive(partnerChainIDBuffer);
		if (partnerChainAccount.status === CHAIN_ACTIVE && !isChainLive) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(`Sending partner chain ${txParams.sendingChainID} is not live.`),
			};
		}

		// Section: Liveness Requirement for the First CCU
		if (partnerChainAccount.status === CHAIN_REGISTERED) {
			// Certificate must not be empty for first CCU
			if (txParams.certificate.equals(EMPTY_BYTES)) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error(
						`Sending partner chain ${txParams.sendingChainID} is in registered status so certificate cannot be empty.`,
					),
				};
			}
		}
		// Section: Certificate and Validators Update Validity

		// Certificate follows the schema
		const decodedCertificate = codec.decode<Certificate>(certificateSchema, txParams.certificate);
		if (!txParams.certificate.equals(EMPTY_BYTES)) {
			if (
				decodedCertificate.blockID.equals(EMPTY_BYTES) ||
				decodedCertificate.stateRoot.equals(EMPTY_BYTES) ||
				decodedCertificate.validatorsHash.equals(EMPTY_BYTES) ||
				decodedCertificate.timestamp === 0
			) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Certificate is missing required values.'),
				};
			}

			// Last certificate height should be less than new certificate height
			if (decodedCertificate.height <= partnerChainAccount.lastCertificate.height) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error('Certificate height should be greater than last certificate height.'),
				};
			}
		}

		// If params contains a non-empty activeValidatorsUpdate
		if (
			txParams.activeValidatorsUpdate.length !== 0 ||
			txParams.newCertificateThreshold > BigInt(0)
		) {
			// Non-empty certificate
			if (txParams.certificate.equals(EMPTY_BYTES)) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error(
						'Certificate cannot be empty when activeValidatorsUpdate is non-empty or newCertificateThreshold >0.',
					),
				};
			}

			// params.activeValidatorsUpdate has the correct format
			for (let i = 0; i < txParams.activeValidatorsUpdate.length; i += 1) {
				const currentValidator = txParams.activeValidatorsUpdate[i];
				const nextValidator = txParams.activeValidatorsUpdate[i + 1];
				if (currentValidator.blsKey.byteLength !== VALID_BLS_KEY_LENGTH) {
					return {
						status: VerifyStatus.FAIL,
						error: new Error(`BlsKey length should be equal to ${VALID_BLS_KEY_LENGTH}.`),
					};
				}
				if (currentValidator.blsKey.compare(nextValidator.blsKey) > -1) {
					return {
						status: VerifyStatus.FAIL,
						error: new Error('Validators blsKeys must be unique and lexicographically ordered'),
					};
				}
			}
		}

		const partnerChannelStore = context.getStore(transaction.moduleID, STORE_PREFIX_CHANNEL_DATA);
		const partnerChannelData = await partnerChannelStore.getWithSchema<ChannelData>(
			partnerChainIDBuffer,
			channelSchema,
		);
		// Section: InboxUpdate Validity
		const { crossChainMessages, messageWitness, outboxRootWitness } = txParams.inboxUpdate;
		const ccmHashes = crossChainMessages.map(ccm => hash(ccm));

		let newInboxRoot;
		let newInboxAppendPath = partnerChannelData.inbox.appendPath;
		let newInboxSize = partnerChannelData.inbox.size;
		for (const ccm of ccmHashes) {
			const { appendPath, size } = regularMerkleTree.calculateMerkleRoot({
				value: ccm,
				appendPath: newInboxAppendPath,
				size: newInboxSize,
			});
			newInboxAppendPath = appendPath;
			newInboxSize = size;
		}
		// If inboxUpdate contains a non-empty messageWitness, then update newInboxRoot to the output
		if (
			!txParams.certificate.equals(EMPTY_BYTES) &&
			txParams.inboxUpdate.messageWitness.siblingHashes.length !== 0 &&
			txParams.inboxUpdate.messageWitness.partnerChainOutboxSize > 0
		) {
			newInboxRoot = regularMerkleTree.calculateRootFromRightWitness(
				newInboxSize,
				newInboxAppendPath,
				messageWitness.siblingHashes,
			);

			const proof = {
				siblingHashes: outboxRootWitness.siblingHashes,
				queries: [
					{
						key: partnerChainIDBuffer,
						value: newInboxRoot,
						bitmap: outboxRootWitness.bitmap,
					},
				],
			};
			const outboxKey = rawStateStoreKey(STORE_PREFIX_OUTBOX_ROOT);
			const querykeys = [outboxKey];
			const isSMTRootValid = sparseMerkleTree.verify(
				querykeys,
				proof,
				decodedCertificate.stateRoot,
				SMT_KEY_LENGTH,
			);
			if (!isSMTRootValid) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error(
						'Failed at verifying state root when messageWitness and certificate are non-empty.',
					),
				};
			}
		} else if (
			txParams.certificate.equals(EMPTY_BYTES) &&
			txParams.inboxUpdate.messageWitness.siblingHashes.length !== 0 &&
			txParams.inboxUpdate.messageWitness.partnerChainOutboxSize > 0
		) {
			newInboxRoot = regularMerkleTree.calculateRootFromRightWitness(
				newInboxSize,
				newInboxAppendPath,
				messageWitness.siblingHashes,
			);

			if (!newInboxRoot.equals(partnerChannelData.partnerChainOutboxRoot)) {
				return {
					status: VerifyStatus.FAIL,
					error: new Error(
						'Failed at verifying state root when messageWitness is non-empty and certificate is empty.',
					),
				};
			}
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(
		context: CommandExecuteContext<CrossChainUpdateTransactionParams>,
	): Promise<void> {
		const { transaction, header, params: txParams } = context;
		const chainIDBuffer = getIDAsKeyForStore(txParams.sendingChainID);
		const partnerChainStore = context.getStore(this.moduleID, STORE_PREFIX_CHAIN_DATA);
		const partnerChainAccount = await partnerChainStore.getWithSchema<ChainAccount>(
			chainIDBuffer,
			chainAccountSchema,
		);

		const decodedCertificate = codec.decode<Certificate>(certificateSchema, txParams.certificate);

		// if the CCU also contains a non-empty inboxUpdate, check the validity of certificate with liveness check
		if (
			txParams.inboxUpdate &&
			!(header.timestamp - decodedCertificate.timestamp < LIVENESS_LIMIT / 2)
		) {
			throw Error(
				`Certificate is not valid as it passed Liveness limit of ${LIVENESS_LIMIT} seconds.`,
			);
		}

		const partnerValidatorStore = context.getStore(this.moduleID, STORE_PREFIX_CHAIN_VALIDATORS);
		const partnerValidators = await partnerValidatorStore.getWithSchema<ChainValidators>(
			chainIDBuffer,
			chainValidatorsSchema,
		);
		const { activeValidators, certificateThreshold } = partnerValidators;

		// Certificate and Validators Update Validity
		if (!txParams.certificate.equals(EMPTY_BYTES)) {
			const verifySignature = verifyWeightedAggSig(
				activeValidators.map(v => v.blsKey),
				decodedCertificate.aggregationBits as Buffer,
				decodedCertificate.signature as Buffer,
				MESSAGE_TAG_CERTIFICATE.toString('hex'),
				partnerChainAccount.networkID,
				txParams.certificate,
				activeValidators.map(v => v.bftWeight),
				certificateThreshold,
			);

			if (!verifySignature || decodedCertificate.timestamp >= header.timestamp)
				throw Error(
					`Certificate is invalid due to invalid last certified height or timestamp or signature.`,
				);
		}

		// If params contains a non-empty activeValidatorsUpdate
		if (
			txParams.activeValidatorsUpdate.length !== 0 ||
			txParams.newCertificateThreshold > BigInt(0)
		) {
			const newActiveValidators = updateActiveValidators(
				activeValidators,
				txParams.activeValidatorsUpdate,
			);
			const validatorsHash = computeValidatorsHash(
				newActiveValidators,
				txParams.newCertificateThreshold || certificateThreshold,
			);

			if (!decodedCertificate.validatorsHash.equals(validatorsHash)) {
				throw new Error('Validators hash is incorrect given in the certificate.');
			}
		}

		// CCM execution
		const interoperabilityStore = this.getInteroperabilityStore(context.getStore);
		const decodedCCMs = txParams.inboxUpdate.crossChainMessages.map(ccm => ({
			serialized: ccm,
			deserilized: codec.decode<CCMsg>(ccmSchema, ccm),
		}));
		if (
			partnerChainAccount.status === CHAIN_REGISTERED &&
			txParams.inboxUpdate.crossChainMessages.length !== 0 &&
			txParams.inboxUpdate.messageWitness.siblingHashes.length !== 0 &&
			txParams.inboxUpdate.outboxRootWitness.siblingHashes.length !== 0
		) {
			// If the first CCM in inboxUpdate is a registration CCM
			if (
				decodedCCMs.length > 0 &&
				decodedCCMs[0].deserilized.crossChainCommandID === CROSS_CHAIN_COMMAND_ID_REGISTRATION &&
				decodedCCMs[0].deserilized.receivingChainID === txParams.sendingChainID
			) {
				partnerChainAccount.status = CHAIN_ACTIVE;
			} else {
				const beforeSendContext = createBeforeSendCCMsgAPIContext({
					feeAddress: context.transaction.senderAddress,
					eventQueue: context.eventQueue,
					getAPIContext: context.getAPIContext,
					logger: context.logger,
					networkIdentifier: context.networkIdentifier,
				});
				await interoperabilityStore.terminateChainInternal(
					txParams.sendingChainID,
					beforeSendContext,
				);

				return; // Exit CCU processing
			}
		}

		for (const ccm of decodedCCMs) {
			const beforeSendContext = createCCMsgBeforeSendContext({
				feeAddress: context.transaction.senderAddress,
				eventQueue: context.eventQueue,
				getAPIContext: context.getAPIContext,
				logger: context.logger,
				networkIdentifier: context.networkIdentifier,
				getStore: context.getStore,
			});
			if (txParams.sendingChainID !== ccm.deserilized.sendingChainID) {
				await interoperabilityStore.terminateChainInternal(
					txParams.sendingChainID,
					beforeSendContext,
				);
			}
			try {
				validateFormat(ccm.deserilized);
			} catch (error) {
				await interoperabilityStore.terminateChainInternal(
					txParams.sendingChainID,
					beforeSendContext,
				);
			}
			await interoperabilityStore.appendToInboxTree(
				getIDAsKeyForStore(txParams.sendingChainID),
				ccm.serialized,
			);

			await interoperabilityStore.apply(
				{
					ccm: ccm.deserilized,
					ccu: txParams,
					eventQueue: context.eventQueue,
					feeAddress: context.transaction.senderAddress,
					getAPIContext: context.getAPIContext,
					getStore: context.getStore,
					logger: context.logger,
					networkIdentifier: context.networkIdentifier,
				},
				this.ccCommands,
			);
		}
		// Common ccm execution logic
		const newActiveValidators = updateActiveValidators(
			activeValidators,
			txParams.activeValidatorsUpdate,
		);
		partnerValidators.activeValidators = newActiveValidators;
		if (txParams.newCertificateThreshold !== BigInt(0)) {
			partnerValidators.certificateThreshold = txParams.newCertificateThreshold;
		}
		await partnerValidatorStore.setWithSchema(
			chainIDBuffer,
			partnerValidators,
			chainValidatorsSchema,
		);
		if (!txParams.certificate.equals(EMPTY_BYTES)) {
			partnerChainAccount.lastCertificate.stateRoot = decodedCertificate.stateRoot;
			partnerChainAccount.lastCertificate.timestamp = decodedCertificate.timestamp;
			partnerChainAccount.lastCertificate.height = decodedCertificate.height;
			partnerChainAccount.lastCertificate.validatorsHash = decodedCertificate.validatorsHash;
		}

		await partnerChainStore.setWithSchema(chainIDBuffer, partnerChainAccount, chainAccountSchema);

		const partnerChannelStore = context.getStore(transaction.moduleID, STORE_PREFIX_CHANNEL_DATA);
		const partnerChannelData = await partnerChannelStore.getWithSchema<ChannelData>(
			chainIDBuffer,
			channelSchema,
		);
		await partnerChainStore.setWithSchema(chainIDBuffer, partnerChannelData, channelSchema);
	}

	protected getInteroperabilityStore(getStore: StoreCallback): SidechainInteroperabilityStore {
		return new SidechainInteroperabilityStore(this.moduleID, getStore, this.interoperableCCAPIs);
	}
}
