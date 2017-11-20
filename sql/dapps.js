'use strict';

var DappsSql = {
	sortFields: ['name'],

	countByTransactionId: 'SELECT COUNT(*)::int AS "count" FROM dapps WHERE "transactionId" = ${id}',

	countByOutTransactionId: 'SELECT COUNT(*)::int AS "count" FROM outtransfer WHERE "outTransactionId" = ${transactionId}',

	getExisting: 'SELECT "name", "link" FROM dapps WHERE ("name" = ${name} OR "link" = ${link}) AND "transactionId" != ${transactionId}',

	// Need to fix "or" or "and" in query
	list: function (params) {
		return [
			'SELECT "name" COLLATE "C", "description", "tags", "link", "type", "category", "icon", "transactionId" FROM dapps',
      (params.where.length ? 'WHERE ' + params.where.join(' OR ') : ''),
      (params.sortField ? 'ORDER BY ' + [params.sortField, params.sortMethod].join(' ') : ''),
			'LIMIT ${limit} OFFSET ${offset}'
		].filter(Boolean).join(' ');
	},

	getGenesis: 'SELECT b."height" AS "height", b."id" AS "id", t."senderId" AS "authorId" FROM trs t INNER JOIN blocks b ON t."blockId" = b."id" WHERE t."id" = ${id}'
};

module.exports = DappsSql;
