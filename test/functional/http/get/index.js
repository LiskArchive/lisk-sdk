'use strict';

var parallelTests = require('../../../common/parallelTests').parallelTests;

var pathFiles = [
	'./accounts',
	'./blocks',
	'./dapps',
	'./delegates',
	'./multisignatures',
	'./node',
	'./node.transactions.unconfirmed',
	'./node.transactions.unprocessed',
	'./node.transactions.unsigned',
	'./peers',
	'./transactions',
	'./voters'
];

parallelTests(pathFiles, 'test/functional/http/get/');
