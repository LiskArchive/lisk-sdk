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
import {
	BASE32_CHARSET,
	BINARY_ADDRESS_LENGTH,
	DEFAULT_LISK32_ADDRESS_PREFIX,
	LISK32_ADDRESS_LENGTH,
} from './constants';
import { getPublicKey } from './nacl';
import { hash } from './utils';

const convertUIntArray = (uintArray: number[], fromBits: number, toBits: number): number[] => {
	// eslint-disable-next-line no-bitwise
	const maxValue = (1 << toBits) - 1;
	let accumulator = 0;
	let bits = 0;
	const result = [];
	// eslint-disable-next-line
	for (let p = 0; p < uintArray.length; p += 1) {
		const byte = uintArray[p];
		// check that the entry is a value between 0 and 2^frombits-1
		// eslint-disable-next-line no-bitwise
		if (byte < 0 || byte >> fromBits !== 0) {
			return [];
		}

		// eslint-disable-next-line no-bitwise
		accumulator = (accumulator << fromBits) | byte;
		bits += fromBits;
		while (bits >= toBits) {
			bits -= toBits;
			// eslint-disable-next-line no-bitwise
			result.push((accumulator >> bits) & maxValue);
		}
	}

	return result;
};

const convertUInt5ToBase32 = (uint5Array: number[]): string =>
	uint5Array.map((val: number) => BASE32_CHARSET[val]).join('');

export const getAddressFromPublicKey = (publicKey: Buffer): Buffer => {
	const buffer = hash(publicKey);
	const truncatedBuffer = buffer.slice(0, BINARY_ADDRESS_LENGTH);

	if (truncatedBuffer.length !== BINARY_ADDRESS_LENGTH) {
		throw new Error(`Lisk address must contain exactly ${BINARY_ADDRESS_LENGTH} bytes`);
	}

	return truncatedBuffer;
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

const createChecksum = (uint5Array: number[]): number[] => {
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

const verifyChecksum = (integerSequence: number[]): boolean => polymod(integerSequence) === 1;

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

export const validateLisk32Address = (address: string, prefix = DEFAULT_LISK32_ADDRESS_PREFIX) => {
	if (address.length !== LISK32_ADDRESS_LENGTH) {
		throw new Error(
			`Address length does not match requirements. Expected ${LISK32_ADDRESS_LENGTH} characters.`,
		);
	}

	const addressPrefix = address.substring(0, 3);

	if (addressPrefix !== prefix) {
		throw new Error(
			`Invalid address prefix. Actual prefix: ${addressPrefix}, Expected prefix: ${prefix}`,
		);
	}

	const addressSubstringArray = address.substring(3).split('');

	if (!addressSubstringArray.every(char => BASE32_CHARSET.includes(char))) {
		throw new Error(
			`Invalid character found in address. Only allow characters: '${BASE32_CHARSET}'.`,
		);
	}

	const integerSequence = addressSubstringArray.map(char => BASE32_CHARSET.indexOf(char));

	if (!verifyChecksum(integerSequence)) {
		throw new Error('Invalid checksum for address.');
	}
};

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
	const integerSequence = addressArray.map(char => BASE32_CHARSET.indexOf(char));
	const integerSequence8 = convertUIntArray(integerSequence, 5, 8);

	return Buffer.from(integerSequence8);
};

export const getLisk32AddressFromAddress = (
	address: Buffer,
	prefix = DEFAULT_LISK32_ADDRESS_PREFIX,
): string => `${prefix}${addressToLisk32(address)}`;
