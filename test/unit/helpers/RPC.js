'use strict';

var config = require('../../../config.json');

var chai = require('chai');
var expect = require('chai').expect;
var express = require('express');
var _  = require('lodash');
var sinon = require('sinon');

var WAMPClient = require('wamp-socket-cluster/WAMPClient');

var WsRPCServer = require('../../../api/RPC').WsRPCServer;
var WsRPCClient = require('../../../api/RPC').WsRPCClient;

var socketClusterMock = {
	on: sinon.spy()
};

var wsRPCServer;
before(function () {
	wsRPCServer = new WsRPCServer(socketClusterMock);
});

describe('WsRPCServer', function () {

	describe('constructor', function () {

		it('should have empty wsClientsConnectionsMap field', function () {
			expect(wsRPCServer).to.have.property('wsClientsConnectionsMap').to.be.a('object').and.to.be.empty;
		});

		it('should have wampClient field of instance WAMPClient', function () {
			expect(wsRPCServer).to.have.property('wampClient').and.to.be.a('object');
			expect(wsRPCServer.wampClient.constructor.name).equal('WAMPClient');
		});

		it('should have scClient field without connections', function () {
			expect(wsRPCServer).to.have.property('scClient').and.to.be.a('object');
			expect(wsRPCServer).to.have.deep.property('scClient.connections').to.be.a('object').and.to.be.empty;
		});

	});

	describe('shared', function () {

		describe('sendToPeer', function () {

			var validPeer, validProcedure, validData;

			beforeEach(function () {

				validPeer = {
					ip: '127.0.0.1',
					port: 4000
				};

				validProcedure = 'procedureA';

				validData = 'valid string';
			});

			it('should fail when no socket connection is registered', function (done) {
				wsRPCServer.sharedClient.sendToPeer(validPeer, validProcedure, validData)
					.then(function (res) {
						done(res);
					})
					.catch(function (err) {
						expect(err).to.be.empty;
						done();
					});
			});

			var validWAMPSocket, validSocketId = 'abc';

			beforeEach(function () {
				validWAMPSocket = {
					wampSend: sinon.stub().resolves(true)
				};
			});

			var registerValidConnection = function (validPeer, validSocketId, validWAMPSocket) {
				wsRPCServer.wsClientsConnectionsMap[validPeer.ip + ':' + validPeer.port] = validSocketId;
				wsRPCServer.scClient.connections[validSocketId] = validWAMPSocket;
			};


			it('should call wampSend on socket when called registered peer connection', function (done) {
				registerValidConnection(validPeer, validSocketId, validWAMPSocket);
				wsRPCServer.sharedClient.sendToPeer(validPeer, validProcedure, validData)
					.then(function (res) {
						expect(res).to.be.ok;
						done();
					})
					.catch(function (err) {
						done(err || 'should not reject it');
					});
			});
		});
	});
});

describe('WsRPCClient', function () {

	var validPort = 4000, validIp = '127.0.0.1';

	describe('constructor', function () {

		it('should initialize new connection', function () {
			WsRPCClient.prototype.initializeNewConnection = sinon.spy();
			new WsRPCClient(validIp, validPort);
			expect(WsRPCClient.prototype.initializeNewConnection.calledOnce).to.be.ok;
		});

		it('should throw error when no port specified', function (done) {
			try {
				new WsRPCClient(validIp, null);
			} catch (er) {
				expect(er.message).equal('WsRPCClient needs ip and port to establish WS connection.');
				done();
			}
			done('Should not be here');
		});

		it('should throw error when no ip specified', function (done) {
			try {
				new WsRPCClient(null, validPort);
			} catch (er) {
				expect(er.message).equal('WsRPCClient needs ip and port to establish WS connection.');
				done();
			}
			done('Should not be here');
		});

		it('should throw error when no arguments specified', function (done) {
			try {
				new WsRPCClient();
			} catch (er) {
				expect(er.message).equal('WsRPCClient needs ip and port to establish WS connection.');
				done();
			}
			done('Should not be here');
		});

		it('should return empty client stub when no endpoints registered', function () {
			var rpcStub = new WsRPCClient(validIp, validPort);
			expect(rpcStub).to.be.a('object').and.to.be.empty;
		});

		var validRpcHandler = function (param) {
			return param;
		};

		var validRPCEndpoint = {
			'rpcProcedure': validRpcHandler
		};

		it('should return client stub with rpc methods registered on MasterWAMPServer', function () {
			wsRPCServer.server.reassignRPCEndpoints(validRPCEndpoint);
			var rpcStub = new WsRPCClient(validIp, validPort);
			expect(rpcStub).to.have.property('rpcProcedure').and.to.be.a('function');
		});

		var validEventHandler = function (param) {
			return param;
		};

		var validEventEndpoint = {
			'eventProcedure': validEventHandler
		};

		it('should return client stub with event methods registered on MasterWAMPServer', function () {
			wsRPCServer.server.reassignEventEndpoints(validEventEndpoint);
			var rpcStub = new WsRPCClient(validIp, validPort);
			expect(rpcStub).to.have.property('eventProcedure').and.to.be.a('function');
		});

		it('should return client stub with event and rpc methods registered on MasterWAMPServer', function () {
			wsRPCServer.server.reassignRPCEndpoints(validRPCEndpoint);
			wsRPCServer.server.reassignEventEndpoints(validEventEndpoint);
			var rpcStub = new WsRPCClient(validIp, validPort);
			expect(rpcStub).to.have.property('eventProcedure').and.to.be.a('function');
			expect(rpcStub).to.have.property('rpcProcedure').and.to.be.a('function');
		});

	});
});
