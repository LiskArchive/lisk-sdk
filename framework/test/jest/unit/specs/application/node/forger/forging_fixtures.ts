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

export const allValidCase = {
	input: {
		maxPayloadLength: 1000,
		transactions: [
			{ id: 1, senderId: 'A', fee: 1, nonce: 1, feePriority: 1 },
			{ id: 2, senderId: 'A', fee: 2, nonce: 2, feePriority: 2 },
			{ id: 3, senderId: 'B', fee: 1, nonce: 1, feePriority: 1 },
			{ id: 4, senderId: 'B', fee: 2, nonce: 2, feePriority: 2 },
			{ id: 5, senderId: 'C', fee: 3, nonce: 1, feePriority: 3 },
		],
	},
	output: [
		{ id: 5, senderId: 'C', fee: 3, nonce: 1, feePriority: 3 },
		{ id: 3, senderId: 'B', fee: 1, nonce: 1, feePriority: 1 },
		{ id: 4, senderId: 'B', fee: 2, nonce: 2, feePriority: 2 },
		{ id: 1, senderId: 'A', fee: 1, nonce: 1, feePriority: 1 },
		{ id: 2, senderId: 'A', fee: 2, nonce: 2, feePriority: 2 },
	],
};

export const maxPayloadLengthCase = {
	input: {
		maxPayloadLength: 1000,
		transactions: [
			{ id: 1, senderId: 'A', fee: 1, nonce: 1, bytes: 300, feePriority: 1 },
			{ id: 2, senderId: 'A', fee: 2, nonce: 2, bytes: 200, feePriority: 2 },
			{ id: 3, senderId: 'B', fee: 1, nonce: 1, bytes: 200, feePriority: 1 },
			{ id: 4, senderId: 'B', fee: 2, nonce: 2, bytes: 100, feePriority: 2 },
			{ id: 5, senderId: 'C', fee: 3, nonce: 1, bytes: 300, feePriority: 3 },
		],
	},
	output: [
		{ id: 5, senderId: 'C', fee: 3, nonce: 1, bytes: 300, feePriority: 3 },
		{ id: 3, senderId: 'B', fee: 1, nonce: 1, bytes: 200, feePriority: 1 },
		{ id: 4, senderId: 'B', fee: 2, nonce: 2, bytes: 100, feePriority: 2 },
		{ id: 1, senderId: 'A', fee: 1, nonce: 1, bytes: 300, feePriority: 1 },
	],
};

export const invalidTxCase = {
	input: {
		maxPayloadLength: 1000,
		transactions: [
			{ id: 1, senderId: 'A', fee: 1, nonce: 1, feePriority: 1 },
			{ id: 2, senderId: 'A', fee: 2, nonce: 2, valid: false, feePriority: 2 },
			{ id: 3, senderId: 'A', fee: 1, nonce: 3, feePriority: 1 },
			{ id: 4, senderId: 'B', fee: 2, nonce: 2, feePriority: 2 },
			{ id: 5, senderId: 'C', fee: 3, nonce: 1, feePriority: 3 },
		],
	},
	output: [
		{ id: 5, senderId: 'C', fee: 3, nonce: 1, feePriority: 3 },
		{ id: 4, senderId: 'B', fee: 2, nonce: 2, feePriority: 2 },
		{ id: 1, senderId: 'A', fee: 1, nonce: 1, feePriority: 1 },
	],
};

export const allInvalidCase = {
	input: {
		maxPayloadLength: 1000,
		transactions: [
			{ id: 1, senderId: 'A', fee: 1, nonce: 1, valid: false, feePriority: 1 },
			{ id: 2, senderId: 'A', fee: 2, nonce: 2, valid: false, feePriority: 2 },
			{ id: 3, senderId: 'A', fee: 1, nonce: 3, valid: false, feePriority: 1 },
			{ id: 4, senderId: 'B', fee: 2, nonce: 2, valid: false, feePriority: 2 },
			{ id: 5, senderId: 'C', fee: 3, nonce: 1, valid: false, feePriority: 3 },
		],
	},
	output: [],
};
