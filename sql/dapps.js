'use strict';

var DappsSql = {
	sortFields: ['type', 'name', 'category', 'link'],

	countByTransactionId: 'SELECT COUNT(*)::int AS "count" FROM dapps WHERE "transactionId" = ${id}',

	countByOutTransactionId: 'SELECT COUNT(*)::int AS "count" FROM outtransfer WHERE "outTransactionId" = ${transactionId}',

	getExisting: 'SELECT "name", "link" FROM dapps WHERE ("name" = ${name} OR "link" = ${link}) AND "transactionId" != ${transactionId}',

	search: function (params) {
		return [
			'SELECT "transactionId", "name", "description", "tags", "link", "type", "category", "icon"',
			'FROM dapps WHERE to_tsvector("name" || \' \' || "description" || \' \' || "tags") @@ to_tsquery(${q})',
      (params.category ? 'AND "category" = ${category}' : ''),
			'LIMIT ${limit}'
		].filter(Boolean).join(' ');
	},

	get: 'SELECT "name", "description", "tags", "link", "type", "category", "icon", "transactionId" FROM dapps WHERE "transactionId" = ${id}',

	getByIds: 'SELECT "name", "description", "tags", "link", "type", "category", "icon", "transactionId" FROM dapps WHERE "transactionId" IN ($1:csv)',

  // Need to fix "or" or "and" in query
	list: function (params) {
		return [
			'SELECT "name", "description", "tags", "link", "type", "category", "icon", "transactionId" FROM dapps',
      (params.where.length ? 'WHERE ' + params.where.join(' OR ') : ''),
      (params.sortField ? 'ORDER BY ' + [params.sortField, params.sortMethod].join(' ') : ''),
			'LIMIT ${limit} OFFSET ${offset}'
		].filter(Boolean).join(' ');
	},

	getGenesis: 'SELECT b."height" AS "height", b."id" AS "id", t."senderId" AS "authorId" FROM trs t INNER JOIN blocks b ON t."blockId" = b."id" WHERE t."id" = ${id}',

	getCommonBlock: 'SELECT b."height" AS "height", t."id" AS "id", t."senderId" AS "senderId", t."amount" AS "amount" FROM trs t INNER JOIN blocks b ON t."blockId" = b."id" AND t."id" = ${id} AND t."type" = ${type} INNER JOIN intransfer dt ON dt."transactionId" = t."id" AND dt."dappid" = ${dappid}',

	getWithdrawalLastTransaction: 'SELECT ot."outTransactionId" FROM trs t INNER JOIN blocks b ON t."blockId" = b."id" AND t."type" = ${type} INNER JOIN outtransfer ot ON ot."transactionId" = t."id" AND ot."dappId" = ${dappid} ORDER BY b."height" DESC LIMIT 1',

	getBalanceTransactions: function (params) {
		return [
			'SELECT t."id" AS "id", ENCODE(t."senderPublicKey", \'hex\') AS "senderPublicKey", t."amount" AS "amount" FROM trs t',
			'INNER JOIN blocks b ON t."blockId" = b."id" AND t."type" = ${type}',
			'INNER JOIN intransfer dt ON dt."transactionId" = t."id" AND dt."dappId" = ${dappid}',
      (params.lastId ? 'WHERE b."height" > (SELECT "height" FROM blocks ib INNER JOIN trs it ON ib."id" = it."blockId" AND it."id" = ${lastId})' : ''),
			'ORDER BY b."height"'
		].filter(Boolean).join(' ');
	}
};

module.exports = DappsSql;
