/*
 * Copyright © 2021 Lisk Foundation
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

import { bls } from '@liskhq/lisk-cryptography';
import { BlockHeader } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { Certificate, UnsignedCertificate } from './types';
import { certificateSchema, unsignedCertificateSchema } from './schema';
import { MESSAGE_TAG_CERTIFICATE } from './constants';
import { Validator } from '../types';

export const computeUnsignedCertificateFromBlockHeader = (
	blockHeader: BlockHeader,
): UnsignedCertificate => {
	if (!blockHeader.stateRoot) {
		throw new Error("'stateRoot' is not defined.");
	}

	if (!blockHeader.validatorsHash) {
		throw new Error("'validatorsHash' is not defined.");
	}

	return {
		blockID: blockHeader.id,
		height: blockHeader.height,
		stateRoot: blockHeader.stateRoot,
		timestamp: blockHeader.timestamp,
		validatorsHash: blockHeader.validatorsHash,
	};
};

export const signCertificate = (
	sk: Buffer,
	chainID: Buffer,
	unsignedCertificate: UnsignedCertificate,
): Buffer =>
	bls.signData(
		MESSAGE_TAG_CERTIFICATE,
		chainID,
		codec.encode(unsignedCertificateSchema, unsignedCertificate),
		sk,
	);

export const verifySingleCertificateSignature = (
	pk: Buffer,
	signature: Buffer,
	chainID: Buffer,
	unsignedCertificate: UnsignedCertificate,
): boolean => {
	const message = codec.encode(unsignedCertificateSchema, {
		blockID: unsignedCertificate.blockID,
		height: unsignedCertificate.height,
		timestamp: unsignedCertificate.timestamp,
		stateRoot: unsignedCertificate.stateRoot,
		validatorsHash: unsignedCertificate.validatorsHash,
	});

	return bls.verifyData(MESSAGE_TAG_CERTIFICATE, chainID, message, signature, pk);
};

export const verifyAggregateCertificateSignature = (
	validators: Validator[],
	threshold: number | bigint,
	chainID: Buffer,
	certificate: Certificate,
): boolean => {
	if (!certificate.aggregationBits || !certificate.signature) {
		return false;
	}

	const validatorKeysWithWeights = [];
	for (const validator of validators) {
		validatorKeysWithWeights.push({
			weight: validator.bftWeight,
			blsKey: validator.blsKey,
		});
	}
	const { weights, validatorKeys } = getSortedWeightsAndValidatorKeys(validatorKeysWithWeights);

	const { aggregationBits, signature } = certificate;
	const message = codec.encode(certificateSchema, {
		blockID: certificate.blockID,
		height: certificate.height,
		timestamp: certificate.timestamp,
		stateRoot: certificate.stateRoot,
		validatorsHash: certificate.validatorsHash,
	});

	return bls.verifyWeightedAggSig(
		validatorKeys,
		aggregationBits,
		signature,
		MESSAGE_TAG_CERTIFICATE,
		chainID,
		message,
		weights,
		threshold,
	);
};

export const getSortedWeightsAndValidatorKeys = (
	validatorKeysWithWeightsParam: {
		weight: bigint;
		blsKey: Buffer;
	}[],
) => {
	const validatorKeysWithWeights = validatorKeysWithWeightsParam.map(validatorKeyWithWeight => ({
		...validatorKeyWithWeight,
	}));
	validatorKeysWithWeights.sort((a, b) => a.blsKey.compare(b.blsKey));
	const weights = [];
	const validatorKeys = [];

	for (const validatorKeyWithWeight of validatorKeysWithWeights) {
		weights.push(validatorKeyWithWeight.weight);
		validatorKeys.push(validatorKeyWithWeight.blsKey);
	}

	return { weights, validatorKeys };
};
