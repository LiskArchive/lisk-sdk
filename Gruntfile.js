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
			options: {
				configFile: 'conf/eslint.json'
			},
			src: ['index.js', 'commands/**/*.js', 'src/**/*.js', 'test/**/*.js']
		}
	});

	grunt.registerTask('default', ['mochaTest', 'eslint']);

};