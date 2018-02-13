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

class DatabaseSeed {
	static seedAccounts(db) {
		const accounts = [];
		for (let i = 0; i < 5; i++) {
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
		const blocks = [];
		accounts.forEach(account => {
			block = fixtures.blocks.Block({
				id: account.blockId,
				previousBlock: block ? block.id : null,
				height: blocks.length + 1,
			});
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

	static seed(db) {
		return this.seedAccounts(db).then(accounts =>
			this.seedBlocks(db, accounts)
		);
	}

	static reset(db) {
		const tables = ['mem_accounts', 'blocks'];
		const promises = [];

		tables.forEach(table => {
			promises.push(db.query(`TRUNCATE TABLE "${table}" CASCADE`));
		});

		return db.task('db:seed:reset', t => {
			return t.batch(promises);
		});
	}
}

module.exports = DatabaseSeed;
