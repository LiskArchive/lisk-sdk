const base = require('../jest.config.base');

module.exports = {
	...base,
	testMatch: ['<rootDir>/framework/test/jest/specs/unit/**/*.(spec|test).js'],
	clearMocks: true,
	coverageDirectory: '.coverage/unit',
	collectCoverageFrom: [
		'framework/src/controller/**',
		'framework/src/components/**',
	],
};
