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
import { Certificate } from './types';
import { certificateSchema } from './schema';
import { MESSAGE_TAG_CERTIFICATE } from './constants';

export const computeCertificateFromBlockHeader = (blockHeader: BlockHeader): Certificate => {
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

export const signCertificate = (sk: Buffer, chainID: Buffer, certificate: Certificate): Buffer => {
	const { aggregationBits, signature, ...rawCertificate } = certificate;

	return bls.signData(
		MESSAGE_TAG_CERTIFICATE,
		chainID,
		codec.encode(certificateSchema, rawCertificate),
		sk,
	);
};

export const verifySingleCertificateSignature = (
	pk: Buffer,
	signature: Buffer,
	chainID: Buffer,
	certificate: Certificate,
): boolean => {
	const message = codec.encode(certificateSchema, {
		blockID: certificate.blockID,
		height: certificate.height,
		timestamp: certificate.timestamp,
		stateRoot: certificate.stateRoot,
		validatorsHash: certificate.validatorsHash,
	});

	return bls.verifyData(MESSAGE_TAG_CERTIFICATE, chainID, message, signature, pk);
};

export const verifyAggregateCertificateSignature = (
	keysList: Buffer[],
	weights: number[] | bigint[],
	threshold: number | bigint,
	chainID: Buffer,
	certificate: Certificate,
): boolean => {
	if (!certificate.aggregationBits || !certificate.signature) {
		return false;
	}

	const { aggregationBits, signature } = certificate;
	const message = codec.encode(certificateSchema, {
		blockID: certificate.blockID,
		height: certificate.height,
		timestamp: certificate.timestamp,
		stateRoot: certificate.stateRoot,
		validatorsHash: certificate.validatorsHash,
	});

	return bls.verifyWeightedAggSig(
		keysList,
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
