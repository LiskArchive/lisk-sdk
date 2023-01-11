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
	testing,
	apiClient,
	ApplicationConfigForPlugin,
	codec,
	db,
	Block,
	AggregateCommit,
	chain,
	ccmSchema,
} from 'lisk-sdk';
import { when } from 'jest-when';
import {
	CCU_FREQUENCY,
	MODULE_NAME_INTEROPERABILITY,
	CCM_SEND_SUCCESS,
	ADDRESS_LENGTH,
	BLS_PUBLIC_KEY_LENGTH,
	HASH_LENGTH,
	CCM_PROCESSED,
} from '../../src/constants';
import * as plugins from '../../src/chain_connector_plugin';
import * as dbApi from '../../src/db';
import { BlockHeader, ChainConnectorPluginConfig, ValidatorsData } from '../../src/types';
import * as certificateGenerationUtil from '../../src/certificate_generation';
import * as activeValidatorsUpdateUtil from '../../src/active_validators_update';
import * as inboxUpdateUtil from '../../src/inbox_update';
import { getSampleCCM } from '../utils/sampleCCM';

const apiClientMocks = {
	disconnect: jest.fn().mockResolvedValue({} as never),
	invoke: jest.fn(),
	subscribe: jest.fn().mockResolvedValue({} as never),
	connect: jest.fn().mockResolvedValue({} as never),
};
const ownChainID = Buffer.from('10000000', 'hex');

