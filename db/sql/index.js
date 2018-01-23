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

module.exports = {
	accounts: {
		// sql to be included
	},
	blocks: {
		// sql to be included
	},
	delegates: {
		countDuplicatedDelegates: sql('delegates/count-duplicated-delegates.sql'),
		getDelegatesByPublicKeys: sql('delegates/get-delegates-by-public-keys.sql'),
		insertFork: sql('delegates/insert-fork.sql')
	},
	peers: {
		// sql to be included
	}
	// etc...
};

const QueryFile = require('pg-promise').QueryFile;
const path = require('path');

// Check if it is a packaged/prod application:
const isPackaged = __filename.endsWith('app.js');

// Full path to the SQL folder, depending on the packaging:
// - production expects ./sql folder at its root;
// - development expects sql in this very folder.
const sqlRoot = isPackaged ? path.join(__dirname, './sql') : __dirname;

///////////////////////////////////////////////
// Helper for linking to external query files:
function sql(file) {

	const fullPath = path.join(sqlRoot, file); // generating full path;

	const options = {
		minify: true, // minifies the SQL
		debug: !isPackaged,
		params: {
			schema: 'public' // replaces ${schema~} with "public"
		}
	};

	const qf = new QueryFile(fullPath, options);

	if (qf.error) {
		// TODO: Replace this with proper logging later on
		console.error(qf.error); // something is wrong with our query file
		process.exit(1); // exit the process with fatal error
	}

	return qf;
}
