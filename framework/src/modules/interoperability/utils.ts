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

import { regularMerkleTree, sparseMerkleTree } from '@liskhq/lisk-tree';
import { codec } from '@liskhq/lisk-codec';
import { hash, intToBuffer, verifyWeightedAggSig } from '@liskhq/lisk-cryptography';
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { DB_KEY_STATE_STORE } from '@liskhq/lisk-chain';
import {
	ActiveValidators,
	CCMsg,
	ChainAccount,
	MessageRecoveryVerificationParams,
	TerminatedOutboxAccount,
	ChannelData,
	CrossChainUpdateTransactionParams,
	ChainValidators,
	InboxUpdate,
	MsgWitness,
} from './types';
import {
	CCM_STATUS_OK,
	CHAIN_REGISTERED,
	EMPTY_BYTES,
	LIVENESS_LIMIT,
	MAX_CCM_SIZE,
	MESSAGE_TAG_CERTIFICATE,
	MODULE_ID_INTEROPERABILITY,
	SMT_KEY_LENGTH,
	STORE_PREFIX_CHANNEL_DATA,
	STORE_PREFIX_OUTBOX_ROOT,
} from './constants';
import {
	ccmSchema,
	chainAccountSchema,
	chainValidatorsSchema,
	channelSchema,
	sidechainTerminatedCCMParamsSchema,
	validatorsHashInputSchema,
} from './schemas';
import { BlockHeader, VerificationResult, VerifyStatus } from '../../state_machine';
import { Certificate } from '../../engine/consensus/certificate_generation/types';
import { certificateSchema } from '../../engine/consensus/certificate_generation/schema';
import { CommandExecuteContext, SubStore } from '../../state_machine/types';

interface CommonExecutionLogicArgs {
	context: CommandExecuteContext<CrossChainUpdateTransactionParams>;
	certificate: Certificate;
	partnerValidators: ChainValidators;
	partnerChainAccount: ChainAccount;
	partnerValidatorStore: SubStore;
	partnerChainStore: SubStore;
	chainIDBuffer: Buffer;
}
// Returns the big endian uint32 serialization of an integer x, with 0 <= x < 2^32 which is 4 bytes long.
export const getIDAsKeyForStore = (id: number) => intToBuffer(id, 4);

export const validateFormat = (ccm: CCMsg) => {
	const errors = validator.validate(ccmSchema, ccm);
	if (errors.length) {
		const error = new LiskValidationError(errors);

		throw error;
	}
	const serializedCCM = codec.encode(ccmSchema, ccm);
	if (serializedCCM.byteLength > MAX_CCM_SIZE) {
		throw new Error(`Cross chain message is over the the max ccm size limit of ${MAX_CCM_SIZE}`);
	}
};

export const getCCMSize = (ccm: CCMsg) => {
	const serializedCCM = codec.encode(ccmSchema, ccm);

	return serializedCCM.byteLength;
};

export const updateActiveValidators = (
	activeValidators: ActiveValidators[],
	activeValidatorsUpdate: ActiveValidators[],
): ActiveValidators[] => {
	for (const updatedValidator of activeValidatorsUpdate) {
		const currentValidator = activeValidators.find(v => v.blsKey.equals(updatedValidator.blsKey));
		if (currentValidator) {
			currentValidator.bftWeight = updatedValidator.bftWeight;
		} else {
			activeValidators.push(updatedValidator);
			activeValidators.sort((v1, v2) => v1.blsKey.compare(v2.blsKey));
		}
	}

	for (const currentValidator of activeValidators) {
		if (currentValidator.bftWeight === BigInt(0)) {
			const index = activeValidators.findIndex(v => v.blsKey.equals(currentValidator.blsKey));
			activeValidators.splice(index, 1);
		}
	}

	return activeValidators;
};

