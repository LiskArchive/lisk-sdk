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
 */

'use strict';

const chainStateSchema = require('./chain_state');

const testCaseSchema = require('./test_case');

const specSchema = {
	title: 'Schema specification for JSON specs output',
	type: 'object',
	additionalProperties: false,
	required: ['title', 'summary', 'runner', 'handler', 'testCases'],
	properties: {
		title: {
			type: 'string',
			description: 'A string type value giving a short title of the spec',
			minLength: 10,
			maxLength: 100,
		},
		summary: {
			type: 'string',
			description:
				'A string type value explaining in detail purpose and value of the spec',
			minLength: 25,
			maxLength: 300,
		},
		runner: {
			type: 'string',
			description:
				'A string identifier to point to a protocol spec name e.g. dpos, bft',
			minLength: 3,
			maxLength: 100,
			pattern: '[a-z0-9_]*',
		},
		handler: {
			type: 'string',
			description:
				'A string value to differentiate between same identifier for protocol spec',
			minLength: 3,
			maxLength: 100,
			pattern: '[a-z0-9_]*',
		},
		config: {
			type: 'object',
			description:
				'A JSON object containing all necessary configurations for the environment in which these specs were generated',
			required: [],
			properties: {
				initialState: { ...chainStateSchema },
				network: {
					type: 'string',
					description:
						'Specify the network id for which these specs belongs to. e.g. devnet, mainnet',
				},
			},
			additionalProperties: true,
		},
		testCases: {
			type: 'array',
			description: 'List down all test cases for current handler and runner',
			items: {
				...testCaseSchema,
			},
		},
	},
};

module.exports = specSchema;
