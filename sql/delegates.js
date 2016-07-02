const pgp = require('pg-promise');

const DelegatesSql = {
  sortFields: [
    'username',
    'address',
    'balance',
    'publicKey',
    'rate',
    'vote',
    'producedblocks',
    'missedblocks',
    'fees',
    'rewards'
  ],

  count: 'SELECT COUNT(*)::int FROM mem_accounts2delegates',

  search: function (params) {
    var sql = [
      'SELECT m."username", m."address", m."balance", ENCODE(m."publicKey", \'hex\') AS "publicKey", m."rate"::int, m."vote", m."producedblocks", m."missedblocks", m."fees", m."rewards"',
      'FROM mem_accounts2delegates m2d',
      'INNER JOIN mem_accounts m ON(ENCODE(m."publicKey", \'hex\') = m2d."dependentId")',
      'WHERE m."username" LIKE ${q}',
      'ORDER BY ' + [params.sortField, params.sortMethod].join(' '),
      'LIMIT ${limit}'
    ].join(' ');

    params.q = "%" + String(params.q).toLowerCase() + "%";
    return pgp.as.format(sql, params);
  },

  insertFork: 'INSERT INTO forks_stat ("delegatePublicKey", "blockTimestamp", "blockId", "blockHeight", "previousBlock", "cause") VALUES (${delegatePublicKey}, ${blockTimestamp}, ${blockId}, ${blockHeight}, ${previousBlock}, ${cause});',

  getVoters: 'SELECT ARRAY_AGG("accountId") AS "accountIds" FROM mem_accounts2delegates WHERE "dependentId" = ${publicKey}'
}

module.exports = DelegatesSql;
