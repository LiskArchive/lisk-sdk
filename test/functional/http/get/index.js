'use strict';

var parallelTests = require('../../../common/parallelTests').parallelTests;

var pathFiles = [
	'./accounts',
	'./blocks',
	'./dapps',
	'./delegates',
	'./loader',
	'./multisignatures',
	'./multisignatures.post',
	'./node',
	'./peers',
	'./transactions',
];

parallelTests(pathFiles, 'test/functional/http/get/');
