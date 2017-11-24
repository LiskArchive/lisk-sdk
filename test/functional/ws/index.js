'use strict';

var parallelTests = require('../../common/parallelTests').parallelTests;

var pathFiles = [
	'./transport',
	'./transport.blocks',
	'./transport.client',
	'./transport.handshake',
	'./transport.transactions',
	'./transport.transactions.stress'
];

parallelTests(pathFiles, 'test/functional/ws/');
