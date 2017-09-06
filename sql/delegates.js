'use strict';

var pgp = require('pg-promise');

var DelegatesSql = {
  sortFields: [
    'username',
    'address',
    'publicKey',
    'vote',
    'missedblocks',
    'producedblocks',
    'approval',
    'productivity',
    'voters_cnt',
    'register_timestamp'
  ],

  count: 'SELECT COUNT(*)::int FROM delegates',

  delegateList: 'SELECT getDelegatesList() AS list;',

  search: function (params) {
    var sql = [
      'WITH',
      'supply AS (SELECT calcSupply((SELECT height FROM blocks ORDER BY height DESC LIMIT 1))::numeric),',
      'delegates AS (SELECT ',
        'd.rank,',
        'd.name AS username,',
        'd.address,',
        'ENCODE(d."pk", \'hex\') AS "publicKey",',
        'd.voters_balance AS vote,',
        'd.blocks_forged_cnt AS producedblocks,',
        'd.blocks_missed_cnt AS missedblocks,',
        'ROUND(d.voters_balance / (SELECT * FROM supply) * 100, 2)::float AS approval,',
        '(CASE WHEN d.blocks_forged_cnt + d.blocks_missed_cnt = 0 THEN 0.00 ELSE',
          'ROUND(100 - (d.blocks_missed_cnt::numeric / (d.blocks_forged_cnt + d.blocks_missed_cnt) * 100), 2)',
        'END)::float AS productivity,',
        'd.voters_cnt,',
        't.timestamp AS register_timestamp',
      'FROM delegates d',
      'LEFT JOIN trs t ON d.tx_id = t.id',
      'ORDER BY ' + [params.sortField, params.sortMethod].join(' ') + ')',
      'SELECT * FROM delegates WHERE username LIKE ${q} LIMIT ${limit}'
    ].join(' ');

    params.q = '%' + String(params.q).toLowerCase() + '%';
    return pgp.as.format(sql, params);
  },

  insertFork: 'INSERT INTO forks_stat ("delegatePublicKey", "blockTimestamp", "blockId", "blockHeight", "previousBlock", "cause") VALUES (${delegatePublicKey}, ${blockTimestamp}, ${blockId}, ${blockHeight}, ${previousBlock}, ${cause});',

  getVoters: 'SELECT ARRAY_AGG("accountId") AS "accountIds" FROM mem_accounts2delegates WHERE "dependentId" = ${publicKey}'
};

module.exports = DelegatesSql;
