const RoundSql = {
  flush: 'DELETE FROM mem_round WHERE "round" = (${round})::bigint;',

  updateMissedBlocks: 'UPDATE mem_accounts SET "missedblocks" = "missedblocks" + 1 WHERE "address" IN ($1:csv);',

  getVotes: 'SELECT d."delegate", d."amount" FROM (SELECT m."delegate", SUM(m."amount") AS "amount", "round" FROM mem_round m GROUP BY m."delegate", m."round") AS d WHERE "round" = (${round})::bigint',

  updateVotes: 'UPDATE mem_accounts SET "vote" = "vote" + (${amount})::bigint WHERE "address" = ${address};',

  summedRound: 'SELECT SUM(b."totalFee")::bigint AS "fees", ARRAY_AGG(b."reward") AS "rewards", ARRAY_AGG(ENCODE(b."generatorPublicKey", \'hex\')) AS "delegates" FROM blocks b WHERE (SELECT (CAST(b."height" / ${activeDelegates} AS INTEGER) + (CASE WHEN b."height" % ${activeDelegates} > 0 THEN 1 ELSE 0 END))) = ${round}'
}

module.exports = RoundSql;
