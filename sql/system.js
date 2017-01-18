'use strict';

var SystemSql = {
	getBroadhash: 'SELECT "id" FROM blocks ORDER BY "height" DESC LIMIT ${limit}'
};

module.exports = SystemSql;
