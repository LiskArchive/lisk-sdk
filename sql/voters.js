'use strict';

var VotersSql = {
	sortFields: [
		'username',
		'address',
		'publicKey'
	],

	getVoters: 'SELECT "accountId" FROM mem_accounts2delegates WHERE "dependentId" = ${publicKey} LIMIT ${limit} OFFSET ${offset}',

	getVotersCount: 'SELECT COUNT("accountId") AS "votersCount" FROM mem_accounts2delegates WHERE "dependentId" = ${publicKey}',

	getVotes: 'SELECT "dependentId" FROM mem_accounts2delegates WHERE "accountId" = ${address} LIMIT ${limit} OFFSET ${offset}',

	getVotesCount: 'SELECT COUNT("dependentId") AS "votesCount" FROM mem_accounts2delegates WHERE "accountId" = ${address}'
};

module.exports = VotersSql;
