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

const wsRPC = require('../../../../../../../src/modules/chain/api/ws/rpc/ws_rpc')
	.wsRPC;

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
			expect(wsRPC.getServer).to.throw('WS server has not been initialized!'));

		it('should return WS server if set before', async () => {
			wsRPC.setServer({ name: 'my ws server' });
			expect(wsRPC.getServer).not.to.throw;
			return expect(wsRPC.getServer())
				.to.a('object')
				.eql({ name: 'my ws server' });
		});
	});
});
