'use strict';

var _ = require('lodash');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');
var node = require('../../node');
var ws = require('../../common/wsCommunication');
var PromiseDefer = require('../../../helpers/promiseDefer');
var randomPeer = require('../../common/objectStubs').randomPeer;


describe('handshake', function () {

	var socketDefer = null;

	beforeEach(function () {
		socketDefer = PromiseDefer();
	});

	it('should not connect without headers', function (done) {

		ws.connect('127.0.0.1', 5000, socketDefer, null);

		socketDefer.promise
			.then(function (socket) {
				return done('Should not be here');
			}).catch(function () {
				return done();
			});
	});

	it('using incorrect nethash in headers should fail', function (done) {
		socketDefer = PromiseDefer();

		var headers = node.generatePeerHeaders('127.0.0.1', 5002);
		headers['nethash'] = 'incorrect';

		ws.connect('127.0.0.1', 5000, socketDefer, headers);

		socketDefer.promise
			.then(function (socket) {
				return done('Should not be here');
			}).catch(function (err) {
				return done();
			});
	});

	it('using incorrect version in headers should fail', function (done) {
		socketDefer = PromiseDefer();

		var headers = node.generatePeerHeaders('127.0.0.1', 5002);
		headers['version'] = '0.1.0a';

		ws.connect('127.0.0.1', 5000, socketDefer, headers);

		socketDefer.promise
			.then(function (socket) {
				return done('Should not be here');
			}).catch(function (err) {
				return done();
			});
	});

	it('should not accept itself as a peer', function (done) {
		socketDefer = PromiseDefer();

		var headers = node.generatePeerHeaders('127.0.0.1', 5000);
		headers['version'] = '0.1.0a';

		ws.connect('127.0.0.1', 5000, socketDefer, headers);

		socketDefer.promise
			.then(function (socket) {
				return done('Should not be here');
			}).catch(function (err) {
				return done();
			});
	});

	it('should connect with valid options', function (done) {

		var socketDefer = PromiseDefer();

		ws.connect('127.0.0.1', 5000, socketDefer, node.generatePeerHeaders('127.0.0.1', 5002));

		socketDefer.promise
			.then(function (socket) {
				socket.disconnect();
				return done();
			}).catch(function (err) {
				return done(err);
			});
	});

	it.skip('should list connected peer properly', function (done) {

		var socketDefer = PromiseDefer();

		ws.connect('127.0.0.1', 5000, socketDefer, node.generatePeerHeaders('127.0.0.1', 5002));

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
		var socketDefer = PromiseDefer();
		ws.connect('127.0.0.1', 5000, socketDefer);
		socketDefer.promise
			.then(function (socket) {
				clientSocket = socket;
				return done();
			}).catch(function (err) {
				return done(err);
			});
	});

	describe('acceptPeer', function () {
		var validPeer;

		beforeEach(function () {
			validPeer = _.clone(randomPeer);
		});

		beforeEach(function (done) {
			clientSocket.wampSend('removePeer', validPeer)
				.then(function (err, res) {
					done();
				})
				.catch(function (err) {
					done();
				});
		});


		it('should not accept peer without ip', function (done) {

			delete validPeer.ip;

			clientSocket.wampSend('acceptPeer', validPeer)
				.then(function (err, res) {
					done('should fail while sending peer without ip');
				})
				.catch(function (err) {
					node.expect(err).to.equal('Failed to accept peer');
					done();
				});
		});

		it('should not accept peer without port', function (done) {

			delete validPeer.port;

			clientSocket.wampSend('acceptPeer', validPeer)
				.then(function (err, res) {
					done('should fail while sending peer without port');
				})
				.catch(function (err) {
					node.expect(err).to.equal('Failed to accept peer');
					done();
				});
		});

		it('should not accept peer without height', function (done) {

			delete validPeer.height;

			clientSocket.wampSend('acceptPeer', validPeer)
				.then(function (err, res) {
					done('should fail');
				})
				.catch(function (err) {
					node.expect(err).to.equal('No headers information');
					done();
				});
		});

		it('should not accept peer without broadhash', function (done) {

			delete validPeer.broadhash;

			clientSocket.wampSend('acceptPeer', validPeer)
				.then(function (err, res) {
					done('should fail');
				})
				.catch(function (err) {
					node.expect(err).to.equal('No headers information');
					done();
				});
		});

		it('should not accept peer without nonce', function (done) {

			delete validPeer.nonce;

			clientSocket.wampSend('acceptPeer', validPeer)
				.then(function (err, res) {
					done('should fail');
				})
				.catch(function (err) {
					node.expect(err).to.equal('No headers information');
					done();
				});
		});

		it('should accept valid peer', function (done) {

			clientSocket.wampSend('acceptPeer', validPeer)
				.then(function (err, res) {
					node.expect(err).to.be.undefined;
					done();
				})
				.catch(function (err) {
					done(err);
				});
		});
	});

	describe('removePeer', function () {

		var validPeer;

		beforeEach(function (done) {
			//insert frozen peer
			validPeer = _.clone(randomPeer);
			clientSocket.wampSend('acceptPeer', validPeer)
				.then(function (err, res) {
					done();
				})
				.catch(function (err) {
					done('Failed to insert peer before running removal tests');
				});
		});

		beforeEach(function () {
			validPeer = _.clone(randomPeer);
		});

		it('should not remove peer without ip', function (done) {

			delete validPeer.ip;

			clientSocket.wampSend('removePeer', validPeer)
				.then(function (err, res) {
					done('should fail while sending peer without ip');
				})
				.catch(function (err) {
					node.expect(err).to.equal('Failed to remove peer');
					done();
				});
		});

		it('should not remove peer without port', function (done) {

			delete validPeer.port;

			clientSocket.wampSend('removePeer', validPeer)
				.then(function (err, res) {
					done('should fail while sending peer without port');
				})
				.catch(function (err) {
					node.expect(err).to.equal('Failed to remove peer');
					done();
				});
		});

		it('should remove valid frozen peer', function (done) {

			clientSocket.wampSend('removePeer', validPeer)
				.then(function (err, res) {
					node.expect(err).to.be.undefined;
					done();
				})
				.catch(function (err) {
					done(err);
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

		beforeEach(function (done) {
			//insert frozen peer
			validPeer = _.clone(randomPeer);
			clientSocket.wampSend('acceptPeer', validPeer)
				.then(function (err, res) {
					done();
				})
				.catch(function (err) {
					done('Failed to insert peer before running removal tests');
				});
		});

		beforeEach(function () {
			validPeer = _.clone(randomPeer);
		});

		it('should return non empty peers list', function (done) {
			ws.call('list', null, function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res));
				node.expect(err).to.be.null;
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('peers').to.be.an('array').and.not.empty;
				done();
			});
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

		it('should should work ok with asking for a list multiple times', function (done) {

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
