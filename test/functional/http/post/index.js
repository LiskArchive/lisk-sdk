'use strict';

var parallelTests = require('../../../common/parallelTests').parallelTests;

var pathFiles = [
	'./0.transfer',
	'./1.second.secret',
	'./2.delegate',
	'./3.votes',
];

parallelTests(pathFiles, 'test/functional/http/post/');
