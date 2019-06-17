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
	// tslint:disable-next-line: no-any
	address: (data: any) => {
		try {
			validateAddress(data);

			return true;
		} catch (error) {
			return false;
		}
	},
	// tslint:disable-next-line: no-any
	additionPublicKey: (data: any) => {
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
	// tslint:disable-next-line: no-any
	emptyOrPublicKey: (data: any) => {
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
	// tslint:disable-next-line: no-any
	id: (data: any) =>
		isNumberString(data) && !isGreaterThanMaxTransactionId(new BigNum(data)),
	nonTransferAmount: validateNonTransferAmount,
	// tslint:disable-next-line: no-any
	noNullCharacter: (data: any) => !isNullCharacterIncluded(data),
	// tslint:disable-next-line: no-any
	publicKey: (data: any) => {
		try {
			validatePublicKey(data);

			return true;
		} catch (error) {
			return false;
		}
	},
	signature: isSignature,
	// tslint:disable-next-line: no-any
	signedPublicKey: (data: any) => {
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
