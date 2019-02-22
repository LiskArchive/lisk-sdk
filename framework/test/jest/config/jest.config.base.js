module.exports = {
	verbose: true,
	collectCoverage: true,
	rootDir: '../../../../../',
	setupFilesAfterEnv: ['<rootDir>/framework/test/jest/config/setup.js'],
	/**
		coverageThreshold: {
			global: {
				branches: 50,
				functions: 50,
				lines: 50,
				statements: 50,
			},
		},
*/
};
