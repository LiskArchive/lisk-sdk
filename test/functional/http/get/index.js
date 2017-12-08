'use strict';

var parallelTests = require('../../../common/parallelTests').parallelTests;

var pathFiles = [
	'./accounts',
	'./blocks',
	'./dapps',
	'./delegates',
	'./multisignatures',
	'./node',
	'./peers',
	'./transactions',
	'./voters',
	'./votes'
];

parallelTests(pathFiles, 'test/functional/http/get/');
