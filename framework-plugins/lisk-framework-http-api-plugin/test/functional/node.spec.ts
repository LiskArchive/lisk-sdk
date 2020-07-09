/*
 * Copyright © 2020 Lisk Foundation
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
import { Application } from 'lisk-framework';
import axios from 'axios';
import { createApplication, closeApplication, getURL } from './utils/application';

describe('Node Info endpoint', () => {
	let app: Application;

	beforeAll(async () => {
		app = await createApplication('node_http_functional');
	});

	afterAll(async () => {
		await closeApplication(app);
	});

	describe('api/node/info', () => {
		it('should respond node info', async () => {
			const appInstance = app as any;
			const nodeStatusAndConstantFixture = {
				version: appInstance._node._options.version,
				protocolVersion: appInstance._node._options.protocolVersion,
				networkID: appInstance._node._options.networkId,
				lastBlockID: appInstance._node._chain.lastBlock.header.id.toString('base64'),
				height: appInstance._node._chain.lastBlock.header.height,
				finalizedHeight: appInstance._node._bft.finalityManager.finalizedHeight,
				syncing: appInstance._node._synchronizer.isActive,
				unconfirmedTransactions: appInstance._node._transactionPool.getAll().length,
				genesisConfig: {
					...appInstance._node._options.genesisConfig,
					...appInstance._node._options.constants,
					totalAmount: appInstance._node._options.constants.totalAmount.toString(),
				},
			};

			const result = await axios.get(getURL('/api/node/info'));

			expect(result.data).toEqual({ data: nodeStatusAndConstantFixture });
			expect(result.status).toBe(200);
		});
	});
});
