'use strict';

var VotersSql = {
	sortFields: [
		'username',
		'address',
		'publicKey'
	],

	getVoters: 'SELECT ARRAY_AGG("accountId") AS "accountIds" FROM mem_accounts2delegates WHERE "dependentId" = ${publicKey}'
};

module.exports = VotersSql;