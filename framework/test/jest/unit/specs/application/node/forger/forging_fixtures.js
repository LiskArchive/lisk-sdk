/*
 * Copyright © 2020 Lisk Foundation
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

const allValidCase = {
	input: {
		maxPayloadLength: 1000,
		transactions: [
			{ id: 1, senderId: 'A', fee: 1, nonce: 1 },
			{ id: 2, senderId: 'A', fee: 2, nonce: 2 },
			{ id: 3, senderId: 'B', fee: 1, nonce: 1 },
			{ id: 4, senderId: 'B', fee: 2, nonce: 2 },
			{ id: 5, senderId: 'C', fee: 3, nonce: 1 },
		],
	},
	output: [
		{ id: 5, senderId: 'C', fee: 3, nonce: 1 },
		{ id: 3, senderId: 'B', fee: 1, nonce: 1 },
		{ id: 4, senderId: 'B', fee: 2, nonce: 2 },
		{ id: 1, senderId: 'A', fee: 1, nonce: 1 },
		{ id: 2, senderId: 'A', fee: 2, nonce: 2 },
	],
};

const maxPayloadLengthCase = {
	input: {
		maxPayloadLength: 1000,
		transactions: [
			{ id: 1, senderId: 'A', fee: 1, nonce: 1, bytes: 300 },
			{ id: 2, senderId: 'A', fee: 2, nonce: 2, bytes: 200 },
			{ id: 3, senderId: 'B', fee: 1, nonce: 1, bytes: 200 },
			{ id: 4, senderId: 'B', fee: 2, nonce: 2, bytes: 100 },
			{ id: 5, senderId: 'C', fee: 3, nonce: 1, bytes: 300 },
		],
	},
	output: [
		{ id: 5, senderId: 'C', fee: 3, nonce: 1, bytes: 300 },
		{ id: 3, senderId: 'B', fee: 1, nonce: 1, bytes: 200 },
		{ id: 4, senderId: 'B', fee: 2, nonce: 2, bytes: 100 },
		{ id: 1, senderId: 'A', fee: 1, nonce: 1, bytes: 300 },
	],
};

const invalidTxCase = {
	input: {
		maxPayloadLength: 1000,
		transactions: [
			{ id: 1, senderId: 'A', fee: 1, nonce: 1 },
			{ id: 2, senderId: 'A', fee: 2, nonce: 2, valid: false },
			{ id: 3, senderId: 'A', fee: 1, nonce: 3 },
			{ id: 4, senderId: 'B', fee: 2, nonce: 2 },
			{ id: 5, senderId: 'C', fee: 3, nonce: 1 },
		],
	},
	output: [
		{ id: 5, senderId: 'C', fee: 3, nonce: 1 },
		{ id: 4, senderId: 'B', fee: 2, nonce: 2 },
		{ id: 1, senderId: 'A', fee: 1, nonce: 1 },
	],
};

const allInvalidCase = {
	input: {
		maxPayloadLength: 1000,
		transactions: [
			{ id: 1, senderId: 'A', fee: 1, nonce: 1, valid: false },
			{ id: 2, senderId: 'A', fee: 2, nonce: 2, valid: false },
			{ id: 3, senderId: 'A', fee: 1, nonce: 3, valid: false },
			{ id: 4, senderId: 'B', fee: 2, nonce: 2, valid: false },
			{ id: 5, senderId: 'C', fee: 3, nonce: 1, valid: false },
		],
	},
	output: [],
};

module.exports = {
	allValidCase,
	maxPayloadLengthCase,
	invalidTxCase,
	allInvalidCase,
};
