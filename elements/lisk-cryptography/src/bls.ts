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
import * as crypto from 'crypto';
import { Mnemonic } from '@liskhq/lisk-passphrase';
import {
	blsSign,
	blsVerify,
	blsKeyValidate,
	blsAggregate,
	blsKeyGen,
	blsFastAggregateVerify,
	blsSkToPk,
	BLS_SUPPORTED,
	blsPopVerify,
	blsPopProve,
} from './bls_lib';
import { hash, parseKeyDerivationPath, tagMessage } from './utils';
import { EMPTY_SALT, HASH_LENGTH, L, SHA256 } from './constants';

export { BLS_SUPPORTED };
export const generatePrivateKey = blsKeyGen;
export const getPublicKeyFromPrivateKey = blsSkToPk;
export const validateKey = blsKeyValidate;
export const popVerify = blsPopVerify;
export const popProve = blsPopProve;

const readBit = (buf: Buffer, bit: number): boolean => {
	const byteIndex = Math.floor(bit / 8);
	const bitIndex = bit % 8;

	// eslint-disable-next-line no-bitwise
	return (buf[byteIndex] >> bitIndex) % 2 === 1;
};

const writeBit = (buf: Buffer, bit: number, val: boolean): void => {
	const byteIndex = Math.floor(bit / 8);
	const bitIndex = bit % 8;

	if (val) {
		// eslint-disable-next-line no-bitwise, no-param-reassign
		buf[byteIndex] |= 1 << bitIndex;
	} else {
		// eslint-disable-next-line no-bitwise, no-param-reassign
		buf[byteIndex] &= ~(1 << bitIndex);
	}
};

export const signData = (tag: string, chainID: Buffer, data: Buffer, privateKey: Buffer): Buffer =>
	blsSign(privateKey, hash(tagMessage(tag, chainID, data)));

export const verifyData = (
	tag: string,
	chainID: Buffer,
	data: Buffer,
	signature: Buffer,
	publicKey: Buffer,
): boolean => blsVerify(publicKey, hash(tagMessage(tag, chainID, data)), signature);

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

const verifyAggregationBits = (publicKeysList: Buffer[], aggregationBits: Buffer): boolean => {
	const expectedAggregationBitsLength = Math.ceil(publicKeysList.length / 8);
	if (aggregationBits.length !== expectedAggregationBitsLength) {
		return false;
	}
	const unusedBits = publicKeysList.length % 8;
	if (unusedBits === 0) {
		return true;
	}
	const lastByte = aggregationBits[aggregationBits.length - 1];
	// eslint-disable-next-line no-bitwise
	if (lastByte >> unusedBits !== 0) {
		return false;
	}
	return true;
};

export const verifyAggSig = (
	publicKeysList: Buffer[],
	aggregationBits: Buffer,
	signature: Buffer,
	tag: string,
	chainID: Buffer,
	message: Buffer,
): boolean => {
	if (!verifyAggregationBits(publicKeysList, aggregationBits)) {
		return false;
	}
	const taggedMessage = tagMessage(tag, chainID, message);
	const keys: Buffer[] = [];

	for (const [index, key] of publicKeysList.entries()) {
		if (readBit(aggregationBits, index)) {
			keys.push(key);
		}
	}

	return blsFastAggregateVerify(keys, hash(taggedMessage), signature);
};

export const verifyWeightedAggSig = (
	publicKeysList: Buffer[],
	aggregationBits: Buffer,
	signature: Buffer,
	tag: string,
	chainID: Buffer,
	message: Buffer,
	weights: number[] | bigint[],
	threshold: number | bigint,
): boolean => {
	if (!verifyAggregationBits(publicKeysList, aggregationBits)) {
		return false;
	}
	const taggedMessage = tagMessage(tag, chainID, message);
	const keys: Buffer[] = [];
	let weightSum = BigInt(0);

	for (const [index, key] of publicKeysList.entries()) {
		if (readBit(aggregationBits, index)) {
			keys.push(key);
			weightSum += BigInt(weights[index]);
		}
	}

	if (weightSum < BigInt(threshold)) {
		return false;
	}

	return blsFastAggregateVerify(keys, hash(taggedMessage), signature);
};

// eslint-disable-next-line no-bitwise
const flipBits = (buf: Buffer) => Buffer.from(buf.map(x => x ^ 0xff));

const sha256 = (x: Buffer) => crypto.createHash(SHA256).update(x).digest();

const hmacSHA256 = (key: Buffer, message: Buffer, hashValue: string) =>
	crypto.createHmac(hashValue, key).update(message).digest();

const hkdfSHA256 = (ikm: Buffer, length: number, salt: Buffer, info: Buffer) => {
	if (salt.length === 0) {
		// eslint-disable-next-line no-param-reassign
		salt = EMPTY_SALT;
	}
	const PRK = hmacSHA256(salt, ikm, SHA256);
	let t = Buffer.from([]);
	let OKM = Buffer.from([]);

	for (let i = 0; i < Math.ceil(length / HASH_LENGTH); i += 1) {
		t = hmacSHA256(PRK, Buffer.concat([t, info, Buffer.from([1 + i])]), SHA256);
		OKM = Buffer.concat([OKM, t]);
	}
	return OKM.subarray(0, length);
};

const toLamportSK = (IKM: Buffer, salt: Buffer) => {
	const info = Buffer.from([]);
	const OKM = hkdfSHA256(IKM, L, salt, info);

	const lamportSK = [];
	for (let i = 0; i < 255; i += 1) {
		lamportSK.push(OKM.subarray(i * 32, (i + 1) * 32));
	}
	return lamportSK;
};

const parentSKToLamportPK = (parentSK: Buffer, index: number) => {
	const salt = Buffer.allocUnsafe(4);
	salt.writeUIntBE(index, 0, 4);

	const IKM = parentSK;
	const hashedLamport0 = toLamportSK(IKM, salt).map(x => sha256(x));
	const hashedLamport1 = toLamportSK(flipBits(IKM), salt).map(x => sha256(x));

	const lamportPK = Buffer.concat(hashedLamport0.concat(hashedLamport1));
	return sha256(lamportPK);
};

const deriveChildSK = (parentSK: Buffer, index: number) => {
	const lamportPK = parentSKToLamportPK(parentSK, index);
	return blsKeyGen(lamportPK);
};

export const getPrivateKeyFromPhraseAndPath = async (phrase: string, path: string) => {
	const masterSeed = await Mnemonic.mnemonicToSeed(phrase);
	let key = blsKeyGen(masterSeed);

	for (const segment of parseKeyDerivationPath(path)) {
		key = deriveChildSK(key, segment);
	}

	return key;
};
