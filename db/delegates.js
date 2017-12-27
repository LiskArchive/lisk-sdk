'use strict';

var PQ = require('pg-promise').ParameterizedQuery;

function DelegatesRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;
}

var DelegatesSql = {
	delegateList: 'SELECT getDelegatesList() AS list;',

	insertFork: new PQ('INSERT INTO forks_stat ("delegatePublicKey", "blockTimestamp", "blockId", "blockHeight", "previousBlock", "cause") VALUES (${delegatePublicKey}, ${blockTimestamp}, ${blockId}, ${blockHeight}, ${previousBlock}, ${cause});'),

	getDelegatesByPublicKeys: new PQ('SELECT ENCODE(pk, \'hex\') as "publicKey", name as username, address FROM delegates WHERE ENCODE(pk, \'hex\') IN (${publicKeys:csv}) ORDER BY rank ASC')
};

DelegatesRepo.prototype.list = function () {
	return this.db.query(DelegatesSql.delegateList).then(function (result) {
		return result[0].list;
	});
};

DelegatesRepo.prototype.insertFork = function (fork) {
	return this.db.none(DelegatesSql.insertFork, fork);
};

DelegatesRepo.prototype.getDelegatesByPublicKeys = function (publicKeys) {
	return this.db.query(DelegatesSql.getDelegatesByPublicKeys, {publicKeys: publicKeys});
};

module.exports = DelegatesRepo;
