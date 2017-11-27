'use strict';

var _ = require('lodash');
var async = require('async');
var crypto = require('crypto');

var apiCodes = require('../helpers/apiCodes');
var ApiError = require('../helpers/apiError');
var sql = require('../sql/voters');
var schema = require('../schema/voters');

// Private fields
var modules;
var library;
var loaded = false;

/**
 * Initializes library with scope content and private variables:
 * - library
 * @class
 * @classdesc Main System methods.
 * @param {setImmediateCallback} cb - Callback function.
 * @param {scope} scope - App instance.
 */
// Constructor
function Voters (cb, scope) {
	library = {
		db: scope.db,
		logger: scope.logger,
		schema: scope.schema
	};
	setImmediate(cb, null, this);
}

var getDelegate = function (query, cb) {
	var dbQuery = _.assign({}, query, {sort: {}});

	delete dbQuery.limit;
	delete dbQuery.offset;

	return modules.accounts.getAccount(dbQuery, ['publicKey', 'username', 'address', 'balance'], cb);
};

var getVotersForDelegates = function (filters, delegate, cb) {
	if (!delegate) {
		return setImmediate(cb, new ApiError({}, apiCodes.NO_CONTENT));
	}
	library.db.query(sql.getVoters, {publicKey: delegate.publicKey, limit: filters.limit, offset: filters.offset}).then(function (rows) {
		var addresses = rows.map(function (a) { return a.accountId; });
		return setImmediate(cb, null, addresses);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Failed to get voters for delegate: ' + delegate.publicKey);
	});
};

var populateVoters = function (sort, addresses, cb) {
	modules.accounts.getAccounts({address: {$in: addresses}, sort: sort}, ['address', 'balance', 'publicKey'], cb);
};

var getVotersCountForDelegates = function (delegate, cb) {
	if (!delegate) {
		return setImmediate(cb, new ApiError({}, apiCodes.NO_CONTENT));
	}

	library.db.one(sql.getVotersCount, {publicKey: delegate.publicKey}).then(function (row) {
		return setImmediate(cb, null, parseInt(row.votersCount));
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Failed to get voters for delegate: ' + delegate.publicKey);
	});
};

/**
 * @return {boolean}
 */
Voters.prototype.isLoaded = function () {
	return loaded;
};

// Public methods
Voters.prototype.shared = {
	/**
	 * API function for getting the delegate including his voters
	 * @param {Object} filters
	 * @param {string} filters.username
	 * @param {string} filters.address
	 * @param {string} filters.publicKey
	 * @param {string} filters.secondPublicKey
	 * @param {string} filters.sort
	 * @param {int} filters.offset
	 * @param {int} filters.limit
	 * @param {function} cb
	 */
	getVoters: function (filters, cb) {
		async.autoInject({
			delegate: getDelegate.bind(null, filters),
			votersCount: ['delegate', getVotersCountForDelegates],
			votersAddresses: ['delegate', getVotersForDelegates.bind(null, filters)],
			populatedVoters: ['votersAddresses', populateVoters.bind(null, filters.sort)]
		}, function (err, results) {
			if (err) {
				return setImmediate(cb, err);
			}

			results.delegate.voters = results.populatedVoters;
			results.delegate.votes = results.votersCount;

			return setImmediate(cb, null, results.delegate);
		});
	}
};

// Events
/**
 * Assigns used modules to modules variable.
 * @param {modules} scope - Loaded modules.
 */
Voters.prototype.onBind = function (scope) {
	modules = {
		accounts: scope.accounts
	};
	loaded = true;
};

// Export
module.exports = Voters;
