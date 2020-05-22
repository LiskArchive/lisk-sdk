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
import { bufferToHex, hexToBuffer } from './buffer';
// eslint-disable-next-line import/no-cycle
import {
	getAddressFromPublicKey,
	convertUInt5ToBase32,
	convertUIntArray,
} from './convert';
import { hash } from './hash';
// eslint-disable-next-line import/no-cycle
import { getKeyPair, getPublicKey } from './nacl';

export interface KeypairBytes {
	readonly privateKeyBytes: Buffer;
	readonly publicKeyBytes: Buffer;
}

export interface Keypair {
	readonly privateKey: string;
	readonly publicKey: string;
}

export const getPrivateAndPublicKeyBytesFromPassphrase = (
	passphrase: string,
): KeypairBytes => {
	const hashed = hash(passphrase, 'utf8');
	const { publicKeyBytes, privateKeyBytes } = getKeyPair(hashed);

	return {
		privateKeyBytes,
		publicKeyBytes,
	};
};

export const getPrivateAndPublicKeyFromPassphrase = (
	passphrase: string,
): Keypair => {
	const {
		privateKeyBytes,
		publicKeyBytes,
	} = getPrivateAndPublicKeyBytesFromPassphrase(passphrase);

	return {
		privateKey: bufferToHex(privateKeyBytes),
		publicKey: bufferToHex(publicKeyBytes),
	};
};

export const getKeys = getPrivateAndPublicKeyFromPassphrase;

export const getAddressAndPublicKeyFromPassphrase = (
	passphrase: string,
): { readonly address: string; readonly publicKey: string } => {
	const { publicKey } = getKeys(passphrase);
	const address = getAddressFromPublicKey(publicKey);

	return {
		address,
		publicKey,
	};
};

export const getAddressFromPassphrase = (passphrase: string): string => {
	const { publicKey } = getKeys(passphrase);

	return getAddressFromPublicKey(publicKey);
};

export const getAddressFromPrivateKey = (privateKey: string): string => {
	const publicKeyBytes = getPublicKey(hexToBuffer(privateKey));
	const publicKey = bufferToHex(publicKeyBytes);

	return getAddressFromPublicKey(publicKey);
};

const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

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

export const getBinaryAddressFromPublicKey = (publicKey: string): Buffer => {
	const publicKeyBuffer = Buffer.from(publicKey, 'hex');
	return hash(publicKeyBuffer).slice(0, 20);
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
	publicKey: string,
	prefix: string,
): string => {
	const binaryAddress = getBinaryAddressFromPublicKey(publicKey);
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

export const validateBase32Address = (address: string): boolean => {
	if (address.length !== BASE32_ADDRESS_LENGTH) {
		throw new Error(
			'Address length does not match requirements. Expected 41 characters.',
		);
	}

	const prefix = address.substring(0, 3);

	if (prefix !== 'lsk') {
		throw new Error('Invalid prefix. Expected prefix: `lsk`');
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
