'use strict';

// Init tests dependencies
var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');
var rewire = require('rewire');

// Load config file - global (not one from test directory)
var config = require('../../../config.json');
var sql = require('../../sql/pgNotify.js');

// Init tests subject
var pg_notify = rewire('../../../helpers/pg-notify.js');

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

	function resetSpiesState () {
		// Reset state of spies
		logger.debug.reset();
		logger.info.reset();
		logger.error.reset();
		bus.message.reset();
	}

	function failQueryBatch (t) {
		var queries = [];
		queries.push(t.none('SELECT invalid_sql_query'));
		return t.batch(queries);
	}

	function reconnect (done) {
		pg_notify.init(db, bus, logger, function (err) {
			// Should be no error
			expect(err).to.be.an('undefined');
			expect(logger.info.args[0][0]).to.equal('pg-notify: Initial connection estabilished');
			done();
		});
	}

	beforeEach(function (done) {
		resetSpiesState();
		reconnect(done);
	});

	describe('init', function () {
		it('try to estabilish initial connection with valid params should succeed', function (done) {
			pg_notify.init(db, bus, logger, function (err) {
				// Should be no error
				expect(err).to.be.an('undefined');
				expect(logger.info.args[0][0]).to.equal('pg-notify: Initial connection estabilished');
				done();
			});
		});

		it('try to estabilish initial connection with invalid params should fail after 1 retry', function (done) {
			pg_notify.init(invalid_db, bus, logger, function (err) {
				var err_msg = 'password authentication failed for user "invalidUser"';
				// Error should propagate
				expect(err).to.be.an('error');
				expect(err.message).to.equal(err_msg);
				// First try
				expect(logger.error.args[0][0]).to.equal('pg-notify: Error connecting');
				expect(logger.error.args[0][1]).to.be.an('error');
				expect(logger.error.args[0][1].message).to.equal(err_msg);
				// Retry
				expect(logger.error.args[1][0]).to.equal('pg-notify: Initial connection failed');
				expect(logger.error.args[1][1]).to.be.an('error');
				expect(logger.error.args[1][1].message).to.equal(err_msg);
				done();
			});
		});

		it('try to estabilish initial connection with valid params but error during LISTEN queries should fail after 1 retry', function (done) {
			// Spy private functions
			var setListeners = pg_notify.__get__('setListeners');
			var connection = pg_notify.__get__('connection');
			// Overwrite listenQueries function with one that always fail
			var restore = pg_notify.__set__('listenQueries', failQueryBatch);

			pg_notify.init(db, bus, logger, function (err) {
				var err_msg = 'column "invalid_sql_query" does not exist';
				// Error should propagate
				expect(err).to.deep.include({name: 'BatchError', message: err_msg});
				// First try
				expect(logger.error.args[0][0]).to.equal('pg-notify: Failed to execute LISTEN queries');
				expect(logger.error.args[0][1]).to.deep.include({name: 'BatchError', message: err_msg});
				// Retry
				expect(logger.error.args[1][0]).to.equal('pg-notify: Initial connection failed');
				expect(logger.error.args[1][1]).to.deep.include({name: 'BatchError', message: err_msg});
				restore();
				done();
			});
		});
	});

	describe('setListeners', function () {
		it('listeners should be set correctly after successfull connection', function (done) {
			// Spy private functions
			var setListeners = pg_notify.__get__('setListeners');
			var connection = pg_notify.__get__('connection');
			var onNotification = pg_notify.__get__('onNotification');

			expect(setListeners).to.be.an('function');
			expect(connection).to.be.an('object').and.have.property('client');
			expect(connection.client._events.notification).to.be.an('function');
			expect(connection.client._events.notification).equal(onNotification);
			done();
		});

		it('should fail if error occurred during LISTEN queries', function (done) {
			// Spy private functions
			var setListeners = pg_notify.__get__('setListeners');
			var connection = pg_notify.__get__('connection');
			// Overwrite listenQueries function with one that always fail
			var restore = pg_notify.__set__('listenQueries', failQueryBatch);

			setListeners(connection.client, function (err) {
				expect(logger.error.args[0][0]).to.equal('pg-notify: Failed to execute LISTEN queries');
				expect(err).to.deep.include({name: 'BatchError', message: 'column "invalid_sql_query" does not exist'});
				restore();
				return done();
			});
		});
	});

	describe('isTestEnv', function () {
		it('should return true if NODE_ENV is TEST', function (done) {
			var node_env = process.env['NODE_ENV'];

			process.env['NODE_ENV'] = 'TEST';
			var isTestEnv = pg_notify.__get__('isTestEnv');
			expect(isTestEnv()).to.be.ok;
			process.env['NODE_ENV'] = node_env;
			done();
		});

		it('should return false if NODE_ENV is not TEST', function (done) {
			var node_env = process.env['NODE_ENV'];

			process.env['NODE_ENV'] = 'PRODUCTION';
			var isTestEnv = pg_notify.__get__('isTestEnv');
			expect(isTestEnv()).to.be.not.ok;
			process.env['NODE_ENV'] = node_env;
			done();
		});
	});

	describe('onConnectionLost', function () {
		it('should fail after 10 retries if cannot reconnect', function (done) {
			// Re-init connection
			pg_notify.init(invalid_db, bus, logger, function (err) {
				resetSpiesState();

				// Spy private functions
				var setListeners = pg_notify.__get__('setListeners');
				var connection = pg_notify.__get__('connection');

				// Execute query that terminate existing connection
				db.query(sql.interruptConnection, {database: config.db.database, pid: connection.client.processID}).then(setTimeout(function () {
					// 12 errors should be collected
					expect(logger.error.args).to.be.an('array').and.lengthOf(12);

					// First error is caused by our test SQL query
					expect(logger.error.args[0][0]).to.equal('pg-notify: Connection lost');
					expect(logger.error.args[0][1]).to.be.an('error');
					expect(logger.error.args[0][1].message).to.equal('terminating connection due to administrator command');

					var errors = logger.error.args.slice(1, 11);
					// Iterating over errors (failed retires)
					for (var i = errors.length - 1; i >= 0; i--) {
						expect(errors[0][0]).to.equal('pg-notify: Error connecting');
						expect(errors[0][1]).to.be.an('error');
						expect(errors[0][1].message).to.equal('password authentication failed for user "invalidUser"');
					}

					// Last error - function should fail to reconnect
					expect(logger.error.args[11][0]).to.equal('pg-notify: Failed to reconnect - connection lost');
					
					//Connection should be cleared
					connection = pg_notify.__get__('connection');
					expect(connection).to.be.an('null');

					done();
				}, 60000)).catch(function (err) {
					done(err);
				});
			});
		});

		it('should reconnect successfully if it\'s possible', function (done) {
			// Spy private functions
			var setListeners = pg_notify.__get__('setListeners');
			var connection = pg_notify.__get__('connection');

			resetSpiesState();

			// Execute query that terminate existing connection
			db.query(sql.interruptConnection, {pid: connection.client.processID}).then(setTimeout(function () {
				expect(logger.error.args[0][0]).to.equal('pg-notify: Connection lost');
				expect(logger.error.args[0][1]).to.be.an('error');
				expect(logger.error.args[0][1].message).to.equal('terminating connection due to administrator command');

				expect(logger.info.args[0][0]).to.equal('pg-notify: Reconnected successfully');
				done();
			}, 10000)).catch(function (err) {
				done(err);
			});
		});
	});

	describe('removeListeners', function () {
		it('listeners should be removed correctly', function (done) {
			// Spy private functions
			var removeListeners = pg_notify.__get__('removeListeners');
			var connection = pg_notify.__get__('connection');

			removeListeners(connection.client, function (err) {
				expect(removeListeners).to.be.an('function');
				expect(connection).to.be.an('object').and.have.property('client');
				expect(connection.client._events.notification).to.be.an('undefined');
				done();
			});
		});

		it('listeners should be removed correctly even if error occurred during UNLISTEN queries', function (done) {
			// Spy private functions
			var removeListeners = pg_notify.__get__('removeListeners');
			var connection = pg_notify.__get__('connection');
			// Overwrite listenQueries function with one that always fail
			var restore = pg_notify.__set__('unlistenQueries', failQueryBatch);

			removeListeners(connection.client, function (err) {
				expect(logger.error.args[0][0]).to.equal('pg-notify: Failed to execute UNLISTEN queries');
				expect(err).to.deep.include({name: 'BatchError', message: 'column "invalid_sql_query" does not exist'});
				restore();
				done();
			});
		});

		it('listeners should be removed correctly even if connection is null', function (done) {
			// Spy private functions
			var removeListeners = pg_notify.__get__('removeListeners');
			var connection = pg_notify.__get__('connection');
			// Overwrite connection object with null
			var restore = pg_notify.__set__('connection', null);

			removeListeners(connection.client, function (err) {
				expect(removeListeners).to.be.an('function');
				expect(connection).to.be.an('object').and.have.property('client');
				expect(connection.client._events.notification).to.be.an('undefined');
				restore();
				done();
			});
		});
	});
});
