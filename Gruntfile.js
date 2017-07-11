module.exports = function (grunt) {

	// Add the grunt-mocha-test tasks.
	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('gruntify-eslint');

	grunt.initConfig({
		// Configure a mochaTest task
		mochaTest: {
			test: {
				options: {
					reporter: 'spec',
					quiet: false, // Optionally suppress output to standard out (defaults to false)
					clearRequireCache: false, // Optionally clear the require cache before running tests (defaults to false)
					noFail: false // Optionally set to not fail on failed tests (will still fail on other errors)
				},
				src: ['test/**/*.js']
			}
		},
		// Configure EsLint
		eslint: {
			src: [
				'index.js',
				'bin/**/*.js',
				'src/**/*.js',
				'test/**/*.js',
				'Gruntfile.js'
			]
		}
	});

	grunt.registerTask('default', ['mochaTest', 'eslint']);
	grunt.registerTask('eslint-fix', 'Run eslint and fix formatting', function () {
		grunt.config.set('eslint.options.fix', true);
		grunt.task.run('eslint');
	});

};
