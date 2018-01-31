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

var bignum = require('../helpers/bignum.js');
var BlockReward = require('../logic/block_reward.js');
var crypto = require('crypto');
var transactionTypes = require('../helpers/transaction_types.js');
var Vote = require('../logic/vote.js');

// Private fields
var modules;
var library;
var self;
var __private = {};

__private.assetTypes = {};

/**
 * Initializes library with scope content and generates a Vote instance.
 * Calls logic.transaction.attachAssetType().
 * @memberof module:accounts
 * @class
 * @classdesc Main accounts methods.
 * @implements module:accounts.Account#Vote
 * @param {scope} scope - App instance.
 * @param {function} cb - Callback function.
 * @return {setImmediateCallback} Callback function with `self` as data.
 */
function Accounts(cb, scope) {
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
		new Vote(scope.logger, scope.schema)
	);

	setImmediate(cb, null, self);
}

/**
 * Generates address based on public key.
 * @param {publicKey} publicKey - PublicKey.
 * @returns {address} Address generated.
 * @throws {string} If address is invalid throws `Invalid public key`.
 */
Accounts.prototype.generateAddressByPublicKey = function(publicKey) {
	var publicKeyHash = crypto
		.createHash('sha256')
		.update(publicKey, 'hex')
		.digest();
	var temp = Buffer.alloc(8);

	for (var i = 0; i < 8; i++) {
		temp[i] = publicKeyHash[7 - i];
	}

	var address = `${bignum.fromBuffer(temp).toString()}L`;

	if (!address) {
		throw `Invalid public key: ${publicKey}`;
	}

	return address;
};

/**
 * Gets account information, calls logic.account.get().
 * @implements module:accounts#Account~get
 * @param {Object} filter - Containts publicKey.
 * @param {function} fields - Fields to get.
 * @param {function} cb - Callback function.
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
 * @implements module:accounts#Account~getAll
 * @param {Object} filter
 * @param {Object} fields
 * @param {function} cb - Callback function.
 */
Accounts.prototype.getAccounts = function(filter, fields, cb) {
	library.logic.account.getAll(filter, fields, cb);
};

/**
 * Validates input address and calls logic.account.set() and logic.account.get().
 * @implements module:accounts#Account~set
 * @implements module:accounts#Account~get
 * @param {Object} data - Contains address or public key to generate address.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} Errors.
 * @returns {function()} Call to logic.account.get().
 */
Accounts.prototype.setAccountAndGet = function(data, cb, tx) {
	var address = data.address || null;
	var err;

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
		} else {
			throw err;
		}
	}

	library.logic.account.set(
		address,
		data,
		err => {
			if (err) {
				return setImmediate(cb, err);
			}
			return library.logic.account.get({ address: address }, cb, tx);
		},
		tx
	);
};

/**
 * Validates input address and calls logic.account.merge().
 * @implements module:accounts#Account~merge
 * @param {Object} data - Contains address and public key.
 * @param {function} cb - Callback function.
 * @returns {setImmediateCallback} for errors wit address and public key.
 * @returns {function} calls to logic.account.merge().
 * @todo improve publicKey validation try/catch
 */
Accounts.prototype.mergeAccountAndGet = function(data, cb, tx) {
	var address = data.address || null;
	var err;

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
		} else {
			throw err;
		}
	}

	return library.logic.account.merge(address, data, cb, tx);
};

// Events
/**
 * Calls Vote.bind() with scope.
 * @implements module:accounts#Vote~bind
 * @param {modules} scope - Loaded modules.
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
 * @return {boolean} true if modules is loaded
 */
Accounts.prototype.isLoaded = function() {
	return !!modules;
};

// Shared API
/**
 * Public methods, accessible via API
 */
Accounts.prototype.shared = {
	/**
	 * Search accounts based on the query parameter passed.
	 * @param {Object} filters - Filters applied to results
	 * @param {string} filters.address - Account address
	 * @param {string} filters.publicKey - Public key associated to account
	 * @param {string} filters.secondPublicKey - Second public key associated to account
	 * @param {string} filters.username - Username associated to account
	 * @param {string} filters.sort - Field to sort results by
	 * @param {int} filters.limit - Limit applied to results
	 * @param {int} filters.offset - Offset value for results
	 * @param {function} cb - Callback function
	 * @returns {setImmediateCallbackObject}
	 */
	getAccounts: function(filters, cb) {
		library.logic.account.getAll(filters, (err, accounts) => {
			if (err) {
				return setImmediate(cb, err);
			}

			accounts = accounts.map(account => {
				var delegate = {};

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
					delegate: delegate,
				};
			});

			return setImmediate(cb, null, accounts);
		});
	},
};

// Export
module.exports = Accounts;
