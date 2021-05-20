/*
 * Copyright © 2021 Lisk Foundation
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

import { APIClient } from '@liskhq/lisk-api-client';
import { SequenceModule, TokenModule } from '../../../src';
import {
	getAccountSchemaFromModules,
	getModuleInstance,
	waitUntilBlockHeight,
} from '../../../src/testing/utils';

describe('utils', () => {
	describe('getAccountSchemaFromModules', () => {
		it('should get schema object for modules', () => {
			expect(getAccountSchemaFromModules([TokenModule, SequenceModule])).toMatchSnapshot();
		});
	});

	describe('getModuleInstance', () => {
		it('should create module instance with default mocks', () => {
			const module = getModuleInstance(TokenModule);

			expect(module).toBeInstanceOf(TokenModule);
		});

		it('should create module instance with custom data access', () => {
			const dataAccess = {
				getChainState: jest.fn(),
				getAccountByAddress: jest.fn(),
				getLastBlockHeader: jest.fn(),
			};
			const module = getModuleInstance(TokenModule, { dataAccess });

			expect(module).toBeInstanceOf(TokenModule);
			expect(module['_dataAccess']).toBe(dataAccess);
		});

		it('should create module instance with custom logger', () => {
			const logger = {
				trace: jest.fn(),
				debug: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
				fatal: jest.fn(),
				level: jest.fn(),
			};
			const module = getModuleInstance(TokenModule, { logger });

			expect(module).toBeInstanceOf(TokenModule);
			expect(module['_logger']).toBe(logger);
		});

		it('should create module instance with custom channel', () => {
			const channel = {
				publish: jest.fn(),
			};
			const module = getModuleInstance(TokenModule, { channel });

			expect(module).toBeInstanceOf(TokenModule);
			expect(module['_channel']).toBe(channel);
		});
	});

	describe('waitUntilBlockHeight', () => {
		let apiClient: APIClient;
		beforeEach(() => {
			apiClient = {
				// eslint-disable-next-line @typescript-eslint/require-await
				subscribe: jest.fn(async (_, callback) => callback({ block: 'blockdata' })),
				block: {
					decode: jest.fn().mockReturnValue({ header: { height: 2 } }),
				},
			} as any;
		});

		it('should resolve after input height', async () => {
			await expect(waitUntilBlockHeight({ apiClient, height: 1 })).resolves.toBeUndefined();
		});

		it('should timeout', async () => {
			// eslint-disable-next-line @typescript-eslint/require-await
			apiClient.subscribe = jest.fn(async () => setTimeout(() => undefined, 2));
			await expect(waitUntilBlockHeight({ apiClient, height: 1, timeout: 1 })).rejects.toThrow(
				"'waitUntilBlockHeight' timed out after 1 ms",
			);
		});
	});
});
