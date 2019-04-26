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
const ed = require('../helpers/ed');
const Bignum = require('../helpers/bignum');
const BlockReward = require('./block_reward');

const { ACTIVE_DELEGATES, MULTISIG_CONSTRAINTS } = global.constants;

// Private fields
let library;
let modules;

const __private = {};

/**
 * Main account logic.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires lodash
 * @requires helpers/bignum
 * @requires logic/block_reward
 * @param {Storage} storage
 * @param {ZSchema} schema
 * @param {Object} logger
 * @param {function} cb - Callback function
 * @property {account_model} model
 * @property {account_schema} schema
 * @returns {setImmediate} error, this
 * @todo Add description for the params
 */
class Account {
	constructor(storage, schema, logger, cb) {
		this.scope = {
			schema,
			storage,
		};

		__private.blockReward = new BlockReward();

		library = {
			logger,
		};

		// Obtains fields from model
		this.fields = this.model.map(field => {
			const _tmp = {};

			if (field.expression) {
				_tmp.expression = field.expression;
			} else {
				if (field.mod) {
					_tmp.expression = field.mod;
				}
				_tmp.field = field.name;
			}
			if (_tmp.expression || field.alias) {
				_tmp.alias = field.alias || field.name;
			}

			_tmp.computedField = field.computedField || false;

			return _tmp;
		});

		// Obtains binary fields from model
		this.binary = [];
		this.model.forEach(field => {
			if (field.type === 'Binary') {
				this.binary.push(field.name);
			}
		});

		// Obtains conv from model
		this.conv = {};
		this.model.forEach(field => {
			this.conv[field.name] = field.conv;
		});

		// Obtains editable fields from model
		this.editable = [];
		this.model.forEach(field => {
			if (!field.immutable) {
				this.editable.push(field.name);
			}
		});

		return setImmediate(cb, null, this);
	}

	// Public methods
	/**
	 * Binds input parameters to private variables modules.
	 *
	 * @param {Blocks} blocks
	 */
	// eslint-disable-next-line class-methods-use-this
	bind({ blocks, rounds }) {
		modules = {
			blocks,
			rounds,
		};
	}

	/**
	 * Deletes the contents of these tables:
	 * - mem_round
	 * - mem_accounts2delegates
	 * - mem_accounts2multisignatures
	 * - rounds_rewards
	 *
	 * @param {function} cb - Callback function
	 * @returns {setImmediate} error
	 */
	resetMemTables(cb) {
		this.scope.storage.entities.Account.resetMemTables()
			.then(() => setImmediate(cb))
			.catch(err => {
				library.logger.error(err.stack);
				return setImmediate(cb, new Error('Account#resetMemTables error'));
			});
	}

	/**
	 * Validates account schema.
	 *
	 * @param {account} account
	 * @returns {account} account
	 * @throws {string} On schema.validate failure
	 */
	objectNormalize(account) {
		const report = this.scope.schema.validate(
			account,
			Account.prototype.schema
		);

		if (!report) {
			throw new Error(
				`Failed to validate account schema: ${this.scope.schema
					.getLastErrors()
					.map(err => {
						const path = err.path.replace('#/', '').trim();
						return [path, ': ', err.message, ' (', account[path], ')'].join('');
					})
					.join(', ')}`
			);
		}

		return account;
	}

	/**
	 * Checks type, lenght and format from publicKey.
	 *
	 * @param {publicKey} publicKey
	 * @throws {string} On invalid public key
	 */
	verifyPublicKey(publicKey) {
		if (publicKey !== undefined) {
			// Check type
			if (typeof publicKey !== 'string') {
				throw new Error('Invalid public key, must be a string');
			}
			// Check length
			if (publicKey.length !== 64) {
				throw new Error('Invalid public key, must be 64 characters long');
			}

			if (!this.scope.schema.validate(publicKey, { format: 'hex' })) {
				throw new Error('Invalid public key, must be a hex string');
			}
		}
	}

	/**
	 * Normalizes address and creates binary buffers to insert.
	 *
	 * @param {Object} raw - With address and public key
	 * @returns {Object} Normalized address
	 */
	toDB(raw) {
		this.binary.forEach(field => {
			if (raw[field]) {
				raw[field] = ed.hexToBuffer(raw[field]);
			}
		});

		// Normalize address
		raw.address = String(raw.address).toUpperCase();

		return raw;
	}

