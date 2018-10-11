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
const ed = require('../helpers/ed.js');
const sortBy = require('../helpers/sort_by.js');
const Bignum = require('../helpers/bignum.js');
const BlockReward = require('./block_reward.js');

const { ACTIVE_DELEGATES, MULTISIG_CONSTRAINTS } = global.constants;

// Private fields
let self; // eslint-disable-line no-unused-vars
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
 * @requires helpers/sort_by
 * @requires helpers/bignum
 * @requires logic/block_reward
 * @param {Database} db
 * @param {ZSchema} schema
 * @param {Object} logger
 * @param {function} cb - Callback function
 * @property {account_model} model
 * @property {account_schema} schema
 * @returns {setImmediate} error, this
 * @todo Add description for the params
 */
class Account {
	constructor(db, schema, logger, cb) {
		this.scope = {
			db,
			schema,
		};

		__private.blockReward = new BlockReward();

		self = this;
		library = {
			logger,
		};

		this.computedFields = this.model.filter(field => field.computedField);

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
	bind(blocks) {
		modules = {
			blocks,
		};
	}

	/**
	 * Deletes the contents of these tables:
	 * - mem_round
	 * - mem_accounts2delegates
	 * - mem_accounts2u_delegates
	 * - mem_accounts2multisignatures
	 * - mem_accounts2u_multisignatures
	 * - rounds_rewards
	 *
	 * @param {function} cb - Callback function
	 * @returns {setImmediate} error
	 */
	resetMemTables(cb) {
		this.scope.db.accounts
			.resetMemTables()
			.then(() => setImmediate(cb))
			.catch(err => {
				library.logger.error(err.stack);
				return setImmediate(cb, 'Account#resetMemTables error');
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
			throw `Failed to validate account schema: ${this.scope.schema
				.getLastErrors()
				.map(err => {
					const path = err.path.replace('#/', '').trim();
					return [path, ': ', err.message, ' (', account[path], ')'].join('');
				})
				.join(', ')}`;
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
				throw 'Invalid public key, must be a string';
			}
			// Check length
			if (publicKey.length !== 64) {
				throw 'Invalid public key, must be 64 characters long';
			}

			if (!this.scope.schema.validate(publicKey, { format: 'hex' })) {
				throw 'Invalid public key, must be a hex string';
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

		filter.multisig = true;

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

		const computedFieldsMap = {};
		this.computedFields.map(field => {
			computedFieldsMap[field.name] = field.dependentFields;
		});

		// If fields are not provided append computed fields
		if (!fields) {
			fields = this.scope.db.accounts.getDBFields();
			fields = fields.concat(Object.keys(computedFieldsMap));
		}

		let fieldsAddedForComputation = [];
		const performComputationFor = [];

		Object.keys(computedFieldsMap).forEach(computedField => {
			if (fields.includes(computedField)) {
				// Add computed field to list to process later
				performComputationFor.push(computedField);

				// Remove computed field from the db fields list
				fields.splice(fields.indexOf(computedField), 1);

				// Marks fields which are explicitly added due to computation
				fieldsAddedForComputation = fieldsAddedForComputation.concat(
					_.difference(computedFieldsMap[computedField], fields)
				);

				// Add computation dependant fields to db fields list
				fields = fields.concat(computedFieldsMap[computedField]);
			}
		});

		let limit = ACTIVE_DELEGATES;
		let offset = 0;
		let sort = { sortField: '', sortMethod: '' };

		if (filter.offset > 0) {
			offset = filter.offset;
		}
		delete filter.offset;

		if (filter.limit > 0) {
			limit = filter.limit;
		}
		delete filter.limit;

		if (filter.sort) {
			const allowedSortFields = [
				'username',
				'balance',
				'rank',
				'missedBlocks',
				'vote',
				'publicKey',
				'address',
			];
			sort = sortBy.sortBy(filter.sort, {
				sortFields: allowedSortFields,
				quoteField: false,
			});
		}
		delete filter.sort;

		const self = this;

		(tx || this.scope.db).accounts
			.list(filter, fields, {
				limit,
				offset,
				sortField: sort.sortField,
				sortMethod: sort.sortMethod,
			})
			.then(rows => {
				const lastBlock = modules.blocks.lastBlock.get();
				// If the last block height is undefined, it means it's a genesis block with height = 1
				// look for a constant for total supply
				const totalSupply = lastBlock.height
					? __private.blockReward.calcSupply(lastBlock.height)
					: 0;

				if (performComputationFor.includes('approval')) {
					rows.forEach(accountRow => {
						accountRow.approval = self.calculateApproval(
							accountRow.vote,
							totalSupply
						);
					});
				}

				if (performComputationFor.includes('productivity')) {
					rows.forEach(accountRow => {
						accountRow.productivity = self.calculateProductivity(
							accountRow.producedBlocks,
							accountRow.missedBlocks
						);
					});
				}

				if (fieldsAddedForComputation.length > 0) {
					// Remove the fields which were only added for computation
					rows.forEach(accountRow => {
						fieldsAddedForComputation.forEach(field => {
							delete accountRow[field];
						});
					});
				}

				return setImmediate(cb, null, rows);
			})
			.catch(err => {
				library.logger.error(err.stack);
				return setImmediate(cb, 'Account#getAll error');
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
	 * Calculates productivity of a delegate account.
	 *
	 * @param {number} producedBlocks
	 * @param {number} missedBlocks
	 * @returns {number}
	 */
	// eslint-disable-next-line class-methods-use-this
	calculateProductivity(producedBlocks, missedBlocks) {
		const producedBlocksBignum = new Bignum(producedBlocks || 0);
		const missedBlocksBignum = new Bignum(missedBlocks || 0);
		const percent = producedBlocksBignum
			.dividedBy(producedBlocksBignum.plus(missedBlocksBignum))
			.multipliedBy(100)
			.decimalPlaces(2);

		return !percent.isNaN() ? percent.toNumber() : 0;
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

		(tx || this.scope.db).accounts
			.upsert(fields, ['address'])
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
			return self.get({ address }, cb, tx);
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

				// Make execution selection based on field type
				switch (fieldType) {
					// blockId
					case String:
						promises.push(
							dbTx.accounts.update(address, _.pick(diff, [updatedField]))
						);
						break;

					// [u_]balance, [u_]multimin, [u_]multilifetime, fees, rewards, votes, producedBlocks, missedBlocks
					// eslint-disable-next-line no-case-declarations
					case Number:
						const value = new Bignum(updatedValue);
						if (value.isNaN() || !value.isFinite()) {
							throw `Encountered insane number: ${value.toString()}`;
						}

						// If updated value is positive number
						if (value.isGreaterThan(0)) {
							promises.push(
								dbTx.accounts.increment(address, updatedField, value.toString())
							);

							// If updated value is negative number
						} else if (value.isLessThan(0)) {
							promises.push(
								dbTx.accounts.decrement(
									address,
									updatedField,
									value.abs().toString()
								)
							);
						}

						if (updatedField === 'balance') {
							promises.push(
								dbTx.rounds.insertRoundInformationWithAmount(
									address,
									diff.round,
									value.toString()
								)
							);
						}
						break;

					// [u_]delegates, [u_]multisignatures
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
										dbTx.accounts.removeDependencies(
											address,
											dependentId,
											updatedField
										)
									);
								} else {
									promises.push(
										dbTx.accounts.insertDependencies(
											address,
											dependentId,
											updatedField
										)
									);
								}

								if (updatedField === 'delegates') {
									promises.push(
										dbTx.rounds.insertRoundInformationWithDelegate(
											address,
											diff.round,
											dependentId,
											mode
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

		(tx ? job(tx) : self.scope.db.tx('logic:account:merge', job))
			.then(() => self.get({ address }, cb, tx))
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
		this.scope.db.accounts
			.remove(address)
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
 * @property {boolean} u_isDelegate
 * @property {boolean} secondSignature
 * @property {boolean} u_secondSignature
 * @property {string} u_username
 * @property {address} address - Uppercase, between 1 and 22 chars
 * @property {publicKey} publicKey
 * @property {publicKey} secondPublicKey
 * @property {number} balance - Between 0 and totalAmount from constants
 * @property {number} u_balance - Between 0 and totalAmount from constants
 * @property {number} vote
 * @property {number} rank
 * @property {String[]} delegates - From mem_account2delegates table, filtered by address
 * @property {String[]} u_delegates - From mem_account2u_delegates table, filtered by address
 * @property {String[]} multisignatures - From mem_account2multisignatures table, filtered by address
 * @property {String[]} u_multisignatures - From mem_account2u_multisignatures table, filtered by address
 * @property {number} multimin - Between 0 and 17
 * @property {number} u_multimin - Between 0 and 17
 * @property {number} multilifetime - Between 1 and 72
 * @property {number} u_multilifetime - Between 1 and 72
 * @property {boolean} nameexist
 * @property {boolean} u_nameexist
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
		name: 'u_isDelegate',
		type: 'SmallInt',
		conv: Boolean,
	},
	{
		name: 'secondSignature',
		type: 'SmallInt',
		conv: Boolean,
	},
	{
		name: 'u_secondSignature',
		type: 'SmallInt',
		conv: Boolean,
	},
	{
		name: 'u_username',
		type: 'String',
		conv: String,
		immutable: true,
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
		name: 'u_balance',
		type: 'BigInt',
		conv: Number,
	},
	{
		name: 'rank',
		type: 'BigInt',
		conv: String,
	},
	{
		name: 'delegates',
		type: 'Text',
		conv: Array,
	},
	{
		name: 'u_delegates',
		type: 'Text',
		conv: Array,
	},
	{
		name: 'multisignatures',
		type: 'Text',
		conv: Array,
	},
	{
		name: 'u_multisignatures',
		type: 'Text',
		conv: Array,
	},
	{
		name: 'multimin',
		type: 'SmallInt',
		conv: Number,
	},
	{
		name: 'u_multimin',
		type: 'SmallInt',
		conv: Number,
	},
	{
		name: 'multilifetime',
		type: 'SmallInt',
		conv: Number,
	},
	{
		name: 'u_multilifetime',
		type: 'SmallInt',
		conv: Number,
	},
	{
		name: 'nameexist',
		type: 'SmallInt',
		conv: Boolean,
	},
	{
		name: 'u_nameexist',
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
		dependentFields: ['vote'],
		computedField: true,
	},
	{
		name: 'productivity',
		type: 'integer',
		dependentFields: ['producedBlocks', 'missedBlocks', 'rank'],
		computedField: true,
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
		u_isDelegate: {
			type: 'integer',
			maximum: 32767,
		},
		secondSignature: {
			type: 'integer',
			maximum: 32767,
		},
		u_secondSignature: {
			type: 'integer',
			maximum: 32767,
		},
		u_username: {
			anyOf: [
				{
					type: 'string',
					format: 'username',
				},
				{
					type: 'null',
				},
			],
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
		u_balance: {
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
		u_delegates: {
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
		multisignatures: {
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
		u_multisignatures: {
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
		multimin: {
			type: 'integer',
			minimum: 0,
			maximum: MULTISIG_CONSTRAINTS.MIN.MAXIMUM,
		},
		u_multimin: {
			type: 'integer',
			minimum: 0,
			maximum: MULTISIG_CONSTRAINTS.MIN.MAXIMUM,
		},
		multilifetime: {
			type: 'integer',
			minimum: 0,
			maximum: MULTISIG_CONSTRAINTS.LIFETIME.MAXIMUM,
		},
		u_multilifetime: {
			type: 'integer',
			minimum: 0,
			maximum: MULTISIG_CONSTRAINTS.LIFETIME.MAXIMUM,
		},
		nameexist: {
			type: 'integer',
			maximum: 32767,
		},
		u_nameexist: {
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
	required: ['address', 'balance', 'u_balance'],
};

// Export
module.exports = Account;
