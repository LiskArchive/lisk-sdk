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

/**
 * Peers database interaction module
 * @memberof module:peers
 * @class
 * @param {Database} db - Instance of database object from pg-promise
 * @param {Object} pgp - pg-promise instance to utilize helpers
 * @constructor
 * @return {PeersRepo}
 */
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

/**
 * Get all peers from database
 * @return {Promise}
 */
PeersRepo.prototype.list = function () {
	return this.db.any(PeersSql.getAll);
};

/**
 * Clear all peers from database
 * @return {Promise}
 */
PeersRepo.prototype.clear = function () {
	return this.db.any(PeersSql.clear);
};

/**
 * Insert a new peer to database
 * @param {Array<Object>} peers - Array of peers to be inserted. Object can contains any of fields [PeersRepo's dbFields property]{@link PeersRepo#dbFields}
 * @return {Promise}
 */
PeersRepo.prototype.insert = function (peers) {
	return this.db.none(this.pgp.helpers.insert(peers, this.cs));
};

module.exports = PeersRepo;
