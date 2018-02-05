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
const transactionTypes = require('../../helpers/transaction_types');
const sql = require('../sql').transactions;

const cs = {}; // Reusable ColumnSet objects

/**
 * Transactions database interaction module
 * @memberof module:transactions
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {TransactionsRepository}
 */
class TransactionsRepository {
	constructor(db, pgp) {
		this.db = db;
		this.pgp = pgp;

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
	 * @return {Promise<number>}
	 */
	count() {
		return this.db.one(sql.count, [], a => +a.count);
	}

	/**
	 * Counts transactions by Id.
	 * @param {string} id
	 * @return {Promise<number>}
	 */
	countById(id) {
		return this.db.one(sql.countById, { id }, a => +a.count);
	}

	/**
	 * Counts transactions with extended params.
	 * @param {Object} params
	 * @param {Array} params.where
	 * @param {string} params.owner
	 * @return {Promise}
	 */
	countList(params) {
		// TODO: Get rid of the in-code query, and a result-specific query method
		return this.db.query(Queries.countList(params), params);
	}

	/**
	 * Searches for transactions.
	 * @param {Object} params
	 * @param {Array} params.where
	 * @param {string} params.owner
	 * @param {string} params.sortField
	 * @param {string} params.sortMethod
	 * @param {int} params.limit
	 * @param {int} params.offset
	 * @return {Promise}
	 */
	list(params) {
		// TODO: Get rid of the in-code query, and a result-specific query method
		return this.db.query(Queries.list(params), params);
	}

	/**
	 * Gets transfer transactions from a list of id-s.
	 * @param {Array.<string>} ids
	 * @return {Promise}
	 */
	getTransferByIds(ids) {
		return this.db.any(sql.getTransferByIds, { ids });
	}

	/**
	 * Gets vote transactions from a list of id-s.
	 * @param {Array.<string>} ids
	 * @return {Promise<[]>}
	 */
	getVotesByIds(ids) {
		return this.db.any(sql.getVotesByIds, { ids });
	}

	/**
	 * Gets delegate transactions from a list of id-s.
	 * @param {Array.<string>} ids
	 * @return {Promise<[]>}
	 */
	getDelegateByIds(ids) {
		return this.db.any(sql.getDelegateByIds, { ids });
	}

	/**
	 * Gets signature transactions from a list of id-s.
	 * @param {Array.<string>} ids
	 * @return {Promise<[]>}
	 */
	getSignatureByIds(ids) {
		return this.db.any(sql.getSignatureByIds, { ids });
	}

	/**
	 * Gets multisignature transactions from a list of id-s.
	 * @param {Array.<string>} ids
	 * @return {Promise<[]>}
	 */
	getMultiByIds(ids) {
		return this.db.any(sql.getMultiByIds, { ids });
	}

	/**
	 * Gets dapp transactions from a list of id-s.
	 * @param {Array.<string>} ids
	 * @return {Promise<[]>}
	 */
	getDappByIds(ids) {
		return this.db.any(sql.getDappByIds, { ids });
	}

	/**
	 * Gets in-transfer transactions from a list of id-s.
	 * @param {Array.<string>} ids
	 * @return {Promise<[]>}
	 */
	getInTransferByIds(ids) {
		return this.db.any(sql.getInTransferByIds, { ids });
	}

	/**
	 * Gets out-transfer transactions from a list of id-s.
	 * @param {Array.<string>} ids
	 * @return {Promise<[]>}
	 */
	getOutTransferByIds(ids) {
		return this.db.any(sql.getOutTransferByIds, { ids });
	}

	/**
	 * Saves transactions to the database.
	 * @param {Array.<Object>} transactions - Each object should justify *logic/transaction.prototype.schema*
	 * @return {Promise}
	 */
	save(transactions) {
		let saveTransactions = _.cloneDeep(transactions);

		if (!_.isArray(saveTransactions)) {
			saveTransactions = [saveTransactions];
		}

		saveTransactions.forEach(t => {
			try {
				t.senderPublicKey = Buffer.from(t.senderPublicKey, 'hex');
				t.signature = Buffer.from(t.signature, 'hex');
				t.signSignature = t.signSignature
					? Buffer.from(t.signSignature, 'hex')
					: null;
				t.requesterPublicKey = t.requesterPublicKey
					? Buffer.from(t.requesterPublicKey, 'hex')
					: null;
				t.signatures = t.signatures ? t.signatures.join() : null;
			} catch (e) {
				throw e;
			}
		});

		const batch = [];
		batch.push(
			this.db.none(this.pgp.helpers.insert(saveTransactions, cs.insert))
		);

		const groupedTransactions = _.groupBy(saveTransactions, 'type');

		Object.keys(groupedTransactions).forEach(type => {
			batch.push(
				this.db[this.transactionsRepoMap[type]].save(groupedTransactions[type])
			);
		});

		// In order to avoid nested transactions, and thus SAVEPOINT-s,
		// we check when there is a transaction on this level or above:
		if (this.db.ctx && this.db.ctx.inTransaction) {
			return this.db.batch(batch);
		} else {
			return this.db.tx(tx => tx.batch(batch));
		}
	}
}

// TODO: All these queries need to be thrown away, and use proper implementation inside corresponding methods.

const Queries = {
	countList: params =>
		[
			'SELECT count(*) FROM trs_list',
			params.where.length || params.owner ? 'WHERE' : '',
			params.where.length ? `(${params.where.join(' ')})` : '',
			// FIXME: Backward compatibility, should be removed after transitional period
			params.where.length && params.owner
				? ` AND ${params.owner}`
				: params.owner,
		]
			.filter(Boolean)
			.join(' '),

	list: params =>
		[
			'SELECT t_id, b_height, "t_blockId", t_type, t_timestamp, "t_senderId", "t_recipientId",',
			't_amount, t_fee, t_signature, "t_SignSignature", t_signatures, confirmations,',
			'encode("t_senderPublicKey", \'hex\') AS "t_senderPublicKey", encode("m_recipientPublicKey", \'hex\') AS "m_recipientPublicKey"',
			'FROM trs_list',
			params.where.length || params.owner ? 'WHERE' : '',
			params.where.length ? `(${params.where.join(' ')})` : '',
			// FIXME: Backward compatibility, should be removed after transitional period
			params.where.length && params.owner
				? ` AND ${params.owner}`
				: params.owner,
			params.sortField
				? `ORDER BY ${[params.sortField, params.sortMethod].join(' ')}`
				: '',
			'LIMIT ${limit} OFFSET ${offset}',
		]
			.filter(Boolean)
			.join(' '),
};

module.exports = TransactionsRepository;
