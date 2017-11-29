'use strict';

// Root object
var test = {};

test.supertest = require('supertest');

test.config = require('./data/config.json');

// Optional logging
if (process.env.SILENT === 'true') {
	test.debug = function () { };
} else {
	test.debug = console.log;
}

// Node configuration
test.baseUrl = 'http://' + test.config.address + ':' + test.config.httpPort;
test.api = test.supertest(test.baseUrl);

// Exports
module.exports = test;