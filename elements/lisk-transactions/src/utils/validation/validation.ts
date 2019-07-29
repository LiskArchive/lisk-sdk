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
import * as cryptography from '@liskhq/lisk-cryptography';
import {
	MAX_ADDRESS_NUMBER,
	MAX_PUBLIC_KEY_LENGTH,
	MAX_TRANSACTION_AMOUNT,
	MAX_TRANSACTION_ID,
	MAX_TRANSFER_ASSET_DATA_LENGTH,
	MULTISIGNATURE_MAX_KEYSGROUP,
	MULTISIGNATURE_MIN_KEYSGROUP,
} from '../../constants';

export const validatePublicKey = (publicKey: string) => {
	const publicKeyBuffer = cryptography.hexToBuffer(publicKey);
	if (publicKeyBuffer.length !== MAX_PUBLIC_KEY_LENGTH) {
		throw new Error(
			`Public key ${publicKey} length differs from the expected 32 bytes for a public key.`,
		);
	}

	return true;
};

export const isNullByteIncluded = (input: string) =>
	new RegExp('\\0|\\U00000000').test(input);

export const validateUsername = (username: string) => {
	if (isNullByteIncluded(username)) {
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

export const validateSignature = (signature: string) =>
	/^[a-f0-9]{128}$/i.test(signature);

export const checkPublicKeysForDuplicates = (
	publicKeys: ReadonlyArray<string>,
) =>
	publicKeys.every((element, index) => {
		if (publicKeys.slice(index + 1).includes(element)) {
			throw new Error(`Duplicated public key: ${publicKeys[index]}.`);
		}

		return true;
	});

export const stringEndsWith = (
	target: string,
	suffixes: ReadonlyArray<string>,
): boolean => suffixes.some(suffix => target.endsWith(suffix));

export const validatePublicKeys = (publicKeys: ReadonlyArray<string>) =>
	publicKeys.every(validatePublicKey) &&
	checkPublicKeysForDuplicates(publicKeys);

export const validateKeysgroup = (keysgroup: ReadonlyArray<string>) => {
	if (
		keysgroup.length < MULTISIGNATURE_MIN_KEYSGROUP ||
		keysgroup.length > MULTISIGNATURE_MAX_KEYSGROUP
	) {
		throw new Error(
			`Expected between ${MULTISIGNATURE_MIN_KEYSGROUP} and ${MULTISIGNATURE_MAX_KEYSGROUP} public keys in the keysgroup.`,
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

	if (addressNumber.cmp(new BigNum(MAX_ADDRESS_NUMBER)) > 0) {
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

export const isGreaterThanZero = (amount: BigNum) => amount.cmp(0) > 0;

export const isGreaterThanOrEqualToZero = (amount: BigNum) =>
	amount.cmp(0) >= 0;

export const isGreaterThanMaxTransactionAmount = (amount: BigNum) =>
	amount.cmp(MAX_TRANSACTION_AMOUNT) > 0;

export const isGreaterThanMaxTransactionId = (id: BigNum) =>
	id.cmp(MAX_TRANSACTION_ID) > 0;

export const isNumberString = (str: string) => {
	if (typeof str !== 'string') {
		return false;
	}

	return /^[0-9]+$/g.test(str);
};

export const validateNonTransferAmount = (data: string) =>
	isNumberString(data) && data === '0';
export const validateTransferAmount = (data: string) =>
	isNumberString(data) &&
	isGreaterThanZero(new BigNum(data)) &&
	!isGreaterThanMaxTransactionAmount(new BigNum(data));

export const isValidTransferData = (data: string): boolean =>
	Buffer.byteLength(data, 'utf8') <= MAX_TRANSFER_ASSET_DATA_LENGTH;

export const validateFee = (data: string) =>
	isNumberString(data) &&
	isGreaterThanOrEqualToZero(new BigNum(data)) &&
	!isGreaterThanMaxTransactionAmount(new BigNum(data));

export const isValidInteger = (num: unknown) =>
	typeof num === 'number' ? Math.floor(num) === num : false;

export const isUnique = (values: ReadonlyArray<string>): boolean => {
	const unique = [...new Set(values)];

	return unique.length === values.length;
};

export const isValidNumber = (num: unknown): boolean => {
	if (typeof num === 'number') {
		return true;
	}
	if (typeof num === 'string') {
		return isNumberString(num);
	}

	return false;
};
