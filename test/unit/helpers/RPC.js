'use strict';

var config = require('../../../config.json');

var chai = require('chai');
var expect = require('chai').expect;
var express = require('express');
var sinon = require('sinon');

var constants = require('../../../helpers/constants');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');

var wsRPC = require('../../../api/ws/rpc/wsRPC').wsRPC;
var ClientRPCStub = require('../../../api/ws/rpc/wsRPC').ClientRPCStub;
var ConnectionState = require('../../../api/ws/rpc/wsRPC').ConnectionState;

var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

var socketClusterMock = {
	on: sinon.spy()
};

describe('wsRPC', function () {

	it('should have empty clientsConnectionsMap field', function () {
		expect(wsRPC).to.have.property('clientsConnectionsMap').to.be.a('object').and.to.be.empty;
	});

	it('should have wampClient field of instance WAMPClient', function () {
		expect(wsRPC).to.have.property('wampClient').and.to.be.a('object');
		expect(wsRPC.wampClient.constructor.name).equal('WAMPClient');
	});

	it('should have scClient field without connections', function () {
		expect(wsRPC).to.have.property('scClient').and.to.be.a('object');
		expect(wsRPC.scClient).to.have.property('connections').to.be.a('object').and.to.be.empty;
	});

	describe('setServer', function () {

		before(function () {
			wsRPC.setServer(null);
		});

		after(function () {
			wsRPC.setServer(null);
		});

		it('should return server instance after setting it', function () {
			wsRPC.setServer({name: 'my ws server'});
			var wsRPCServer = wsRPC.getServer();
			expect(wsRPCServer).to.be.an('object').eql({name: 'my ws server'});
		});

		describe('getter', function () {
			it('should throw an error when setting server to null', function () {
				wsRPC.setServer(null);
				expect(wsRPC.getServer).to.throw('WS server has not been initialized!');
			});

			it('should throw an error when setting server to 0', function () {
				wsRPC.setServer(0);
				expect(wsRPC.getServer).to.throw('WS server has not been initialized!');
			});

			it('should throw an error when setting server to undefined', function () {
				wsRPC.setServer(undefined);
				expect(wsRPC.getServer).to.throw('WS server has not been initialized!');
			});
		});
	});

	describe('getServer', function () {

		before(function () {
			wsRPC.setServer(null);
		});

		it('should throw an error when WS server has not been initialized', function () {
			expect(wsRPC.getServer).to.throw('WS server has not been initialized!');
		});

		it('should return WS server if set before', function () {
			wsRPC.setServer({name: 'my ws server'});
			expect(wsRPC.getServer).not.to.throw;
			expect(wsRPC.getServer()).to.a('object').eql({name: 'my ws server'});
		});

		after(function () {
			wsRPC.setServer(null);
		});
	});

	describe('getClientRPCStub', function () {

		var validPort = 4000, validIp = '127.0.0.1';

		it('should throw error when no arguments specified', function () {
			expect(wsRPC.getClientRPCStub).to.throw('RPC client needs ip and port to establish WS connection with: undefined:undefined');
		});

		it('should throw error when no port specified', function (done) {
			try {
				wsRPC.getClientRPCStub(validIp, undefined);
			} catch (er) {
				expect(er.message).equal('RPC client needs ip and port to establish WS connection with: 127.0.0.1:undefined');
				return done();
			}
			done('Should not be here');
		});

		it('should throw error when no ip specified', function (done) {
			try {
				wsRPC.getClientRPCStub(undefined, validPort);
			} catch (er) {
				expect(er.message).equal('RPC client needs ip and port to establish WS connection with: undefined:4000');
				return done();
			}
			done('Should not be here');
		});

		it('should not initialize new connection just after getting RPC stub', function () {
			ClientRPCStub.prototype.initializeNewConnection = sinon.spy();
			wsRPC.getClientRPCStub(validIp, validPort);
			expect(ClientRPCStub.prototype.initializeNewConnection.called).not.to.be.ok;
		});

		it('should add new entry in clientsConnectionsMap after getting stub', function () {
			wsRPC.getClientRPCStub(validIp, validPort);
			expect(wsRPC.clientsConnectionsMap).to.have.property(validIp + ':' + validPort).to.be.an.instanceof(ConnectionState);
		});

		it('should return empty client stub when no endpoints registered', function () {
			var rpcStub = wsRPC.getClientRPCStub(validIp, validPort);
			expect(rpcStub).to.be.a('object').and.to.be.empty;
		});

		describe('stub', function () {
			var validRPCEndpoint = {
				'rpcProcedure': function (param) {
					return param;
				}
			};

			var masterWAMPServer, masterWAMPServerConfig = {};

			beforeEach(function () {
				wsRPC.clientsConnectionsMap = {};
				masterWAMPServer = new MasterWAMPServer(socketClusterMock, masterWAMPServerConfig);
				wsRPC.setServer(masterWAMPServer);
			});

			it('should return client stub with rpc methods registered on MasterWAMPServer', function () {
				var wsServer = wsRPC.getServer();
				wsServer.reassignRPCEndpoints(validRPCEndpoint);
				var rpcStub = wsRPC.getClientRPCStub(validIp, validPort);
				expect(rpcStub).to.have.property('rpcProcedure').and.to.be.a('function');
			});

			var validEventEndpoint = {
				'eventProcedure': function (param) {
					return param;
				}
			};

			it('should return client stub with event and rpc methods registered on MasterWAMPServer', function () {
				var wsServer = wsRPC.getServer();
				wsServer.reassignRPCEndpoints(validRPCEndpoint);
				wsServer.reassignEventEndpoints(validEventEndpoint);
				var rpcStub = wsRPC.getClientRPCStub(validIp, validPort);
				expect(rpcStub).to.have.property('eventProcedure').and.to.be.a('function');
				expect(rpcStub).to.have.property('rpcProcedure').and.to.be.a('function');
			});
		});
	});
});
