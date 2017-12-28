'use strict';

var PQ = require('pg-promise').ParameterizedQuery;

function DelegatesRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;
}

var DelegatesSql = {
	delegateList: 'SELECT getDelegatesList() AS list;',

	insertFork: new PQ('INSERT INTO forks_stat ("delegatePublicKey", "blockTimestamp", "blockId", "blockHeight", "previousBlock", "cause") VALUES ($1, $2, $3, $4, $5, $6);'),

	getDelegatesByPublicKeys: 'SELECT ENCODE(pk, \'hex\') as "publicKey", name as username, address FROM delegates WHERE ENCODE(pk, \'hex\') IN ($1:csv) ORDER BY rank ASC'
};

DelegatesRepo.prototype.list = function () {
	return this.db.query(DelegatesSql.delegateList).then(function (result) {
		return result[0].list;
	});
};

DelegatesRepo.prototype.insertFork = function (fork) {
	return this.db.none(DelegatesSql.insertFork, [fork.delegatePublicKey, fork.blockTimestamp, fork.blockId, fork.blockHeight, fork.previousBlock, fork.cause]);
};

DelegatesRepo.prototype.getDelegatesByPublicKeys = function (publicKeys) {
	return this.db.query(DelegatesSql.getDelegatesByPublicKeys, [publicKeys]);
};

module.exports = DelegatesRepo;