	/**
	 * Gets multisignature account information for specified fields and filter criteria.
	 *
	 * @param {Object} filter - Contains address
	 * @param {Object|function} fields - Table fields
	 * @param {function} cb - Callback function
	 * @param {Object} tx - Database transaction/task object
	 * @returns {setImmediate} error, object or null
	 */
	getMultiSignature(filter, fields, cb, tx) {
		if (typeof fields === 'function') {
			tx = cb;
			cb = fields;
			fields = null;
		}

		filter.multiMin_gt = 0;

		this.get(filter, fields, cb, tx);
	}

	/**
	 * Gets account information for specified fields and filter criteria.
	 *
	 * @param {Object} filter - Contains address
	 * @param {Object|function} fields - Table fields
	 * @param {function} cb - Callback function
	 * @param {Object} tx - Database transaction/task object
	 * @returns {setImmediate} error, account or null
	 */
	get(filter, fields, cb, tx) {
		if (typeof fields === 'function') {
			tx = cb;
			cb = fields;
			fields = null;
		}

		this.getAll(
			filter,
			fields,
			(err, data) =>
				setImmediate(cb, err, data && data.length ? data[0] : null),
			tx
		);
	}

	/**
	 * Gets accounts information from mem_accounts.
	 *
	 * @param {Object} filter - Contains address
	 * @param {Object|function} fields - Table fields
	 * @param {function} cb - Callback function
	 * @param {Object} tx - Database transaction/task object
	 * @returns {setImmediate} error, accounts
	 */
	getAll(filter, fields, cb, tx) {
		if (typeof fields === 'function') {
			cb = fields;
			fields = null;
		}

		const options = {
			limit: filter.limit || ACTIVE_DELEGATES,
			offset: filter.offset || 0,
			sort: filter.sort || 'balance:asc',
			extended: true,
		};

		if (options.limit < 0) {
			options.limit = ACTIVE_DELEGATES;
		}

		const filters = _.omit(filter, ['limit', 'offset', 'sort']);

		const self = this;

		this.scope.storage.entities.Account.get(filters, options, tx)
			.then(accounts => {
				const lastBlock = modules.blocks.lastBlock.get();
				// If the last block height is undefined, it means it's a genesis block with height = 1
				// look for a constant for total supply
				const totalSupply = lastBlock.height
					? __private.blockReward.calcSupply(lastBlock.height)
					: 0;

				accounts.forEach(accountRow => {
					accountRow.approval = self.calculateApproval(
						accountRow.vote,
						totalSupply
					);
				});

				const result = fields
					? accounts.map(account => _.pick(account, fields))
					: accounts;

				return setImmediate(cb, null, result);
			})
			.catch(err => {
				library.logger.error(err.stack);
				return setImmediate(cb, new Error('Account#getAll error'));
			});
	}

	/**
	 * Calculates productivity of a delegate account.
	 *
	 * @param {String} votersBalance
	 * @param {String} totalSupply
	 * @returns {number}
	 */
	// eslint-disable-next-line class-methods-use-this
	calculateApproval(votersBalance, totalSupply) {
		// votersBalance and totalSupply are sent as strings,
		// we convert them into bignum and send the response as number as well
		const votersBalanceBignum = new Bignum(votersBalance || 0);
		const totalSupplyBignum = new Bignum(totalSupply);
		const approvalBignum = votersBalanceBignum
			.dividedBy(totalSupplyBignum)
			.multipliedBy(100)
			.decimalPlaces(2);

		return !approvalBignum.isNaN() ? approvalBignum.toNumber() : 0;
	}

	/**
	 * Sets fields for specific address in mem_accounts table.
	 *
	 * @param {address} address
	 * @param {Object} fields
	 * @param {function} cb - Callback function
	 * @param {Object} tx - Database transaction/task object
	 * @returns {setImmediate} error
	 */
	set(address, fields, cb, tx) {
		// Verify public key
		this.verifyPublicKey(fields.publicKey);

		// Normalize address
		fields.address = address;

		this.scope.storage.entities.Account.upsert({ address }, fields, {}, tx)
			.then(() => setImmediate(cb))
			.catch(err => {
				library.logger.error(err.stack);
				return setImmediate(cb, 'Account#set error');
			});
	}

