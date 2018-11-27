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
import * as cryptography from '@liskhq/lisk-cryptography';
import BigNum from 'browserify-bignum';
import {
	MAX_ADDRESS_NUMBER,
	MAX_TRANSACTION_AMOUNT,
	MAX_TRANSACTION_ID,
	MULTISIGNATURE_MAX_KEYSGROUP,
	MULTISIGNATURE_MIN_KEYSGROUP,
} from '../../constants';

const MAX_PUBLIC_KEY_LENGTH = 32;
export const validatePublicKey = (publicKey: string) => {
	const publicKeyBuffer = cryptography.hexToBuffer(publicKey);
	if (publicKeyBuffer.length !== MAX_PUBLIC_KEY_LENGTH) {
		throw new Error(
			`Public key ${publicKey} length differs from the expected 32 bytes for a public key.`,
		);
	}

	return true;
};

export const checkPublicKeysForDuplicates = (
	publicKeys: ReadonlyArray<string>,
) =>
	publicKeys.every((element, index) => {
		if (publicKeys.slice(index + 1).includes(element)) {
			throw new Error(`Duplicated public key: ${publicKeys[index]}.`);
		}

		return true;
	});

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

interface BigNumComparable {
	cmp(n: number | string | BigNumComparable): number;
}

export const isGreaterThanZero = (amount: BigNumComparable) =>
	amount.cmp(0) > 0;

export const isGreaterThanMaxTransactionAmount = (amount: BigNumComparable) =>
	amount.cmp(MAX_TRANSACTION_AMOUNT) > 0;

export const isGreaterThanMaxTransactionId = (id: BigNumComparable) =>
	id.cmp(MAX_TRANSACTION_ID) > 0;

export const isNumberString = (str: string) => {
	if (typeof str !== 'string') {
		return false;
	}

	return /^[0-9]+$/g.test(str);
};

export const validateAmount = (data: string) =>
	isNumberString(data) && !isGreaterThanZero(new BigNum(data));

export const validateTransferAmount = (data: string) =>
	isNumberString(data) &&
	isGreaterThanZero(new BigNum(data)) &&
	!isGreaterThanMaxTransactionAmount(new BigNum(data));

export const validateFee = (data: string) =>
	isNumberString(data) &&
	isGreaterThanZero(new BigNum(data)) &&
	!isGreaterThanMaxTransactionAmount(new BigNum(data));

export const isValidInteger = (num: unknown) =>
	typeof num === 'number' ? Math.floor(num) === num : false;
