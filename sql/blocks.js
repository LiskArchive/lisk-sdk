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
    return [
      'SELECT COUNT("b_id")::int FROM blocks_list',
      (params.where.length ? 'WHERE ' + params.where.join(' AND ') : '')
    ].filter(Boolean).join(' ');
  },

  aggregateBlocksReward: function (params) {
    return [
      'WITH',
      'delegate as (SELECT',
        '1 FROM mem_accounts m WHERE m."isDelegate" = 1 AND m."publicKey" = DECODE (${generatorPublicKey}, \'hex\') LIMIT 1),',
      'borders as (SELECT',
        '(SELECT (CAST(b.height / ${delegates} AS INTEGER) + (CASE WHEN b.height % ${delegates} > 0 THEN 1 ELSE 0 END)) FROM blocks b ORDER BY b.height DESC LIMIT 1) as current,',
        '(SELECT (CAST(b.height / ${delegates} AS INTEGER) + (CASE WHEN b.height % ${delegates} > 0 THEN 1 ELSE 0 END)) FROM blocks b',
          (params.start !== undefined ? ' WHERE b.timestamp >= ${start}' : ''),
          'ORDER BY b.height ASC LIMIT 1) as min,',
        '(SELECT (CAST(b.height / ${delegates} AS INTEGER) + (CASE WHEN b.height % ${delegates} > 0 THEN 1 ELSE 0 END)) FROM blocks b',
          (params.end !== undefined ? ' WHERE b.timestamp <= ${end}' : ''),
          'ORDER BY b.height DESC LIMIT 1) as max',
      '),',
      'r as (SELECT DISTINCT ',
        '(CAST(b.height / ${delegates} AS INTEGER) + (CASE WHEN b.height % ${delegates} > 0 THEN 1 ELSE 0 END)) AS round',
        'FROM blocks b WHERE b."generatorPublicKey" = DECODE (${generatorPublicKey}, \'hex\')),',
      're as (SELECT r.round as round, ((r.round-1)*${delegates})+1 as min, r.round*${delegates} as max',
        'FROM r WHERE r.round >= (SELECT min FROM borders) AND round <= (SELECT max FROM borders)),',
      'sum_min as (SELECT',
        'sum(CASE WHEN b."generatorPublicKey" = DECODE (${generatorPublicKey}, \'hex\') THEN b.reward ELSE 0 END) AS rewards,',
        'sum(CASE WHEN b."generatorPublicKey" = DECODE (${generatorPublicKey}, \'hex\') THEN 1 ELSE 0 END) AS blocks',
        'FROM blocks b WHERE b.height BETWEEN (SELECT min FROM re ORDER BY round ASC LIMIT 1) AND (SELECT max FROM re ORDER BY round ASC LIMIT 1)',
        (params.start !== undefined ? 'AND b.timestamp >= ${start}' : ''),
      '),',
      'sum_max as (SELECT',
        'sum(CASE WHEN b."generatorPublicKey" = DECODE (${generatorPublicKey}, \'hex\') THEN b.reward ELSE 0 END) AS rewards,',
        'sum(CASE WHEN b."generatorPublicKey" = DECODE (${generatorPublicKey}, \'hex\') THEN 1 ELSE 0 END) AS blocks',
        'FROM blocks b WHERE b.height BETWEEN (SELECT min FROM re ORDER BY round DESC LIMIT 1) AND (SELECT max FROM re ORDER BY round DESC LIMIT 1)',
        (params.end !== undefined ? 'AND b.timestamp <= ${end}' : ''),
      '),',
      'rs as (SELECT re.*, SUM(b."totalFee") AS fees,',
        'sum(CASE WHEN b."generatorPublicKey" = DECODE (${generatorPublicKey}, \'hex\') THEN b.reward ELSE 0 END) AS rewards,',
        'sum(CASE WHEN b."generatorPublicKey" = DECODE (${generatorPublicKey}, \'hex\') THEN 1 ELSE 0 END) AS blocks',
        'FROM re, blocks b WHERE b.height BETWEEN re.min AND re.max GROUP BY re.round, re.min, re.max),',
      'rsc as (SELECT',
        '(CASE WHEN round = borders.current THEN 0 ELSE fees END), round,',
        '(CASE WHEN round = borders.min THEN (SELECT blocks FROM sum_min) ELSE (CASE WHEN round = borders.max THEN (SELECT blocks FROM sum_max) ELSE blocks END) END) as blocks,',
        '(CASE WHEN round = borders.min THEN (SELECT rewards FROM sum_min) ELSE (CASE WHEN round = borders.max THEN (SELECT rewards FROM sum_max) ELSE rewards END) END) as rewards,',
        '(SELECT 1 FROM blocks b WHERE b.height = rs.max AND b."generatorPublicKey" = DECODE (${generatorPublicKey}, \'hex\') LIMIT 1) AS last',
        'FROM rs, borders)',
      'SELECT',
        '(SELECT * FROM delegate) as delegate,',
        'sum (rsc.blocks) as count,',
        'sum(floor(rsc.fees/${delegates})*rsc.blocks + (CASE WHEN rsc.last = 1 THEN (rsc.fees-floor(rsc.fees/${delegates})*${delegates}) ELSE 0 END)) as fees,',
        'sum(rsc.rewards) as rewards',
        'FROM rsc'
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

  getIdSequence: 'SELECT (ARRAY_AGG("id" ORDER BY "height" ASC))[1] AS "id", MIN("height") AS "height", CAST("height" / ${delegates} AS INTEGER) + (CASE WHEN "height" % ${activeDelegates} > 0 THEN 1 ELSE 0 END) AS "round" FROM blocks WHERE "height" <= ${height} GROUP BY "round" ORDER BY "height" DESC LIMIT ${limit}',

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
