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
} from 'lisk-sdk';
import { when } from 'jest-when';
import { CCM_BASED_CCU_FREQUENCY, LIVENESS_BASED_CCU_FREQUENCY } from '../../src/constants';
import * as plugins from '../../src/chain_connector_plugin';
import * as dbApi from '../../src/db';
import * as utils from '../../src/utils';

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

describe('ChainConnectorPlugin', () => {
	let chainConnectorPlugin: plugins.ChainConnectorPlugin;
	const dbMock = {
		get: jest.fn(),
		set: jest.fn(),
		close: jest.fn(),
	};
	const sidechainAPIClientMock = {
		disconnect: jest.fn().mockResolvedValue({} as never),
		invoke: jest.fn(),
		subscribe: jest.fn(),
	};

	beforeEach(() => {
		chainConnectorPlugin = new plugins.ChainConnectorPlugin();

		jest.spyOn(dbApi, 'getDBInstance').mockResolvedValue(dbMock as never);
		jest.spyOn(dbApi, 'setChainConnectorInfo').mockResolvedValue();
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
			expect(chainConnectorPlugin['_ccuFrequency'].ccm).toEqual(CCM_BASED_CCU_FREQUENCY);
			expect(chainConnectorPlugin['_ccuFrequency'].liveness).toEqual(LIVENESS_BASED_CCU_FREQUENCY);
		});

		it('should assign ccuFrequency properties to passed config values', async () => {
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: {
					mainchainIPCPath: '~/.lisk/mainchain',
					sidechainIPCPath: '~/.list/sidechain',
					ccmBasedFrequency: 100,
					livenessBasedFrequency: 300000,
				},
				appConfig: appConfigForPlugin,
			});
			expect(chainConnectorPlugin['_ccuFrequency'].ccm).toBe(100);
			expect(chainConnectorPlugin['_ccuFrequency'].liveness).toBe(300000);
		});
	});

	describe('load', () => {
		beforeEach(() => {
			(chainConnectorPlugin as any)['_mainchainAPIClient'] = {
				disconnect: jest.fn().mockResolvedValue({} as never),
				invoke: jest.fn(),
				subscribe: jest.fn().mockResolvedValue({} as never),
			};
			(chainConnectorPlugin as any)['_sidechainAPIClient'] = {
				disconnect: jest.fn().mockResolvedValue({} as never),
				invoke: jest.fn(),
				subscribe: jest.fn().mockResolvedValue({} as never),
			};
		});

		afterEach(async () => {
			(chainConnectorPlugin as any)['_mainchainAPIClient'] = {
				disconnect: jest.fn().mockResolvedValue({} as never),
				invoke: jest.fn(),
				subscribe: jest.fn().mockResolvedValue({} as never),
			};
			(chainConnectorPlugin as any)['_sidechainAPIClient'] = {
				disconnect: jest.fn().mockResolvedValue({} as never),
				invoke: jest.fn(),
				subscribe: jest.fn().mockResolvedValue({} as never),
			};
			await chainConnectorPlugin.unload();
		});

		it('should initialize api clients without sidechain', async () => {
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({
				disconnect: jest.fn().mockResolvedValue({} as never),
				invoke: jest.fn(),
				subscribe: jest.fn().mockResolvedValue({} as never),
			} as never);
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
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({
				disconnect: jest.fn().mockResolvedValue({} as never),
				invoke: jest.fn(),
				subscribe: jest.fn().mockResolvedValue({} as never),
			} as never);
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
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({
				disconnect: jest.fn().mockResolvedValue({} as never),
				invoke: jest.fn(),
				subscribe: jest.fn().mockResolvedValue({} as never),
			} as never);
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
			expect(chainConnectorPlugin['_chainConnectorPluginDB']).toEqual(dbMock);
		});
	});

	describe('_newBlockhandler', () => {
		beforeEach(() => {
			(chainConnectorPlugin as any)['_sidechainAPIClient'] = sidechainAPIClientMock;
			(chainConnectorPlugin as any)['_createCCU'] = jest.fn();
			(chainConnectorPlugin as any)['_cleanup'] = jest.fn();
		});

		afterEach(async () => {
			(chainConnectorPlugin as any)['_mainchainAPIClient'] = {
				disconnect: jest.fn().mockResolvedValue({} as never),
				invoke: jest.fn(),
				subscribe: jest.fn().mockResolvedValue({} as never),
			};
			(chainConnectorPlugin as any)['_sidechainAPIClient'] = {
				disconnect: jest.fn().mockResolvedValue({} as never),
				invoke: jest.fn(),
				subscribe: jest.fn().mockResolvedValue({} as never),
			};
			await chainConnectorPlugin.unload();
		});

		it('should invoke "consensus_getBFTParameters" on _sidechainAPIClient', async () => {
			const block = await testing.createBlock({
				chainID: Buffer.from('00001111', 'hex'),
				privateKey: Buffer.from(
					'd4b1a8a6f91482c40ba1d5c054bd7595cc0230291244fc47869f51c21af657b9e142de105ecd851507f2627e991b54b2b71104b11b6660d0646b9fdbe415fd87',
					'hex',
				),
				previousBlockID: cryptography.utils.getRandomBytes(20),
				timestamp: Math.floor(Date.now() / 1000),
			});
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(sidechainAPIClientMock as never);
			when(sidechainAPIClientMock.invoke)
				.calledWith('consensus_getBFTParameters', { height: block.header.height })
				.mockResolvedValue({
					certificateThreshold: BigInt(70),
					validators: [],
					validatorsHash: cryptography.utils.getRandomBytes(20),
				});
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: { mainchainIPCPath: '~/.lisk/mainchain' },
				appConfig: appConfigForPlugin,
			});

			await chainConnectorPlugin.load();
			await (chainConnectorPlugin as any)['_newBlockhandler']({
				blockHeader: block.header.toJSON(),
			});

			expect(sidechainAPIClientMock.subscribe).toHaveBeenCalledTimes(2);
			expect(sidechainAPIClientMock.invoke).toHaveBeenCalledWith('consensus_getBFTParameters', {
				height: block.header.height,
			});
			expect((chainConnectorPlugin as any)['_createCCU']).toHaveBeenCalled();
			expect((chainConnectorPlugin as any)['_cleanup']).toHaveBeenCalled();
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

		const aggregateCommits: AggregateCommit[] = [
			aggregateCommit,
			aggregateCommit,
			aggregateCommit,
			aggregateCommit,
		];

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

			jest.spyOn(dbApi, 'getChainConnectorInfo').mockResolvedValue({
				blockHeaders: [
					{
						...block.header,
						height: 1,
					},
					{
						...block.header,
					},
				],
				validatorsHashPreimage: [
					{
						validatorsHash: block.header.validatorsHash,
						validators: [
							{
								bftWeight: BigInt(0),
								blsKey: Buffer.from('00', 'hex'),
							},
						],
					},
				],
			} as never);
		});

		describe('getCertificateFromAggregateCommit', () => {
			it('should call getChainConnectorInfo', async () => {
				await chainConnectorPlugin['_getCertificateFromAggregateCommit'](aggregateCommit);

				expect(dbApi.getChainConnectorInfo).toHaveBeenCalledTimes(1);
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

			it('should call getChainConnectorInfo', async () => {
				await chainConnectorPlugin.getNextCertificateFromAggregateCommits(2, aggregateCommits);

				expect(dbApi.getChainConnectorInfo).toHaveBeenCalledTimes(1);
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

				expect(dbApi.getChainConnectorInfo).toHaveBeenCalledTimes(1);
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

				jest.spyOn(dbApi, 'getChainConnectorInfo').mockResolvedValue({
					blockHeaders: [
						{
							...block.header,
							height: -1,
						},
						{
							...block.header,
						},
					],
					validatorsHashPreimage: [
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
					],
				} as never);

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

			chainConnectorPlugin['_lastCertifiedHeight'] = 6;
		});

		describe('deleteBlockHeaders', () => {
			beforeEach(() => {
				jest.spyOn(dbApi, 'getChainConnectorInfo').mockResolvedValue({
					blockHeaders: [
						{
							height: 5,
						},
						{
							height: 6,
						},
					],
				} as never);
			});

			it('should delete block headers with height less than _lastCertifiedHeight', async () => {
				await chainConnectorPlugin.deleteBlockHeaders();

				expect(dbApi.getChainConnectorInfo).toHaveBeenCalledTimes(1);

				expect(dbApi.setChainConnectorInfo).toHaveBeenCalledWith(dbMock, {
					blockHeaders: [{ height: 6 }],
				});
			});
		});

		describe('deleteAggregateCommits', () => {
			beforeEach(() => {
				jest.spyOn(dbApi, 'getChainConnectorInfo').mockResolvedValue({
					aggregateCommits: [
						{
							height: 5,
						},
					],
				} as never);
			});

			it('should delete aggregate commits with height less than _lastCertifiedHeight', async () => {
				await chainConnectorPlugin.deleteAggregateCommits();

				expect(dbApi.getChainConnectorInfo).toHaveBeenCalledTimes(1);

				expect(dbApi.setChainConnectorInfo).toHaveBeenCalledWith(dbMock, { aggregateCommits: [] });
			});
		});

		describe('deleteValidatorsHashPreimage', () => {
			beforeEach(() => {
				jest.spyOn(dbApi, 'getChainConnectorInfo').mockResolvedValue({
					validatorsHashPreimage: [
						{
							certificateThreshold: 5,
						},
					],
				} as never);
			});

			it('should delete validatorsHashPreimage with certificate threshold less than _lastCertifiedHeight', async () => {
				await chainConnectorPlugin.deleteValidatorsHashPreimage();

				expect(dbApi.getChainConnectorInfo).toHaveBeenCalledTimes(1);

				expect(dbApi.setChainConnectorInfo).toHaveBeenCalledWith(dbMock, {
					validatorsHashPreimage: [],
				});
			});
		});
	});

	describe('_verifyLiveness', () => {
		beforeEach(() => {
			(chainConnectorPlugin as any)['_mainchainAPIClient'] = {
				disconnect: jest.fn().mockResolvedValue({} as never),
				invoke: jest.fn(),
				subscribe: jest.fn().mockResolvedValue({} as never),
			};
			(chainConnectorPlugin as any)['_sidechainAPIClient'] = {
				disconnect: jest.fn().mockResolvedValue({} as never),
				invoke: jest.fn(),
				subscribe: jest.fn().mockResolvedValue({} as never),
			};
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
			const blockHeader = {} as chain.BlockHeader;
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
			const blockHeader = {} as chain.BlockHeader;
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
			const blockHeader = {} as chain.BlockHeader;
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
			const blockHeader = {} as chain.BlockHeader;
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

			chainConnectorPlugin['_chainConnectorState'] = {
				validatorsHashPreimage: [
					{
						validatorsHash: Buffer.from('10'),
						validators: [
							{
								blsKey: Buffer.from('10'),
								bftWeight: BigInt(10),
							},
						],
					},
				],
			} as never;

			jest.spyOn(cryptography.bls, 'verifyWeightedAggSig').mockReturnValue(false);

			const certificateBytes = Buffer.from('10');
			const certificate = {
				height: 5,
				aggregationBits: Buffer.from('10'),
				signature: Buffer.from('10'),
			} as Certificate;
			const blockHeader = { validatorsHash: Buffer.from('10') } as chain.BlockHeader;
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

			chainConnectorPlugin['_chainConnectorState'] = {
				validatorsHashPreimage: [
					{
						validatorsHash: Buffer.from('10'),
						validators: [
							{
								blsKey: Buffer.from('10'),
								bftWeight: BigInt(10),
							},
						],
					},
				],
			} as never;

			jest.spyOn(cryptography.bls, 'verifyWeightedAggSig').mockReturnValue(false);

			const certificateBytes = Buffer.from('10');
			const certificate = {
				height: 5,
				aggregationBits: Buffer.from('10'),
				signature: Buffer.from('10'),
			} as Certificate;
			const blockHeader = { validatorsHash: Buffer.from('11') } as chain.BlockHeader;
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
			crossChainMessages: [Buffer.from('01'), Buffer.from('01')],
			messageWitnessHashes: [],
			outboxRootWitness: {
				bitmap: Buffer.from('00'),
				siblingHashes: [],
			},
		};

		beforeEach(() => {
			chainConnectorPlugin['_ccuFrequency'] = { ccm: 2 } as never;

			chainConnectorPlugin['_chainConnectorState'] = {
				crossChainMessages: [
					{
						nonce: 5,
					},
					{
						nonce: 6,
					},
					{
						nonce: 7,
					},
				],
			} as never;

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

			expect(codec.encode).toHaveBeenCalledTimes(2);
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
			chainConnectorPlugin['_chainConnectorState'] = {
				blockHeaders: [
					{
						height: 5,
						validatorsHash,
					},
					{
						height: 6,
						validatorsHash,
					},
				],
				validatorsHashPreimage: [
					{
						validatorsHash,
						certificateThreshold: BigInt(0),
					},
				],
			} as never;

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
				const ccuTxParams = await chainConnectorPlugin.calculateCCUParams(
					sendingChainID,
					certificate as never,
					newCertificateThreshold,
				);

				expect(ccuTxParams!.activeValidatorsUpdate).toEqual([]);
			});

			it('should return CCUTxParams with newCertificateThreshold set to provided newCertificateThreshold', async () => {
				const ccuTxParams = await chainConnectorPlugin.calculateCCUParams(
					sendingChainID,
					certificate as never,
					newCertificateThreshold,
				);

				expect(ccuTxParams!.certificateThreshold).toEqual(newCertificateThreshold);
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
				const ccuTxParams = await chainConnectorPlugin.calculateCCUParams(
					sendingChainID,
					certificate as never,
					newCertificateThreshold,
				);

				expect(ccuTxParams!.certificateThreshold).toEqual(BigInt(0));
			});

			it('should return CCUTxParams with newCertificateThreshold set to provided newCertificateThreshold if validatorsHash of block header at certificate height is not equal to that of last certificate', async () => {
				chainConnectorPlugin['_chainConnectorState'] = {
					blockHeaders: [
						{
							height: 5,
							validatorsHash: Buffer.from('05'),
						},
						{
							height: 6,
							validatorsHash,
						},
					],
					validatorsHashPreimage: [
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
					],
				} as never;

				const ccuTxParams = await chainConnectorPlugin.calculateCCUParams(
					sendingChainID,
					certificate as never,
					newCertificateThreshold,
				);

				expect(ccuTxParams!.certificateThreshold).toEqual(newCertificateThreshold);
			});

			it('should call getActiveValidatorsDiff', async () => {
				chainConnectorPlugin['_chainConnectorState'] = {
					blockHeaders: [
						{
							height: 5,
							validatorsHash: Buffer.from('05'),
						},
						{
							height: 6,
							validatorsHash,
						},
					],
					validatorsHashPreimage: [
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
					],
				} as never;

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
