/*
 * Copyright © 2019 Lisk Foundation
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
 */
import { objects } from '@liskhq/lisk-utils';
import { validator, LiskValidationError } from '@liskhq/lisk-validator';
import { blockHeaderSchema } from './schema';
import {
	GENESIS_BLOCK_GENERATOR_ADDRESS,
	GENESIS_BLOCK_SIGNATURE,
	GENESIS_BLOCK_TRANSACTION_ROOT,
} from './constants';
import { Block } from './block';

export const validateGenesisBlock = (block: Block): void => {
	const { header, payload } = block;
	const errors = [];

	const headerErrors = validator.validate(
		objects.mergeDeep({}, blockHeaderSchema, {
			properties: {
				version: {
					const: 0,
				},
			},
		}),
		header.toObject(),
	);
	if (headerErrors.length) {
		errors.push(...headerErrors);
	}
	// Custom header validation not possible with validator
	if (!header.generatorAddress.equals(GENESIS_BLOCK_GENERATOR_ADDRESS)) {
		errors.push({
			message: 'should be equal to constant',
			keyword: 'const',
			dataPath: 'header.generatorAddress',
			schemaPath: 'properties.generatorAddress',
			params: { allowedValue: GENESIS_BLOCK_GENERATOR_ADDRESS },
		});
	}

	if (!header.signature.equals(GENESIS_BLOCK_SIGNATURE)) {
		errors.push({
			message: 'should be equal to constant',
			keyword: 'const',
			dataPath: 'header.signature',
			schemaPath: 'properties.signature',
			params: { allowedValue: GENESIS_BLOCK_SIGNATURE },
		});
	}

	if (!header.transactionRoot || !header.transactionRoot.equals(GENESIS_BLOCK_TRANSACTION_ROOT)) {
		errors.push({
			message: 'should be equal to constant',
			keyword: 'const',
			dataPath: 'header.transactionRoot',
			schemaPath: 'properties.transactionRoot',
			params: { allowedValue: GENESIS_BLOCK_TRANSACTION_ROOT },
		});
	}
	if (payload.length !== 0) {
		errors.push({
			message: 'Payload length must be zero',
			keyword: 'const',
			dataPath: 'payload',
			schemaPath: 'properties.payload',
			params: { allowedValue: [] },
		});
	}

	if (errors.length) {
		throw new LiskValidationError(errors);
	}
};
