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
	return modules.accounts.getAccount(_.assign({}, query, {sort: {}}), ['publicKey', 'address', 'balance'], cb);
};

var getVotersForDelegates = function (delegate, cb) {
	if (!delegate) {
		return setImmediate(cb, new ApiError({}, apiCodes.NO_CONTENT));
	}
	library.db.one(sql.getVoters, {publicKey: delegate.publicKey}).then(function (row) {
		var addresses = (row.accountIds) ? row.accountIds : [];
		return setImmediate(cb, null, addresses);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Failed to get voters for delegate: ' + delegate.publicKey);
	});
};

var populateVoters = function (sort, addresses, cb) {
	modules.accounts.getAccounts({address: {$in: addresses}, sort: sort}, ['address', 'balance', 'username', 'publicKey', 'secondPublicKey'], cb);
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
	 * @param {Object} req
	 * @param {function} cb
	 */
	getVoters: function (req, cb) {
		library.schema.validate(req.body, schema.getVoters, function (err) {
			if (err) {
				return setImmediate(cb, new ApiError(err[0].message, apiCodes.BAD_REQUEST));
			}
			async.autoInject({
				delegate: getDelegate.bind(null, req.body),
				votersAddresses: ['delegate', getVotersForDelegates],
				populatedVoters: ['votersAddresses', populateVoters.bind(null, req.body.sort)]
			}, function (err, results) {
				if (err) {
					return setImmediate(cb, err instanceof ApiError ? err : new ApiError(err, apiCodes.INTERNAL_SERVER_ERROR));
				}
				results.delegate.voters = results.populatedVoters;
				results.delegate.votes = results.populatedVoters.length;
				delete results.delegate.publicKey;
				return setImmediate(cb, null, results.delegate);
			});
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
