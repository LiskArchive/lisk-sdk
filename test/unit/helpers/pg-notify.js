'use strict';

// Init tests dependencies
var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');

// Load config file - global (not one from test directory)
var config = require('../../../config.json');

// Init tests subject
var pg_notify = require('../../../helpers/pg-notify.js');

// Init global variables
var db, invalid_db, logger, bus;

describe('helpers/pg-notify', function () {

	before(function (done) {
		// Init dummy connection with database - valid, used for tests here
		// We don't use pg-native here on purpose - it lacks some properties on notifications objects, and we need those to perform detailed tests
		var pgp = require('pg-promise')();
		config.db.user = config.db.user || process.env.USER;
		db = pgp(config.db);

		// Init dummy connection with database - invalid one
		invalid_db = pgp({user: 'invalidUser'});

		// Set spies for logger
		logger = {
			debug: sinon.spy(),
			info:  sinon.spy(),
			error: sinon.spy()
		};

		// Set spy for bus
		bus = {
			message: sinon.spy()
		};

		done();
	});

	beforeEach(function () {
		// Reset state of spies
		logger.debug.reset();
		logger.info.reset();
		logger.error.reset();
		bus.message.reset();
	});

	describe('init', function () {
		it('try to estabilish initial connection with valid params should succeed', function (done) {
			pg_notify.init(db, bus, logger, function () {
				expect(logger.info.args[0][0]).equal('pg-notify: Initial connection estabilished');
				done();
			});
		});

		it('try to estabilish initial connection with invalid params should fail after 1 retry', function (done) {
			pg_notify.init(invalid_db, bus, logger, function () {
				// First try
				expect(logger.error.args[0][0]).equal('pg-notify: Error connecting');
				expect(logger.error.args[0][1]).to.be.an('error');
				expect(logger.error.args[0][1].message).equal('password authentication failed for user "invalidUser"');
				// Retry
				expect(logger.error.args[1][0]).equal('pg-notify: Initial connection failed');
				expect(logger.error.args[1][1]).to.be.an('error');
				expect(logger.error.args[1][1].message).equal('password authentication failed for user "invalidUser"');
				done();
			});
		});
	});
});
