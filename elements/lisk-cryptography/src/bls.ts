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
 *
 */

import {
	SecretKey,
	PublicKey,
	Signature,
	verify,
	aggregateVerify,
	fastAggregateVerify,
	aggregateSignatures,
} from '@chainsafe/blst';

const EMPTY_BUFFER = Buffer.alloc(0);

const isBufferEmpty = (b: Buffer) => b.toString('hex').replace(/0/g, '').trim().length === 0;

export const blsKeyValidate = (pk: Buffer): boolean => {
	try {
		const key = PublicKey.fromBytes(pk);
		key.keyValidate();
		return true;
	} catch {
		return false;
	}
};

// https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-bls-signature-04#section-2.3
export const blsKeyGen = (ikm: Buffer): Buffer => Buffer.from(SecretKey.fromKeygen(ikm).toBytes());

// https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-bls-signature-04#section-2.4
export const blsSkToPk = (sk: Buffer): Buffer =>
	Buffer.from(SecretKey.fromBytes(sk).toPublicKey().toBytes());

// https://tools.ietf.org/html/draft-irtf-cfrg-bls-signature-04#section-2.8
export const blsAggregate = (signatures: Buffer[]): Buffer => {
	try {
		return Buffer.from(aggregateSignatures(signatures.map(s => Signature.fromBytes(s))).toBytes());
	} catch {
		return EMPTY_BUFFER;
	}
};

// https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-bls-signature-04#section-2.6
export const blsSign = (sk: Buffer, message: Buffer): Buffer => {
	if (isBufferEmpty(sk)) {
		return EMPTY_BUFFER;
	}

	const signature = Buffer.from(SecretKey.fromBytes(sk).sign(message).toBytes());

	return signature;
};

// https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-bls-signature-04#section-2.7
export const blsVerify = (pk: Buffer, message: Buffer, signature: Buffer) => {
	try {
		const sig = Signature.fromBytes(signature);
		const pub = PublicKey.fromBytes(pk);

		return verify(message, pub, sig);
	} catch {
		return false;
	}
};

// https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-bls-signature-04#section-2.9
export const blsAggregateVerify = (
	publicKeys: ReadonlyArray<Buffer>,
	messages: ReadonlyArray<Buffer>,
	signature: Buffer,
): boolean => {
	try {
		return aggregateVerify(
			messages.map(m => m),
			publicKeys.map(k => PublicKey.fromBytes(k)),
			Signature.fromBytes(signature),
		);
	} catch {
		return false;
	}
};

//  https://tools.ietf.org/html/draft-irtf-cfrg-bls-signature-04#section-3.3.4
export const blsFastAggregateVerify = (
	publicKeys: ReadonlyArray<Buffer>,
	messages: Buffer,
	signature: Buffer,
): boolean => {
	try {
		return fastAggregateVerify(
			messages,
			publicKeys.map(k => PublicKey.fromBytes(k)),
			Signature.fromBytes(signature),
		);
	} catch {
		return false;
	}
};
//  https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-bls-signature-04#section-3.3.2
export const blsPopProve = (sk: Buffer): Buffer => blsSign(sk, blsSkToPk(sk));

//  https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-bls-signature-04#section-3.3.2
export const blsPopVerify = (pk: Buffer, proof: Buffer): boolean => {
	if (!blsKeyValidate(pk)) {
		return false;
	}

	return blsVerify(pk, pk, proof);
};
