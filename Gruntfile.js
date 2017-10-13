/*
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
/* eslint-disable import/no-extraneous-dependencies */
const loadGruntTasks = require('load-grunt-tasks');

module.exports = function configureGrunt(grunt) {
	loadGruntTasks(grunt);

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		exec: {
			coverageSingle: './node_modules/.bin/nyc --report-dir=coverage --reporter=lcov ./node_modules/.bin/_mocha test --recursive',
			prepareDistNode: 'rm -r dist-node/* || mkdir dist-node | echo',
			prepareDistBrowser: 'rm -r dist-browser/* || mkdir dist-browser | echo',
			babel: './node_modules/.bin/babel src --out-dir ./dist-node',
			babelTest: './node_modules/.bin/babel src --out-dir ./browsertest/src && BABEL_ENV=browsertest ./node_modules/.bin/babel test --ignore test/transactions/dapp.js --out-dir ./browsertest/test',
			tidyTest: 'rm -r browsertest/src browsertest/test',
		},

		eslint: {
			target: ['.'],
		},

		browserify: {
			dist: {
				src: './dist-node/*.js',
				dest: './dist-browser/lisk-js.js',
			},
			test: {
				src: ['./browsertest/test/*.js', './browsertest/test/**/*.js'],
				dest: './browsertest/browsertest.js',
			},
			options: {
				transform: ['rewireify'],
				browserifyOptions: {
					standalone: 'lisk',
				},
			},
		},

		uglify: {
			dist: {
				files: {
					'dist-browser/lisk-js.min.js': ['dist-browser/lisk-js.js'],
				},
			},
			test: {
				files: {
					'browsertest/browsertest.min.js': 'browsertest/browsertest.js',
				},
			},
			options: {
				mangle: false,
			},
		},

		coveralls: {
			src: 'coverage/*.info',
		},
	});

	grunt.registerTask('eslint-fix', 'Run eslint and fix formatting', () => {
		grunt.config.set('eslint.options.fix', true);
		grunt.task.run('eslint');
	});

	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-coveralls');
	grunt.registerTask('jenkins', ['exec:coverageSingle', 'coveralls']);
	grunt.registerTask('eslint-ci', ['eslint']);
	grunt.registerTask('build', [
		'exec:prepareDistNode',
		'exec:prepareDistBrowser',
		'exec:babel',
		'browserify:dist',
		'uglify:dist',
	]);
	grunt.registerTask('build-browsertest', [
		'exec:babelTest',
		'browserify:test',
		'uglify:test',
		'exec:tidyTest',
	]);
	grunt.registerTask('default', [
		'build',
	]);
};
