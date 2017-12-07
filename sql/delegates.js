'use strict';

var DelegatesSql = {
  delegateList: 'SELECT get_delegates_list() AS list;',

  insertFork: 'INSERT INTO forks_stat ("delegatePublicKey", "blockTimestamp", "blockId", "blockHeight", "previousBlock", "cause") VALUES (${delegatePublicKey}, ${blockTimestamp}, ${blockId}, ${blockHeight}, ${previousBlock}, ${cause});',

  getDelegatesByPublicKeys: 'SELECT ENCODE(pk, \'hex\') as "publicKey", name as username, address FROM delegates WHERE ENCODE(pk, \'hex\') IN (${publicKeys:csv}) ORDER BY rank ASC'

  // TODO: Use query to get votes
  // getVotes: 'SELECT ARRAY_AGG(ENCODE(v.delegate_public_key, \'hex\')) AS "delegates" FROM (SELECT DISTINCT ON (delegate_public_key) voter_address, delegate_public_key, type FROM votes_details WHERE voter_address = ${senderId} ORDER BY delegate_public_key, timestamp DESC) v WHERE v.type = \'add\''
};

module.exports = DelegatesSql;