export const getEncodedSidechainTerminatedCCMParam = (
	ccm: CCMsg,
	receivingChainAccount: ChainAccount,
) => {
	const params = {
		chainID: ccm.receivingChainID,
		stateRoot: receivingChainAccount.lastCertificate.stateRoot,
	};

	const encodedParams = codec.encode(sidechainTerminatedCCMParamsSchema, params);

	return encodedParams;
};

export const handlePromiseErrorWithNull = async <T>(promise: Promise<T>) => {
	let result;
	try {
		result = await promise;
	} catch {
		result = null;
	}
	return result;
};

export const isValidName = (username: string): boolean => /^[a-z0-9!@$&_.]+$/g.test(username);

export const computeValidatorsHash = (
	initValidators: ActiveValidators[],
	certificateThreshold: bigint,
) => {
	const input = {
		activeValidators: initValidators,
		certificateThreshold,
	};

	const encodedValidatorsHashInput = codec.encode(validatorsHashInputSchema, input);
	return hash(encodedValidatorsHashInput);
};

export const sortValidatorsByBLSKey = (validators: ActiveValidators[]) =>
	validators.sort((a, b) => a.blsKey.compare(b.blsKey));

export const verifyMessageRecovery = (
	params: MessageRecoveryVerificationParams,
	terminatedChainOutboxAccount?: TerminatedOutboxAccount,
) => {
	if (!terminatedChainOutboxAccount) {
		return {
			status: VerifyStatus.FAIL,
			error: new Error('Terminated outbox account does not exist'),
		};
	}

	const { idxs, crossChainMessages, siblingHashes } = params;
	for (const index of idxs) {
		if (index < terminatedChainOutboxAccount.partnerChainInboxSize) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Cross chain messages are still pending'),
			};
		}
	}

	const deserializedCCMs = crossChainMessages.map(serializedCcm =>
		codec.decode<CCMsg>(ccmSchema, serializedCcm),
	);
	for (const ccm of deserializedCCMs) {
		if (ccm.status !== CCM_STATUS_OK) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Cross chain message that needs to be recovered is not valid'),
			};
		}
	}

	const proof = {
		size: terminatedChainOutboxAccount.outboxSize,
		idxs,
		siblingHashes,
	};
	const hashedCCMs = crossChainMessages.map(ccm => hash(ccm));
	const isVerified = regularMerkleTree.verifyDataBlock(
		hashedCCMs,
		proof,
		terminatedChainOutboxAccount.outboxRoot,
	);
	if (!isVerified) {
		return {
			status: VerifyStatus.FAIL,
			error: new Error('The sidechain outbox root is not valid'),
		};
	}

	return {
		status: VerifyStatus.OK,
	};
};
export const swapReceivingAndSendingChainIDs = (ccm: CCMsg) => ({
	...ccm,
	receivingChainID: ccm.sendingChainID,
	sendingChainID: ccm.receivingChainID,
});
export const rawStateStoreKey = (storePrefix: number) => {
	const moduleIDBuffer = Buffer.alloc(4);
	moduleIDBuffer.writeInt32BE(MODULE_ID_INTEROPERABILITY, 0);
	const storePrefixBuffer = Buffer.alloc(2);
	storePrefixBuffer.writeUInt16BE(storePrefix, 0);

	return Buffer.concat([DB_KEY_STATE_STORE, moduleIDBuffer, storePrefixBuffer]);
};

export const isInboxUpdateEmpty = (inboxUpdate: InboxUpdate) =>
	inboxUpdate.crossChainMessages.length === 0 &&
	inboxUpdate.messageWitness.siblingHashes.length === 0 &&
	inboxUpdate.messageWitness.partnerChainOutboxSize === BigInt(0) &&
	inboxUpdate.outboxRootWitness.siblingHashes.length === 0 &&
	inboxUpdate.outboxRootWitness.bitmap.length === 0;

