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
import { unsignedCertificateSchema } from './schema';
import { MESSAGE_TAG_CERTIFICATE } from './constants';

/**
 * @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0061.md#creation
 */
export const computeUnsignedCertificateFromBlockHeader = (
	blockHeader: BlockHeader,
): UnsignedCertificate => {
	if (!blockHeader.stateRoot) {
		throw new Error('stateRoot is not defined.');
	}

	if (!blockHeader.validatorsHash) {
		throw new Error('validatorsHash is not defined.');
	}

	return {
		blockID: blockHeader.id,
		height: blockHeader.height,
		stateRoot: blockHeader.stateRoot,
		timestamp: blockHeader.timestamp,
		validatorsHash: blockHeader.validatorsHash,
	};
};

/**
 * @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0061.md#signcertificate
 */
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

/**
 * @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0061.md#verifysinglecertificatesignature
 */
export const verifySingleCertificateSignature = (
	pk: Buffer,
	signature: Buffer,
	chainID: Buffer,
	unsignedCertificate: UnsignedCertificate,
): boolean =>
	bls.verifyData(
		MESSAGE_TAG_CERTIFICATE,
		chainID,
		codec.encode(unsignedCertificateSchema, unsignedCertificate),
		signature,
		pk,
	);

/**
 * @see https://github.com/LiskHQ/lips/blob/main/proposals/lip-0061.md#verifyaggregatecertificatesignature
 */
export const verifyAggregateCertificateSignature = (
	validators: { blsKey: Buffer; bftWeight: bigint }[],
	threshold: bigint,
	chainID: Buffer,
	certificate: Certificate,
): boolean => {
	if (!certificate.aggregationBits || !certificate.signature) {
		return false;
	}

	const { weights, validatorKeys } = getSortedWeightsAndValidatorKeys(validators);
	const { aggregationBits, signature, ...unsignedCertificate } = certificate;

	return bls.verifyWeightedAggSig(
		validatorKeys,
		aggregationBits,
		signature,
		MESSAGE_TAG_CERTIFICATE,
		chainID,
		codec.encode(unsignedCertificateSchema, unsignedCertificate),
		weights,
		threshold,
	);
};

export const getSortedWeightsAndValidatorKeys = (
	validators: { blsKey: Buffer; bftWeight: bigint }[],
) => {
	validators.sort((a, b) => a.blsKey.compare(b.blsKey));
	const weights = [];
	const validatorKeys = [];

	for (const validator of validators) {
		weights.push(validator.bftWeight);
		validatorKeys.push(validator.blsKey);
	}

	return { weights, validatorKeys };
};
