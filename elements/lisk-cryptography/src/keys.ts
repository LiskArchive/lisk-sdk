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
import { BINARY_ADDRESS_LENGTH, DEFAULT_LISK32_ADDRESS_PREFIX } from './constants';
// eslint-disable-next-line import/no-cycle
import { convertUInt5ToBase32, convertUIntArray } from './convert';
import { hash } from './hash';
import { getKeyPair, getPublicKey } from './nacl';
import { Keypair } from './types';

export const getPrivateAndPublicKeyFromPassphrase = (passphrase: string): Keypair => {
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

const addressToLisk32 = (address: Buffer): string => {
	const byteSequence = [];
	for (const b of address) {
		byteSequence.push(b);
	}
	const uint5Address = convertUIntArray(byteSequence, 8, 5);
	const uint5Checksum = createChecksum(uint5Address);
	return convertUInt5ToBase32(uint5Address.concat(uint5Checksum));
};

export const getLisk32AddressFromPublicKey = (
	publicKey: Buffer,
	prefix = DEFAULT_LISK32_ADDRESS_PREFIX,
): string => `${prefix}${addressToLisk32(getAddressFromPublicKey(publicKey))}`;

/**
 * @deprecated
 */
export const getBase32AddressFromPublicKey = getLisk32AddressFromPublicKey;

export const getLisk32AddressFromPassphrase = (
	passphrase: string,
	prefix = DEFAULT_LISK32_ADDRESS_PREFIX,
): string => {
	const { publicKey } = getAddressAndPublicKeyFromPassphrase(passphrase);
	return getLisk32AddressFromPublicKey(publicKey, prefix);
};

/**
 * @deprecated
 */
export const getBase32AddressFromPassphrase = getLisk32AddressFromPassphrase;

const LISK32_ADDRESS_LENGTH = 41;
const LISK32_CHARSET = 'zxvcpmbn3465o978uyrtkqew2adsjhfg';

export const validateLisk32Address = (
	address: string,
	prefix = DEFAULT_LISK32_ADDRESS_PREFIX,
): boolean => {
	if (address.length !== LISK32_ADDRESS_LENGTH) {
		throw new Error('Address length does not match requirements. Expected 41 characters.');
	}

	const addressPrefix = address.substring(0, 3);

	if (addressPrefix !== prefix) {
		throw new Error(
			`Invalid address prefix. Actual prefix: ${addressPrefix}, Expected prefix: ${prefix}`,
		);
	}

	const addressSubstringArray = address.substring(3).split('');

	if (!addressSubstringArray.every(char => LISK32_CHARSET.includes(char))) {
		throw new Error(
			"Invalid character found in address. Only allow characters: 'abcdefghjkmnopqrstuvwxyz23456789'.",
		);
	}

	const integerSequence = addressSubstringArray.map(char => LISK32_CHARSET.indexOf(char));

	if (!verifyChecksum(integerSequence)) {
		throw new Error('Invalid checksum for address.');
	}

	return true;
};

/**
 * @deprecated
 */
export const validateBase32Address = validateLisk32Address;

export const getAddressFromLisk32Address = (
	base32Address: string,
	prefix = DEFAULT_LISK32_ADDRESS_PREFIX,
): Buffer => {
	validateLisk32Address(base32Address, prefix);
	// Ignore lsk prefix and checksum
	const base32AddressNoPrefixNoChecksum = base32Address.substring(
		prefix.length,
		base32Address.length - 6,
	);

	const addressArray = base32AddressNoPrefixNoChecksum.split('');
	const integerSequence = addressArray.map(char => LISK32_CHARSET.indexOf(char));
	const integerSequence8 = convertUIntArray(integerSequence, 5, 8);

	return Buffer.from(integerSequence8);
};

/**
 * @deprecated
 */
export const getAddressFromBase32Address = getAddressFromLisk32Address;

export const getLisk32AddressFromAddress = (
	address: Buffer,
	prefix = DEFAULT_LISK32_ADDRESS_PREFIX,
): string => `${prefix}${addressToLisk32(address)}`;

/**
 * @deprecated
 */
export const getBase32AddressFromAddress = getLisk32AddressFromAddress;
