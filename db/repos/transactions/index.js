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
	 * Count transactions by Id.
	 *
	 * @param {string} id
	 * @returns {Promise}
	 * @todo Add description for the params and the return value
	 */
	countById(id) {
		return this.db.one(sql.countById, { id }, a => +a.count);
	}

	/**
	 * Count transactions with extended params.
	 * The params to this method comes in this format
	 *
	 * { where:
	 *   [ '"t_recipientId" IN (${recipientId:csv})',
	 *     'AND "t_senderId" IN (${senderId:csv})' ],
	 *  owner: '',
	 *  recipientId: '1253213165192941997L',
	 *  senderId: '16313739661670634666L',
	 *  limit: 10,
	 *  offset: 0 }
	 *
	 *   @todo Simplify the usage and pass direct params to the method
	 *
	 * @param {Object} params
	 * @param {Array} params.where
	 * @param {string} params.owner
	 * @returns {Promise<number>}
	 * Transactions counter.
	 */
	countList(params) {
		// Add dummy condition in case of blank to avoid conditional where clause
		let conditions =
			params && params.where && params.where.length ? params.where : [];

		// Handle the case if single condition is provided
		if (typeof conditions === 'string') {
			conditions = [conditions];
		}

		// FIXME: Backward compatibility, should be removed after transitional period
		if (params && params.owner) {
			conditions.push(`AND ${params.owner}`);
		}

		if (conditions.length) {
			conditions = `WHERE ${this.pgp.as.format(conditions.join(' '), params)}`;
		} else {
			conditions = '';
		}

		return this.db.one(sql.countList, { conditions }, a => +a.count);
	}

	/**
	 * Search transactions.
	 *
	 * @param {Object} params
	 * @param {Array} params.where
	 * @param {string} params.owner
	 * @param {string} params.sortField
	 * @param {string} params.sortMethod
	 * @param {int} params.limit
	 * @param {int} params.offset
	 * @returns {Promise<[]>}
	 * List of transactions.
	 */
	list(params) {
		return this.db.any(Queries.list, params);
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

// TODO: All these queries need to be thrown away, and use proper implementation inside corresponding methods.
const Queries = {
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
				? `ORDER BY ${[params.sortField, params.sortMethod].join(
						' '
					)}, "t_rowId" ASC`
				: '',
			'LIMIT ${limit} OFFSET ${offset}',
		]
			.filter(Boolean)
			.join(' '),
};

module.exports = TransactionsRepository;
