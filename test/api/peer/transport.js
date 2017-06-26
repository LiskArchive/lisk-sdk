'use strict';

var Q = require('q');
var _ = require('lodash');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');

var node = require('../../node');
var ws = require('../../common/wsCommunication');


describe('handshake', function () {

	var socketDefer = null;

	beforeEach(function () {
		socketDefer = Q.defer();
	});

	it('should not connect without headers', function (done) {

		ws.connect('127.0.0.1', 4000, socketDefer, null);

		socketDefer.promise
			.then(function (socket) {
				return done('Should not be here');
			}).catch(function () {
				return done();
			});
	});

	it('using incorrect nethash in headers should fail', function (done) {
		socketDefer = Q.defer();

		var headers = node.generatePeerHeaders('127.0.0.1', 4002);
		headers['nethash'] = 'incorrect';

		ws.connect('127.0.0.1', 4000, socketDefer, headers);

		socketDefer.promise
			.then(function (socket) {
				return done('Should not be here');
			}).catch(function (err) {
				return done();
			});
	});

	it('using incorrect version in headers should fail', function (done) {
		socketDefer = Q.defer();

		var headers = node.generatePeerHeaders('127.0.0.1', 4002);
		headers['version'] = '0.1.0a';

		ws.connect('127.0.0.1', 4000, socketDefer, headers);

		socketDefer.promise
			.then(function (socket) {
				return done('Should not be here');
			}).catch(function (err) {
				return done();
			});
	});

	it('should not accept itself as a peer', function (done) {
		socketDefer = Q.defer();

		var headers = node.generatePeerHeaders('127.0.0.1', 4000);
		headers['version'] = '0.1.0a';

		ws.connect('127.0.0.1', 4000, socketDefer, headers);

		socketDefer.promise
			.then(function (socket) {
				return done('Should not be here');
			}).catch(function (err) {
				return done();
			});
	});

	it('should connect with valid options', function (done) {

		var socketDefer = Q.defer();

		ws.connect('127.0.0.1', 4000, socketDefer, node.generatePeerHeaders('127.0.0.1', 4002));

		socketDefer.promise
			.then(function (socket) {
				socket.disconnect();
				return done();
			}).catch(function (err) {
				return done(err);
			});
	});

	it('should list connected peer properly', function (done) {

		var socketDefer = Q.defer();

		ws.connect('127.0.0.1', 4000, socketDefer, node.generatePeerHeaders('127.0.0.1', 4002));

		socketDefer.promise
			.then(function (socket) {
				socket.wampSend('list').then(function (res) {
					node.debug('> Response:'.grey, JSON.stringify(res));
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('peers').that.is.an('array').and.not.empty;
					res.peers.forEach(function (peer) {
						node.expect(peer).to.have.property('ip').that.is.a('string');
						node.expect(peer).to.have.property('port').that.is.a('number');
						node.expect(peer).to.have.property('state').that.is.a('number');
						node.expect(peer).to.have.property('os');
						node.expect(peer).to.have.property('version');
						node.expect(peer).to.have.property('broadhash');
						node.expect(peer).to.have.property('height');
					});
				}).catch(function (err) {
					done(err);
				});
				return done();
			}).catch(function (err) {
				return done(err);
			});
	});


});

describe('RPC', function () {

	var clientSocket;

	before(function (done) {
		var socketDefer = Q.defer();
		ws.connect('127.0.0.1', 4000, socketDefer);
		socketDefer.promise
			.then(function (socket) {
				clientSocket = socket;
				return done();
			}).catch(function (err) {
				return done(err);
			});
	});

	describe('ping', function () {

		it('should return true', function (done) {
			clientSocket.wampSend('ping')
				.then(function (result) {
					node.expect(result).to.have.property('success').to.be.ok;
					done();
				}).catch(function (err) {
					done(err);
				});
		});
	});

	describe('height', function () {

		it('should return height', function (done) {
			clientSocket.wampSend('height')
				.then(function (result) {
					node.expect(result).to.have.property('success').to.be.ok;
					node.expect(result).to.have.property('height').to.be.a('number');
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
					node.expect(result).to.have.property('height').to.be.a('number');
					node.expect(result).to.have.property('broadhash').to.be.a('string');
					done();
				}).catch(function (err) {
					done(err);
				});
		});
	});

	describe('list', function () {

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

		it('should should work ok with asking for a list multiple times', function (done) {

			for (var i = 0; i < 100; i += 1) {
				clientSocket.wampSend('list')
					.then(function (result) {
						node.expect(result).to.have.property('success').to.be.ok;
						node.expect(result).to.have.property('peers').to.be.an('array');
						done();
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
