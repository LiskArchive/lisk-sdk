'use strict';

var MultisignaturesSql = {
	getAccountIds: 'SELECT ARRAY_AGG("accountId") AS "accountIds" FROM mem_accounts2multisignatures WHERE "dependentId" = ${publicKey}'
};

module.exports = MultisignaturesSql;
