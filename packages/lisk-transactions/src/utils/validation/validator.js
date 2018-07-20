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
import { validateAddress, validatePublicKey } from './validation';
import * as schemas from './schema';

const validator = new Ajv();

validator.addFormat('number', data => data === '' || /^[0-9]+$/g.test(data));

validator.addFormat(
	'signature',
	data => data === '' || /^[a-f0-9]{128}$/i.test(data),
);

validator.addFormat('address', data => {
	try {
		validateAddress(data);
		return true;
	} catch (error) {
		return false;
	}
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
		if (action !== '+' || action !== '-') {
			return false;
		}
		const publicKey = data.slice(1);
		validatePublicKey(publicKey);
		return true;
	} catch (error) {
		return false;
	}
});

const getSchema = type => {
	const schemaMap = {
		0: schemas.transferTransaction(),
		1: schemas.signatureTransaction(),
		2: schemas.delegateTransaction(),
		3: schemas.voteTransaction(),
		4: schemas.multiTransaction(),
		5: schemas.dappTransaction(),
	};
	const schema = schemaMap[type];
	if (!schema) {
		throw new Error('Unsupported transaction type');
	}
	return schema;
};

export const validateTransaction = tx => {
	if (typeof tx.type !== 'number') {
		throw new Error('Transaction must have type');
	}
	const schema = getSchema(tx.type);
	const valid = validator.validate(schema, tx);
	return {
		valid,
		errors: validator.errors,
	};
};

export default validator;
