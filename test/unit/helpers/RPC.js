/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';

var wsRPC = require('../../../api/ws/rpc/ws_rpc').wsRPC;
var ClientRPCStub = require('../../../api/ws/rpc/ws_rpc').ClientRPCStub;
var ConnectionState = require('../../../api/ws/rpc/ws_rpc').ConnectionState;

var MasterWAMPServer = require('wamp-socket-cluster/MasterWAMPServer');

var socketClusterMock = {
	on: sinonSandbox.spy(),
};

describe('wsRPC', () => {
	beforeEach(() => {
		wsRPC.clientsConnectionsMap = {};
	});

	it('should have empty clientsConnectionsMap field', () => {
		expect(wsRPC)
			.to.have.property('clientsConnectionsMap')
			.to.be.a('object').and.to.be.empty;
	});

	it('should have wampClient field of instance WAMPClient', () => {
		expect(wsRPC)
			.to.have.property('wampClient')
			.and.to.be.a('object');
		expect(wsRPC.wampClient.constructor.name).equal('WAMPClient');
	});

	it('should have scClient field without connections', () => {
		expect(wsRPC)
			.to.have.property('scClient')
			.and.to.be.a('object');
		expect(wsRPC.scClient)
			.to.have.property('connections')
			.to.be.a('object').and.to.be.empty;
	});

	describe('setServer', () => {
		before(() => {
			wsRPC.setServer(null);
		});

		after(() => {
			wsRPC.setServer(null);
		});

		it('should return server instance after setting it', () => {
			wsRPC.setServer({ name: 'my ws server' });
			var wsRPCServer = wsRPC.getServer();
			expect(wsRPCServer)
				.to.be.an('object')
				.eql({ name: 'my ws server' });
		});

		describe('getter', () => {
			it('should throw an error when setting server to null', () => {
				wsRPC.setServer(null);
				expect(wsRPC.getServer).to.throw('WS server has not been initialized!');
			});

			it('should throw an error when setting server to 0', () => {
				wsRPC.setServer(0);
				expect(wsRPC.getServer).to.throw('WS server has not been initialized!');
			});

			it('should throw an error when setting server to undefined', () => {
				wsRPC.setServer(undefined);
				expect(wsRPC.getServer).to.throw('WS server has not been initialized!');
			});
		});
	});

	describe('getServer', () => {
		before(() => {
			wsRPC.setServer(null);
		});

		after(() => {
			wsRPC.setServer(null);
		});

		it('should throw an error when WS server has not been initialized', () => {
			expect(wsRPC.getServer).to.throw('WS server has not been initialized!');
		});

		it('should return WS server if set before', () => {
			wsRPC.setServer({ name: 'my ws server' });
			expect(wsRPC.getServer).not.to.throw;
			expect(wsRPC.getServer())
				.to.a('object')
				.eql({ name: 'my ws server' });
		});
	});

	describe('getClientRPCStub', () => {
		var initializeNewConnectionStub;

		var validPort = 4000;
		var validIp = '127.0.0.1';

		beforeEach(() => {
			initializeNewConnectionStub = sinonSandbox.stub(
				ClientRPCStub.prototype,
				'initializeNewConnection'
			);
		});

		afterEach(() => {
			initializeNewConnectionStub.restore();
		});

		it('should throw error when no arguments specified', () => {
			expect(wsRPC.getClientRPCStub).to.throw(
				'RPC client needs ip and port to establish WS connection with: undefined:undefined'
			);
		});

		it('should throw error when no port specified', done => {
			try {
				wsRPC.getClientRPCStub(validIp, undefined);
			} catch (er) {
				expect(er.message).equal(
					'RPC client needs ip and port to establish WS connection with: 127.0.0.1:undefined'
				);
				return done();
			}
			done('Should not be here');
		});

		it('should throw error when no ip specified', done => {
			try {
				wsRPC.getClientRPCStub(undefined, validPort);
			} catch (er) {
				expect(er.message).equal(
					'RPC client needs ip and port to establish WS connection with: undefined:4000'
				);
				return done();
			}
			done('Should not be here');
		});

		it('should not initialize new connection just after getting RPC stub', () => {
			wsRPC.getClientRPCStub(validIp, validPort);
			expect(initializeNewConnectionStub.called).to.be.false;
		});

		it('should add new entry in clientsConnectionsMap after getting stub', () => {
			wsRPC.getClientRPCStub(validIp, validPort);
			expect(wsRPC.clientsConnectionsMap)
				.to.have.property(`${validIp}:${validPort}`)
				.to.be.an.instanceof(ConnectionState);
		});

		it('should return empty client stub when no endpoints registered', () => {
			var rpcStub = wsRPC.getClientRPCStub(validIp, validPort);
			expect(rpcStub).to.be.a('object').and.to.be.empty;
		});

		describe('stub', () => {
			var validRPCEndpoint = {
				rpcProcedure: function(param) {
					return param;
				},
			};
			var masterWAMPServer;
			var masterWAMPServerConfig;
			var validEventEndpoint = {
				eventProcedure: function(param) {
					return param;
				},
			};

			beforeEach(() => {
				masterWAMPServerConfig = {};
				masterWAMPServer = new MasterWAMPServer(
					socketClusterMock,
					masterWAMPServerConfig
				);
				wsRPC.setServer(masterWAMPServer);
			});

			after(() => {
				wsRPC.setServer(null);
			});

			it('should return client stub with rpc methods registered on MasterWAMPServer', () => {
				var wsServer = wsRPC.getServer();
				wsServer.reassignRPCEndpoints(validRPCEndpoint);
				var rpcStub = wsRPC.getClientRPCStub(validIp, validPort);
				expect(rpcStub)
					.to.have.property('rpcProcedure')
					.and.to.be.a('function');
			});

			it('should return client stub with event and rpc methods registered on MasterWAMPServer', () => {
				var wsServer = wsRPC.getServer();
				wsServer.reassignRPCEndpoints(validRPCEndpoint);
				wsServer.reassignEventEndpoints(validEventEndpoint);
				var rpcStub = wsRPC.getClientRPCStub(validIp, validPort);
				expect(rpcStub)
					.to.have.property('eventProcedure')
					.and.to.be.a('function');
				expect(rpcStub)
					.to.have.property('rpcProcedure')
					.and.to.be.a('function');
			});
		});
	});
});
