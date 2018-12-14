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

module.exports = function(grunt) {
	const maxBufferSize = require('buffer').kMaxLength - 1;

	grunt.initConfig({
		exec: {
			mocha: {
				cmd(tagFilter, suite, section) {
					if (suite === 'network') {
						let filter = '';
						if (tagFilter === 'network') {
							filter = '--grep @network';
						} else if (tagFilter === 'propagation') {
							filter = '--grep @propagation';
						}
						return `./node_modules/.bin/_mocha test/network/index.js ${filter}`;
					}
					const toExecute = [tagFilter, suite, section]
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
	grunt.registerTask('coverageReport', ['exec:coverageReport']);
	grunt.registerTask('default', 'mocha');
};
