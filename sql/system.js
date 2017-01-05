'use strict';

var SystemSql = {
  getBroadhash: 'SELECT "id" FROM blocks ORDER BY "height" DESC NULLS LAST LIMIT ${limit}'
};

module.exports = SystemSql;
