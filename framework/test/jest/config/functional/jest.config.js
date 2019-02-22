const base = require('../jest.config.base');

module.exports = {
	...base,
	testMatch: ['<rootDir>/test/jest/specs/functional/**/*.(spec|test).js'],
};
