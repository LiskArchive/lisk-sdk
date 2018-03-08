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

const apiCodes = require('../helpers/api_codes.js');
const ApiError = require('../helpers/api_error.js');
const DApp = require('../logic/dapp.js');
const dappCategories = require('../helpers/dapp_categories.js');
const InTransfer = require('../logic/in_transfer.js');
const sortBy = require('../helpers/sort_by.js').sortBy;
const OutTransfer = require('../logic/out_transfer.js');
const transactionTypes = require('../helpers/transaction_types.js');

// Private fields
let modules;
let library;
let self;
const __private = {};
const shared = {};

__private.assetTypes = {};

/**
 * Main dapps methods. Initializes library with scope content and generates instances for:
 * - DApp
 * - InTransfer
 * - OutTransfer
 *
 * Calls logic.transaction.attachAssetType().
 *
 * Listens for an `exit` signal.
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires helpers/api_codes
 * @requires helpers/api_error
 * @requires helpers/dapp_categories
 * @requires helpers/sort_by
 * @requires helpers/transaction_types
 * @requires logic/dapp
 * @requires helpers/in_transfer
 * @requires helpers/out_transfer
 * @param {function} cb - Callback function.
 * @param {scope} scope - App instance.
 * @returns {setImmediateCallback} cb, null, self
 * @todo Apply node pattern for callbacks: callback always at the end
 * @todo Add 'use strict';
 */
class DApps {
	constructor(cb, scope) {
		library = {
			logger: scope.logger,
			db: scope.db,
			network: scope.network,
			schema: scope.schema,
			ed: scope.ed,
			balancesSequence: scope.balancesSequence,
			logic: {
				transaction: scope.logic.transaction,
			},
			config: {
				dapp: scope.config.dapp,
			},
		};
		self = this;

		__private.assetTypes[
			transactionTypes.DAPP
		] = library.logic.transaction.attachAssetType(
			transactionTypes.DAPP,
			new DApp(scope.db, scope.logger, scope.schema, scope.network)
		);

		__private.assetTypes[
			transactionTypes.IN_TRANSFER
		] = library.logic.transaction.attachAssetType(
			transactionTypes.IN_TRANSFER,
			new InTransfer(scope.db, scope.schema)
		);

		__private.assetTypes[
			transactionTypes.OUT_TRANSFER
		] = library.logic.transaction.attachAssetType(
			transactionTypes.OUT_TRANSFER,
			new OutTransfer(scope.db, scope.schema, scope.logger)
		);

		/**
		 * Receives an 'exit' signal and calls stopDApp for each launched application.
		 *
		 * @listens exit
		 */
		process.on('exit', () => {});

		setImmediate(cb, null, self);
	}
}

// Private methods
/**
 * Gets applications based on a given filter object.
 *
 * @func list
 * @private
 * @param {Object} filter - May contain type, name, category, link, limit, offset, sort.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} cb, err, applications
 */
__private.list = function(filter, cb) {
	const params = {};
	const where = [];

	if (filter.transactionId) {
		where.push('"transactionId" = ${transactionId}');
		params.transactionId = filter.transactionId;
	}

	if (filter.type >= 0) {
		where.push('"type" = ${type}');
		params.type = filter.type;
	}

	if (filter.name) {
		where.push('"name" = ${name}');
		params.name = filter.name;
	}

	if (filter.category) {
		const category = dappCategories[filter.category];

		if (category != null) {
			where.push('"category" = ${category}');
			params.category = category;
		} else {
			return setImmediate(cb, 'Invalid application category');
		}
	}

	if (filter.link) {
		where.push('"link" = ${link}');
		params.link = filter.link;
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

	const sort = sortBy(filter.sort, {
		sortFields: library.db.dapps.sortFields,
	});

	if (sort.error) {
		return setImmediate(cb, sort.error);
	}

	library.db.dapps
		.list(
			Object.assign(
				{},
				{
					where,
					sortField: sort.sortField,
					sortMethod: sort.sortMethod,
				},
				params
			)
		)
		.then(rows => setImmediate(cb, null, rows))
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(cb, err);
		});
};

// Events
/**
 * Bounds used scope modules to private modules constiable and sets params
 * to private Dapp, InTransfer and OutTransfer instances.
 *
 * @param {Object} scope - Loaded modules
 */
DApps.prototype.onBind = function(scope) {
	modules = {
		transactions: scope.transactions,
		accounts: scope.accounts,
		peers: scope.peers,
		sql: scope.sql,
	};

	__private.assetTypes[transactionTypes.IN_TRANSFER].bind(
		scope.accounts,
		scope.blocks,
		shared
	);

	__private.assetTypes[transactionTypes.OUT_TRANSFER].bind(
		scope.accounts,
		scope.blocks,
		scope.dapps
	);
};

/**
 * Checks if `modules` is loaded.
 *
 * @returns {boolean} True if `modules` is loaded.
 */
DApps.prototype.isLoaded = function() {
	return !!modules;
};

/**
 * Internal & Shared
 * - DApps.prototype.internal
 * - shared.
 *
 * @property {function} getDapps - Utility method to get dapps
 * @property {function} getGenesis
 * @todo Add description for getGenesis function
 * @todo Implement API comments with apidoc.
 * @see {@link http://apidocjs.com/}
 */
DApps.prototype.shared = {
	/**
	 * Utility method to get dapps.
	 *
	 * @param {Object} parameters - Object of all parameters
	 * @param {string} parameters.transactionId - Registration transaction ID to query
	 * @param {string} parameters.name - Name to query - Fuzzy search
	 * @param {string} parameters.sort - Sort field
	 * @param {int} parameters.limit - Limit applied to results
	 * @param {int} parameters.offset - Offset value for results
	 * @param {function} cb - Callback function
	 * @returns {Array.<Object>}
	 * @todo Add description for the return value
	 */
	getDapps(parameters, cb) {
		__private.list(parameters, (err, dapps) => {
			if (err) {
				return setImmediate(
					cb,
					new ApiError(err, apiCodes.INTERNAL_SERVER_ERROR)
				);
			}
			return setImmediate(cb, null, dapps);
		});
	},
};

// Shared API
/**
 * Description of getGenesis.
 *
 * @todo Add @param tags
 * @todo Add @returns tag
 * @todo Add description of the function
 */
shared.getGenesis = function(req, cb, tx) {
	(tx || library.db).dapps
		.getGenesis(req.dappid)
		.then(rows => {
			if (rows.length === 0) {
				return setImmediate(cb, 'Application genesis block not found');
			}
			const row = rows[0];

			return setImmediate(cb, null, {
				pointId: row.id,
				pointHeight: row.height,
				authorId: row.authorId,
				dappid: req.dappid,
			});
		})
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(cb, 'DApp#getGenesis error');
		});
};

// Export
module.exports = DApps;
