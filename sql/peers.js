'use strict';

var PeersSql = {
  sortFields: ['ip', 'port', 'state', 'os', 'version', 'broadhash', 'height'],

  count: 'SELECT COUNT(*)::int FROM peers',

  banManager: 'UPDATE peers SET "state" = 1, "clock" = null WHERE ("state" = 0 AND "clock" - ${now} < 0)',

  getByFilter: function (params) {
    return [
      'SELECT "ip", "port", "state", "os", "version", ENCODE("broadhash", \'hex\') AS "broadhash", "height" FROM peers',
      (params.where.length ? 'WHERE ' + params.where.join(' AND ') : ''),
      (params.sortField ? 'ORDER BY ' + [params.sortField, params.sortMethod].join(' ') : 'ORDER BY RANDOM()'),
      'LIMIT ${limit} OFFSET ${offset}'
    ].filter(Boolean).join(' ');
  },

  randomList: function (params) {
    return [
      'SELECT p."ip", p."port", p."state", p."os", p."version", ENCODE(p."broadhash", \'hex\') AS "broadhash", p."height" FROM peers p',
      (params.dappid ? 'INNER JOIN peers_dapp AS pd ON p."id" = pd."peerId" AND pd."dappid" = ${dappid}' : ''),
      'WHERE p."state" > 0',
      (params.broadhash ? 'AND "broadhash" ' + (params.attempt === 0 ? '=' : '!=') + ' DECODE(${broadhash}, \'hex\')' : 'AND "broadhash" IS NULL'),
      (params.height ? params.attempt === 0 ? 'AND "height" = ${height}' : 'OR "height" > ${height}' : 'OR "height" IS NULL'),
      'ORDER BY RANDOM() LIMIT ${limit}'
    ].filter(Boolean).join(' ');
  },

  state: 'UPDATE peers SET "state" = ${state}, "clock" = ${clock} WHERE "ip" = ${ip} AND "port" = ${port}',

  remove: 'DELETE FROM peers WHERE "ip" = ${ip} AND "port" = ${port}',

  getByIdPort: 'SELECT "id" FROM peers WHERE "ip" = ${ip} AND "port" = ${port}',

  addDapp: 'INSERT INTO peers_dapp ("peerId", "dappid") VALUES (${peerId}, ${dappId}) ON CONFLICT DO NOTHING',

  upsert: 'INSERT INTO peers AS p ("ip", "port", "state", "os", "version", "broadhash", "height") VALUES (${ip}, ${port}, ${state}, ${os}, ${version}, ${broadhash}, ${height}) ON CONFLICT ("ip", "port") DO UPDATE SET ("ip", "port", "state", "os", "version", "broadhash", "height") = (${ip}, ${port}, (CASE WHEN p."state" = 0 THEN p."state" ELSE ${state} END), ${os}, ${version}, (CASE WHEN ${broadhash} IS NULL THEN p."broadhash" ELSE ${broadhash} END), (CASE WHEN ${height} IS NULL THEN p."height" ELSE ${height} END))'
};

module.exports = PeersSql;
