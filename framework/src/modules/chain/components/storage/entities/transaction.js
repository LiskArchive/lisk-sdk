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

const path = require('path');
const {
	Transaction: TransactionEntity,
} = require('../../../../../components/storage/entities/');

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

const sqlFiles = {
	create: 'transactions/create.sql',
};

const trsCreateFields = [
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
	'asset',
	'transferData',
];

class ChainTransaction extends TransactionEntity {
	/**
	 * Constructor
	 * @param {BaseAdapter} adapter - Adapter to retrive the data from
	 * @param {filters.Transaction} defaultFilters - Set of default filters applied on every query
	 */
	constructor(adapter, defaultFilters = {}) {
		super(adapter, defaultFilters);

		this.sqlDirectory = path.join(path.dirname(__filename), '../sql');

		this.SQLs = this.loadSQLFiles('transaction', sqlFiles, this.sqlDirectory);
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
		const transactions = ChainTransaction._sanitizeCreateData(data);

		const createSet = this.getValuesSet(transactions, trsCreateFields);

		return this.adapter.executeFile(
			this.SQLs.create,
			{ values: createSet, attributes: trsCreateFields },
			{ expectedResultCount: 0 },
			tx
		);
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

		if (values.length < 1) {
			return Promise.resolve(null);
		}

		return this.adapter.executeFile(
			this.SQLs[`createType${type}`],
			{
				values: this.getValuesSet(values, fields, {
					useRawObject: true,
				}),
			},
			{
				expectedResultCount: 0,
			},
			tx
		);
	}
}

module.exports = ChainTransaction;
