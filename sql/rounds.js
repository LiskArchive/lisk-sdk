'use strict';

var RoundsSql = {
  flush: 'DELETE FROM mem_round WHERE "round" = (${round})::bigint;',

  truncateBlocks: 'DELETE FROM blocks WHERE "height" > (${height})::bigint;',

  updateMissedBlocks: function (backwards) {
    return [
      'UPDATE mem_accounts SET "missedblocks" = "missedblocks"',
      (backwards ? '- 1' : '+ 1'),
      'WHERE "address" IN ($1:csv);'
    ].join(' ');
  },

  getVotes: 'SELECT d."delegate", d."amount" FROM (SELECT m."delegate", SUM(m."amount") AS "amount", "round" FROM mem_round m GROUP BY m."delegate", m."round") AS d WHERE "round" = (${round})::bigint',

  updateVotes: 'UPDATE mem_accounts SET "vote" = "vote" + (${amount})::bigint WHERE "address" = ${address};',

  updateBlockId: 'UPDATE mem_accounts SET "blockId" = ${newId} WHERE "blockId" = ${oldId};',

  summedRound: 'WITH round_blocks as (SELECT ((${round}-1)*${activeDelegates})+1 as min, ${round}*${activeDelegates} as max) SELECT SUM(b."totalFee")::bigint AS "fees", ARRAY_AGG(b."reward") AS "rewards", ARRAY_AGG(ENCODE(b."generatorPublicKey", \'hex\')) AS "delegates" FROM blocks b WHERE b.height BETWEEN (SELECT min FROM round_blocks) AND (SELECT max FROM round_blocks)'
};

module.exports = RoundsSql;
