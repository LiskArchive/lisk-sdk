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
import Ajv from 'ajv';
import addKeywords from 'ajv-merge-patch';
import BigNum from 'browserify-bignum';
import * as schemas from './schema';
import {
	isGreaterThanMaxTransactionId,
	isNumberString,
	validateAddress,
	validateFee,
	validateNonTransferAmount,
	validatePublicKey,
	validateTransferAmount,
} from './validation';

export const validator = new Ajv({ allErrors: true });
addKeywords(validator);

validator.addFormat('signature',data =>  /^[a-f0-9]{128}$/i.test(data));

validator.addFormat(
	'id',
	data =>
		isNumberString(data) && !isGreaterThanMaxTransactionId(new BigNum(data)),
);

validator.addFormat('address', data => {
	try {
		validateAddress(data);

		return true;
	} catch (error) {
		return false;
	}
});

validator.addFormat('amount', isNumberString);

validator.addFormat('transferAmount', validateTransferAmount);

validator.addFormat('nonTransferAmount', validateNonTransferAmount);

validator.addFormat('fee', validateFee);

validator.addFormat('publicKey', data => {
	try {
		validatePublicKey(data);

		return true;
	} catch (error) {
		return false;
	}
});

validator.addFormat('signedPublicKey', data => {
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
});

validator.addFormat('additionPublicKey', data => {
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
});

validator.addFormat(
	'receivedAt',
	(data: unknown) =>
		data instanceof Date && !isNaN((data as unknown) as number),
);

validator.addKeyword('uniqueSignedPublicKeys', {
	type: 'array',
	compile: () => (data: ReadonlyArray<string>) =>
		new Set(data.map((key: string) => key.slice(1))).size === data.length,
});

validator.addSchema(schemas.baseTransaction);
