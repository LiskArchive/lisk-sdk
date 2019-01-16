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

	/**
	 * Search blocks in database.
	 *
	 * @param {Object} params
	 * @param {array} params.where
	 * @param {string} params.sortField
	 * @param {string} params.sortMethod
	 * @param {int} params.limit
	 * @param {int} params.offset
	 * @returns {Promise<[]>}
	 * Array of blocks.
	 */
	list(params) {
		if (params.where && !Array.isArray(params.where)) {
			return Promise.reject(
				new TypeError('Invalid parameter "where" provided.')
			);
		}
		return this.db.any(Queries.list, params);
	}

	/**
	 * Load block including transactions.
	 *
	 * @param {Object} params
	 * @param {string} params.id
	 * @param {string} params.lastId
	 * @param {int} params.height
	 * @param {int} params.limit
	 * @returns {Promise<[]>}
	 * @todo Add description for the params and the return value
	 */
	loadBlocksData(params) {
		return this.db.any(Queries.loadBlocksData, params);
	}

	/**
	 * Insert a block to database.
	 *
	 * @param {Object} block - Attributes to be inserted, can be any of [BlocksRepo's dbFields property]{@link BlocksRepo#dbFields}
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
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

// TODO: All these queries need to be thrown away, and use proper implementation inside corresponding methods.
/**
 * Description of the object.
 *
 * @namespace Queries
 * @memberof db.repos.blocks
 */
const Queries = {
	/**
	 * Description of the function.
	 *
	 * @func list
	 * @memberof db.repos.blocks.Queries
	 * @param {Object} params
	 * @todo Add description for the function and the params
	 * @todo Add @returns tag
	 */
	list(params) {
		return [
			'SELECT * FROM blocks_list',
			params.where && params.where.length
				? `WHERE ${params.where.join(' AND ')}`
				: '',
			params.sortField
				? `ORDER BY ${[params.sortField, params.sortMethod].join(' ')}`
				: '',
			'LIMIT ${limit} OFFSET ${offset}',
		]
			.filter(Boolean)
			.join(' ');
	},
};

module.exports = BlocksRepository;
