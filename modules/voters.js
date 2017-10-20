'use strict';

var async = require('async');
var crypto = require('crypto');

var apiCodes = require('../helpers/apiCodes');
var ApiError = require('../helpers/apiError');
var sql = require('../sql/voters');
var schema = require('../schema/voters');

// Private fields
var modules;
var library;
var loaded;

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
		schema: scope.schema,
		logger: scope.logger
	};
	setImmediate(cb, null, this);
}

var getDelegate = function (query, cb) {
	return modules.accounts.getAccount(query, ['publicKey', 'address', 'balance'], cb);
};

var getVotersForDelegates = function (delegate, cb) {
	if (!delegate) {
		return setImmediate(cb, {message: 'No data returned'});
	}
	library.db.one(sql.getVoters, {publicKey: delegate.publicKey}).then(function (row) {
		var addresses = (row.accountIds) ? row.accountIds : [];
		return setImmediate(cb, null, addresses);
	}).catch(function (err) {
		library.logger.error(err.stack);
		return setImmediate(cb, 'Failed to get voters for delegate: ' + delegate.publicKey);
	});
};

var populateVoters = function (addresses, cb) {
	modules.accounts.getAccounts({address: {$in: addresses}}, ['address', 'balance', 'username', 'publicKey'], cb);
};

// Public methods
Voters.prototype.shared = {

	getVoters: function (req, cb) {
		if (!loaded) {
			return setImmediate(cb, new ApiError('Blockchain is loading', apiCodes.INTERNAL_SERVER_ERROR));
		}
		library.schema.validate(req.body, schema.getVoters, function (err) {
			if (err) {
				return setImmediate(cb, new ApiError(err[0].message, apiCodes.BAD_REQUEST));
			}
			async.autoInject({
				delegate: getDelegate.bind(null, req.body),
				votersAddresses: ['delegate', getVotersForDelegates],
				populatedVoters: ['votersAddresses', populateVoters]
			}, function (err, results) {
				if (err) {
					if (err.message === 'No data returned') {
						return setImmediate(cb, null, {message: 'No data returned'});
					}
					return setImmediate(cb, new ApiError(err, apiCodes.INTERNAL_SERVER_ERROR));
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
