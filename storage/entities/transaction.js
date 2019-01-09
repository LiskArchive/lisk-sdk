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
const { stringToByte } = require('../utils/inputSerializers');
const { NonSupportedOperationError } = require('../errors');
const filterTypes = require('../utils/filter_types');
const BaseEntity = require('./base_entity');

/**
 * Basic Transaction
 * @typedef {Object} BasicTransaction
 * @property {string} id
 * @property {string} blockId
 * @property {Integer} [height]
 * @property {Integer} [confirmations]
 * @property {Integer} type
 * @property {Number} timestamp
 * @property {string} senderPublicKey
 * @property {string} [recipientPublicKey]
 * @property {string} requesterPublicKey
 * @property {string} senderId
 * @property {string} recipientId
 * @property {string} amount
 * @property {string} fee
 * @property {string} signature
 * @property {string} signSignature
 * @property {Array.<string>} signatures
 */

/**
 * Transfer Transaction
 * @typedef {BasicTransaction} TransferTransaction
 * @property {Object} asset
 * @property {string} asset.data
 */

/**
 * Second Passphrase Transaction
 * @typedef {BasicTransaction} SecondPassphraseTransaction
 * @property {Object} asset
 * @property {Object} asset.signature
 * @property {string} asset.signature.publicKey
 */

/**
 * Delegate Transaction
 * @typedef {BasicTransaction} DelegateTransaction
 * @property {Object} asset
 * @property {Object} asset.delegate
 * @property {string} asset.delegate.username
 */

/**
 * Vote Transaction
 * @typedef {BasicTransaction} VoteTransaction
 * @property {Object} asset
 * @property {Array.<string>} asset.votes
 */

/**
 * Multisig Registration Transaction
 * @typedef {BasicTransaction} MultisigRegistrationTransaction
 * @property {Object} asset
 * @property {Object} asset.multisignature
 * @property {Integer} asset.multisignature.min
 * @property {Integer} asset.multisignature.lifetime
 * @property {Array.<string>} asset.multisignature.keysgroup
 */

/**
 * Dapp Registration Transaction
 * @typedef {BasicTransaction} DappRegistrationTransaction
 * @property {Object} asset
 * @property {Object} asset.dapp
 * @property {Integer} asset.dapp.type
 * @property {string} asset.dapp.name
 * @property {string} asset.dapp.description
 * @property {string} asset.dapp.tags
 * @property {string} asset.dapp.link
 * @property {string} asset.dapp.icon
 * @property {Integer} asset.dapp.category
 */

/**
 * InTransfer Transaction
 * @typedef {BasicTransaction} InTransferTransaction
 * @property {Object} asset
 * @property {Object} asset.inTransfer
 * @property {string} asset.inTransfer.dappId
 */

/**
 * OutTransfer Transaction
 * @typedef {BasicTransaction} OutTransferTransaction
 * @property {Object} asset
 * @property {Object} asset.outTransfer
 * @property {string} asset.outTransfer.dappId
 * @property {string} asset.outTransfer.transactionId
 */

/**
 * Transaction
 * @typedef {(TransferTransaction|SecondPassphraseTransaction|DelegateTransaction|VoteTransaction|MultisigRegistrationTransaction|DappRegistrationTransaction|InTransferTransaction|OutTransferTransaction)} Transaction
 */

/**
 * Transaction Filters
 * @typedef {Object} filters.Transaction
 */

const assetAttributesMap = {
	0: ['asset.data'],
	1: ['asset.signature.publicKey'],
	2: ['asset.delegate.username'],
	3: ['asset.votes'],
	4: [
		'asset.multisignature.min',
		'asset.multisignature.lifetime',
		'asset.multisignature.keysgroup',
	],
	5: [
		'asset.dapp.type',
		'asset.dapp.name',
		'asset.dapp.description',
		'asset.dapp.tags',
		'asset.dapp.link',
		'asset.dapp.icon',
		'asset.dapp.category',
	],
	6: ['asset.inTransfer.dappId'],
	7: ['asset.outTransfer.dappId', ' asset.outTransfer.transactionId'],
};

// eslint-disable-next-line no-unused-vars
const stringToByteOnlyInsert = (value, mode, alias, fieldName) => {
	if (mode === 'select') {
		return `$\{${alias}}`;
	}

	return value ? `DECODE($\{${alias}}, 'hex')` : 'NULL';
};

