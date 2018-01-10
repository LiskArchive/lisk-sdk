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

module.exports = TransactionsRepo;
