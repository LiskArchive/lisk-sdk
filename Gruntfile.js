module.exports = function(grunt) {

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        eslint: {
            options: {
                configFile: 'eslint_ecma5.json',
                reset: true
            },
            target: ['lib/**']
        },
        pkg: grunt.file.readJSON('package.json'),
        browserify: {
            'app.js': ['index.js']
        }
    });


    grunt.loadNpmTasks('grunt-browserify');
    grunt.registerTask("default", ["browserify", "eslint"]);
}