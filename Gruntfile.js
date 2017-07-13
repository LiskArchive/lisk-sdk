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

	grunt.registerTask('default', ['mochaTest', 'eslint']);
	grunt.registerTask('eslint-fix', 'Run eslint and fix formatting', () => {
		grunt.config.set('eslint.options.fix', true);
		grunt.task.run('eslint');
	});
};
