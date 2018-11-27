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

const sql = require('../sql').blocks;
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

	// TODO: Merge BlocksRepository#getGenesisBlock with BlocksRepository#getGenesisBlockId
	/**
	 * Get the genesis block.
	 *
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	getGenesisBlock() {
		return this.db.any(sql.getGenesisBlock);
	}

	/**
	 * Get genesis block by id.
	 *
	 * @param {string} id
	 * @returns {Promise}
	 * @todo Add description for the params and the return value
	 */
	getGenesisBlockId(id) {
		// TODO: Must use a result-specific method, not .query
		return this.db.query(sql.getGenesisBlockId, [id]);
	}

	/**
	 * Delete a block from database.
	 *
	 * @param {string} id
	 * @returns {Promise}
	 * @todo Add description for the params and the return value
	 */
	deleteBlock(id) {
		return this.db.none(sql.deleteBlock, [id]);
	}

	/**
	 * Delete all blocks above a particular height.
	 *
	 * @param {int} height
	 * @returns {Promise}
	 * @todo Add description for the params and the return value
	 */
	deleteBlocksAfterHeight(height) {
		return this.db.none(sql.deleteBlocksAfterHeight, { height });
	}

	/**
	 * Aggregate rewards for a block.
	 *
	 * @param {Object} params
	 * @param {string} params.generatorPublicKey
	 * @param {int} params.start - Start time of aggregation period
	 * @param {int} params.end - End time for aggregation period
	 * @returns {Promise}
	 * @todo Add description for the params and the return value
	 */
	aggregateBlocksReward(params) {
		// TODO: Must use a result-specific method, not .query
		return this.db.query(sql.aggregateBlocksReward, [
			params.generatorPublicKey,
			params.start,
			params.end,
		]);
	}

	/**
	 * Counts all blocks.
	 *
	 * @returns {Promise<number>}
	 * @todo Add description for the return value
	 */
	count() {
		return this.db.one(sql.count, [], a => +a.count);
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
	 * Get sequence of blocks ids for delegates.
	 *
	 * @param {Object} params
	 * @param {int} params.delegates - Number of delegates
	 * @param {int} params.height
	 * @param {int} params.limit
	 * @returns {Promise<[]>}
	 * Array of blocks.
	 */
	getIdSequence(params) {
		return this.db.any(sql.getIdSequence, params);
	}

	/**
	 * Get common block among peers.
	 *
	 * @param {Object} params
	 * @param {string} params.id
	 * @param {string} params.previousBlock
	 * @param {int} params.height
	 * @returns {Promise}
	 * @todo Add description for the params and the return value
	 */
	getCommonBlock(params) {
		return this.db.any(sql.getCommonBlock, params);
	}

	// TODO: Merge BlocksRepository#getHeightByLastId with BlocksRepository#list
	/**
	 * Get height of the block with id.
	 *
	 * @param {string} lastId - Id of the block to search
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	getHeightByLastId(lastId) {
		// TODO: Must use a result-specific method, not .query
		return this.db.query(sql.getHeightByLastId, [lastId]);
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
	 * Load blocks including transactions with an offset and limit.
	 *
	 * @param {int} offset
	 * @param {int} limit
	 * @returns {Promise<[]>}
	 * List of blocks.
	 */
	loadBlocksOffset(offset, limit) {
		return this.db.any(sql.loadBlocksOffset, [offset, limit]);
	}

	/**
	 * Load the last block including transactions.
	 *
	 * @returns {Promise}
	 * @todo Add description for the return value
	 */
	loadLastBlock() {
		// TODO: Must use a result-specific method, not .query
		return this.db.query(sql.loadLastBlock);
	}

	/**
	 * Load last N block ids from the database.
	 *
	 * @param {limit} - Number of blocks to load
	 * @todo Add @returns tag
	 */
	loadLastNBlockIds(limit) {
		return this.db.query(sql.loadLastNBlockIds, [limit]);
	}

	/**
	 * Check if a block exits with a particular ID.
	 *
	 * @param {string} id
	 * @throws {QueryResultError} - If multiple rows were not expected - in the case of multiple blocks found with same id
	 * @returns {Promise}
	 * @todo Add description for the params and the return value
	 */
	blockExists(id) {
		return this.db.oneOrNone(sql.blockExists, [id]);
	}

	/**
	 * Delete all blocks after a particular height.
	 *
	 * @param {string} id
	 * @returns {Promise}
	 */
	deleteAfterBlock(id) {
		return this.db.none(sql.deleteAfterBlock, [id]);
	}

	/**
	 * Get block to be transported to peers.
	 *
	 * @param {string} id - id of the block
	 * @returns {Promise}
	 * @todo Add description for the return value
	 *
	 */
	getBlockForTransport(id) {
		return this.db.oneOrNone(sql.getBlockForTransport, [id]);
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

	/**
	 * Description of the function.
	 *
	 * @func loadBlocksData
	 * @memberof db.repos.blocks.Queries
	 * @param {Object} params
	 * @todo Add description for the function and the params
	 * @todo Add @returns tag
	 */
	loadBlocksData(params) {
		var limitPart;

		if (!params.id && !params.lastId) {
			limitPart = 'WHERE "b_height" < ${limit}';
		}

		return [
			'SELECT * FROM full_blocks_list',
			limitPart,
			params.id || params.lastId ? 'WHERE' : '',
			params.id ? '"b_id" = ${id}' : '',
			params.id && params.lastId ? ' AND ' : '',
			params.lastId ? '"b_height" > ${height} AND "b_height" < ${limit}' : '',
			'ORDER BY "b_height", "t_rowId"',
		]
			.filter(Boolean)
			.join(' ');
	},
};

module.exports = BlocksRepository;
