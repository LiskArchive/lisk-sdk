/*
 * Copyright © 2019 Lisk Foundation
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

const pgpLib = require('pg-promise');
const childProcess = require('child_process');
const { createStorageComponent } = require('./storage');
const { storageConfig } = require('../../configs');

const pgpOptions = {
	capSQL: true,
	promiseLib: Promise,
	noLocking: false,
};
const pgp = pgpLib(pgpOptions);

class PgHelper {
	constructor(options) {
		const connOptions = storageConfig(options);

		if (!connOptions.database) {
			throw new Error('Please define a database name');
		}

		this.database = connOptions.database;

		this.pgp = pgp(connOptions);
		this.storage = null;
	}

	_dropDB() {
		return new Promise(resolve => {
			childProcess.exec(`dropdb --if-exists  ${this.database}`, err => {
				if (err) {
					// eslint-disable-next-line no-console
					console.log(
						`dropdb --if-exists  ${this.database} failed`,
						err.message,
					);
				}
				resolve();
			});
		});
	}

	_createDB() {
		return new Promise((resolve, reject) => {
			childProcess.exec(`createdb ${this.database}`, err => {
				if (err) {
					// eslint-disable-next-line no-console
					console.log(`createdb ${this.database} failed`, err.message);
					return reject(err);
				}
				return resolve();
			});
		});
	}

	async bootstrap() {
		await this._dropDB();
		await this._createDB();

		// As of the nature of pg-promise the connection is acquired either a query is started to execute.
		// So to actually verify the connection works fine
		// based on the provided options, we need to test it by acquiring
		// the connection a manually

		this.conn = null;

		return this.pgp.connect().then(co => {
			this.conn = co;
			return this.conn;
		});
	}

	async cleanup() {
		await this.storage.adapter.db.$pool.end();
		await this.conn.done();
		await this.pgp.$pool.end();
		await this._dropDB();
	}

	async createStorage(options = {}, logger) {
		const storageOptions = storageConfig({
			database: this.database,
			logFileName: `logs/devnet/lisk_${this.database}.log`,
			noWarnings: true,
			...options,
		});
		this.storage = await createStorageComponent(storageOptions, logger);

		return this.storage;
	}

	async createAccount(account) {
		const keyValueSet = Object.keys(account).map(field => {
			return {
				field: `"${field}"`,
				value:
					field === 'publicKey'
						? `DECODE(\${a.${field}}, 'hex')`
						: `\${a.${field}}`,
			};
		});

		await this.conn.query(
			'DELETE FROM mem_accounts WHERE "publicKey" = DECODE($1, \'hex\')',
			account.publicKey,
		);

		await this.conn.query(
			`INSERT INTO mem_accounts (${keyValueSet
				.map(k => k.field)
				.join(',')}) VALUES (${keyValueSet.map(k => k.value).join(',')})`,
			{ a: account },
		);
	}

	async deleteAllAccounts() {
		return this.conn.query('DELETE FROM mem_accounts');
	}

	async getAccountByPublicKey(publicKey) {
		return this.conn.one(
			`SELECT
			"address",
			ENCODE("publicKey", 'hex') as "publicKey",
			"username",
			"isDelegate",
			"balance",
			"nonce",
			"votes",
			"unlocking",
			"totalVotesReceived",
			"delegate",
			"asset",
			"keys",
			"nameexist" as "nameExist",
			"missedBlocks",
			"producedBlocks",
			"fees",
			"rewards",
			"voteWeight",
			case
			when
				"producedBlocks" + "missedBlocks" = 0 then 0
			else
				ROUND((("producedBlocks"::float / ("producedBlocks" + "missedBlocks")) * 100.0)::numeric, 2)::float
			end AS productivity
			FROM mem_accounts WHERE  "publicKey" = DECODE($1, 'hex')`,
			publicKey,
		);
	}
}

module.exports = {
	PgHelper,
};
