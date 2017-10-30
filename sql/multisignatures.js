'use strict';

var MultisignaturesSql = {
	// TODO: NEed to join this with both multisignatures_master and member
	getAccountIds: 'SELECT ARRAY_AGG("accountId") AS "accountIds" FROM mem_accounts2multisignatures WHERE "dependentId" = ${publicKey}'
};

module.exports = MultisignaturesSql;
