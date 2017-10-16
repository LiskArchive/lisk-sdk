'use strict';

var moment = require('moment');
var util = require('util');

module.exports = function (grunt) {
	var files = [
		'logger.js',
		'workersController.js',
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
						util.format('cp %s/app.js %s', release_dir, version_dir),
						util.format('cp %s/workersController.js %s', release_dir, version_dir),
						util.format('cp %s/config.json %s', __dirname, version_dir),
						util.format('cp %s/package.json %s', __dirname, version_dir),
						util.format('cp %s/genesisBlock.json %s', __dirname, version_dir),
						util.format('cp %s/LICENSE %s', __dirname, version_dir),
						util.format('mkdir -p %s/sql/migrations', version_dir),
						util.format('cp %s/sql/*.sql %s/sql/', __dirname, version_dir),
						util.format('cp %s/sql/migrations/*.sql %s/sql/migrations/', __dirname, version_dir),
					].join(' && ');
				}
			},

			folder: {
				command: 'mkdir -p ' + release_dir
			},

			build: {
				command: 'cd ' + version_dir + '/ && touch build && echo "v' + today + '" > build'
			},

			coverageSingle: {
				command: 'export NODE_ENV=TEST && node_modules/.bin/istanbul cover --dir test/.coverage-unit --include-pid ./node_modules/.bin/_mocha $TEST -- --grep @slow --invert',
				maxBuffer: maxBufferSize
			},

			coverageSingleExtensive: {
				command: 'export NODE_ENV=TEST && node_modules/.bin/istanbul cover --dir test/.coverage-unit --include-pid ./node_modules/.bin/_mocha $TEST',
				maxBuffer: maxBufferSize
			},

			coverageUnit: {
				command: 'node test/unit/index.js',
				maxBuffer: maxBufferSize
			},

			coverageUnitSlow: {
				command: 'node_modules/.bin/istanbul cover --dir test/.coverage-unit ./node_modules/.bin/_mocha test/unit/index.slow.js',
				maxBuffer: maxBufferSize
			},

			testFunctionalWs: {
				command: './node_modules/.bin/_mocha test/functional/ws/index.js --grep @slow --invert',
				maxBuffer: maxBufferSize
			},

			testFunctionalHttpGet: {
				command: './node_modules/.bin/_mocha test/functional/http/get/index.js --grep @slow --invert',
				maxBuffer: maxBufferSize
			},

			testFunctionalHttpPost: {
				command: './node_modules/.bin/_mocha test/functional/http/post/index.js --grep @slow --invert',
				maxBuffer: maxBufferSize
			},

			testIntegration: {
				command: './node_modules/.bin/_mocha --bail test/integration/peers.integration.js ',
				maxBuffer: maxBufferSize
			},

			fetchCoverage: {
				command: 'rm -rf ./test/.coverage-func.zip; curl -o ./test/.coverage-func.zip $HOST/coverage/download',
				maxBuffer: maxBufferSize
			},

			createBundles: {
				command: 'npm run create-bundles',
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
			target: [
				'api',
				'helpers',
				'modules',
				'logic',
				'schema',
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
	grunt.registerTask('release', ['exec:folder', 'obfuscator', 'exec:createBundles', 'exec:package', 'exec:build', 'compress']);
	grunt.registerTask('jenkins', ['exec:coverageSingle']);
	grunt.registerTask('jenkins-extensive', ['exec:coverageSingleExtensive']);
	grunt.registerTask('coverageReport', ['exec:coverageReport']);
	grunt.registerTask('eslint-nofix', ['eslint']);
	grunt.registerTask('test-unit', ['eslint', 'exec:coverageUnit']);
	grunt.registerTask('test-unit-slow', ['eslint', 'exec:coverageUnitSlow']);
	grunt.registerTask('test-functional-ws', ['eslint', 'exec:testFunctionalWs']);
	grunt.registerTask('test-functional-ws-extensive', ['eslint', 'exec:testFunctionalWsExtensive']);
	grunt.registerTask('test-functional-http-get', ['eslint', 'exec:testFunctionalHttpGet']);
	grunt.registerTask('test-functional-http-get-extensive', ['eslint', 'exec:testFunctionalHttpGetExtensive']);
	grunt.registerTask('test-functional-http-post', ['eslint', 'exec:testFunctionalHttpPost']);
	grunt.registerTask('test-integration', ['eslint', 'exec:testIntegration']);

	grunt.registerTask('eslint-fix', 'Run eslint and fix formatting', function () {
		grunt.config.set('eslint.options.fix', true);
		grunt.task.run('eslint');
	});
};