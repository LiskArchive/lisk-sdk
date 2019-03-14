const find = require('find');

const testTypesMap = {
	unit: 'framework/test/mocha/unit/',
	integration: 'framework/test/mocha/integration/',
	'functional:ws': 'framework/test/mocha/functional/ws/',
	'functional:get': 'framework/test/mocha/functional/http/get/',
	'functional:post': 'framework/test/mocha/functional/http/post/',
	functional: 'framework/test/mocha/functional/',
	network: 'framework/test/mocha/network/',
};

const scanFiles = testType => {
	const folder = testTypesMap[testType];

	if (testType === 'network') {
		return [`${folder}index.js`];
	}

	if (folder) {
		return find.fileSync(/^((?!common)[\s\S])*.js$/, folder);
	}

	return [];
};

const getTestFiles = (testType, testPathPattern) => {
	const files = scanFiles(testType);

	/**
	 * Filter file list with matching pattern
	 */
	if (testPathPattern) {
		return files.filter(file => RegExp(testPathPattern, 'i').test(file));
	}

	return files;
};

module.exports = {
	getTestFiles,
};
