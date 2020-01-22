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

module.exports = {
	title: 'Schema to specify and validate blocks in JSON specs',
	type: 'object',
	properties: {
		address: {
			type: 'string',
		},
		publicKey: {
			type: 'string',
		},
		secondPublicKey: {
			type: ['string', 'null'],
		},
		username: {
			type: ['string', 'null'],
		},
		isDelegate: {
			type: 'boolean',
		},
		secondSignature: {
			type: 'boolean',
		},
		nameExist: {
			type: 'boolean',
		},
		balance: {
			type: ['string', 'integer'],
		},
		multiMin: {
			type: 'integer',
		},
		multiLifetime: {
			type: 'integer',
		},
		missedBlocks: {
			type: 'integer',
		},
		producedBlocks: {
			type: 'integer',
		},
		rank: {
			type: ['integer', 'null'],
		},
		fees: {
			type: 'integer',
		},
		rewards: {
			type: 'integer',
		},
		vote: {
			type: ['string', 'integer'],
		},
		productivity: {
			type: 'integer',
		},
	},
	required: ['address', 'publicKey', 'isDelegate', 'balance'],
};
