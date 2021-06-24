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
	blsSign,
	blsVerify,
	blsKeyValidate,
	blsAggregate,
	blsKeyGen,
	blsFastAggregateVerify,
	blsSkToPk,
	BLS_SUPPORTED,
} from './bls_lib';
import { tagMessage } from './message_tag';
import { readBit, writeBit } from './utils';

export { BLS_SUPPORTED };
export const generatePrivateKey = blsKeyGen;
export const getPublicKeyFromPrivateKey = blsSkToPk;
export const validateKey = blsKeyValidate;

export const signBLS = (
	tag: string,
	networkIdentifier: Buffer,
	data: Buffer,
	privateKey: Buffer,
): Buffer => blsSign(privateKey, tagMessage(tag, networkIdentifier, data));

export const verifyBLS = (
	tag: string,
	networkIdentifier: Buffer,
	data: Buffer,
	signature: Buffer,
	publicKey: Buffer,
): boolean => blsVerify(publicKey, tagMessage(tag, networkIdentifier, data), signature);

export const createAggSig = (
	publicKeysList: Buffer[],
	pubKeySignaturePairs: { publicKey: Buffer; signature: Buffer }[],
): { aggregationBits: Buffer; signature: Buffer } => {
	const aggregationBits = Buffer.alloc(Math.ceil(publicKeysList.length / 8));
	const signatures: Buffer[] = [];

	for (const pair of pubKeySignaturePairs) {
		signatures.push(pair.signature);
		const index = publicKeysList.findIndex(key => key.equals(pair.publicKey));
		writeBit(aggregationBits, index, true);
	}
	const signature = blsAggregate(signatures);

	if (!signature) {
		throw new Error('Can not aggregate signatures');
	}

	return { aggregationBits, signature };
};

export const verifyAggSig = (
	publicKeysList: Buffer[],
	aggregationBits: Buffer,
	signature: Buffer,
	tag: string,
	networkIdentifier: Buffer,
	message: Buffer,
): boolean => {
	const taggedMessage = tagMessage(tag, networkIdentifier, message);
	const keys: Buffer[] = [];

	for (const [index, key] of publicKeysList.entries()) {
		if (readBit(aggregationBits, index)) {
			keys.push(key);
		}
	}

	return blsFastAggregateVerify(keys, taggedMessage, signature);
};

export const verifyWeightedAggSig = (
	publicKeysList: Buffer[],
	aggregationBits: Buffer,
	signature: Buffer,
	tag: string,
	networkIdentifier: Buffer,
	message: Buffer,
	weights: number[],
	threshold: number,
): boolean => {
	const taggedMessage = tagMessage(tag, networkIdentifier, message);
	const keys: Buffer[] = [];
	let weightSum = 0;

	for (const [index, key] of publicKeysList.entries()) {
		if (readBit(aggregationBits, index)) {
			keys.push(key);
			weightSum += weights[index];
		}
	}

	if (weightSum < threshold) {
		return false;
	}

	return blsFastAggregateVerify(keys, taggedMessage, signature);
};
