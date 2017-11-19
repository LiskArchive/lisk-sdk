'use strict';

var apiCodes = require('../helpers/apiCodes.js');
var ApiError = require('../helpers/apiError.js');
var DApp = require('../logic/dapp.js');
var dappCategories = require('../helpers/dappCategories.js');
var InTransfer = require('../logic/inTransfer.js');
var sortBy = require('../helpers/sort_by.js').sortBy;
var OutTransfer = require('../logic/outTransfer.js');
var schema = require('../schema/dapps.js');
var sql = require('../sql/dapps.js');
var transactionTypes = require('../helpers/transactionTypes.js');

// Private fields
var modules, library, self, __private = {}, shared = {};

__private.assetTypes = {};

/**
 * Initializes library with scope content and generates instances for:
 * - DApp
 * - InTransfer
 * - OutTransfer
 * Calls logic.transaction.attachAssetType().
 *
 * Listens `exit` signal.
 * @memberof module:dapps
 * @class
 * @classdesc Main dapps methods.
 * @param {function} cb - Callback function.
 * @param {scope} scope - App instance.
 * @return {setImmediateCallback} Callback function with `self` as data.
 * @todo apply node pattern for callbacks: callback always at the end.
 * @todo add 'use strict';
 */
// Constructor
function DApps (cb, scope) {
	library = {
		logger: scope.logger,
		db: scope.db,
		network: scope.network,
		schema: scope.schema,
		ed: scope.ed,
		balancesSequence: scope.balancesSequence,
		logic: {
			transaction: scope.logic.transaction
		},
		config: {
			dapp: scope.config.dapp
		}
	};
	self = this;

	__private.assetTypes[transactionTypes.DAPP] = library.logic.transaction.attachAssetType(
		transactionTypes.DAPP,
		new DApp(
			scope.db,
			scope.logger,
			scope.schema,
			scope.network
		)
	);

	__private.assetTypes[transactionTypes.IN_TRANSFER] = library.logic.transaction.attachAssetType(
		transactionTypes.IN_TRANSFER,
		new InTransfer(
			scope.db,
			scope.schema
		)
	);

	__private.assetTypes[transactionTypes.OUT_TRANSFER] = library.logic.transaction.attachAssetType(
		transactionTypes.OUT_TRANSFER,
		new OutTransfer(
			scope.db,
			scope.schema,
			scope.logger
		)
	);
	/**
	 * Receives an 'exit' signal and calls stopDApp for each launched app.
	 * @listens exit
	 */
	process.on('exit', function () {
	});

	setImmediate(cb, null, self);
}

// Private methods
/**
 * Gets records from `dapps` table based on filter
 * @private
 * @implements {library.db.query}
 * @param {Object} filter - Could contains type, name, category, link, limit,
 * offset, sort
 * @param {function} cb
 * @return {setImmediateCallback} error description | rows data
 */
__private.list = function (filter, cb) {
	var params = {}, where = [];

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
		var category = dappCategories[filter.category];

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

	var sort = sortBy(
		filter.sort, {
			sortFields: sql.sortFields
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
		return setImmediate(cb, null, rows);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, err);
	});
};

// Events
/**
 * Bounds used scope modules to private modules variable and sets params
 * to private Dapp, InTransfer and OutTransfer instances.
 * @implements module:transactions#Transfer~bind
 * @param {modules} scope - Loaded modules.
 */
DApps.prototype.onBind = function (scope) {
	modules = {
		transactions: scope.transactions,
		accounts: scope.accounts,
		peers: scope.peers,
		sql: scope.sql
	};

	__private.assetTypes[transactionTypes.IN_TRANSFER].bind(
		scope.accounts,
		shared
	);

	__private.assetTypes[transactionTypes.OUT_TRANSFER].bind(
		scope.accounts,
		scope.dapps
	);
};

/**
 * Checks if `modules` is loaded.
 * @return {boolean} True if `modules` is loaded.
 */
DApps.prototype.isLoaded = function () {
	return !!modules;
};

/**
 * Internal & Shared
 * - DApps.prototype.internal
 * - shared.
 * @todo implement API comments with apidoc.
 * @see {@link http://apidocjs.com/}
 */
DApps.prototype.shared = {

	getDapps: function (req, cb) {
		library.schema.validate(req.body, schema.list, function (err) {
			if (err) {
				return setImmediate(cb, new ApiError(err[0].message, apiCodes.BAD_REQUEST));
			}
			__private.list(req.body, function (err, dapps) {
				if (err) {
					return setImmediate(cb, new ApiError(err, apiCodes.INTERNAL_SERVER_ERROR));
				} else {
					return setImmediate(cb, null, {dapps: dapps});
				}
			});
		});
	}
};

// Shared API
shared.getGenesis = function (req, cb) {
	library.db.query(sql.getGenesis, { id: req.dappid }).then(function (rows) {
		if (rows.length === 0) {
			return setImmediate(cb, 'Application genesis block not found');
		} else {
			var row = rows[0];

			return setImmediate(cb, null, {
				pointId: row.id,
				pointHeight: row.height,
				authorId: row.authorId,
				dappid: req.dappid
			});
		}
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'DApp#getGenesis error');
	});
};

// Export
module.exports = DApps;
