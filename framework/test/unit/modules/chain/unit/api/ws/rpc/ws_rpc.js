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
		describe('get/set server', () => {
			describe('setServer', () => {
				let wsServerInternal;

				beforeEach(async () => {
					wsRPC.setServer(serverMock);
					wsServerInternal = ws_rpc.__get__('wsServer');
				});

				it('should set the wsServer internally to the correct object', async () =>
					expect(wsServerInternal).to.equal(serverMock));
			});

			describe('getServer', () => {
				beforeEach(async () => {
					ws_rpc.__set__({
						wsServer: serverMock,
					});
					result = wsRPC.getServer(serverMock);
				});

				it('should return the internal wsServer', async () =>
					expect(result).to.equal(serverMock));
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
