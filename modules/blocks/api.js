'use strict';

var apiCodes = require('../../helpers/apiCodes.js');
var ApiError = require('../../helpers/apiError.js');
var BlockReward = require('../../logic/blockReward.js');
var constants = require('../../helpers/constants.js');
var sortBy = require('../../helpers/sort_by.js').sortBy;
var schema = require('../../schema/blocks.js');
var sql = require('../../sql/blocks.js');

var modules, library, self, __private = {};

/**
 * Initializes library.
 * @memberof module:blocks
 * @class
 * @classdesc Main API logic.
 * Allows get information.
 * @param {Object} logger
 * @param {Database} db
 * @param {Block} block
 * @param {ZSchema} schema
 * @param {Sequence} dbSequence
 */
function API (logger, db, block, schema, dbSequence) {
	library = {
		logger: logger,
		db: db,
		schema: schema,
		dbSequence: dbSequence,
		logic: {
			block: block
		}
	};
	self = this;
	__private.blockReward = new BlockReward();
	library.logger.trace('Blocks->API: Submodule initialized.');
	return self;
}

/**
 * Get filtered list of blocks (without transactions)
 *
 * @private
 * @async
 * @method list
 * @param  {Object}   filter Conditions to filter with
 * @param  {string}   filter.id Block id
 * @param  {string}   filter.generatorPublicKey Public key of delegate who generates the block
 * @param  {number}   filter.numberOfTransactions Number of transactions
 * @param  {string}   filter.previousBlock Previous block ID
 * @param  {number}   filter.height Block height
 * @param  {number}   filter.totalAmount Total amount of block's transactions
 * @param  {number}   filter.totalFee Block total fees
 * @param  {number}   filter.reward Block reward
 * @param  {number}   filter.limit Limit of blocks to retrieve, default: 100, max: 100
 * @param  {number}   filter.offset Offset from where to start
 * @param  {string}   filter.sort Sort order, default: height:desc
 * @param  {function} cb Callback function
 * @return {function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 * @return {Object}   cb.data List of normalized blocks
 */
__private.list = function (filter, cb) {
	var params = {}, where = [];

	if (filter.id) {
		where.push('"b_id" = ${id}');
		params.id = filter.id;
	}

	if (filter.generatorPublicKey) {
		where.push('"b_generatorPublicKey"::bytea = ${generatorPublicKey}');
		params.generatorPublicKey = filter.generatorPublicKey;
	}

	// FIXME: Useless condition
	if (filter.numberOfTransactions) {
		where.push('"b_numberOfTransactions" = ${numberOfTransactions}');
		params.numberOfTransactions = filter.numberOfTransactions;
	}

	if (filter.previousBlock) {
		where.push('"b_previousBlock" = ${previousBlock}');
		params.previousBlock = filter.previousBlock;
	}

	if (filter.height === 0 || filter.height > 0) {
		where.push('"b_height" = ${height}');
		params.height = filter.height;
	}

	// FIXME: Useless condition
	if (filter.totalAmount >= 0) {
		where.push('"b_totalAmount" = ${totalAmount}');
		params.totalAmount = filter.totalAmount;
	}

	// FIXME: Useless condition
	if (filter.totalFee >= 0) {
		where.push('"b_totalFee" = ${totalFee}');
		params.totalFee = filter.totalFee;
	}

	// FIXME: Useless condition
	if (filter.reward >= 0) {
		where.push('"b_reward" = ${reward}');
		params.reward = filter.reward;
	}

	if (!filter.limit) {
		params.limit = 100;
	} else {
		params.limit = Math.abs(filter.limit);
	}

	if (!filter.offset) {
		params.offset = 0;
	} else {
		params.offset = Math.abs(filter.offset);
	}

	if (params.limit > 100) {
		return setImmediate(cb, 'Invalid limit. Maximum is 100');
	}

	var sort = sortBy(
		(filter.sort || 'height:desc'), {
			sortFields: sql.sortFields,
			fieldPrefix: 'b_'
		}
	);

	if (sort.error) {
		return setImmediate(cb, sort.error);
	}

	library.db.query(sql.list({
		where: where,
		sortField: sort.sortField,
		sortMethod: sort.sortMethod
	}), params).then(function (rows) {
		var blocks = [];
		// Normalize blocks
		for (var i = 0; i < rows.length; i++) {
			// FIXME: Can have poor performance because it performs SHA256 hash calculation for each block
			blocks.push(library.logic.block.dbRead(rows[i]));
		}
		return setImmediate(cb, null, {blocks: blocks});
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Blocks#list error');
	});
};

API.prototype.getBlocks = function (req, cb) {
	if (!__private.loaded) {
		return setImmediate(cb, 'Blockchain is loading');
	}

	library.schema.validate(req.body, schema.getBlocks, function (err) {
		if (err) {
			return setImmediate(cb, new ApiError(err[0].message, apiCodes.BAD_REQUEST));
		}

		library.dbSequence.add(function (cb) {
			__private.list(req.body, function (err, data) {
				if (err) {
					return setImmediate(cb, new ApiError(err[0].message, apiCodes.INTERNAL_SERVER_ERROR));
				}
				return setImmediate(cb, null, {blocks: data.blocks, count: data.count});
			});
		}, cb);
	});
};

/**
 * Handle modules initialization:
 * - blocks
 * - system
 * @param {modules} scope Exposed modules
 */
API.prototype.onBind = function (scope) {
	library.logger.trace('Blocks->API: Shared modules bind.');
	modules = {
		blocks: scope.blocks,
		system: scope.system
	};

	// Set module as loaded
	__private.loaded = true;
};

module.exports = API;
