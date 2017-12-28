'use strict';

var PQ = require('pg-promise').ParameterizedQuery;

function VotesRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;

	this.sortFields = [
		'username',
		'address',
		'publicKey'
	];
}

var Queries = {

	getVotes: new PQ('SELECT "dependentId" FROM mem_accounts2delegates WHERE "accountId" = $1 LIMIT $2 OFFSET $3'),

	getVotesCount: new PQ('SELECT COUNT("dependentId") AS "votesCount" FROM mem_accounts2delegates WHERE "accountId" = $1')
};

VotesRepo.prototype.list = function (params) {
	return this.db.query(Queries.getVotes, [params.address, params.limit, params.offset]);
};

VotesRepo.prototype.count = function (address) {
	return this.db.one(Queries.getVotesCount, [address]).then(function (result) {
		return result.votesCount;
	});
};

module.exports = VotesRepo;
