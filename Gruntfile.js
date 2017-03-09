module.exports = function (grunt) {
	require('load-grunt-tasks')(grunt);

	grunt.initConfig({
		eslint: {
			options: {
				configFile: 'eslint_ecma5.json',
				reset: true
			},
			target: ['lib/**', 'test/**', 'Gruntfile.js', 'index.js']
		},

		pkg: grunt.file.readJSON('package.json'),

		browserify: {
			js: {
				src: './index.js',
				dest: './dist/lisk-js.js'
			},
			options: {
				browserifyOptions: {
					standalone: 'lisk'
				}
			}
		},

		watch: {
			scripts: {
				files: ['lib/*.js'],
				tasks: ['eslint', 'browserify'],
				options: {
					spawn: false,
					livereload: true
				},
			},
		},

		exec: {
			coverageSingle: {
				command: 'node_modules/.bin/istanbul cover --dir test/.coverage-unit ./node_modules/.bin/_mocha $TEST'
			}
		},

		uglify: {
			options: {
				mangle: false
			},
			myTarget: {
				files: {
					'dist/lisk-js.min.js': ['./index.js']
				}
			}
		},

		coveralls: {
			options: {
				debug: true,
				coverageDir: 'coverage',
				dryRun: true,
				force: true,
				recursive: true
			}
		}
	});

	grunt.loadNpmTasks('grunt-browserify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-force');
	grunt.loadNpmTasks('grunt-karma-coveralls');
	grunt.registerTask('travis', ['eslint', 'exec:coverageSingle', 'coveralls']);
	grunt.registerTask('default', [
		'force:on',
		'browserify',
		'eslint',
		'uglify',
		'watch'
	]);
};
