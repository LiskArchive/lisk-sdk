'use strict';

var config = require('../../../config.json');

var chai = require('chai');
var expect = require('chai').expect;
var express = require('express');
var _  = require('lodash');
var sinon = require('sinon');

var constants = require('../../../helpers/constants');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');

var wsRPC = require('../../../api/ws/rpc/wsRPC');
var WsRPCClient = require('../../../api/ws/rpc/RPC').WsRPCClient;
var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

var socketClusterMock = {
	on: sinon.spy()
};

before(function () {
	wsRPC.setServer(socketClusterMock);
	constants.setConst('headers', {});
});

describe('wsRPC', function () {

	describe('constructor', function () {

		it('should have empty clientsConnectionsMap field', function () {
			expect(wsRPC).to.have.property('clientsConnectionsMap').to.be.a('object').and.to.be.empty;
		});

		it('should have wampClient field of instance WAMPClient', function () {
			expect(wsRPC).to.have.property('wampClient').and.to.be.a('object');
			expect(wsRPC.wampClient.constructor.name).equal('WAMPClient');
		});

		it('should have scClient field without connections', function () {
			expect(wsRPC).to.have.property('scClient').and.to.be.a('object');
			expect(wsRPC).to.have.deep.property('scClient.connections').to.be.a('object').and.to.be.empty;
		});

	});

});

describe('WsRPCClient', function () {

	var validPort = 4000, validIp = '127.0.0.1';


	describe('constructor', function () {

		before(function () {
			wsRPC.setServer(null);
		});

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

		it('should throw error when no arguments specified', function (done) {
			try {
				new WsRPCClient();
			} catch (er) {
				expect(er.message).equal('WsRPCClient needs ip and port to establish WS connection.');
				return done();
			}
			done('Should not be here');
		});

		it('should return empty client stub when no endpoints registered', function () {
			var rpcStub = new WsRPCClient(validIp, validPort);
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
				wsRPC.wsServer.reassignRPCEndpoints(validRPCEndpoint);
				var rpcStub = wsRPC.getClientRPCStub(validIp, validPort);
				expect(rpcStub).to.have.property('rpcProcedure').and.to.be.a('function');
			});

			var validEventEndpoint = {
				'eventProcedure': function (param) {
					return param;
				}
			};

			it('should return client stub with event and rpc methods registered on MasterWAMPServer', function () {
				wsRPC.wsServer.reassignRPCEndpoints(validRPCEndpoint);
				wsRPC.wsServer.reassignEventEndpoints(validEventEndpoint);
				var rpcStub = wsRPC.getClientRPCStub(validIp, validPort);
				expect(rpcStub).to.have.property('eventProcedure').and.to.be.a('function');
				expect(rpcStub).to.have.property('rpcProcedure').and.to.be.a('function');
			});

		var validEventEndpoint = {
			'eventProcedure': validEventHandler
		};

		it('should return client stub with event methods registered on MasterWAMPServer', function () {
			wsRPC.wsServer.reassignEventEndpoints(validEventEndpoint);
			var rpcStub = new WsRPCClient(validIp, validPort);
			expect(rpcStub).to.have.property('eventProcedure').and.to.be.a('function');
		});

		it('should return client stub with event and rpc methods registered on MasterWAMPServer', function () {
			wsRPC.wsServer.reassignRPCEndpoints(validRPCEndpoint);
			wsRPC.wsServer.reassignEventEndpoints(validEventEndpoint);
			var rpcStub = new WsRPCClient(validIp, validPort);
			expect(rpcStub).to.have.property('eventProcedure').and.to.be.a('function');
			expect(rpcStub).to.have.property('rpcProcedure').and.to.be.a('function');
		});

	});
});
