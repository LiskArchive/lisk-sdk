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

const rewire = require('rewire');
const chai = require('chai');

const expect = chai.expect;

const ws_rpc = rewire(
	'../../../../../../../../src/modules/chain/api/ws/rpc/ws_rpc'
);
const wsRPC = ws_rpc.wsRPC;
const slaveRPCStub = ws_rpc.slaveRPCStub;

let result;
let serverMock;
let authKeyMock;
let error;

describe('ws_rpc', () => {
	beforeEach(async () => {
		authKeyMock = 'valid auth key';
		serverMock = {
			socketCluster: {
				options: {
					authKey: authKeyMock,
				},
			},
		};
	});

	afterEach(async () => {
		sinonSandbox.restore();
	});

	describe('wsRPC', () => {
		describe('setServer', () => {
			before(() => wsRPC.setServer(null));

			after(() => wsRPC.setServer(null));

			it('should return server instance after setting it', async () => {
				wsRPC.setServer({ name: 'my ws server' });
				const wsRPCServer = wsRPC.getServer();
				return expect(wsRPCServer)
					.to.be.an('object')
					.eql({ name: 'my ws server' });
			});

			describe('getter', () => {
				it('should throw an error when setting server to null', async () => {
					wsRPC.setServer(null);
					return expect(wsRPC.getServer).to.throw(
						'WS server has not been initialized!'
					);
				});

				it('should throw an error when setting server to 0', async () => {
					wsRPC.setServer(0);
					return expect(wsRPC.getServer).to.throw(
						'WS server has not been initialized!'
					);
				});

				it('should throw an error when setting server to undefined', async () => {
					wsRPC.setServer(undefined);
					return expect(wsRPC.getServer).to.throw(
						'WS server has not been initialized!'
					);
				});
			});
		});

		describe('getServer', () => {
			before(() => wsRPC.setServer(null));

			after(() => wsRPC.setServer(null));

			it('should throw an error when WS server has not been initialized', async () =>
				expect(wsRPC.getServer).to.throw(
					'WS server has not been initialized!'
				));

			it('should return WS server if set before', async () => {
				wsRPC.setServer({ name: 'my ws server' });
				expect(wsRPC.getServer).not.to.throw;
				return expect(wsRPC.getServer())
					.to.a('object')
					.eql({ name: 'my ws server' });
			});
		});

		// Other functions which rely on setServer and getServer.
		describe('other functions', () => {
			beforeEach(async () => {
				wsRPC.setServer(serverMock);
			});

			describe('getServerAuthKey', () => {
				describe('when wsServer is defined', () => {
					beforeEach(async () => {
						result = wsRPC.getServerAuthKey();
					});

					it('should return the authKey of the wsServer', async () =>
						expect(result).to.equal(authKeyMock));
				});

				describe('when wsServer is undefined', () => {
					beforeEach(async () => {
						wsRPC.setServer(undefined);
						error = null;
						try {
							result = wsRPC.getServerAuthKey();
						} catch (err) {
							error = err;
						}
					});

					it('should throw an Error to indicate that the wsServer has not been initialized', async () =>
						expect(error).to.be.an.instanceOf(Error));
				});
			});
		});
	});

	describe('slaveRPCStub', () => {
		describe('updateMyself', () => {
			beforeEach(async () => {
				error = null;
				try {
					slaveRPCStub.updateMyself();
				} catch (err) {
					error = err;
				}
			});

			// Cannot be invoked directly.
			it('should throw an error', async () =>
				expect(error).to.be.an.instanceOf(Error));
		});
	});
});
