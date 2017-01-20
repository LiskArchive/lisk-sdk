'use strict';

var TransportSql = {
	getCommonBlock: 'SELECT MAX("height") AS "height", "id", "previousBlock", "timestamp" FROM blocks WHERE "id" IN ($1:csv) GROUP BY "id" ORDER BY "height" DESC'
};

module.exports = TransportSql;
