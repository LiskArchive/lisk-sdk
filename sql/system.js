'use strict';

var SystemSql = {
	getBroadhash: 'SELECT "block_id" FROM blocks ORDER BY "height" DESC LIMIT ${limit}'
};

module.exports = SystemSql;
