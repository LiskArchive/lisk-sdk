'use strict';

var LoaderSql = {
	countBlocks: 'SELECT COUNT("rowId")::int FROM blocks',

	getGenesisBlock: 'SELECT "id", "payloadHash", "blockSignature" FROM blocks WHERE "height" = 1',

	countMemAccounts: 'SELECT COUNT(*)::int FROM mem_accounts WHERE "blockId" = (SELECT "id" FROM "blocks" ORDER BY "height" DESC LIMIT 1)',

	updateMemAccounts: 'UPDATE mem_accounts SET "u_isDelegate" = "isDelegate", "u_secondSignature" = "secondSignature", "u_username" = "username", "u_balance" = "balance", "u_delegates" = "delegates", "u_multisignatures" = "multisignatures", "u_multimin" = "multimin", "u_multilifetime" = "multilifetime" WHERE "u_isDelegate" <> "isDelegate" OR "u_secondSignature" <> "secondSignature" OR "u_username" <> "username" OR "u_balance" <> "balance" OR "u_delegates" <> "delegates" OR "u_multisignatures" <> "multisignatures" OR "u_multimin" <> "multimin" OR "u_multilifetime" <> "multilifetime";',

	getOrphanedMemAccounts: 'SELECT a."blockId", b."id" FROM mem_accounts a LEFT OUTER JOIN blocks b ON b."id" = a."blockId" WHERE a."blockId" IS NOT NULL AND a."blockId" != \'0\' AND b."id" IS NULL',

	getDelegates: 'SELECT ENCODE("publicKey", \'hex\') FROM mem_accounts WHERE "isDelegate" = 1',

	validateMemBalances: 'SELECT * FROM validateMemBalances()',

	getRoundsExceptions: 'SELECT * FROM rounds_exceptions;'
};

module.exports = LoaderSql;
