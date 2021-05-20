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
import { blockHeaderSchema, blockSchema } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { testing } from 'lisk-framework';
import { when } from 'jest-when';
import { MonitorPlugin } from '../../src';
import * as config from '../../src/defaults/default_config';

const validPluginOptions = config.defaultConfig.default;

describe('_handlePostBlock', () => {
	let monitorPlugin: MonitorPlugin;
	let blockHeaderString: string;
	let encodedBlock: string;
	let channelInvokeMock;
	const {
		mocks: { channelMock },
	} = testing;

	beforeEach(async () => {
		monitorPlugin = new MonitorPlugin(validPluginOptions as never);
		await monitorPlugin.load(channelMock);
		monitorPlugin.schemas = { block: blockSchema, blockHeader: blockHeaderSchema } as any;
		blockHeaderString =
			'080210c08db7011880ea3022209696342ed355848b4cd6d7c77093121ae3fc10f449447f41044972174e75bc2b2a20e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b8553220addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca93880c8afa025421a08e0dc2a10e0dc2a1a10c8c557b5dba8527c0e760124128fd15c4a40d90764813046127a50acf4b449fccad057944e7665ab065d7057e56983e42abe55a3cbc1eb35a8c126f54597d0a0b426f2ad9a2d62769185ad8e3b4a5b3af909';
		encodedBlock = codec
			.encode(blockSchema, { header: Buffer.from(blockHeaderString, 'hex'), payload: [] })
			.toString('hex');

		channelInvokeMock = jest.fn();
		channelMock.invoke = channelInvokeMock;
		when(channelInvokeMock)
			.calledWith('app:getConnectedPeers')
			.mockResolvedValue([] as never);
	});

	it('should update the plugin state with new block info', async () => {
		// Arrange
		const expectedState = {
			averageReceivedBlocks: 1,
			blocks: {
				'706a8b678f1d4a9ad585f50ba06ef242c5598d22c03f13eacc230e041014dbb7': {
					count: 1,
					height: 800000,
				},
			},
			connectedPeers: 0,
		};

		// Act
		(monitorPlugin as any)._handlePostBlock({ block: encodedBlock });

		// Assert
		expect(await (monitorPlugin.actions as any).getBlockStats()).toEqual(expectedState);
	});

	it('should remove blocks in state older than 300 blocks', () => {
		// Arrange
		(monitorPlugin as any)._state.blocks = { oldBlockId: { count: 1, height: 0 } };

		// Act
		(monitorPlugin as any)._handlePostBlock({ block: encodedBlock });

		// Assert
		expect((monitorPlugin as any)._state.blocks['oldBlockId']).toBeUndefined();
	});
});
