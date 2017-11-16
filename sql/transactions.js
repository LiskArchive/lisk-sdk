'use strict';

var TransactionsSql = {
	sortFields: [
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
	],

	count: 'SELECT COUNT("id")::int AS "count" FROM trs',

	countById: 'SELECT COUNT("id")::int AS "count" FROM trs WHERE "id" = ${id}',

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

	getTransferByIds: 'SELECT "transactionId" as "transaction_id", CONVERT_FROM(data, \'utf8\') AS "tf_data" FROM transfer WHERE "transactionId" IN (${id:csv})',

	getVotesByIds: 'SELECT "transactionId" as "transaction_id", votes AS "v_votes" FROM votes WHERE "transactionId" IN (${id:csv})',

	getDelegateByIds: 'SELECT "tx_id" as "transaction_id", name AS "d_username" FROM delegates WHERE "tx_id" IN (${id:csv})',

	getSignatureByIds: 'SELECT "transactionId" as "transaction_id", ENCODE ("publicKey", \'hex\') AS "s_publicKey" FROM signatures WHERE "transactionId" IN (${id:csv})',

	getMultiByIds: 'SELECT "transactionId" as "transaction_id", min AS "m_min", lifetime AS "m_lifetime", keysgroup AS "m_keysgroup" FROM multisignatures WHERE "transactionId" IN (${id:csv})',

	getDappByIds: 'SELECT "transactionId" as "transaction_id", name AS "dapp_name", description AS "dapp_description", tags AS "dapp_tags", link AS "dapp_link", type AS "dapp_type", category AS "dapp_category", icon AS "dapp_icon" FROM dapps WHERE "transactionId" IN (${id:csv})',

	getInTransferByIds: 'SELECT "transactionId" as "transaction_id", "dappId" AS "in_dappId" FROM intransfer WHERE "transactionId" IN (${id:csv})',

	getOutTransferByIds: 'SELECT "transactionId" as "transaction_id", "dappId" AS "ot_dappId", "outTransactionId" AS "ot_outTransactionId" FROM outtransfer WHERE "transactionId" IN (${id:csv})'
};

module.exports = TransactionsSql;
