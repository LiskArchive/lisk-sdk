'use strict';

const PQ = require('pg-promise').ParameterizedQuery;

const queries = {
	getMultisignatureMemberPublicKeys: new PQ('SELECT ARRAY_AGG("dependentId") AS "memberAccountKeys" FROM mem_accounts2multisignatures WHERE "accountId" = $1'),
	getMultisignatureGroupIds: new PQ('SELECT ARRAY_AGG("accountId") AS "groupAccountIds" FROM mem_accounts2multisignatures WHERE "dependentId" = $1')
};

class MultisignaturesRepo {
	constructor(db) {
		this.db = db;
	}
	
	getMultisignatureMemberPublicKeys(address) {
		return this.db.one(queries.getMultisignatureMemberPublicKeys, address, a => a.memberAccountKeys);
	}

	getMultisignatureGroupIds(publicKey) {
		return this.db.one(queries.getMultisignatureGroupIds, publicKey, a => a.groupAccountIds);
	}
}

module.exports = MultisignaturesRepo;
