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

const path = require('path');
const QueryFile = require('pg-promise').QueryFile;

const sqlRoot = __dirname;

/**
 * Provides dynamic link to an SQL file.
 *
 * @memberof db.sql
 * @param {Object} file
 * @returns {Object} QueryFile
 * @todo Add description for params and return value
 */
function link(file) {
	const fullPath = path.join(sqlRoot, file); // Generating full path;

	const options = {
		minify: true, // Minifies the SQL
	};

	const qf = new QueryFile(fullPath, options);

	if (qf.error) {
		console.error(qf.error); // Something is wrong with our query file
		process.exit(1); // Exit the process with fatal error
	}

	return qf;
}

module.exports = { link, sqlRoot };
