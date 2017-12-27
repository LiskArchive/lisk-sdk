'use strict';

var PQ = require('pg-promise').ParameterizedQuery;

function PeersRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;

	// set-up all ColumnSet objects, if needed:
	this.cs = new pgp.helpers.ColumnSet([
		'ip', 'wsPort', 'state', 'height', 'os', 'version', 'clock',
		{name: 'broadhash', init: function (col) {
			return col.value ? Buffer.from(col.value, 'hex') : null;
		}}
	], {table: 'peers'});
}

var PeersSql = {

	getAll: 'SELECT ip, port, state, os, version, ENCODE(broadhash, \'hex\') AS broadhash, height, clock FROM peers',

	clear: 'DELETE FROM peers'
};

PeersRepo.prototype.list = function (task) {
	return (task || this.db).any(PeersSql.getAll);
};

PeersRepo.prototype.clear = function (task) {
	return (task || this.db).any(PeersSql.clear);
};

PeersRepo.prototype.insert = function (peers, task) {
	return (task || this.db).none(this.pgp.helpers.insert(peers, this.cs));
};

module.exports = PeersRepo;
