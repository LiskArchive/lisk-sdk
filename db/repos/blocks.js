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

const cs = {}; // Reusable ColumnSet objects

/**
 * Blocks database interaction module
 * @memberof module:blocks
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {BlocksRepository}
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

		if (!cs.insert) {
			cs.insert = new pgp.helpers.ColumnSet(this.dbFields, {
				table: this.dbTable,
			});
		}
	}

	// TODO: Merge BlocksRepository#getGenesisBlock with BlocksRepository#getGenesisBlockId
	/**
	 * Get the genesis block
	 * @return {Promise}
	 */
	getGenesisBlock() {
		return this.db.any(sql.getGenesisBlock);
	}

	/**
	 * Get genesis block by id
	 * @param {string} id
	 * @return {Promise}
	 */
	getGenesisBlockId(id) {
		// TODO: Must use a result-specific method, not .query
		return this.db.query(sql.getGenesisBlockId, [id]);
	}

	/**
	 * Delete a block from database
	 * @param {string} id
	 * @return {Promise}
	 */
	deleteBlock(id) {
		return this.db.none(sql.deleteBlock, [id]);
	}

	/**
	 * Aggregate rewards for a block
	 * @param {Object} params
	 * @param {string} params.generatorPublicKey
	 * @param {int} params.start - Start time of aggregation period
	 * @param {int} params.end - End time for aggregation period
	 * @return {Promise}
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
	 * Counts all blocks
	 * @return {Promise<number>}
	 */
	count() {
		return this.db.one(sql.count, [], a => +a.count);
	}

	/**
	 * Search blocks in database
	 * @param {Object} params
	 * @param {array} params.where
	 * @param {string} params.sortField
	 * @param {string} params.sortMethod
	 * @param {int} params.limit
	 * @param {int} params.offset
	 * @return {Promise}
	 */
	list(params) {
		// TODO: Must use a result-specific method, not .query
		return this.db.query(Queries.list(params), params);
	}

	/**
	 * Get sequence of blocks ids for delegates
	 * @param {Object} params
	 * @param {int} params.delegates - Number of delegates
	 * @param {int} params.height
	 * @param {int} params.limit
	 * @return {Promise}
	 */
	getIdSequence(params) {
		// TODO: Must use a result-specific method, not .query
		return this.db.query(sql.getIdSequence, params);
	}

	/**
	 * Get common block among peers
	 * @param {Object} params
	 * @param {string} params.id
	 * @param {string} params.previousBlock
	 * @param {int} params.height
	 * @return {Promise}
	 */
	getCommonBlock(params) {
		// TODO: Must use a result-specific method, not .query
		params.comparePreviousBlock = params.previousBlock
			? this.pgp.as.format('AND "previousBlock" = ${previousBlock}', params)
			: '';
		return this.db.query(sql.getCommonBlock, params);
	}

	// TODO: Merge BlocksRepository#getHeightByLastId with BlocksRepository#list
	/**
	 * Get height of the block with id
	 * @param {string} lastId - Id of the block to search
	 * @return {Promise}
	 */
	getHeightByLastId(lastId) {
		// TODO: Must use a result-specific method, not .query
		return this.db.query(sql.getHeightByLastId, [lastId]);
	}

	/**
	 * Load block including transactions
	 * @param {Object} params
	 * @param {string} params.id
	 * @param {string} params.lastId
	 * @param {int} params.height
	 * @param {int} params.limit
	 * @return {Promise}
	 */
	loadBlocksData(params) {
		// TODO: Must use a result-specific method, not .query
		return this.db.query(Queries.loadBlocksData(params), params);
	}

	/**
	 * Load blocks including transactions with an offset and limit
	 * @param {int} offset
	 * @param {int} limit
	 * @return {Promise}
	 */
	loadBlocksOffset(offset, limit) {
		// TODO: Must use a result-specific method, not .query
		return this.db.query(sql.loadBlocksOffset, [offset, limit]);
	}

	/**
	 * Load the last block including transactions
	 * @return {Promise}
	 */
	loadLastBlock() {
		// TODO: Must use a result-specific method, not .query
		return this.db.query(sql.loadLastBlock);
	}

	/**
	 * Load last N block ids from the database
	 * @param {limit} - Number of blocks to load
	 */
	loadLastNBlockIds(limit) {
		return this.db.query(sql.loadLastNBlockIds, [limit]);
	}

	/**
	 * Check if a block exits with a particular ID
	 * @param {string} id
	 * @return {Promise}
	 * @throws {QueryResultError} - Multiple rows were not expected - in the case of multiple blocks found with same id
	 */
	blockExists(id) {
		return this.db.oneOrNone(sql.blockExists, [id]);
	}

	/**
	 * Delete all blocks after a particular height
	 * @param {string} id
	 * @return {Promise}
	 */
	deleteAfterBlock(id) {
		return this.db.none(sql.deleteAfterBlock, [id]);
	}

	/**
	 * Get multiple blocks to be transported to peers
	 * @param {string} ids - Comma separated string of ids
	 * @return {Promise}
	 */
	getBlocksForTransport(ids) {
		// TODO: Must use a result-specific method, not .query
		return this.db.query(sql.getBlocksForTransport, [ids]);
	}

	/**
	 * Insert a block to database
	 * @param {Object} block - Attributes to be inserted, can be any of [BlocksRepo's dbFields property]{@link BlocksRepo#dbFields}
	 * @return {Promise}
	 */
	save(block) {
		var saveBlock;
		try {
			saveBlock = Object.assign({}, block);
			saveBlock.payloadHash = Buffer.from(block.payloadHash, 'hex');
			saveBlock.generatorPublicKey = Buffer.from(
				block.generatorPublicKey,
				'hex'
			);
			saveBlock.blockSignature = Buffer.from(block.blockSignature, 'hex');
			saveBlock.reward = block.reward || 0;
		} catch (e) {
			throw e;
		}

		return this.db.none(this.pgp.helpers.insert(saveBlock, cs.insert));
	}
}

// TODO: All these queries need to be thrown away, and use proper implementation inside corresponding methods.

const Queries = {
	list: function(params) {
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

	loadBlocksData: function(params) {
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
