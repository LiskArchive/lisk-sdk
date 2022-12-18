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
	LIVENESS_LIMIT,
	ChainAccount,
	ChainStatus,
	codec,
	CCMsg,
	ccmSchema,
	db,
} from 'lisk-sdk';
import { when } from 'jest-when';
import {
	LIVENESS_BASED_CCU_FREQUENCY,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	MODULE_NAME_INTEROPERABILITY,
	CCM_SEND_SUCCESS,
} from '../../src/constants';
import * as plugins from '../../src/chain_connector_plugin';
import * as dbApi from '../../src/db';
import * as utils from '../../src/utils';
import { BlockHeader, CrossChainUpdateTransactionParams } from '../../src/types';

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

const apiClientMocks = {
	disconnect: jest.fn().mockResolvedValue({} as never),
	invoke: jest.fn(),
	subscribe: jest.fn().mockResolvedValue({} as never),
};
const ownChainID = Buffer.from('10000000', 'hex');

describe('ChainConnectorPlugin', () => {
	let chainConnectorPlugin: plugins.ChainConnectorPlugin;
	const sidechainAPIClientMock = {
		disconnect: jest.fn().mockResolvedValue({} as never),
		invoke: jest.fn(),
		subscribe: jest.fn(),
	};

	const chainConnectorInfoDBMock = {
		setBlockHeaders: jest.fn(),
		setAggregateCommits: jest.fn(),
		setCrossChainMessages: jest.fn(),
		setValidatorsHashPreImage: jest.fn(),
		getBlockHeaders: jest.fn(),
		getAggregateCommits: jest.fn(),
		getCrossChainMessages: jest.fn(),
		getValidatorsHashPreImage: jest.fn(),
	};
	beforeEach(() => {
		chainConnectorPlugin = new plugins.ChainConnectorPlugin();

		jest.spyOn(dbApi, 'getDBInstance').mockResolvedValue(new db.InMemoryDatabase() as never);
		(chainConnectorPlugin as any)['_sidechainChainConnectorDB'] = chainConnectorInfoDBMock;
	});

	afterEach(() => {
		jest.restoreAllMocks();
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
			expect(chainConnectorPlugin['_ccuFrequency']).toEqual(LIVENESS_BASED_CCU_FREQUENCY);
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
			expect(chainConnectorPlugin['_ccuFrequency']).toBe(300000);
		});
	});

	describe('load', () => {
		beforeEach(() => {
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
			(chainConnectorPlugin as any)['_mainchainAPIClient'] = apiClientMocks;
			(chainConnectorPlugin as any)['_sidechainAPIClient'] = apiClientMocks;
			await chainConnectorPlugin.unload();
		});

		it('should initialize api clients without sidechain', async () => {
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(apiClientMocks as never);
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
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(apiClientMocks as never);
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
			jest.spyOn(apiClient, 'createIPCClient').mockResolvedValue(apiClientMocks as never);
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
		beforeEach(() => {
			(chainConnectorPlugin as any)['_sidechainAPIClient'] = sidechainAPIClientMock;
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
			(chainConnectorPlugin as any)['_createCCU'] = jest.fn();
			(chainConnectorPlugin as any)['_cleanup'] = jest.fn();
		});

		afterEach(async () => {
			(chainConnectorPlugin as any)['_mainchainAPIClient'] = apiClientMocks;
			(chainConnectorPlugin as any)['_sidechainAPIClient'] = apiClientMocks;
			await chainConnectorPlugin.unload();
			jest.resetAllMocks();
		});

		it('should invoke "consensus_getBFTParameters" on _sidechainAPIClient', async () => {
			const block = await getTestBlock();
			when(chainConnectorPlugin['_sidechainChainConnectorDB'].getBlockHeaders)
				.calledWith()
				.mockResolvedValue([]);

			when(chainConnectorPlugin['_sidechainChainConnectorDB'].getAggregateCommits)
				.calledWith()
				.mockResolvedValue([]);

			when(chainConnectorPlugin['_sidechainChainConnectorDB'].getValidatorsHashPreImage)
				.calledWith()
				.mockResolvedValue([]);

			when(chainConnectorPlugin['_sidechainChainConnectorDB'].getCrossChainMessages)
				.calledWith()
				.mockResolvedValue([]);

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
			await (chainConnectorPlugin as any)['_newBlockHandler']({
				blockHeader: block.header.toJSON(),
			});

			expect(sidechainAPIClientMock.subscribe).toHaveBeenCalledTimes(1);
			expect(sidechainAPIClientMock.invoke).toHaveBeenCalledWith('consensus_getBFTParameters', {
				height: block.header.height,
			});
			expect((chainConnectorPlugin as any)['_createCCU']).toHaveBeenCalled();
			expect((chainConnectorPlugin as any)['_cleanup']).toHaveBeenCalled();
		});

		// eslint-disable-next-line jest/no-disabled-tests
		it.skip('should invoke "chain_getEvents" on _sidechainAPIClient', async () => {
			const block = await getTestBlock();
			const ccm: CCMsg = {
				nonce: BigInt(1),
				module: MODULE_NAME_INTEROPERABILITY,
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				sendingChainID: Buffer.from([0, 0, 0, 3]),
				receivingChainID: Buffer.from([0, 0, 0, 2]),
				fee: BigInt(0),
				status: 0,
				params: Buffer.alloc(2),
			};

			const someEvents = [
				new chain.Event({
					index: 1,
					module: MODULE_NAME_INTEROPERABILITY,
					topics: [cryptography.utils.getRandomBytes(32)],
					name: CCM_SEND_SUCCESS,
					height: 1,
					data: codec.encode(ccmSchema, { ...ccm, nonce: BigInt(1) } as CCMsg),
				}),
				new chain.Event({
					index: 2,
					module: MODULE_NAME_INTEROPERABILITY,
					topics: [cryptography.utils.getRandomBytes(32)],
					name: CCM_SEND_SUCCESS,
					height: 1,
					data: codec.encode(ccmSchema, { ...ccm, nonce: BigInt(2) } as CCMsg),
				}),
			];
			const eventsJson = someEvents.map(e => e.toJSON());

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
				.mockResolvedValue(eventsJson);

			await chainConnectorPlugin.init({
				logger: testing.mocks.loggerMock,
				config: { mainchainIPCPath: '~/.lisk/mainchain' },
				appConfig: appConfigForPlugin,
			});

			when(sidechainAPIClientMock.invoke)
				.calledWith('system_getMetadata')
				.mockResolvedValue({
					modules: [
						{
							name: 'interoperability',
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

			// expect((chainConnectorPlugin as any)['_createCCU']).toHaveBeenCalled();
			// expect((chainConnectorPlugin as any)['_cleanup']).toHaveBeenCalled();

			const savedCCMs = await chainConnectorPlugin[
				'_sidechainChainConnectorDB'
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

	describe('unload', () => {
		it.todo('should unload plugin');
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
			(chainConnectorPlugin as any)['_sidechainChainConnectorDB'] = chainConnectorInfoDBMock;

			chainConnectorPlugin['_lastCertificate'] = {
				height: 6,
				stateRoot: cryptography.utils.getRandomBytes(32),
				timestamp: Date.now(),
				validatorsHash: cryptography.utils.getRandomBytes(32),
			};
		});

		describe('deleteBlockHeaders', () => {
			let block1: BlockHeader;
			let block2: BlockHeader;
			beforeEach(() => {
				block1 = testing.createFakeBlockHeader({ height: 5 }).toObject();
				block2 = testing.createFakeBlockHeader({ height: 6 }).toObject();
				chainConnectorInfoDBMock.getBlockHeaders.mockResolvedValue([block1, block2] as never);
			});

			it('should delete block headers with height less than _lastCertifiedHeight', async () => {
				await chainConnectorPlugin['_deleteBlockHeaders']();

				expect(chainConnectorInfoDBMock.getBlockHeaders).toHaveBeenCalledTimes(1);

				expect(chainConnectorInfoDBMock.setBlockHeaders).toHaveBeenCalledWith([block2]);
			});
		});

		describe('deleteAggregateCommits', () => {
			beforeEach(() => {
				jest
					.spyOn(chainConnectorPlugin['_sidechainChainConnectorDB'], 'getAggregateCommits')
					.mockResolvedValue([
						{
							height: 5,
						},
					] as never);
			});

			it('should delete aggregate commits with height less than _lastCertifiedHeight', async () => {
				await chainConnectorPlugin['_deleteAggregateCommits']();

				expect(
					chainConnectorPlugin['_sidechainChainConnectorDB'].getAggregateCommits,
				).toHaveBeenCalledTimes(1);

				expect(
					chainConnectorPlugin['_sidechainChainConnectorDB'].setAggregateCommits,
				).toHaveBeenCalledWith([]);
			});
		});

		describe('deleteValidatorsHashPreimage', () => {
			beforeEach(() => {
				jest
					.spyOn(chainConnectorPlugin['_sidechainChainConnectorDB'], 'getValidatorsHashPreImage')
					.mockResolvedValue([
						{
							certificateThreshold: 5,
						},
					] as never);
			});

			it('should delete validatorsHashPreimage with certificate threshold less than _lastCertifiedHeight', async () => {
				await chainConnectorPlugin['_deleteValidatorsHashPreimage']();

				expect(
					chainConnectorPlugin['_sidechainChainConnectorDB'].getValidatorsHashPreImage,
				).toHaveBeenCalledTimes(1);

				expect(
					chainConnectorPlugin['_sidechainChainConnectorDB'].setValidatorsHashPreImage,
				).toHaveBeenCalledWith([]);
			});
		});
	});

	describe('_verifyLiveness', () => {
		beforeEach(() => {
			(chainConnectorPlugin as any)['_mainchainAPIClient'] = apiClientMocks;
			(chainConnectorPlugin as any)['_sidechainAPIClient'] = apiClientMocks;
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
				.spyOn(chainConnectorPlugin['_sidechainChainConnectorDB'], 'getValidatorsHashPreImage')
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
				.spyOn(chainConnectorPlugin['_sidechainChainConnectorDB'], 'getValidatorsHashPreImage')
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
			chainConnectorInfoDBMock.getCrossChainMessages.mockResolvedValue([
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
			jest
				.spyOn(chainConnectorPlugin['_sidechainChainConnectorDB'], 'getBlockHeaders')
				.mockResolvedValue([
					{
						height: 5,
						validatorsHash,
					},
					{
						height: 6,
						validatorsHash,
					},
				] as never);

			jest
				.spyOn(chainConnectorPlugin['_sidechainChainConnectorDB'], 'getValidatorsHashPreImage')
				.mockResolvedValue([
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
					.spyOn(chainConnectorPlugin['_sidechainChainConnectorDB'], 'getBlockHeaders')
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
					.spyOn(chainConnectorPlugin['_sidechainChainConnectorDB'], 'getValidatorsHashPreImage')
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
					.spyOn(chainConnectorPlugin['_sidechainChainConnectorDB'], 'getBlockHeaders')
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
					.spyOn(chainConnectorPlugin['_sidechainChainConnectorDB'], 'getValidatorsHashPreImage')
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
