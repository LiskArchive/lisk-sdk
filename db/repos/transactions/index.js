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
const Promise = require('bluebird');
const transactionTypes = require('../../../helpers/transaction_types');
const sql = require('../../sql').transactions;
const ed = require('../../../helpers/ed.js');

const cs = {}; // Static namespace for reusable ColumnSet objects

/**
 * Transactions database interaction class.
 *
 * @class
 * @memberof db.repos
 * @requires lodash
 * @requires bluebird
 * @requires helpers/transaction_types
 * @see Parent: {@link db.repos}
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @returns {Object} An instance of a TransactionsRepository
 */
class TransactionsRepository {
	constructor(db, pgp) {
		this.db = db;
		this.pgp = pgp;
		this.inTransaction = !!(db.ctx && db.ctx.inTransaction);

		this.sortFields = [
			'id',
			'blockId',
			'amount',
			'fee',
			'type',
			'timestamp',
			'senderPublicKey',
			'senderId',
			'recipientId',
			'confirmations',
			'height',
		];

		this.dbTable = 'trs';

		this.dbFields = [
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

		if (!cs.insert) {
			cs.insert = new pgp.helpers.ColumnSet(this.dbFields, {
				table: this.dbTable,
			});
			cs.insert = cs.insert.merge([{ name: 'recipientId', def: null }]);
		}

		this.cs = cs;

		this.transactionsRepoMap = {};
		this.transactionsRepoMap[transactionTypes.SEND] = 'transactions.transfer';
		this.transactionsRepoMap[transactionTypes.DAPP] = 'transactions.dapp';
		this.transactionsRepoMap[transactionTypes.DELEGATE] =
			'transactions.delegate';
		this.transactionsRepoMap[transactionTypes.IN_TRANSFER] =
			'transactions.inTransfer';
		this.transactionsRepoMap[transactionTypes.OUT_TRANSFER] =
			'transactions.outTransfer';
		this.transactionsRepoMap[transactionTypes.MULTI] =
			'transactions.multisignature';
		this.transactionsRepoMap[transactionTypes.SIGNATURE] =
			'transactions.signature';
		this.transactionsRepoMap[transactionTypes.VOTE] = 'transactions.vote';
	}

	/**
	 * Counts total transactions.
	 *
	 * @returns {Promise<number>}
	 * @todo Add description for the return value
	 */
	count() {
		return this.db.one(sql.count, [], a => +a.count);
	}

	/**
	 * Gets transfer transactions from a list of id-s.
	 *
	 * @param {Array.<string>} ids
	 * @returns {Promise}
	 * @todo Add description for the params and the return value
	 */
	getTransferByIds(ids) {
		return this.db.any(sql.getTransferByIds, { ids });
	}

	/**
	 * Gets vote transactions from a list of id-s.
	 *
	 * @param {Array.<string>} ids
	 * @returns {Promise}
	 * @todo Add description for the params and the return value
	 */
	getVotesByIds(ids) {
		return this.db.any(sql.getVotesByIds, { ids });
	}

	/**
	 * Gets delegate transactions from a list of id-s.
	 *
	 * @param {Array.<string>} ids
	 * @returns {Promise}
	 * @todo Add description for the params and the return value
	 */
	getDelegateByIds(ids) {
		return this.db.any(sql.getDelegateByIds, { ids });
	}

	/**
	 * Gets signature transactions from a list of id-s.
	 *
	 * @param {Array.<string>} ids
	 * @returns {Promise}
	 * @todo Add description for the params and the return value
	 */
	getSignatureByIds(ids) {
		return this.db.any(sql.getSignatureByIds, { ids });
	}

	/**
	 * Gets multisignature transactions from a list of id-s.
	 *
	 * @param {Array.<string>} ids
	 * @returns {Promise}
	 * @todo Add description for the params and the return value
	 */
	getMultiByIds(ids) {
		return this.db.any(sql.getMultiByIds, { ids });
	}

	/**
	 * Gets dapp transactions from a list of id-s.
	 *
	 * @param {Array.<string>} ids
	 * @returns {Promise}
	 * @todo Add description for the params and the return value
	 */
	getDappByIds(ids) {
		return this.db.any(sql.getDappByIds, { ids });
	}

	/**
	 * Gets in-transfer transactions from a list of id-s.
	 *
	 * @param {Array.<string>} ids
	 * @returns {Promise}
	 * @todo Add description for the params and the return value
	 */
	getInTransferByIds(ids) {
		return this.db.any(sql.getInTransferByIds, { ids });
	}

	/**
	 * Gets out-transfer transactions from a list of id-s.
	 *
	 * @param {Array.<string>} ids
	 * @returns {Promise}
	 * @todo Add description for the params and the return value
	 */
	getOutTransferByIds(ids) {
		return this.db.any(sql.getOutTransferByIds, { ids });
	}

	/**
	 * Saves transactions to the database.
	 *
	 * @param {Array.<Object>} transactions - Each object should justify *logic/transaction.prototype.schema*
	 * @returns {Promise}
	 * Batch-result of the operation.
	 */
	save(transactions) {
		const batch = [];
		let saveTransactions = _.cloneDeep(transactions);

		try {
			if (!_.isArray(saveTransactions)) {
				saveTransactions = [saveTransactions];
			}

			saveTransactions.forEach(t => {
				t.senderPublicKey = ed.hexToBuffer(t.senderPublicKey);
				t.signature = ed.hexToBuffer(t.signature);
				t.signSignature = t.signSignature
					? ed.hexToBuffer(t.signSignature)
					: null;
				t.requesterPublicKey = t.requesterPublicKey
					? ed.hexToBuffer(t.requesterPublicKey)
					: null;
				t.signatures = t.signatures ? t.signatures.join() : null;
				t.amount = t.amount.toString();
				t.fee = t.fee.toString();
			});
		} catch (e) {
			return Promise.reject(e);
		}

		const job = t => {
			batch.push(t.none(this.pgp.helpers.insert(saveTransactions, cs.insert)));

			const groupedTransactions = _.groupBy(saveTransactions, 'type');

			Object.keys(groupedTransactions).forEach(type => {
				batch.push(
					t[this.transactionsRepoMap[type]].save(groupedTransactions[type])
				);
			});

			return t.batch(batch);
		};

		return this.inTransaction
			? job(this.db)
			: this.db.tx('transactions:save', job);
	}
}

module.exports = TransactionsRepository;