class Transaction extends BaseEntity {
	/**
	 * Constructor
	 * @param {BaseAdapter} adapter - Adapter to retrive the data from
	 * @param {filters.Transaction} defaultFilters - Set of default filters applied on every query
	 */
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.addField('id', 'string', {
			filter: filterTypes.TEXT,
			fieldName: 't_id',
		});
		this.addField('blockId', 'string', {
			filter: filterTypes.TEXT,
			fieldName: 'b_id',
		});
		this.addField('blockHeight', 'string', {
			filter: filterTypes.NUMBER,
			fieldName: 'b_height',
		});
		this.addField('type', 'number', {
			filter: filterTypes.NUMBER,
			fieldName: 't_type',
		});
		this.addField('timestamp', 'number', {
			filter: filterTypes.NUMBER,
			fieldName: 't_timestamp',
		});
		this.addField(
			'senderPublicKey',
			'string',
			{
				filter: filterTypes.TEXT,
				format: 'publicKey',
				fieldName: 't_senderPublicKey',
			},
			stringToByteOnlyInsert
		);
		this.addField(
			'recipientPublicKey',
			'string',
			{
				filter: filterTypes.TEXT,
				format: 'publicKey',
				fieldName: 't_recipientPublicKey',
			},
			stringToByteOnlyInsert
		);
		this.addField(
			'requesterPublicKey',
			'string',
			{
				filter: filterTypes.TEXT,
				format: 'publicKey',
				fieldName: 't_requesterPublicKey',
			},
			stringToByteOnlyInsert
		);
		this.addField('senderId', 'string', {
			filter: filterTypes.TEXT,
			fieldName: 't_senderId',
		});
		this.addField('recipientId', 'string', {
			filter: filterTypes.TEXT,
			fieldName: 't_recipientId',
		});
		this.addField('amount', 'string', {
			filter: filterTypes.NUMBER,
			fieldName: 't_amount',
		});
		this.addField('fee', 'string', {
			filter: filterTypes.NUMBER,
			fieldName: 't_fee',
		});
		this.addField(
			'signature',
			'string',
			{ fieldName: 't_signature' },
			stringToByte
		);
		this.addField(
			'signSignature',
			'string',
			{ fieldName: 't_SignSignature' },
			stringToByte
		);
		this.addField('signatures', 'string', { fieldName: 't_signatures' });

		this.addFilter('data_like', filterTypes.CUSTOM, {
			condition: '"tf_data" LIKE ${data_like}',
		});

