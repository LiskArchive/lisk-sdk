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

var set = require('lodash').set;
var codes = require('../rpc/failure_codes');

var UPDATES = {
	INSERT: 0,
	REMOVE: 1,
};

var ON_CONNECTIONS_TABLE = {
	NONCE: {
		PRESENT: true,
		NOT_PRESENT: false,
	},
	CONNECTION_ID: {
		PRESENT: true,
		NOT_PRESENT: false,
	},
};

var ON_MASTER = {
	PRESENT: true,
	NOT_PRESENT: false,
};

/**
 * Description of the function.
 *
 * @class
 * @memberof api.ws.workers
 * @see Parent: {@link api.ws.workers}
 * @param {function} insert
 * @param {function} remove
 * @param {function} block
 * @todo Add description for the class and the params
 */
function Rules(insert, remove, block) {
	this.rules = {};
	set(
		this.rules,
		[
			[UPDATES.INSERT],
			[ON_CONNECTIONS_TABLE.NONCE.PRESENT],
			[ON_CONNECTIONS_TABLE.CONNECTION_ID.PRESENT],
			[ON_MASTER.PRESENT],
		].join('.'),
		block.bind(null, codes.ALREADY_ADDED)
	);
	set(
		this.rules,
		[
			[UPDATES.INSERT],
			[ON_CONNECTIONS_TABLE.NONCE.PRESENT],
			[ON_CONNECTIONS_TABLE.CONNECTION_ID.PRESENT],
			[ON_MASTER.NOT_PRESENT],
		].join('.'),
		insert
	);
	set(
		this.rules,
		[
			[UPDATES.INSERT],
			[ON_CONNECTIONS_TABLE.NONCE.PRESENT],
			[ON_CONNECTIONS_TABLE.CONNECTION_ID.NOT_PRESENT],
			[ON_MASTER.PRESENT],
		].join('.'),
		block.bind(null, codes.DIFFERENT_CONN_ID)
	);
	set(
		this.rules,
		[
			[UPDATES.INSERT],
			[ON_CONNECTIONS_TABLE.NONCE.PRESENT],
			[ON_CONNECTIONS_TABLE.CONNECTION_ID.NOT_PRESENT],
			[ON_MASTER.NOT_PRESENT],
		].join('.'),
		insert
	);
	set(
		this.rules,
		[
			[UPDATES.INSERT],
			[ON_CONNECTIONS_TABLE.NONCE.NOT_PRESENT],
			[ON_CONNECTIONS_TABLE.CONNECTION_ID.PRESENT],
			[ON_MASTER.PRESENT],
		].join('.'),
		insert
	);
	set(
		this.rules,
		[
			[UPDATES.INSERT],
			[ON_CONNECTIONS_TABLE.NONCE.NOT_PRESENT],
			[ON_CONNECTIONS_TABLE.CONNECTION_ID.PRESENT],
			[ON_MASTER.NOT_PRESENT],
		].join('.'),
		insert
	);
	set(
		this.rules,
		[
			[UPDATES.INSERT],
			[ON_CONNECTIONS_TABLE.NONCE.NOT_PRESENT],
			[ON_CONNECTIONS_TABLE.CONNECTION_ID.NOT_PRESENT],
			[ON_MASTER.PRESENT],
		].join('.'),
		insert
	);
	set(
		this.rules,
		[
			[UPDATES.INSERT],
			[ON_CONNECTIONS_TABLE.NONCE.NOT_PRESENT],
			[ON_CONNECTIONS_TABLE.CONNECTION_ID.NOT_PRESENT],
			[ON_MASTER.NOT_PRESENT],
		].join('.'),
		insert
	);

	set(
		this.rules,
		[
			[UPDATES.REMOVE],
			[ON_CONNECTIONS_TABLE.NONCE.PRESENT],
			[ON_CONNECTIONS_TABLE.CONNECTION_ID.PRESENT],
			[ON_MASTER.PRESENT],
		].join('.'),
		remove
	);
	set(
		this.rules,
		[
			[UPDATES.REMOVE],
			[ON_CONNECTIONS_TABLE.NONCE.PRESENT],
			[ON_CONNECTIONS_TABLE.CONNECTION_ID.PRESENT],
			[ON_MASTER.NOT_PRESENT],
		].join('.'),
		remove
	);
	set(
		this.rules,
		[
			[UPDATES.REMOVE],
			[ON_CONNECTIONS_TABLE.NONCE.PRESENT],
			[ON_CONNECTIONS_TABLE.CONNECTION_ID.NOT_PRESENT],
			[ON_MASTER.PRESENT],
		].join('.'),
		block.bind(null, codes.DIFFERENT_CONN_ID)
	);
	set(
		this.rules,
		[
			[UPDATES.REMOVE],
			[ON_CONNECTIONS_TABLE.NONCE.PRESENT],
			[ON_CONNECTIONS_TABLE.CONNECTION_ID.NOT_PRESENT],
			[ON_MASTER.NOT_PRESENT],
		].join('.'),
		remove
	);
	set(
		this.rules,
		[
			[UPDATES.REMOVE],
			[ON_CONNECTIONS_TABLE.NONCE.NOT_PRESENT],
			[ON_CONNECTIONS_TABLE.CONNECTION_ID.PRESENT],
			[ON_MASTER.PRESENT],
		].join('.'),
		remove
	);
	set(
		this.rules,
		[
			[UPDATES.REMOVE],
			[ON_CONNECTIONS_TABLE.NONCE.NOT_PRESENT],
			[ON_CONNECTIONS_TABLE.CONNECTION_ID.PRESENT],
			[ON_MASTER.NOT_PRESENT],
		].join('.'),
		remove
	);
	set(
		this.rules,
		[
			[UPDATES.REMOVE],
			[ON_CONNECTIONS_TABLE.NONCE.NOT_PRESENT],
			[ON_CONNECTIONS_TABLE.CONNECTION_ID.NOT_PRESENT],
			[ON_MASTER.PRESENT],
		].join('.'),
		remove
	);
	set(
		this.rules,
		[
			[UPDATES.REMOVE],
			[ON_CONNECTIONS_TABLE.NONCE.NOT_PRESENT],
			[ON_CONNECTIONS_TABLE.CONNECTION_ID.NOT_PRESENT],
			[ON_MASTER.NOT_PRESENT],
		].join('.'),
		block.bind(null, codes.ALREADY_REMOVED)
	);
}

Rules.UPDATES = UPDATES;
Rules.ON_CONNECTIONS_TABLE = ON_CONNECTIONS_TABLE;
Rules.ON_MASTER = ON_MASTER;

module.exports = Rules;
