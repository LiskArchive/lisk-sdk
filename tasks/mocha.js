'use strict';

module.exports = function (grunt) {
	grunt.registerTask('mocha', 'Run test suite.', function (tag, suite, section) {
		if (['unit', 'functional', 'integration'].indexOf(suite) < 0) {
			grunt.fail.fatal('Please specify a test suite to run.\n\nExample: `grunt mocha:<tag>:<suite>:[section]` or `npm test -- mocha:<tag>:<suite>:[section]`\n\n- Where tag can be one of slow | unstable | untagged | extensive (required)\n- Where suite can be one of unit | functional | integration (required)\n- Where section can be one of get | post | ws | system (optional)');
		} else {
			grunt.task.run('eslint');
			var toExecute = [
				tag,
				suite,
				section
			].filter(function (val) { return val; }).join(':');
			grunt.task.run('exec:mocha:' + toExecute);
		}
	});
};
