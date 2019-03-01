const base = require('../jest.config.base');

module.exports = {
	...base,
	testMatch: [
		'<rootDir>/framework/test/jest/specs/functional/**/*.(spec|test).js',
	],
	coverageDirectory: '.coverage/functional',
};
