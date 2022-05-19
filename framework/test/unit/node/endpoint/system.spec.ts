/*
 * Copyright © 2022 Lisk Foundation
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

import { Block, BlockAssets } from '@liskhq/lisk-chain';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { TokenModule } from '../../../../src';
import { SystemEndpoint } from '../../../../src/node/endpoint/system';
import { createFakeBlockHeader } from '../../../../src/testing';
import { nodeOptions } from '../../../fixtures';

describe('system endpoint', () => {
	let endpoint: SystemEndpoint;

	beforeEach(() => {
		endpoint = new SystemEndpoint({
			chain: {
				networkIdentifier: getRandomBytes(32),
				lastBlock: new Block(createFakeBlockHeader(), [], new BlockAssets()),
			},
			consensus: {
				syncing: jest.fn().mockReturnValue(true),
				finalizedHeight: jest.fn().mockReturnValue(111),
			},
			generator: {
				getPooledTransactions: jest.fn().mockReturnValue([]),
			},
			options: nodeOptions,
			registeredModules: [new TokenModule()],
		} as never);
	});

	describe('getNodeInfo', () => {
		it('should return current node info', async () => {
			await expect(endpoint.getNodeInfo({} as never)).resolves.toEqual({
				version: expect.any(String),
				networkVersion: expect.any(String),
				networkIdentifier: expect.any(String),
				lastBlockID: expect.any(String),
				height: expect.any(Number),
				finalizedHeight: expect.any(Number),
				syncing: true,
				unconfirmedTransactions: 0,
				genesis: expect.any(Object),
				network: expect.any(Object),
			});
		});
	});

	describe('getMetadata', () => {
		it('should return metadata for all the modules', async () => {
			await expect(endpoint.getMetadata({} as never)).resolves.toEqual({
				modules: [
					{
						id: expect.any(Number),
						name: 'token',
						assets: expect.any(Array),
						events: expect.any(Array),
						commands: expect.any(Array),
						endpoints: expect.any(Array),
					},
				],
			});
		});
	});
});
