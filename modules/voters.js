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

const _ = require('lodash');
const async = require('async');
const apiCodes = require('../helpers/api_codes');
const ApiError = require('../helpers/api_error');
const sortBy = require('../helpers/sort_by.js');

const { MAX_VOTES_PER_ACCOUNT } = global.constants;

// Private fields
let modules;
let library;
let loaded = false;

/**
 * Main voters methods. Initializes library with scope content and private constiables:
 * - library
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires async
 * @requires lodash
 * @requires helpers/api_codes
 * @requires helpers/api_error
 * @param {setImmediateCallback} cb - Callback function
 * @param {scope} scope - App instance
 */
class Voters {
	constructor(cb, scope) {
		library = {
			db: scope.db,
			logger: scope.logger,
			schema: scope.schema,
		};
		setImmediate(cb, null, this);
	}
}

/**
 * Description of getDelegate.
 *
 * @todo Add @param tags
 * @todo Add @returns tag
 * @todo Add description of the function
 */
const getDelegate = function(query, cb) {
	const dbQuery = _.assign({}, query, { sort: {} });

	delete dbQuery.limit;
	delete dbQuery.offset;

	return modules.accounts.getAccount(
		dbQuery,
		['publicKey', 'username', 'address', 'balance'],
		cb
	);
};

/**
 * Description of getVotersForDelegates.
 *
 * @todo Add @param tags
 * @todo Add @returns tag
 * @todo Add description of the function
 */
const getVotersForDelegates = function(filters, delegate, cb) {
	if (!delegate) {
		return setImmediate(cb, new ApiError({}, apiCodes.NO_CONTENT));
	}

	let sort = { sortField: 'publicKey', sortMethod: 'ASC' };
	if (filters.sort) {
		const allowedSortFields = ['balance', 'publicKey', 'username'];
		sort = sortBy.sortBy(filters.sort, {
			sortFields: allowedSortFields,
			quoteField: false,
		});
	}

	library.db.voters
		.list({
			publicKey: delegate.publicKey,
			limit: filters.limit,
			offset: filters.offset,
			sortField: sort.sortField,
			sortMethod: sort.sortMethod,
		})
		.then(voters => setImmediate(cb, null, voters))
		.catch(err => {
			library.logger.error(err.stack);
			return setImmediate(
				cb,
				`Failed to get voters for delegate: ${delegate.publicKey}`
			);
		});
};

/**
 * Description of getVotersCountForDelegates.
 *
 * @todo Add @param tags
 * @todo Add @returns tag
 * @todo Add description of the function
 */
const getVotersCountForDelegates = function(delegate, cb) {
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
 * Description of getVotesCountForDelegates.
 *
 * @todo Add @param tags
 * @todo Add @returns tag
 * @todo Add description of the function
 */
const getVotesCountForDelegates = function(delegate, cb) {
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

/**
 * Description of getVotesForDelegates.
 *
 * @todo Add @param tags
 * @todo Add @returns tag
 * @todo Add description of the function
 */
const getVotesForDelegates = function(filters, delegate, cb) {
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
			const addresses = rows.map(a =>
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

/**
 * Description of populateVotes.
 *
 * @todo Add @param tags
 * @todo Add @returns tag
 * @todo Add description of the function
 */
const populateVotes = function(sort, addresses, cb) {
	modules.accounts.getAccounts(
		{ address: addresses, sort },
		['address', 'balance', 'publicKey', 'username'],
		cb
	);
};

/**
 * Description of isLoaded.
 *
 * @returns {boolean}
 * @todo Add @param tags
 * @todo Add description of the function and the return value
 */
Voters.prototype.isLoaded = function() {
	return loaded;
};

// Public methods
Voters.prototype.shared = {
	/**
	 * Gets a delegate and their voters.
	 *
	 * @param {Object} filters - Filters applied to results
	 * @param {string} filters.username - Username associated to account
	 * @param {string} filters.address - Account address
	 * @param {string} filters.publicKey - Public key associated to account
	 * @param {string} filters.secondPublicKey - Second public key associated to account
	 * @param {string} filters.sort - Field to sort results by
	 * @param {int} filters.limit - Limit applied to results
	 * @param {int} filters.offset - Offset value for results
	 * @param {function} cb - Callback function
	 */
	getVoters(filters, cb) {
		async.autoInject(
			{
				delegate: getDelegate.bind(null, filters),
				votersCount: ['delegate', getVotersCountForDelegates],
				votersAddresses: [
					'delegate',
					getVotersForDelegates.bind(null, filters),
				],
			},
			(err, results) => {
				if (err) {
					return setImmediate(cb, err);
				}

				results.delegate.voters = results.votersAddresses;
				results.delegate.votes = results.votersCount;

				return setImmediate(cb, null, results.delegate);
			}
		);
	},

	/**
	 * Gets a delegate and their votes.
	 *
	 * @param {Object} filters - Filters applied to results
	 * @param {string} filters.username - Username associated to account
	 * @param {string} filters.address - Account address
	 * @param {string} filters.publicKey - Public key associated to account
	 * @param {string} filters.secondPublicKey - Second public key associated to account
	 * @param {string} filters.sort - Field to sort results by
	 * @param {int} filters.limit - Limit applied to results
	 * @param {int} filters.offset - Offset value for results
	 * @param {function} cb - Callback function
	 */
	getVotes(filters, cb) {
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
					MAX_VOTES_PER_ACCOUNT - results.votesCount;

				return setImmediate(cb, null, results.delegate);
			}
		);
	},
};

// Events
/**
 * Assigns used modules to modules constiable.
 *
 * @param {modules} scope - Loaded modules
 */
Voters.prototype.onBind = function(scope) {
	modules = {
		accounts: scope.accounts,
	};
	loaded = true;
};

// Export
module.exports = Voters;
