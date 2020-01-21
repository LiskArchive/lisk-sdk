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

module.exports = {
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
				initialState: { ...chainStateSchema },
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
				mutatedState: { ...chainStateSchema },
			},
		},
	},
};
