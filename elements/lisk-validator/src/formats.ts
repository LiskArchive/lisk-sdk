import * as BigNum from '@liskhq/bignum';
import {
	isCsv,
	isGreaterThanMaxTransactionId,
	isHexString,
	isNullCharacterIncluded,
	isNumberString,
	isSignature,
	isUsername,
	validateAddress,
	validateFee,
	validateNonTransferAmount,
	validatePublicKey,
	validateTransferAmount,
} from './validation';

// tslint:disable-next-line: no-any
export const formats: any = {
	address: (data: string): boolean => {
		try {
			validateAddress(data);

			return true;
		} catch (error) {
			return false;
		}
	},
	additionPublicKey: (data: string): boolean => {
		const action = data[0];
		if (action !== '+') {
			return false;
		}
		try {
			const publicKey = data.slice(1);
			validatePublicKey(publicKey);

			return true;
		} catch (error) {
			return false;
		}
	},
	amount: isNumberString,
	csv: isCsv,
	emptyOrPublicKey: (data: string): boolean => {
		if (data === null || data === '') {
			return true;
		}

		try {
			validatePublicKey(data);

			return true;
		} catch (error) {
			return false;
		}
	},
	fee: validateFee,
	hex: isHexString,
	id: (data: string): boolean =>
		isNumberString(data) && !isGreaterThanMaxTransactionId(new BigNum(data)),
	nonTransferAmount: validateNonTransferAmount,
	noNullCharacter: (data: string): boolean => !isNullCharacterIncluded(data),
	publicKey: (data: string): boolean => {
		try {
			validatePublicKey(data);

			return true;
		} catch (error) {
			return false;
		}
	},
	signature: isSignature,
	signedPublicKey: (data: string): boolean => {
		try {
			const action = data[0];
			if (action !== '+' && action !== '-') {
				return false;
			}
			const publicKey = data.slice(1);
			validatePublicKey(publicKey);

			return true;
		} catch (error) {
			return false;
		}
	},
	transferAmount: validateTransferAmount,
	username: isUsername,
};
