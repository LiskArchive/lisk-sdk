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

const blockSchema = require('./block');
const accountSchema = require('./account');

const initialStateSchema = {
	type: 'object',
	properties: {
		chain: {
			type: 'array',
			uniqueItems: true,
			items: {
				...blockSchema,
			},
		},
		accounts: {
			type: 'array',
			uniqueItems: true,
			items: {
				...accountSchema,
			},
		},
	},
};

const testCaseSchema = {
	title: 'Schema for a single test case',
	type: 'object',
	additionalProperties: false,
	required: ['input', 'output'],
	properties: {
		config: {
			type: 'object',
			description: 'Configuration for a single test case',
			additionalProperties: true,
			required: [],
			properties: {
				initialState: { ...initialStateSchema },
			},
		},
		input: {
			type: 'object',
			description:
				'Input must be specified as a single object. If its complex scenario, it should be divided to multiple to have simple input/output expectations.',
			minProperties: 1,
		},
		output: {
			type: 'object',
			description:
				'Output must be specified as a single object. If its complex scenario, it should be divided to multiple to have simple input/output expectations.',
			required: [],
			additionalProperties: true,
			minProperties: 1,
			properties: {
				mutatedState: { ...initialStateSchema },
			},
		},
	},
};

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
			maxLength: 50,
			pattern: '[a-z0-9_]*',
		},
		handler: {
			type: 'string',
			description:
				'A string value to differentiate between same identifier for protocol spec',
			minLength: 3,
			maxLength: 50,
			pattern: '[a-z0-9_]*',
		},
		config: {
			type: 'object',
			description:
				'A JSON object containing all necessary configurations for the environment in which these specs were generated',
			required: [],
			properties: {
				initialState: { ...initialStateSchema },
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
