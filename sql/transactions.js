'use strict';

var TransactionsSql = {
  sortFields: [
    'id',
    'blockId',
    'amount',
    'fee',
    'type',
    'timestamp',
    'senderPublicKey',
    'senderId',
    'recipientId',
    'confirmations',
    'height'
  ],

  countById: 'SELECT COUNT("id")::int AS "count" FROM trs WHERE "id" = ${id}',

  countList: function (params) {
    return [
      'SELECT COUNT("t_id") FROM trs_list',
      'INNER JOIN blocks b ON "t_blockId" = b."id"',
      (params.where.length || params.owner ? 'WHERE' : ''),
      (params.where.length ? '(' + params.where.join(' OR ') + ')' : ''),
      (params.where.length && params.owner ? ' AND ' + params.owner : params.owner)
    ].filter(Boolean).join(' ');
  },

  list: function (params) {
    // Need to fix 'or' or 'and' in query
    return [
      'SELECT * FROM trs_list',
      (params.where.length || params.owner ? 'WHERE' : ''),
      (params.where.length ? '(' + params.where.join(' OR ') + ')' : ''),
      (params.where.length && params.owner ? ' AND ' + params.owner : params.owner),
      (params.sortField ? 'ORDER BY ' + [params.sortField, params.sortMethod].join(' ') : ''),
      'LIMIT ${limit} OFFSET ${offset}'
    ].filter(Boolean).join(' ');
  },

  getById: 'SELECT * FROM trs_list WHERE "t_id" = ${id}'
};

module.exports = TransactionsSql;
