'use strict';

var PeersSql = {

  getAll: 'SELECT ip, port, state, os, version, ENCODE(broadhash, \'hex\') AS broadhash, height, clock FROM peers',

  clear: 'DELETE FROM peers',

  truncate: 'TRUNCATE peers CASCADE',

};

module.exports = PeersSql;
