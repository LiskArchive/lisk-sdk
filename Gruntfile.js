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
				cmd(tag, suite, section) {
					if (suite === 'integration') {
						var slowTag = '';
						if (tag !== 'slow') {
							slowTag = '--grep @slow --invert';
						}
						return `./node_modules/.bin/_mocha --bail test/integration/index.js ${slowTag}`;
					}
					var toExecute = [tag, suite, section]
						.filter(function(val) {
							return val;
						})
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
		'exec:pack',
		'exec:folder',
		'exec:copy',
	]);
	grunt.registerTask('coverageReport', ['exec:coverageReport']);
	grunt.registerTask('default', 'mocha');
};
