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

var moment = require('moment');
var fs = require('fs');
var path = require('path');

module.exports = function (grunt) {
	grunt.registerTask('newMigration', 'Create a new migration file.', function (name) {
		var migration = {
			id: moment().format('YYYYMMDDHHmmss'),
			name: String(name)
		};

		if (!migration.name.match(/^[a-z]+$/i)) {
			grunt.fail.fatal('Invalid migration name');
		}

		migration.filename = (
			migration.id + '_' + migration.name + '.sql'
		);

		grunt.log.write('Creating migration file: ' + migration.filename);

		fs.writeFile(path.join(process.cwd(), './db/sql/init/migrations', migration.filename), '', function (err) {
			if (err) { grunt.fail.fatal(err); }
		});
	});
};
