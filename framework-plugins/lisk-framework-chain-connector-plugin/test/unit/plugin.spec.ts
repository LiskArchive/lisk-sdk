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
	AggregateCommit,
	Certificate,
	computeCertificateFromBlockHeader,
	BFTHeights,
	cryptography,
	chain,
	testing,
	apiClient,
	ApplicationConfigForPlugin,
	GenesisConfig,
	LIVENESS_LIMIT,
	ChainAccount,
	ChainStatus,
	codec,
	CCMsg,
	ccmSchema,
	db,
	Block,
} from 'lisk-sdk';
import { when } from 'jest-when';
import {
	CCU_FREQUENCY,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	MODULE_NAME_INTEROPERABILITY,
	CCM_SEND_SUCCESS,
	CCU_TOTAL_CCM_SIZE,
} from '../../src/constants';
import * as plugins from '../../src/chain_connector_plugin';
import * as dbApi from '../../src/db';
import * as utils from '../../src/utils';
import {
	BlockHeader,
	CrossChainUpdateTransactionParams,
	CrossChainMessagesFromEvents,
} from '../../src/types';

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

const getEventsJSON = (eventsCount: number) => {
	const someEvents = [];
	let i = 0;
	const height = 1;
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

describe('ChainConnectorPlugin', () => {
	let chainConnectorPlugin: plugins.ChainConnectorPlugin;
	const sidechainAPIClientMock = {
		disconnect: jest.fn().mockResolvedValue({} as never),
		invoke: jest.fn(),
		subscribe: jest.fn(),
	};

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

	const setupChainConnectorPluginLoad = async (block: Block, eventsCount = 2) => {
		jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(sidechainAPIClientMock as never);

		when(sidechainAPIClientMock.invoke)
			.calledWith('consensus_getBFTParameters', { height: block.header.height })
			.mockResolvedValue({
				certificateThreshold: BigInt(70),
				validators: [],
				validatorsHash: cryptography.utils.getRandomBytes(20),
			});

		when(sidechainAPIClientMock.invoke)
			.calledWith('chain_getEvents', { height: block.header.height })
			.mockResolvedValue(getEventsJSON(eventsCount));

		await chainConnectorPlugin.init({
			logger: testing.mocks.loggerMock,
			config: { mainchainIPCPath: '~/.lisk/mainchain' },
			appConfig: appConfigForPlugin,
		});

		await chainConnectorPlugin.load();
		await (chainConnectorPlugin as any)['_newBlockHandler']({
			blockHeader: block.header.toJSON(),
		});
	};

	beforeEach(() => {
		chainConnectorPlugin = new plugins.ChainConnectorPlugin();

		jest.spyOn(dbApi, 'getDBInstance').mockResolvedValue(new db.InMemoryDatabase() as never);
		(chainConnectorPlugin as any)['_sidechainChainConnectorStore'] = chainConnectorStoreMock;
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('init', () => {
		beforeEach(() => {
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(sidechainAPIClientMock as never);
		});

		it('should assign ccuFrequency properties to default values', async () => {
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: { mainchainIPCPath: '~/.lisk/mainchain' },
				appConfig: appConfigForPlugin,
			});
			expect(chainConnectorPlugin['_ccuFrequency']).toEqual(CCU_FREQUENCY);
		});

		it('should assign ccuFrequency properties to passed config values', async () => {
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: {
					mainchainIPCPath: '~/.lisk/mainchain',
					sidechainIPCPath: '~/.list/sidechain',
					ccuFrequency: 300000,
				},
				appConfig: appConfigForPlugin,
			});
			expect(chainConnectorPlugin['_ccuFrequency']).toBe(300000);
		});
	});

	describe('load', () => {
		beforeEach(() => {
			(chainConnectorPlugin as any)['_mainchainAPIClient'] = getApiClientMocks();
			(chainConnectorPlugin as any)['_sidechainAPIClient'] = getApiClientMocks();
		});

		afterEach(async () => {
			(chainConnectorPlugin as any)['_mainchainAPIClient'] = getApiClientMocks();
			(chainConnectorPlugin as any)['_sidechainAPIClient'] = getApiClientMocks();
			await chainConnectorPlugin.unload();
		});

		it('should initialize api clients without sidechain', async () => {
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(getApiClientMocks() as never);
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: { mainchainIPCPath: '~/.lisk/mainchain' },
				appConfig: appConfigForPlugin,
			});

			await chainConnectorPlugin.load();

			expect(chainConnectorPlugin['_mainchainAPIClient']).toBeDefined();
			expect(chainConnectorPlugin['_sidechainAPIClient']).toBe(chainConnectorPlugin['_apiClient']);
		});

		it('should initialize api clients with sidechain', async () => {
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(getApiClientMocks() as never);
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: { mainchainIPCPath: '~/.lisk/mainchain', sidechainIPCPath: '~/.lisk/sidechain' },
				appConfig: appConfigForPlugin,
			});
			await chainConnectorPlugin.load();

			expect(chainConnectorPlugin['_mainchainAPIClient']).toBeDefined();
			expect(chainConnectorPlugin['_sidechainAPIClient']).toBeDefined();
		});

		it('should initialize _chainConnectorDB', async () => {
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(getApiClientMocks() as never);
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: {
					mainchainIPCPath: '~/.lisk/mainchain',
					sidechainIPCPath: '~/.lisk/sidechain',
				},
				appConfig: appConfigForPlugin,
			});

			await chainConnectorPlugin.load();

			expect(dbApi.getDBInstance).toHaveBeenCalledTimes(1);
			expect(chainConnectorPlugin['_chainConnectorPluginDB']).toEqual(
				new db.InMemoryDatabase() as never,
			);
		});
	});

	describe('_newBlockHandler', () => {
		let block: Block;
		beforeEach(async () => {
			(chainConnectorPlugin as any)['_sidechainChainConnectorStore'] = chainConnectorStoreMock;
			(chainConnectorPlugin as any)['_sidechainAPIClient'] = sidechainAPIClientMock;
			(chainConnectorPlugin as any)['_groupCCMsBySize'] = jest.fn();
			(chainConnectorPlugin as any)['_createCCU'] = jest.fn();
			(chainConnectorPlugin as any)['_cleanup'] = jest.fn();

			block = await getTestBlock();
			await setupChainConnectorPluginLoad(block);
		});

		afterEach(async () => {
			(chainConnectorPlugin as any)['_mainchainAPIClient'] = getApiClientMocks();
			(chainConnectorPlugin as any)['_sidechainAPIClient'] = getApiClientMocks();
			await chainConnectorPlugin.unload();
			jest.resetAllMocks();
		});

		it('should invoke "consensus_getBFTParameters" on _sidechainAPIClient', () => {
			when(chainConnectorStoreMock.getBlockHeaders).calledWith().mockResolvedValue([]);

			when(chainConnectorStoreMock.getAggregateCommits).calledWith().mockResolvedValue([]);

			when(chainConnectorStoreMock.getValidatorsHashPreimage).calledWith().mockResolvedValue([]);

			when(chainConnectorStoreMock.getCrossChainMessages).calledWith().mockResolvedValue([]);

			expect(sidechainAPIClientMock.subscribe).toHaveBeenCalledTimes(1);
			expect(sidechainAPIClientMock.invoke).toHaveBeenCalledWith('consensus_getBFTParameters', {
				height: block.header.height,
			});
			expect((chainConnectorPlugin as any)['_createCCU']).toHaveBeenCalled();
			expect((chainConnectorPlugin as any)['_cleanup']).toHaveBeenCalled();
		});

		it('should invoke "chain_getEvents" on _sidechainAPIClient', async () => {
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

			await chainConnectorPlugin.load();
			await (chainConnectorPlugin as any)['_newBlockHandler']({
				blockHeader: block.header.toJSON(),
			});

			expect(sidechainAPIClientMock.subscribe).toHaveBeenCalledTimes(1);
			expect(sidechainAPIClientMock.invoke).toHaveBeenCalledWith('chain_getEvents', {
				height: block.header.height,
			});

			expect((chainConnectorPlugin as any)['_createCCU']).toHaveBeenCalled();
			expect((chainConnectorPlugin as any)['_cleanup']).toHaveBeenCalled();

			const ccm = getCCM(1);
			const savedCCMs = await chainConnectorPlugin[
				'_sidechainChainConnectorStore'
			].getCrossChainMessages();
			expect(savedCCMs).toEqual([
				{
					ccms: [
						{ ...ccm, nonce: BigInt(1) },
						{ ...ccm, nonce: BigInt(2) },
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

	describe('getListOfCCMs', () => {
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

			// after filtering, we will have ccms only from heights 3 & 4, so total 25 ccms
			chainConnectorPlugin['_lastCertifiedHeight'] = 2;
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
			expect(thirdList).toHaveLength(7);
		});
	});

	describe('unload', () => {
		it.todo('should unload plugin');
	});

	describe('Auxiliary Functions', () => {
		let aggregateCommit: AggregateCommit = {
			height: 2,
			aggregationBits: Buffer.from('00', 'hex'),
			certificateSignature: Buffer.alloc(0),
		};

		const aggregateCommits: AggregateCommit[] = new Array(4).fill(0).map(() => aggregateCommit);

		const block = {
			header: {
				version: 2,
				timestamp: 1658508497,
				height: 2,
				previousBlockID: Buffer.from(
					'b3778ca5ff83a6da5fea3b96fae6538c24b0ee88236faf06495022782d09756f',
					'hex',
				),
				stateRoot: Buffer.from(
					'f7df9bec6d6106acb86a386d389a89988b0ebf5c9c722f375864e6f4983d4af7',
					'hex',
				),
				assetRoot: Buffer.from(
					'f81025331b0ac890653ab48aa928b63724b40362ba707931ca524f8df513a24e',
					'hex',
				),
				eventRoot: Buffer.from(
					'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
					'hex',
				),
				transactionRoot: Buffer.from(
					'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
					'hex',
				),
				validatorsHash: Buffer.from(
					'ad0076aa444f6cda608bb163c3bd77d9bf172f1d2803d53095bc0f277db6bcb3',
					'hex',
				),
				aggregateCommit: {
					height: 0,
					aggregationBits: Buffer.alloc(0),
					certificateSignature: Buffer.alloc(0),
				},
				generatorAddress: Buffer.from('38562249e1969099833677a98e0c1a5ebaa2a191', 'hex'),
				maxHeightPrevoted: 0,
				maxHeightGenerated: 0,
				signature: Buffer.from(
					'82743907d3beb8565638a5d82a8891a7142abfa5b6e3328ed7259efc7a66acd71617eef2ec50191d42027f8bfefa361f087b714981641231d312347393d20f01',
					'hex',
				),
				impliesMaxPrevotes: true,
				id: Buffer.from('f04938e16d894bcbbe71efcc2ef053ee5d149a4ecca099137398d70876afc164'),
			},
			transactions: [],
			assets: [
				{
					moduleID: '0000000f',
					data: '0a100ec4eed9bdb878f3454356db515aed2c',
				},
			],
		};

		const bftHeights: BFTHeights = {
			maxHeightPrevoted: 5,
			maxHeightPrecommitted: 5,
			maxHeightCertified: 3,
		};

		let blsKeyToBFTWeight: Record<string, bigint> = {
			ad0076aa444f6cda608bb163c3bd77d9bf172f1d2803d53095bc0f277db6bcb3: BigInt(1),
		};

		beforeEach(async () => {
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(sidechainAPIClientMock as never);
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: {
					mainchainIPCPath: '~/.lisk/mainchain',
					sidechainIPCPath: '~/.list/sidechain',
				},
				appConfig: appConfigForPlugin,
			});

			await chainConnectorPlugin.load();
			(chainConnectorPlugin as any)['_sidechainChainConnectorStore'] = chainConnectorStoreMock;

			chainConnectorStoreMock.getBlockHeaders.mockResolvedValue([
				{
					...block.header,
					height: 1,
				},
				{
					...block.header,
				},
			] as never);

			chainConnectorStoreMock.getValidatorsHashPreimage.mockResolvedValue([
				{
					validatorsHash: block.header.validatorsHash,
					validators: [
						{
							bftWeight: BigInt(0),
							blsKey: Buffer.from('00', 'hex'),
						},
					],
				},
			] as never);
		});

		describe('getCertificateFromAggregateCommit', () => {
			it('should call getBlockHeaders', async () => {
				await chainConnectorPlugin['_getCertificateFromAggregateCommit'](aggregateCommit);

				expect(
					chainConnectorPlugin['_sidechainChainConnectorStore']['getBlockHeaders'],
				).toHaveBeenCalledTimes(1);
			});

			it('should compute Certificate from BlockHeader', async () => {
				const blockHeader: chain.BlockHeader = new chain.BlockHeader(block.header);
				const expectedCertificate = computeCertificateFromBlockHeader(blockHeader);

				expectedCertificate.aggregationBits = Buffer.alloc(0);
				expectedCertificate.signature = Buffer.alloc(0);

				const certificate = await chainConnectorPlugin['_getCertificateFromAggregateCommit'](
					aggregateCommit,
				);

				expect(certificate).toEqual(expectedCertificate);
			});
		});

		describe('getNextCertificateFromAggregateCommits', () => {
			let expectedCertificate: Certificate;

			beforeEach(() => {
				const blockHeader: chain.BlockHeader = new chain.BlockHeader(block.header);
				expectedCertificate = computeCertificateFromBlockHeader(blockHeader);

				(chainConnectorPlugin['_sidechainAPIClient'] as any).invoke = jest
					.fn()
					.mockResolvedValue(bftHeights);

				chainConnectorPlugin['_checkChainOfTrust'] = jest
					.fn()
					.mockResolvedValueOnce(false)
					.mockResolvedValueOnce(true);
				chainConnectorPlugin['_getCertificateFromAggregateCommit'] = jest
					.fn()
					.mockResolvedValue(expectedCertificate);
			});

			it('should call getBlockHeaders', async () => {
				await chainConnectorPlugin.getNextCertificateFromAggregateCommits(2, aggregateCommits);

				expect(
					chainConnectorPlugin['_sidechainChainConnectorStore']['getBlockHeaders'],
				).toHaveBeenCalledTimes(1);
			});

			it('should invoke consensus_getBFTHeights on _sidechainAPIClient', async () => {
				await chainConnectorPlugin.getNextCertificateFromAggregateCommits(2, aggregateCommits);

				expect((chainConnectorPlugin['_sidechainAPIClient'] as any).invoke).toHaveBeenCalledWith(
					'consensus_getBFTHeights',
				);
			});

			it('should return undefined if BFTHeights.lastCertifiedHeight < provided lastCertifiedHeight', async () => {
				const certificate = await chainConnectorPlugin.getNextCertificateFromAggregateCommits(
					2,
					aggregateCommits,
				);

				expect(certificate).toBeUndefined();
			});

			it('should return certificate from aggregateCommit if chainOfTrust is valid', async () => {
				const certificate = await chainConnectorPlugin.getNextCertificateFromAggregateCommits(
					1,
					aggregateCommits,
				);

				expect(chainConnectorPlugin['_checkChainOfTrust']).toHaveBeenCalledTimes(2);
				expect(chainConnectorPlugin['_getCertificateFromAggregateCommit']).toHaveBeenCalledTimes(1);

				expect(certificate).toEqual(expectedCertificate);
			});
		});

		describe('checkChainOfTrust', () => {
			it('should call getChainConnectorInfo', async () => {
				await chainConnectorPlugin['_checkChainOfTrust'](
					block.header.validatorsHash,
					blsKeyToBFTWeight,
					BigInt(1),
					aggregateCommit,
				);

				expect(
					chainConnectorPlugin['_sidechainChainConnectorStore']['getBlockHeaders'],
				).toHaveBeenCalledTimes(1);
			});

			it('should validate for valid lastValidatorsHash', async () => {
				const valid = await chainConnectorPlugin['_checkChainOfTrust'](
					block.header.validatorsHash,
					blsKeyToBFTWeight,
					BigInt(2),
					aggregateCommit,
				);

				expect(valid).toBe(true);
			});

			it('should validate if aggregateBFTWeight is equal or greater than provided lastCertificateThreshold', async () => {
				aggregateCommit = {
					height: 2,
					aggregationBits: Buffer.from('01', 'hex'),
					certificateSignature: Buffer.alloc(0),
				};

				blsKeyToBFTWeight = {
					ad0076aa444f6cda608bb163c3bd77d9bf172f1d2803d53095bc0f277db6bcb3: BigInt(5),
				};

				jest
					.spyOn(chainConnectorPlugin['_sidechainChainConnectorStore'], 'getBlockHeaders')
					.mockResolvedValue([
						{
							...block.header,
							height: -1,
						},
						{
							...block.header,
							height: aggregateCommit.height - 1,
						},
					] as never);

				jest
					.spyOn(chainConnectorPlugin['_sidechainChainConnectorStore'], 'getValidatorsHashPreimage')
					.mockResolvedValue([
						{
							validatorsHash: block.header.validatorsHash,
							validators: [
								{
									bftWeight: BigInt(0),
									blsKey: Buffer.from(
										'ad0076aa444f6cda608bb163c3bd77d9bf172f1d2803d53095bc0f277db6bcb3',
										'hex',
									),
								},
							],
						},
					] as never);

				let valid = await chainConnectorPlugin['_checkChainOfTrust'](
					Buffer.from('0', 'hex'),
					blsKeyToBFTWeight,
					BigInt(2),
					aggregateCommit,
				);

				expect(valid).toBe(true);

				valid = await chainConnectorPlugin['_checkChainOfTrust'](
					Buffer.from('0', 'hex'),
					blsKeyToBFTWeight,
					BigInt(-1),
					aggregateCommit,
				);

				expect(valid).toBe(true);
			});

			it('should not validate if aggregateBFTWeight is less than provided lastCertificateThreshold', async () => {
				const valid = await chainConnectorPlugin['_checkChainOfTrust'](
					Buffer.from('0', 'hex'),
					blsKeyToBFTWeight,
					BigInt(2),
					aggregateCommit,
				);

				expect(valid).toBe(false);
			});
		});
	});

	describe('Cleanup Functions', () => {
		beforeEach(async () => {
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(sidechainAPIClientMock as never);
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: {
					mainchainIPCPath: '~/.lisk/mainchain',
					sidechainIPCPath: '~/.list/sidechain',
				},
				appConfig: appConfigForPlugin,
			});

			await chainConnectorPlugin.load();
			(chainConnectorPlugin as any)['_sidechainChainConnectorStore'] = chainConnectorStoreMock;

			chainConnectorPlugin['_lastCertifiedHeight'] = 6;
		});

		describe('deleteBlockHeaders', () => {
			let block1: BlockHeader;
			let block2: BlockHeader;
			beforeEach(() => {
				block1 = testing.createFakeBlockHeader({ height: 5 }).toObject();
				block2 = testing.createFakeBlockHeader({ height: 6 }).toObject();
				chainConnectorStoreMock.getBlockHeaders.mockResolvedValue([block1, block2] as never);
			});

			it('should delete block headers with height less than _lastCertifiedHeight', async () => {
				await chainConnectorPlugin.deleteBlockHeaders();

				expect(chainConnectorStoreMock.getBlockHeaders).toHaveBeenCalledTimes(1);

				expect(chainConnectorStoreMock.setBlockHeaders).toHaveBeenCalledWith([block2]);
			});
		});

		describe('deleteAggregateCommits', () => {
			beforeEach(() => {
				jest
					.spyOn(chainConnectorPlugin['_sidechainChainConnectorStore'], 'getAggregateCommits')
					.mockResolvedValue([
						{
							height: 5,
						},
					] as never);
			});

			it('should delete aggregate commits with height less than _lastCertifiedHeight', async () => {
				await chainConnectorPlugin.deleteAggregateCommits();

				expect(
					chainConnectorPlugin['_sidechainChainConnectorStore'].getAggregateCommits,
				).toHaveBeenCalledTimes(1);

				expect(
					chainConnectorPlugin['_sidechainChainConnectorStore'].setAggregateCommits,
				).toHaveBeenCalledWith([]);
			});
		});

		describe('deleteValidatorsHashPreimage', () => {
			beforeEach(() => {
				jest
					.spyOn(chainConnectorPlugin['_sidechainChainConnectorStore'], 'getValidatorsHashPreimage')
					.mockResolvedValue([
						{
							certificateThreshold: 5,
						},
					] as never);
			});

			it('should delete validatorsHashPreimage with certificate threshold less than _lastCertifiedHeight', async () => {
				await chainConnectorPlugin.deleteValidatorsHashPreimage();

				expect(
					chainConnectorPlugin['_sidechainChainConnectorStore'].getValidatorsHashPreimage,
				).toHaveBeenCalledTimes(1);

				expect(
					chainConnectorPlugin['_sidechainChainConnectorStore'].setValidatorsHashPreimage,
				).toHaveBeenCalledWith([]);
			});
		});
	});

	describe('_verifyLiveness', () => {
		beforeEach(() => {
			(chainConnectorPlugin as any)['_mainchainAPIClient'] = getApiClientMocks();
			(chainConnectorPlugin as any)['_sidechainAPIClient'] = getApiClientMocks();
		});

		it('should not validate if provided chain ID is not live', async () => {
			(chainConnectorPlugin['_mainchainAPIClient'] as any).invoke = jest
				.fn()
				.mockResolvedValue(false);

			const result = await chainConnectorPlugin['_verifyLiveness'](Buffer.from('10'), 10, 5);

			expect(result.status).toBe(false);
		});

		it('should not validate if the condition blockTimestamp - certificateTimestamp < LIVENESS_LIMIT / 2, is invalid', async () => {
			(chainConnectorPlugin['_mainchainAPIClient'] as any).invoke = jest
				.fn()
				.mockResolvedValue(true);

			const blockTimestamp = LIVENESS_LIMIT;
			const certificateTimestamp = LIVENESS_LIMIT / 2;

			const result = await chainConnectorPlugin['_verifyLiveness'](
				Buffer.from('10'),
				certificateTimestamp,
				blockTimestamp,
			);

			expect(result.status).toBe(false);
		});

		it('should validate if provided chain ID is live and blockTimestamp - certificateTimestamp < LIVENESS_LIMIT / 2', async () => {
			(chainConnectorPlugin['_mainchainAPIClient'] as any).invoke = jest
				.fn()
				.mockResolvedValue(true);

			const result = await chainConnectorPlugin['_verifyLiveness'](Buffer.from('10'), 10, 5);

			expect(result.status).toBe(true);
		});
	});

	describe('_validateCertificate', () => {
		it('should not validate if chain is terminated', async () => {
			const certificateBytes = Buffer.from('10');
			const certificate = { height: 5 } as Certificate;
			const blockHeader = {} as BlockHeader;
			const chainAccount = { status: ChainStatus.TERMINATED } as ChainAccount;
			const sendingChainID = Buffer.from('01');

			const result = await chainConnectorPlugin['_validateCertificate'](
				certificateBytes,
				certificate,
				blockHeader,
				chainAccount,
				sendingChainID,
			);

			expect(result.status).toBe(false);
		});

		it('should not validate if certificate height is not greater than height of last certificate', async () => {
			const certificateBytes = Buffer.from('10');
			const certificate = { height: 5 } as Certificate;
			const blockHeader = {} as BlockHeader;
			const chainAccout = {
				status: ChainStatus.ACTIVE,
				lastCertificate: { height: 5 },
			} as ChainAccount;
			const sendingChainID = Buffer.from('01');

			const result = await chainConnectorPlugin['_validateCertificate'](
				certificateBytes,
				certificate,
				blockHeader,
				chainAccout,
				sendingChainID,
			);

			expect(result.status).toBe(false);
		});

		it('should not validate if liveness is not valid', async () => {
			chainConnectorPlugin['_verifyLiveness'] = jest.fn().mockResolvedValue({
				status: false,
			});

			const certificateBytes = Buffer.from('10');
			const certificate = { height: 5 } as Certificate;
			const blockHeader = {} as BlockHeader;
			const chainAccount = {
				status: ChainStatus.ACTIVE,
				lastCertificate: { height: 4 },
			} as ChainAccount;
			const sendingChainID = Buffer.from('01');

			const result = await chainConnectorPlugin['_validateCertificate'](
				certificateBytes,
				certificate,
				blockHeader,
				chainAccount,
				sendingChainID,
			);

			expect(result.status).toBe(false);
		});

		it('should validate if chain is active and has valid liveness', async () => {
			chainConnectorPlugin['_verifyLiveness'] = jest.fn().mockResolvedValue({
				status: true,
			});

			const certificateBytes = Buffer.from('10');
			const certificate = { height: 5 } as Certificate;
			const blockHeader = {} as BlockHeader;
			const chainAccount = {
				status: ChainStatus.ACTIVE,
				lastCertificate: { height: 4 },
			} as ChainAccount;
			const sendingChainID = Buffer.from('01');

			const result = await chainConnectorPlugin['_validateCertificate'](
				certificateBytes,
				certificate,
				blockHeader,
				chainAccount,
				sendingChainID,
			);

			expect(result.status).toBe(true);
		});

		it('should not validate if weighted aggregate signature validation fails', async () => {
			chainConnectorPlugin['_verifyLiveness'] = jest.fn().mockResolvedValue({
				status: true,
			});

			jest
				.spyOn(chainConnectorPlugin['_sidechainChainConnectorStore'], 'getValidatorsHashPreimage')
				.mockResolvedValue([
					{
						validatorsHash: Buffer.from('10'),
						validators: [
							{
								blsKey: Buffer.from('10'),
								bftWeight: BigInt(10),
							},
						],
					},
				] as never);

			jest.spyOn(cryptography.bls, 'verifyWeightedAggSig').mockReturnValue(false);

			const certificateBytes = Buffer.from('10');
			const certificate = {
				height: 5,
				aggregationBits: Buffer.from('10'),
				signature: Buffer.from('10'),
			} as Certificate;
			const blockHeader = { validatorsHash: Buffer.from('10') } as BlockHeader;
			const sendingChainID = Buffer.from('01');

			const chainAccount = {
				status: 0,
				name: 'chain1',
				lastCertificate: { height: 4 },
			} as ChainAccount;

			const result = await chainConnectorPlugin['_validateCertificate'](
				certificateBytes,
				certificate,
				blockHeader,
				chainAccount,
				sendingChainID,
			);

			expect(result.status).toBe(false);
		});

		it('should not validate if ValidatorsData for block header is undefined', async () => {
			chainConnectorPlugin['_verifyLiveness'] = jest.fn().mockResolvedValue({
				status: true,
			});
			jest
				.spyOn(chainConnectorPlugin['_sidechainChainConnectorStore'], 'getValidatorsHashPreimage')
				.mockResolvedValue([
					{
						validatorsHash: Buffer.from('10'),
						validators: [
							{
								blsKey: Buffer.from('10'),
								bftWeight: BigInt(10),
							},
						],
					},
				] as never);

			jest.spyOn(cryptography.bls, 'verifyWeightedAggSig').mockReturnValue(false);

			const certificateBytes = Buffer.from('10');
			const certificate = {
				height: 5,
				aggregationBits: Buffer.from('10'),
				signature: Buffer.from('10'),
			} as Certificate;
			const blockHeader = { validatorsHash: Buffer.from('11') } as BlockHeader;
			const chainAccount = {
				status: 0,
				name: 'chain1',
				lastCertificate: { height: 4 },
			} as ChainAccount;
			const sendingChainID = Buffer.from('01');

			const result = await chainConnectorPlugin['_validateCertificate'](
				certificateBytes,
				certificate,
				blockHeader,
				chainAccount,
				sendingChainID,
			);

			expect(result.status).toBe(false);
		});
	});

	describe('_calculateInboxUpdate', () => {
		const sendingChainID = Buffer.from('00000001', 'hex');

		const expectedInboxUpdate = {
			crossChainMessages: [Buffer.from('01'), Buffer.from('01'), Buffer.from('01')],
			messageWitnessHashes: [],
			outboxRootWitness: {
				bitmap: Buffer.from('00'),
				siblingHashes: [],
			},
		};

		beforeEach(() => {
			chainConnectorStoreMock.getCrossChainMessages.mockResolvedValue([
				{ nonce: 5 },
				{ nonce: 6 },
				{ nonce: 7 },
			] as never);

			jest.spyOn(codec, 'encode').mockReturnValue(Buffer.from('01') as never);

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

		it('should fetch as many crossChainMessages as defined by _ccFrequency', async () => {
			await chainConnectorPlugin['_calculateInboxUpdate'](sendingChainID);

			expect(codec.encode).toHaveBeenCalledTimes(3);
		});

		it('should call state_prove endpoint on _sidechainAPIClient', async () => {
			await chainConnectorPlugin['_calculateInboxUpdate'](sendingChainID);

			expect(chainConnectorPlugin['_sidechainAPIClient'].invoke).toHaveBeenCalledTimes(1);

			expect(chainConnectorPlugin['_sidechainAPIClient'].invoke).toHaveBeenCalledWith(
				'state_prove',
				{
					queries: [sendingChainID],
				},
			);
		});

		it('should return InboxUpdate with messageWitnessHashes set to empty array', async () => {
			const inboxUpdate = await chainConnectorPlugin['_calculateInboxUpdate'](sendingChainID);

			expect(inboxUpdate).toEqual(expectedInboxUpdate);
		});
	});

	describe('_calculateCCUParams', () => {
		const validatorsHash = Buffer.from('01');
		const sendingChainID = Buffer.from('01');
		const certificate = {
			height: 5,
			validatorsHash,
			stateRoot: Buffer.from('00'),
		};
		const certificateBytes = Buffer.from('ff');
		const newCertificateThreshold = BigInt(7);
		const chainAccount = {
			lastCertificate: {
				validatorsHash,
			},
		};
		const certificateValidationPassingResult = { status: true };
		const certificateValidationFailingResult = { status: false };
		const filteredBlockHeader = {
			height: 5,
			validatorsHash,
		};

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
				},
			] as never);

			chainConnectorPlugin['_mainchainAPIClient'] = sidechainAPIClientMock as never;
			chainConnectorPlugin['_mainchainAPIClient'].invoke = jest
				.fn()
				.mockResolvedValue(chainAccount);
			chainConnectorPlugin['_validateCertificate'] = jest
				.fn()
				.mockResolvedValue(certificateValidationFailingResult);
			chainConnectorPlugin['logger'] = {
				error: jest.fn(),
			} as never;

			jest.spyOn(codec, 'encode').mockReturnValue(certificateBytes);
			jest.spyOn(utils, 'getActiveValidatorsDiff').mockReturnValue([]);
			chainConnectorPlugin['_calculateInboxUpdate'] = jest.fn().mockResolvedValue({});
		});

		it('should call interoperability_getChainAccount on _mainchainAPIClient', async () => {
			await chainConnectorPlugin.calculateCCUParams(
				sendingChainID,
				certificate as never,
				newCertificateThreshold,
			);

			expect(chainConnectorPlugin['_mainchainAPIClient'].invoke).toHaveBeenCalledTimes(1);
			expect(chainConnectorPlugin['_mainchainAPIClient'].invoke).toHaveBeenCalledWith(
				'interoperability_getChainAccount',
				{ chainID: sendingChainID },
			);
		});

		it('should call _validateCertificate', async () => {
			await chainConnectorPlugin.calculateCCUParams(
				sendingChainID,
				certificate as never,
				newCertificateThreshold,
			);

			expect(chainConnectorPlugin['_validateCertificate']).toHaveBeenCalledTimes(1);
			expect(chainConnectorPlugin['_validateCertificate']).toHaveBeenCalledWith(
				certificateBytes,
				certificate,
				filteredBlockHeader,
				chainAccount,
				sendingChainID,
			);
		});

		it('should return undefined if certificate validation fails', async () => {
			const ccuTxParams = await chainConnectorPlugin.calculateCCUParams(
				sendingChainID,
				certificate as never,
				newCertificateThreshold,
			);

			expect(ccuTxParams).toBeUndefined();
		});

		it('should call logger.error with certificateValidationResult if certificate validation fails', async () => {
			await chainConnectorPlugin.calculateCCUParams(
				sendingChainID,
				certificate as never,
				newCertificateThreshold,
			);

			expect(chainConnectorPlugin['logger'].error).toHaveBeenCalledTimes(1);
			expect(chainConnectorPlugin['logger'].error).toHaveBeenCalledWith(
				certificateValidationFailingResult,
				'Certificate validation failed',
			);
		});

		it('should call _calculateInboxUpdate', async () => {
			chainConnectorPlugin['_validateCertificate'] = jest
				.fn()
				.mockResolvedValue(certificateValidationPassingResult);

			await chainConnectorPlugin.calculateCCUParams(
				sendingChainID,
				certificate as never,
				newCertificateThreshold,
			);

			expect(chainConnectorPlugin['_calculateInboxUpdate']).toHaveBeenCalledTimes(1);
			expect(chainConnectorPlugin['_calculateInboxUpdate']).toHaveBeenCalledWith(sendingChainID);
		});

		describe('when chainAccount.lastCertificate.validatorsHash == certificate.validatorsHash', () => {
			beforeEach(() => {
				chainConnectorPlugin['_validateCertificate'] = jest
					.fn()
					.mockResolvedValue(certificateValidationPassingResult);
			});

			it('should return CCUTxParams with activeValidatorsUpdate set to []', async () => {
				const ccuTxParams = (await chainConnectorPlugin.calculateCCUParams(
					sendingChainID,
					certificate as never,
					newCertificateThreshold,
				)) as CrossChainUpdateTransactionParams;

				expect(ccuTxParams.activeValidatorsUpdate).toEqual([]);
			});

			it('should return CCUTxParams with newCertificateThreshold set to provided newCertificateThreshold', async () => {
				const ccuTxParams = (await chainConnectorPlugin.calculateCCUParams(
					sendingChainID,
					certificate as never,
					newCertificateThreshold,
				)) as CrossChainUpdateTransactionParams;

				expect(ccuTxParams.certificateThreshold).toEqual(newCertificateThreshold);
			});
		});

		describe('when chainAccount.lastCertificate.validatorsHash != certificate.validatorsHash', () => {
			beforeEach(() => {
				certificate.validatorsHash = Buffer.from('20');
				chainConnectorPlugin['_validateCertificate'] = jest
					.fn()
					.mockResolvedValue(certificateValidationPassingResult);
			});

			it('should return CCUTxParams with newCertificate set to zero if validatorsHash of block header at certificate height is equal to that of last certificate', async () => {
				const ccuTxParams = (await chainConnectorPlugin.calculateCCUParams(
					sendingChainID,
					certificate as never,
					newCertificateThreshold,
				)) as CrossChainUpdateTransactionParams;

				expect(ccuTxParams.certificateThreshold).toEqual(BigInt(0));
			});

			it('should return CCUTxParams with newCertificateThreshold set to provided newCertificateThreshold if validatorsHash of block header at certificate height is not equal to that of last certificate', async () => {
				jest
					.spyOn(chainConnectorPlugin['_sidechainChainConnectorStore'], 'getBlockHeaders')
					.mockResolvedValue([
						{
							height: 5,
							validatorsHash: Buffer.from('05'),
						},
						{
							height: 6,
							validatorsHash,
						},
					] as never);

				jest
					.spyOn(chainConnectorPlugin['_sidechainChainConnectorStore'], 'getValidatorsHashPreimage')
					.mockResolvedValue([
						{
							validatorsHash: Buffer.from('05'),
							certificateThreshold: 5,
							validators: [1, 2],
						},
						{
							validatorsHash,
							newCertificateThreshold: 6,
							validators: [2, 3],
						},
					] as never);

				const ccuTxParams = (await chainConnectorPlugin.calculateCCUParams(
					sendingChainID,
					certificate as never,
					newCertificateThreshold,
				)) as CrossChainUpdateTransactionParams;

				expect(ccuTxParams.certificateThreshold).toEqual(newCertificateThreshold);
			});

			it('should call getActiveValidatorsDiff', async () => {
				jest
					.spyOn(chainConnectorPlugin['_sidechainChainConnectorStore'], 'getBlockHeaders')
					.mockResolvedValue([
						{
							height: 5,
							validatorsHash: Buffer.from('05'),
						},
						{
							height: 6,
							validatorsHash,
						},
					] as never);

				jest
					.spyOn(chainConnectorPlugin['_sidechainChainConnectorStore'], 'getValidatorsHashPreimage')
					.mockResolvedValue([
						{
							validatorsHash: Buffer.from('05'),
							certificateThreshold: 5,
							validators: [1, 2],
						},
						{
							validatorsHash,
							newCertificateThreshold: 6,
							validators: [2, 3],
						},
					] as never);

				await chainConnectorPlugin.calculateCCUParams(
					sendingChainID,
					certificate as never,
					newCertificateThreshold,
				);

				expect(utils.getActiveValidatorsDiff).toHaveBeenCalledTimes(1);
				expect(utils.getActiveValidatorsDiff).toHaveBeenCalledWith([2, 3], [1, 2]);
			});
		});
	});
});
