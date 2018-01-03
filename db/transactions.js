'use strict';

var PQ = require('pg-promise').ParameterizedQuery;
var _ = require('lodash');
var transactionTypes = require('../helpers/transactionTypes');
var columnSet;

function TransactionsRepo (db, pgp) {
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
		'height'
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
		'signatures'
	];

	if (!columnSet) {
		columnSet = {};
		var table = new pgp.helpers.TableName({table: this.dbTable, schema: 'public'});
		columnSet.insert = new pgp.helpers.ColumnSet(this.dbFields, table);
	}

	this.cs = columnSet;

	this.transactionsRepoMap = {};
	this.transactionsRepoMap[transactionTypes.SEND] = 'transactions.transfer';
	this.transactionsRepoMap[transactionTypes.DAPP] = 'transactions.dapp';
	this.transactionsRepoMap[transactionTypes.DELEGATE] = 'transactions.delegate';
	this.transactionsRepoMap[transactionTypes.IN_TRANSFER] = 'transactions.inTransfer';
	this.transactionsRepoMap[transactionTypes.OUT_TRANSFER] = 'transactions.outTransfer';
	this.transactionsRepoMap[transactionTypes.MULTI] = 'transactions.multisignature';
	this.transactionsRepoMap[transactionTypes.SIGNATURE] = 'transactions.signature';
	this.transactionsRepoMap[transactionTypes.VOTE] = 'transactions.vote';
}

var Queries = {
	count: 'SELECT COUNT("id")::int AS "count" FROM trs',

	countById: new PQ('SELECT COUNT("id")::int AS "count" FROM trs WHERE "id" = $1'),

	countList: function (params) {
		return [
			'SELECT COUNT(1) FROM trs_list',
			(params.where.length || params.owner ? 'WHERE' : ''),
			(params.where.length ? '(' + params.where.join(' ') + ')' : ''),
			// FIXME: Backward compatibility, should be removed after transitional period
			(params.where.length && params.owner ? ' AND ' + params.owner : params.owner)
		].filter(Boolean).join(' ');
	},

	list: function (params) {
		return [
			'SELECT "t_id", "b_height", "t_blockId", "t_type", "t_timestamp", "t_senderId", "t_recipientId",',
			'"t_amount", "t_fee", "t_signature", "t_SignSignature", "t_signatures", "confirmations",',
			'ENCODE ("t_senderPublicKey", \'hex\') AS "t_senderPublicKey", ENCODE ("m_recipientPublicKey", \'hex\') AS "m_recipientPublicKey"',
			'FROM trs_list',
			(params.where.length || params.owner ? 'WHERE' : ''),
			(params.where.length ? '(' + params.where.join(' ') + ')' : ''),
			// FIXME: Backward compatibility, should be removed after transitional period
			(params.where.length && params.owner ? ' AND ' + params.owner : params.owner),
			(params.sortField ? 'ORDER BY ' + [params.sortField, params.sortMethod].join(' ') : ''),
			'LIMIT ${limit} OFFSET ${offset}'
		].filter(Boolean).join(' ');
	},

	getTransferByIds: 'SELECT "transactionId" AS "transaction_id", CONVERT_FROM(data, \'utf8\') AS "tf_data" FROM transfer WHERE "transactionId" IN ($1:csv)',

	getVotesByIds: 'SELECT "transactionId" AS "transaction_id", votes AS "v_votes" FROM votes WHERE "transactionId" IN ($1:csv)',

	getDelegateByIds: 'SELECT "transactionId" AS "transaction_id", username AS "d_username" FROM delegates WHERE "transactionId" IN ($1:csv)',

	getSignatureByIds: 'SELECT "transactionId" AS "transaction_id", ENCODE ("publicKey", \'hex\') AS "s_publicKey" FROM signatures WHERE "transactionId" IN ($1:csv)',

	getMultiByIds: 'SELECT "transactionId" AS "transaction_id", min AS "m_min", lifetime AS "m_lifetime", keysgroup AS "m_keysgroup" FROM multisignatures WHERE "transactionId" IN ($1:csv)',

	getDappByIds: 'SELECT "transactionId" AS "transaction_id", name AS "dapp_name", description AS "dapp_description", tags AS "dapp_tags", link AS "dapp_link", type AS "dapp_type", category AS "dapp_category", icon AS "dapp_icon" FROM dapps WHERE "transactionId" IN ($1:csv)',

	getInTransferByIds: 'SELECT "transactionId" AS "transaction_id", "dappId" AS "in_dappId" FROM intransfer WHERE "transactionId" IN ($1:csv)',

	getOutTransferByIds: 'SELECT "transactionId" AS "transaction_id", "dappId" AS "ot_dappId", "outTransactionId" AS "ot_outTransactionId" FROM outtransfer WHERE "transactionId" IN ($1:csv)'
};

TransactionsRepo.prototype.count = function () {
	return this.db.one(Queries.count).then(function (result) {
		return result.count;
	});
};

TransactionsRepo.prototype.countById = function (id) {
	return this.db.one(Queries.countById, [id]).then(function (result) {
		return result.count;
	});
};

TransactionsRepo.prototype.countList = function (params) {
	return this.db.query(Queries.countList(params), params);
};

TransactionsRepo.prototype.list = function (params) {
	return this.db.query(Queries.list(params), params);
};

TransactionsRepo.prototype.getTransferByIds = function (ids) {
	return this.db.query(Queries.getTransferByIds, [ids]);
};

TransactionsRepo.prototype.getVotesByIds = function (ids) {
	return this.db.query(Queries.getVotesByIds, [ids]);
};

TransactionsRepo.prototype.getDelegateByIds = function (ids) {
	return this.db.query(Queries.getDelegateByIds, [ids]);
};

TransactionsRepo.prototype.getSignatureByIds = function (ids) {
	return this.db.query(Queries.getSignatureByIds, [ids]);
};

TransactionsRepo.prototype.getMultiByIds = function (ids) {
	return this.db.query(Queries.getMultiByIds, [ids]);
};

TransactionsRepo.prototype.getDappByIds = function (ids) {
	return this.db.query(Queries.getDappByIds, [ids]);
};

TransactionsRepo.prototype.getInTransferByIds = function (ids) {
	return this.db.query(Queries.getInTransferByIds, [ids]);
};

TransactionsRepo.prototype.getOutTransferByIds = function (ids) {
	return this.db.query(Queries.getOutTransferByIds, [ids]);
};

TransactionsRepo.prototype.save = function (transactions) {
	var self = this;

	if(!_.isArray(transactions)) {
		transactions = [transactions];
	}

	transactions.forEach(function (transaction) {
		try {
			transaction.senderPublicKey = Buffer.from(transaction.senderPublicKey, 'hex');
			transaction.signature = Buffer.from(transaction.signature, 'hex');
			transaction.signSignature = transaction.signSignature ? Buffer.from(transaction.signSignature, 'hex') : null;
			transaction.requesterPublicKey = transaction.requesterPublicKey ? Buffer.from(transaction.requesterPublicKey, 'hex') : null;
			transaction.signatures = transaction.signatures ? transaction.signatures.join(',') : null;
		} catch (e) {
			throw e;
		}
	});

	var batch = [];
	batch.push(self.db.none(self.pgp.helpers.insert(transactions, self.cs.insert)));

	transactions.forEach(function (transaction) {
		batch.push(self.db[self.transactionsRepoMap[transaction.type]].save(transaction));
	});

	return this.db.tx(function (t) {
		return t.batch(batch);
	});
};


module.exports = TransactionsRepo;
