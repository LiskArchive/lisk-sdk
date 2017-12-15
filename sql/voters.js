'use strict';

var VotersSql = {
	sortFields: [
		'username',
		'address',
		'publicKey'
	],

	getVoters: 'SELECT ARRAY_AGG(v.voter_address) AS "accountIds" FROM (SELECT DISTINCT ON (voter_address) voter_address, delegate_public_key, type FROM votes_details WHERE delegate_public_key = DECODE(${publicKey}, \'hex\') ORDER BY voter_address, timestamp DESC) v WHERE v.type = \'add\'',

	getVotersCount: 'SELECT COUNT("accountId") as "votersCount" FROM mem_accounts2delegates WHERE "dependentId" = ${publicKey}',

	getVotes: 'SELECT "dependentId" FROM mem_accounts2delegates WHERE "accountId" = ${address} LIMIT ${limit} OFFSET ${offset}',

	getVotesCount: 'SELECT COUNT("dependentId") AS "votesCount" FROM mem_accounts2delegates WHERE "accountId" = ${address}'
};

module.exports = VotersSql;
