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

var PQ = require('pg-promise').ParameterizedQuery;
var _ = require('lodash');
var transactionTypes = require('../../helpers/transaction_types');
var columnSet;

/**
 * Transactions database interaction module
 * @memberof module:transactions
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {TransactionsRepo}
 */
function TransactionsRepo(db, pgp) {
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

	if (!columnSet) {
		columnSet = {};
		var table = new pgp.helpers.TableName({
			table: this.dbTable,
			schema: 'public',
		});
		columnSet.insert = new pgp.helpers.ColumnSet(this.dbFields, {
			table: table,
		});
		columnSet.insert = columnSet.insert.merge([
			{ name: 'recipientId', def: null },
		]);
	}

	this.cs = columnSet;

	this.transactionsRepoMap = {};
	this.transactionsRepoMap[transactionTypes.SEND] = 'transactions.transfer';
	this.transactionsRepoMap[transactionTypes.DAPP] = 'transactions.dapp';
	this.transactionsRepoMap[transactionTypes.DELEGATE] = 'transactions.delegate';
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

var Queries = {
	count: 'SELECT COUNT(*)::int AS "count" FROM trs',

	countById: new PQ('SELECT COUNT(*)::int AS "count" FROM trs WHERE "id" = $1'),

	countList: function(params) {
		return [
			'SELECT COUNT(*) FROM trs_list',
			params.where.length || params.owner ? 'WHERE' : '',
			params.where.length ? `(${params.where.join(' ')})` : '',
			// FIXME: Backward compatibility, should be removed after transitional period
			params.where.length && params.owner
				? ` AND ${params.owner}`
				: params.owner,
		]
			.filter(Boolean)
			.join(' ');
	},

	list: function(params) {
		return [
			'SELECT "t_id", "b_height", "t_blockId", "t_type", "t_timestamp", "t_senderId", "t_recipientId",',
			'"t_amount", "t_fee", "t_signature", "t_SignSignature", "t_signatures", "confirmations",',
			'ENCODE ("t_senderPublicKey", \'hex\') AS "t_senderPublicKey", ENCODE ("m_recipientPublicKey", \'hex\') AS "m_recipientPublicKey"',
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
			.join(' ');
	},

	getTransferByIds:
		'SELECT "transactionId" AS "transaction_id", CONVERT_FROM(data, \'utf8\') AS "tf_data" FROM transfer WHERE "transactionId" IN ($1:csv)',

	getVotesByIds:
		'SELECT "transactionId" AS "transaction_id", votes AS "v_votes" FROM votes WHERE "transactionId" IN ($1:csv)',

	getDelegateByIds:
		'SELECT "transactionId" AS "transaction_id", username AS "d_username" FROM delegates WHERE "transactionId" IN ($1:csv)',

	getSignatureByIds:
		'SELECT "transactionId" AS "transaction_id", ENCODE ("publicKey", \'hex\') AS "s_publicKey" FROM signatures WHERE "transactionId" IN ($1:csv)',

	getMultiByIds:
		'SELECT "transactionId" AS "transaction_id", min AS "m_min", lifetime AS "m_lifetime", keysgroup AS "m_keysgroup" FROM multisignatures WHERE "transactionId" IN ($1:csv)',

	getDappByIds:
		'SELECT "transactionId" AS "transaction_id", name AS "dapp_name", description AS "dapp_description", tags AS "dapp_tags", link AS "dapp_link", type AS "dapp_type", category AS "dapp_category", icon AS "dapp_icon" FROM dapps WHERE "transactionId" IN ($1:csv)',

	getInTransferByIds:
		'SELECT "transactionId" AS "transaction_id", "dappId" AS "in_dappId" FROM intransfer WHERE "transactionId" IN ($1:csv)',

	getOutTransferByIds:
		'SELECT "transactionId" AS "transaction_id", "dappId" AS "ot_dappId", "outTransactionId" AS "ot_outTransactionId" FROM outtransfer WHERE "transactionId" IN ($1:csv)',
};

/**
 * Count total transactions
 * @return {Promise}
 */
TransactionsRepo.prototype.count = function() {
	return this.db.one(Queries.count).then(result => result.count);
};

/**
 * Count transactions by Id
 * @param {string} id
 * @return {Promise}
 */
TransactionsRepo.prototype.countById = function(id) {
	return this.db.one(Queries.countById, [id]).then(result => result.count);
};

/**
 * Count transactions with extended params
 * @param {Object} params
 * @param {Array} params.where
 * @param {string} params.owner
 * @return {Promise}
 */
TransactionsRepo.prototype.countList = function(params) {
	return this.db.query(Queries.countList(params), params);
};

/**
 * Search transactions
 * @param {Object} params
 * @param {Array} params.where
 * @param {string} params.owner
 * @param {string} params.sortField
 * @param {string} params.sortMethod
 * @param {int} params.limit
 * @param {int} params.offset
 * @return {Promise}
 */
TransactionsRepo.prototype.list = function(params) {
	return this.db.query(Queries.list(params), params);
};

/**
 * Get transfer transactions by Ids
 * @param {Array.<string>} ids
 * @return {Promise}
 */
TransactionsRepo.prototype.getTransferByIds = function(ids) {
	return this.db.query(Queries.getTransferByIds, [ids]);
};

/**
 * Get vote transactions by Ids
 * @param {Array.<string>} ids
 * @return {Promise}
 */
TransactionsRepo.prototype.getVotesByIds = function(ids) {
	return this.db.query(Queries.getVotesByIds, [ids]);
};

/**
 * Get delegate transactions by Ids
 * @param {Array.<string>} ids
 * @return {Promise}
 */
TransactionsRepo.prototype.getDelegateByIds = function(ids) {
	return this.db.query(Queries.getDelegateByIds, [ids]);
};

/**
 * Get signature transactions by Ids
 * @param {Array.<string>} ids
 * @return {Promise}
 */
TransactionsRepo.prototype.getSignatureByIds = function(ids) {
	return this.db.query(Queries.getSignatureByIds, [ids]);
};

/**
 * Get multisignature transactions by Ids
 * @param {Array.<string>} ids
 * @return {Promise}
 */
TransactionsRepo.prototype.getMultiByIds = function(ids) {
	return this.db.query(Queries.getMultiByIds, [ids]);
};

/**
 * Get dapp transactions by Ids
 * @param {Array.<string>} ids
 * @return {Promise}
 */
TransactionsRepo.prototype.getDappByIds = function(ids) {
	return this.db.query(Queries.getDappByIds, [ids]);
};

/**
 * Get intransfer transactions by Ids
 * @param {Array.<string>} ids
 * @return {Promise}
 */
TransactionsRepo.prototype.getInTransferByIds = function(ids) {
	return this.db.query(Queries.getInTransferByIds, [ids]);
};

/**
 * Get outtransfer transactions by Ids
 * @param {Array.<string>} ids
 * @return {Promise}
 */
TransactionsRepo.prototype.getOutTransferByIds = function(ids) {
	return this.db.query(Queries.getOutTransferByIds, [ids]);
};

/**
 * Save transactions to database
 * @param {Array.<Object>} transactions - Each object should justify *logic/transaction.prototype.schema*
 * @return {Promise}
 */
TransactionsRepo.prototype.save = function(transactions) {
	var self = this;
	var saveTransactions = _.cloneDeep(transactions);

	if (!_.isArray(saveTransactions)) {
		saveTransactions = [saveTransactions];
	}

	saveTransactions.forEach(transaction => {
		try {
			transaction.senderPublicKey = Buffer.from(
				transaction.senderPublicKey,
				'hex'
			);
			transaction.signature = Buffer.from(transaction.signature, 'hex');
			transaction.signSignature = transaction.signSignature
				? Buffer.from(transaction.signSignature, 'hex')
				: null;
			transaction.requesterPublicKey = transaction.requesterPublicKey
				? Buffer.from(transaction.requesterPublicKey, 'hex')
				: null;
			transaction.signatures = transaction.signatures
				? transaction.signatures.join(',')
				: null;
		} catch (e) {
			throw e;
		}
	});

	var batch = [];
	batch.push(
		self.db.none(self.pgp.helpers.insert(saveTransactions, self.cs.insert))
	);

	var groupedTransactions = _.groupBy(saveTransactions, 'type');

	Object.keys(groupedTransactions).forEach(type => {
		batch.push(
			self.db[self.transactionsRepoMap[type]].save(groupedTransactions[type])
		);
	});

	// In order to avoid nested transactions, and thus SAVEPOINT-s,
	// we check when there is a transaction on this level or above:
	if (this.db.ctx && this.db.ctx.inTransaction) {
		return this.db.batch(batch);
	} else {
		return this.db.tx(t => t.batch(batch));
	}
};

module.exports = TransactionsRepo;
