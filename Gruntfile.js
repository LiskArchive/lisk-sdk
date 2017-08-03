/*
 * LiskHQ/lisky
 * Copyright © 2017 Lisk Foundation
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
 *
 */

module.exports = function configureGrunt(grunt) {
	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('gruntify-eslint');

	grunt.initConfig({
		mochaTest: {
			test: {
				options: {
					require: 'babel-register',
					reporter: 'spec',
					// Optionally suppress output to standard out (defaults to false)
					quiet: false,
					// Optionally clear the require cache before running tests (defaults to false)
					clearRequireCache: false,
					// Optionally set to not fail on failed tests (will still fail on other errors)
					noFail: false,
				},
				src: ['test/**/*.js'],
			},
		},
		eslint: {
			src: [
				'index.js',
				'bin/**/*.js',
				'src/**/*.js',
				'test/**/*.js',
				'Gruntfile.js',
			],
		},
	});

	grunt.registerTask('default', ['eslint', 'mochaTest']);
	grunt.registerTask('eslint-fix', 'Run eslint and fix formatting', () => {
		grunt.config.set('eslint.options.fix', true);
		grunt.task.run('eslint');
	});
};
