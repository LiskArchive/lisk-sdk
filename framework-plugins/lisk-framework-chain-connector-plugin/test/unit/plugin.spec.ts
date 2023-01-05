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

import {
	Certificate,
	cryptography,
	chain,
	testing,
	apiClient,
	ApplicationConfigForPlugin,
	GenesisConfig,
	codec,
	CCMsg,
	ccmSchema,
	db,
	Block,
	CrossChainUpdateTransactionParams,
	AggregateCommit,
} from 'lisk-sdk';
import { when } from 'jest-when';
import {
	CCU_FREQUENCY,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	MODULE_NAME_INTEROPERABILITY,
	CCM_SEND_SUCCESS,
	CCU_TOTAL_CCM_SIZE,
	ADDRESS_LENGTH,
	BLS_PUBLIC_KEY_LENGTH,
} from '../../src/constants';
import * as plugins from '../../src/chain_connector_plugin';
import * as dbApi from '../../src/db';
import * as utils from '../../src/utils';
import {
	BlockHeader,
	CrossChainMessagesFromEvents,
	ChainConnectorPluginConfig,
	ValidatorsData,
} from '../../src/types';
import * as certificateGeneration from '../../src/certificate_generation';
import * as activeValidatorsUpdateUtil from '../../src/active_validators_update';

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

const getTestBlock = async () => {
	return testing.createBlock({
		chainID: Buffer.from('00001111', 'hex'),
		privateKey: Buffer.from(
			'd4b1a8a6f91482c40ba1d5c054bd7595cc0230291244fc47869f51c21af657b9e142de105ecd851507f2627e991b54b2b71104b11b6660d0646b9fdbe415fd87',
			'hex',
		),
		previousBlockID: cryptography.utils.getRandomBytes(20),
		timestamp: Math.floor(Date.now() / 1000),
	});
};

const getCCM = (n = 1): CCMsg => {
	return {
		nonce: BigInt(n),
		module: MODULE_NAME_INTEROPERABILITY,
		crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
		sendingChainID: Buffer.from([0, 0, 0, 3]),
		receivingChainID: Buffer.from([0, 0, 0, 2]),
		fee: BigInt(n),
		status: 0,
		params: Buffer.alloc(1000),
	};
};

const getEventsJSON = (eventsCount: number, height = 1) => {
	const someEvents = [];
	let i = 0;
	while (i < eventsCount) {
		someEvents.push(
			new chain.Event({
				index: i,
				module: MODULE_NAME_INTEROPERABILITY,
				topics: [cryptography.utils.getRandomBytes(32)],
				name: CCM_SEND_SUCCESS,
				height,
				data: codec.encode(ccmSchema, { ...getCCM(height + i) } as CCMsg),
			}),
		);
		i += 1;
	}
	return someEvents.map(e => e.toJSON());
};

const apiClientMocks = {
	disconnect: jest.fn().mockResolvedValue({} as never),
	invoke: jest.fn(),
	subscribe: jest.fn().mockResolvedValue({} as never),
	connect: jest.fn().mockResolvedValue({} as never),
};
const ownChainID = Buffer.from('10000000', 'hex');

const initChainConnectorPlugin = async (
	chainConnectorPlugin: plugins.ChainConnectorPlugin,
	ccuFrequency = CCU_FREQUENCY,
) => {
	await chainConnectorPlugin.init({
		logger: testing.mocks.loggerMock,
		config: {
			mainchainIPCPath: '~/.lisk/mainchain',
			sidechainIPCPath: '~/.list/sidechain',
			ccuFrequency,
		},
		appConfig: appConfigForPlugin,
	});
};

