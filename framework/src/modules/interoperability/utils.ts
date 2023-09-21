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
import { utils } from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';
import { NAME_REGEX } from '@liskhq/lisk-chain';
import {
	ActiveValidators,
	CCMsg,
	ChainAccount,
	CrossChainUpdateTransactionParams,
	ChainValidators,
	InboxUpdate,
	OutboxRootWitness,
	ActiveValidatorsUpdate,
} from './types';
import { EMPTY_BYTES, LIVENESS_LIMIT, MAX_CCM_SIZE, CHAIN_ID_LENGTH } from './constants';
import {
	ccmSchema,
	sidechainTerminatedCCMParamsSchema,
	validatorsHashInputSchema,
} from './schemas';
import { BlockHeader, VerificationResult, VerifyStatus } from '../../state_machine';
import { Certificate } from '../../engine/consensus/certificate_generation/types';
import { certificateSchema } from '../../engine/consensus/certificate_generation/schema';
import { certificateToJSON } from './certificates';
import { ChainStatus } from './stores/chain_account';

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

export const validNameChars = 'a-z0-9!@$&_.';
export const isValidName = (username: string): boolean =>
	new RegExp(`^[${validNameChars}]+$`, 'g').test(username);

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

export const isOutboxRootWitnessEmpty = (outboxRootWitness: OutboxRootWitness) =>
	outboxRootWitness.siblingHashes.length === 0 || outboxRootWitness.bitmap.length === 0;

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

	const certificate = codec.decode<Certificate>(certificateSchema, encodedCertificate);
	try {
		validator.validate(certificateSchema, certificate);
	} catch (err) {
		return {
			status: VerifyStatus.FAIL,
			error: new Error('Certificate is missing required values.'),
		};
	}

	// Last certificate height should be less than new certificate height
	if (partnerChainAccount.lastCertificate.height >= certificate.height) {
		return {
			status: VerifyStatus.FAIL,
			error: new Error('Certificate height should be greater than last certificate height.'),
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
		!emptyActiveValidatorsUpdate(txParams.activeValidatorsUpdate) ||
		txParams.certificateThreshold > BigInt(0)
	) {
		if (txParams.certificate.equals(EMPTY_BYTES)) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(
					'Certificate cannot be empty when activeValidatorsUpdate or certificateThreshold has a non-empty value.',
				),
			};
		}
		let certificate: Certificate;
		try {
			certificate = codec.decode<Certificate>(certificateSchema, txParams.certificate);
			validator.validate(certificateSchema, certificate);
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
			txParams.activeValidatorsUpdate.blsKeysUpdate,
			txParams.activeValidatorsUpdate.bftWeightsUpdate,
			txParams.activeValidatorsUpdate.bftWeightsUpdateBitmap,
		);

		const validatorsHash = computeValidatorsHash(
			newActiveValidators,
			txParams.certificateThreshold || partnerValidators.certificateThreshold,
		);

		if (!certificate.validatorsHash.equals(validatorsHash)) {
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

export const chainAccountToJSON = (chainAccount: ChainAccount) => {
	const { lastCertificate, name, status } = chainAccount;

	return {
		lastCertificate: certificateToJSON(lastCertificate),
		name,
		status,
	};
};

export const verifyLivenessConditionForRegisteredChains = (
	blockTimestamp: number,
	certificateBytes: Buffer,
) => {
	const certificate = codec.decode<Certificate>(certificateSchema, certificateBytes);
	validator.validate(certificateSchema, certificate);

	const limitSecond = LIVENESS_LIMIT / 2;
	if (blockTimestamp - certificate.timestamp > limitSecond) {
		throw new Error(
			`The first CCU with a non-empty inbox update cannot contain a certificate older than ${limitSecond} seconds.`,
		);
	}
};

export const getMainchainID = (chainID: Buffer): Buffer => {
	const networkID = chainID.subarray(0, 1);
	// 3 bytes for remaining chainID bytes
	return Buffer.concat([networkID, Buffer.alloc(CHAIN_ID_LENGTH - 1, 0)]);
};

// TODO: Update to use Token method after merging development
export const getTokenIDLSK = (chainID: Buffer): Buffer => {
	const networkID = chainID.subarray(0, 1);
	// 3 bytes for remaining chainID bytes
	return Buffer.concat([networkID, Buffer.alloc(7, 0)]);
};

export const getIDFromCCMBytes = (ccmBytes: Buffer) => utils.hash(ccmBytes);

export const getEncodedCCMAndID = (ccm: CCMsg) => {
	const encodedCCM = codec.encode(ccmSchema, ccm);
	return { encodedCCM, ccmID: getIDFromCCMBytes(encodedCCM) };
};

export const getDecodedCCMAndID = (ccmBytes: Buffer) => {
	const decodedCCM = codec.decode<CCMsg>(ccmSchema, ccmBytes);
	return {
		decodedCCM,
		ccmID: getIDFromCCMBytes(ccmBytes),
	};
};

export const emptyActiveValidatorsUpdate = (value: ActiveValidatorsUpdate): boolean =>
	value.blsKeysUpdate.length === 0 &&
	value.bftWeightsUpdate.length === 0 &&
	value.bftWeightsUpdateBitmap.length === 0;

export const calculateNewActiveValidators = (
	activeValidators: ActiveValidators[],
	blskeysUpdate: Buffer[],
	bftWeightsUpdate: bigint[],
	bftWeightsUpdateBitmap: Buffer,
): ActiveValidators[] => {
	const newValidators = blskeysUpdate.map(blsKey => ({
		blsKey,
		bftWeight: BigInt(0),
	}));
	const newActiveValidators = [...activeValidators, ...newValidators];
	newActiveValidators.sort((a, b) => a.blsKey.compare(b.blsKey));
	const intBitmap = BigInt(`0x${bftWeightsUpdateBitmap.toString('hex')}`);
	let weightUsed = 0;
	for (let i = 0; i < newActiveValidators.length; i += 1) {
		// Get digit of bitmap at index idx (starting from the right) and check if it is 1.
		if (((intBitmap >> BigInt(i)) & BigInt(1)) === BigInt(1)) {
			newActiveValidators[i].bftWeight = bftWeightsUpdate[weightUsed];
			weightUsed += 1;
		}
	}
	if (weightUsed !== bftWeightsUpdate.length) {
		throw new Error('No BFT weights should be left.');
	}

	return newActiveValidators.filter(v => v.bftWeight > BigInt(0));
};
