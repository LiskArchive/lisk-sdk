/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';

module.exports = function(grunt) {
	grunt.registerTask('mocha', 'Run test suite.', (tag, suite, section) => {
		if (['unit', 'functional', 'integration'].indexOf(suite) < 0) {
			grunt.fail.fatal(
				'Please specify a test suite to run.\n\nExample: `grunt mocha:<tag>:<suite>:[section]` or `npm test -- mocha:<tag>:<suite>:[section]`\n\n- Where tag can be one of slow | unstable | untagged | extensive (required)\n- Where suite can be one of unit | functional | integration (required)\n- Where section can be one of get | post | ws | system (optional)'
			);
		} else {
			var toExecute = [tag, suite, section].filter(val => val).join(':');
			grunt.task.run(`exec:mocha:${toExecute}`);
		}
	});
};
