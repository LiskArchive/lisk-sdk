import {
	isGreaterThanMaxTransactionId,
	isHexString,
	isBase64String,
	isNullCharacterIncluded,
	isNumberString,
	isSignature,
	isValidNonTransferAmount,
	isValidTransferData,
	validateAddress,
	validatePublicKey,
	isSInt64,
	isUInt64,
	isUInt32,
	isSInt32,
	isIP,
	isValidFee,
	isValidNonce,
	isValidTransferAmount,
	isIPV4,
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

export const transferData = (data: string): boolean =>
	!isNullCharacterIncluded(data) && isValidTransferData(data);

export const transferAmount = isValidTransferAmount;

export const int64 = (data: string): boolean =>
	isNumberString(data) && isSInt64(BigInt(data));

export const uint64 = (data: string): boolean =>
	isNumberString(data) && isUInt64(BigInt(data));

export const uint32 = (data: string): boolean =>
	isNumberString(data) && isUInt32(BigInt(data));

export const int32 = (data: string): boolean =>
	isNumberString(data) && isSInt32(BigInt(data));

const camelCaseRegex = /^[a-z]+((\d)|([A-Z0-9][a-zA-Z0-9]+))*([a-z0-9A-Z])?$/;

export const camelCase = (data: string): boolean =>
	camelCaseRegex.exec(data) !== null;

export const version = (data: string): boolean =>
	/^([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})(-(alpha|beta|rc)\.[0-9]{1,3}(\.[0-9]{1,3})?)?$/.test(
		data,
	);

export const protocolVersion = (data: string): boolean =>
	/^(\d|[1-9]\d{1,2})\.(\d|[1-9]\d{1,2})$/.test(data);

export const path = (data: string): boolean => {
	const pathRegExp = new RegExp('^(.?)(/[^/]+)+$');
	return pathRegExp.test(data);
};

export const encryptedPassphrase = (data: string): boolean => {
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

export const ip = isIP;

export const ipOrFQDN = (data: string): boolean => {
	const hostnameRegex = /^[a-zA-Z](([-0-9a-zA-Z]+)?[0-9a-zA-Z])?(\.[a-zA-Z](([-0-9a-zA-Z]+)?[0-9a-zA-Z])?)*$/;
	return isIPV4(data) || hostnameRegex.test(data);
};
