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
import { testing, ApplicationConfigForPlugin, chain, cryptography } from 'lisk-sdk';
import { when } from 'jest-when';
import { MonitorPlugin } from '../../src';
import { configSchema } from '../../src/schemas';

const appConfigForPlugin: ApplicationConfigForPlugin = {
	...testing.fixtures.defaultConfig,
};

const logger = testing.mocks.loggerMock;
const validPluginOptions = configSchema.default;

describe('_handlePostBlock', () => {
	let monitorPlugin: MonitorPlugin;

	const header = new chain.BlockHeader({
		generatorAddress: Buffer.alloc(0),
		height: 800000,
		version: 0,
		previousBlockID: Buffer.alloc(0),
		impliesMaxPrevotes: false,
		timestamp: Math.floor(Date.now() / 1000 - 24 * 60 * 60),
		stateRoot: cryptography.utils.hash(Buffer.alloc(0)),
		eventRoot: cryptography.utils.hash(Buffer.alloc(0)),
		maxHeightGenerated: 0,
		maxHeightPrevoted: 0,
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
		monitorPlugin = new MonitorPlugin();
		monitorPlugin['_apiClient'] = {
			schema: {
				block: chain.blockSchema,
				header: chain.blockHeaderSchema,
			},
			invoke: jest.fn(),
		};
		await monitorPlugin.init({
			config: validPluginOptions,
			appConfig: appConfigForPlugin,
			logger,
		});

		when(jest.spyOn(monitorPlugin['_apiClient'], 'invoke'))
			.calledWith('network_getConnectedPeers')
			.mockResolvedValue([] as never);
	});

	it('should update the plugin state with new block info', async () => {
		// Arrange
		const expectedState = {
			averageReceivedBlocks: 1,
			blocks: {
				[header.id.toString('hex')]: {
					count: 1,
					height: 800000,
				},
			},
			connectedPeers: 0,
		};

		// Act
		(monitorPlugin as any)._handlePostBlock(header.toJSON());

		// Assert
		expect(await monitorPlugin.endpoint.getBlockStats({} as any)).toEqual(expectedState);
	});

	it('should remove blocks in state older than 300 blocks', () => {
		// Arrange
		(monitorPlugin as any)._state.blocks = { oldBlockId: { count: 1, height: 0 } };

		// Act
		(monitorPlugin as any)._handlePostBlock(header.toJSON());

		// Assert
		expect((monitorPlugin as any)._state.blocks['oldBlockId']).toBeUndefined();
	});
});
