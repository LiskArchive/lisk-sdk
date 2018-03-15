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

const randomstring = require('randomstring');
const stampit = require('stampit');
const faker = require('faker');

const Round = stampit({
	props: {
		address: '',
		amount: null,
		blockId: '',
		delegate: '',
		round: null,
	},
	init({ address, amount, blockId, delegate, round }) {
		this.address =
			address ||
			`${randomstring.generate({ charset: 'numeric', length: 20 })}L`;
		this.amount =
			amount || faker.random.number({ min: 1000, max: 5000 }).toString();
		this.blockId =
			blockId || randomstring.generate({ charset: 'numeric', length: 20 });
		this.delegate =
			delegate ||
			randomstring.generate({
				charset: 'hex',
				length: 32,
				capitalization: 'lowercase',
			});
		this.round = round || faker.random.number({ min: 10, max: 500 }).toString();
	},
});

module.exports = {
	Round,
};
