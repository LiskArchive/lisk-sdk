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

var _ = require('lodash');
var async = require('async');

var apiCodes = require('../helpers/api_codes');
var ApiError = require('../helpers/api_error');
var constants = require('../helpers/constants');

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
function Voters(cb, scope) {
	library = {
		db: scope.db,
		logger: scope.logger,
		schema: scope.schema,
	};
	setImmediate(cb, null, this);
}

var getDelegate = function(query, cb) {
	var dbQuery = _.assign({}, query, { sort: {} });

	delete dbQuery.limit;
	delete dbQuery.offset;

	return modules.accounts.getAccount(
		dbQuery,
		['publicKey', 'username', 'address', 'balance'],
		cb
	);
};

/**
 * Voters
 */
var getVotersForDelegates = function(filters, delegate, cb) {
	if (!delegate) {
		return setImmediate(cb, new ApiError({}, apiCodes.NO_CONTENT));
	}
	library.db.voters
		.list({
			publicKey: delegate.publicKey,
			limit: filters.limit,
			offset: filters.offset,
		})
		.then(rows => {
			var addresses = rows.map(a => a.accountId);
			return setImmediate(cb, null, addresses);
		})
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(
				cb,
				`Failed to get voters for delegate: ${delegate.publicKey}`
			);
		});
};

var populateVoters = function(sort, addresses, cb) {
	modules.accounts.getAccounts(
		{ address: addresses, sort: sort },
		['address', 'balance', 'publicKey'],
		cb
	);
};

var getVotersCountForDelegates = function(delegate, cb) {
	if (!delegate) {
		return setImmediate(cb, new ApiError({}, apiCodes.NO_CONTENT));
	}

	library.db.voters
		.count(delegate.publicKey)
		.then(votersCount => setImmediate(cb, null, parseInt(votersCount)))
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(
				cb,
				`Failed to get voters count for delegate: ${delegate.publicKey}`
			);
		});
};

/**
 * Votes
 */
var getVotesCountForDelegates = function(delegate, cb) {
	if (!delegate) {
		return setImmediate(cb, new ApiError({}, apiCodes.NO_CONTENT));
	}

	library.db.votes
		.count(delegate.address)
		.then(votesCount => setImmediate(cb, null, parseInt(votesCount)))
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(
				cb,
				`Failed to get votes count for delegate: ${delegate.address}`
			);
		});
};

var getVotesForDelegates = function(filters, delegate, cb) {
	if (!delegate) {
		return setImmediate(cb, new ApiError({}, apiCodes.NO_CONTENT));
	}
	library.db.votes
		.list({
			address: delegate.address,
			limit: filters.limit,
			offset: filters.offset,
		})
		.then(rows => {
			var addresses = rows.map(a =>
				modules.accounts.generateAddressByPublicKey(a.dependentId)
			);
			return setImmediate(cb, null, addresses);
		})
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(
				cb,
				`Failed to get votes for delegate: ${delegate.address}`
			);
		});
};

var populateVotes = function(sort, addresses, cb) {
	modules.accounts.getAccounts(
		{ address: addresses, sort: sort },
		['address', 'balance', 'publicKey', 'username'],
		cb
	);
};

/**
 * @return {boolean}
 */
Voters.prototype.isLoaded = function() {
	return loaded;
};

// Public methods
Voters.prototype.shared = {
	/**
	 * Gets a delegate and their voters.
	 * @param {Object} filters - Filters applied to results.
	 * @param {string} filters.username - Username associated to account.
	 * @param {string} filters.address - Account address.
	 * @param {string} filters.publicKey - Public key associated to account.
	 * @param {string} filters.secondPublicKey - Second public key associated to account.
	 * @param {string} filters.sort - Field to sort results by.
	 * @param {int} filters.limit - Limit applied to results.
	 * @param {int} filters.offset - Offset value for results.
	 * @param {function} cb - Callback function.
	 */
	getVoters: function(filters, cb) {
		async.autoInject(
			{
				delegate: getDelegate.bind(null, filters),
				votersCount: ['delegate', getVotersCountForDelegates],
				votersAddresses: [
					'delegate',
					getVotersForDelegates.bind(null, filters),
				],
				populatedVoters: [
					'votersAddresses',
					populateVoters.bind(null, filters.sort),
				],
			},
			(err, results) => {
				if (err) {
					return setImmediate(cb, err);
				}

				results.delegate.voters = results.populatedVoters;
				results.delegate.votes = results.votersCount;

				return setImmediate(cb, null, results.delegate);
			}
		);
	},

	/**
	 * Gets a delegate and their votes.
	 * @param {Object} filters - Filters applied to results.
	 * @param {string} filters.username - Username associated to account.
	 * @param {string} filters.address - Account address.
	 * @param {string} filters.publicKey - Public key associated to account.
	 * @param {string} filters.secondPublicKey - Second public key associated to account.
	 * @param {string} filters.sort - Field to sort results by.
	 * @param {int} filters.limit - Limit applied to results.
	 * @param {int} filters.offset - Offset value for results.
	 * @param {function} cb - Callback function.
	 */
	getVotes: function(filters, cb) {
		async.autoInject(
			{
				delegate: getDelegate.bind(null, filters),
				votesCount: ['delegate', getVotesCountForDelegates],
				votesAddresses: ['delegate', getVotesForDelegates.bind(null, filters)],
				populatedVotes: [
					'votesAddresses',
					populateVotes.bind(null, filters.sort),
				],
			},
			(err, results) => {
				if (err) {
					return setImmediate(cb, err);
				}

				results.delegate.votes = results.populatedVotes;
				results.delegate.votesUsed = results.votesCount;
				results.delegate.votesAvailable =
					constants.maxVotesPerAccount - results.votesCount;

				return setImmediate(cb, null, results.delegate);
			}
		);
	},
};

// Events
/**
 * Assigns used modules to modules variable.
 * @param {modules} scope - Loaded modules.
 */
Voters.prototype.onBind = function(scope) {
	modules = {
		accounts: scope.accounts,
	};
	loaded = true;
};

// Export
module.exports = Voters;
