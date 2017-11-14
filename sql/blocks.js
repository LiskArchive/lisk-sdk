'use strict';

var BlocksSql = {
  sortFields: [
    'block_id',
    'timestamp',
    'height',
    'previous_block_id',
    'total_amount',
    'total_fee',
    'reward',
    'total_transactions',
    'generator_public_key'
  ],

  getGenesisBlockId: 'SELECT "block_id" AS id FROM blocks WHERE "block_id" = ${id}',

  deleteBlock: 'DELETE FROM blocks WHERE "block_id" = ${id};',

  aggregateBlocksReward: function (params) {
    return [
      'WITH',
      'delegate AS (SELECT',
        '1 FROM delegates d  where d."public_key" = DECODE(${generatorPublicKey}, \'hex\') LIMIT 1),',
      'rewards AS (SELECT COUNT(1) AS count, SUM(reward) AS rewards, SUM(fees) AS fees FROM rounds_rewards WHERE public_key = DECODE(${generatorPublicKey}, \'hex\')',
          (params.start !== undefined ? ' AND timestamp >= ${start}' : ''),
          (params.end !== undefined ? ' AND timestamp <= ${end}' : ''),
      ')',
      'SELECT (SELECT * FROM delegate) AS delegate, * FROM rewards'
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
      'SELECT COUNT("block_id")::int FROM blocks WHERE "block_id" = ${id}',
      (params.previous_block_id ? 'AND "previous_block_id" = ${previous_block_id}' : ''),
      'AND "height" = ${height}'
    ].filter(Boolean).join(' ');
  },

  countByRowId: 'SELECT COUNT("row_id")::int FROM blocks',

  getHeightByLastId: 'SELECT "height" FROM blocks WHERE "block_id" = ${lastId}',

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

  getBlockId: 'SELECT "block_id" FROM blocks WHERE "block_id" = ${id}',

  deleteAfterBlock: 'DELETE FROM blocks WHERE "height" >= (SELECT "height" FROM blocks WHERE "block_id" = ${id});'
};

module.exports = BlocksSql;
