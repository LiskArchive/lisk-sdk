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

import { removeSync } from 'fs-extra';
import { when } from 'jest-when';
import {
	ApplicationConfigForPlugin,
	GenesisConfig,
	testing,
	cryptography,
	apiClient,
	db,
} from 'lisk-sdk';
import { ChainConnectorPlugin } from '../../src/chain_connector_plugin';
import * as chainConnectorDB from '../../src/db';

describe('getSentCCUs', () => {
	const appConfigForPlugin: ApplicationConfigForPlugin = {
		system: {
			keepEventsForHeights: -1,
			dataPath: '~/.lisk',
			logLevel: 'info',
			version: '1.0.0',
		},
		rpc: {
			modes: ['ipc'],
			port: 8080,
			host: '127.0.0.1',
		},
		network: {
			seedPeers: [],
			port: 5000,
			version: '1.0.0',
		},
		transactionPool: {
			maxTransactions: 4096,
			maxTransactionsPerAccount: 64,
			transactionExpiryTime: 3 * 60 * 60 * 1000,
			minEntranceFeePriority: '0',
			minReplacementFeeDifference: '10',
		},
		genesis: {} as GenesisConfig,
		generator: {
			keys: {
				fromFile: '',
			},
		},
		modules: {},
		legacy: {
			brackets: [],
			sync: false,
		},
	};

	const validators = [
		{
			address: cryptography.utils.getRandomBytes(20),
			bftWeight: BigInt(2),
			blsKey: cryptography.utils.getRandomBytes(20),
		},
	];
	const validatorsJSON = [
		{
			address: validators[0].address.toString('hex'),
			bftWeight: BigInt(2).toString(),
			blsKey: validators[0].blsKey.toString('hex'),
		},
	];
	const validatorsData = {
		certificateThreshold: BigInt(70),
		validators,
		validatorsHash: cryptography.utils.getRandomBytes(20),
	};
	const validatorsDataJSON = {
		certificateThreshold: validatorsData.certificateThreshold.toString(),
		validators: validatorsJSON,
		validatorsHash: validatorsData.validatorsHash.toString('hex'),
	};
	const aggregateCommit = {
		height: 0,
		aggregationBits: Buffer.alloc(0),
		certificateSignature: Buffer.alloc(0),
	};
	const aggregateCommitJSON = {
		height: 0,
		aggregationBits: Buffer.alloc(0).toString('hex'),
		certificateSignature: Buffer.alloc(0).toString('hex'),
	};

	const defaultPrivateKey =
		'6c5e2b24ff1cc99da7a49bd28420b93b2a91e2e2a3b0a0ce07676966b707d3c2859bbd02747cf8e26dab592c02155dfddd4a16b0fe83fd7e7ffaec0b5391f3f7';
	const defaultPassword = '123';
	const defaultCCUFee = '100000000';

	const ownChainID = Buffer.from('10000000', 'hex');
	let chainConnectorPlugin: ChainConnectorPlugin;

	beforeEach(async () => {
		chainConnectorPlugin = new ChainConnectorPlugin();
		const sidechainAPIClientMock = {
			subscribe: jest.fn(),
			invoke: jest.fn(),
		};
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(sidechainAPIClientMock as never);
		when(sidechainAPIClientMock.invoke)
			.calledWith('interoperability_getOwnChainAccount')
			.mockResolvedValue({
				chainID: ownChainID.toString('hex'),
			});
		when(sidechainAPIClientMock.invoke)
			.calledWith('interoperability_getChainAccount', { chainID: ownChainID })
			.mockResolvedValue({
				height: 10,
				stateRoot: cryptography.utils.getRandomBytes(32).toString('hex'),
				timestamp: Date.now(),
				validatorsHash: cryptography.utils.getRandomBytes(32).toString('hex'),
			});
		jest
			.spyOn(chainConnectorDB, 'getDBInstance')
			.mockResolvedValue(new db.InMemoryDatabase() as never);

		const encryptedKey = await cryptography.encrypt.encryptMessageWithPassword(
			Buffer.from(defaultPrivateKey, 'hex'),
			defaultPassword,
		);
		const defaultEncryptedPrivateKey = cryptography.encrypt.stringifyEncryptedMessage(encryptedKey);

		await chainConnectorPlugin.init({
			config: {
				mainchainIPCPath: '~/.lisk/mainchain',
				sidechainIPCPath: '~/.lisk/sidechain',
				ccuFee: defaultCCUFee,
				encryptedPrivateKey: defaultEncryptedPrivateKey,
				ccuFrequency: 10,
				password: defaultPassword,
			},
			appConfig: appConfigForPlugin,
			logger: testing.mocks.loggerMock,
		});
		(chainConnectorPlugin as any)['_sidechainAPIClient'] = sidechainAPIClientMock;
		when(sidechainAPIClientMock.invoke)
			.calledWith('interoperability_getChainAccount', { chainID: ownChainID })
			.mockResolvedValue({
				lastCertificate: {
					height: 10,
					stateRoot: cryptography.utils.getRandomBytes(32).toString('hex'),
					timestamp: Date.now(),
					validatorsHash: cryptography.utils.getRandomBytes(32).toString('hex'),
				},
				name: 'chain1',
				status: 1,
			});
		await chainConnectorPlugin.load();
		await chainConnectorPlugin['_sidechainChainConnectorStore'].setAggregateCommits([
			aggregateCommit,
		]);
		await chainConnectorPlugin['_sidechainChainConnectorStore'].setValidatorsHashPreimage([
			validatorsData,
		]);
	});

	afterEach(async () => {
		(chainConnectorPlugin as any)['_sidechainAPIClient'] = {
			disconnect: jest.fn(),
		};
		(chainConnectorPlugin as any)['_mainchainAPIClient'] = {
			disconnect: jest.fn(),
		};

		await chainConnectorPlugin['_sidechainChainConnectorStore']['_db'].clear();
	});

	afterAll(() => {
		chainConnectorPlugin['_sidechainChainConnectorStore']['_db'].close();

		removeSync(chainConnectorPlugin['dataPath']);
	});

	describe('getSentCCUs', () => {
		it('should return sent ccus', async () => {
			const response = await chainConnectorPlugin.endpoint.getSentCCUs({} as any);

			expect(response).toStrictEqual([]);
		});
	});

	describe('getAggregateCommits', () => {
		it('should return aggregate commits', async () => {
			const response = await chainConnectorPlugin.endpoint.getAggregateCommits({} as any);

			expect(response).toStrictEqual([aggregateCommitJSON]);
		});
	});

	describe('getValidatorsInfoFromPreimage', () => {
		it('should return list of validators info', async () => {
			const response = await chainConnectorPlugin.endpoint.getValidatorsInfoFromPreimage({} as any);

			expect(response).toStrictEqual([validatorsDataJSON]);
		});
	});
});
