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

const genesisBlock = __testContext.config.genesisBlock;

const Block = stampit({
	props: {
		id: '',
		blockSignature:
			'56d63b563e00332ec31451376f5f2665fcf7e118d45e68f8db0b00db5963b56bc6776a42d520978c1522c39545c9aff62a7d5bdcf851bf65904b2c2158870f00',
		generatorPublicKey: '',
		numberOfTransactions: 2,
		payloadHash:
			'be0df321b1653c203226add63ac0d13b3411c2f4caf0a213566cbd39edb7ce3b',
		payloadLength: 494,
		height: 489,
		previousBlock: null,
		reward: '0',
		timestamp: 32578370,
		totalAmount: '10000000000000000',
		totalFee: '0',
		transactions: [],
		version: 0,
	},
	init({ id, previousBlock, generatorPublicKey, height }) {
		// Must to provide
		this.previousBlock = previousBlock;

		this.id = id || randomstring.generate({ charset: 'numeric', length: 20 });
		this.generatorPublicKey =
			generatorPublicKey ||
			randomstring
				.generate({ charset: '0123456789ABCDE', length: 32 })
				.toLowerCase();
		this.height = height || Math.floor(Math.random() * Math.floor(5000));

		this.reward = faker.random.number({ min: 10, max: 100 }).toString();
		this.totalFee = faker.random.number({ min: 100, max: 1000 }).toString();
		this.totalAmount = faker.random
			.number({ min: 1000, max: 10000 })
			.toString();
	},
});

const GenesisBlock = stampit(Block, {
	init({ generatorPublicKey }) {
		this.id = genesisBlock.id;
		this.generatorPublicKey =
			generatorPublicKey || genesisBlock.generatorPublicKey;
		this.blockSignature = genesisBlock.blockSignature;
		this.payloadHash = genesisBlock.payloadHash;
		this.previousBlock = null;
		this.height = 1;
		this.numberOfTransactions = 0;

		this.reward = '111';
		this.totalFee = '100000';
		this.totalAmount = '10000000000000000';
	},
});

module.exports = {
	Block,
	GenesisBlock,
};
