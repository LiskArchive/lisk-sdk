'use strict';

var DelegatesSql = {
  delegateList: 'SELECT getDelegatesList() AS list;',

  insertFork: 'INSERT INTO forks_stat ("delegatePublicKey", "blockTimestamp", "blockId", "blockHeight", "previousBlock", "cause") VALUES (${delegatePublicKey}, ${blockTimestamp}, ${blockId}, ${blockHeight}, ${previousBlock}, ${cause});'
};

module.exports = DelegatesSql;
