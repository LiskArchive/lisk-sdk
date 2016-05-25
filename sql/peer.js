const PeerSql = {
  sortFields: ['ip', 'port', 'state', 'os', 'version'],

  count: 'SELECT COUNT(*)::int FROM peers',

  banManager: 'UPDATE peers SET "state" = 1, "clock" = null WHERE ("state" = 0 AND "clock" - ${now} < 0);',

  getByFilter: function (params) {
    return [
      'SELECT "ip", "port", "state", "os", "version" FROM peers',
      (params.fields.length ? 'WHERE' + params.fields.join(' AND ') : ''),
      (params.sortBy ? 'ORDER BY ' + params.sortBy + ' ' + params.sortMethod : 'ORDER BY random()'),
      'LIMIT ${limit} OFFSET ${offset}'
    ].filter(Boolean).join(' ')
  },

  randomList: function (params) {
    return [
      'SELECT p."ip", p."port", p."state", p."os", p."version" FROM peers p',
      (params.dappid ? 'INNER JOIN peers_dapp AS pd ON p."id" = pd."peerId" AND pd."dappid" = ${dappid}' : ''),
      'WHERE p."state" > 0 ORDER BY RANDOM() LIMIT ${limit}'
    ].filter(Boolean).join(' ')
  },

  state: 'UPDATE peers SET "state" = ${state}, "clock" = ${clock} WHERE "ip" = ${ip} AND "port" = ${port};',

  remove: 'DELETE FROM peers WHERE "ip" = ${ip} AND "port" = ${port};',

  getByIdPort: 'SELECT "id" FROM peers WHERE "ip" = ${ip} AND "port" = ${port}',

  addDapp: 'INSERT INTO peers_dapp ("peerId", "dappid") VALUES (${peerId}, ${dappId}) ON CONFLICT DO NOTHING;',

  insert: 'INSERT INTO peers ("ip", "port", "state", "os", "version") VALUES (${ip}, ${port}, ${state}, ${os}, ${version}) ON CONFLICT DO NOTHING;',

  insertSeed: 'INSERT INTO peers("ip", "port", "state") VALUES(${ip}, ${port}, ${state}) ON CONFLICT DO NOTHING;',

  update: function (params) {
    return [
      'UPDATE peers SET "os" = ${os}, "version" = ${version}',
      (params.state !== undefined ? ', "state" = CASE WHEN "state" = 0 THEN "state" ELSE ${state} END' : ''),
      'WHERE "ip" = ${ip} and "port" = ${port};'
    ].join(' ');
  }
}

module.exports = PeerSql;
