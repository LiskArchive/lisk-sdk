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

	getById: 'SELECT *, ENCODE ("t_senderPublicKey", \'hex\') AS "t_senderPublicKey", ENCODE ("m_recipientPublicKey", \'hex\') AS "m_recipientPublicKey" FROM trs_list WHERE "t_id" = ${id}',

	getTransferById: 'SELECT CONVERT_FROM(data, \'utf8\') AS "tf_data" FROM transfer WHERE "transactionId" = ${id}',

	getVotesById: 'SELECT votes AS "v_votes" FROM votes WHERE "transactionId" = ${id}',

	getDelegateById: 'SELECT name AS "d_username" FROM delegates WHERE "tx_id" = ${id}',

	getSignatureById: 'SELECT ENCODE ("publicKey", \'hex\') AS "s_publicKey" FROM signatures WHERE "transactionId" = ${id}',

	getMultiById: 'SELECT min AS "m_min", lifetime AS "m_lifetime", keysgroup AS "m_keysgroup" FROM multisignatures WHERE "transactionId" = ${id}',

	getDappById: 'SELECT name AS "dapp_name", description AS "dapp_description", tags AS "dapp_tags", link AS "dapp_link", type AS "dapp_type", category AS "dapp_category", icon AS "dapp_icon" FROM dapps WHERE "transactionId" = ${id}',

	getInTransferById: 'SELECT "dappId" AS "in_dappId" FROM intransfer WHERE "transactionId" = ${id}',

	getOutTransferById: 'SELECT "dappId" AS "ot_dappId", "outTransactionId" AS "ot_outTransactionId" FROM outtransfer WHERE "transactionId" = ${id}'
};

module.exports = TransactionsSql;
