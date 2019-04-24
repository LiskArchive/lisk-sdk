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

const Dapp = stampit({
	props: {
		category: 1,
		description: '',
		icon: '',
		link: '',
		name: '',
		tags: '',
		transactionId: '',
		type: 0,
	},
	init({ name, transactionId }) {
		this.description = faker.lorem.sentence();
		this.icon = faker.image.imageUrl();
		this.link = faker.image.imageUrl();
		this.name = name || faker.commerce.productName();
		this.tags = faker.commerce.productName();

		this.transactionId = transactionId;
	},
});

const OutTransfer = stampit({
	props: {
		dappId: '',
		outTransactionId: '',
		transactionId: '',
	},
	init({ dappId, outTransactionId, transactionId }) {
		this.dappId = dappId;
		this.transactionId = transactionId;
		this.outTransactionId =
			outTransactionId ||
			randomstring.generate({ length: 20, charset: 'numeric' });
	},
});

const InTransfer = stampit({
	props: {
		dappId: '',
		outTransactionId: '',
		transactionId: '',
	},
	init({ dappId, transactionId }) {
		this.dappId = dappId;
		this.transactionId =
			transactionId ||
			randomstring.generate({ length: 20, charset: 'numeric' });
	},
});

module.exports = {
	Dapp,
	InTransfer,
	OutTransfer,
};
