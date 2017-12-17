'use strict';

var moment = require('moment');
var util = require('util');

module.exports = function (grunt) {
	var files = [
		'logger.js',
		'api/**/*.js',
		'helpers/**/*.js',
		'modules/**/*.js',
		'logic/*.js',
		'schema/**/*.js',
		'sql/**/*.js',
		'app.js'
	];

	var today = moment().format('HH:mm:ss DD/MM/YYYY');

	var config = require('./config.json');

	var release_dir = __dirname + '/release/';
	var version_dir = release_dir + config.version;

	var maxBufferSize = require('buffer').kMaxLength - 1;

	grunt.initConfig({
		obfuscator: {
			files: files,
			entry: 'app.js',
			out: 'release/app.js',
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
						util.format('mkdir -p %s/public', version_dir),
						util.format('cp %s/app.js %s', release_dir, version_dir),
						util.format('cp %s/config.json %s', __dirname, version_dir),
						util.format('cp %s/package.json %s', __dirname, version_dir),
						util.format('cp %s/genesisBlock.json %s', __dirname, version_dir),
						util.format('cp %s/LICENSE %s', __dirname, version_dir),
						util.format('mkdir -p %s/sql/migrations', version_dir),
						util.format('cp %s/sql/*.sql %s/sql/', __dirname, version_dir),
						util.format('cp %s/sql/migrations/*.sql %s/sql/migrations/', __dirname, version_dir)
					].join(' && ');
				}
			},

			folder: {
				command: 'mkdir -p ' + release_dir
			},

			build: {
				command: 'cd ' + version_dir + '/ && touch build && echo "v' + today + '" > build'
			},

			coverage: {
				command: 'export NODE_ENV=TEST && node_modules/.bin/istanbul cover --dir test/.coverage-unit ./node_modules/.bin/_mocha',
				maxBuffer: maxBufferSize
			},

			coverageSingle: {
				command: 'export NODE_ENV=TEST && node_modules/.bin/istanbul cover --dir test/.coverage-unit ./node_modules/.bin/_mocha $TEST',
				maxBuffer: maxBufferSize
			},

			fetchCoverage: {
				command: 'rm -rf ./test/.coverage-func.zip; curl -o ./test/.coverage-func.zip $HOST/coverage/download',
				maxBuffer: maxBufferSize
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
			target: [
				'api',
				'helpers',
				'modules',
				'logic',
				'schema',
				// 'sql',
				'tasks',
				'test'
			]
		}
	});

	grunt.loadTasks('tasks');

	grunt.loadNpmTasks('grunt-obfuscator');
	grunt.loadNpmTasks('grunt-exec');
	grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.loadNpmTasks('grunt-eslint');

	grunt.registerTask('default', ['release']);
	grunt.registerTask('release', ['exec:folder', 'obfuscator', 'exec:package', 'exec:build', 'compress']);
	grunt.registerTask('jenkins', ['exec:coverageSingle']);
	grunt.registerTask('eslint-nofix', ['eslint']);

	grunt.registerTask('eslint-fix', 'Run eslint and fix formatting', function () {
		grunt.config.set('eslint.options.fix', true);
		grunt.task.run('eslint');
	});
};
