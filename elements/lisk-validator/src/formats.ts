import {
	isGreaterThanMaxTransactionId,
	isHexString,
	isBase64String,
	isInt32,
	isInt64,
	isNullCharacterIncluded,
	isNumberString,
	isSignature,
	isUint32,
	isUint64,
	isValidFee,
	isValidNonce,
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

export const emptyString = (data: string): boolean => data === '';

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

export const nonce = isValidNonce;

export const hex = isHexString;
export const base64 = isBase64String;

export const id = (data: string): boolean =>
	isNumberString(data) && !isGreaterThanMaxTransactionId(BigInt(data));

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

export const transferData = (data: string): boolean =>
	!isNullCharacterIncluded(data) && isValidTransferData(data);

export const int64 = (data: string): boolean =>
	isNumberString(data) && isInt64(BigInt(data));

export const uint64 = (data: string): boolean =>
	isNumberString(data) && isUint64(BigInt(data));

export const uint32 = (data: string): boolean =>
	isNumberString(data) && isUint32(BigInt(data));

export const int32 = (data: string): boolean =>
	isNumberString(data) && isInt32(BigInt(data));

const camelCaseRegex = /^([a-z]+[A-Z]*)+$/;

export const camelCase = (data: string): boolean =>
	camelCaseRegex.exec(data) !== null;
