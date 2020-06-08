/*
 * Copyright © 2019 Lisk Foundation
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
import { BINARY_ADDRESS_LENGTH } from './constants';
// eslint-disable-next-line import/no-cycle
import { convertUInt5ToBase32, convertUIntArray } from './convert';
import { hash } from './hash';
import { getKeyPair, getPublicKey } from './nacl';
import { Keypair } from './types';

export const getPrivateAndPublicKeyFromPassphrase = (
	passphrase: string,
): Keypair => {
	const hashed = hash(passphrase, 'utf8');
	return getKeyPair(hashed);
};

export const getKeys = getPrivateAndPublicKeyFromPassphrase;

export const getAddressFromPublicKey = (publicKey: Buffer): Buffer => {
	const buffer = hash(publicKey);
	const truncatedBuffer = buffer.slice(0, BINARY_ADDRESS_LENGTH);

	if (truncatedBuffer.length !== BINARY_ADDRESS_LENGTH) {
		throw new Error('The Lisk addresses must contains exactly 20 bytes');
	}

	return truncatedBuffer;
};

export const getAddressAndPublicKeyFromPassphrase = (
	passphrase: string,
): { readonly address: Buffer; readonly publicKey: Buffer } => {
	const { publicKey } = getKeys(passphrase);
	const address = getAddressFromPublicKey(publicKey);

	return {
		address,
		publicKey,
	};
};

export const getAddressFromPassphrase = (passphrase: string): Buffer => {
	const { publicKey } = getKeys(passphrase);

	return getAddressFromPublicKey(publicKey);
};

export const getAddressFromPrivateKey = (privateKey: Buffer): Buffer => {
	const publicKey = getPublicKey(privateKey);

	return getAddressFromPublicKey(publicKey);
};

const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

// See for details: https://github.com/LiskHQ/lips/blob/master/proposals/lip-0018.md#creating-checksum
const polymod = (uint5Array: number[]): number => {
	let chk = 1;
	for (const value of uint5Array) {
		// eslint-disable-next-line no-bitwise
		const top = chk >> 25;
		// eslint-disable-next-line no-bitwise
		chk = ((chk & 0x1ffffff) << 5) ^ value;
		for (let i = 0; i < 5; i += 1) {
			// eslint-disable-next-line no-bitwise
			if ((top >> i) & 1) {
				// eslint-disable-next-line no-bitwise
				chk ^= GENERATOR[i];
			}
		}
	}

	return chk;
};

export const createChecksum = (uint5Array: number[]): number[] => {
	const values = uint5Array.concat([0, 0, 0, 0, 0, 0]);
	// eslint-disable-next-line no-bitwise
	const mod = polymod(values) ^ 1;
	const result = [];
	for (let p = 0; p < 6; p += 1) {
		// eslint-disable-next-line no-bitwise
		result.push((mod >> (5 * (5 - p))) & 31);
	}
	return result;
};

export const verifyChecksum = (integerSequence: number[]): boolean =>
	polymod(integerSequence) === 1;

export const getBase32AddressFromPublicKey = (
	publicKey: Buffer,
	prefix: string,
): string => {
	const binaryAddress = getAddressFromPublicKey(publicKey);
	const byteSequence = [];
	for (const b of binaryAddress) {
		byteSequence.push(b);
	}
	const uint5Address = convertUIntArray(byteSequence, 8, 5);
	const uint5Checksum = createChecksum(uint5Address);

	return `${prefix}${convertUInt5ToBase32(uint5Address.concat(uint5Checksum))}`;
};

const BASE32_ADDRESS_LENGTH = 41;
const BASE32_CHARSET = 'zxvcpmbn3465o978uyrtkqew2adsjhfg';

export const validateBase32Address = (
	address: string,
	prefix = 'lsk',
): boolean => {
	if (address.length !== BASE32_ADDRESS_LENGTH) {
		throw new Error(
			'Address length does not match requirements. Expected 41 characters.',
		);
	}

	const addressPrefix = address.substring(0, 3);

	if (addressPrefix !== prefix) {
		throw new Error(`Invalid prefix. Expected prefix: ${prefix}`);
	}

	const addressSubstringArray = address.substring(3).split('');

	if (!addressSubstringArray.every(char => BASE32_CHARSET.includes(char))) {
		throw new Error(
			`Invalid character found in address. Only allow characters: 'abcdefghjkmnopqrstuvwxyz23456789'.`,
		);
	}

	const integerSequence = addressSubstringArray.map(char =>
		BASE32_CHARSET.indexOf(char),
	);

	if (!verifyChecksum(integerSequence)) {
		throw new Error(`Invalid checksum for address.`);
	}

	return true;
};
