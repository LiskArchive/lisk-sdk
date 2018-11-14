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

import validator from './validator';
import * as schemas from './schema';

const schemaMap = {
	0: validator.compile(schemas.transferTransaction),
	1: validator.compile(schemas.signatureTransaction),
	2: validator.compile(schemas.delegateTransaction),
	3: validator.compile(schemas.voteTransaction),
	4: validator.compile(schemas.multiTransaction),
	5: validator.compile(schemas.dappTransaction),
};

const getTransactionSchemaValidator = type => {
	const schema = schemaMap[type];
	if (!schema) {
		throw new Error('Unsupported transaction type.');
	}
	return schema;
};

const validateMultiTransaction = tx => {
	if (tx.asset.multisignature.min > tx.asset.multisignature.keysgroup.length) {
		return {
			valid: false,
			errors: [
				{
					dataPath: '.asset.multisignature.min',
					message:
						'.asset.multisignature.min cannot be greater than .asset.multisignature.keysgroup.length',
				},
			],
		};
	}
	return {
		valid: true,
		errors: null,
	};
};

const validateTransaction = tx => {
	const validateSchema = getTransactionSchemaValidator(tx.type);
	const valid = validateSchema(tx);
	// Ajv produces merge error when error happens within $merge
	const errors = validateSchema.errors
		? validateSchema.errors.filter(e => e.keyword !== '$merge')
		: null;
	if (valid && tx.type === 4) {
		return validateMultiTransaction(tx);
	}
	return {
		valid,
		errors,
	};
};

export default validateTransaction;
