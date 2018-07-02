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

class DatabaseSeed {
	static getBlocks() {
		return blocks;
	}

	static getLastBlock() {
		return blocks[blocks.length - 1];
	}

	static getAccounts() {
		return accounts;
	}

	static seedAccounts(db) {
		// Prepare some fixture data to seed the database
		for (let i = 0; i < numSeedRecords; i++) {
			accounts.push(fixtures.accounts.Account());
		}
		return db
			.task('db:seed:accounts', t => {
				return t.accounts.insert(accounts);
			})
			.then(() => accounts);
	}

	static seedBlocks(db, accounts) {
		let block;

		// Seed one block per account
		accounts.forEach((account, index) => {
			if (index === 0) {
				block = fixtures.blocks.GenesisBlock({
					generatorPublicKey: account.publicKey,
				});
			} else {
				block = fixtures.blocks.Block({
					id: account.blockId,
					generatorPublicKey: account.publicKey,
					previousBlock: block ? block.id : null,
					height: blocks.length + 1,
				});
			}

			blocks.push(block);
		});

		return db
			.task('db:seed:blocks', t => {
				return Promise.mapSeries(blocks, block => {
					return t.blocks.save(block);
				});
			})
			.then(() => blocks);
	}

	static seedDapps(db, count = 1) {
		const trs = [];

		for (let i = 0; i < count; i++) {
			trs.push(
				fixtures.transactions.Transaction({ blockId: blocks[0].id, type: 5 })
			);
		}

		return db.tx('db:seed:dapps', t => {
			return t.transactions.save(trs).then(() => trs);
		});
	}

	static seedOutTransfer(db, dapp, inTransfer, count = 1) {
		const trs = [];

		for (let i = 0; i < count; i++) {
			trs.push(
				fixtures.transactions.Transaction({
					blockId: blocks[0].id,
					type: 7,
					dapp,
					inTransfer,
				})
			);
		}

		return db.tx('db:seed:outtransfer', t => {
			return t.transactions.save(trs).then(() => trs);
		});
	}

	static seedInTransfer(db, dapp, count = 1) {
		const trs = [];

		for (let i = 0; i < count; i++) {
			trs.push(
				fixtures.transactions.Transaction({
					blockId: blocks[0].id,
					type: 6,
					dapp,
				})
			);
		}

		return db.tx('db:seed:intransfer', t => {
			return t.transactions.save(trs).then(() => trs);
		});
	}

	static seed(db) {
		return this.seedAccounts(db).then(accounts =>
			this.seedBlocks(db, accounts)
		);
	}

	static reset(db) {
		const tables = [
			'blocks',
			'dapps',
			'forks_stat',
			'intransfer',
			'outtransfer',
			'mem_accounts',
			'mem_accounts2multisignatures',
			'mem_accounts2u_multisignatures',
			'mem_accounts2delegates',
			'mem_accounts2u_delegates',
			'mem_round',
			'rounds_rewards',
			'peers',
			'trs',
			'transfer',
		];

		return db
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

module.exports = DatabaseSeed;