export const isCertificateEmpty = (decodedCertificate: Certificate) =>
	decodedCertificate.blockID.equals(EMPTY_BYTES) ||
	decodedCertificate.stateRoot.equals(EMPTY_BYTES) ||
	decodedCertificate.validatorsHash.equals(EMPTY_BYTES) ||
	decodedCertificate.timestamp === 0;

export const isMessageWitnessEmpty = (messageWitness: MsgWitness) =>
	messageWitness.partnerChainOutboxSize === BigInt(0) && messageWitness.siblingHashes.length === 0;

export const checkLivenessRequirementFirstCCU = (
	partnerChainAccount: ChainAccount,
	txParams: CrossChainUpdateTransactionParams,
): VerificationResult => {
	if (partnerChainAccount.status === CHAIN_REGISTERED && txParams.certificate.equals(EMPTY_BYTES)) {
		return {
			status: VerifyStatus.FAIL,
			error: new Error(
				`Sending partner chain ${txParams.sendingChainID.readInt32BE(
					0,
				)} has a registered status so certificate cannot be empty.`,
			),
		};
	}

	return {
		status: VerifyStatus.OK,
	};
};

export const checkCertificateValidity = (
	partnerChainAccount: ChainAccount,
	encodedCertificate: Buffer,
): VerificationResult => {
	if (encodedCertificate.equals(EMPTY_BYTES)) {
		return {
			status: VerifyStatus.OK,
		};
	}

	const decodedCertificate = codec.decode<Certificate>(certificateSchema, encodedCertificate);
	if (isCertificateEmpty(decodedCertificate)) {
		return {
			status: VerifyStatus.FAIL,
			error: new Error('Certificate is missing required values.'),
		};
	}

	// Last certificate height should be less than new certificate height
	if (partnerChainAccount.lastCertificate.height >= decodedCertificate.height) {
		return {
			status: VerifyStatus.FAIL,
			error: new Error('Certificate height should be greater than last certificate height.'),
		};
	}

	return {
		status: VerifyStatus.OK,
	};
};

export const checkActiveValidatorsUpdate = (
	txParams: CrossChainUpdateTransactionParams,
): VerificationResult => {
	if (
		txParams.activeValidatorsUpdate.length === 0 &&
		txParams.newCertificateThreshold === BigInt(0)
	) {
		return { status: VerifyStatus.OK };
	}
	// Non-empty certificate
	if (txParams.certificate.equals(EMPTY_BYTES)) {
		return {
			status: VerifyStatus.FAIL,
			error: new Error(
				'Certificate cannot be empty when activeValidatorsUpdate is non-empty or newCertificateThreshold > 0.',
			),
		};
	}

	// params.activeValidatorsUpdate has the correct format
	for (let i = 0; i < txParams.activeValidatorsUpdate.length - 1; i += 1) {
		const currentValidator = txParams.activeValidatorsUpdate[i];
		const nextValidator = txParams.activeValidatorsUpdate[i + 1];
		if (currentValidator.blsKey.compare(nextValidator.blsKey) > -1) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Validators blsKeys must be unique and lexicographically ordered.'),
			};
		}
	}

	return {
		status: VerifyStatus.OK,
	};
};

