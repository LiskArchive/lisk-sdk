'use strict';

var PQ = require('pg-promise').ParameterizedQuery;

function RoundsRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;
}

var Queries = {
	getRoundsExceptions: 'SELECT * FROM rounds_exceptions',
};

RoundsRepo.prototype.getExceptions = function (task) {
	return (task || this.db).query(Queries.getRoundsExceptions);
};

module.exports = RoundsRepo;
