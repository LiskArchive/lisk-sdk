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

'use strict';

const path = require('path');
const QueryFile = require('pg-promise').QueryFile;
const BigNum = require('@liskhq/bignum');
const blocksLogic = require('../../../../../src/modules/chain/blocks/block');

const { ACTIVE_DELEGATES } = global.constants;

let self;

class Queries {
	constructor(library, storage) {
		this.library = library;
		this.storage = storage;

		this.validateAccountsBalancesQuery = new QueryFile(
			path.join(__dirname, '../sql/rounds/validate_accounts_balances.sql'),
			{ minify: true },
		);

		self = this;
	}

	/* eslint-disable class-methods-use-this */
	validateAccountsBalances() {
		return self.storage.adapter.db.query(self.validateAccountsBalancesQuery);
	}

	getPostgresVersion() {
		return self.storage.adapter.db.query('SELECT version()');
	}

	getAccounts() {
		return self.storage.adapter.db.query('SELECT * FROM mem_accounts');
	}

	getAccount(address) {
		return self.storage.adapter.db.query(
			'SELECT * FROM mem_accounts WHERE address = ${address}',
			{ address },
		);
	}

	getDelegates() {
		return self.storage.adapter.db.query(
			"SELECT m.*, t.id as \"transactionId\" FROM mem_accounts m LEFT JOIN trs t ON t.asset->'delegate'->>'username' = m.username WHERE t.type = 2",
		);
	}

	getDelegatesOrderedByVoteWeight() {
		return self.storage.adapter.db.query(
			`SELECT "publicKey", "voteWeight" FROM mem_accounts ORDER BY "voteWeight" DESC, "publicKey" ASC LIMIT ${ACTIVE_DELEGATES}`,
		);
	}

	getFullBlock(height) {
		return self.storage.entities.Block.get({ height }, { extended: true });
	}

	getAllBlocks() {
		return self.storage.entities.Block.get(
			{},
			{ extended: true, limit: null },
		).then(blocks => blocks.map(blocksLogic.storageRead));
	}

	getBlocks(round) {
		return self.storage.adapter.db.query(
			'SELECT * FROM blocks WHERE CEIL(height / 101::float)::int = ${round} ORDER BY height ASC',
			{ round },
		);
	}

	getRoundRewards(round, numberOfDelegates) {
		return self.storage.adapter.db
			.query(
				'SELECT sum(r.fee)::bigint AS fees, array_agg(r.reward) AS rewards, array_agg(r.pk) AS delegates FROM (SELECT b."totalFee" AS fee, b.reward, encode(b."generatorPublicKey", \'hex\') AS pk FROM blocks b WHERE ceil(b.height / ${numberOfDelegates}::float)::int = ${round} ORDER BY b.height ASC) r',
				{ round, numberOfDelegates },
			)
			.then(resp => {
				const { delegates, rewards, fees = 0 } = resp[0];
				const feesPerDelegate = new BigNum(fees)
					.dividedBy(numberOfDelegates)
					.floor();

				const feesRemaining = new BigNum(fees).minus(
					feesPerDelegate.times(numberOfDelegates),
				);

				return delegates.reduce((respObj, publicKey, index) => {
					if (respObj[publicKey]) {
						respObj[publicKey].fees = respObj[publicKey].fees.plus(
							feesPerDelegate,
						);
						respObj[publicKey].rewards = respObj[publicKey].rewards.plus(
							rewards[index],
						);
					} else {
						respObj[publicKey] = {
							publicKey,
							fees: new BigNum(feesPerDelegate),
							rewards: new BigNum(rewards[index]),
						};
					}

					if (index === rewards.length - 1) {
						// Apply remaining fees to last delegate
						respObj[publicKey].fees = respObj[publicKey].fees.plus(
							feesRemaining,
						);
					}

					Object.keys(respObj).forEach(key => {
						respObj[key].fees = respObj[key].fees.toString();
						respObj[key].rewards = respObj[key].rewards.toString();
					});

					return respObj;
				}, {});
			});
	}

	getVoters() {
		return self.storage.adapter.db.query(
			'SELECT "dependentId", ARRAY_AGG("accountId") FROM mem_accounts2delegates GROUP BY "dependentId"',
		);
	}
	/* eslint-enable class-methods-use-this */
}

module.exports = Queries;
