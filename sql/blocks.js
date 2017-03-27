'use strict';

var BlocksSql = {
  sortFields: [
    'id',
    'timestamp',
    'height',
    'previousBlock',
    'totalAmount',
    'totalFee',
    'reward',
    'numberOfTransactions',
    'generatorPublicKey'
  ],

  getGenesisBlockId: 'SELECT "id" FROM blocks WHERE "id" = ${id}',

  deleteBlock: 'DELETE FROM blocks WHERE "id" = ${id};',

  countList: function (params) {
    if (params.where.length) {
      return 'SELECT COUNT("b_id")::int FROM blocks_list WHERE ' + params.where.join(' AND ');
    } else {
      return 'SELECT COALESCE((SELECT height FROM blocks ORDER BY height DESC LIMIT 1), 0)';
    }
  },

  aggregateBlocksReward: function (params) {
    return [
      'WITH',
      'delegate AS (SELECT',
        '1 FROM mem_accounts m WHERE m."isDelegate" = 1 AND m."publicKey" = DECODE(${generatorPublicKey}, \'hex\') LIMIT 1),',
      'rewards AS (SELECT COUNT(1) AS count, SUM(reward) AS rewards FROM blocks WHERE "generatorPublicKey" = DECODE(${generatorPublicKey}, \'hex\')',
          (params.start !== undefined ? ' AND timestamp >= ${start}' : ''),
          (params.end !== undefined ? ' AND timestamp <= ${end}' : ''),
      '),',
      'fees AS (SELECT SUM(fees) AS fees FROM rounds_fees WHERE "publicKey" = DECODE(${generatorPublicKey}, \'hex\')',
          (params.start !== undefined ? ' AND timestamp >= ${start}' : ''),
          (params.end !== undefined ? ' AND timestamp <= ${end}' : ''),
      ')',
      'SELECT',
        '(SELECT * FROM delegate) AS delegate,',
        '(SELECT count FROM rewards) AS count,',
        '(SELECT fees FROM fees) AS fees,',
        '(SELECT rewards FROM rewards) AS rewards'
    ].filter(Boolean).join(' ');
  },

  list: function (params) {
    return [
      'SELECT * FROM blocks_list',
      (params.where.length ? 'WHERE ' + params.where.join(' AND ') : ''),
      (params.sortField ? 'ORDER BY ' + [params.sortField, params.sortMethod].join(' ') : ''),
      'LIMIT ${limit} OFFSET ${offset}'
    ].filter(Boolean).join(' ');
  },

  getById: 'SELECT * FROM blocks_list WHERE "b_id" = ${id}',

  getIdSequence: function () {
    return [
      'WITH',
      'current_round AS (SELECT CEIL(b.height / ${delegates}::float)::bigint FROM blocks b WHERE b.height <= ${height} ORDER BY b.height DESC LIMIT 1),',
      'rounds AS (SELECT * FROM generate_series((SELECT * FROM current_round), (SELECT * FROM current_round) - ${limit} + 1, -1))',
      'SELECT',
        'b.id, b.height, CEIL(b.height / ${delegates}::float)::bigint AS round',
        'FROM blocks b',
        'WHERE b.height IN (SELECT ((n - 1) * ${delegates}) + 1 FROM rounds AS s(n)) ORDER BY height DESC'
    ].filter(Boolean).join(' ');
  },

  getCommonBlock: function (params) {
    return [
      'SELECT COUNT("id")::int FROM blocks WHERE "id" = ${id}',
      (params.previousBlock ? 'AND "previousBlock" = ${previousBlock}' : ''),
      'AND "height" = ${height}'
    ].filter(Boolean).join(' ');
  },

  countByRowId: 'SELECT COUNT("rowId")::int FROM blocks',

  getHeightByLastId: 'SELECT "height" FROM blocks WHERE "id" = ${lastId}',

  loadBlocksData: function (params) {
    var limitPart;

    if (!params.id && !params.lastId) {
      limitPart = 'WHERE "b_height" < ${limit}';
    }

    return [
      'SELECT * FROM full_blocks_list',
      limitPart,
      (params.id || params.lastId ? 'WHERE' : ''),
      (params.id ? '"b_id" = ${id}' : ''),
      (params.id && params.lastId ? ' AND ' : ''),
      (params.lastId ? '"b_height" > ${height} AND "b_height" < ${limit}' : ''),
      'ORDER BY "b_height", "t_rowId"'
    ].filter(Boolean).join(' ');
  },

  loadBlocksOffset: 'SELECT * FROM full_blocks_list WHERE "b_height" >= ${offset} AND "b_height" < ${limit} ORDER BY "b_height", "t_rowId"',

  loadLastBlock: 'SELECT * FROM full_blocks_list WHERE "b_height" = (SELECT MAX("height") FROM blocks) ORDER BY "b_height", "t_rowId"',

  getBlockId: 'SELECT "id" FROM blocks WHERE "id" = ${id}',

  deleteAfterBlock: 'DELETE FROM blocks WHERE "height" >= (SELECT "height" FROM blocks WHERE "id" = ${id});'
};

module.exports = BlocksSql;
