'use strict';

var PQ = require('pg-promise').ParameterizedQuery;
var columnSet;

function AccountsRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.dbTable = 'mem_accounts';

	this.dbFields = [
		'username',
		'isDelegate',
		'secondSignature',
		'address',
		'publicKey',
		'secondPublicKey',
		'balance',
		'rate',
		'rank'
	];

	if (!columnSet) {
		columnSet = {};
		var table = new pgp.helpers.TableName({table: this.dbTable, schema: 'public'});
		columnSet.insert = new pgp.helpers.ColumnSet(this.dbFields, table);
	}

	this.cs = columnSet;
}

var Queries = {
	countMemAccounts: 'SELECT COUNT(*)::int FROM mem_accounts WHERE "blockId" = (SELECT "id" FROM "blocks" ORDER BY "height" DESC LIMIT 1)',

	updateMemAccounts: 'UPDATE mem_accounts SET "u_isDelegate" = "isDelegate", "u_secondSignature" = "secondSignature", "u_username" = "username", "u_balance" = "balance", "u_delegates" = "delegates", "u_multisignatures" = "multisignatures", "u_multimin" = "multimin", "u_multilifetime" = "multilifetime" WHERE "u_isDelegate" <> "isDelegate" OR "u_secondSignature" <> "secondSignature" OR "u_username" <> "username" OR "u_balance" <> "balance" OR "u_delegates" <> "delegates" OR "u_multisignatures" <> "multisignatures" OR "u_multimin" <> "multimin" OR "u_multilifetime" <> "multilifetime";',

	getOrphanedMemAccounts: 'SELECT a."blockId", b."id" FROM mem_accounts a LEFT OUTER JOIN blocks b ON b."id" = a."blockId" WHERE a."blockId" IS NOT NULL AND a."blockId" != \'0\' AND b."id" IS NULL',

	getDelegates: 'SELECT ENCODE("publicKey", \'hex\') FROM mem_accounts WHERE "isDelegate" = 1',

	upsert: PQ('INSERT INTO mem_accounts $1 VALUES $2 ON CONFLICT($3) DO UPDATE SET $4')
};

AccountsRepo.prototype.countMemAccounts = function (task) {
	return (task || this.db).one(Queries.countMemAccounts);
};

AccountsRepo.prototype.updateMemAccounts = function (task) {
	return (task || this.db).none(Queries.updateMemAccounts);
};

AccountsRepo.prototype.getOrphanedMemAccounts = function (task) {
	return (task || this.db).query(Queries.getOrphanedMemAccounts);
};

AccountsRepo.prototype.getDelegates = function (task) {
	return (task || this.db).query(Queries.getDelegates);
};

AccountsRepo.prototype.upsert = function (data, conflictingFields) {
	return this.db.none(
		this.pgp.helpers.concat([
			this.pgp.helpers.insert(this.cs, data),
			'ON CONFLICT ( ' + conflictingFields.join(',') + ') DO',
			this.pgp.helpers.update(this.cs, data)
		]));
};

module.exports = AccountsRepo;
