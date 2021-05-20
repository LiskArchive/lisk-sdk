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

import { blockHeaderSchema, blockSchema, RawBlock } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { hash } from '@liskhq/lisk-cryptography';
import { testing } from 'lisk-framework';
import { MonitorPlugin } from '../../src/monitor_plugin';
import * as config from '../../src/defaults/default_config';

const validPluginOptions = config.defaultConfig.default;

describe('_handleFork', () => {
	let monitorPluginInstance: MonitorPlugin;
	let encodedBlock: string;
	const {
		mocks: { channelMock },
	} = testing;

	beforeEach(async () => {
		monitorPluginInstance = new MonitorPlugin(validPluginOptions as never);
		await monitorPluginInstance.load(channelMock);
		monitorPluginInstance.schemas = { block: blockSchema, blockHeader: blockHeaderSchema } as any;
		encodedBlock =
			'0acd01080210c38ec1fc0518a2012220c736b8cfb669ff453118230c71d7dc433797b5b30da6b9d89a14457f1b56faa12a20e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85532209bcf519c9e0a8e66b3939f9d592b5a1728141ea3253b7d3a2424a44575c5f4e738004216087410001a1060fce85c0ca51ca1c72c589c9f651f574a40396edc8e940c5f5829d382c10cae3c2f7f24a5a9bb42ef8c545439e1a2e83951f87bc894816d7b90958b411a37b816c9e2d597dd52d7847d5a73f411ded65303';
	});

	it('should add new fork events to state', () => {
		const monitorInstance = monitorPluginInstance as any;
		monitorInstance._handleFork(encodedBlock);

		expect(monitorInstance._state.forks.forkEventCount).toEqual(1);
	});

	it('should add new block headers for each fork event', () => {
		const monitorInstance = monitorPluginInstance as any;
		const { header } = codec.decode<RawBlock>(
			monitorInstance.schemas.block,
			Buffer.from(encodedBlock, 'hex'),
		);
		const expectedDecodedHeader = codec.decodeJSON<Record<string, unknown>>(
			monitorInstance.schemas.blockHeader,
			header,
		);
		const blockId = hash(header).toString('hex');
		monitorInstance._handleFork(encodedBlock);

		expect(monitorInstance._state.forks.blockHeaders[blockId].blockHeader).toEqual(
			expectedDecodedHeader,
		);
	});
});
