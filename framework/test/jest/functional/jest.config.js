const base = require('../config/jest.config.base');

module.exports = {
	...base,
	testMatch: [
		'<rootDir>/framework/test/jest/functional/specs/**/*.(spec|test).js',
	],
	coverageDirectory: '.coverage/functional',
};
