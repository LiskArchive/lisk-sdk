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

const crypto = require('crypto');
const Bignum = require('../helpers/bignum.js');
const BlockReward = require('../logic/block_reward.js');
const transactionTypes = require('../helpers/transaction_types.js');
const Vote = require('../logic/vote.js');

// Private fields
let modules;
let library;
let self;
const __private = {};

__private.assetTypes = {};

/**
 * Main accounts methods. Initializes library with scope content and generates a Vote instance.
 * Calls logic.transaction.attachAssetType().
 *
 * @class
 * @memberof modules
 * @see Parent: {@link modules}
 * @requires crypto
 * @requires helpers/bignum
 * @requires logic/block_reward
 * @requires logic/transaction_types
 * @requires logic/vote
 * @param {scope} scope - App instance
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, null, self
 */

class Accounts {
	constructor(cb, scope) {
		library = {
			ed: scope.ed,
			schema: scope.schema,
			balancesSequence: scope.balancesSequence,
			logic: {
				account: scope.logic.account,
				transaction: scope.logic.transaction,
			},
		};
		self = this;
		__private.blockReward = new BlockReward();
		__private.assetTypes[
			transactionTypes.VOTE
		] = library.logic.transaction.attachAssetType(
			transactionTypes.VOTE,
			new Vote(scope.logger, library.schema, library.logic.account)
		);

		setImmediate(cb, null, self);
	}
}

/**
 * Generates address based on public key.
 *
 * @param {publicKey} publicKey - Public key
 * @throws {string} If address is invalid throws `Invalid public key`
 * @returns {address} Generated address
 */
Accounts.prototype.generateAddressByPublicKey = function(publicKey) {
	const publicKeyHash = crypto
		.createHash('sha256')
		.update(publicKey, 'hex')
		.digest();
	const temp = Buffer.alloc(8);

	for (let i = 0; i < 8; i++) {
		temp[i] = publicKeyHash[7 - i];
	}

	const address = `${Bignum.fromBuffer(temp).toString()}L`;

	if (!address) {
		throw `Invalid public key: ${publicKey}`;
	}

	return address;
};

/**
 * Gets account information, calls logic.account.get().
 *
 * @param {Object} filter - Contains public key
 * @param {function} fields - Fields to get
 * @param {function} cb - Callback function
 */
Accounts.prototype.getAccount = function(filter, fields, cb, tx) {
	if (filter.publicKey) {
		filter.address = self.generateAddressByPublicKey(filter.publicKey);
		delete filter.publicKey;
	}

	library.logic.account.get(filter, fields, cb, tx);
};

/**
 * Gets accounts information, calls logic.account.getAll().
 *
 * @param {Object} filter
 * @param {Object} fields
 * @param {function} cb - Callback function
 * @param {Object} tx - Database transaction/task object
 * @todo Add description for the params
 */
Accounts.prototype.getAccounts = function(filter, fields, cb, tx) {
	library.logic.account.getAll(filter, fields, cb, tx);
};

/**
 * Validates input address and calls logic.account.set() and logic.account.get().
 *
 * @param {Object} data - Contains address or public key to generate address
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err
 * @returns {function} Call to logic.account.get()
 */
Accounts.prototype.setAccountAndGet = function(data, cb, tx) {
	let address = data.address || null;
	let err;

	if (address === null) {
		if (data.publicKey) {
			address = self.generateAddressByPublicKey(data.publicKey);
		} else {
			err = 'Missing address or public key';
		}
	}

	if (!address) {
		err = 'Invalid public key';
	}

	if (err) {
		if (typeof cb === 'function') {
			return setImmediate(cb, err);
		}
		throw err;
	}

	library.logic.account.set(
		address,
		data,
		err => {
			if (err) {
				return setImmediate(cb, err);
			}
			return library.logic.account.get({ address }, cb, tx);
		},
		tx
	);
};

/**
 * Validates input address and calls logic.account.merge().
 *
 * @param {Object} data - Contains address and public key
 * @param {function} cb - Callback function
 * @returns {setImmediateCallback} cb, err
 * @returns {function} Calls to logic.account.merge()
 * @todo Improve public key validation try/catch
 */
Accounts.prototype.mergeAccountAndGet = function(data, cb, tx) {
	let address = data.address || null;
	let err;

	if (address === null) {
		if (data.publicKey) {
			address = self.generateAddressByPublicKey(data.publicKey);
		} else {
			err = 'Missing address or public key';
		}
	}

	if (!address) {
		err = 'Invalid public key';
	}

	if (err) {
		if (typeof cb === 'function') {
			return setImmediate(cb, err);
		}
		throw err;
	}

	return library.logic.account.merge(address, data, cb, tx);
};

// Events
/**
 * Calls Vote.bind() with scope.
 *
 * @param {modules} scope - Loaded modules
 */
Accounts.prototype.onBind = function(scope) {
	modules = {
		transactions: scope.transactions,
		blocks: scope.blocks,
	};

	__private.assetTypes[transactionTypes.VOTE].bind(scope.delegates);

	library.logic.account.bind(modules.blocks);
};
/**
 * Checks if modules is loaded.
 *
 * @returns {boolean} True if modules is loaded
 */
Accounts.prototype.isLoaded = function() {
	return !!modules;
};

// Shared API
/**
 * Public methods, accessible via API.
 *
 * @property {function} getAccounts - Search accounts based on the query parameter passed
 */
Accounts.prototype.shared = {
	/**
	 * Search accounts based on the query parameter passed.
	 *
	 * @func shared.getAccounts
	 * @memberof modules.Accounts
	 * @param {Object} filters - Filters applied to results
	 * @param {string} filters.address - Account address
	 * @param {string} filters.publicKey - Public key associated to account
	 * @param {string} filters.secondPublicKey - Second public key associated to account
	 * @param {string} filters.username - Username associated to account
	 * @param {string} filters.sort - Field to sort results by
	 * @param {int} filters.limit - Limit applied to results
	 * @param {int} filters.offset - Offset value for results
	 * @param {function} cb - Callback function
	 * @returns {setImmediateCallback} cb
	 * @todo Add description for the return value
	 */
	getAccounts(filters, cb) {
		const fields = [
			'address',
			'publicKey',
			'secondPublicKey',
			'secondSignature',
			'u_secondSignature',
			'username',
			'balance',
			'u_balance',
			'vote',
			'rewards',
			'producedBlocks',
			'missedBlocks',
			'rank',
			'approval',
			'productivity',
		];
		library.logic.account.getAll(filters, fields, (err, accounts) => {
			if (err) {
				return setImmediate(cb, err);
			}

			accounts = accounts.map(account => {
				let delegate = {};

				// Only create delegate properties if account has a username
				if (account.username) {
					delegate = {
						username: account.username,
						vote: account.vote,
						rewards: account.rewards,
						producedBlocks: account.producedBlocks,
						missedBlocks: account.missedBlocks,
						rank: account.rank,
						approval: account.approval,
						productivity: account.productivity,
					};
				}

				return {
					address: account.address,
					unconfirmedBalance: account.u_balance,
					balance: account.balance,
					publicKey: account.publicKey,
					unconfirmedSignature: account.u_secondSignature,
					secondSignature: account.secondSignature,
					secondPublicKey: account.secondPublicKey,
					delegate,
				};
			});

			return setImmediate(cb, null, accounts);
		});
	},
};

// Export
module.exports = Accounts;