describe('ChainConnectorPlugin', () => {
	const appConfigForPlugin: ApplicationConfigForPlugin = {
		...testing.fixtures.defaultConfig,
		rpc: {
			modes: ['ipc'],
			port: 8080,
			host: '127.0.0.1',
		},
	};

	enum CCMProcessedResult {
		APPLIED = 0,
		FORWARDED = 1,
		BOUNCED = 2,
		DISCARDED = 3,
	}

	const ccmSendSuccessDataSchema = {
		$id: '/interoperability/events/ccmSendSuccess',
		type: 'object',
		required: ['ccm'],
		properties: {
			ccm: {
				fieldNumber: 1,
				type: ccmSchema.type,
				required: [...ccmSchema.required],
				properties: {
					...ccmSchema.properties,
				},
			},
		},
	};

	const ccmProcessedEventSchema = {
		$id: '/interoperability/events/ccmProcessed',
		type: 'object',
		required: ['ccm', 'result', 'code'],
		properties: {
			ccm: {
				fieldNumber: 1,
				type: ccmSchema.type,
				required: [...ccmSchema.required],
				properties: {
					...ccmSchema.properties,
				},
			},
			result: {
				dataType: 'uint32',
				fieldNumber: 2,
			},
			code: {
				dataType: 'uint32',
				fieldNumber: 3,
			},
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
	let sendingChainAPIClientMock: apiClient.APIClient;
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
		jest
			.spyOn(cryptography.encrypt, 'decryptMessageWithPassword')
			.mockResolvedValue(Buffer.from(defaultPrivateKey, 'hex') as never);
		(chainConnectorPlugin as any)['_chainConnectorStore'] = chainConnectorStoreMock;
		defaultConfig = {
			receivingChainIPCPath: '~/.lisk/mainchain',
			ccuFee: defaultCCUFee,
			encryptedPrivateKey: defaultEncryptedPrivateKey,
			ccuFrequency: 10,
			password: defaultPassword,
		};

		sendingChainAPIClientMock = {
			disconnect: jest.fn().mockResolvedValue({} as never),
			invoke: jest.fn(),
			subscribe: jest.fn(),
		} as any;
	});

	describe('init', () => {
		beforeEach(() => {
			jest
				.spyOn(apiClient, 'createIPCClient')
				.mockResolvedValue(sendingChainAPIClientMock as never);
		});

		it('should assign ccuFrequency properties to default values', async () => {
			await initChainConnectorPlugin(chainConnectorPlugin, {
				receivingChainIPCPath: '~/.lisk/mainchain',
				ccuFee: defaultCCUFee,
				encryptedPrivateKey: defaultEncryptedPrivateKey,
				password: 'lisk',
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
			(chainConnectorPlugin as any)['_receivingChainClient'] = apiClientMocks;
			(chainConnectorPlugin as any)['_sendingChainClient'] = apiClientMocks;
			when(apiClientMocks.invoke)
				.calledWith('interoperability_getOwnChainAccount')
				.mockResolvedValue({
					chainID: ownChainID.toString('hex'),
				});
			when(apiClientMocks.invoke)
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
		});

		afterEach(async () => {
			await chainConnectorPlugin.unload();
		});

		it('should initialize api clients without sidechain', async () => {
			await initChainConnectorPlugin(chainConnectorPlugin, defaultConfig);
			await chainConnectorPlugin.load();

			expect(chainConnectorPlugin['_receivingChainClient']).toBeDefined();
			expect(chainConnectorPlugin['_sendingChainClient']).toBe(chainConnectorPlugin['_apiClient']);
		});

		it('should initialize api clients with sidechain', async () => {
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: defaultConfig,
				appConfig: appConfigForPlugin,
			});
			await chainConnectorPlugin.load();

			expect(chainConnectorPlugin['_receivingChainClient']).toBeDefined();
			expect(chainConnectorPlugin['_sendingChainClient']).toBeDefined();
		});

		it('should call createWSClient when receivingChainWsURL is provided', async () => {
			jest.spyOn(apiClient, 'createWSClient').mockResolvedValue(apiClientMocks as never);

			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: {
					receivingChainWsURL: 'ws://127.0.0.1:8080/rpc',
					ccuFee: defaultCCUFee,
					encryptedPrivateKey: defaultEncryptedPrivateKey,
					password: 'lisk',
				},
				appConfig: appConfigForPlugin,
			});

			await chainConnectorPlugin.load();
			expect(apiClient.createWSClient).toHaveBeenCalled();
		});

		it('should throw error when receivingChainWsURL and receivingChainIPCPath are undefined', async () => {
			jest.spyOn(apiClient, 'createWSClient').mockResolvedValue(apiClientMocks as never);

			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: {
					ccuFee: defaultCCUFee,
					encryptedPrivateKey: defaultEncryptedPrivateKey,
					password: 'lisk',
				},
				appConfig: appConfigForPlugin,
			});

			await expect(chainConnectorPlugin.load()).rejects.toThrow(
				'IPC path and WS url are undefined',
			);
		});

		it('should initialize _chainConnectorDB', async () => {
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
			(chainConnectorPlugin as any)['_chainConnectorStore'] = chainConnectorStoreMock;
			await initChainConnectorPlugin(chainConnectorPlugin, defaultConfig);
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
			await chainConnectorPlugin['_chainConnectorStore'].setBlockHeaders(someBlockHeaders);
			await expect(
				chainConnectorPlugin['_chainConnectorStore'].getBlockHeaders(),
			).resolves.toHaveLength(4);

			// call handler with expected Block having one of stored block headers height
			const block = await getTestBlock();
			expect(block.header.height).toEqual(someBlockHeaders[0].height);

			await (chainConnectorPlugin as any)['_deleteBlockHandler']({
				blockHeader: block.header.toJSON(),
			});

			// here, we assume that block with height 1 was removed from db
			await expect(
				chainConnectorPlugin['_chainConnectorStore'].getBlockHeaders(),
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
			await chainConnectorPlugin['_chainConnectorStore'].setAggregateCommits(someAggregateCommits);
			await expect(
				chainConnectorPlugin['_chainConnectorStore'].getAggregateCommits(),
			).resolves.toHaveLength(4);

			// call handler with expected Block having one of stored block headers height
			const block = await getTestBlock();
			expect(block.header.height).toBe(1);

			await (chainConnectorPlugin as any)['_deleteBlockHandler']({
				blockHeader: block.header.toJSON(),
			});

			// here, we assume that block with height 1 was removed from db
			await expect(
				chainConnectorPlugin['_chainConnectorStore'].getAggregateCommits(),
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
			await chainConnectorPlugin['_chainConnectorStore'].setValidatorsHashPreimage(
				someValidatorsHashPreimage,
			);
			await expect(
				chainConnectorPlugin['_chainConnectorStore'].getValidatorsHashPreimage(),
			).resolves.toHaveLength(4);

			expect(block.header.validatorsHash as Buffer).toEqual(
				someValidatorsHashPreimage[0].validatorsHash,
			);

			await (chainConnectorPlugin as any)['_deleteBlockHandler']({
				blockHeader: block.header.toJSON(),
			});

			await expect(
				chainConnectorPlugin['_chainConnectorStore'].getValidatorsHashPreimage(),
			).resolves.toHaveLength(3);
		});
	});

	describe('_newBlockHandler', () => {
		let block: Block;

		beforeEach(async () => {
			block = await getTestBlock();

			jest
				.spyOn(apiClient, 'createIPCClient')
				.mockResolvedValue(sendingChainAPIClientMock as never);

			(chainConnectorPlugin as any)['_chainConnectorStore'] = chainConnectorStoreMock;

			chainConnectorPlugin['_sendingChainClient'] = sendingChainAPIClientMock;
			when(sendingChainAPIClientMock.invoke)
				.calledWith('interoperability_getOwnChainAccount')
				.mockResolvedValue({
					chainID: ownChainID.toString('hex'),
				});

			when(sendingChainAPIClientMock.invoke)
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
			(chainConnectorPlugin as any)['_createCCU'] = jest.fn();
			(chainConnectorPlugin as any)['_cleanup'] = jest.fn();

			when(sendingChainAPIClientMock.invoke)
				.calledWith('consensus_getBFTParameters', { height: block.header.height })
				.mockResolvedValue({
					prevoteThreshold: '2',
					precommitThreshold: '2',
					certificateThreshold: '3',
					validators: [
						{
							address: cryptography.utils.getRandomBytes(ADDRESS_LENGTH).toString('hex'),
							bftWeight: '2',
							generatorKey: cryptography.utils.getRandomBytes(32).toString('hex'),
							blsKey: cryptography.utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH).toString('hex'),
						},
					],
					validatorsHash: cryptography.utils.getRandomBytes(HASH_LENGTH).toString('hex'),
				});
			when(sendingChainAPIClientMock.invoke)
				.calledWith('auth_getAuthAccount', { address: expect.any(String) })
				.mockResolvedValue({
					nonce: '2',
				});
			when(sendingChainAPIClientMock.invoke).calledWith('system_getNodeInfo').mockResolvedValue({
				chainID: '10000000',
			});
			jest.spyOn(chainConnectorPlugin as any, '_submitCCUs').mockResolvedValue({});
		});

		afterEach(async () => {
			(chainConnectorPlugin as any)['_receivingChainClient'] = apiClientMocks;
			(chainConnectorPlugin as any)['_sendingChainClient'] = apiClientMocks;
			await chainConnectorPlugin.unload();
		});

		it('should invoke "consensus_getBFTParameters" on _sendingChainClient', async () => {
			when(chainConnectorStoreMock.getBlockHeaders).calledWith().mockResolvedValue([]);

			when(chainConnectorStoreMock.getAggregateCommits).calledWith().mockResolvedValue([]);

			when(chainConnectorStoreMock.getValidatorsHashPreimage).calledWith().mockResolvedValue([]);

			when(chainConnectorStoreMock.getCrossChainMessages).calledWith().mockResolvedValue([]);

			jest.spyOn(chainConnectorPlugin, '_calculateCCUParams').mockResolvedValue([]);

			await initChainConnectorPlugin(chainConnectorPlugin, defaultConfig);
			await chainConnectorPlugin.load();

			await chainConnectorPlugin['_newBlockHandler']({
				blockHeader: block.header.toJSON(),
			});

			// For chain_newBlock and chain_deleteBlock
			expect(sendingChainAPIClientMock.subscribe).toHaveBeenCalledTimes(2);
			expect(sendingChainAPIClientMock.invoke).toHaveBeenCalledWith('consensus_getBFTParameters', {
				height: block.header.height,
			});
			expect(chainConnectorPlugin['_submitCCUs']).toHaveBeenCalled();
			expect(chainConnectorPlugin['_cleanup']).toHaveBeenCalled();
		});

		it('should invoke "chain_getEvents" on _sendingChainClient', async () => {
			const newBlockHeaderHeight = 11;
			const blockHeaderAtLastCertifiedHeight = {
				...testing
					.createFakeBlockHeader({
						height: newBlockHeaderHeight - 1,
					})
					.toObject(),
				generatorAddress: Buffer.from('66687aadf862bd776c8fc18b8e9f8e2008971485'),
			};
			const newBlockHeaderJSON = {
				...testing
					.createFakeBlockHeader({
						height: newBlockHeaderHeight,
					})
					.toJSON(),
				generatorAddress: 'lskoaknq582o6fw7sp82bm2hnj7pzp47mpmbmux2g',
			};
			const blockHeaders = [
				blockHeaderAtLastCertifiedHeight,
				chain.BlockHeader.fromJSON(newBlockHeaderJSON).toObject(),
			];
			when(sendingChainAPIClientMock.invoke)
				.calledWith('consensus_getBFTParameters', { height: newBlockHeaderHeight })
				.mockResolvedValue({
					prevoteThreshold: '2',
					precommitThreshold: '2',
					certificateThreshold: '3',
					validators: [
						{
							address: cryptography.utils.getRandomBytes(ADDRESS_LENGTH).toString('hex'),
							bftWeight: '2',
							generatorKey: cryptography.utils.getRandomBytes(32).toString('hex'),
							blsKey: cryptography.utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH).toString('hex'),
						},
					],
					validatorsHash: cryptography.utils.getRandomBytes(HASH_LENGTH).toString('hex'),
				});
			chainConnectorStoreMock.getBlockHeaders.mockResolvedValue(blockHeaders);

			when(chainConnectorStoreMock.getAggregateCommits)
				.calledWith()
				.mockResolvedValue(blockHeaders.map(b => b.aggregateCommit));

			when(chainConnectorStoreMock.getValidatorsHashPreimage).calledWith().mockResolvedValue([]);

			when(chainConnectorStoreMock.getCrossChainMessages).calledWith().mockResolvedValue([]);

			jest.spyOn(chainConnectorPlugin, '_calculateCCUParams').mockResolvedValue([Buffer.alloc(1)]);

			const ccmSendSuccessEvent = {
				index: 1,
				module: MODULE_NAME_INTEROPERABILITY,
				topics: [cryptography.utils.getRandomBytes(32).toString('hex')],
				name: CCM_SEND_SUCCESS,
				height: newBlockHeaderHeight,
				data: codec.encode(ccmSendSuccessDataSchema, { ccm: getSampleCCM(1) }).toString('hex'),
			};

			const ccmProcessedEvent = {
				index: 4,
				module: MODULE_NAME_INTEROPERABILITY,
				topics: [cryptography.utils.getRandomBytes(32).toString('hex')],
				name: CCM_PROCESSED,
				height: newBlockHeaderHeight,
				data: codec
					.encode(ccmProcessedEventSchema, {
						ccm: getSampleCCM(2),
						result: CCMProcessedResult.FORWARDED,
						code: 1,
					})
					.toString('hex'),
			};

			const eventsJSON = [ccmSendSuccessEvent, ccmProcessedEvent];

			jest
				.spyOn(apiClient, 'createIPCClient')
				.mockResolvedValue(sendingChainAPIClientMock as never);

			when(sendingChainAPIClientMock.invoke)
				.calledWith('chain_getEvents', { height: newBlockHeaderHeight })
				.mockResolvedValue(eventsJSON);

			when(sendingChainAPIClientMock.invoke)
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
							events: [
								{
									name: CCM_SEND_SUCCESS,
									data: ccmSendSuccessDataSchema,
								},
								{
									name: CCM_PROCESSED,
									data: ccmProcessedEventSchema,
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
			when(sendingChainAPIClientMock.invoke)
				.calledWith('state_prove', {
					queries: [
						Buffer.concat([Buffer.from('03ed0d25f0ba', 'hex'), Buffer.from('10000000', 'hex')]),
					],
				})
				.mockResolvedValue(sampleProof);

			when(sendingChainAPIClientMock.invoke)
				.calledWith('interoperability_ownChainAccount')
				.mockResolvedValue({
					chainID: '10000000',
				});

			await initChainConnectorPlugin(chainConnectorPlugin, defaultConfig);
			await chainConnectorPlugin.load();

			(chainConnectorPlugin as any)['_chainConnectorStore'] = chainConnectorStoreMock;
			await (chainConnectorPlugin as any)['_newBlockHandler']({
				blockHeader: newBlockHeaderJSON,
			});

			expect(sendingChainAPIClientMock.subscribe).toHaveBeenCalledTimes(2);
			expect(sendingChainAPIClientMock.invoke).toHaveBeenCalledWith('chain_getEvents', {
				height: newBlockHeaderHeight,
			});

			expect((chainConnectorPlugin as any)['_submitCCUs']).toHaveBeenCalled();
			expect((chainConnectorPlugin as any)['_cleanup']).toHaveBeenCalled();

			const savedCCMs = await chainConnectorPlugin['_chainConnectorStore'].getCrossChainMessages();

			expect(savedCCMs).toEqual([
				{
					ccms: [{ ...getSampleCCM(1) }, { ...getSampleCCM(2) }],
					height: 11,
					inclusionProof: {
						bitmap: sampleProof.proof.queries[0].bitmap,
						siblingHashes: sampleProof.proof.siblingHashes,
					},
				},
			]);
		});
	});

	describe('unload', () => {
		it.todo('should unload plugin');
	});

	describe('Cleanup Functions', () => {
		let blockHeader1: BlockHeader;
		let blockHeader2: BlockHeader;

		beforeEach(async () => {
			jest
				.spyOn(apiClient, 'createIPCClient')
				.mockResolvedValue(sendingChainAPIClientMock as never);
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: defaultConfig,
				appConfig: appConfigForPlugin,
			});

			when(sendingChainAPIClientMock.invoke)
				.calledWith('interoperability_getOwnChainAccount')
				.mockResolvedValue({
					chainID: ownChainID.toString('hex'),
				});
			when(sendingChainAPIClientMock.invoke)
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
			(chainConnectorPlugin as any)['_chainConnectorStore'] = chainConnectorStoreMock;

			chainConnectorPlugin['_lastCertificate'] = {
				height: 6,
				stateRoot: cryptography.utils.getRandomBytes(32),
				timestamp: Date.now(),
				validatorsHash: cryptography.utils.getRandomBytes(32),
			};
			chainConnectorStoreMock.getCrossChainMessages.mockResolvedValue([
				getSampleCCM(1),
				getSampleCCM(2),
			] as never);
			jest
				.spyOn(chainConnectorPlugin['_chainConnectorStore'], 'getAggregateCommits')
				.mockResolvedValue([
					{
						height: 5,
					},
				] as never);
			jest
				.spyOn(chainConnectorPlugin['_chainConnectorStore'], 'getValidatorsHashPreimage')
				.mockResolvedValue([
					{
						certificateThreshold: 5,
					},
				] as never);
			blockHeader1 = testing.createFakeBlockHeader({ height: 5 }).toObject();
			blockHeader2 = testing.createFakeBlockHeader({ height: 6 }).toObject();
			chainConnectorStoreMock.getBlockHeaders.mockResolvedValue([
				blockHeader1,
				blockHeader2,
			] as never);
		});

		it('should delete block headers with height less than _lastCertifiedHeight', async () => {
			await chainConnectorPlugin['_cleanup']();

			expect(chainConnectorStoreMock.getBlockHeaders).toHaveBeenCalledTimes(1);

			expect(chainConnectorStoreMock.setBlockHeaders).toHaveBeenCalledWith([blockHeader2]);
		});

		it('should delete aggregate commits with height less than _lastCertifiedHeight', async () => {
			await chainConnectorPlugin['_cleanup']();

			expect(
				chainConnectorPlugin['_chainConnectorStore'].getAggregateCommits,
			).toHaveBeenCalledTimes(1);

			expect(chainConnectorPlugin['_chainConnectorStore'].setAggregateCommits).toHaveBeenCalledWith(
				[],
			);
		});

		it('should delete validatorsHashPreimage with certificate threshold less than _lastCertifiedHeight', async () => {
			await chainConnectorPlugin['_cleanup']();

			expect(
				chainConnectorPlugin['_chainConnectorStore'].getValidatorsHashPreimage,
			).toHaveBeenCalledTimes(1);

			expect(
				chainConnectorPlugin['_chainConnectorStore'].setValidatorsHashPreimage,
			).toHaveBeenCalledWith([]);
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

		beforeEach(() => {
			(chainConnectorPlugin as any)['_chainConnectorStore'] = chainConnectorStoreMock;
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

			chainConnectorPlugin['_ownChainID'] = ownChainID;
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
				.spyOn(certificateGenerationUtil, 'getNextCertificateFromAggregateCommits')
				.mockReturnValue(certificate as never);
			chainConnectorPlugin['_receivingChainClient'] = sendingChainAPIClientMock as never;
			chainConnectorPlugin['_sendingChainClient'] = sendingChainAPIClientMock as never;

			chainConnectorPlugin['_receivingChainClient'].invoke = jest
				.fn()
				.mockResolvedValue(chainAccount);
			jest
				.spyOn(certificateGenerationUtil, 'validateCertificate')
				.mockResolvedValue(certificateValidationFailingResult as never);
			chainConnectorPlugin['logger'] = {
				error: jest.fn(),
			} as never;

			when(sendingChainAPIClientMock.invoke)
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
			jest.spyOn(codec, 'encode').mockReturnValue(certificateBytes);
			jest.spyOn(activeValidatorsUpdateUtil, 'getActiveValidatorsDiff').mockReturnValue([]);
			(inboxUpdateUtil as any).calculateInboxUpdate = jest.fn().mockResolvedValue([
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
			jest
				.spyOn(certificateGenerationUtil, 'validateCertificate')
				.mockResolvedValue({ status: true });
			await chainConnectorPlugin['_calculateCCUParams']();

			expect(chainConnectorPlugin['_receivingChainClient'].invoke).toHaveBeenCalledTimes(2);
			expect(chainConnectorPlugin['_receivingChainClient'].invoke).toHaveBeenCalledWith(
				'consensus_getBFTHeights',
			);
		});

		it('should call _calculateInboxUpdate', async () => {
			jest
				.spyOn(certificateGenerationUtil, 'validateCertificate')
				.mockResolvedValue(certificateValidationPassingResult as never);

			await chainConnectorPlugin['_calculateCCUParams']();

			expect((inboxUpdateUtil as any).calculateInboxUpdate).toHaveBeenCalledTimes(1);
			expect((inboxUpdateUtil as any).calculateInboxUpdate).toHaveBeenCalled();
		});

		it('should return CCUTxParams with activeValidatorsUpdate set to [] when chainAccount.lastCertificate.validatorsHash == certificate.validatorsHash', async () => {
			jest
				.spyOn(certificateGenerationUtil, 'validateCertificate')
				.mockResolvedValue(certificateValidationPassingResult as never);

			await expect(chainConnectorPlugin['_calculateCCUParams']()).resolves.toBeDefined();
		});
	});

	describe('_submitCCUs', () => {
		const ccuParams = [
			cryptography.utils.getRandomBytes(100),
			cryptography.utils.getRandomBytes(100),
		];
		beforeEach(async () => {
			jest
				.spyOn(apiClient, 'createIPCClient')
				.mockResolvedValue(sendingChainAPIClientMock as never);
			await initChainConnectorPlugin(chainConnectorPlugin, defaultConfig);
			(chainConnectorPlugin['_receivingChainClient'] as any) = sendingChainAPIClientMock;
			when(sendingChainAPIClientMock.invoke)
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
			expect(sendingChainAPIClientMock.invoke).toHaveBeenCalledWith('system_getNodeInfo');
		});

		it('should get the current nonce for the account', () => {
			expect(sendingChainAPIClientMock.invoke).toHaveBeenCalledWith('auth_getAuthAccount', {
				address: expect.any(String),
			});
		});

		it('should create and post the CCUs', () => {
			expect(sendingChainAPIClientMock.invoke).toHaveBeenCalledWith('txpool_postTransaction', {
				transaction: expect.any(String),
			});
			expect(sendingChainAPIClientMock.invoke).toHaveBeenCalledTimes(4);
		});
	});
});
