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
import { utils } from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';
import { NAME_REGEX } from '@liskhq/lisk-chain';
import {
	ActiveValidators,
	CCMsg,
	ChainAccount,
	ChannelData,
	CrossChainUpdateTransactionParams,
	ChainValidators,
	InboxUpdate,
} from './types';
import {
	EMPTY_BYTES,
	LIVENESS_LIMIT,
	MAX_CCM_SIZE,
	SMT_KEY_LENGTH,
	CHAIN_ID_LENGTH,
} from './constants';
import {
	ccmSchema,
	sidechainTerminatedCCMParamsSchema,
	validatorsHashInputSchema,
} from './schemas';
import { BlockHeader, VerificationResult, VerifyStatus } from '../../state_machine';
import { Certificate } from '../../engine/consensus/certificate_generation/types';
import { certificateSchema } from '../../engine/consensus/certificate_generation/schema';
import { CommandExecuteContext } from '../../state_machine/types';
import { certificateToJSON } from './certificates';
import { NamedRegistry } from '../named_registry';
import { OutboxRootStore } from './stores/outbox_root';
import { ChannelDataStore } from './stores/channel_data';
import { ChainValidatorsStore, calculateNewActiveValidators } from './stores/chain_validators';
import { ChainAccountStore, ChainStatus } from './stores/chain_account';

interface CommonExecutionLogicArgs {
	stores: NamedRegistry;
	context: CommandExecuteContext<CrossChainUpdateTransactionParams>;
	certificate: Certificate;
	partnerValidators: ChainValidators;
	partnerChainAccount: ChainAccount;
	partnerValidatorStore: ChainValidatorsStore;
	partnerChainStore: ChainAccountStore;
	chainIDBuffer: Buffer;
}

export const validateFormat = (ccm: CCMsg) => {
	validator.validate(ccmSchema, ccm);

	const serializedCCM = codec.encode(ccmSchema, ccm);
	for (const field of ['module', 'crossChainCommand'] as const) {
		if (!new RegExp(NAME_REGEX).test(ccm[field])) {
			throw new Error(`Cross-chain message ${field} name must be alphanumeric.`);
		}
	}

	if (serializedCCM.byteLength > MAX_CCM_SIZE) {
		throw new Error(`Cross-chain message size is larger than ${MAX_CCM_SIZE}.`);
	}
};

export const getCCMSize = (ccm: CCMsg) => {
	const serializedCCM = codec.encode(ccmSchema, ccm);

	return BigInt(serializedCCM.byteLength);
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
	return utils.hash(encodedValidatorsHashInput);
};

export const sortValidatorsByBLSKey = (validators: ActiveValidators[]) =>
	validators.sort((a, b) => a.blsKey.compare(b.blsKey));

export const swapReceivingAndSendingChainIDs = (ccm: CCMsg) => ({
	...ccm,
	receivingChainID: ccm.sendingChainID,
	sendingChainID: ccm.receivingChainID,
});

export const isInboxUpdateEmpty = (inboxUpdate: InboxUpdate) =>
	inboxUpdate.crossChainMessages.length === 0 &&
	inboxUpdate.messageWitnessHashes.length === 0 &&
	inboxUpdate.outboxRootWitness.siblingHashes.length === 0 &&
	inboxUpdate.outboxRootWitness.bitmap.length === 0;

export const isCertificateEmpty = (decodedCertificate: Certificate) =>
	decodedCertificate.blockID.equals(EMPTY_BYTES) ||
	decodedCertificate.stateRoot.equals(EMPTY_BYTES) ||
	decodedCertificate.validatorsHash.equals(EMPTY_BYTES) ||
	decodedCertificate.timestamp === 0;

