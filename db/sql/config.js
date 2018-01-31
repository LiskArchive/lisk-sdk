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

// Check if we are in development environment:
const isDev = __dirname.endsWith('db/sql');

// Full path to the SQL folder, depending on the packaging:
// - production expects ./sql folder at its root;
// - development expects sql in this very folder.
const sqlRoot = isDev ? __dirname : path.join(__dirname, './sql');

/////////////////////////////////////////
// Provides dynamic link to an SQL file:
function link(file) {
	const fullPath = path.join(sqlRoot, file); // Generating full path;

	const options = {
		minify: true, // Minifies the SQL
		debug: isDev, // Debug SQL when in Dev environment
	};

	const qf = new QueryFile(fullPath, options);

	if (qf.error) {
		console.error(qf.error); // Something is wrong with our query file
		process.exit(1); // Exit the process with fatal error
	}

	return qf;
}

module.exports = { link, sqlRoot };
