/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';

var PQ = require('pg-promise').ParameterizedQuery;

function PeersRepo (db, pgp) {
	this.db = db;
	this.pgp = pgp;

	// Setup all ColumnSet objects, if needed:
	this.dbTable = 'peers';

	var table = new pgp.helpers.TableName({table: this.dbTable, schema: 'public'});
	this.cs = new pgp.helpers.ColumnSet([
		'ip', 'wsPort', 'state', 'height', 'os', 'version', 'clock',
		{name: 'broadhash', init: function (col) {
			return col.value ? Buffer.from(col.value, 'hex') : null;
		}}
	], {table: table});
}

var PeersSql = {
	getAll: 'SELECT ip, "wsPort", state, os, version, ENCODE(broadhash, \'hex\') AS broadhash, height, clock FROM peers',

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