export const checkLivenessRequirementFirstCCU = (
	partnerChainAccount: ChainAccount,
	txParams: CrossChainUpdateTransactionParams,
): VerificationResult => {
	if (
		partnerChainAccount.status === ChainStatus.REGISTERED &&
		txParams.certificate.equals(EMPTY_BYTES)
	) {
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

export const checkInboxUpdateValidity = (
	stores: NamedRegistry,
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
	const { crossChainMessages, messageWitnessHashes, outboxRootWitness } = txParams.inboxUpdate;
	const ccmHashes = crossChainMessages.map(ccm => utils.hash(ccm));

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
		// If inboxUpdate contains a non-empty messageWitnessHashes, then update newInboxRoot to the output
		if (txParams.inboxUpdate.messageWitnessHashes.length !== 0) {
			newInboxRoot = regularMerkleTree.calculateRootFromRightWitness(
				newInboxSize,
				newInboxAppendPath,
				messageWitnessHashes,
			);
		}
		const outboxStore = stores.get(OutboxRootStore);
		const outboxKey = outboxStore.key;
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
					'Failed at verifying state root when messageWitnessHashes and certificate are non-empty.',
				),
			};
		}
	}

	// empty certificate and a non-empty inboxUpdate
	if (isCertificateEmpty(decodedCertificate)) {
		// If inboxUpdate contains a non-empty messageWitnessHashes, then update newInboxRoot to the output
		if (txParams.inboxUpdate.messageWitnessHashes.length !== 0) {
			newInboxRoot = regularMerkleTree.calculateRootFromRightWitness(
				newInboxSize,
				newInboxAppendPath,
				messageWitnessHashes,
			);
		}
		if (!(newInboxRoot as Buffer).equals(partnerChannelData.partnerChainOutboxRoot)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					'Failed at verifying state root when messageWitnessHashes is non-empty and certificate is empty.',
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
	if (txParams.activeValidatorsUpdate.length !== 0 || txParams.certificateThreshold > BigInt(0)) {
		if (txParams.certificate.equals(EMPTY_BYTES)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					'Certificate cannot be empty when activeValidatorsUpdate or certificateThreshold has a non-empty value.',
				),
			};
		}
		let decodedCertificate: Certificate;
		try {
			decodedCertificate = codec.decode<Certificate>(certificateSchema, txParams.certificate);
			if (isCertificateEmpty(decodedCertificate)) {
				throw new Error('Invalid empty certificate.');
			}
		} catch (error) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					'Certificate should have all required values when activeValidatorsUpdate or certificateThreshold has a non-empty value.',
				),
			};
		}

		const newActiveValidators = calculateNewActiveValidators(
			partnerValidators.activeValidators,
			txParams.activeValidatorsUpdate,
		);

		const validatorsHash = computeValidatorsHash(
			newActiveValidators,
			txParams.certificateThreshold || partnerValidators.certificateThreshold,
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
		stores,
		certificate,
		partnerChainAccount,
		partnerValidatorStore,
		partnerChainStore,
		partnerValidators,
		chainIDBuffer,
		context,
	} = args;
	const newActiveValidators = calculateNewActiveValidators(
		partnerValidators.activeValidators,
		context.params.activeValidatorsUpdate,
	);
	partnerValidators.activeValidators = newActiveValidators;
	if (context.params.certificateThreshold !== BigInt(0)) {
		partnerValidators.certificateThreshold = context.params.certificateThreshold;
	}
	await partnerValidatorStore.set(context, chainIDBuffer, partnerValidators);
	if (!context.params.certificate.equals(EMPTY_BYTES)) {
		partnerChainAccount.lastCertificate.stateRoot = certificate.stateRoot;
		partnerChainAccount.lastCertificate.timestamp = certificate.timestamp;
		partnerChainAccount.lastCertificate.height = certificate.height;
		partnerChainAccount.lastCertificate.validatorsHash = certificate.validatorsHash;
		await partnerChainStore.set(context, chainIDBuffer, partnerChainAccount);
	}

	const partnerChannelStore = stores.get(ChannelDataStore);
	const partnerChannelData = await partnerChannelStore.get(context, chainIDBuffer);
	const { inboxUpdate } = context.params;
	if (inboxUpdate.messageWitnessHashes.length === 0) {
		partnerChannelData.partnerChainOutboxRoot = partnerChannelData.inbox.root;
	} else {
		partnerChannelData.partnerChainOutboxRoot = regularMerkleTree.calculateRootFromRightWitness(
			partnerChannelData.inbox.size,
			partnerChannelData.inbox.appendPath,
			inboxUpdate.messageWitnessHashes,
		);
	}
	await partnerChannelStore.set(context, chainIDBuffer, partnerChannelData);
};

export const chainAccountToJSON = (chainAccount: ChainAccount) => {
	const { lastCertificate, name, status } = chainAccount;

	return {
		lastCertificate: certificateToJSON(lastCertificate),
		name,
		status,
	};
};

export const verifyLivenessConditionForRegisteredChains = (
	ccu: CrossChainUpdateTransactionParams,
	blockTimestamp: number,
) => {
	if (ccu.certificate.length === 0 || isInboxUpdateEmpty(ccu.inboxUpdate)) {
		return;
	}
	const certificate = codec.decode<Certificate>(certificateSchema, ccu.certificate);
	const limitSecond = LIVENESS_LIMIT / 2;
	if (blockTimestamp - certificate.timestamp > limitSecond) {
		throw new Error(
			`The first CCU with a non-empty inbox update cannot contain a certificate older than ${limitSecond} seconds.`,
		);
	}
};

export const getMainchainID = (chainID: Buffer): Buffer => {
	const networkID = chainID.slice(0, 1);
	// 3 bytes for remaining chainID bytes
	return Buffer.concat([networkID, Buffer.alloc(CHAIN_ID_LENGTH - 1, 0)]);
};

// TODO: Update to use Token method after merging development
export const getMainchainTokenID = (chainID: Buffer): Buffer => {
	const networkID = chainID.slice(0, 1);
	// 3 bytes for remaining chainID bytes
	return Buffer.concat([networkID, Buffer.alloc(7, 0)]);
};

export const getEncodedCCMAndID = (ccm: CCMsg) => {
	const encodedCCM = codec.encode(ccmSchema, ccm);
	return { ccmID: utils.hash(encodedCCM), encodedCCM };
};
