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
import bignum from 'browserify-bignum';
import cryptography from 'lisk-cryptography';
import {
	MAX_ADDRESS_NUMBER,
	MAX_TRANSACTION_ID,
	MAX_TRANSACTION_AMOUNT,
} from 'lisk-constants';
import {
	MULTISIGNATURE_MAX_KEYSGROUP,
	MULTISIGNATURE_MIN_KEYSGROUP,
} from '../../constants';

export const validatePublicKey = publicKey => {
	const publicKeyBuffer = cryptography.hexToBuffer(publicKey);
	if (publicKeyBuffer.length !== 32) {
		throw new Error(
			`Public key ${publicKey} length differs from the expected 32 bytes for a public key.`,
		);
	}
	return true;
};

export const checkPublicKeysForDuplicates = publicKeys =>
	publicKeys.every((element, index) => {
		const elementFound = publicKeys.slice(index + 1).indexOf(element);
		if (elementFound > -1) {
			throw new Error(`Duplicated public key: ${publicKeys[index]}.`);
		}
		return true;
	});

export const validatePublicKeys = publicKeys =>
	publicKeys.every(validatePublicKey) &&
	checkPublicKeysForDuplicates(publicKeys);

export const validateKeysgroup = keysgroup => {
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

export const validateAddress = address => {
	if (address.length < 2 || address.length > 22) {
		throw new Error(
			'Address length does not match requirements. Expected between 2 and 22 characters.',
		);
	}

	if (address[address.length - 1] !== 'L') {
		throw new Error(
			'Address format does not match requirements. Expected "L" at the end.',
		);
	}

	const addressAsBignum = bignum(address.slice(0, -1));

	if (addressAsBignum.cmp(bignum(MAX_ADDRESS_NUMBER)) > 0) {
		throw new Error(
			'Address format does not match requirements. Address out of maximum range.',
		);
	}

	return true;
};

export const isGreaterThanMaxTransactionAmount = amount =>
	amount.cmp(MAX_TRANSACTION_AMOUNT) > 0;

export const isGreaterThanMaxTransactionId = id =>
	id.cmp(MAX_TRANSACTION_ID) > 0;

export const isNumberString = str => {
	if (typeof str !== 'string') {
		return false;
	}
	return /^[0-9]+$/g.test(str);
};

export const validateAmount = data =>
	isNumberString(data) && !isGreaterThanMaxTransactionAmount(bignum(data));

export const isValidInteger = num => parseInt(num, 10) === num;
