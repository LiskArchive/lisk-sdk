/*
 * Copyright © 2024 Lisk Foundation
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

import {
	ApplicationConfigForPlugin,
	apiClient,
	cryptography,
	db,
	getMainchainID,
	testing,
} from 'lisk-sdk';
import { ChainConnectorPlugin } from '../../src/chain_connector_plugin';
import { CCU_FREQUENCY, CCU_TOTAL_CCM_SIZE } from '../../src/constants';
import { Logger } from '../../src/types';
import * as dbApi from '../../src/db';

describe('ChainConnectorPlugin', () => {
	const ownChainID = Buffer.from('04000000', 'hex');
	const appConfigForPlugin: ApplicationConfigForPlugin = {
		...testing.fixtures.defaultConfig,
		genesis: {
			chainID: ownChainID.toString('hex'),
		} as any,
		rpc: {
			modes: ['ipc'],
			port: 8080,
			host: '127.0.0.1',
			accessControlAllowOrigin: '*',
		},
		system: {
			dataPath: '~/.lisk/ChainConnectorPlugin/test/',
		} as any,
	};
	const defaultPrivateKey =
		'6c5e2b24ff1cc99da7a49bd28420b93b2a91e2e2a3b0a0ce07676966b707d3c2859bbd02747cf8e26dab592c02155dfddd4a16b0fe83fd7e7ffaec0b5391f3f7';
	const defaultPassword = '123';
	const defaultCCUFee = '500000';

	const getApiClientMock = () => ({
		disconnect: jest.fn(),
		invoke: jest.fn(),
		subscribe: jest.fn(),
		connect: jest.fn(),
		node: { getNodeInfo: jest.fn() },
	});

	let encryptedKey;
	let defaultEncryptedPrivateKey;

	let defaultConfig: Record<string, unknown>;
	let logger: Logger;
	let receivingChainAPIClientMock;
	let chainConnectorPlugin: ChainConnectorPlugin;

	beforeEach(async () => {
		encryptedKey = await cryptography.encrypt.encryptMessageWithPassword(
			Buffer.from(defaultPrivateKey, 'hex'),
			defaultPassword,
			{
				kdfparams: {
					iterations: 1,
					memorySize: 256,
					parallelism: 1,
				},
			},
		);
		defaultEncryptedPrivateKey = cryptography.encrypt.stringifyEncryptedMessage(encryptedKey);

		defaultConfig = {
			receivingChainIPCPath: '~/.lisk/mainchain',
			ccuFee: defaultCCUFee,
			encryptedPrivateKey: defaultEncryptedPrivateKey,
			ccuFrequency: CCU_FREQUENCY,
			maxCCUSize: CCU_TOTAL_CCM_SIZE,
			ccuSaveLimit: 1,
			isSaveCCU: false,
			registrationHeight: 1,
			receivingChainID: getMainchainID(ownChainID).toString('hex'),
		};

		receivingChainAPIClientMock = getApiClientMock();

		jest
			.spyOn(apiClient, 'createIPCClient')
			.mockResolvedValue(receivingChainAPIClientMock as never);
	});

	describe('init', () => {
		beforeEach(() => {
			logger = testing.mocks.loggerMock;
			chainConnectorPlugin = new ChainConnectorPlugin();
		});

		it('Should throw error when maxCCUSize > CCU_TOTAL_CCM_SIZE', async () => {
			await expect(
				chainConnectorPlugin.init({
					appConfig: appConfigForPlugin,
					config: {
						loadAsChildProcess: false,
						...defaultConfig,
						maxCCUSize: CCU_TOTAL_CCM_SIZE + 1000,
					},
					logger,
				}),
			).rejects.toThrow('must be <= 10240');
		});

		it('Should assign config properties', async () => {
			await chainConnectorPlugin.init({
				appConfig: appConfigForPlugin,
				config: {
					loadAsChildProcess: false,
					...defaultConfig,
				},
				logger,
			});
			expect(chainConnectorPlugin['_receivingChainID'].toString('hex')).toEqual(
				defaultConfig.receivingChainID,
			);
			expect(chainConnectorPlugin['_blockEventHandler']).toBeDefined();
		});
	});

	describe('load', () => {
		const endpointMock = {
			load: jest.fn().mockResolvedValue({}),
		};
		const sendingChainClientMock = {
			connect: jest.fn().mockResolvedValue({}),
		};
		const blockEventHandlerMock = {
			load: jest.fn().mockResolvedValue({}),
		};

		const mockLoadFunction = () => {
			(chainConnectorPlugin as any)['endpoint'] = endpointMock;
			(chainConnectorPlugin as any)['_sendingChainClient'] = sendingChainClientMock;
			(chainConnectorPlugin as any)['_blockEventHandler'] = blockEventHandlerMock;
			jest.spyOn(dbApi, 'getDBInstance').mockResolvedValue(new db.InMemoryDatabase() as never);
			jest.spyOn(blockEventHandlerMock, 'load');
			jest.spyOn(endpointMock, 'load');
			jest.spyOn(sendingChainClientMock, 'connect');
		};

		beforeEach(() => {
			chainConnectorPlugin = new ChainConnectorPlugin();
		});

		it('should throw error when receivingChainID is not in the same network', async () => {
			await chainConnectorPlugin.init({
				appConfig: appConfigForPlugin,
				config: {
					loadAsChildProcess: false,
					...defaultConfig,
					receivingChainID: '9999999',
				},
				logger,
			});
			mockLoadFunction();

			await expect(chainConnectorPlugin.load()).rejects.toThrow(
				'Receiving Chain ID network does not match the sending chain network',
			);
		});

		it('should call load on endpoint and blockEventHandler successfully', async () => {
			await chainConnectorPlugin.init({
				appConfig: appConfigForPlugin,
				config: {
					loadAsChildProcess: false,
					...defaultConfig,
				},
				logger,
			});
			mockLoadFunction();
			await chainConnectorPlugin.load();

			expect(chainConnectorPlugin['endpoint'].load).toHaveBeenCalledWith(
				defaultConfig.encryptedPrivateKey,
				chainConnectorPlugin['_chainConnectorDB'],
			);
			expect(chainConnectorPlugin['_blockEventHandler'].load).toHaveBeenCalledTimes(1);
			expect(chainConnectorPlugin['_sendingChainClient'].connect).toHaveBeenCalledTimes(1);
		});
	});

	describe('unload', () => {
		const sendingChainClientMock = {
			disconnect: jest.fn().mockResolvedValue({}),
		};
		const receivingChainClientMock = {
			disconnect: jest.fn().mockResolvedValue({}),
		};
		const dbMock = {
			close: jest.fn().mockResolvedValue({}),
		};

		beforeEach(() => {
			chainConnectorPlugin = new ChainConnectorPlugin();
			(chainConnectorPlugin as any)['_sendingChainClient'] = sendingChainClientMock;
			(chainConnectorPlugin as any)['_receivingChainClient'] = receivingChainClientMock;
			(chainConnectorPlugin as any)['_chainConnectorDB'] = dbMock;

			jest.spyOn(chainConnectorPlugin['_sendingChainClient'], 'disconnect').mockResolvedValue();
			jest.spyOn(chainConnectorPlugin['_receivingChainClient'], 'disconnect').mockResolvedValue();
			jest.spyOn(chainConnectorPlugin['_chainConnectorDB'], 'close').mockReturnValue();
		});

		it('should call disconnect when both clients are available', async () => {
			await chainConnectorPlugin.unload();

			expect(sendingChainClientMock.disconnect).toHaveBeenCalledTimes(1);
			expect(receivingChainClientMock.disconnect).toHaveBeenCalledTimes(1);
			expect(dbMock.close).toHaveBeenCalledTimes(1);
		});

		it('should not call _receivingChainClient when its undefined', async () => {
			(chainConnectorPlugin as any)['_receivingChainClient'] = undefined;
			await chainConnectorPlugin.unload();

			expect(sendingChainClientMock.disconnect).toHaveBeenCalledTimes(1);
			expect(receivingChainClientMock.disconnect).toHaveBeenCalledTimes(0);
			expect(dbMock.close).toHaveBeenCalledTimes(1);
		});
	});
});
