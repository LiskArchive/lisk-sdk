'use strict';

var node = require('../../node.js');
var _ = require('lodash');

var scClient = require('socketcluster-client');
const WAMPClient = require('wamp-socket-cluster/WAMPClient');

var validOptions = {
	protocol: 'http',
	hostname: '127.0.0.1',
	port: 8000,
	autoReconnect: true,
	query: {
		ip: '127.0.0.1',
		port: 8000,
		nethash: '198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d',
		version: '0.0.0a'
	}
};

describe('handshake', function () {

	var socket;

	it('should connect with valid options', function (done) {

		socket = scClient.connect(validOptions);

		socket.on('connecting', function (data) {
			node.expect(data).not.to.be.empty;
		});

		socket.on('connectAbort', function (data) {
			done('should not reject handshake with valid params', data);
		});

		socket.on('connect', function (data) {
			done();
		});

		socket.on('error', function (err) {
			done(err);
		});

	});

	it('should not connect without headers', function (done) {

		var invalidOptions = _.clone(validOptions);
		delete invalidOptions.query;
		socket = scClient.connect(invalidOptions);

		socket.on('connecting', function (data) {
			node.expect(data).not.to.be.empty;
		});

		socket.on('connectAbort', function (data) {
			node.expect(data).not.to.be.empty;
			done();
		});

		socket.on('connect', function (data) {
			done('should not be able to connect');
		});

		socket.on('error', function (err) {
			node.expect(err).not.to.be.empty;
		});
	});
});

describe('RPC', function () {

	var clientSocket;

	before(function (done) {
		var wampClient = new WAMPClient();
		clientSocket = scClient.connect(validOptions);

		wampClient.upgradeToWAMP(clientSocket);

		clientSocket.on('connect', function () {
			console.log('CONNECTED');
			done();
		});

		clientSocket.on('error', function (err) {
			console.log('ERROR', err);
			done(err);
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
	});
});
