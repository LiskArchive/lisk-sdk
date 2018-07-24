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
import addMergePatchKeywords from 'ajv-merge-patch';
import bignum from 'browserify-bignum';
import {
	validateAddress,
	validatePublicKey,
	isGreaterThanMaxTransactionAmount,
	isGreaterThanMaxTransactionId,
	isNumberString,
} from './validation';
import * as schemas from './schema';

const validator = new Ajv({ allErrors: true });
addMergePatchKeywords(validator);

validator.addFormat('signature', data => /^[a-f0-9]{128}$/i.test(data));

validator.addFormat('id', data => {
	if (!isNumberString(data)) {
		return false;
	}
	return !isGreaterThanMaxTransactionId(bignum(data));
});

validator.addFormat('address', data => {
	try {
		validateAddress(data);
		return true;
	} catch (error) {
		return false;
	}
});

validator.addFormat('amount', data => {
	if (!isNumberString(data)) {
		return false;
	}
	return !isGreaterThanMaxTransactionAmount(bignum(data));
});

validator.addFormat('publicKey', data => {
	try {
		validatePublicKey(data);
		return true;
	} catch (error) {
		return false;
	}
});

validator.addFormat('actionPublicKey', data => {
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

validator.addSchema(schemas.baseTransaction);

const schemaMap = {
	0: validator.compile(schemas.transferTransaction),
	1: validator.compile(schemas.signatureTransaction),
	2: validator.compile(schemas.delegateTransaction),
	3: validator.compile(schemas.voteTransaction),
	4: validator.compile(schemas.multiTransaction),
	5: validator.compile(schemas.dappTransaction),
};

const getTransactionValidator = type => {
	const schema = schemaMap[type];
	if (!schema) {
		throw new Error('Unsupported transaction type.');
	}
	return schema;
};

export const validateTransaction = tx => {
	const validate = getTransactionValidator(tx.type);
	const valid = validate(tx);
	// Ajv produces merge error when error happens within $merge
	const errors = validate.errors
		? validate.errors.filter(e => e.keyword !== '$merge')
		: null;
	return {
		valid,
		errors,
	};
};

export default validator;