		this.SQLs = {
			select: this.adapter.loadSQLFile('transactions/get.sql'),
			selectExtended: this.adapter.loadSQLFile('transactions/get_extended.sql'),
			isPersisted: this.adapter.loadSQLFile('transactions/is_persisted.sql'),
			count: this.adapter.loadSQLFile('transactions/count.sql'),
			create: this.adapter.loadSQLFile('transactions/create.sql'),
			createType0: this.adapter.loadSQLFile('transactions/create_type_0.sql'),
			createType1: this.adapter.loadSQLFile('transactions/create_type_1.sql'),
			createType2: this.adapter.loadSQLFile('transactions/create_type_2.sql'),
			createType3: this.adapter.loadSQLFile('transactions/create_type_3.sql'),
			createType4: this.adapter.loadSQLFile('transactions/create_type_4.sql'),
			createType5: this.adapter.loadSQLFile('transactions/create_type_5.sql'),
			createType6: this.adapter.loadSQLFile('transactions/create_type_6.sql'),
			createType7: this.adapter.loadSQLFile('transactions/create_type_7.sql'),
		};
	}

	/**
	 * Get one transaction
	 *
	 * @param {filters.Transaction|filters.Transaction[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {string} [options.sort] - Sort key for transaction e.g. amount:asc, amount:desc
	 * @param {Boolean} [options.extended=false] - Get extended fields for entity
	 * @param {Object} tx - Database transaction object
	 * @return {Promise.<Transaction, Error>}
	 */
	getOne(filters, options = {}, tx) {
		const expectedResultCount = 1;
		return this._getResults(filters, options, tx, expectedResultCount);
	}

	/**
	 * Get list of transactions
	 *
	 * @param {filters.Transaction|filters.Transaction[]} [filters = {}]
	 * @param {Object} [options = {}] - Options to filter data
	 * @param {Number} [options.limit=10] - Number of records to fetch
	 * @param {Number} [options.offset=0] - Offset to start the records
	 * @param {string} [options.sort] - Sort key for transaction e.g. amount:asc, amount:desc
	 * @param {Boolean} [options.extended=false] - Get extended fields for entity
	 * @param {Object} tx - Database transaction object
	 * @return {Promise.<Transaction[], Error>}
	 */
	get(filters, options = {}, tx) {
		return this._getResults(filters, options, tx);
	}

	/**
	 * Count transactions
	 *
	 * @param {filters.Transaction|filters.Transaction[]} [filters = {}]
	 * @param {Object} [_options = {}] - Options to filter data
	 * @param {Object} [tx] - Database transaction object
	 * @return {Promise.<Transaction[], Error>}
	 */
	// eslint-disable-next-line no-unused-vars
	count(filters, _options = {}, tx) {
		filters = Transaction._sanitizeFilters(filters);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters, {
			filterPrefix: 'AND',
		});

		const params = {
			parsedFilters,
		};
		const expectedResultCount = 1;

		return this.adapter
			.executeFile(this.SQLs.count, params, { expectedResultCount }, tx)
			.then(data => +data.count);
	}

	/**
	 * Create transactions object
	 *
	 * @param {Transaction|Array.<Transaction>} data
	 * @param {Object} [_options]
	 * @param {Object} [tx] - Transaction object
	 * @return {*}
	 */
	create(data, _options, tx) {
		let transactions = _.cloneDeep(data);

		if (!Array.isArray(transactions)) {
			transactions = [transactions];
		}

		transactions.forEach(t => {
			t.signatures = t.signatures ? t.signatures.join() : null;
			t.amount = t.amount.toString();
			t.fee = t.fee.toString();
		});

		const trsFields = [
			'id',
			'blockId',
			'type',
			'timestamp',
			'senderPublicKey',
			'requesterPublicKey',
			'senderId',
			'recipientId',
			'amount',
			'fee',
			'signature',
			'signSignature',
			'signatures',
		];

		const createSet = this.getValuesSet(transactions, trsFields);

		const task = dbTx => {
			const batch = [];

			batch.push(
				this.adapter.executeFile(
					this.SQLs.create,
					{ values: createSet, attributes: trsFields },
					{ expectedResultCount: 0 },
					dbTx
				)
			);

			const groupedTransactions = _.groupBy(transactions, 'type');
			Object.keys(groupedTransactions).forEach(type => {
				batch.push(
					this._createSubTransactions(
						parseInt(type),
						groupedTransactions[type],
						dbTx
					)
				);
			});

			return dbTx.batch(batch).then(() => true);
		};

		if (tx) {
			return task(tx);
		}

		return this.begin('transactions:create', task);
	}

	_createSubTransactions(type, transactions, tx) {
		let fields;
		let values;

		switch (type) {
			case 0:
				fields = ['transactionId', 'data'];
				values = transactions
					.filter(transaction => transaction.asset && transaction.asset.data)
					.map(transaction => ({
						transactionId: transaction.id,
						data: Buffer.from(transaction.asset.data, 'utf8'),
					}));
				break;
			case 1:
				fields = ['transactionId', 'publicKey'];
				values = transactions.map(transaction => ({
					transactionId: transaction.id,
					publicKey: Buffer.from(transaction.asset.signature.publicKey, 'hex'),
				}));
				break;
			case 2:
				fields = ['transactionId', 'username'];
				values = transactions.map(transaction => ({
					transactionId: transaction.id,
					username: transaction.asset.delegate.username,
				}));
				break;
			case 3:
				fields = ['transactionId', 'votes'];
				values = transactions.map(transaction => ({
					votes: Array.isArray(transaction.asset.votes)
						? transaction.asset.votes.join()
						: null,
					transactionId: transaction.id,
				}));
				break;
			case 4:
				fields = ['transactionId', 'min', 'lifetime', 'keysgroup'];
				values = transactions.map(transaction => ({
					min: transaction.asset.multisignature.min,
					lifetime: transaction.asset.multisignature.lifetime,
					keysgroup: transaction.asset.multisignature.keysgroup.join(),
					transactionId: transaction.id,
				}));
				break;
			case 5:
				fields = [
					'transactionId',
					'type',
					'name',
					'description',
					'tags',
					'link',
					'icon',
					'category',
				];
				values = transactions.map(transaction => ({
					type: transaction.asset.dapp.type,
					name: transaction.asset.dapp.name,
					description: transaction.asset.dapp.description || null,
					tags: transaction.asset.dapp.tags || null,
					link: transaction.asset.dapp.link || null,
					icon: transaction.asset.dapp.icon || null,
					category: transaction.asset.dapp.category,
					transactionId: transaction.id,
				}));
				break;
			case 6:
				fields = ['transactionId', 'dappId'];
				values = transactions.map(transaction => ({
					dappId: transaction.asset.inTransfer.dappId,
					transactionId: transaction.id,
				}));
				break;
			case 7:
				fields = ['transactionId', 'dappId', 'outTransactionId'];
				values = transactions.map(transaction => ({
					dappId: transaction.asset.outTransfer.dappId,
					outTransactionId: transaction.asset.outTransfer.transactionId,
					transactionId: transaction.id,
				}));
				break;
			default:
				throw new Error(`Unsupported transaction type: ${type}`);
		}

		return this.adapter.executeFile(
			this.SQLs[`createType${type}`],
			{ values: this.getValuesSet(values, fields, { useRawObject: true }) },
			{ expectedResultCount: 0 },
			tx
		);
	}

	/**
	 * Update the records based on given condition
	 *
	 * @param {filters.Account} [filters]
	 * @param {Object} data
	 * @param {Object} [options]
	 * @param {Object} [tx] - Transaction object
	 * @return {*}
	 */
	// eslint-disable-next-line class-methods-use-this,no-unused-vars
	update(filters, data, options, tx) {
		throw new NonSupportedOperationError(
			'Updating transaction is not supported.'
		);
	}

	/**
	 * Update one record based on the condition given
	 *
	 * @param {filters.Account} filters
	 * @param {Object} data
	 * @param {Object} [options]
	 * @param {Object} [tx] - Transaction object
	 * @return {*}
	 */
	// eslint-disable-next-line class-methods-use-this,no-unused-vars
	updateOne(filters, data, options, tx) {
		throw new NonSupportedOperationError(
			'Updating transaction is not supported.'
		);
	}

	/**
	 * Check if the record exists with following conditions
	 *
	 * @param {filters.Account} filters
	 * @param {Object} [_options]
	 * @param {Object} [tx]
	 * @returns {Promise.<boolean, Error>}
	 */
	isPersisted(filters, _options, tx) {
		const atLeastOneRequired = true;
		this.validateFilters(filters, atLeastOneRequired);
		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters);

		return this.adapter
			.executeFile(
				this.SQLs.isPersisted,
				{ parsedFilters },
				{ expectedResultCount: 1 },
				tx
			)
			.then(result => result.exists);
	}

	_getResults(filters, options, tx, expectedResultCount = undefined) {
		filters = Transaction._sanitizeFilters(filters);

		const mergedFilters = this.mergeFilters(filters);
		const parsedFilters = this.parseFilters(mergedFilters, {
			filterPrefix: 'AND',
		});
		const parsedOptions = _.defaults(
			{},
			_.pick(options, ['limit', 'offset', 'sort', 'extended']),
			_.pick(this.defaultOptions, ['limit', 'offset', 'sort', 'extended'])
		);

		// To have deterministic pagination add extra sorting
		if (parsedOptions.sort) {
			parsedOptions.sort = _.flatten([
				parsedOptions.sort,
				't_rowId:asc',
			]).filter(Boolean);
		} else {
			parsedOptions.sort = ['t_rowId:asc'];
		}

		const parsedSort = this.parseSort(parsedOptions.sort);

		const params = {
			limit: parsedOptions.limit,
			offset: parsedOptions.offset,
			parsedSort,
			parsedFilters,
		};

		return this.adapter
			.executeFile(
				parsedOptions.extended ? this.SQLs.selectExtended : this.SQLs.select,
				params,
				{ expectedResultCount },
				tx
			)
			.then(data => {
				if (expectedResultCount === 1) {
					return Transaction._formatTransactionResult(
						data,
						parsedOptions.extended
					);
				}

				return data.map(row =>
					Transaction._formatTransactionResult(row, parsedOptions.extended)
				);
			});
	}

	static _formatTransactionResult(row, extended) {
		const transaction = extended ? { asset: {} } : {};

		Object.keys(row).forEach(k => {
			if (!k.match(/^asset./)) {
				transaction[k] = row[k];
			}
		});

		const transactionAssetAttributes =
			assetAttributesMap[transaction.type] || [];

		transactionAssetAttributes.forEach(assetKey => {
			if (row[assetKey]) {
				_.set(transaction, assetKey, row[assetKey]);
			}
		});

		if (transaction.type === 0 && transaction.asset.data) {
			try {
				transaction.asset.data = transaction.asset.data.toString('utf8');
			} catch (e) {
				// TODO: Add logging support
				// library.logger.error(
				// 	'Logic-Transfer-dbRead: Failed to convert data field into utf8'
				// );
				delete transaction.asset;
			}
		}

		if (transaction.signatures) {
			transaction.signatures = transaction.signatures.filter(Boolean);
		}

		return transaction;
	}

	static _sanitizeFilters(filters = {}) {
		const sanitizeFilterObject = filterObject => {
			if (filterObject.data_like) {
				filterObject.data_like = Buffer.from(filterObject.data_like, 'utf8');
			}
			return filterObject;
		};

		// PostgresSQL does not support null byte buffer so have to parse in javascript
		if (Array.isArray(filters)) {
			filters = filters.map(sanitizeFilterObject);
		} else {
			filters = sanitizeFilterObject(filters);
		}

		return filters;
	}
}

module.exports = Transaction;
