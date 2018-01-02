'use strict';

var PQ = require('pg-promise').ParameterizedQuery;

function MultisignaturesRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;
}

var Queries = {
	getMultisignatureMemberPublicKeys: new PQ('SELECT ARRAY_AGG("dependentId") AS "memberAccountKeys" FROM mem_accounts2multisignatures WHERE "accountId" = $1'),

	getMultisignatureGroupIds: new PQ('SELECT ARRAY_AGG("accountId") AS "groupAccountIds" FROM mem_accounts2multisignatures WHERE "dependentId" = $1'),
};

MultisignaturesRepo.prototype.getMultisignatureMemberPublicKeys = function (address) {
	return this.db.one(Queries.getMultisignatureMemberPublicKeys, [address]).then(function (result) {
		return result.memberAccountKeys;
	});
};

MultisignaturesRepo.prototype.getMultisignatureGroupIds = function (publicKey) {
	return this.db.one(Queries.getMultisignatureGroupIds, [publicKey]).then(function (result) {
		return result.groupAccountIds;
	});
};

module.exports = MultisignaturesRepo;
