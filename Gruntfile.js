module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        browserify: {
            'app.js': ['index.js']
        }
    })
    grunt.loadNpmTasks('grunt-browserify')
}