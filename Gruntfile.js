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

			testUnit: {
				command: 'export NODE_ENV=test TEST_TYPE=unit && node test/common/parallelTests.js unit',
				maxBuffer: maxBufferSize
			},

			testUnitExtensive: {
				command: 'export NODE_ENV=test TEST_TYPE=unit && node test/common/parallelTests.js unit @slow',
				maxBuffer: maxBufferSize
			},

			testFunctionalWs: {
				command: 'export NODE_ENV=test TEST_TYPE=func && node test/common/parallelTests.js functional-ws',
				maxBuffer: maxBufferSize
			},

			testFunctionalWsExtensive: {
				command: 'export NODE_ENV=test TEST_TYPE=func && node test/common/parallelTests.js functional-ws @slow',
				maxBuffer: maxBufferSize
			},

			testFunctionalHttpGet: {
				command: 'export NODE_ENV=test TEST_TYPE=func && node test/common/parallelTests.js functional-http-get',
				maxBuffer: maxBufferSize
			},

			testFunctionalHttpGetExtensive: {
				command: 'export NODE_ENV=test TEST_TYPE=func && node test/common/parallelTests.js functional-http-get @slow',
				maxBuffer: maxBufferSize
			},

			testFunctionalHttpPost: {
				command: 'export NODE_ENV=test TEST_TYPE=func && node test/common/parallelTests.js functional-http-post',
				maxBuffer: maxBufferSize
			},

			testFunctionalSystem: {
				command: 'export NODE_ENV=test TEST_TYPE=func && node test/common/parallelTests.js functional-system',
				maxBuffer: maxBufferSize
			},

			testFunctionalPool: {
				command: 'export NODE_ENV=test TEST_TYPE=func && node test/functional/pool/index.js',
				maxBuffer: maxBufferSize
			},

			testIntegration: {
				command: './node_modules/.bin/_mocha --bail test/integration/index.js --grep @slow --invert',
				maxBuffer: maxBufferSize
			},

			testIntegrationExtensive: {
				command: './node_modules/.bin/_mocha --bail test/integration/index.js',
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
				'test',
				'scripts'
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
	grunt.registerTask('coverageReport', ['exec:coverageReport']);
	grunt.registerTask('eslint-nofix', ['eslint']);
	grunt.registerTask('test', ['test-unit', 'test-functional', 'test-integration']);
	grunt.registerTask('test-unit', ['eslint', 'exec:testUnit']);
	grunt.registerTask('test-unit-extensive', ['eslint', 'exec:testUnitExtensive']);
	grunt.registerTask('test-functional', ['test-functional-ws', 'test-functional-http-get', 'test-functional-http-post']);
	grunt.registerTask('test-functional-ws', ['eslint', 'exec:testFunctionalWs']);
	grunt.registerTask('test-functional-ws-extensive', ['eslint', 'exec:testFunctionalWsExtensive']);
	grunt.registerTask('test-functional-http-get', ['eslint', 'exec:testFunctionalHttpGet']);
	grunt.registerTask('test-functional-http-get-extensive', ['eslint', 'exec:testFunctionalHttpGetExtensive']);
	grunt.registerTask('test-functional-http-post', ['eslint', 'exec:testFunctionalHttpPost']);
	grunt.registerTask('test-functional-system', ['eslint', 'exec:testFunctionalSystem']);
	grunt.registerTask('test-integration', ['eslint', 'exec:testIntegration']);
	grunt.registerTask('test-integration-extensive', ['eslint', 'exec:testIntegrationExtensive']);

	grunt.registerTask('eslint-fix', 'Run eslint and fix formatting', function () {
		grunt.config.set('eslint.options.fix', true);
		grunt.task.run('eslint');
	});
};
