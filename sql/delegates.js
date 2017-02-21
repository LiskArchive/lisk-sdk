'use strict';

var pgp = require('pg-promise');

var DelegatesSql = {
  sortFields: [
    'username',
    'address',
    'publicKey',
    'vote',
    'missedblocks',
    'producedblocks'
  ],

  count: 'SELECT COUNT(*)::int FROM delegates',

  search: function (params) {
    var sql = [
      'SELECT m."username", m."address", ENCODE(m."publicKey", \'hex\') AS "publicKey", m."vote", m."producedblocks", m."missedblocks"',
      'FROM mem_accounts m',
      'WHERE m."isDelegate" = 1 AND m."username" LIKE ${q}',
      'ORDER BY ' + [params.sortField, params.sortMethod].join(' ') + ' NULLS LAST',
      'LIMIT ${limit}'
    ].join(' ');

    params.q = '%' + String(params.q).toLowerCase() + '%';
    return pgp.as.format(sql, params);
  },

  insertFork: 'INSERT INTO forks_stat ("delegatePublicKey", "blockTimestamp", "blockId", "blockHeight", "previousBlock", "cause") VALUES (${delegatePublicKey}, ${blockTimestamp}, ${blockId}, ${blockHeight}, ${previousBlock}, ${cause});',

  getVoters: 'SELECT ARRAY_AGG("accountId") AS "accountIds" FROM mem_accounts2delegates WHERE "dependentId" = ${publicKey}'
};

module.exports = DelegatesSql;
