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

const Promise = require('bluebird');
const fixtures = require('../fixtures');

let accounts = [];
let blocks = [];

const numSeedRecords = 5;

class StorageSeed {
	static getBlocks() {
		return blocks;
	}

	static getLastBlock() {
		return blocks[blocks.length - 1];
	}

	static getAccounts() {
		return accounts;
	}

	static seedAccounts(storage) {
		// Prepare some fixture data to seed the database
		for (let i = 0; i < numSeedRecords; i++) {
			accounts.push(new fixtures.accounts.Account());
		}
		return storage.entities.Account.create(accounts).then(() => accounts);
	}

	static seedBlocks(storage, seedBlocksAccounts) {
		let block;

		// Seed one block per account
		seedBlocksAccounts.forEach((account, index) => {
			if (index === 0) {
				block = new fixtures.blocks.GenesisBlock({
					generatorPublicKey: account.publicKey,
				});
			} else {
				block = new fixtures.blocks.Block({
					id: account.blockId,
					generatorPublicKey: account.publicKey,
					previousBlock: block ? block.id : null,
					height: blocks.length + 1,
				});
			}

			block.previousBlockId = block.previousBlock;
			delete block.previousBlock;
			delete block.transactions;

			blocks.push(block);
		});

		return Promise.mapSeries(blocks, aBlock =>
			storage.entities.Block.create(aBlock)
		).then(() => blocks);
	}

	static seedDapps(storage, count = 1) {
		const trs = [];

		for (let i = 0; i < count; i++) {
			trs.push(
				new fixtures.transactions.Transaction({
					blockId: blocks[0].id,
					type: 5,
				})
			);
		}

		return storage.adapter.db.tx('db:seed:dapps', tx =>
			storage.entities.Transaction.create(trs, {}, tx).then(() => trs)
		);
	}

	static seedOutTransfer(storage, dapp, inTransfer, count = 1) {
		const trs = [];

		for (let i = 0; i < count; i++) {
			trs.push(
				new fixtures.transactions.Transaction({
					blockId: blocks[0].id,
					type: 7,
					dapp,
					inTransfer,
				})
			);
		}

		return storage.adapter.db.tx('db:seed:outtransfer', tx =>
			storage.entities.Transaction.create(trs, {}, tx).then(() => trs)
		);
	}

	static seedInTransfer(storage, dapp, count = 1) {
		const trs = [];

		for (let i = 0; i < count; i++) {
			trs.push(
				new fixtures.transactions.Transaction({
					blockId: blocks[0].id,
					type: 6,
					dapp,
				})
			);
		}

		return storage.adapter.db.tx('db:seed:intransfer', tx =>
			storage.entities.Transaction.create(trs, {}, tx).then(() => trs)
		);
	}

	static seed(storage) {
		return this.seedAccounts(storage).then(seedAccounts =>
			this.seedBlocks(storage, seedAccounts)
		);
	}

	static reset(storage) {
		const tables = [
			'blocks',
			'forks_stat',
			'mem_accounts',
			'mem_accounts2multisignatures',
			'mem_accounts2delegates',
			'mem_round',
			'rounds_rewards',
			'peers',
			'trs',
			'chain_meta',
			'block_temp',
		];

		return storage.adapter
			.task('db:seed:reset', t => {
				const promises = [];

				tables.forEach(table => {
					promises.push(
						t.query('TRUNCATE TABLE ${table:name} CASCADE', { table })
					);
				});

				return t.batch(promises);
			})
			.then(() => {
				accounts = [];
				blocks = [];
			});
	}
}

module.exports = StorageSeed;