export const checkInboxUpdateValidity = (
	txParams: CrossChainUpdateTransactionParams,
	partnerChannelData: ChannelData,
): VerificationResult => {
	// If inboxUpdate is empty then return success
	if (isInboxUpdateEmpty(txParams.inboxUpdate)) {
		return {
			status: VerifyStatus.OK,
		};
	}
	const decodedCertificate = codec.decode<Certificate>(certificateSchema, txParams.certificate);
	const { crossChainMessages, messageWitness, outboxRootWitness } = txParams.inboxUpdate;
	const ccmHashes = crossChainMessages.map(ccm => hash(ccm));

	let newInboxRoot;
	let newInboxAppendPath = partnerChannelData.inbox.appendPath;
	let newInboxSize = partnerChannelData.inbox.size;
	for (const ccm of ccmHashes) {
		const { appendPath, size, root } = regularMerkleTree.calculateMerkleRoot({
			value: ccm,
			appendPath: newInboxAppendPath,
			size: newInboxSize,
		});
		newInboxAppendPath = appendPath;
		newInboxSize = size;
		newInboxRoot = root;
	}
	// non-empty certificate and an inboxUpdate
	if (!isCertificateEmpty(decodedCertificate)) {
		// If inboxUpdate contains a non-empty messageWitness, then update newInboxRoot to the output
		if (!isMessageWitnessEmpty(txParams.inboxUpdate.messageWitness)) {
			newInboxRoot = regularMerkleTree.calculateRootFromRightWitness(
				newInboxSize,
				newInboxAppendPath,
				messageWitness.siblingHashes,
			);
		}
		const outboxKey = rawStateStoreKey(STORE_PREFIX_OUTBOX_ROOT);
		const proof = {
			siblingHashes: outboxRootWitness.siblingHashes,
			queries: [
				{
					key: outboxKey,
					value: newInboxRoot as Buffer,
					bitmap: outboxRootWitness.bitmap,
				},
			],
		};
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
	}

	// empty certificate and a non-empty inboxUpdate
	if (isCertificateEmpty(decodedCertificate)) {
		// If inboxUpdate contains a non-empty messageWitness, then update newInboxRoot to the output
		if (!isMessageWitnessEmpty(txParams.inboxUpdate.messageWitness)) {
			newInboxRoot = regularMerkleTree.calculateRootFromRightWitness(
				newInboxSize,
				newInboxAppendPath,
				messageWitness.siblingHashes,
			);
		}
		if (!(newInboxRoot as Buffer).equals(partnerChannelData.partnerChainOutboxRoot)) {
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
};

export const checkValidCertificateLiveness = (
	txParams: CrossChainUpdateTransactionParams,
	header: BlockHeader,
	certificate: Certificate,
) => {
	if (isInboxUpdateEmpty(txParams.inboxUpdate)) {
		return;
	}
	if (!(header.timestamp - certificate.timestamp < LIVENESS_LIMIT / 2)) {
		throw Error(
			`Certificate is not valid as it passed Liveness limit of ${LIVENESS_LIMIT} seconds.`,
		);
	}
};

export const verifyCertificateSignature = (
	txParams: CrossChainUpdateTransactionParams,
	partnerValidators: ChainValidators,
	partnerChainAccount: ChainAccount,
): VerificationResult => {
	// Only check when ceritificate is non-empty
	if (txParams.certificate.equals(EMPTY_BYTES)) {
		return {
			status: VerifyStatus.OK,
		};
	}

	const decodedCertificate = codec.decode<Certificate>(certificateSchema, txParams.certificate);

	if (isCertificateEmpty(decodedCertificate)) {
		return {
			status: VerifyStatus.FAIL,
			error: new Error(
				'Certificate should have all required values when activeValidatorsUpdate or newCertificateThreshold has a non-empty value.',
			),
		};
	}
	const { activeValidators, certificateThreshold } = partnerValidators;
	const verifySignature = verifyWeightedAggSig(
		activeValidators.map(v => v.blsKey),
		decodedCertificate.aggregationBits as Buffer,
		decodedCertificate.signature as Buffer,
		MESSAGE_TAG_CERTIFICATE,
		partnerChainAccount.networkID,
		txParams.certificate,
		activeValidators.map(v => v.bftWeight),
		certificateThreshold,
	);

	if (!verifySignature) {
		return {
			status: VerifyStatus.FAIL,
			error: new Error('Certificate is invalid due to invalid signature.'),
		};
	}

	return {
		status: VerifyStatus.OK,
	};
};

export const checkCertificateTimestamp = (
	txParams: CrossChainUpdateTransactionParams,
	certificate: Certificate,
	header: BlockHeader,
) => {
	// Only check when ceritificate is non-empty
	if (txParams.certificate.equals(EMPTY_BYTES)) {
		return;
	}

	if (certificate.timestamp >= header.timestamp) {
		throw Error('Certificate is invalid due to invalid timestamp.');
	}
};

export const checkValidatorsHashWithCertificate = (
	txParams: CrossChainUpdateTransactionParams,
	partnerValidators: ChainValidators,
): VerificationResult => {
	if (
		txParams.activeValidatorsUpdate.length !== 0 ||
		txParams.newCertificateThreshold > BigInt(0)
	) {
		if (txParams.certificate.equals(EMPTY_BYTES)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					'Certificate cannot be empty when activeValidatorsUpdate or newCertificateThreshold has a non-empty value.',
				),
			};
		}
		const decodedCertificate = codec.decode<Certificate>(certificateSchema, txParams.certificate);

		if (isCertificateEmpty(decodedCertificate)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					'Certificate should have all required values when activeValidatorsUpdate or newCertificateThreshold has a non-empty value.',
				),
			};
		}

		const newActiveValidators = updateActiveValidators(
			partnerValidators.activeValidators,
			txParams.activeValidatorsUpdate,
		);

		const validatorsHash = computeValidatorsHash(
			newActiveValidators,
			txParams.newCertificateThreshold || partnerValidators.certificateThreshold,
		);

		if (!decodedCertificate.validatorsHash.equals(validatorsHash)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Validators hash given in the certificate is incorrect.'),
			};
		}
	}

	return {
		status: VerifyStatus.OK,
	};
};

