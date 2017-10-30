'use strict';

var DappsSql = {
	sortFields: ['type', 'name', 'category', 'link'],

	countByTransactionId: 'SELECT COUNT(*)::int AS "count" FROM dapps WHERE "transaction_id" = ${id}',

	countByOutTransactionId: 'SELECT COUNT(*)::int AS "count" FROM outtransfer WHERE "outtransaction_id" = ${transactionId}', //TODO: Fix my value, this is dumb

	getExisting: 'SELECT "name", "link" FROM dapps WHERE ("name" = ${name} OR "link" = ${link}) AND "transaction_id" != ${transactionId}',  //TODO: Fix my value, this is dumb

	search: function (params) {
		return [
			'SELECT "transaction_id" AS "transactionId", "name", "description", "tags", "link", "type", "category", "icon"',
			'FROM dapps WHERE to_tsvector("name" || \' \' || "description" || \' \' || "tags") @@ to_tsquery(${q})',
      (params.category ? 'AND "category" = ${category}' : ''),
			'LIMIT ${limit}'
		].filter(Boolean).join(' ');
	},

	get: 'SELECT "name", "description", "tags", "link", "type", "category", "icon", "transaction_id" AS "id" FROM dapps WHERE "transaction_id" = ${id}',

	getByIds: 'SELECT "name", "description", "tags", "link", "type", "category", "icon", "transaction_id" AS "id" FROM dapps WHERE "transaction_id" IN ($1:csv)',

  // Need to fix "or" or "and" in query
	list: function (params) {
		return [
			'SELECT "name", "description", "tags", "link", "type", "category", "icon", "transaction_id" AS "id" FROM dapps',
      (params.where.length ? 'WHERE ' + params.where.join(' OR ') : ''),
      (params.sortField ? 'ORDER BY ' + [params.sortField, params.sortMethod].join(' ') : ''),
			'LIMIT ${limit} OFFSET ${offset}'
		].filter(Boolean).join(' ');
	},

	getGenesis: 'SELECT b."height" AS "height", b."id" AS "id", t."senderId" AS "authorId" FROM trs t INNER JOIN blocks b ON t."blockId" = b."id" WHERE t."id" = ${id}',
};

module.exports = DappsSql;
