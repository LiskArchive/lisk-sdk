const BlocksSql = {
  sortFields: [
    '"b_id"',
    '"b_timestamp"',
    '"b_height"',
    '"b_previousBlock"',
    '"b_totalAmount"',
    '"b_totalFee"',
    '"b_reward"',
    '"b_numberOfTransactions"',
    '"b_generatorPublicKey"'
  ],

  getGenesisBlockId: 'SELECT "id" FROM blocks WHERE "id" = ${id}',

  deleteBlock: 'DELETE FROM blocks WHERE "id" = ${id};',

  countList: function (params) {
    return [
      'SELECT COUNT("b_id")::int FROM blocks_list',
      (params.where.length ? 'WHERE' + params.where.join(' AND ') : '')
    ].filter(Boolean).join(' ');
  },

  list: function (params) {
    return [
      'SELECT * FROM blocks_list',
      (params.where.length ? 'WHERE' + params.where.join(' AND ') : ''),
      (params.sortBy ? 'ORDER BY ' + params.sortBy + ' ' + params.sortMethod : ''),
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

  getTransactionId: 'SELECT "id" FROM trs WHERE "id" = ${id}',

  simpleDeleteAfterBlock: 'DELETE FROM blocks WHERE "height" >= (SELECT "height" FROM blocks WHERE "id" = ${id});'
};

module.exports = BlocksSql;
