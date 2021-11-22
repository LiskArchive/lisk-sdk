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

import { BlockHeader } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { verifyWeightedAggSig } from '@liskhq/lisk-cryptography';
import { MESSAGE_TAG_CERTIFICATE } from './constants';
import { certificateSchema } from './schema';
import { Certificate } from './types';

// TODO: https://github.com/LiskHQ/lisk-sdk/issues/6839
// eslint-disable-next-line @typescript-eslint/no-empty-function
export const computeCertificateFromBlockHeader = (_blockHeader: BlockHeader): Certificate =>
	({} as Certificate);

// TODO: https://github.com/LiskHQ/lisk-sdk/issues/6840
export const signCertificate = (
	_sk: Buffer,
	_networkIdentifier: Buffer,
	_blockHeader: BlockHeader,
	// eslint-disable-next-line @typescript-eslint/no-empty-function
): Buffer => Buffer.from('');

// TODO: https://github.com/LiskHQ/lisk-sdk/issues/6841
export const verifySingleCertificateSignature = (
	_pk: Buffer,
	_signature: Buffer,
	_networkIdentifier: Buffer,
	_certificate: Certificate,
	// eslint-disable-next-line @typescript-eslint/no-empty-function
): boolean => true;

// TODO: https://github.com/LiskHQ/lisk-sdk/issues/6842
export const verifyAggregateCertificateSignature = (
	keysList: Buffer[],
	weights: number[],
	threshold: number,
	networkIdentifier: Buffer,
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

	return verifyWeightedAggSig(
		keysList,
		aggregationBits,
		signature,
		MESSAGE_TAG_CERTIFICATE,
		networkIdentifier,
		message,
		weights,
		threshold,
	);
};
