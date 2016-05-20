const LoaderSql = {
  countBlocks: 'SELECT COUNT("rowId")::int FROM blocks',

  countMemAccounts: 'SELECT COUNT(*)::int FROM mem_accounts WHERE "blockId" = (SELECT "id" FROM "blocks" WHERE "numberOfTransactions" > 0 ORDER BY "height" DESC LIMIT 1)',

  getMemRounds: 'SELECT "round" FROM mem_round GROUP BY "round"',

  updateMemAccounts: 'UPDATE mem_accounts SET "u_isDelegate" = "isDelegate", "u_secondSignature" = "secondSignature", "u_username" = "username", "u_balance" = "balance", "u_delegates" = "delegates", "u_multisignatures" = "multisignatures";',

  getOrphanedMemAccounts: 'SELECT a."blockId", b."id" FROM mem_accounts a LEFT OUTER JOIN blocks b ON b."id" = a."blockId" WHERE b."id" IS NULL',

  getDelegates: 'SELECT ENCODE("publicKey", \'hex\') FROM mem_accounts WHERE "isDelegate" = 1'
}

module.exports = LoaderSql;