export const commonCCUExecutelogic = async (args: CommonExecutionLogicArgs) => {
	const {
		certificate,
		partnerChainAccount,
		partnerValidatorStore,
		partnerChainStore,
		partnerValidators,
		chainIDBuffer,
		context,
	} = args;
	const newActiveValidators = updateActiveValidators(
		partnerValidators.activeValidators,
		context.params.activeValidatorsUpdate,
	);
	partnerValidators.activeValidators = newActiveValidators;
	if (context.params.newCertificateThreshold !== BigInt(0)) {
		partnerValidators.certificateThreshold = context.params.newCertificateThreshold;
	}
	await partnerValidatorStore.setWithSchema(
		chainIDBuffer,
		partnerValidators,
		chainValidatorsSchema,
	);
	if (!context.params.certificate.equals(EMPTY_BYTES)) {
		partnerChainAccount.lastCertificate.stateRoot = certificate.stateRoot;
		partnerChainAccount.lastCertificate.timestamp = certificate.timestamp;
		partnerChainAccount.lastCertificate.height = certificate.height;
		partnerChainAccount.lastCertificate.validatorsHash = certificate.validatorsHash;
		await partnerChainStore.setWithSchema(chainIDBuffer, partnerChainAccount, chainAccountSchema);
	}

	const partnerChannelStore = context.getStore(
		context.transaction.moduleID,
		STORE_PREFIX_CHANNEL_DATA,
	);
	const partnerChannelData = await partnerChannelStore.getWithSchema<ChannelData>(
		chainIDBuffer,
		channelSchema,
	);
	const { inboxUpdate } = context.params;
	if (
		inboxUpdate.messageWitness.partnerChainOutboxSize === BigInt(0) ||
		inboxUpdate.messageWitness.siblingHashes.length === 0
	) {
		partnerChannelData.partnerChainOutboxRoot = partnerChannelData.inbox.root;
	} else {
		partnerChannelData.partnerChainOutboxRoot = regularMerkleTree.calculateRootFromRightWitness(
			partnerChannelData.inbox.size,
			partnerChannelData.inbox.appendPath,
			inboxUpdate.messageWitness.siblingHashes,
		);
	}
	await partnerChannelStore.setWithSchema(chainIDBuffer, partnerChannelData, channelSchema);
};
