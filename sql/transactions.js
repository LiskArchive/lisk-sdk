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

	count: 'SELECT COUNT("transaction_id")::int AS "count" FROM transactions',

	countById: 'SELECT COUNT("transaction_id")::int AS "count" FROM transactions WHERE "transaction_id" = ${id}',

	countList: function (params) {
		return [
			'SELECT COUNT(1) FROM transactions_list',
			(params.where.length || params.owner ? 'WHERE' : ''),
			(params.where.length ? '(' + params.where.join(' ') + ')' : ''),
			// FIXME: Backward compatibility, should be removed after transitional period
			(params.where.length && params.owner ? ' AND ' + params.owner : params.owner)
		].filter(Boolean).join(' ');
	},

	list: function (params) {
		return [
			'SELECT "t_id", "b_height", "t_blockId", "t_type", "t_timestamp", "t_senderId", "t_recipientId",',
			'"t_amount", "t_fee", "t_signature", "t_signSignature", "t_signatures", "confirmations",',
			'ENCODE ("t_senderPublicKey", \'hex\') AS "t_senderPublicKey", ENCODE ("a_recipientPublicKey", \'hex\') AS "a_recipientPublicKey"',
			'FROM transactions_list',
			(params.where.length || params.owner ? 'WHERE' : ''),
			(params.where.length ? '(' + params.where.join(' ') + ')' : ''),
			// FIXME: Backward compatibility, should be removed after transitional period
			(params.where.length && params.owner ? ' AND ' + params.owner : params.owner),
			(params.sortField ? 'ORDER BY ' + [params.sortField, params.sortMethod].join(' ') : ''),
			'LIMIT ${limit} OFFSET ${offset}'
		].filter(Boolean).join(' ');
	},

	getById: 'SELECT *, ENCODE ("t_senderPublicKey", \'hex\') AS "t_senderPublicKey", ENCODE ("a_recipientPublicKey", \'hex\') AS "a_recipientPublicKey" FROM transactions_list WHERE "t_id" = ${id}',

	getTransferByIds: 'SELECT "transaction_id", CONVERT_FROM(data, \'utf8\') AS "tf_data" FROM transfer WHERE "transaction_id" IN (${id:csv})',

	getVotesByIds: 'SELECT "transaction_id", votes AS "v_votes" FROM votes WHERE "transaction_id" IN (${id:csv})',

	getDelegateByIds: 'SELECT "transaction_id", name AS "d_username" FROM delegates WHERE "transaction_id" IN (${id:csv})',

	getSignatureByIds: 'SELECT "transaction_id", ENCODE ("public_key", \'hex\') AS "s_publicKey" FROM second_signature WHERE "transaction_id" IN (${id:csv})',

	getMultiByIds: 'SELECT "transaction_id", minimum AS "m_min", lifetime AS "m_lifetime", keysgroup AS "m_keysgroup" FROM multisignatures_master WHERE "transaction_id" IN (${id:csv})',

	getDappByIds: 'SELECT "transaction_id", name AS "dapp_name", description AS "dapp_description", tags AS "dapp_tags", link AS "dapp_link", type AS "dapp_type", category AS "dapp_category", icon AS "dapp_icon" FROM dapps WHERE "transaction_id" IN (${id:csv})',

	getInTransferByIds: 'SELECT "transaction_id", "dapp_id" AS "in_dapp_id" FROM intransfer WHERE "transaction_id" IN (${id:csv})',

	getOutTransferByIds: 'SELECT "transaction_id", "dapp_id" AS "ot_dapp_id", "outTransactionId" AS "ot_outTransactionId" FROM outtransfer WHERE "transaction_id" IN (${id:csv})'

};

module.exports = TransactionsSql;
