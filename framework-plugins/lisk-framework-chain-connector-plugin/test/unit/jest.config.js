const base = require('../../jest.config');

module.exports = {
	...base,
	rootDir: '../../',
	testMatch: ['<rootDir>/test/unit/**/*.(spec|test).(js|ts)'],
};
