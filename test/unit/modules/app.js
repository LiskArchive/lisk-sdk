'use strict';

var chai = require('chai');
var cluster = require('cluster');
var crypto = require('crypto');

var constants = require('../../../helpers/constants');
var config = require('../../config.json');

describe('app', function () {

	var app;

	before(function (done) {
		// Run the app on a different than default port
		process.argv.push('-p');
		process.argv.push(config.port += 1);
		process.argv.push('-h');
		process.argv.push(config.httpPort += 1);
		require('../../../app');
		// Wait for modules to be initialized
		setTimeout(done, 5000);
	});

	it('should be ok');
});
