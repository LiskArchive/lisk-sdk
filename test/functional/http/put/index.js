'use strict';

var parallelTests = require('../../../common/parallelTests').parallelTests;

var pathFiles = [
	'./node'
];

parallelTests(pathFiles, 'test/functional/http/put/');
