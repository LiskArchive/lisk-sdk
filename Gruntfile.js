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
const moment = require('moment');

module.exports = function(grunt) {
	const today = moment().format('HH:mm:ss DD/MM/YYYY');
	const release_dir = path.join(__dirname, '/release/');
	const config = require('./package.json');

	const maxBufferSize = require('buffer').kMaxLength - 1;

	grunt.initConfig({
		exec: {
			build: {
				command: `cd ${__dirname}/ && echo "v${today}" > build`,
			},

			revision: {
				command: `cd ${__dirname}/ && git rev-parse HEAD > REVISION`,
			},

			pack: {
				command: 'npm pack',
			},

			folder: {
				command: `mkdir -p ${release_dir}`,
			},

			copy: {
				command: `cp lisk-${config.version}.tgz ${release_dir}`,
			},

			mocha: {
				cmd(tagFilter, suite, section) {
					if (suite === 'network') {
						var filter = '';
						if (tagFilter === 'default') {
							filter = "--grep '@slow|@unstable|@sequential' --invert";
						} else if (tagFilter === 'extensive') {
							filter = '--grep @unstable --invert';
						} else if (tagFilter === 'slow') {
							filter = '--grep @slow';
						} else if (tagFilter === 'unstable') {
							filter = '--grep @unstable';
						} else if (tagFilter === 'sequential') {
							/**
							 * Tests or test suites which contains @sequential tag
							 * are going to be run sequentially after all parallel
							 * tests were executed.
							 */
							filter = '--grep @sequential';
						} else if (tagFilter === 'network') {
							filter = '--grep @network';
						} else if (tagFilter === 'propagation') {
							filter = '--grep @propagation';
						} else if (tagFilter === 'stress') {
							filter = '--grep @stress';
						} else {
							grunt.fail.fatal(
								'The specified tag is not supported.\n\nExample: `grunt mocha:<tag>:<suite>:[section]` or `npm test -- mocha:<tag>:<suite>:[section]`\n\n- Where tag can be one of default | unstable | slow | extensive (required)\n- Where suite can be one of unit | integration | functional | network (required)\n- Where section can be one of get | post | ws (optional)'
							);
						}
						return `./node_modules/.bin/_mocha test/network/index.js ${filter}`;
					}
					var toExecute = [tagFilter, suite, section]
						.filter(val => val)
						.join(' ');
					return `node test/common/parallel_tests.js ${toExecute}`;
				},
				maxBuffer: maxBufferSize,
			},

			fetchCoverage: {
				command:
					'rm -rf ./test/.coverage-func.zip; curl -o ./test/.coverage-func.zip $HOST/coverage/download',
				maxBuffer: maxBufferSize,
			},

			coverageReport: {
				command:
					'rm -f ./test/.coverage-unit/lcov.info; ./node_modules/.bin/istanbul report --root ./test/.coverage-unit/ --dir ./test/.coverage-unit',
			},
		},
	});

	grunt.loadTasks('tasks');
	grunt.loadNpmTasks('grunt-exec');
	grunt.registerTask('release', [
		'exec:build',
		'exec:revision',
		'exec:pack',
		'exec:folder',
		'exec:copy',
	]);
	grunt.registerTask('coverageReport', ['exec:coverageReport']);
	grunt.registerTask('default', 'mocha');
};
