'use strict';

var _ = require('lodash');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var scClient = require('socketcluster-client');

var node = require('../../node');
var randomPeer = require('../../common/objectStubs').randomPeer;
var testConfig = require('../../config.json');
var wsServer = require('../../common/wsServer');

describe('RPC', function () {

	var clientSocket;
	var validClientSocketOptions;
	var wampClient = new WAMPClient();
	var frozenHeaders = node.generatePeerHeaders('127.0.0.1', wsServer.port);

	before(function (done) {
		validClientSocketOptions = {
			protocol: 'http',
			hostname: '127.0.0.1',
			port: testConfig.port,
			query: _.clone(frozenHeaders)
		};
		clientSocket = scClient.connect(validClientSocketOptions);
		wampClient.upgradeToWAMP(clientSocket);
		clientSocket.on('connectAbort', done);
		clientSocket.on('connect', done.bind(null, null));
		clientSocket.on('disconnect', done);
		clientSocket.on('error', done);
	});

	describe('internal', function () {

		describe('acceptPeer', function () {
			var validPeer;
			var validAcceptRequest;

			beforeEach(function () {
				validAcceptRequest = {
					authKey: 'authentication key',
					peer: randomPeer
				};
				validPeer = _.clone(randomPeer);
			});

			describe('schema', function () {

				it('should reject empty request', function (done) {
					clientSocket.wampSend('acceptPeer', undefined)
						.then(function (err, res) {
							done('should not be here');
						})
						.catch(function (err) {
							node.expect(err).to.equal('Expected type object but found type undefined');
							done();
						});
				});

				it('should reject requests without peer field defined', function (done) {
					delete validAcceptRequest.peer;
					clientSocket.wampSend('acceptPeer', validAcceptRequest)
						.then(function (err, res) {
							done('should not be here');
						})
						.catch(function (err) {
							node.expect(err).to.equal('Missing required property: peer');
							done();
						});
				});

				it('should reject requests without authKey field defined', function (done) {
					delete validAcceptRequest.authKey;
					clientSocket.wampSend('acceptPeer', validAcceptRequest)
						.then(function (err, res) {
							done('should not be here');
						})
						.catch(function (err) {
							node.expect(err).to.equal('Missing required property: authKey');
							done();
						});
				});

				it('should reject requests with incorrect authKey', function (done) {
					validAcceptRequest.authKey = 'incorrect authKey';
					clientSocket.wampSend('acceptPeer', validAcceptRequest)
						.then(function (err, res) {
							done('should not be here');
						})
						.catch(function (err) {
							node.expect(err).to.equal('Unable to access internal function - Incorrect authKey');
							done();
						});
				});
			});
		});

		describe('removePeer', function () {
			var validPeer;
			var validRemoveRequest;

			beforeEach(function () {
				validRemoveRequest = {
					authKey: 'authentication key',
					peer: randomPeer
				};
				validPeer = _.clone(randomPeer);
			});

			describe('schema', function () {

				it('should reject empty request', function (done) {
					clientSocket.wampSend('removePeer', undefined)
						.then(function (err, res) {
							done('should not be here');
						})
						.catch(function (err) {
							node.expect(err).to.equal('Expected type object but found type undefined');
							done();
						});
				});

				it('should reject requests without peer field defined', function (done) {
					delete validRemoveRequest.peer;
					clientSocket.wampSend('removePeer', validRemoveRequest)
						.then(function (err, res) {
							done('should not be here');
						})
						.catch(function (err) {
							node.expect(err).to.equal('Missing required property: peer');
							done();
						});
				});

				it('should reject requests without authKey field defined', function (done) {
					delete validRemoveRequest.authKey;
					clientSocket.wampSend('removePeer', validRemoveRequest)
						.then(function (err, res) {
							done('should not be here');
						})
						.catch(function (err) {
							node.expect(err).to.equal('Missing required property: authKey');
							done();
						});
				});

				it('should reject requests with incorrect authKey', function (done) {
					validRemoveRequest.authKey = 'incorrect authKey';
					clientSocket.wampSend('removePeer', validRemoveRequest)
						.then(function (err, res) {
							done('should not be here');
						})
						.catch(function (err) {
							node.expect(err).to.equal('Unable to access internal function - Incorrect authKey');
							done();
						});
				});
			});
		});
	});

	describe('height', function () {

		it('should return height', function (done) {
			clientSocket.wampSend('height')
				.then(function (result) {
					node.expect(result).to.have.property('success').to.be.ok;
					node.expect(result).to.have.property('height').that.is.a('number').at.least(1);
					done();
				}).catch(function (err) {
					done(err);
				});
		});
	});

	describe('status', function () {

		it('should return height and broadhash', function (done) {
			clientSocket.wampSend('status')
				.then(function (result) {
					node.expect(result).to.have.property('success').to.be.ok;
					node.expect(result).to.have.property('broadhash').that.is.a('string');
					node.expect(result).to.have.property('nonce').that.is.a('string');
					node.expect(result).to.have.property('height').that.is.a('number').at.least(1);
					done();
				}).catch(function (err) {
					done(err);
				});
		});
	});

	describe('list', function () {

		var validPeer;

		beforeEach(function () {
			validPeer = _.clone(randomPeer);
		});

		it('should return list of peers', function (done) {
			clientSocket.wampSend('list')
				.then(function (result) {
					node.expect(result).to.have.property('success').to.be.ok;
					node.expect(result).to.have.property('peers').to.be.an('array');
					done();
				}).catch(function (err) {
					done(err);
				});
		});

		it('asking for a list multiple times should be ok', function (done) {

			var successfulAsks = 0;
			for (var i = 0; i < 100; i += 1) {
				clientSocket.wampSend('list')
					.then(function (result) {
						node.expect(result).to.have.property('success').to.be.ok;
						node.expect(result).to.have.property('peers').to.be.an('array');
						successfulAsks += 1;
						if (successfulAsks === 100) {
							done();
						}
					}).catch(function (err) {
						done(err);
					});
			}
		});
	});

	describe('blocks', function () {

		it('should return height and broadhash', function (done) {
			clientSocket.wampSend('blocks')
				.then(function (result) {
					node.expect(result).to.have.property('blocks').to.be.an('array');
					done();
				}).catch(function (err) {
					done(err);
				});
		});
	});
});
