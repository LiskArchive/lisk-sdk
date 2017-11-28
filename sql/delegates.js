'use strict';

var DelegatesSql = {
  delegateList: 'SELECT getDelegatesList() AS list;',

  insertFork: 'INSERT INTO forks_stat ("delegatePublicKey", "blockTimestamp", "blockId", "blockHeight", "previousBlock", "cause") VALUES (${delegatePublicKey}, ${blockTimestamp}, ${blockId}, ${blockHeight}, ${previousBlock}, ${cause});',

  getDelegatesByPublicKeys: 'SELECT ENCODE(pk, \'hex\') as "publicKey", name as username, address FROM delegates WHERE ENCODE(pk, \'hex\') IN (${publicKeys:csv}) ORDER BY rank ASC'
};

module.exports = DelegatesSql;
