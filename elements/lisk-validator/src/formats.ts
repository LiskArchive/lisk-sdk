import * as BigNum from '@liskhq/bignum';

import {
	isCsv,
	isGreaterThanMaxTransactionId,
	isHexString,
	isNullCharacterIncluded,
	isNumberString,
	isSignature,
	isUsername,
	isValidFee,
	isValidNonTransferAmount,
	isValidTransferAmount,
	isValidTransferData,
	validateAddress,
	validatePublicKey,
} from './validation';

export const address = (data: string): boolean => {
	try {
		validateAddress(data);

		return true;
	} catch (error) {
		return false;
	}
};

export const additionPublicKey = (data: string): boolean => {
	const action = data[0];
	if (action !== '+') {
		return false;
	}
	try {
		const publicKeyString = data.slice(1);
		validatePublicKey(publicKeyString);

		return true;
	} catch (error) {
		return false;
	}
};

export const amount = isNumberString;

export const csv = isCsv;

export const emptyOrPublicKey = (data: string): boolean => {
	if (data === null || data === '') {
		return true;
	}

	try {
		validatePublicKey(data);

		return true;
	} catch (error) {
		return false;
	}
};

export const fee = isValidFee;

export const hex = isHexString;

export const id = (data: string): boolean =>
	isNumberString(data) && !isGreaterThanMaxTransactionId(new BigNum(data));

export const nonTransferAmount = isValidNonTransferAmount;

export const noNullCharacter = (data: string): boolean =>
	!isNullCharacterIncluded(data);

export const noNullByte = noNullCharacter;

export const publicKey = (data: string): boolean => {
	try {
		validatePublicKey(data);

		return true;
	} catch (error) {
		return false;
	}
};

export const signature = isSignature;

export const signedPublicKey = (data: string): boolean => {
	try {
		const action = data[0];
		if (action !== '+' && action !== '-') {
			return false;
		}
		const publicKeyString = data.slice(1);
		validatePublicKey(publicKeyString);

		return true;
	} catch (error) {
		return false;
	}
};

export const transferAmount = isValidTransferAmount;

export const username = isUsername;

export const transferData = (data: string): boolean =>
	!isNullCharacterIncluded(data) && isValidTransferData(data);