	/**
	 * Updates account from mem_account with diff data belonging to an editable field.
	 * Inserts into mem_round "address", "amount", "delegate", "round" based on balance or delegates fields.
	 *
	 * @param {address} address
	 * @param {Object} diff - Must contains only mem_account editable fields
	 * @param {function} cb - Callback function
	 * @param {Object} tx - Database transaction/task object
	 * @returns {setImmediate} error
	 */
	merge(address, diff, cb, tx) {
		// Verify public key
		this.verifyPublicKey(diff.publicKey);

		// Normalize address
		address = String(address).toUpperCase();

		const self = this;

		// If merge was called without any diff object
		if (Object.keys(diff).length === 0) {
			return self.get(
				{
					address,
				},
				cb,
				tx
			);
		}

		// Loop through each of updated attribute
		const job = dbTx => {
			const promises = [];

			Object.keys(diff).forEach(updatedField => {
				// Return if updated field is not editable
				if (!self.editable.includes(updatedField)) {
					return;
				}

				// Get field data type
				const fieldType = self.conv[updatedField];
				const updatedValue = diff[updatedField];
				const value = new Bignum(updatedValue);

				// Make execution selection based on field type
				switch (fieldType) {
					// blockId
					case String:
						promises.push(
							self.scope.storage.entities.Account.update(
								{ address },
								_.pick(diff, [updatedField]),
								{},
								dbTx
							)
						);
						break;

					// fees, rewards, votes, producedBlocks, missedBlocks
					// eslint-disable-next-line no-case-declarations
					case Number:
						if (value.isNaN() || !value.isFinite()) {
							throw `Encountered insane number: ${value.toString()}`;
						}

						// If updated value is positive number
						if (value.isGreaterThan(0)) {
							promises.push(
								self.scope.storage.entities.Account.increaseFieldBy(
									{ address },
									updatedField,
									value.toString(),
									dbTx
								)
							);

							// If updated value is negative number
						} else if (value.isLessThan(0)) {
							promises.push(
								self.scope.storage.entities.Account.decreaseFieldBy(
									{ address },
									updatedField,
									value.abs().toString(),
									dbTx
								)
							);
						}

						if (updatedField === 'balance') {
							promises.push(
								modules.rounds.createRoundInformationWithAmount(
									address,
									diff.round,
									value.toString(),
									dbTx
								)
							);
						}

						break;
					case Array:
						// If we received update as array of strings
						if (_.isString(updatedValue[0])) {
							updatedValue.forEach(updatedValueItem => {
								// Fetch first character
								let mode = updatedValueItem[0];
								let dependentId = '';

								if (mode === '-' || mode === '+') {
									dependentId = updatedValueItem.slice(1);
								} else {
									dependentId = updatedValueItem;
									mode = '+';
								}

								if (mode === '-') {
									promises.push(
										self.scope.storage.entities.Account.deleteDependentRecord(
											updatedField,
											address,
											dependentId,
											dbTx
										)
									);
								} else {
									promises.push(
										self.scope.storage.entities.Account.createDependentRecord(
											updatedField,
											address,
											dependentId,
											dbTx
										)
									);
								}
							});
							// If we received update as array of objects
						} else if (_.isObject(updatedValue[0])) {
							// TODO: Need to look at usage of object based diff param
						}
						break;
					// no default
				}
			});

			// Run all db operations in a batch
			return dbTx.batch(promises);
		};
		return (tx
			? job(tx)
			: this.scope.storage.entities.Account.begin('logic:account:merge', job)
		)
			.then(() =>
				self.get(
					{
						address,
					},
					cb,
					tx
				)
			)
			.catch(err => {
				library.logger.error(err.stack);
				return setImmediate(cb, _.isString(err) ? err : 'Account#merge error');
			});
	}

	/**
	 * Removes an account from mem_account table based on address.
	 *
	 * @param {address} address
	 * @param {function} cb - Callback function
	 * @returns {setImmediate} error, address
	 */
	remove(address, cb) {
		this.scope.storage.entities.Account.delete({ address })
			.then(() => setImmediate(cb, null, address))
			.catch(err => {
				library.logger.error(err.stack);
				return setImmediate(cb, 'Account#remove error');
			});
	}
}

/**
 * @typedef {Object} account
 * @property {string} username - Lowercase, between 1 and 20 chars
 * @property {boolean} isDelegate
 * @property {boolean} secondSignature
 * @property {address} address - Uppercase, between 1 and 22 chars
 * @property {publicKey} publicKey
 * @property {publicKey} secondPublicKey
 * @property {number} balance - Between 0 and totalAmount from constants
 * @property {number} vote
 * @property {number} rank
 * @property {String[]} delegates - From mem_account2delegates table, filtered by address
 * @property {String[]} multisignatures - From mem_account2multisignatures table, filtered by address
 * @property {number} multimin - Between 0 and 17
 * @property {number} multilifetime - Between 1 and 72
 * @property {boolean} nameexist
 * @property {number} producedBlocks
 * @property {number} missedBlocks
 * @property {number} fees
 * @property {number} rewards
 */
