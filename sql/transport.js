'use strict';

var TransportSql = {
	getCommonBlock: 'SELECT MAX("height") AS "height", "block_id" AS "id", "previous_block_id" AS "previousBlock", "timestamp" FROM blocks WHERE "block_id" IN ($1:csv) GROUP BY "block_id" ORDER BY "height" DESC'
};

module.exports = TransportSql;
