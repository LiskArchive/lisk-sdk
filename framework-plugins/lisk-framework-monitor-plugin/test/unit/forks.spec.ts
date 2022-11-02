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

import { chain, cryptography, testing, ApplicationConfigForPlugin } from 'lisk-sdk';
import { MonitorPlugin } from '../../src/monitor_plugin';
import { configSchema } from '../../src/schemas';

const appConfigForPlugin: ApplicationConfigForPlugin = {
	...testing.fixtures.defaultConfig,
};
const validPluginOptions = configSchema.default;
const logger = testing.mocks.loggerMock;

describe('_handleFork', () => {
	let monitorPluginInstance: MonitorPlugin;
	const mockHeader = new chain.BlockHeader({
		generatorAddress: Buffer.alloc(0),
		height: 800000,
		version: 0,
		previousBlockID: Buffer.alloc(0),
		timestamp: Math.floor(Date.now() / 1000 - 24 * 60 * 60),
		stateRoot: cryptography.utils.hash(Buffer.alloc(0)),
		eventRoot: cryptography.utils.hash(Buffer.alloc(0)),
		maxHeightGenerated: 0,
		maxHeightPrevoted: 0,
		impliesMaxPrevotes: false,
		assetRoot: cryptography.utils.hash(Buffer.alloc(0)),
		validatorsHash: cryptography.utils.getRandomBytes(32),
		aggregateCommit: {
			height: 0,
			aggregationBits: Buffer.alloc(0),
			certificateSignature: Buffer.alloc(0),
		},
		transactionRoot: cryptography.utils.hash(Buffer.alloc(0)),
		signature: Buffer.alloc(0),
	});

	beforeEach(async () => {
		monitorPluginInstance = new MonitorPlugin();
		monitorPluginInstance['_apiClient'] = {
			schema: {
				block: chain.blockSchema,
				header: chain.blockHeaderSchema,
			},
			invoke: jest.fn(),
		};
		await monitorPluginInstance.init({
			config: validPluginOptions,
			appConfig: appConfigForPlugin,
			logger,
		});
	});

	it('should add new fork events to state', () => {
		const monitorInstance = monitorPluginInstance as any;
		monitorInstance._handleFork(mockHeader.toJSON());

		expect(monitorInstance._state.forks.forkEventCount).toEqual(1);
	});

	it('should add new block headers for each fork event', () => {
		const monitorInstance = monitorPluginInstance as any;
		monitorInstance._handleFork(mockHeader.toJSON());

		expect(
			monitorInstance._state.forks.blockHeaders[mockHeader.id.toString('hex')].blockHeader,
		).toEqual(mockHeader.toJSON());
	});
});
