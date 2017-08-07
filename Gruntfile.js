/* eslint-disable import/no-extraneous-dependencies */
const loadGruntTasks = require('load-grunt-tasks');

module.exports = function configureGrunt(grunt) {
	loadGruntTasks(grunt);

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		exec: {
			coverageSingle: './node_modules/.bin/nyc --report-dir=test/.coverage-unit --reporter=lcov ./node_modules/.bin/_mocha $TEST',
			prepareDistNode: 'rm -r dist-node/* || mkdir dist-node | echo',
			prepareDistBrowser: 'rm -r dist-browser/* || mkdir dist-browser | echo',
			babel: './node_modules/.bin/babel src --out-dir ./dist-node',
		},

		eslint: {
			target: ['src/**/*.js', 'test/**/*.js', 'Gruntfile.js', 'index.js'],
		},

		browserify: {
			js: {
				src: './dist-node/*',
				dest: './dist-browser/lisk-js.js',
			},
			options: {
				browserifyOptions: {
					standalone: 'lisk',
				},
			},
		},

		uglify: {
			options: {
				mangle: false,
			},
			myTarget: {
				files: {
					'dist-browser/lisk-js.min.js': ['dist-browser/lisk-js.js'],
				},
			},
		},

		coveralls: {
			src: 'test/.coverage-unit/*.info',
		},
	});

	grunt.registerTask('eslint-fix', 'Run eslint and fix formatting', () => {
		grunt.config.set('eslint.options.fix', true);
		grunt.task.run('eslint');
	});

	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-force');
	grunt.loadNpmTasks('grunt-coveralls');
	grunt.registerTask('jenkins', ['exec:coverageSingle', 'coveralls']);
	grunt.registerTask('eslint-ci', ['eslint']);
	grunt.registerTask('build', [
		'exec:prepareDistNode',
		'exec:prepareDistBrowser',
		'exec:babel',
		'browserify',
		'uglify',
	]);
	grunt.registerTask('default', [
		'eslint',
		'exec:coverageSingle',
		'build',
	]);
};
