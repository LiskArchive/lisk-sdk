'use strict';

var config = require('../../../config.json');

var chai = require('chai');
var expect = require('chai').expect;
var express = require('express');
var _  = require('lodash');
var sinon = require('sinon');

var constants = require('../../../helpers/constants');
var WAMPClient = require('wamp-socket-cluster/WAMPClient');

var WsRPCServer = require('../../../api/RPC').WsRPCServer;
var WsRPCClient = require('../../../api/RPC').WsRPCClient;
var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

var socketClusterMock = {
	on: sinon.spy()
};

before(function () {
	WsRPCServer.setServer(socketClusterMock);
	constants.setConst('headers', {});
});

describe('WsRPCServer', function () {

	describe('constructor', function () {

		it('should have empty wsClientsConnectionsMap field', function () {
			expect(WsRPCServer).to.have.property('wsClientsConnectionsMap').to.be.a('object').and.to.be.empty;
		});

		it('should have wampClient field of instance WAMPClient', function () {
			expect(WsRPCServer).to.have.property('wampClient').and.to.be.a('object');
			expect(WsRPCServer.wampClient.constructor.name).equal('WAMPClient');
		});

		it('should have scClient field without connections', function () {
			expect(WsRPCServer).to.have.property('scClient').and.to.be.a('object');
			expect(WsRPCServer).to.have.deep.property('scClient.connections').to.be.a('object').and.to.be.empty;
		});

	});

});

describe('WsRPCClient', function () {

	var validPort = 4000, validIp = '127.0.0.1';


	describe('constructor', function () {

		before(function () {
			WsRPCServer.setServer(null);
		});

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

		var masterWAMPServer, masterWAMPServerConfig = {};
		before(function () {
			masterWAMPServer = new MasterWAMPServer(socketClusterMock, masterWAMPServerConfig);
			WsRPCServer.setServer(masterWAMPServer);
		});

		it('should return client stub with rpc methods registered on MasterWAMPServer', function () {
			WsRPCServer.wsServer.reassignRPCEndpoints(validRPCEndpoint);
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
			WsRPCServer.wsServer.reassignEventEndpoints(validEventEndpoint);
			var rpcStub = new WsRPCClient(validIp, validPort);
			expect(rpcStub).to.have.property('eventProcedure').and.to.be.a('function');
		});

		it('should return client stub with event and rpc methods registered on MasterWAMPServer', function () {
			WsRPCServer.wsServer.reassignRPCEndpoints(validRPCEndpoint);
			WsRPCServer.wsServer.reassignEventEndpoints(validEventEndpoint);
			var rpcStub = new WsRPCClient(validIp, validPort);
			expect(rpcStub).to.have.property('eventProcedure').and.to.be.a('function');
			expect(rpcStub).to.have.property('rpcProcedure').and.to.be.a('function');
		});

	});
});
