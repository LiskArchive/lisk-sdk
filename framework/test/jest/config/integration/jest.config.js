const base = require('../jest.config.base');

module.exports = {
	...base,
	testMatch: ['<rootDir>/test/jest/specs/integration/**/*.(spec|test).js'],
};
