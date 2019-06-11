/*
 * Copyright © 2018 Lisk Foundation
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
import * as BigNum from '@liskhq/bignum';
import { hexToBuffer } from '@liskhq/lisk-cryptography';
import {
	gte as isVersionGte,
	gtr as isGreaterThanVersionInRange,
	ltr as isLessThanVersionInRange,
	valid as isValidVersion,
	validRange as isValidRangeVersion,
} from 'semver';
import * as validator from 'validator';
import {
	MAX_EIGHT_BYTE_NUMBER,
	MAX_INT64,
	MAX_PUBLIC_KEY_LENGTH,
} from './constants';

export const isNullCharacterIncluded = (input: string): boolean =>
	new RegExp('\\0|\\U00000000').test(input);

export const isUsername = (username: string): boolean => {
	if (isNullCharacterIncluded(username)) {
		return false;
	}

	if (username !== username.trim().toLowerCase()) {
		return false;
	}

	if (/^[0-9]{1,21}[L|l]$/g.test(username)) {
		return false;
	}

	if (!/^[a-z0-9!@$&_.]+$/g.test(username)) {
		return false;
	}

	return true;
};

export const isSignature = (signature: string): boolean =>
	/^[a-f0-9]{128}$/i.test(signature);

export const isGreaterThanZero = (amount: BigNum): boolean => amount.cmp(0) > 0;

export const isGreaterThanMaxTransactionAmount = (amount: BigNum): boolean =>
	amount.cmp(MAX_INT64) > 0;

export const isGreaterThanMaxTransactionId = (id: BigNum): boolean =>
	id.cmp(MAX_EIGHT_BYTE_NUMBER) > 0;

export const isNumberString = (num: string): boolean => {
	if (typeof num !== 'string') {
		return false;
	}

	return validator.isInt(num);
};

export const isValidInteger = (num: unknown): boolean =>
	typeof num === 'number' ? Math.floor(num) === num : false;

export const hasNoDuplicate = (values: ReadonlyArray<string>): boolean => {
	const unique = [...new Set(values)];

	return unique.length === values.length;
};

export const isStringBufferLessThan = (data: unknown, max: number): boolean => {
	if (typeof data !== 'string') {
		return false;
	}

	return Buffer.from(data).length <= max;
};

export const isHexString = (data: unknown): boolean => {
	if (typeof data !== 'string') {
		return false;
	}

	return data === '' || /^[a-f0-9]+$/i.test(data);
};

export const isEncryptedPassphrase = (data: string): boolean => {
	// Explanation of regex structure:
	// - 1 or more 'key=value' pairs delimited with '&'
	// Examples:
	// - cipherText=abcd1234
	// - cipherText=abcd1234&iterations=10000&iv=ef012345
	// NOTE: Maximum lengths chosen here are arbitrary
	const keyRegExp = /[a-zA-Z0-9]{2,15}/;
	const valueRegExp = /[a-f0-9]{1,256}/;
	const keyValueRegExp = new RegExp(
		`${keyRegExp.source}=${valueRegExp.source}`,
	);
	const encryptedPassphraseRegExp = new RegExp(
		`^(${keyValueRegExp.source})(?:&(${keyValueRegExp.source})){0,10}$`,
	);

	return encryptedPassphraseRegExp.test(data);
};

export const isSemVer = (version: string): boolean => !!isValidVersion(version);

export const isRangedSemVer = (version: string): boolean =>
	!!isValidRangeVersion(version);

export const isLessThanRangedVersion = isLessThanVersionInRange;
export const isGreaterThanRangedVersion = isGreaterThanVersionInRange;

export const isProtocolString = (data: string) =>
	/^(\d|[1-9]\d{1,2})\.(\d|[1-9]\d{1,2})$/.test(data);

const IPV4_NUMBER = 4;
const IPV6_NUMBER = 6;

export const isIPV4 = (data: string): boolean =>
	validator.isIP(data, IPV4_NUMBER);

export const isIPV6 = (data: string): boolean =>
	validator.isIP(data, IPV6_NUMBER);

export const isIP = (data: string): boolean => isIPV4(data) || isIPV6(data);

export const isPort = (port: string) => validator.isPort(port);

export const validatePublicKeysForDuplicates = (
	publicKeys: ReadonlyArray<string>,
): boolean =>
	publicKeys.every((element, index) => {
		if (publicKeys.slice(index + 1).includes(element)) {
			throw new Error(`Duplicated public key: ${publicKeys[index]}.`);
		}

		return true;
	});

export const isStringEndsWith = (
	target: string,
	suffixes: ReadonlyArray<string>,
): boolean => suffixes.some(suffix => target.endsWith(suffix));

export const isVersionMatch = isVersionGte;

export const validatePublicKey = (publicKey: string): boolean => {
	const publicKeyBuffer = hexToBuffer(publicKey);
	if (publicKeyBuffer.length !== MAX_PUBLIC_KEY_LENGTH) {
		throw new Error(
			`Public key ${publicKey} length differs from the expected 32 bytes for a public key.`,
		);
	}

	return true;
};

export const validatePublicKeys = (
	publicKeys: ReadonlyArray<string>,
): boolean =>
	publicKeys.every(validatePublicKey) &&
	validatePublicKeysForDuplicates(publicKeys);

export const validateKeysgroup = (
	keysgroup: ReadonlyArray<string>,
	min: number,
	max: number,
): boolean => {
	if (keysgroup.length < min || keysgroup.length > max) {
		throw new Error(
			`Expected between ${min} and ${max} public keys in the keysgroup.`,
		);
	}

	return validatePublicKeys(keysgroup);
};

const MIN_ADDRESS_LENGTH = 2;
const MAX_ADDRESS_LENGTH = 22;
const BASE_TEN = 10;
export const validateAddress = (address: string): boolean => {
	if (
		address.length < MIN_ADDRESS_LENGTH ||
		address.length > MAX_ADDRESS_LENGTH
	) {
		throw new Error(
			'Address length does not match requirements. Expected between 2 and 22 characters.',
		);
	}

	if (address[address.length - 1] !== 'L') {
		throw new Error(
			'Address format does not match requirements. Expected "L" at the end.',
		);
	}

	if (address.includes('.')) {
		throw new Error(
			'Address format does not match requirements. Address includes invalid character: `.`.',
		);
	}

	const addressString = address.slice(0, -1);
	const addressNumber = new BigNum(addressString);

	if (addressNumber.cmp(new BigNum(MAX_EIGHT_BYTE_NUMBER)) > 0) {
		throw new Error(
			'Address format does not match requirements. Address out of maximum range.',
		);
	}

	if (addressString !== addressNumber.toString(BASE_TEN)) {
		throw new Error(
			"Address string format does not match it's number representation.",
		);
	}

	return true;
};

export const validateNonTransferAmount = (data: string): boolean =>
	isNumberString(data) && data === '0';

export const validateTransferAmount = (data: string): boolean =>
	isNumberString(data) &&
	isGreaterThanZero(new BigNum(data)) &&
	!isGreaterThanMaxTransactionAmount(new BigNum(data));

export const validateFee = (data: string): boolean =>
	isNumberString(data) &&
	isGreaterThanZero(new BigNum(data)) &&
	!isGreaterThanMaxTransactionAmount(new BigNum(data));

export const isCsv = (data: string): boolean => {
	const maxItemCount = 1000;
	if (typeof data !== 'string') {
		return false;
	}

	const csvAsArray = data.split(',');

	if (csvAsArray.length > 0 && csvAsArray.length <= maxItemCount) {
		return true;
	}

	return false;
};
