'use strict';

var _ = require('lodash');
var scClient = require('socketcluster-client');

var node = require('../../../node.js');
var http = require('../../../common/httpCommunication.js');
var peersSortFields = require('../../../../sql/peers').sortFields;
var wsServer = require('../../../common/wsServer');
var testConfig = require('../../../config.json');

describe('GET /api/peers', function () {

	var validHeaders;
	var wsServerPort = 9998;
	var originalWsServerPort;

	before(function (done) {
		originalWsServerPort = wsServer.options.port;
		wsServer.options.port = wsServerPort;
		validHeaders = node.generatePeerHeaders('127.0.0.1', wsServer.options.port);
		wsServer.start();
		var validClientSocketOptions = {
			protocol: 'http',
			hostname: '127.0.0.1',
			port: testConfig.port,
			query: _.clone(validHeaders)
		};
		var clientSocket = scClient.connect(validClientSocketOptions);
		clientSocket.on('connectAbort', done);
		clientSocket.on('connect', done.bind(null, null));
		clientSocket.on('disconnect', done);
		clientSocket.on('error', done);
	});

	after(function () {
		wsServer.stop();
		wsServer.options.port = originalWsServerPort;
	});

	describe('GET /api/peers', function () {

		describe('ip', function () {

			it('using invalid ip should fail', function (done) {
				var ip = 'invalid';
				var params = 'ip=' + ip;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('message').to.equal('Object didn\'t pass validation for format ip: invalid');
					done();
				});
			});

			it('using valid ip should be ok', function (done) {
				var params = 'ip=' + validHeaders.ip;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('peers');
					done();
				});
			});
		});

		describe('port', function () {

			it('using port = 65535 be ok', function (done) {
				var port = 65535;
				var params = 'port=' + port;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('peers');
					done();
				});
			});

			it('using port = 9998 should return the result', function (done) {
				var params = 'port=' + validHeaders.port;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('peers').to.be.an('array').that.have.nested.property('0.port').equal(wsServerPort);
					done();
				});
			});

			it('using port < 1 should fail', function (done) {
				var port = 0;
				var params = 'port=' + port;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('message').to.equal('Value 0 is less than minimum 1');
					done();
				});
			});

			it('using port > 65535 should fail', function (done) {
				var port = 65536;
				var params = 'port=' + port;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('message').to.equal('Value 65536 is greater than maximum 65535');
					done();
				});
			});
		});

		describe('httpPort', function () {

			it('using httpPort = 65535 be ok', function (done) {
				var port = 65535;
				var params = 'httpPort=' + port;

				http.get('/api/peers?' + params, function (err, res) {
					done();
				});
			});

			it('using httpPort = 4000 should return the result', function (done) {
				var params = 'httpPort=' + validHeaders.httpPort;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('peers').to.be.an('array').that.have.nested.property('0.httpPort').equal(node.config.httpPort);
					done();
				});
			});

			it('using httpPort < 1 should fail', function (done) {
				var port = 0;
				var params = 'httpPort=' + port;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('message').to.equal('Value 0 is less than minimum 1');
					done();
				});
			});

			it('using httpPort > 65535 should fail', function (done) {
				var port = 65536;
				var params = 'httpPort=' + port;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('message').to.equal('Value 65536 is greater than maximum 65535');
					done();
				});
			});
		});

		describe('state', function () {

			it('using state = 0 should be ok', function (done) {
				var state = 0;
				var params = 'state=' + state;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('peers').that.is.an('array');
					done();
				});
			});

			it('using state = 1 should be ok', function (done) {
				var state = 1;
				var params = 'state=' + state;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('peers').that.is.an('array');
					done();
				});
			});

			it('using state = 2 should be ok', function (done) {
				var state = 2;
				var params = 'state=' + state;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('peers').that.is.an('array');
					done();
				});
			});

			it('using state = 2 should return the result', function (done) {
				var params = 'state=' + validHeaders.status;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('peers').to.be.an('array').that.have.nested.property('0.state').equal(2);
					done();
				});
			});

			it('using state > 2 should fail', function (done) {
				var state = 3;
				var params = 'state=' + state;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('message').to.equal('Value 3 is greater than maximum 2');
					done();
				});
			});
		});

		describe('version', function () {

			it('using version = "999.999.999a" characters should be ok', function (done) {
				var version = '999.999.999a';
				var params = 'version=' + version;

				http.get('/api/peers?' + params, function (err, res) {
					done();
				});
			});

			it('using version = "0.0.0a" should return the result', function (done) {
				var params = 'version=' + validHeaders.version;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('peers').to.be.an('array').that.have.nested.property('0.version').equal(validHeaders.version);
					done();
				});
			});

			it('using version = "9999.999.999" characters should fail', function (done) {
				var version = '9999.999.999';
				var params = 'version=' + version;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('message').to.equal('Object didn\'t pass validation for format version: 9999.999.999');
					done();
				});
			});

			it('using version = "999.9999.999" characters should fail', function (done) {
				var version = '999.9999.999';
				var params = 'version=' + version;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('message').to.equal('Object didn\'t pass validation for format version: 999.9999.999');
					done();
				});
			});

			it('using version = "999.999.9999" characters should fail', function (done) {
				var version = '999.999.9999';
				var params = 'version=' + version;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('message').to.equal('Object didn\'t pass validation for format version: 999.999.9999');
					done();
				});
			});

			it('using version = "999.999.999ab" characters should fail', function (done) {
				var version = '999.999.999ab';
				var params = 'version=' + version;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('message').to.equal('Object didn\'t pass validation for format version: 999.999.999ab');
					done();
				});
			});
		});

		describe('broadhash', function () {

			it('using valid broadhash should be ok', function (done) {
				var broadhash = node.config.nethash;
				var params = 'broadhash=' + broadhash;

				http.get('/api/peers?' + params, function (err, res) {
					done();
				});
			});

			it('using valid broadhash = "198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d" should return the result', function (done) {
				var params = 'broadhash=' + validHeaders.broadhash;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('peers').to.be.an('array').that.have.nested.property('0.broadhash').equal(validHeaders.broadhash);
					done();
				});
			});

			it('using invalid broadhash should fail', function (done) {
				var broadhash = 'invalid';
				var params = 'broadhash=' + broadhash;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('message').to.equal('Object didn\'t pass validation for format hex: invalid');
					done();
				});
			});
		});

		describe('sort', function () {

			it('using sort = "state:desc" should be ok', function (done) {
				var orderBy = 'state:desc';
				var params = 'orderBy=' + orderBy;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('peers').that.is.an('array');

					if (res.body.peers.length > 0) {
						for (var i = 0; i < res.body.peers.length; i++) {
							if (res.body.peers[i + 1] != null) {
								node.expect(res.body.peers[i + 1].state).to.be.at.most(res.body.peers[i].state);
							}
						}
					}

					done();
				});
			});

			it('using sort with any of sort fields should not place NULLs first', function (done) {
				node.async.each(peersSortFields, function (sortField, cb) {
					http.get('/api/peers?orderBy=' + sortField, function (err, res) {
						node.expect(res.body).to.have.property('peers').that.is.an('array');

						var dividedIndices = res.body.peers.reduce(function (memo, peer, index) {
							memo[peer[sortField] == null ? 'nullIndices' : 'notNullIndices'].push(index);
							return memo;
						}, {notNullIndices: [], nullIndices: []});

						if (dividedIndices.nullIndices.length && dividedIndices.notNullIndices.length) {
							var ascOrder = function (a, b) {
								return a - b;
							};
							dividedIndices.notNullIndices.sort(ascOrder);
							dividedIndices.nullIndices.sort(ascOrder);

							node.expect(dividedIndices.notNullIndices[dividedIndices.notNullIndices.length - 1])
								.to.be.at.most(dividedIndices.nullIndices[0]);
						}
						cb();
					});
				}, function () {
					done();
				});
			});
		});

		describe('limit', function () {

			it('using string limit should fail', function (done) {
				var limit = 'one';
				var params = 'limit=' + limit;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('message').to.equal('Expected type integer but found type string');
					done();
				});
			});

			it('using limit = -1 should fail', function (done) {
				var limit = -1;
				var params = 'limit=' + limit;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('message').to.equal('Value -1 is less than minimum 1');
					done();
				});
			});

			it('using limit = 0 should fail', function (done) {
				var limit = 0;
				var params = 'limit=' + limit;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('message').to.equal('Value 0 is less than minimum 1');
					done();
				});
			});

			it('using limit = 1 should be ok', function (done) {
				var limit = 1;
				var params = 'limit=' + limit;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('peers').that.is.an('array');
					node.expect(res.body.peers.length).to.be.at.most(limit);
					done();
				});
			});

			it('using limit = 100 should be ok', function (done) {
				var limit = 100;
				var params = 'limit=' + limit;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('peers').that.is.an('array');
					node.expect(res.body.peers.length).to.be.at.most(limit);
					done();
				});
			});

			it('using limit > 100 should fail', function (done) {
				var limit = 101;
				var params = 'limit=' + limit;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('message').to.equal('Value 101 is greater than maximum 100');
					done();
				});
			});
		});

		describe('offset', function () {

			it('using string offset should fail', function (done) {
				var offset = 'one';
				var params = 'offset=' + offset;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('message').to.equal('Expected type integer but found type string');
					done();
				});
			});

			it('using offset = -1 should fail', function (done) {
				var offset = -1;
				var params = 'offset=' + offset;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('message').to.equal('Value -1 is less than minimum 0');
					done();
				});
			});

			it('using offset = 1 should be ok', function (done) {
				var offset = 1;
				var params = 'offset=' + offset;

				http.get('/api/peers?' + params, function (err, res) {
					node.expect(res.body).to.have.property('peers').that.is.an('array');
					done();
				});
			});
		});

		describe('GET /api/peers codes', function () {

			describe('when query is malformed', function () {

				var invalidParams = 'port="invalidValue"';

				it('should return http code = 400', function (done) {
					http.get('/api/peers?' + invalidParams, function (err, res) {
						node.expect(res).to.have.property('status').equal(400);
						done();
					});
				});
			});

			describe('when query does not return results', function () {

				var notExistingPort = 1111;
				var emptyResultParams = 'port=' + notExistingPort;

				it('should return http code = 200', function (done) {
					http.get('/api/peers?' + emptyResultParams, function (err, res) {
						node.expect(res).to.have.property('status').equal(200);
						done();
					});
				});
			});

			describe('when query returns results', function () {

				var validParams;

				before(function () {
					validParams = 'port=' + validHeaders.port;
				});

				it('should return http code = 200', function (done) {
					http.get('/api/peers?' + validParams, function (err, res) {
						node.expect(res).to.have.property('status').equal(200);
						done();
					});
				});
			});
		});

		describe('/unknown', function () {

			it('should not to do anything', function (done) {
				http.get('/api/peers/unknown', function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('error').to.equal('API endpoint not found');
					done();
				});
			});
		});
	});
});
