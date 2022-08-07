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
	chain,
	testing,
	apiClient,
} from 'lisk-sdk';
import { CCM_BASED_CCU_FREQUENCY, LIVENESS_BASED_CCU_FREQUENCY } from '../../src/constants';
import * as plugins from '../../src/chain_connector_plugin';
import * as dbApi from '../../src/db';

describe('ChainConnectorPlugin', () => {
	let chainConnectorPlugin: plugins.ChainConnectorPlugin;
	const dbMock = {
		get: jest.fn(),
		set: jest.fn(),
	};

	beforeEach(() => {
		chainConnectorPlugin = new plugins.ChainConnectorPlugin();

		jest.spyOn(dbApi, 'getDBInstance').mockResolvedValue(dbMock as never);
	});

	describe('init', () => {
		it('should assign ccuFrequency properties to default values', async () => {
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: {
					mainchainIPCPath: '~/.lisk/mainchain',
					sidechainIPCPath: '~/.list/sidechain',
				},
				appConfig: testing.fixtures.defaultConfig as never,
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
				appConfig: testing.fixtures.defaultConfig as never,
			});
			expect(chainConnectorPlugin['_ccuFrequency'].ccm).toEqual(100);
			expect(chainConnectorPlugin['_ccuFrequency'].liveness).toEqual(300000);
		});
	});

	describe('load', () => {
		afterEach(async () => {
			(chainConnectorPlugin as any)['_mainchainAPIClient'] = {
				disconnect: jest.fn().mockResolvedValue({} as never),
			};
			(chainConnectorPlugin as any)['_sidechainAPIClient'] = {
				disconnect: jest.fn().mockResolvedValue({} as never),
			};

			await chainConnectorPlugin.unload();
		});

		it('should initialize api clients and set sidechainAPIClient to apiClient if no sidechain is configured', async () => {
			const appConfig = { ...testing.fixtures.defaultConfig, rpc: { modes: ['ipc'] } };

			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({} as never);

			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: { mainchainIPCPath: '~/.lisk/mainchain' },
				appConfig: appConfig as never,
			});

			await chainConnectorPlugin.load();

			expect(chainConnectorPlugin['_mainchainAPIClient']).not.toBeUndefined();
			expect(chainConnectorPlugin['_sidechainAPIClient']).toBe(chainConnectorPlugin['_apiClient']);
		});

		it('should initialize api clients with sidechain', async () => {
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: {
					mainchainIPCPath: '~/.lisk/mainchain',
					sidechainIPCPath: '~/.lisk/sidechain',
				},
				appConfig: testing.fixtures.defaultConfig as never,
			});
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({} as never);

			await chainConnectorPlugin.load();

			expect(chainConnectorPlugin['_mainchainAPIClient']).not.toBeUndefined();
			expect(chainConnectorPlugin['_sidechainAPIClient']).not.toBeUndefined();
		});

		it('should initialize _chainConnectorDB', async () => {
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: {
					mainchainIPCPath: '~/.lisk/mainchain',
					sidechainIPCPath: '~/.lisk/sidechain',
				},
				appConfig: testing.fixtures.defaultConfig as never,
			});

			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({} as never);

			await chainConnectorPlugin.load();

			expect(dbApi.getDBInstance).toHaveBeenCalledTimes(1);
			expect(chainConnectorPlugin['_chainConnectorDB']).toEqual(dbMock);
		});
	});

	describe('alias', () => {
		it.todo('should have valid alias');
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
			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: {
					mainchainIPCPath: '~/.lisk/mainchain',
					sidechainIPCPath: '~/.list/sidechain',
				},
				appConfig: testing.fixtures.defaultConfig as never,
			});

			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue({} as never);
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
				await chainConnectorPlugin.getCertificateFromAggregateCommit(aggregateCommit);

				expect(dbApi.getChainConnectorInfo).toHaveBeenCalledTimes(1);
			});

			it('should compute Certificate from BlockHeader', async () => {
				const blockHeader: chain.BlockHeader = new chain.BlockHeader(block.header);
				const expectedCertificate = computeCertificateFromBlockHeader(blockHeader);
				expectedCertificate.aggregationBits = Buffer.alloc(0);
				expectedCertificate.signature = Buffer.alloc(0);

				const certificate = await chainConnectorPlugin.getCertificateFromAggregateCommit(
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

				chainConnectorPlugin['_sidechainAPIClient'].invoke = jest
					.fn()
					.mockResolvedValue(bftHeights);

				chainConnectorPlugin.checkChainOfTrust = jest
					.fn()
					.mockResolvedValueOnce(false)
					.mockResolvedValueOnce(true);
				chainConnectorPlugin.getCertificateFromAggregateCommit = jest
					.fn()
					.mockResolvedValue(expectedCertificate);
			});

			it('should call getChainConnectorInfo', async () => {
				await chainConnectorPlugin.getNextCertificateFromAggregateCommits(2, aggregateCommits);

				expect(dbApi.getChainConnectorInfo).toHaveBeenCalledTimes(1);
			});

			it('should invoke consensus_getBFTHeights on _sidechainAPIClient', async () => {
				await chainConnectorPlugin.getNextCertificateFromAggregateCommits(2, aggregateCommits);

				expect(chainConnectorPlugin['_sidechainAPIClient'].invoke).toHaveBeenCalledWith(
					'consensus_getBFTHeights',
				);
			});

			it('returns undefined if BFTHeights.lastCertifiedHeight < provided lastCertifiedHeight', async () => {
				const certificate = await chainConnectorPlugin.getNextCertificateFromAggregateCommits(
					2,
					aggregateCommits,
				);

				expect(certificate).toBeUndefined();
			});

			it('returns certificate from aggregateCommit if chainOfTrust is valid', async () => {
				const certificate = await chainConnectorPlugin.getNextCertificateFromAggregateCommits(
					1,
					aggregateCommits,
				);

				expect(chainConnectorPlugin.checkChainOfTrust).toHaveBeenCalledTimes(2);
				expect(chainConnectorPlugin.getCertificateFromAggregateCommit).toHaveBeenCalledTimes(1);

				expect(certificate).toEqual(expectedCertificate);
			});
		});

		describe('checkChainOfTrust', () => {
			it('should call getChainConnectorInfo', async () => {
				await chainConnectorPlugin.checkChainOfTrust(
					block.header.validatorsHash,
					blsKeyToBFTWeight,
					BigInt(1),
					aggregateCommit,
				);

				expect(dbApi.getChainConnectorInfo).toHaveBeenCalledTimes(1);
			});

			it('validates for valid lastValidatorsHash', async () => {
				const valid = await chainConnectorPlugin.checkChainOfTrust(
					block.header.validatorsHash,
					blsKeyToBFTWeight,
					BigInt(2),
					aggregateCommit,
				);

				expect(valid).toBe(true);
			});

			it('validates if aggregateBFTWeight is equal or greater than provided lastCertificateThreshold', async () => {
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

				let valid = await chainConnectorPlugin.checkChainOfTrust(
					Buffer.from('0', 'hex'),
					blsKeyToBFTWeight,
					BigInt(2),
					aggregateCommit,
				);

				expect(valid).toBe(true);

				valid = await chainConnectorPlugin.checkChainOfTrust(
					Buffer.from('0', 'hex'),
					blsKeyToBFTWeight,
					BigInt(-1),
					aggregateCommit,
				);

				expect(valid).toBe(true);
			});

			it('invalidates if aggregateBFTWeight is less than provided lastCertificateThreshold', async () => {
				const valid = await chainConnectorPlugin.checkChainOfTrust(
					Buffer.from('0', 'hex'),
					blsKeyToBFTWeight,
					BigInt(2),
					aggregateCommit,
				);

				expect(valid).toBe(false);
			});
		});
	});
});
