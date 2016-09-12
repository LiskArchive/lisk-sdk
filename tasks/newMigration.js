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

		fs.writeFile(path.join('sql', 'migrations', migration.filename), '', function (err) {
			if (err) { grunt.fail.fatal(err); }
		});
	});
};