describe('ChainConnectorPlugin', () => {
	const appConfigForPlugin: ApplicationConfigForPlugin = {
		...testing.fixtures.defaultConfig,
		rpc: {
			modes: ['ipc'],
			port: 8080,
			host: '127.0.0.1',
		},
	};

	const getTestBlock = async () => {
		return testing.createBlock({
			chainID: Buffer.from('00001111', 'hex'),
			privateKey: Buffer.from(
				'd4b1a8a6f91482c40ba1d5c054bd7595cc0230291244fc47869f51c21af657b9e142de105ecd851507f2627e991b54b2b71104b11b6660d0646b9fdbe415fd87',
				'hex',
			),
			previousBlockID: cryptography.utils.getRandomBytes(20),
			timestamp: Math.floor(Date.now() / 1000),
		});
	};

	const getCCM = (n = 1): CCMsg => {
		return {
			nonce: BigInt(n),
			module: MODULE_NAME_INTEROPERABILITY,
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
			sendingChainID: Buffer.from([0, 0, 0, 3]),
			receivingChainID: Buffer.from([0, 0, 0, 2]),
			fee: BigInt(n),
			status: 0,
			params: Buffer.alloc(1000),
		};
	};

	const getEventsJSON = (eventsCount: number, height = 1) => {
		const someEvents = [];
		let i = 0;
		while (i < eventsCount) {
			someEvents.push(
				new chain.Event({
					index: i,
					module: MODULE_NAME_INTEROPERABILITY,
					topics: [cryptography.utils.getRandomBytes(32)],
					name: CCM_SEND_SUCCESS,
					height,
					data: codec.encode(ccmSchema, { ...getCCM(height + i) } as CCMsg),
				}),
			);
			i += 1;
		}
		return someEvents.map(e => e.toJSON());
	};

	const getApiClientMocks = () => {
		return {
			disconnect: jest.fn().mockResolvedValue({} as never),
			invoke: jest.fn(),
			subscribe: jest.fn().mockResolvedValue({} as never),
		};
	};

	const initChainConnectorPlugin = async (
		chainConnectorPlugin: plugins.ChainConnectorPlugin,
		defaultConfig: ChainConnectorPluginConfig & Record<string, unknown>,
	) => {
		await chainConnectorPlugin.init({
			logger: testing.mocks.loggerMock,
			config: defaultConfig,
			appConfig: appConfigForPlugin,
		});
	};

	let chainConnectorPlugin: plugins.ChainConnectorPlugin;
	let sidechainAPIClientMock: apiClient.APIClient;
	const defaultPrivateKey =
		'6c5e2b24ff1cc99da7a49bd28420b93b2a91e2e2a3b0a0ce07676966b707d3c2859bbd02747cf8e26dab592c02155dfddd4a16b0fe83fd7e7ffaec0b5391f3f7';
	const defaultPassword = '123';
	const defaultCCUFee = '100000000';

	const chainConnectorStoreMock = {
		setBlockHeaders: jest.fn(),
		getBlockHeaders: jest.fn(),
		setAggregateCommits: jest.fn(),
		getAggregateCommits: jest.fn(),
		setCrossChainMessages: jest.fn(),
		getCrossChainMessages: jest.fn(),
		getValidatorsHashPreimage: jest.fn(),
		setValidatorsHashPreimage: jest.fn(),
		close: jest.fn(),
	};

	let defaultEncryptedPrivateKey: string;
	let defaultConfig: ChainConnectorPluginConfig & Record<string, unknown>;

	beforeEach(async () => {
		chainConnectorPlugin = new plugins.ChainConnectorPlugin();

		const encryptedKey = await cryptography.encrypt.encryptMessageWithPassword(
			Buffer.from(defaultPrivateKey, 'hex'),
			defaultPassword,
		);
		defaultEncryptedPrivateKey = cryptography.encrypt.stringifyEncryptedMessage(encryptedKey);

		jest.spyOn(dbApi, 'getDBInstance').mockResolvedValue(new db.InMemoryDatabase() as never);
		(chainConnectorPlugin as any)['_sidechainChainConnectorStore'] = chainConnectorStoreMock;
		defaultConfig = {
			mainchainIPCPath: '~/.lisk/mainchain',
			sidechainIPCPath: '~/.lisk/sidechain',
			ccuFee: defaultCCUFee,
			encryptedPrivateKey: defaultEncryptedPrivateKey,
			ccuFrequency: 10,
			password: defaultPassword,
		};

		sidechainAPIClientMock = {
			disconnect: jest.fn().mockResolvedValue({} as never),
			invoke: jest.fn(),
			subscribe: jest.fn(),
		} as any;
	});

	describe('init', () => {
		beforeEach(() => {
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(sidechainAPIClientMock as never);
		});

		it('should assign ccuFrequency properties to default values', async () => {
			await initChainConnectorPlugin(chainConnectorPlugin, {
				mainchainIPCPath: '~/.lisk/mainchain',
				sidechainIPCPath: '~/.lisk/sidechain',
				ccuFee: defaultCCUFee,
				encryptedPrivateKey: defaultEncryptedPrivateKey,
			} as never);
			expect(chainConnectorPlugin['_ccuFrequency']).toEqual(CCU_FREQUENCY);
		});

		it('should assign ccuFrequency properties to passed config values', async () => {
			await initChainConnectorPlugin(chainConnectorPlugin, {
				...defaultConfig,
				ccuFrequency: 300000,
			});
			expect(chainConnectorPlugin['_ccuFrequency']).toBe(300000);
		});
	});

	describe('load', () => {
		beforeEach(() => {
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(apiClientMocks as never);
			(chainConnectorPlugin as any)['_mainchainAPIClient'] = apiClientMocks;
			(chainConnectorPlugin as any)['_sidechainAPIClient'] = apiClientMocks;
			when(apiClientMocks.invoke)
				.calledWith('interoperability_getOwnChainAccount')
				.mockResolvedValue({
					chainID: ownChainID.toString('hex'),
				});
			when(apiClientMocks.invoke)
				.calledWith('interoperability_getChainAccount', { chainID: ownChainID })
				.mockResolvedValue({
					height: 10,
					stateRoot: cryptography.utils.getRandomBytes(32).toString('hex'),
					timestamp: Date.now(),
					validatorsHash: cryptography.utils.getRandomBytes(32).toString('hex'),
				});
		});

		afterEach(async () => {
			await chainConnectorPlugin.unload();
		});

		it('should initialize api clients without sidechain', async () => {
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(getApiClientMocks() as never);
			await initChainConnectorPlugin(chainConnectorPlugin, defaultConfig);
			await chainConnectorPlugin.load();

			expect(chainConnectorPlugin['_mainchainAPIClient']).toBeDefined();
			expect(chainConnectorPlugin['_sidechainAPIClient']).toBe(chainConnectorPlugin['_apiClient']);
		});

		it('should initialize api clients with sidechain', async () => {
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(apiClientMocks as never);
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: defaultConfig,
				appConfig: appConfigForPlugin,
			});
			await chainConnectorPlugin.load();

			expect(chainConnectorPlugin['_mainchainAPIClient']).toBeDefined();
			expect(chainConnectorPlugin['_sidechainAPIClient']).toBeDefined();
		});

		it('should initialize _chainConnectorDB', async () => {
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(apiClientMocks as never);
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: defaultConfig,
				appConfig: appConfigForPlugin,
			});

			await chainConnectorPlugin.load();

			expect(dbApi.getDBInstance).toHaveBeenCalledTimes(1);
			expect(chainConnectorPlugin['_chainConnectorPluginDB']).toEqual(
				new db.InMemoryDatabase() as never,
			);
		});
	});

	describe('_deleteBlockHandler', () => {
		beforeEach(async () => {
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(apiClientMocks as never);
			when(apiClientMocks.invoke)
				.calledWith('interoperability_getOwnChainAccount')
				.mockResolvedValue({
					chainID: ownChainID.toString('hex'),
				});
			(chainConnectorPlugin as any)['_sidechainChainConnectorStore'] = chainConnectorStoreMock;
			await initChainConnectorPlugin(chainConnectorPlugin);
			await chainConnectorPlugin.load();
		});

		it('should delete block header from db corresponding to chain block header', async () => {
			const getSomeBlockHeaders = (count = 4) => {
				let height = 0;
				return new Array(count).fill(0).map(() => {
					height += 1;
					const { id, ...block } = testing.createFakeBlockHeader({ height }).toObject();
					return block;
				});
			};

			const someBlockHeaders = getSomeBlockHeaders();
			expect(someBlockHeaders).toHaveLength(4);

			// let's first save some data to db
			await chainConnectorPlugin['_sidechainChainConnectorStore'].setBlockHeaders(someBlockHeaders);
			await expect(
				chainConnectorPlugin['_sidechainChainConnectorStore'].getBlockHeaders(),
			).resolves.toHaveLength(4);

			// call handler with expected Block having one of stored block headers height
			const block = await getTestBlock();
			expect(block.header.height).toEqual(someBlockHeaders[0].height);

			await (chainConnectorPlugin as any)['_deleteBlockHandler']({
				blockHeader: block.header.toJSON(),
			});

			// here, we assume that block with height 1 was removed from db
			await expect(
				chainConnectorPlugin['_sidechainChainConnectorStore'].getBlockHeaders(),
			).resolves.toHaveLength(3);
		});

		it('should delete aggregateCommits from db corresponding to chain block header', async () => {
			const getSomeAggregateCommits = (count = 4) => {
				let height = 0;
				return new Array(count).fill(0).map(() => {
					height += 1;
					const aggregateCommit: AggregateCommit = {
						height,
						aggregationBits: Buffer.from('00', 'hex'),
						certificateSignature: Buffer.alloc(0),
					};
					return aggregateCommit;
				});
			};

			const someAggregateCommits = getSomeAggregateCommits();
			expect(someAggregateCommits[0].height).toBe(1);
			expect(someAggregateCommits[3].height).toBe(4);

			// let's first save some data to db
			await chainConnectorPlugin['_sidechainChainConnectorStore'].setAggregateCommits(
				someAggregateCommits,
			);
			await expect(
				chainConnectorPlugin['_sidechainChainConnectorStore'].getAggregateCommits(),
			).resolves.toHaveLength(4);

			// call handler with expected Block having one of stored block headers height
			const block = await getTestBlock();
			expect(block.header.height).toBe(1);

			await (chainConnectorPlugin as any)['_deleteBlockHandler']({
				blockHeader: block.header.toJSON(),
			});

			// here, we assume that block with height 1 was removed from db
			await expect(
				chainConnectorPlugin['_sidechainChainConnectorStore'].getAggregateCommits(),
			).resolves.toHaveLength(3);
		});

		it('should delete ValidatorsHashPreimage from db corresponding to chain block header', async () => {
			const getSomeValidatorsHashPreimage = (count = 4, block: Block): ValidatorsData[] => {
				let validatorsHash = block.header.validatorsHash as Buffer;

				let i = -1;
				return new Array(count).fill(0).map(() => {
					i += 1;
					if (i > 0) {
						validatorsHash = cryptography.utils.getRandomBytes(54);
					}
					return {
						certificateThreshold: BigInt(68),
						validators: [
							{
								address: cryptography.utils.getRandomBytes(ADDRESS_LENGTH),
								bftWeight: BigInt(1),
								blsKey: cryptography.utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH),
							},
							{
								address: cryptography.utils.getRandomBytes(ADDRESS_LENGTH),
								bftWeight: BigInt(1),
								blsKey: cryptography.utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH),
							},
						],
						validatorsHash,
					};
				});
			};

			const block = await getTestBlock();

			const someValidatorsHashPreimage = getSomeValidatorsHashPreimage(4, block);
			await chainConnectorPlugin['_sidechainChainConnectorStore'].setValidatorsHashPreimage(
				someValidatorsHashPreimage,
			);
			await expect(
				chainConnectorPlugin['_sidechainChainConnectorStore'].getValidatorsHashPreimage(),
			).resolves.toHaveLength(4);

			expect(block.header.validatorsHash as Buffer).toEqual(
				someValidatorsHashPreimage[0].validatorsHash,
			);

			await (chainConnectorPlugin as any)['_deleteBlockHandler']({
				blockHeader: block.header.toJSON(),
			});

			await expect(
				chainConnectorPlugin['_sidechainChainConnectorStore'].getValidatorsHashPreimage(),
			).resolves.toHaveLength(3);
		});
	});

	describe('_newBlockHandler', () => {
		let block: Block;

		beforeEach(async () => {
			block = await getTestBlock();

			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(sidechainAPIClientMock as never);

			(chainConnectorPlugin as any)['_sidechainChainConnectorStore'] = chainConnectorStoreMock;

			(chainConnectorPlugin as any)['_sidechainAPIClient'] = sidechainAPIClientMock;
			when(sidechainAPIClientMock.invoke)
				.calledWith('interoperability_getOwnChainAccount')
				.mockResolvedValue({
					chainID: ownChainID.toString('hex'),
				});
			(chainConnectorPlugin as any)['_groupCCMsBySize'] = jest.fn();
			when(sidechainAPIClientMock.invoke)
				.calledWith('interoperability_getChainAccount', { chainID: ownChainID })
				.mockResolvedValue({
					height: 10,
					stateRoot: cryptography.utils.getRandomBytes(32).toString('hex'),
					timestamp: Date.now(),
					validatorsHash: cryptography.utils.getRandomBytes(32).toString('hex'),
				});
			(chainConnectorPlugin as any)['_createCCU'] = jest.fn();
			(chainConnectorPlugin as any)['_cleanup'] = jest.fn();
			jest
				.spyOn<plugins.ChainConnectorPlugin, any>(
					chainConnectorPlugin,
					'getNextCertificateFromAggregateCommits',
				)
				.mockResolvedValue({});

			when(sidechainAPIClientMock.invoke)
				.calledWith('consensus_getBFTParameters', { height: block.header.height })
				.mockResolvedValue({
					certificateThreshold: BigInt(70),
					validators: [],
					validatorsHash: cryptography.utils.getRandomBytes(20),
				});
			when(sidechainAPIClientMock.invoke)
				.calledWith('auth_getAuthAccount', { address: expect.any(String) })
				.mockResolvedValue({
					nonce: '2',
				});
			when(sidechainAPIClientMock.invoke).calledWith('system_getNodeInfo').mockResolvedValue({
				chainID: '10000000',
			});
			jest.spyOn<plugins.ChainConnectorPlugin, any>(chainConnectorPlugin, '_submitCCUs');
		});

		afterEach(async () => {
			(chainConnectorPlugin as any)['_mainchainAPIClient'] = apiClientMocks;
			(chainConnectorPlugin as any)['_sidechainAPIClient'] = apiClientMocks;
			await chainConnectorPlugin.unload();
		});

		it('should invoke "consensus_getBFTParameters" on _sidechainAPIClient', async () => {
			when(chainConnectorStoreMock.getBlockHeaders).calledWith().mockResolvedValue([]);

			when(chainConnectorStoreMock.getAggregateCommits).calledWith().mockResolvedValue([]);

			when(chainConnectorStoreMock.getValidatorsHashPreimage).calledWith().mockResolvedValue([]);

			when(chainConnectorStoreMock.getCrossChainMessages).calledWith().mockResolvedValue([]);

			jest.spyOn(chainConnectorPlugin, '_calculateCCUParams').mockResolvedValue();
			await chainConnectorPlugin.load();

			await chainConnectorPlugin['_newBlockHandler']({
				blockHeader: block.header.toJSON(),
			});

			// For chain_newBlock and chain_deleteBlock
			expect(sidechainAPIClientMock.subscribe).toHaveBeenCalledTimes(2);
			expect(sidechainAPIClientMock.invoke).toHaveBeenCalledWith('consensus_getBFTParameters', {
				height: block.header.height,
			});
			expect(chainConnectorPlugin['_submitCCUs']).toHaveBeenCalled();
			expect(chainConnectorPlugin['_cleanup']).toHaveBeenCalled();
		});

		// eslint-disable-next-line jest/no-disabled-tests
		it.skip('should invoke "chain_getEvents" on _sidechainAPIClient', async () => {
			const testBlock = await getTestBlock();
			const eventsJson = getEventsJSON(2);

			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(sidechainAPIClientMock as never);

			when(sidechainAPIClientMock.invoke)
				.calledWith('chain_getEvents', { height: testBlock.header.height })
				.mockResolvedValue(eventsJson);

			when(sidechainAPIClientMock.invoke)
				.calledWith('system_getMetadata')
				.mockResolvedValue({
					modules: [
						{
							name: MODULE_NAME_INTEROPERABILITY,
							stores: [
								{
									key: '03ed0d25f0ba',
									data: {
										$id: '/modules/interoperability/outbox',
									},
								},
							],
						},
					],
				});

			const sampleProof = {
				proof: {
					siblingHashes: [Buffer.alloc(0)],
					queries: [
						{
							key: Buffer.alloc(0),
							value: Buffer.alloc(0),
							bitmap: Buffer.alloc(0),
						},
					],
				},
			};
			when(sidechainAPIClientMock.invoke)
				.calledWith('state_prove', {
					queries: [
						Buffer.concat([Buffer.from('03ed0d25f0ba', 'hex'), Buffer.from('10000000', 'hex')]),
					],
				})
				.mockResolvedValue(sampleProof);

			when(sidechainAPIClientMock.invoke)
				.calledWith('interoperability_ownChainAccount')
				.mockResolvedValue({
					chainID: '10000000',
				});

			await initChainConnectorPlugin(chainConnectorPlugin, defaultConfig);
			await chainConnectorPlugin.load();

			await (chainConnectorPlugin as any)['_newBlockHandler']({
				blockHeader: testBlock.header.toJSON(),
			});

			expect(sidechainAPIClientMock.subscribe).toHaveBeenCalledTimes(1);
			expect(sidechainAPIClientMock.invoke).toHaveBeenCalledWith('chain_getEvents', {
				height: testBlock.header.height,
			});

			expect((chainConnectorPlugin as any)['_submitCCUs']).toHaveBeenCalled();
			expect((chainConnectorPlugin as any)['_cleanup']).toHaveBeenCalled();

			// const ccm = getCCM(1);
			const savedCCMs = await chainConnectorPlugin[
				'_sidechainChainConnectorStore'
			].getCrossChainMessages();

			expect(savedCCMs).toEqual([
				{
					ccms: [
						{ ...getCCM(1), nonce: BigInt(1) },
						{ ...getCCM(2), nonce: BigInt(2) },
					],
					height: 1,
					inclusionProof: {
						bitmap: sampleProof.proof.queries[0].bitmap,
						siblingHashes: sampleProof.proof.siblingHashes,
					},
				},
			]);
		});
	});

	describe('_groupCCMsBySize', () => {
		it('should return CrossChainMessagesFromEvents[][] with length of total CCMs divided by CCU_TOTAL_CCM_SIZE', () => {
			const ccmsFromEvents: CrossChainMessagesFromEvents[] = [];
			const buildNumCCMs = (num: number, fromHeight: number): CCMsg[] => {
				const ccms: CCMsg[] = [];
				let j = 1;
				while (j <= num) {
					ccms.push(getCCM(fromHeight + j));
					j += 1;
				}
				return ccms;
			};

			ccmsFromEvents.push({
				height: 1,
				ccms: buildNumCCMs(2, 1),
				inclusionProof: {} as any,
			});
			ccmsFromEvents.push({
				height: 3,
				ccms: buildNumCCMs(5, 3),
				inclusionProof: {} as any,
			});
			ccmsFromEvents.push({
				height: 4,
				ccms: buildNumCCMs(20, 4),
				inclusionProof: {} as any,
			});

			// after filtering, we will have ccms only from heights 3 & 4, so total 25 (20 + 5)
			chainConnectorPlugin['_lastCertificate'] = {
				height: 2,
				stateRoot: Buffer.alloc(1),
				timestamp: Date.now(),
				validatorsHash: Buffer.alloc(1),
			};
			const listOfCCMs = (chainConnectorPlugin as any)['_groupCCMsBySize'](ccmsFromEvents, {
				height: 5,
			} as Certificate);

			const getTotalSize = (ccms: CCMsg[]) => {
				return ccms
					.map(ccm => codec.encode(ccmSchema, ccm).length) // to each CCM size
					.reduce((a, b) => a + b, 0); // sum
			};

			// for 25 CCMs (after filtering), we will have 3 lists
			expect(listOfCCMs).toHaveLength(3);

			// Ist list will have 9 CCMs (start index 0, last index = 8), totalSize = 9531 (1059 * 9))
			const firstList = listOfCCMs[0];
			expect(firstList).toHaveLength(9);
			expect(getTotalSize(firstList)).toBeLessThan(CCU_TOTAL_CCM_SIZE);

			// 2nd list will have 9 CCMs (start index 9, last index = 17)
			const secondList = listOfCCMs[1];
			expect(secondList).toHaveLength(9);
			expect(getTotalSize(secondList)).toBeLessThan(CCU_TOTAL_CCM_SIZE);

			// 3rd list will have 7 CCMs (start index 18)
			const thirdList = listOfCCMs[2];
			expect(thirdList).toHaveLength(9);
		});
	});

	describe('unload', () => {
		it.todo('should unload plugin');
	});

	describe('Cleanup Functions', () => {
		let block1: BlockHeader;
		let block2: BlockHeader;

		beforeEach(async () => {
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(sidechainAPIClientMock as never);
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: defaultConfig,
				appConfig: appConfigForPlugin,
			});

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

			await chainConnectorPlugin.load();
			(chainConnectorPlugin as any)['_sidechainChainConnectorStore'] = chainConnectorStoreMock;

			chainConnectorPlugin['_lastCertificate'] = {
				height: 6,
				stateRoot: cryptography.utils.getRandomBytes(32),
				timestamp: Date.now(),
				validatorsHash: cryptography.utils.getRandomBytes(32),
			};
			chainConnectorStoreMock.getCrossChainMessages.mockResolvedValue([
				getCCM(1),
				getCCM(2),
			] as never);
			jest
				.spyOn(chainConnectorPlugin['_sidechainChainConnectorStore'], 'getAggregateCommits')
				.mockResolvedValue([
					{
						height: 5,
					},
				] as never);
			jest
				.spyOn(chainConnectorPlugin['_sidechainChainConnectorStore'], 'getValidatorsHashPreimage')
				.mockResolvedValue([
					{
						certificateThreshold: 5,
					},
				] as never);
			block1 = testing.createFakeBlockHeader({ height: 5 }).toObject();
			block2 = testing.createFakeBlockHeader({ height: 6 }).toObject();
			chainConnectorStoreMock.getBlockHeaders.mockResolvedValue([block1, block2] as never);
		});

		it('should delete block headers with height less than _lastCertifiedHeight', async () => {
			await chainConnectorPlugin['_cleanup']();

			expect(chainConnectorStoreMock.getBlockHeaders).toHaveBeenCalledTimes(1);

			expect(chainConnectorStoreMock.setBlockHeaders).toHaveBeenCalledWith([block2]);
		});

		it('should delete aggregate commits with height less than _lastCertifiedHeight', async () => {
			await chainConnectorPlugin['_cleanup']();

			expect(
				chainConnectorPlugin['_sidechainChainConnectorStore'].getAggregateCommits,
			).toHaveBeenCalledTimes(1);

			expect(
				chainConnectorPlugin['_sidechainChainConnectorStore'].setAggregateCommits,
			).toHaveBeenCalledWith([]);
		});

		it('should delete validatorsHashPreimage with certificate threshold less than _lastCertifiedHeight', async () => {
			await chainConnectorPlugin['_cleanup']();

			expect(
				chainConnectorPlugin['_sidechainChainConnectorStore'].getValidatorsHashPreimage,
			).toHaveBeenCalledTimes(1);

			expect(
				chainConnectorPlugin['_sidechainChainConnectorStore'].setValidatorsHashPreimage,
			).toHaveBeenCalledWith([]);
		});
	});

	describe('_calculateInboxUpdate', () => {
		const sendingChainID = Buffer.from('00000001', 'hex');
		const mockEncodedCCM = Buffer.from('01');
		// const sendingChainID = Buffer.from('00000001', 'hex');
		const certificate: Certificate = {
			blockID: Buffer.alloc(1),
			height: 2,
			stateRoot: Buffer.alloc(1),
			timestamp: Date.now(),
			validatorsHash: Buffer.alloc(1),
		};

		const ccms = [getCCM(0), getCCM(1)];
		const ccmHashes = ccms.map(ccm => codec.encode(ccmSchema, ccm));
		const expectedInboxUpdate = [
			{
				crossChainMessages: ccmHashes,
				messageWitnessHashes: [],
				outboxRootWitness: {
					bitmap: Buffer.alloc(1),
					siblingHashes: [Buffer.alloc(0)],
				},
			},
		];

		beforeEach(() => {
			jest.spyOn(codec, 'encode').mockReturnValue(mockEncodedCCM);

			chainConnectorPlugin['_sidechainAPIClient'] = sidechainAPIClientMock as never;

			(chainConnectorPlugin['_sidechainAPIClient'] as any).invoke = jest.fn().mockResolvedValue({
				proof: {
					queries: [
						{
							bitmap: Buffer.from('00'),
						},
					],
					siblingHashes: [],
				},
			});
		});

		it('should call state_prove endpoint on _sidechainAPIClient', async () => {
			await chainConnectorPlugin['_calculateInboxUpdate'](certificate);

			expect(chainConnectorPlugin['_sidechainAPIClient'].invoke).toHaveBeenCalledTimes(1);

			expect(chainConnectorPlugin['_sidechainAPIClient'].invoke).toHaveBeenCalledWith(
				'state_prove',
				{
					queries: [sendingChainID],
				},
			);
		});

		it('should return InboxUpdate with messageWitnessHashes set to empty array', async () => {
			const inboxUpdate = await chainConnectorPlugin['_calculateInboxUpdate'](
				certificate,
			);

			expect(inboxUpdate).toEqual(expectedInboxUpdate);
		});
	});

	describe('_calculateCCUParams', () => {
		const validatorsHash = Buffer.from('01');
		// const sendingChainID = Buffer.from('01');
		const certificate: Certificate = {
			height: 5,
			validatorsHash,
			stateRoot: Buffer.from('00'),
			blockID: Buffer.from('00'),
			timestamp: Date.now(),
		};
		const certificateBytes = Buffer.from('ff');
		// const newCertificateThreshold = BigInt(7);
		const chainAccount = {
			lastCertificate: {
				validatorsHash,
			},
		};
		const certificateValidationPassingResult = { status: true };
		const certificateValidationFailingResult = { status: false };
		// const filteredBlockHeader = {
		// 	height: 5,
		// 	validatorsHash,
		// };

		beforeEach(() => {
			(chainConnectorPlugin as any)['_sidechainChainConnectorStore'] = chainConnectorStoreMock;
			chainConnectorStoreMock.getBlockHeaders.mockResolvedValue([
				{
					height: 5,
					validatorsHash,
				},
				{
					height: 6,
					validatorsHash,
				},
			] as never);

			chainConnectorStoreMock.getValidatorsHashPreimage.mockResolvedValue([
				{
					validatorsHash,
					certificateThreshold: BigInt(0),
					validators: [
						{
							bftWeight: BigInt(1),
							blsKey: Buffer.alloc(2),
						},
						{
							bftWeight: BigInt(2),
							blsKey: Buffer.alloc(1),
						},
					],
				},
			] as never);

			jest
				.spyOn(certificateGeneration, 'getNextCertificateFromAggregateCommits')
				.mockReturnValue(certificate as never);
			chainConnectorPlugin['_mainchainAPIClient'] = sidechainAPIClientMock as never;
			chainConnectorPlugin['_sidechainAPIClient'] = sidechainAPIClientMock as never;
			chainConnectorPlugin['_mainchainAPIClient'].invoke = jest
				.fn()
				.mockResolvedValue(chainAccount);
			jest
				.spyOn(certificateGeneration, 'validateCertificate')
				.mockResolvedValue(certificateValidationFailingResult as never);
			chainConnectorPlugin['logger'] = {
				error: jest.fn(),
			} as never;

			jest.spyOn(codec, 'encode').mockReturnValue(certificateBytes);
			jest.spyOn(activeValidatorsUpdateUtil, 'getActiveValidatorsDiff').mockReturnValue([]);
			chainConnectorPlugin['_calculateInboxUpdate'] = jest.fn().mockResolvedValue([
				{
					crossChainMessages: [Buffer.alloc(0)],
					messageWitnessHashes: [Buffer.alloc(0)],
					outboxRootWitness: {
						bitmap: Buffer.alloc(0),
						siblingHashes: [Buffer.alloc(0)],
					},
				},
			]);
			chainConnectorPlugin['_lastCertificate'] = certificate;
		});

		it('should call interoperability_getChainAccount on _mainchainAPIClient', async () => {
			await chainConnectorPlugin['_calculateCCUParams']();

			expect(chainConnectorPlugin['_mainchainAPIClient'].invoke).toHaveBeenCalledTimes(1);
			expect(chainConnectorPlugin['_mainchainAPIClient'].invoke).toHaveBeenCalledWith(
				'consensus_getBFTHeights',
			);
		});

		it('should return undefined if certificate validation fails', async () => {
			const ccuTxParams = await chainConnectorPlugin['_calculateCCUParams']();

			expect(ccuTxParams).toBeUndefined();
		});

		it('should call _calculateInboxUpdate', async () => {
			jest
				.spyOn(certificateGeneration, 'validateCertificate')
				.mockResolvedValue(certificateValidationPassingResult as never);

			await chainConnectorPlugin['_calculateCCUParams']();

			expect(chainConnectorPlugin['_calculateInboxUpdate']).toHaveBeenCalledTimes(1);
			expect(chainConnectorPlugin['_calculateInboxUpdate']).toHaveBeenCalled();
		});

		describe('when chainAccount.lastCertificate.validatorsHash == certificate.validatorsHash', () => {
			beforeEach(() => {
				jest
					.spyOn(certificateGeneration, 'validateCertificate')
					.mockResolvedValue(certificateValidationPassingResult as never);
			});

			it('should return CCUTxParams with activeValidatorsUpdate set to []', async () => {
				await expect(chainConnectorPlugin['_calculateCCUParams']()).resolves.toBeUndefined();
			});
		});
	});

	describe('_submitCCUs', () => {
		const ccuParams = [
			cryptography.utils.getRandomBytes(100),
			cryptography.utils.getRandomBytes(100),
		];
		beforeEach(async () => {
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(sidechainAPIClientMock as never);
			await initChainConnectorPlugin(chainConnectorPlugin, defaultConfig);
			(chainConnectorPlugin['_sidechainAPIClient'] as any) = sidechainAPIClientMock;
			when(sidechainAPIClientMock.invoke)
				.calledWith('system_getNodeInfo')
				.mockResolvedValue({
					chainID: '10000000',
				})
				.calledWith('txpool_postTransaction', expect.anything())
				.mockResolvedValue({
					transactionId: 'transaction-id',
				})
				.calledWith('auth_getAuthAccount', expect.anything())
				.mockResolvedValue({ nonce: '3' });

			await chainConnectorPlugin['_submitCCUs'](ccuParams);
		});

		it('should get the chainID from the node', () => {
			expect(sidechainAPIClientMock.invoke).toHaveBeenCalledWith('system_getNodeInfo');
		});

		it('should get the current nonce for the account', () => {
			expect(sidechainAPIClientMock.invoke).toHaveBeenCalledWith('auth_getAuthAccount', {
				address: expect.any(String),
			});
		});

		it('should create and post the CCUs', () => {
			expect(sidechainAPIClientMock.invoke).toHaveBeenCalledWith('txpool_postTransaction', {
				transaction: expect.any(String),
			});
			expect(sidechainAPIClientMock.invoke).toHaveBeenCalledTimes(4);
		});
	});
});
