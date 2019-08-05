/*
 * Copyright © 2019 Lisk Foundation
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
const BigNum = require('@liskhq/bignum');
const { validator } = require('@liskhq/lisk-validator');

// Private fields
let library;
let modules;

/**
 * Main account logic.
 *
 * @class
 * @memberof logic
 * @see Parent: {@link logic}
 * @requires lodash
 * @requires liskhq/bignum
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
	constructor(storage, logger, rounds) {
		this.scope = {
			storage,
		};

		library = {
			logger,
		};
		modules = {
			rounds,
		};

		this.attachModelandSchema();

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
	}

	/**
	 * Checks type, lenght and format from publicKey.
	 *
	 * @param {publicKey} publicKey
	 * @throws {string} On invalid public key
	 */
	// eslint-disable-next-line class-methods-use-this
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

			const errors = validator.validate({ format: 'hex' }, publicKey);
			if (errors.length) {
				throw new Error('Invalid public key, must be a hex string');
			}
		}
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
			return self.scope.storage.entities.Account.get(
				{ address },
				{ extended: true },
				tx,
			)
				.then(accounts => {
					const account = accounts[0];
					cb(null, account);
				})
				.catch(cb);
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
				let value;

				// Make execution selection based on field type
				switch (fieldType) {
					// blockId
					case String:
						promises.push(
							self.scope.storage.entities.Account.update(
								{ address },
								_.pick(diff, [updatedField]),
								{},
								dbTx,
							),
						);
						break;

					// fees, rewards, votes, producedBlocks, missedBlocks
					// eslint-disable-next-line no-case-declarations
					case Number:
						try {
							value = new BigNum(updatedValue);
						} catch (bigNumbError) {
							throw `Encountered insane number: ${updatedValue.toString()}`;
						}

						// If updated value is positive number
						if (value.greaterThan(0)) {
							promises.push(
								self.scope.storage.entities.Account.increaseFieldBy(
									{ address },
									updatedField,
									value.toString(),
									dbTx,
								),
							);

							// If updated value is negative number
						} else if (value.lessThan(0)) {
							promises.push(
								self.scope.storage.entities.Account.decreaseFieldBy(
									{ address },
									updatedField,
									value.abs().toString(),
									dbTx,
								),
							);
						}

						if (updatedField === 'balance') {
							promises.push(
								modules.rounds.createRoundInformationWithAmount(
									address,
									diff.round,
									value.toString(),
									dbTx,
								),
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
											dbTx,
										),
									);
								} else {
									promises.push(
										self.scope.storage.entities.Account.createDependentRecord(
											updatedField,
											address,
											dependentId,
											dbTx,
										),
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
			.then(async () => {
				const [account] = await this.scope.storage.entities.Account.get(
					{ address },
					{ extended: true },
					tx,
				);
				cb(null, account);
				return null;
			})
			.catch(err => {
				library.logger.error(err.stack);
				return setImmediate(cb, _.isString(err) ? err : 'Account#merge error');
			});
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
	attachModelandSchema() {
		this.table = 'mem_accounts';

		this.model = [
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

		this.schema = {
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
	}
}

// Export
module.exports = Account;
