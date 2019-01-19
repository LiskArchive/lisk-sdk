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

const ed = require('../../helpers/ed.js');

const cs = {}; // Reusable ColumnSet objects

/**
 * Blocks database interaction class.
 *
 * @class
 * @memberof db.repos.blocks
 * @requires db/sql
 * @see Parent: {@link db.repos.blocks}
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @returns {Object} An instance of a BlocksRepository
 */
class BlocksRepository {
	constructor(db, pgp) {
		this.db = db;
		this.pgp = pgp;

		this.dbTable = 'blocks';

		this.sortFields = [
			'id',
			'timestamp',
			'height',
			'previousBlock',
			'totalAmount',
			'totalFee',
			'reward',
			'numberOfTransactions',
			'generatorPublicKey',
		];

		this.dbFields = [
			'id',
			'version',
			'timestamp',
			'height',
			'previousBlock',
			'numberOfTransactions',
			'totalAmount',
			'totalFee',
			'reward',
			'payloadLength',
			'payloadHash',
			'generatorPublicKey',
			'blockSignature',
		];
		this.cs = cs;

		if (!cs.insert) {
			cs.insert = new pgp.helpers.ColumnSet(this.dbFields, {
				table: this.dbTable,
			});
		}
	}

	// this is only being used in test/common/db_seed.js
	// TODO: remove once test/common/db_seed.js is removed
	save(block) {
		const query = () => {
			const saveBlock = Object.assign({}, block);
			saveBlock.payloadHash = ed.hexToBuffer(block.payloadHash);
			saveBlock.generatorPublicKey = ed.hexToBuffer(block.generatorPublicKey);
			saveBlock.blockSignature = ed.hexToBuffer(block.blockSignature);
			saveBlock.reward = block.reward.toString();
			saveBlock.totalAmount = block.totalAmount.toString();
			saveBlock.totalFee = block.totalFee.toString();
			return this.pgp.helpers.insert(saveBlock, cs.insert);
		};
		return this.db.none(query);
	}
}

module.exports = BlocksRepository;
