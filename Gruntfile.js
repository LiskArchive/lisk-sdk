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
var util = require('util');

var appFile = 'app.js'; // Application file name

module.exports = function (grunt) {
	var files = [
		'logger.js',
		'workers_controller.js',
		'api/**/*.js',
		'helpers/**/*.js',
		'modules/**/*.js',
		'logic/*.js',
		'schema/**/*.js',
		'sql/**/*.js',
		appFile
	];

	var today = moment().format('HH:mm:ss DD/MM/YYYY');

	var config = require('./config.json');

	var release_dir = __dirname + '/release/';
	var version_dir = release_dir + config.version;

	var maxBufferSize = require('buffer').kMaxLength - 1;

	grunt.initConfig({
		obfuscator: {
			files: files,
			entry: appFile,
			out: 'release/' + appFile,
			strings: true,
			root: __dirname
		},

		exec: {
			package: {
				command: function () {
					return [
						util.format('mkdir -p %s', version_dir),
						util.format('mkdir -p %s/logs', version_dir),
						util.format('mkdir -p %s/pids', version_dir),
						util.format('cp %s/%s %s', release_dir, appFile, version_dir),
						util.format('cp %s/workers_controller.js %s', release_dir, version_dir),
						util.format('cp %s/config.json %s', __dirname, version_dir),
						util.format('cp %s/package.json %s', __dirname, version_dir),
						util.format('cp %s/genesis_block.json %s', __dirname, version_dir),
						util.format('cp %s/LICENSE %s', __dirname, version_dir),
						util.format('mkdir -p %s/sql', version_dir),
						// The following two lines will copy all SQL files, preserving the folder structure:
						util.format('find %s/db/sql -type d | sed "s|^.*/db/sql||" | xargs -I {} mkdir -p %s/sql{}', __dirname, version_dir),
						util.format('find %s/db/sql -type f -name "*.sql" | sed "s|^.*/db/sql||" | xargs -I {} cp %s/db/sql{} %s/sql{}', __dirname, __dirname, version_dir)
					].join(' && ');
				}
			},

			folder: {
				command: 'mkdir -p ' + release_dir
			},

			build: {
				command: 'cd ' + version_dir + '/ && touch build && echo "v' + today + '" > build'
			},

			mocha: {
				cmd: function (tag, suite, section) {
					if (suite === 'integration') {
						var slowTag = '';
						if (tag !== 'slow') {
							slowTag = '--grep @slow --invert';
						}
						return './node_modules/.bin/_mocha --bail test/integration/index.js ' + slowTag;
					} else {
						var toExecute = [
							tag,
							suite,
							section
						].filter(function (val) { return val; }).join(' ');
						return 'node test/common/parallel_tests.js ' + toExecute;
					}
				},
				maxBuffer: maxBufferSize
			},

			fetchCoverage: {
				command: 'rm -rf ./test/.coverage-func.zip; curl -o ./test/.coverage-func.zip $HOST/coverage/download',
				maxBuffer: maxBufferSize
			},

			createBundles: {
				command: 'npm run build',
				maxBuffer: maxBufferSize
			},

			coverageReport: {
				command: 'rm -f ./test/.coverage-unit/lcov.info; ./node_modules/.bin/istanbul report --root ./test/.coverage-unit/ --dir ./test/.coverage-unit'
			}
		},

		compress: {
			main: {
				options: {
					archive: version_dir + '.tar.gz',
					mode: 'tgz',
					level: 6
				},
				files: [
					{ expand: true, cwd: release_dir, src: [config.version + '/**'], dest: './' }
				]
			}
		},

		eslint: {
			options: {
				configFile: '.eslintrc.json',
				format: 'codeframe',
				fix: false
			},
			target: '.'
		}
	});

	grunt.loadTasks('tasks');

	grunt.loadNpmTasks('grunt-obfuscator');
	grunt.loadNpmTasks('grunt-exec');
	grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.loadNpmTasks('grunt-eslint');

	grunt.registerTask('release', ['exec:folder', 'obfuscator', 'exec:createBundles', 'exec:package', 'exec:build', 'compress']);
	grunt.registerTask('coverageReport', ['exec:coverageReport']);
	grunt.registerTask('eslint-nofix', ['eslint']);

	grunt.registerTask('eslint-fix', 'Run eslint and fix formatting', function () {
		grunt.config.set('eslint.options.fix', true);
		grunt.task.run('eslint');
	});

	grunt.registerTask('default', 'mocha');
};
