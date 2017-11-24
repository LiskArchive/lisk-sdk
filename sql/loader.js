'use strict';

var LoaderSql = {
	countBlocks: 'SELECT COUNT("row_id")::int FROM blocks',

	getGenesisBlock: 'SELECT "block_id" AS "id", "payload_hash" AS "payloadHash", "signature" AS "blockSignature" FROM blocks WHERE "height" = 1',

	// TODO: Trash these, or reuse for something else if logic is ok
	countMemAccounts: 'SELECT COUNT(*)::int FROM accounts a WHERE a."transaction_id" IS NOT NULL',

	updateMemAccounts: 'UPDATE mem_accounts SET "u_isDelegate" = "isDelegate", "u_secondSignature" = "secondSignature", "u_username" = "username", "u_balance" = "balance", "u_delegates" = "delegates", "u_multisignatures" = "multisignatures", "u_multimin" = "multimin", "u_multilifetime" = "multilifetime" WHERE "u_isDelegate" <> "isDelegate" OR "u_secondSignature" <> "secondSignature" OR "u_username" <> "username" OR "u_balance" <> "balance" OR "u_delegates" <> "delegates" OR "u_multisignatures" <> "multisignatures" OR "u_multimin" <> "multimin" OR "u_multilifetime" <> "multilifetime";',

	getOrphanedMemAccounts: 'SELECT a."blockId", b."id" FROM mem_accounts a LEFT OUTER JOIN blocks b ON b."id" = a."blockId" WHERE a."blockId" IS NOT NULL AND a."blockId" != \'0\' AND b."id" IS NULL',

	getDelegates: 'SELECT ENCODE("public_key", \'hex\') FROM delegates',

	validateMemBalances: 'SELECT * FROM validate_accounts_balances()',

	getRoundsExceptions: 'SELECT * FROM rounds_exceptions;'
};

module.exports = LoaderSql;
