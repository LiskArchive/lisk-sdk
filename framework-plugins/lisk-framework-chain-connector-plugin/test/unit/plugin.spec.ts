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
	ChannelDataJSON,
	CCMsg,
	certificateSchema,
	tree,
	CrossChainUpdateTransactionParams,
	Certificate,
	BFTHeights,
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
	CCU_TOTAL_CCM_SIZE,
	EMPTY_BYTES,
} from '../../src/constants';
import { getSampleCCM } from '../utils/sampleCCM';
import * as plugins from '../../src/chain_connector_plugin';
import * as dbApi from '../../src/db';
import {
	BlockHeader,
	CCMsFromEvents,
	ChainConnectorPluginConfig,
	ValidatorsData,
} from '../../src/types';
import * as certificateGenerationUtil from '../../src/certificate_generation';
import * as activeValidatorsUpdateUtil from '../../src/active_validators_update';
import { getMainchainID } from '../../src/utils';
import { getSampleCCU } from '../utils/sampleCCU';

describe('ChainConnectorPlugin', () => {
	const BLS_SIGNATURE_LENGTH = 96;
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

	const getTestBlock = async (height = 1) => {
		return testing.createBlock({
			chainID: Buffer.from('00001111', 'hex'),
			privateKey: Buffer.from(
				'd4b1a8a6f91482c40ba1d5c054bd7595cc0230291244fc47869f51c21af657b9e142de105ecd851507f2627e991b54b2b71104b11b6660d0646b9fdbe415fd87',
				'hex',
			),
			previousBlockID: cryptography.utils.getRandomBytes(20),
			timestamp: Math.floor(Date.now() / 1000),
			header: { height },
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
	let receivingChainAPIClientMock: apiClient.APIClient;
	const defaultPrivateKey =
		'6c5e2b24ff1cc99da7a49bd28420b93b2a91e2e2a3b0a0ce07676966b707d3c2859bbd02747cf8e26dab592c02155dfddd4a16b0fe83fd7e7ffaec0b5391f3f7';
	const defaultPassword = '123';
	const defaultCCUFee = '100000000';

	const getApiClientMock = () => ({
		disconnect: jest.fn(),
		invoke: jest.fn(),
		subscribe: jest.fn(),
		connect: jest.fn(),
	});

	const chainConnectorStoreMock = {
		setBlockHeaders: jest.fn(),
		getBlockHeaders: jest.fn(),
		setAggregateCommits: jest.fn(),
		getAggregateCommits: jest.fn(),
		setCrossChainMessages: jest.fn(),
		getCrossChainMessages: jest.fn(),
		getValidatorsHashPreimage: jest.fn(),
		setValidatorsHashPreimage: jest.fn(),
		getLastSentCCM: jest.fn(),
		setLastSentCCM: jest.fn(),
		close: jest.fn(),
		getListOfCCUs: jest.fn().mockResolvedValue([]),
		setListOfCCUs: jest.fn(),
	};

	let defaultEncryptedPrivateKey: string;
	let defaultConfig: ChainConnectorPluginConfig & Record<string, unknown>;
	let sampleBFTHeights: BFTHeights;

	beforeEach(async () => {
		sampleBFTHeights = {
			maxHeightPrevoted: 1,
			maxHeightPrecommitted: 1,
			maxHeightCertified: 1,
		};
		chainConnectorPlugin = new plugins.ChainConnectorPlugin();

		(chainConnectorStoreMock as any).privateKey = Buffer.from(defaultPrivateKey, 'hex');

		const encryptedKey = await cryptography.encrypt.encryptMessageWithPassword(
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

		jest.spyOn(dbApi, 'getDBInstance').mockResolvedValue(new db.InMemoryDatabase() as never);
		jest
			.spyOn(cryptography.encrypt, 'decryptMessageWithPassword')
			.mockResolvedValue(Buffer.from(defaultPrivateKey, 'hex') as never);
		(chainConnectorPlugin as any)['_chainConnectorStore'] = chainConnectorStoreMock;
		defaultConfig = {
			receivingChainIPCPath: '~/.lisk/mainchain',
			ccuFee: defaultCCUFee,
			encryptedPrivateKey: defaultEncryptedPrivateKey,
			ccuFrequency: CCU_FREQUENCY,
			password: defaultPassword,
			maxCCUSize: CCU_TOTAL_CCM_SIZE,
			ccuSaveLimit: 1,
			isSaveCCU: false,
			registrationHeight: 1,
			receivingChainID: getMainchainID(ownChainID).toString('hex'),
		};

		sendingChainAPIClientMock = getApiClientMock() as any;
		receivingChainAPIClientMock = getApiClientMock() as any;
		when(sendingChainAPIClientMock.invoke)
			.calledWith('interoperability_getOwnChainAccount')
			.mockResolvedValue({
				chainID: ownChainID.toString('hex'),
			});

		when(receivingChainAPIClientMock.invoke)
			.calledWith('interoperability_getOwnChainAccount')
			.mockResolvedValue({
				chainID: getMainchainID(ownChainID).toString('hex'),
			});

		when(receivingChainAPIClientMock.invoke)
			.calledWith('interoperability_getChainAccount', { chainID: ownChainID.toString('hex') })
			.mockResolvedValue({
				lastCertificate: {
					height: 10,
					stateRoot: cryptography.utils.getRandomBytes(HASH_LENGTH).toString('hex'),
					timestamp: Date.now(),
					validatorsHash: cryptography.utils.getRandomBytes(HASH_LENGTH).toString('hex'),
				},
				name: 'chain1',
				status: 1,
			});
		jest.spyOn(apiClient, 'createWSClient').mockResolvedValue(receivingChainAPIClientMock as never);
		jest
			.spyOn(apiClient, 'createIPCClient')
			.mockResolvedValue(receivingChainAPIClientMock as never);
	});

	describe('init', () => {
		it('should assign ccuFrequency properties to default values', async () => {
			await initChainConnectorPlugin(chainConnectorPlugin, {
				receivingChainIPCPath: '~/.lisk/mainchain',
				ccuFee: defaultCCUFee,
				encryptedPrivateKey: defaultEncryptedPrivateKey,
				password: 'lisk',
				receivingChainID: getMainchainID(ownChainID).toString('hex'),
			} as never);
			expect(chainConnectorPlugin['_ccuFrequency']).toEqual(CCU_FREQUENCY);
		});

		it('should assign ccuFrequency properties to passed config values', async () => {
			await initChainConnectorPlugin(chainConnectorPlugin, {
				...defaultConfig,
				ccuFrequency: 300000,
				receivingChainID: getMainchainID(ownChainID).toString('hex'),
			});
			expect(chainConnectorPlugin['_ccuFrequency']).toBe(300000);
		});
	});

	describe('load', () => {
		it('should initialize api clients with respective paths as per config', async () => {
			await initChainConnectorPlugin(chainConnectorPlugin, defaultConfig);
			chainConnectorPlugin['_apiClient'] = sendingChainAPIClientMock;

			await chainConnectorPlugin.load();

			expect(chainConnectorPlugin['_receivingChainClient']).toBeUndefined();
			expect(chainConnectorPlugin['_sendingChainClient']).toBe(chainConnectorPlugin['_apiClient']);
		});

		it('should initialize api clients for both sending and receiving chain', async () => {
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: defaultConfig,
				appConfig: appConfigForPlugin,
			});
			chainConnectorPlugin['_apiClient'] = sendingChainAPIClientMock;
			await chainConnectorPlugin.load();

			expect(chainConnectorPlugin['_receivingChainClient']).toBeUndefined();
			expect(chainConnectorPlugin['_sendingChainClient']).toBeDefined();
		});

		it('should call createWSClient when receivingChainWsURL is provided', async () => {
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: {
					receivingChainWsURL: 'ws://127.0.0.1:8080/rpc',
					ccuFee: defaultCCUFee,
					encryptedPrivateKey: defaultEncryptedPrivateKey,
					password: 'lisk',
					receivingChainID: getMainchainID(ownChainID).toString('hex'),
				},
				appConfig: appConfigForPlugin,
			});

			chainConnectorPlugin['_apiClient'] = sendingChainAPIClientMock;
			await chainConnectorPlugin.load();
			jest.spyOn(chainConnectorPlugin as any, '_saveDataOnNewBlock').mockResolvedValue({});
			await chainConnectorPlugin['_newBlockHandler']({
				blockHeader: testing
					.createFakeBlockHeader({
						generatorAddress: Buffer.from('66687aadf862bd776c8fc18b8e9f8e2008971485', 'hex'),
					})
					.toJSON(),
			});
			expect(apiClient.createWSClient).toHaveBeenCalled();
		});

		it('should throw error when receivingChainWsURL and receivingChainIPCPath are undefined', async () => {
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: {
					ccuFee: defaultCCUFee,
					encryptedPrivateKey: defaultEncryptedPrivateKey,
					password: 'lisk',
					receivingChainID: getMainchainID(ownChainID).toString('hex'),
				},
				appConfig: appConfigForPlugin,
			});
			chainConnectorPlugin['_apiClient'] = sendingChainAPIClientMock;
			await chainConnectorPlugin.load();
			jest.spyOn(chainConnectorPlugin as any, '_saveDataOnNewBlock').mockResolvedValue({});
			jest.spyOn(chainConnectorPlugin as any, '_initializeReceivingChainClient');
			jest.spyOn(testing.mocks.loggerMock, 'error');
			await chainConnectorPlugin['_newBlockHandler']({
				blockHeader: testing
					.createFakeBlockHeader({
						generatorAddress: Buffer.from('66687aadf862bd776c8fc18b8e9f8e2008971485', 'hex'),
					})
					.toJSON(),
			});

			expect(testing.mocks.loggerMock.error).toHaveBeenCalledWith(
				new Error('IPC path and WS url are undefined in the configuration.'),
				'Failed while handling the new block',
			);
		});

		it('should continue even when receivingChainAPIClient is not available', async () => {
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: defaultConfig,
				appConfig: appConfigForPlugin,
			});
			chainConnectorPlugin['_apiClient'] = sendingChainAPIClientMock;

			jest
				.spyOn(apiClient, 'createIPCClient')
				.mockRejectedValue(new Error('IPC connection timed out.') as never);

			jest.spyOn(testing.mocks.loggerMock, 'error');

			await chainConnectorPlugin.load();

			expect(dbApi.getDBInstance).toHaveBeenCalledTimes(1);
			expect(chainConnectorPlugin['_chainConnectorPluginDB']).toEqual(
				new db.InMemoryDatabase() as never,
			);

			expect(sendingChainAPIClientMock.subscribe).toHaveBeenCalledTimes(2);
		});

		it('should initialize _chainConnectorDB', async () => {
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: defaultConfig,
				appConfig: appConfigForPlugin,
			});

			chainConnectorPlugin['_apiClient'] = sendingChainAPIClientMock;
			await chainConnectorPlugin.load();

			expect(dbApi.getDBInstance).toHaveBeenCalledTimes(1);
			expect(chainConnectorPlugin['_chainConnectorPluginDB']).toEqual(
				new db.InMemoryDatabase() as never,
			);
		});
	});

	describe('_deleteBlockHandler', () => {
		beforeEach(async () => {
			(chainConnectorPlugin as any)['_chainConnectorStore'] = chainConnectorStoreMock;
			await initChainConnectorPlugin(chainConnectorPlugin, defaultConfig);
			chainConnectorPlugin['_apiClient'] = sendingChainAPIClientMock;
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
			// non-empty aggregate commit with height 1 should be deleted
			block.header.aggregateCommit.height = 1;
			block.header.aggregateCommit.aggregationBits = Buffer.alloc(1);
			expect(block.header.height).toBe(1);
			expect(block.header.aggregateCommit.height).toBe(1);

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

			const newBlock = await getTestBlock();

			const someValidatorsHashPreimage = getSomeValidatorsHashPreimage(4, newBlock);
			const blocks = await Promise.all(
				someValidatorsHashPreimage.slice(1).map(async (vHash, index) => {
					const block = await getTestBlock(index + 2);
					block.header.validatorsHash = vHash.validatorsHash;

					return block;
				}),
			);
			await chainConnectorPlugin['_chainConnectorStore'].setBlockHeaders(
				blocks.map(b => b.header.toObject()),
			);

			await chainConnectorPlugin['_chainConnectorStore'].setValidatorsHashPreimage(
				someValidatorsHashPreimage,
			);
			await expect(
				chainConnectorPlugin['_chainConnectorStore'].getValidatorsHashPreimage(),
			).resolves.toHaveLength(4);

			expect(newBlock.header.validatorsHash as Buffer).toEqual(
				someValidatorsHashPreimage[0].validatorsHash,
			);

			await (chainConnectorPlugin as any)['_deleteBlockHandler']({
				blockHeader: newBlock.header.toJSON(),
			});

			await expect(
				chainConnectorPlugin['_chainConnectorStore'].getValidatorsHashPreimage(),
			).resolves.toHaveLength(3);
		});
	});

	describe('_newBlockHandler', () => {
		let block: Block;
		let sampleCCUParams: CrossChainUpdateTransactionParams;
		let sampleNextCertificate: Certificate;

		beforeEach(async () => {
			sampleCCUParams = {
				sendingChainID: Buffer.from('04000001', 'hex'),
				activeValidatorsUpdate: {
					bftWeightsUpdate: [],
					bftWeightsUpdateBitmap: EMPTY_BYTES,
					blsKeysUpdate: [],
				},
				certificate: EMPTY_BYTES,
				certificateThreshold: BigInt(1),
				inboxUpdate: {
					crossChainMessages: [],
					messageWitnessHashes: [],
					outboxRootWitness: {
						bitmap: EMPTY_BYTES,
						siblingHashes: [],
					},
				},
			};
			block = await testing.createBlock({
				chainID: Buffer.from('00001111', 'hex'),
				privateKey: Buffer.from(
					'd4b1a8a6f91482c40ba1d5c054bd7595cc0230291244fc47869f51c21af657b9e142de105ecd851507f2627e991b54b2b71104b11b6660d0646b9fdbe415fd87',
					'hex',
				),
				previousBlockID: cryptography.utils.getRandomBytes(20),
				timestamp: Math.floor(Date.now() / 1000),
				header: {
					height: 20,
				},
			});

			sampleNextCertificate = {
				aggregationBits: Buffer.alloc(1),
				blockID: block.header.id,
				height: block.header.height,
				signature: block.header.signature,
				stateRoot: block.header.stateRoot as Buffer,
				timestamp: block.header.timestamp,
				validatorsHash: block.header.validatorsHash as Buffer,
			};

			chainConnectorPlugin['_ownChainID'] = ownChainID;
			chainConnectorPlugin['_sendingChainClient'] = sendingChainAPIClientMock;
			chainConnectorPlugin['_receivingChainClient'] = receivingChainAPIClientMock;

			const computedCCUParamsMock = jest.fn();
			chainConnectorPlugin['_computeCCUParams'] = computedCCUParamsMock;
			computedCCUParamsMock.mockResolvedValue({
				ccuParams: sampleCCUParams,
				lastCCMToBeSent: {
					...getSampleCCM(1),
					height: 1,
				},
			});
			when(receivingChainAPIClientMock.invoke)
				.calledWith('interoperability_getChainAccount', { chainID: ownChainID })
				.mockResolvedValue({
					lastCertificate: {
						height: 10,
						stateRoot: cryptography.utils.getRandomBytes(HASH_LENGTH).toString('hex'),
						timestamp: Date.now(),
						validatorsHash: cryptography.utils.getRandomBytes(HASH_LENGTH).toString('hex'),
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
							generatorKey: cryptography.utils
								.getRandomBytes(BLS_PUBLIC_KEY_LENGTH)
								.toString('hex'),
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

			when(sendingChainAPIClientMock.invoke)
				.calledWith('consensus_getBFTHeights')
				.mockResolvedValue(sampleBFTHeights);
			when(sendingChainAPIClientMock.invoke).calledWith('system_getNodeInfo').mockResolvedValue({
				chainID: '10000000',
			});
			jest.spyOn(chainConnectorPlugin as any, '_submitCCU').mockResolvedValue({});
		});

		it('should invoke "consensus_getBFTParameters" on _sendingChainClient', async () => {
			jest
				.spyOn(certificateGenerationUtil, 'getNextCertificateFromAggregateCommits')
				.mockReturnValue(sampleNextCertificate);

			await initChainConnectorPlugin(chainConnectorPlugin, defaultConfig);
			chainConnectorPlugin['_apiClient'] = sendingChainAPIClientMock;
			await chainConnectorPlugin.load();

			const saveDataOnNewBlockMock = jest.fn();
			chainConnectorPlugin['_saveDataOnNewBlock'] = saveDataOnNewBlockMock;
			saveDataOnNewBlockMock.mockResolvedValue({
				aggregateCommits: [],
				blockHeaders: [],
				validatorsHashPreimage: [],
				crossChainMessages: [],
			});
			await chainConnectorPlugin['_newBlockHandler']({
				blockHeader: block.header.toJSON(),
			});

			// For chain_newBlock and chain_deleteBlock
			expect(sendingChainAPIClientMock.subscribe).toHaveBeenCalledTimes(2);
			expect(chainConnectorPlugin['_submitCCU']).toHaveBeenCalled();
		});

		it('should invoke "chain_getEvents" on _sendingChainClient', async () => {
			jest
				.spyOn(certificateGenerationUtil, 'getNextCertificateFromAggregateCommits')
				.mockReturnValue(sampleNextCertificate);
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
				.calledWith('consensus_getBFTParametersActiveValidators', { height: newBlockHeaderHeight })
				.mockResolvedValue({
					prevoteThreshold: '2',
					precommitThreshold: '2',
					certificateThreshold: '3',
					validators: [
						{
							address: cryptography.utils.getRandomBytes(ADDRESS_LENGTH).toString('hex'),
							bftWeight: '2',
							generatorKey: cryptography.utils
								.getRandomBytes(BLS_PUBLIC_KEY_LENGTH)
								.toString('hex'),
							blsKey: cryptography.utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH).toString('hex'),
						},
					],
					validatorsHash: cryptography.utils.getRandomBytes(HASH_LENGTH).toString('hex'),
				});

			const ccmSendSuccessEvent = {
				index: 1,
				module: MODULE_NAME_INTEROPERABILITY,
				topics: [cryptography.utils.getRandomBytes(10).toString('hex')],
				name: CCM_SEND_SUCCESS,
				height: newBlockHeaderHeight,
				data: codec.encode(ccmSendSuccessDataSchema, { ccm: getSampleCCM(1) }).toString('hex'),
			};

			const ccmProcessedEvent = {
				index: 4,
				module: MODULE_NAME_INTEROPERABILITY,
				topics: [cryptography.utils.getRandomBytes(10).toString('hex')],
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
					queryKeys: [
						Buffer.concat([
							Buffer.from('03ed0d25f0ba', 'hex'),
							cryptography.utils.hash(ownChainID),
						]).toString('hex'),
					],
				})
				.mockResolvedValue(sampleProof);

			await initChainConnectorPlugin(chainConnectorPlugin, defaultConfig);
			chainConnectorPlugin['_apiClient'] = sendingChainAPIClientMock;
			await chainConnectorPlugin.load();
			await chainConnectorPlugin['_chainConnectorStore'].setBlockHeaders([
				blockHeaderAtLastCertifiedHeight,
			]);
			await chainConnectorPlugin['_chainConnectorStore'].setAggregateCommits(
				blockHeaders.map(b => b.aggregateCommit),
			);
			await (chainConnectorPlugin as any)['_newBlockHandler']({
				blockHeader: newBlockHeaderJSON,
			});

			/**
			 * Two event subscriptions on sendingChainAPIClient
			 * 1. chain_newBlock
			 * 2. chain_deleteBlock
			 */
			expect(sendingChainAPIClientMock.subscribe).toHaveBeenCalledTimes(2);
			/**
			 * Total 5 calls to below RPCs through sendingChainAPIClient
			 * 1. chain_getEvents
			 * 2. system_getMetadata
			 * 3. state_prove
			 * 4. consensus_getBFTParameters
			 * 5. consensus_getBFTHeights
			 */
			expect(sendingChainAPIClientMock.invoke).toHaveBeenCalledTimes(5);
			/**
			 * Two calls to below RPC through receivingChainAPIClient
			 * 1. interoperability_getChainAccount: in load() function
			 */
			expect(receivingChainAPIClientMock.invoke).toHaveBeenCalledTimes(1);

			const savedCCMs = await chainConnectorPlugin['_chainConnectorStore'].getCrossChainMessages();

			expect(savedCCMs).toEqual([
				{
					ccms: [{ ...getSampleCCM(1) }, { ...getSampleCCM(2) }],
					height: 11,
					inclusionProof: {
						bitmap: sampleProof.proof.queries[0].bitmap,
						siblingHashes: sampleProof.proof.siblingHashes,
					},
					outboxSize: 0,
				},
			]);

			expect((chainConnectorPlugin as any)['_submitCCU']).toHaveBeenCalled();
		});
	});

	describe('unload', () => {
		it.todo('should unload plugin');
	});

	describe('Cleanup Functions', () => {
		let blockHeader1: BlockHeader;
		let blockHeader2: BlockHeader;
		let sampleCCUs: chain.TransactionAttrs[];

		beforeEach(async () => {
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: defaultConfig,
				appConfig: appConfigForPlugin,
			});

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
			when(receivingChainAPIClientMock.invoke)
				.calledWith('interoperability_getChainAccount', { chainID: ownChainID })
				.mockResolvedValue({
					lastCertificate: {
						height: 10,
						stateRoot: cryptography.utils.getRandomBytes(HASH_LENGTH).toString('hex'),
						timestamp: Date.now(),
						validatorsHash: cryptography.utils.getRandomBytes(HASH_LENGTH).toString('hex'),
					},
					name: 'chain1',
					status: 1,
				});
			chainConnectorPlugin['_apiClient'] = sendingChainAPIClientMock;

			await chainConnectorPlugin.load();
			(chainConnectorPlugin as any)['_chainConnectorStore'] = chainConnectorStoreMock;

			chainConnectorPlugin['_lastCertificate'] = {
				height: 6,
				stateRoot: cryptography.utils.getRandomBytes(HASH_LENGTH),
				timestamp: Date.now(),
				validatorsHash: cryptography.utils.getRandomBytes(HASH_LENGTH),
			};
			chainConnectorPlugin['_heightToDeleteIndex'].set(0, {
				inboxSize: 10,
				lastCertificateHeight: 10,
			});
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
						validatorsHash: cryptography.utils.getRandomBytes(54),
					},
				] as never);
			blockHeader1 = testing.createFakeBlockHeader({ height: 5 }).toObject();
			blockHeader2 = testing.createFakeBlockHeader({ height: 6 }).toObject();
			chainConnectorStoreMock.getBlockHeaders.mockResolvedValue([
				blockHeader1,
				blockHeader2,
			] as never);
			sampleCCUs = [
				getSampleCCU({ nonce: BigInt(1) }),
				getSampleCCU({ nonce: BigInt(2) }),
				getSampleCCU({ nonce: BigInt(2) }),
			];
			chainConnectorStoreMock.getListOfCCUs.mockResolvedValue(sampleCCUs as never);
		});

		it('should delete block headers with height less than finalized lastCertifiedHeight', async () => {
			await chainConnectorPlugin['_cleanup']();

			expect(chainConnectorStoreMock.getBlockHeaders).toHaveBeenCalledTimes(1);

			expect(chainConnectorStoreMock.setBlockHeaders).toHaveBeenCalledWith([]);
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

		it('should delete sentCCUs based on config ccuSaveLimit', async () => {
			await chainConnectorPlugin['_cleanup']();

			expect(chainConnectorPlugin['_chainConnectorStore'].getListOfCCUs).toHaveBeenCalledTimes(1);

			expect(chainConnectorPlugin['_chainConnectorStore'].setListOfCCUs).toHaveBeenCalledWith([
				sampleCCUs[2],
			]);
		});
	});

	describe('_computeCCUParams', () => {
		let sampleCCMsWithEvents: CCMsFromEvents[];
		let sampleBlockHeaders: BlockHeader[];
		let sampleAggregateCommits: AggregateCommit[];
		let sampleValidatorsHashPreimage: ValidatorsData[];
		let sampleChannelDataJSON: ChannelDataJSON;

		beforeEach(async () => {
			sampleBlockHeaders = new Array(10).fill(0).map((_, index) => {
				// Aggregate commits at height 3, 6, 9
				if ((index + 1) % 3 === 0) {
					return testing
						.createFakeBlockHeader({
							height: index + 1,
							aggregateCommit: {
								aggregationBits: Buffer.alloc(2),
								certificateSignature: cryptography.utils.getRandomBytes(54),
								height: index - 2,
							},
						})
						.toObject();
				}

				// Validators change at height 2, 4, 6, 8, 10
				if ((index + 1) % 2 === 0) {
					return testing
						.createFakeBlockHeader({
							height: index + 1,
							validatorsHash: cryptography.utils.getRandomBytes(HASH_LENGTH),
						})
						.toObject();
				}

				return testing.createFakeBlockHeader({ height: index + 1 }).toObject();
			});
			sampleCCMsWithEvents = sampleBlockHeaders.map(b => ({
				ccms: [getSampleCCM(b.height)],
				height: b.height,
				inclusionProof: {
					bitmap: Buffer.alloc(1),
					siblingHashes: [Buffer.alloc(1)],
				},
				outboxSize: 2,
			}));
			sampleAggregateCommits = sampleBlockHeaders
				.filter(b => !b.aggregateCommit.certificateSignature.equals(Buffer.alloc(0)))
				.map(b => b.aggregateCommit);
			// Validators change at height 2, 4, 6, 8, 10
			sampleValidatorsHashPreimage = sampleBlockHeaders
				.filter(b => b.height % 2 === 0)
				.map(b => ({
					certificateThreshold: BigInt(78),
					validators: [
						{
							address: cryptography.utils.getRandomBytes(ADDRESS_LENGTH),
							bftWeight: BigInt(40),
							blsKey: cryptography.utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH),
						},
						{
							address: cryptography.utils.getRandomBytes(ADDRESS_LENGTH),
							bftWeight: BigInt(40),
							blsKey: cryptography.utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH),
						},
					],
					validatorsHash: b.validatorsHash,
				}));
			sampleChannelDataJSON = {
				inbox: {
					appendPath: [],
					root: cryptography.utils.getRandomBytes(HASH_LENGTH).toString('hex'),
					size: 2,
				},
				outbox: {
					appendPath: [],
					root: cryptography.utils.getRandomBytes(HASH_LENGTH).toString('hex'),
					size: 2,
				},
				partnerChainOutboxRoot: cryptography.utils.getRandomBytes(HASH_LENGTH).toString('hex'),
				messageFeeTokenID: '04000010',
				minReturnFeePerByte: '1000',
			};
			// Save all data to the chainConnectorStore
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: defaultConfig,
				appConfig: appConfigForPlugin,
			});
			chainConnectorPlugin['_apiClient'] = sendingChainAPIClientMock;

			await chainConnectorPlugin.load();
			chainConnectorPlugin['_receivingChainClient'] = receivingChainAPIClientMock;
			// Set all the sample data
			await chainConnectorPlugin['_chainConnectorStore'].setBlockHeaders(sampleBlockHeaders);
			await chainConnectorPlugin['_chainConnectorStore'].setAggregateCommits(
				sampleAggregateCommits,
			);
			await chainConnectorPlugin['_chainConnectorStore'].setValidatorsHashPreimage(
				sampleValidatorsHashPreimage,
			);
			await chainConnectorPlugin['_chainConnectorStore'].setCrossChainMessages(
				sampleCCMsWithEvents,
			);
		});

		describe('CCU params calculation when no new ceritifcate and last certificate height == 0', () => {
			beforeEach(() => {
				jest
					.spyOn(chainConnectorPlugin, '_findNextCertificate' as never)
					.mockResolvedValue(undefined as never);
				chainConnectorPlugin['_lastCertificate'] = {
					height: 0,
					stateRoot: Buffer.alloc(1),
					timestamp: Date.now(),
					validatorsHash: cryptography.utils.hash(cryptography.utils.getRandomBytes(4)),
				};
			});

			it('should exit function without CCU params ', async () => {
				const result = await chainConnectorPlugin['_computeCCUParams'](
					sampleBlockHeaders,
					sampleAggregateCommits,
					sampleValidatorsHashPreimage,
					sampleCCMsWithEvents,
				);

				expect(result).toBeUndefined();
			});
		});

		describe('CCU params calculation when last certificate', () => {
			beforeEach(() => {
				when(sendingChainAPIClientMock.invoke)
					.calledWith('consensus_getBFTHeights')
					.mockResolvedValue(sampleBFTHeights);
				when(receivingChainAPIClientMock.invoke)
					.calledWith('interoperability_getChannel', {
						chainID: chainConnectorPlugin['_ownChainID'].toString('hex'),
					})
					.mockResolvedValue(sampleChannelDataJSON);

				when(sendingChainAPIClientMock.invoke)
					.calledWith('interoperability_getChannel', {
						chainID: chainConnectorPlugin['_receivingChainID'].toString('hex'),
					})
					.mockResolvedValue({
						...sampleChannelDataJSON,
						outbox: { ...sampleChannelDataJSON.outbox, size: 3 },
					});

				jest
					.spyOn(certificateGenerationUtil, 'getNextCertificateFromAggregateCommits')
					.mockReturnValue(undefined);
			});

			it('should exit function without CCU params computation when no pending CCMs found after last ccm', async () => {
				jest.spyOn(chainConnectorPlugin['logger'], 'info');

				const validatorsHashAtLastCertificate = sampleBlockHeaders.find(b => b.height === 8);
				chainConnectorPlugin['_lastCertificate'] = {
					height: 10,
					stateRoot: Buffer.alloc(1),
					timestamp: Date.now(),
					validatorsHash: validatorsHashAtLastCertificate?.validatorsHash as Buffer,
				};
				await chainConnectorPlugin['_chainConnectorStore'].setLastSentCCM({
					...getSampleCCM(12),
					height: 11,
				});

				const result = await chainConnectorPlugin['_computeCCUParams'](
					sampleBlockHeaders,
					sampleAggregateCommits,
					sampleValidatorsHashPreimage,
					sampleCCMsWithEvents,
				);

				expect(result).toBeUndefined();

				expect(chainConnectorPlugin['logger'].info).toHaveBeenCalledWith(
					'CCU cant be created as there are no pending CCMs for the last certificate.',
				);
			});

			it('should throw error when no validatorsData found for the last certificate', async () => {
				jest.spyOn(chainConnectorPlugin['logger'], 'info');

				chainConnectorPlugin['_lastCertificate'] = {
					height: 11,
					stateRoot: Buffer.alloc(1),
					timestamp: Date.now(),
					validatorsHash: cryptography.utils.hash(cryptography.utils.getRandomBytes(4)),
				};
				await chainConnectorPlugin['_chainConnectorStore'].setLastSentCCM({
					...getSampleCCM(9),
					height: 8,
				});

				await expect(
					chainConnectorPlugin['_computeCCUParams'](
						sampleBlockHeaders,
						sampleAggregateCommits,
						sampleValidatorsHashPreimage,
						sampleCCMsWithEvents,
					),
				).rejects.toThrow('No validatorsData found for the lastCertificate');
			});

			it('should successfully create CCU with messageWitness for pending ccms', async () => {
				when(sendingChainAPIClientMock.invoke)
					.calledWith('interoperability_getChannel', {
						chainID: chainConnectorPlugin['_receivingChainID'].toString('hex'),
					})
					.mockResolvedValue({
						...sampleChannelDataJSON,
						outbox: { ...sampleChannelDataJSON.outbox, size: 4 },
					});
				jest.spyOn(chainConnectorPlugin['logger'], 'info');

				const validatorsHashAtLastCertificate = sampleBlockHeaders.find(b => b.height === 8);
				chainConnectorPlugin['_lastCertificate'] = {
					height: 8,
					stateRoot: Buffer.alloc(1),
					timestamp: Date.now(),
					validatorsHash: validatorsHashAtLastCertificate?.validatorsHash as Buffer,
				};
				const lastSentCCMsFromEvents = sampleCCMsWithEvents[5];
				const expectedCCMsToBeSent = sampleCCMsWithEvents
					.slice(5, 7)
					.reduce((ccms: CCMsg[], record: CCMsFromEvents) => {
						for (const ccm of record.ccms) {
							ccms.push(ccm);
						}

						return ccms;
					}, [])
					.map(ccm => codec.encode(ccmSchema, ccm));
				await chainConnectorPlugin['_chainConnectorStore'].setLastSentCCM({
					...lastSentCCMsFromEvents.ccms[0],
					height: lastSentCCMsFromEvents.height,
				});
				const result = await chainConnectorPlugin['_computeCCUParams'](
					sampleBlockHeaders,
					sampleAggregateCommits,
					sampleValidatorsHashPreimage,
					sampleCCMsWithEvents,
				);

				expect(result).toBeDefined();
				expect(result?.ccuParams).toBeDefined();
				expect((result?.ccuParams as any).inboxUpdate.outboxRootWitness).toEqual({
					bitmap: EMPTY_BYTES,
					siblingHashes: [],
				});
				expect((result?.ccuParams as any).activeValidatorsUpdate).toEqual({
					blsKeysUpdate: [],
					bftWeightsUpdate: [],
					bftWeightsUpdateBitmap: EMPTY_BYTES,
				});
				expect((result?.ccuParams as any).certificate).toEqual(EMPTY_BYTES);

				expect((result?.ccuParams as any).inboxUpdate.messageWitnessHashes).toEqual([]);
				expect((result?.ccuParams as any).inboxUpdate.crossChainMessages).toHaveLength(
					expectedCCMsToBeSent.length,
				);
			});
		});

		describe('CCU params calculation for new certificate', () => {
			let blockHeaderAtCertificateHeight: BlockHeader;
			let sampleValidators: any;
			beforeEach(() => {
				sampleValidators = [
					{
						address: cryptography.utils.getRandomBytes(ADDRESS_LENGTH),
						bftWeight: BigInt(40),
						blsKey: cryptography.utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH),
					},
					{
						address: cryptography.utils.getRandomBytes(ADDRESS_LENGTH),
						bftWeight: BigInt(40),
						blsKey: cryptography.utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH),
					},
				];
				// eslint-disable-next-line prefer-destructuring
				blockHeaderAtCertificateHeight = sampleBlockHeaders[8];
				when(sendingChainAPIClientMock.invoke)
					.calledWith('consensus_getBFTHeights')
					.mockResolvedValue(sampleBFTHeights);
				when(receivingChainAPIClientMock.invoke)
					.calledWith('interoperability_getChannel', {
						chainID: chainConnectorPlugin['_ownChainID'].toString('hex'),
					})
					.mockResolvedValue(sampleChannelDataJSON);
			});

			it('should throw error when no validators data is found for the new certificate height', async () => {
				when(sendingChainAPIClientMock.invoke)
					.calledWith('interoperability_getChannel', {
						chainID: chainConnectorPlugin['_receivingChainID'].toString('hex'),
					})
					.mockResolvedValue({
						...sampleChannelDataJSON,
						outbox: { ...sampleChannelDataJSON.outbox, size: 4 },
					});
				const newCertificate = {
					aggregationBits: Buffer.alloc(1),
					blockID: blockHeaderAtCertificateHeight.id as Buffer,
					height: blockHeaderAtCertificateHeight.height,
					signature: cryptography.utils.getRandomBytes(BLS_SIGNATURE_LENGTH),
					stateRoot: cryptography.utils.getRandomBytes(HASH_LENGTH),
					timestamp: blockHeaderAtCertificateHeight.timestamp,
					validatorsHash: cryptography.utils.getRandomBytes(HASH_LENGTH),
				};

				jest
					.spyOn(certificateGenerationUtil, 'getNextCertificateFromAggregateCommits')
					.mockReturnValue(newCertificate);
				chainConnectorPlugin['_lastCertificate'] = {
					height: 4,
					stateRoot: Buffer.alloc(1),
					timestamp: Date.now(),
					validatorsHash: blockHeaderAtCertificateHeight.validatorsHash,
				};
				await expect(
					chainConnectorPlugin['_computeCCUParams'](
						sampleBlockHeaders,
						sampleAggregateCommits,
						sampleValidatorsHashPreimage,
						sampleCCMsWithEvents,
					),
				).rejects.toThrow('No validators data found for the certificate height.');
			});

			it('should return empty activeValidatorsUpdate when (lastCertificate.validatorsHash === newCertificate.validatorsHash)', async () => {
				when(sendingChainAPIClientMock.invoke)
					.calledWith('interoperability_getChannel', {
						chainID: chainConnectorPlugin['_receivingChainID'].toString('hex'),
					})
					.mockResolvedValue({
						...sampleChannelDataJSON,
						outbox: { ...sampleChannelDataJSON.outbox, size: 2 },
					});
				const newCertificate = {
					aggregationBits: Buffer.alloc(1),
					blockID: blockHeaderAtCertificateHeight.id as Buffer,
					height: blockHeaderAtCertificateHeight.height,
					signature: cryptography.utils.getRandomBytes(BLS_SIGNATURE_LENGTH),
					stateRoot: cryptography.utils.getRandomBytes(HASH_LENGTH),
					timestamp: blockHeaderAtCertificateHeight.timestamp,
					validatorsHash: blockHeaderAtCertificateHeight.validatorsHash,
				};
				jest
					.spyOn(certificateGenerationUtil, 'getNextCertificateFromAggregateCommits')
					.mockReturnValue(newCertificate);
				chainConnectorPlugin['_lastCertificate'] = {
					height: 4,
					stateRoot: Buffer.alloc(1),
					timestamp: Date.now(),
					validatorsHash: blockHeaderAtCertificateHeight.validatorsHash,
				};
				await chainConnectorPlugin['_chainConnectorStore'].setLastSentCCM({
					...getSampleCCM(4),
					height: 4,
				});
				const validatorsData = [
					{
						certificateThreshold: BigInt(78),
						validators: sampleValidators,
						validatorsHash: blockHeaderAtCertificateHeight.validatorsHash,
					},
				];

				const result = await chainConnectorPlugin['_computeCCUParams'](
					sampleBlockHeaders,
					sampleAggregateCommits,
					validatorsData,
					sampleCCMsWithEvents,
				);
				expect(result?.ccuParams.activeValidatorsUpdate).toEqual({
					blsKeysUpdate: [],
					bftWeightsUpdate: [],
					bftWeightsUpdateBitmap: Buffer.from([]),
				});
				expect(result?.ccuParams.certificateThreshold).toEqual(
					validatorsData[0].certificateThreshold,
				);
				expect(result?.ccuParams.certificate).toEqual(
					codec.encode(certificateSchema, newCertificate),
				);
				expect(result?.ccuParams.inboxUpdate.crossChainMessages).toEqual([]);
				expect(result?.ccuParams.inboxUpdate.messageWitnessHashes).toEqual([]);
				expect(result?.ccuParams.inboxUpdate.outboxRootWitness).toEqual({
					bitmap: Buffer.alloc(0),
					siblingHashes: [],
				});
			});

			it('should return non-empty activeValidatorsUpdate when (lastCertificate.validatorsHash !== newCertificate.validatorsHash)', async () => {
				when(sendingChainAPIClientMock.invoke)
					.calledWith('interoperability_getChannel', {
						chainID: chainConnectorPlugin['_receivingChainID'].toString('hex'),
					})
					.mockResolvedValue({
						...sampleChannelDataJSON,
						outbox: { ...sampleChannelDataJSON.outbox, size: 4 },
					});
				const newCertificate = {
					aggregationBits: Buffer.alloc(1),
					blockID: blockHeaderAtCertificateHeight.id as Buffer,
					height: blockHeaderAtCertificateHeight.height,
					signature: cryptography.utils.getRandomBytes(BLS_SIGNATURE_LENGTH),
					stateRoot: cryptography.utils.getRandomBytes(HASH_LENGTH),
					timestamp: blockHeaderAtCertificateHeight.timestamp,
					validatorsHash: blockHeaderAtCertificateHeight.validatorsHash,
				};
				jest
					.spyOn(certificateGenerationUtil, 'getNextCertificateFromAggregateCommits')
					.mockReturnValue(newCertificate);
				const validatorsUpdateResult = {
					activeValidatorsUpdate: {
						blsKeysUpdate: [cryptography.utils.getRandomBytes(54)],
						bftWeightsUpdate: [BigInt(1)],
						bftWeightsUpdateBitmap: Buffer.alloc(1),
					},
					certificateThreshold: BigInt(79),
				};
				jest
					.spyOn(activeValidatorsUpdateUtil, 'calculateActiveValidatorsUpdate')
					.mockReturnValue(validatorsUpdateResult);
				const lastCertificate = {
					height: 4,
					stateRoot: Buffer.alloc(1),
					timestamp: Date.now(),
					validatorsHash: cryptography.utils.getRandomBytes(HASH_LENGTH),
				};
				chainConnectorPlugin['_lastCertificate'] = lastCertificate;
				await chainConnectorPlugin['_chainConnectorStore'].setLastSentCCM({
					...getSampleCCM(4),
					height: 4,
				});
				const validatorsData = [
					{
						certificateThreshold: BigInt(78),
						validators: sampleValidators,
						validatorsHash: blockHeaderAtCertificateHeight.validatorsHash,
					},
					{
						certificateThreshold: BigInt(78),
						validators: sampleValidators,
						validatorsHash: lastCertificate.validatorsHash,
					},
				];

				const result = await chainConnectorPlugin['_computeCCUParams'](
					sampleBlockHeaders,
					sampleAggregateCommits,
					validatorsData,
					sampleCCMsWithEvents,
				);

				expect(result?.ccuParams.activeValidatorsUpdate).toEqual(
					validatorsUpdateResult.activeValidatorsUpdate,
				);
				expect(result?.ccuParams.certificateThreshold).toEqual(
					validatorsUpdateResult.certificateThreshold,
				);
				expect(result?.ccuParams.certificate).toEqual(
					codec.encode(certificateSchema, newCertificate),
				);

				expect(result?.ccuParams.inboxUpdate.crossChainMessages.length).toEqual(
					sampleCCMsWithEvents.slice(4, 9).length,
				);
				expect(result?.ccuParams.inboxUpdate.messageWitnessHashes).toEqual([]);
				expect(result?.ccuParams.inboxUpdate.outboxRootWitness).toEqual(
					sampleCCMsWithEvents[8].inclusionProof,
				);
			});

			it('should return serialized ccms and message witnesses when pending ccms', async () => {
				when(sendingChainAPIClientMock.invoke)
					.calledWith('interoperability_getChannel', {
						chainID: chainConnectorPlugin['_receivingChainID'].toString('hex'),
					})
					.mockResolvedValue({
						...sampleChannelDataJSON,
						outbox: { ...sampleChannelDataJSON.outbox, size: 4 },
					});

				const messageWitnessHashes = [cryptography.utils.getRandomBytes(HASH_LENGTH)];
				jest
					.spyOn(tree.regularMerkleTree, 'calculateRightWitness')
					.mockReturnValue(messageWitnessHashes as never);

				const newCertificate = {
					aggregationBits: Buffer.alloc(1),
					blockID: blockHeaderAtCertificateHeight.id as Buffer,
					height: blockHeaderAtCertificateHeight.height,
					signature: cryptography.utils.getRandomBytes(BLS_SIGNATURE_LENGTH),
					stateRoot: cryptography.utils.getRandomBytes(HASH_LENGTH),
					timestamp: blockHeaderAtCertificateHeight.timestamp,
					validatorsHash: blockHeaderAtCertificateHeight.validatorsHash,
				};
				jest
					.spyOn(certificateGenerationUtil, 'getNextCertificateFromAggregateCommits')
					.mockReturnValue(newCertificate);
				const validatorsUpdateResult = {
					activeValidatorsUpdate: {
						blsKeysUpdate: [cryptography.utils.getRandomBytes(54)],
						bftWeightsUpdate: [BigInt(1)],
						bftWeightsUpdateBitmap: Buffer.alloc(1),
					},
					certificateThreshold: BigInt(79),
				};
				jest
					.spyOn(activeValidatorsUpdateUtil, 'calculateActiveValidatorsUpdate')
					.mockReturnValue(validatorsUpdateResult);
				const lastCertificate = {
					height: 4,
					stateRoot: Buffer.alloc(1),
					timestamp: Date.now(),
					validatorsHash: cryptography.utils.getRandomBytes(HASH_LENGTH),
				};
				chainConnectorPlugin['_lastCertificate'] = lastCertificate;
				await chainConnectorPlugin['_chainConnectorStore'].setLastSentCCM({
					...getSampleCCM(4),
					height: 4,
				});
				const validatorsData = [
					{
						certificateThreshold: BigInt(78),
						validators: sampleValidators,
						validatorsHash: blockHeaderAtCertificateHeight.validatorsHash,
					},
					{
						certificateThreshold: BigInt(78),
						validators: sampleValidators,
						validatorsHash: lastCertificate.validatorsHash,
					},
				];

				// Insert CCM with a big size
				sampleCCMsWithEvents[7] = {
					ccms: [getSampleCCM(8, 10000)],
					height: 8,
					inclusionProof: {
						bitmap: Buffer.alloc(1),
						siblingHashes: [Buffer.alloc(1)],
					},
					outboxSize: 2,
				};
				await chainConnectorPlugin['_chainConnectorStore'].setCrossChainMessages(
					sampleCCMsWithEvents,
				);

				const result = await chainConnectorPlugin['_computeCCUParams'](
					sampleBlockHeaders,
					sampleAggregateCommits,
					validatorsData,
					sampleCCMsWithEvents,
				);
				expect(result?.ccuParams.activeValidatorsUpdate).toEqual(
					validatorsUpdateResult.activeValidatorsUpdate,
				);
				expect(result?.ccuParams.certificateThreshold).toEqual(
					validatorsUpdateResult.certificateThreshold,
				);
				expect(result?.ccuParams.certificate).toEqual(
					codec.encode(certificateSchema, newCertificate),
				);
				expect(result?.ccuParams.inboxUpdate.crossChainMessages.length).toEqual(
					sampleCCMsWithEvents.slice(5, 8).length,
				);
				expect(result?.ccuParams.inboxUpdate.messageWitnessHashes).toEqual(messageWitnessHashes);
				expect(result?.ccuParams.inboxUpdate.outboxRootWitness).toEqual(
					sampleCCMsWithEvents[8].inclusionProof,
				);
			});

			it('should return empty list of ccms and message witnesses when no pending ccms', async () => {
				when(sendingChainAPIClientMock.invoke)
					.calledWith('interoperability_getChannel', {
						chainID: chainConnectorPlugin['_receivingChainID'].toString('hex'),
					})
					.mockResolvedValue({
						...sampleChannelDataJSON,
						outbox: { ...sampleChannelDataJSON.outbox, size: 4 },
					});

				const newCertificate = {
					aggregationBits: Buffer.alloc(1),
					blockID: blockHeaderAtCertificateHeight.id as Buffer,
					height: blockHeaderAtCertificateHeight.height,
					signature: cryptography.utils.getRandomBytes(BLS_SIGNATURE_LENGTH),
					stateRoot: cryptography.utils.getRandomBytes(HASH_LENGTH),
					timestamp: blockHeaderAtCertificateHeight.timestamp,
					validatorsHash: blockHeaderAtCertificateHeight.validatorsHash,
				};
				jest
					.spyOn(certificateGenerationUtil, 'getNextCertificateFromAggregateCommits')
					.mockReturnValue(newCertificate);
				const validatorsUpdateResult = {
					activeValidatorsUpdate: {
						blsKeysUpdate: [cryptography.utils.getRandomBytes(54)],
						bftWeightsUpdate: [BigInt(1)],
						bftWeightsUpdateBitmap: Buffer.alloc(1),
					},
					certificateThreshold: BigInt(79),
				};
				jest
					.spyOn(activeValidatorsUpdateUtil, 'calculateActiveValidatorsUpdate')
					.mockReturnValue(validatorsUpdateResult);
				const lastCertificate = {
					height: 4,
					stateRoot: Buffer.alloc(1),
					timestamp: Date.now(),
					validatorsHash: cryptography.utils.getRandomBytes(HASH_LENGTH),
				};
				chainConnectorPlugin['_lastCertificate'] = lastCertificate;
				await chainConnectorPlugin['_chainConnectorStore'].setLastSentCCM({
					...getSampleCCM(4),
					height: 4,
				});
				const validatorsData = [
					{
						certificateThreshold: BigInt(78),
						validators: sampleValidators,
						validatorsHash: blockHeaderAtCertificateHeight.validatorsHash,
					},
					{
						certificateThreshold: BigInt(78),
						validators: sampleValidators,
						validatorsHash: lastCertificate.validatorsHash,
					},
				];

				// Empty ccms for certificate height
				const result = await chainConnectorPlugin['_computeCCUParams'](
					sampleBlockHeaders,
					sampleAggregateCommits,
					validatorsData,
					[
						{
							ccms: [],
							height: 9,
							inclusionProof: {
								bitmap: Buffer.alloc(1),
								siblingHashes: [Buffer.alloc(1)],
							},
							outboxSize: 2,
						},
					],
				);
				expect(result?.ccuParams.activeValidatorsUpdate).toEqual(
					validatorsUpdateResult.activeValidatorsUpdate,
				);
				expect(result?.ccuParams.certificateThreshold).toEqual(
					validatorsUpdateResult.certificateThreshold,
				);
				expect(result?.ccuParams.certificate).toEqual(
					codec.encode(certificateSchema, newCertificate),
				);
				expect(result?.ccuParams.inboxUpdate.crossChainMessages).toEqual([]);
				expect(result?.ccuParams.inboxUpdate.messageWitnessHashes).toEqual([]);
				expect(result?.ccuParams.inboxUpdate.outboxRootWitness).toEqual({
					bitmap: EMPTY_BYTES,
					siblingHashes: [],
				});
			});
		});
	});

	describe('_submitCCU', () => {
		const ccuParams = cryptography.utils.getRandomBytes(100);
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

			await chainConnectorPlugin['_submitCCU'](ccuParams);
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
			expect(sendingChainAPIClientMock.invoke).toHaveBeenCalledTimes(3);
		});
	});
});
