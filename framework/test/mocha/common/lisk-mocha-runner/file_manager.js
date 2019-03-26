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

const find = require('find');

const testTypesMap = {
	unit: 'framework/test/mocha/unit/',
	integration: 'framework/test/mocha/integration/',
	'functional:ws': 'framework/test/mocha/functional/ws/',
	'functional:get': 'framework/test/mocha/functional/http/get/',
	'functional:post': 'framework/test/mocha/functional/http/post/',
	'functional:put': 'framework/test/mocha/functional/http/put/',
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

	throw new Error(
		`Please specify a valid test type! Available Options: ${Object.keys(
			testTypesMap
		).join(', ')}`
	);
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
