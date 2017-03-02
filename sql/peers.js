'use strict';

var PeersSql = {

  getAll: 'SELECT ip, port, state, os, version, ENCODE(broadhash, \'hex\') AS broadhash, height, clock, (SELECT ARRAY_AGG(dappid) FROM peers_dapp WHERE "peerId" = peers.id) as dappid FROM peers',

  clear: 'DELETE FROM peers',

  truncate: 'TRUNCATE peers CASCADE',

  addDapp: 'INSERT INTO peers_dapp ("peerId", dappid) VALUES ((SELECT id FROM peers WHERE ip = ${ip} AND port = ${port}), ${dappid}) ON CONFLICT DO NOTHING',
};

module.exports = PeersSql;