// TODO: TO maintain backward compatibility, have to user prototype otherwise these must be converted to static attributes
Account.prototype.table = 'mem_accounts';

Account.prototype.model = [
	{
		name: 'username',
		type: 'String',
		conv: String,
		immutable: true,
	},
	{
		name: 'isDelegate',
		type: 'SmallInt',
		conv: Boolean,
	},
	{
		name: 'secondSignature',
		type: 'SmallInt',
		conv: Boolean,
	},
	{
		name: 'address',
		type: 'String',
		conv: String,
		immutable: true,
	},
	{
		name: 'publicKey',
		type: 'Binary',
		conv: String,
		immutable: true,
	},
	{
		name: 'secondPublicKey',
		type: 'Binary',
		conv: String,
		immutable: true,
	},
	{
		name: 'balance',
		type: 'BigInt',
		conv: Number,
	},
	{
		name: 'rank',
		type: 'BigInt',
		conv: String,
	},
	{
		name: 'votedDelegatesPublicKeys',
		type: 'Text',
		conv: Array,
	},
	{
		name: 'membersPublicKeys',
		type: 'Text',
		conv: Array,
	},
	{
		name: 'multiMin',
		type: 'SmallInt',
		conv: Number,
	},
	{
		name: 'multiLifetime',
		type: 'SmallInt',
		conv: Number,
	},
	{
		name: 'nameExist',
		type: 'SmallInt',
		conv: Boolean,
	},
	{
		name: 'fees',
		type: 'BigInt',
		conv: Number,
	},
	{
		name: 'rank',
		type: 'BigInt',
		conv: Number,
	},
	{
		name: 'rewards',
		type: 'BigInt',
		conv: Number,
	},
	{
		name: 'vote',
		type: 'BigInt',
		conv: Number,
	},
	{
		name: 'producedBlocks',
		type: 'integer',
		conv: Number,
	},
	{
		name: 'missedBlocks',
		type: 'integer',
		conv: Number,
	},
	{
		name: 'approval',
		type: 'integer',
	},
	{
		name: 'productivity',
		type: 'integer',
	},
];

Account.prototype.schema = {
	id: 'Account',
	type: 'object',
	properties: {
		username: {
			type: 'string',
			format: 'username',
		},
		isDelegate: {
			type: 'integer',
			maximum: 32767,
		},
		secondSignature: {
			type: 'integer',
			maximum: 32767,
		},
		address: {
			type: 'string',
			format: 'address',
			minLength: 1,
			maxLength: 22,
		},
		publicKey: {
			type: 'string',
			format: 'publicKey',
		},
		secondPublicKey: {
			anyOf: [
				{
					type: 'string',
					format: 'publicKey',
				},
				{
					type: 'null',
				},
			],
		},
		balance: {
			type: 'object',
			format: 'amount',
		},
		delegates: {
			anyOf: [
				{
					type: 'array',
					uniqueItems: true,
				},
				{
					type: 'null',
				},
			],
		},
		membersPublicKeys: {
			anyOf: [
				{
					type: 'array',
					minItems: MULTISIG_CONSTRAINTS.KEYSGROUP.MIN_ITEMS,
					maxItems: MULTISIG_CONSTRAINTS.KEYSGROUP.MAX_ITEMS,
				},
				{
					type: 'null',
				},
			],
		},
		multiMin: {
			type: 'integer',
			minimum: 0,
			maximum: MULTISIG_CONSTRAINTS.MIN.MAXIMUM,
		},
		multiLifetime: {
			type: 'integer',
			minimum: 0,
			maximum: MULTISIG_CONSTRAINTS.LIFETIME.MAXIMUM,
		},
		nameExist: {
			type: 'integer',
			maximum: 32767,
		},
		fees: {
			type: 'object',
			format: 'amount',
		},
		rank: {
			type: 'string',
		},
		rewards: {
			type: 'object',
			format: 'amount',
		},
		vote: {
			type: 'integer',
		},
		producedBlocks: {
			type: 'integer',
		},
		missedBlocks: {
			type: 'integer',
		},
		approval: {
			type: 'integer',
		},
		productivity: {
			type: 'integer',
		},
	},
	required: ['address', 'balance'],
};

// Export
module.exports = Account;
