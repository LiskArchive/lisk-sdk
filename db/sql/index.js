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

const load = require('./config');
const schema = require('../../config.json').db.schema;

const sql = {
	accounts: {
		// sql to be included
	},
	blocks: {
		// sql to be included
	},
	delegates: {
		countDuplicatedDelegates: load('delegates/countDuplicatedDelegates.sql'),
		getDelegatesByPublicKeys: load('delegates/getDelegatesByPublicKeys.sql'),
		insertFork: load('delegates/insertFork.sql')
	},
	peers: {
		// sql to be included
	}
	// etc...
};

module.exports = {sql, schema};
