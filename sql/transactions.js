const TransactionsSql = {
  sortFields: [
    't_id',
    'b_blockId',
    't_amount',
    't_fee',
    't_type',
    't_timestamp',
    't_senderPublicKey',
    't_senderId',
    't_recipientId',
    'b_confirmations',
    'b_height'
  ],

  countById: 'SELECT COUNT("id")::int AS "count" FROM trs WHERE "id" = ${id}',

  countList: function (params) {
    return [
      'SELECT COUNT("t_id") FROM trs_list',
      'INNER JOIN blocks b ON "t_blockId" = b."id"',
      (params.where.length || params.owner ? 'WHERE' : ''),
      (params.where.length ? '(' + params.where.join(' OR ') + ')' : ''),
      (params.where.length && params.owner ? ' AND ' + params.owner : params.owner)
    ].filter(Boolean).join(' ')
  },

  list: function (params) {
    // Need to fix 'or' or 'and' in query
    return [
      'SELECT * FROM trs_list',
      (params.where.length || params.owner ? 'WHERE' : ''),
      (params.where.length ? '(' + params.where.join(' OR ') + ')' : ''),
      (params.where.length && params.owner ? ' AND ' + params.owner : params.owner),
      (params.sortBy ? 'ORDER BY ' + params.sortBy + ' ' + params.sortMethod : ''),
      'LIMIT ${limit} OFFSET ${offset}'
    ].filter(Boolean).join(' ')
  },

  getById: 'SELECT * FROM trs_list WHERE "t_id" = ${id}'
}

module.exports = TransactionsSql;
