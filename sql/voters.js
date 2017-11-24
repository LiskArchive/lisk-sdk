'use strict';

var VotersSql = {
	sortFields: [
		'username',
		'address',
		'publicKey'
	],

	getVoters: 'SELECT "accountId" FROM mem_accounts2delegates WHERE "dependentId" = ${publicKey} LIMIT ${limit} OFFSET ${offset}',

	getVotersCount: 'SELECT COUNT("accountId") as "votersCount" FROM mem_accounts2delegates WHERE "dependentId" = ${publicKey}'
};

module.exports = VotersSql;
