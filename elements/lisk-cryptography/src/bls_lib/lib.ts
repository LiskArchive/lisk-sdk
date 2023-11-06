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
	aggregateSignatures,
	aggregateVerify,
	CoordType,
	fastAggregateVerify,
	PublicKey,
	SecretKey,
	Signature,
	verify,
	// eslint-disable-next-line import/no-extraneous-dependencies
} from '@chainsafe/blst';

// eslint-disable-next-line camelcase, import/no-extraneous-dependencies
import { blst, BLST_ERROR, P1_Affine, P2_Affine } from '@chainsafe/blst/dist/bindings';
import { timingSafeEqual } from 'crypto';

const DST_POP = 'BLS_POP_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_';

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

// https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-pairing-friendly-curves-10#section-4.2.1
// r: 0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001;
const groupOrder = Buffer.from(
	'73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001',
	'hex',
);

// 2 * r (group order)
const groupOrderDouble = Buffer.from(
	'e7db4ea6533afa906673b0101343b00aa77b4805fffcb7fdfffffffe00000002',
	'hex',
);

/**
 * The function checks if a given buffer `sk` is not a multiple of the group order that fits into 32 bytes except for zero.
 * The only multiples of the group order `r` that fit into 32 bytes are `0`, `r` and `2*r`.
 *
 * @param {Buffer} sk - The parameter `sk` is a Buffer that represents a secret key.
 * @returns a boolean value.
 */
export const isMultipleOfGroupOrder = (sk: Buffer): boolean => {
	const equalToGroupOrder = timingSafeEqual(sk, groupOrder);
	const equalToDoubleGroupOrder = timingSafeEqual(sk, groupOrderDouble);

	return equalToGroupOrder || equalToDoubleGroupOrder;
};

// https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-bls-signature-04#section-2.4
export const blsSkToPk = (sk: Buffer): Buffer => {
	if (isMultipleOfGroupOrder(sk)) {
		throw new Error('Secret key is not valid.');
	}

	const secretKey = SecretKey.fromBytes(sk);

	return Buffer.from(secretKey.toPublicKey().toBytes());
};

// https://tools.ietf.org/html/draft-irtf-cfrg-bls-signature-04#section-2.8
export const blsAggregate = (signatures: Buffer[]): Buffer | false => {
	try {
		return Buffer.from(aggregateSignatures(signatures.map(s => Signature.fromBytes(s))).toBytes());
	} catch {
		return false;
	}
};

// https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-bls-signature-04#section-2.6
export const blsSign = (sk: Buffer, message: Buffer): Buffer => {
	if (isMultipleOfGroupOrder(sk)) {
		throw new Error('Secret key is not valid.');
	}

	const secretKey = SecretKey.fromBytes(sk);

	return Buffer.from(secretKey.sign(message).toBytes());
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
	if (publicKeys.length === 0) return false;

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
	if (publicKeys.length === 0) return false;

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
export const blsPopProve = (sk: Buffer): Buffer => {
	const message = blsSkToPk(sk);
	const sig = new blst.P2();

	if (isMultipleOfGroupOrder(sk)) {
		throw new Error('Secret key is not valid.');
	}

	const secretKey = SecretKey.fromBytes(sk);

	return Buffer.from(
		new Signature(sig.hash_to(message, DST_POP).sign_with(secretKey.value)).toBytes(),
	);
};

//  https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-bls-signature-04#section-3.3.2
export const blsPopVerify = (pk: Buffer, proof: Buffer): boolean => {
	if (!blsKeyValidate(pk)) {
		return false;
	}

	try {
		// eslint-disable-next-line camelcase
		const signature = Signature.fromBytes(proof, CoordType.affine).value as P2_Affine;
		// eslint-disable-next-line camelcase
		const publicKey = PublicKey.fromBytes(pk, CoordType.affine).value as P1_Affine;

		return signature.core_verify(publicKey, true, pk, DST_POP) === BLST_ERROR.BLST_SUCCESS;
	} catch {
		return false;
	}
};
