'use strict';

var MultisignaturesSql = {
	getMultisignatureMemberPublicKeys: 'SELECT ARRAY_AGG("dependentId") AS "memberAccountKeys" FROM mem_accounts2multisignatures WHERE "accountId" = ${address}',
	getMultisignatureGroupIds: 'SELECT ARRAY_AGG("accountId") AS "groupAccountIds" FROM mem_accounts2multisignatures WHERE "dependentId" = ${publicKey}',
};

module.exports = MultisignaturesSql;
