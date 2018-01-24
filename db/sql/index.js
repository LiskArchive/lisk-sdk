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
	const fullPath = path.join(sqlRoot, file); // Generating full path;

	const options = {
		minify: true, // Minifies the SQL
		debug: !isPackaged, // Debug SQL when not packaged
		params: {
			schema: 'public' // Replaces ${schema~} with "public"
		}
	};

	const qf = new QueryFile(fullPath, options);

	if (qf.error) {
		// TODO: Replace this with proper logging later on
		console.error(qf.error); // Something is wrong with our query file
		process.exit(1); // Exit the process with fatal error
	}

	return qf;
}

module.exports = {
	accounts: {
		// sql to be included
	},
	blocks: {
		// sql to be included
	},
	delegates: {
		countDuplicatedDelegates: sql('delegates/countDuplicatedDelegates.sql'),
		getDelegatesByPublicKeys: sql('delegates/getDelegatesByPublicKeys.sql'),
		insertFork: sql('delegates/insertFork.sql')
	},
	peers: {
		// sql to be included
	}
	// etc...
};
