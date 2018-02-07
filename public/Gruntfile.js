module.exports = function (grunt) {
    require('jit-grunt')(grunt, {
      'nggettext_extract': 'grunt-angular-gettext',
      'nggettext_compile': 'grunt-angular-gettext',
    }); 

    var files = [
        "js/main.js",
        "js/modal.js",
        "js/ui-bootstrap.js"
    ];

    var withoutBrowserify = ['static/js/br_app.js', 'static/js/translations.js', 'bower_components/underscore/underscore.js', 'bower_components/materialize/dist/js/materialize.js', 'bower_components/clipboard/dist/clipboard.js', 'bower_components/moment/min/moment.min.js'];

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        nggettext_extract: {
            pot: {
                files: {
                    'po/template.pot': [
                        'js/**/*.js',
                        '*.html',
                        'partials/*.html',
                        'partials/modals/*.html',
                        'template/tooltip/*.html'
                    ]
                }
            },
        },
        nggettext_compile: {
            all: {
                options: {
                    module: 'liskApp'
                },
                files: {
                    'static/js/translations.js': ['po/*.po']
                }
            }
        },
        cssmin: {
            release: {
                options: {
                    keepSpecialComments: "0"
                },
                files: {
                    "static/css/app.css": [
                        "node_modules/angular-chart.js/dist/angular-chart.css",
                        "bower_components/materialize/dist/css/materialize.css",
                        "bower_components/bootstrap/dist/css/bootstrap.css",
                        "node_modules/angular-modal/modal.css",
                        "node_modules/ng-table/ng-table.css",
                        "tmp/app.css"
                    ]
                }
            }
        },
        less: {
            release: {
                files: {
                    "tmp/app.css": [
                        "css/application.less"
                    ]
                }
            }
        },
        concat: {
            release: {
                files: {
                    "static/js/app.js": files
                }
            },
            withoutBrowserify: {
                files: {
                    "static/js/vendor_app.js": withoutBrowserify
                }
            }
        },
        browserify: {
            release: {
                src: 'static/js/app.js',
                dest: 'static/js/br_app.js'
            }
        },
        uglify: {
            release: {
                options: {
                    preserveComments: false,
                    wrap: false,
                    mangle: false
                },
                files: {
                    "static/js/app.js": files
                }
            }
        },
        watch: {
          js: {
              files: ["js/**/*.js"],
              tasks: ["concat:release", "browserify", "concat:withoutBrowserify", "uglify:release"]
          },
          css: {
             files: ["css/**/*.less"],
             tasks: ["less", "cssmin"]
          },
          po_extract: {
               files: ["partials/**/*.html"],
               tasks: ["nggettext_extract"]
          },
          po_compile: {
               files: ["po/*.mo", "po/*.po", "template.pot"],
               tasks: ["nggettext_compile"]
          },
          livereload: {
              options: {
                  livereload: 35729
              },
              files: [
                  "partials/{,**/}*.html",
                  "static/css/{,**/}*.css",
                  "static/js/{,**/}*.js"
              ]
          }
        }
    });

    grunt.registerTask("default", ["watch"]);
    grunt.registerTask("release", ["nggettext_extract", "nggettext_compile", "less", "cssmin", "concat:release", "browserify", "concat:withoutBrowserify", "uglify:release"]);
};
