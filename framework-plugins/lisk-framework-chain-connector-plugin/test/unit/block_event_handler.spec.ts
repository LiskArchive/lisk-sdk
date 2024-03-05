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
	ChainAccount,
	LastCertificate,
	MAX_CCM_SIZE,
	MODULE_NAME_INTEROPERABILITY,
	ccmSchema,
	codec,
	cryptography,
	testing,
} from 'lisk-sdk';
import { BlockEventHandler } from '../../src/block_event_handler';
import { Logger } from '../../src/types';
import { CCM_SEND_SUCCESS } from '../../src/constants';
import { getSampleCCM } from '../utils/sampleCCM';

describe('BlockEventHandler', () => {
	// Constants
	const ownChainIDStr = '04000000';
	const ownChainIDBuf = Buffer.from(ownChainIDStr, 'hex');
	const receivingChainIDStr = '04000001';
	const receivingChainIDBuf = Buffer.from(receivingChainIDStr, 'hex');
	const defaultLastSentCCM = {
		crossChainCommand: '',
		fee: BigInt(1000),
		height: 1,
		module: 'token',
		nonce: BigInt(1),
		outboxSize: 1,
		params: Buffer.alloc(2),
		receivingChainID: receivingChainIDBuf,
		sendingChainID: ownChainIDBuf,
		status: 0,
	};

	const apiClientMocks = (): any => ({
		connect: jest.fn(),
		disconnect: jest.fn(),
		subscribe: jest.fn(),
		postTransaction: jest.fn(),
		getTransactionByID: jest.fn(),
		getAuthAccountNonceFromPublicKey: jest.fn(),
		getNodeInfo: jest.fn(),
		getChannelAccount: jest.fn(),
		getChainAccount: jest.fn(),
		hasUserTokenAccount: jest.fn(),
		getTokenInitializationFee: jest.fn(),
		getBFTHeights: jest.fn(),
		getEvents: jest.fn(),
		getMetadataByModuleName: jest.fn(),
		getInclusionProof: jest.fn(),
		getSavedInclusionProofAtHeight: jest.fn(),
		getBFTParametersAtHeight: jest.fn(),
	});

	// Mocks
	let ccuHandlerMock: any;
	let receivingChainAPIClientMock: any;
	let sendingChainAPIClientMock: any;
	let chainConnectorDBMock: any;

	let blockEventHandlerConfig: any;
	let initArgs: any;
	let blockEventHandler: BlockEventHandler;

	beforeEach(() => {
		blockEventHandlerConfig = {
			registrationHeight: 10,
			ownChainID: ownChainIDBuf,
			receivingChainID: receivingChainIDBuf,
			maxCCUSize: MAX_CCM_SIZE,
			ccuFee: '100000',
			isSaveCCU: false,
			ccuSaveLimit: 300,
		};

		receivingChainAPIClientMock = apiClientMocks();
		sendingChainAPIClientMock = apiClientMocks();

		chainConnectorDBMock = {
			getListOfCCUs: jest.fn(),
			saveToDBOnNewBlock: jest.fn(),
			getBlockHeaderByHeight: jest.fn(),
			deleteBlockHeadersBetweenHeight: jest.fn(),
			deleteBlockHeaderByHeight: jest.fn(),
			getAggregateCommitByHeight: jest.fn(),
			deleteAggregateCommitsBetweenHeight: jest.fn(),
			deleteAggregateCommitByHeight: jest.fn(),
			getValidatorsDataByHash: jest.fn(),
			setValidatorsDataByHash: jest.fn(),
			getValidatorsDataByHeight: jest.fn(),
			deleteValidatorsHashByHeight: jest.fn(),
			deleteValidatorsHashBetweenHeights: jest.fn(),
			deleteValidatorsDataByHash: jest.fn(),
			getCCMsByHeight: jest.fn(),
			getCCMsBetweenHeights: jest.fn(),
			deleteCCMsBetweenHeight: jest.fn(),
			deleteCCMsByHeight: jest.fn(),
			setCCMsByHeight: jest.fn(),
			getLastSentCCM: jest.fn(),
			setLastSentCCM: jest.fn(),
			setCCUTransaction: jest.fn(),
			deleteCCUTransaction: jest.fn(),
			setPrivateKey: jest.fn(),
			deletePrivateKey: jest.fn(),
		};

		initArgs = {
			logger: testing.mocks.loggerMock,
			db: chainConnectorDBMock,
			sendingChainAPIClient: sendingChainAPIClientMock,
			receivingChainAPIClient: receivingChainAPIClientMock,
		};

		ccuHandlerMock = {
			load: jest.fn(),
			computeCCU: jest.fn(),
			submitCCU: jest.fn(),
		};

		blockEventHandler = new BlockEventHandler(blockEventHandlerConfig);

		(blockEventHandler as any)['_db'] = chainConnectorDBMock;
		(blockEventHandler as any)['_ccuHandler'] = ccuHandlerMock;
		(blockEventHandler as any)['_sendingChainAPIClient'] = sendingChainAPIClientMock;
		(blockEventHandler as any)['_receivingChainAPIClient'] = receivingChainAPIClientMock;
		jest
			.spyOn(blockEventHandler['_sendingChainAPIClient'], 'getMetadataByModuleName')
			.mockResolvedValue({
				stores: [],
				events: [],
				name: 'interoperability',
			});
		jest.spyOn(blockEventHandler['_ccuHandler'], 'load').mockReturnValue();
		jest.spyOn(blockEventHandler['_receivingChainAPIClient'], 'connect').mockResolvedValue();
		jest.spyOn(blockEventHandler['_db'], 'getLastSentCCM').mockResolvedValue(defaultLastSentCCM);
		jest.spyOn(blockEventHandler['_sendingChainAPIClient'], 'subscribe').mockReturnValue();
	});

	describe('load', () => {
		beforeEach(async () => {
			jest.spyOn(blockEventHandler as any, '_initializeReceivingChainClient');
			await blockEventHandler.load(initArgs);
		});

		it('Should call getMetadataByModuleName on _sendingChainAPIClient', () => {
			expect(
				blockEventHandler['_sendingChainAPIClient'].getMetadataByModuleName,
			).toHaveBeenCalledTimes(1);
		});

		it('Should call ccu handler load function', () => {
			expect(blockEventHandler['_ccuHandler'].load).toHaveBeenCalledTimes(1);
		});

		it('Should call connect on _receivingChainAPIClient', () => {
			expect(blockEventHandler['_receivingChainAPIClient'].connect).toHaveBeenCalledTimes(2);
		});

		it('Should call getLastSentCCM on db', () => {
			expect(blockEventHandler['_db'].getLastSentCCM).toHaveBeenCalledTimes(1);
		});

		it('Should call connect on receivingChainAPIClient', () => {
			expect(blockEventHandler['_receivingChainAPIClient'].connect).toHaveBeenCalledTimes(2);
		});

		it('Should subscribe to chain_newBlock event on _sendingChainAPIClient', () => {
			expect(blockEventHandler['_sendingChainAPIClient'].subscribe).toHaveBeenCalledWith(
				'chain_newBlock',
				expect.anything(),
			);
		});

		it('Should subscribe to newchain_deleteBlockBlock event on _sendingChainAPIClient', () => {
			expect(blockEventHandler['_sendingChainAPIClient'].subscribe).toHaveBeenCalledWith(
				'chain_deleteBlock',
				expect.anything(),
			);
		});

		it('Should call _initializeReceivingChainClient', () => {
			expect(blockEventHandler['_initializeReceivingChainClient']).toHaveBeenCalledTimes(1);
		});
	});

	describe('_handleNewBlock', () => {
		const saveOnNewBlockMock = jest.fn();
		const sidechainLastCertificate: LastCertificate = {
			height: 1,
			stateRoot: cryptography.utils.hash(Buffer.alloc(2)),
			timestamp: Math.floor(Date.now() / 1000),
			validatorsHash: cryptography.utils.hash(Buffer.alloc(2)),
		};
		const sidechainChainAccount: ChainAccount = {
			lastCertificate: sidechainLastCertificate,
			name: 'sidechain1',
			status: 1,
		};

		let sampleBlockHeader: Record<string, unknown>;

		beforeEach(async () => {
			blockEventHandler['_saveOnNewBlock'] = saveOnNewBlockMock;
			sampleBlockHeader = testing.createFakeBlockHeader({ height: 100 }).toJSON();
			sampleBlockHeader.generatorAddress = 'lskoaknq582o6fw7sp82bm2hnj7pzp47mpmbmux2g';
			jest.spyOn(blockEventHandler as any, '_initializeReceivingChainClient');
			await blockEventHandler.load(initArgs);
		});

		afterAll(() => {
			clearTimeout(blockEventHandler['_sentCCUTxTimeout']);
		});

		it('should log error and return when _saveOnNewBlock fails', async () => {
			const fakeError = new Error('Error occurred while save on new block');
			saveOnNewBlockMock.mockRejectedValue(fakeError);
			jest.spyOn(initArgs.logger as Logger, 'error');

			await blockEventHandler['_handleNewBlock']({ blockHeader: sampleBlockHeader });

			expect((initArgs.logger as Logger).error).toHaveBeenCalledWith(
				{ err: fakeError },
				'Error occurred while saving data on new block.',
			);
		});

		it('should return after getNodeInfo when the node is syncing', async () => {
			saveOnNewBlockMock.mockResolvedValue({});
			sendingChainAPIClientMock.getNodeInfo.mockResolvedValue({ syncing: true });
			jest.spyOn(initArgs.logger as Logger, 'debug');

			await blockEventHandler['_handleNewBlock']({ blockHeader: sampleBlockHeader });

			expect((initArgs.logger as Logger).debug).toHaveBeenCalledWith(
				'No CCU generation is possible as the node is syncing.',
			);
			expect(receivingChainAPIClientMock.getChainAccount).not.toHaveBeenCalled();
		});

		it('should log error and call _initializeReceivingChainClient when getChainAccount call fails', async () => {
			const fakeError = new Error('Error occurred while accessing _receivingChainAPIClient');
			saveOnNewBlockMock.mockResolvedValue({});
			receivingChainAPIClientMock.getChainAccount.mockRejectedValue(fakeError);
			sendingChainAPIClientMock.getNodeInfo.mockResolvedValue({ syncing: false });
			jest.spyOn(initArgs.logger as Logger, 'error');

			await blockEventHandler['_handleNewBlock']({ blockHeader: sampleBlockHeader });

			expect((initArgs.logger as Logger).error).toHaveBeenCalledWith(
				{ err: fakeError },
				'Error occurred while accessing receivingChainAPIClient but all data is saved on new block.',
			);
			expect(blockEventHandler['_initializeReceivingChainClient']).toHaveBeenCalled();
		});

		it('should log message and return when chainAccount does not exists', async () => {
			saveOnNewBlockMock.mockResolvedValue({});
			receivingChainAPIClientMock.getChainAccount.mockResolvedValue(undefined);
			sendingChainAPIClientMock.getNodeInfo.mockResolvedValue({ syncing: false });
			jest.spyOn(initArgs.logger as Logger, 'info');

			await blockEventHandler['_handleNewBlock']({ blockHeader: sampleBlockHeader });
			expect((initArgs.logger as Logger).info).toHaveBeenCalledWith(
				'Sending chain is not registered to the receiving chain yet and has no chain data.',
			);
		});

		it('should log message and return when ccuFrequency is not reached', async () => {
			saveOnNewBlockMock.mockResolvedValue({});
			receivingChainAPIClientMock.getChainAccount.mockResolvedValue(sidechainChainAccount);
			sendingChainAPIClientMock.getNodeInfo.mockResolvedValue({ syncing: false });
			jest.spyOn(initArgs.logger as Logger, 'debug');
			(blockEventHandler as any)['_ccuFrequency'] = 100;

			await blockEventHandler['_handleNewBlock']({ blockHeader: sampleBlockHeader });
			expect((initArgs.logger as Logger).debug).toHaveBeenCalledWith(
				`Last certificate value has been set with height ${sidechainLastCertificate.height}`,
			);
			expect((initArgs.logger as Logger).debug).toHaveBeenCalledWith(
				{
					ccuFrequency: 100,
					nextPossibleCCUHeight:
						100 - ((sampleBlockHeader as any).height - sidechainLastCertificate.height),
				},
				'No attempt to create CCU either due to provided ccuFrequency',
			);
		});

		it('should log message and return when receiving chain is not registered yet', async () => {
			saveOnNewBlockMock.mockResolvedValue({});
			receivingChainAPIClientMock.getChainAccount.mockResolvedValue(sidechainChainAccount);
			sendingChainAPIClientMock.getChainAccount.mockResolvedValue(undefined);
			sendingChainAPIClientMock.getNodeInfo.mockResolvedValue({ syncing: false });
			jest.spyOn(initArgs.logger as Logger, 'info');
			blockEventHandler['_isReceivingChainRegistered'] = false;

			await blockEventHandler['_handleNewBlock']({ blockHeader: sampleBlockHeader });
			expect((initArgs.logger as Logger).info).toHaveBeenCalledWith(
				'Receiving chain is not registered on the sending chain yet and has no chain data.',
			);
		});

		it('should log message and return when last CCU sent was not included on the receiving chain', async () => {
			const lastSentCCUTxID = 'txid';
			saveOnNewBlockMock.mockResolvedValue({});
			receivingChainAPIClientMock.getChainAccount.mockResolvedValue(sidechainChainAccount);
			sendingChainAPIClientMock.getNodeInfo.mockResolvedValue({ syncing: false });
			jest.spyOn(initArgs.logger as Logger, 'info');
			blockEventHandler['_isReceivingChainRegistered'] = true;
			blockEventHandler['_lastSentCCUTxID'] = lastSentCCUTxID;

			await blockEventHandler['_handleNewBlock']({ blockHeader: sampleBlockHeader });
			expect((initArgs.logger as Logger).info).toHaveBeenCalledWith(
				`Still pending CCU on the receiving CCU with tx ID ${lastSentCCUTxID}`,
			);
		});

		it('should log error and return when computeCCU fails', async () => {
			const lastSentCCUTxID = '';
			const fakeError = new Error('Failed at computeCCU');
			saveOnNewBlockMock.mockResolvedValue({});
			receivingChainAPIClientMock.getChainAccount.mockResolvedValue(sidechainChainAccount);
			sendingChainAPIClientMock.getNodeInfo.mockResolvedValue({ syncing: false });
			jest.spyOn(initArgs.logger as Logger, 'error');
			jest.spyOn(blockEventHandler['_ccuHandler'], 'computeCCU').mockRejectedValue(fakeError);
			blockEventHandler['_isReceivingChainRegistered'] = true;
			blockEventHandler['_lastSentCCUTxID'] = lastSentCCUTxID;

			await blockEventHandler['_handleNewBlock']({ blockHeader: sampleBlockHeader });

			expect((initArgs.logger as Logger).error).toHaveBeenCalledWith(
				{ err: fakeError },
				`Error occurred while computing CCU for the blockHeader at height: ${
					sampleBlockHeader.height as number
				}`,
			);
		});
		it('should log error when submitCCU fails', async () => {
			const lastSentCCUTxID = '';
			const fakeError = new Error('Failed at computeCCU');
			saveOnNewBlockMock.mockResolvedValue({});
			receivingChainAPIClientMock.getChainAccount.mockResolvedValue(sidechainChainAccount);
			sendingChainAPIClientMock.getNodeInfo.mockResolvedValue({ syncing: false });
			jest.spyOn(initArgs.logger as Logger, 'error');
			jest.spyOn(blockEventHandler['_ccuHandler'], 'computeCCU').mockResolvedValue({
				ccuParams: {} as any,
				lastCCMToBeSent: {} as any,
			});
			jest.spyOn(blockEventHandler['_ccuHandler'], 'submitCCU').mockRejectedValue(fakeError);

			blockEventHandler['_isReceivingChainRegistered'] = true;
			blockEventHandler['_lastSentCCUTxID'] = lastSentCCUTxID;

			await blockEventHandler['_handleNewBlock']({ blockHeader: sampleBlockHeader });

			expect((initArgs.logger as Logger).error).toHaveBeenCalledWith(
				{ err: fakeError },
				`Error occured while submitting CCU for the blockHeader at height: ${
					sampleBlockHeader.height as number
				}`,
			);
		});
		it('should log message when submitCCU returns undefined', async () => {
			const lastSentCCUTxID = '';
			saveOnNewBlockMock.mockResolvedValue({});
			receivingChainAPIClientMock.getChainAccount.mockResolvedValue(sidechainChainAccount);
			sendingChainAPIClientMock.getNodeInfo.mockResolvedValue({ syncing: false });
			jest.spyOn(initArgs.logger as Logger, 'debug');
			jest.spyOn(blockEventHandler['_ccuHandler'], 'computeCCU').mockResolvedValue({
				ccuParams: {} as any,
				lastCCMToBeSent: {} as any,
			});
			jest.spyOn(blockEventHandler['_ccuHandler'], 'submitCCU').mockResolvedValue(undefined);

			blockEventHandler['_isReceivingChainRegistered'] = true;
			blockEventHandler['_lastSentCCUTxID'] = lastSentCCUTxID;

			await blockEventHandler['_handleNewBlock']({ blockHeader: sampleBlockHeader });

			expect((initArgs.logger as Logger).debug).toHaveBeenCalledWith(
				`Last sent CCU tx with ID ${lastSentCCUTxID} was not yet included in the receiving chain.`,
			);
		});

		it('should set _lastSentCCM and _lastSentCCUTxID when submitCCU is successful', async () => {
			const lastSentCCUTxID = '';
			saveOnNewBlockMock.mockResolvedValue({});
			receivingChainAPIClientMock.getChainAccount.mockResolvedValue(sidechainChainAccount);
			sendingChainAPIClientMock.getNodeInfo.mockResolvedValue({ syncing: false });
			jest.spyOn(initArgs.logger as Logger, 'debug');
			jest.spyOn(blockEventHandler['_ccuHandler'], 'computeCCU').mockResolvedValue({
				ccuParams: {} as any,
				lastCCMToBeSent: {} as any,
			});
			jest.spyOn(blockEventHandler['_ccuHandler'], 'submitCCU').mockResolvedValue('txID');

			blockEventHandler['_isReceivingChainRegistered'] = true;
			blockEventHandler['_lastSentCCUTxID'] = lastSentCCUTxID;

			await blockEventHandler['_handleNewBlock']({ blockHeader: sampleBlockHeader });
			expect(blockEventHandler['_lastSentCCUTxID']).toBe('txID');
			expect(blockEventHandler['_lastSentCCM']).toEqual({});
		});
	});

	describe('_saveOnNewBlock', () => {
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
		const sampleValidatorsData = {
			validators: [],
			precommitThreshold: BigInt(1),
			prevoteThreshold: BigInt(1),
			validatorsHash: cryptography.utils.hash(Buffer.alloc(2)),
			certificateThreshold: BigInt(1),
		};

		let sampleBlockHeader: any;

		beforeEach(async () => {
			jest.spyOn(blockEventHandler['_db'], 'saveToDBOnNewBlock');
			jest.spyOn(blockEventHandler['_db'], 'setCCMsByHeight');
			jest
				.spyOn(blockEventHandler['_sendingChainAPIClient'], 'getBFTParametersAtHeight')
				.mockResolvedValue(sampleValidatorsData);
			jest.spyOn(blockEventHandler['_db'], 'setValidatorsDataByHash');
			sampleBlockHeader = testing.createFakeBlockHeader({ height: 100 }).toObject();
			jest.spyOn(blockEventHandler as any, '_initializeReceivingChainClient');

			await blockEventHandler.load(initArgs);
			blockEventHandler['_interoperabilityMetadata'] = {
				stores: [
					{
						key: '1',
						data: ccmSchema,
					},
				],
				events: [
					{
						name: CCM_SEND_SUCCESS,
						data: ccmSendSuccessDataSchema,
					},
				],
				name: MODULE_NAME_INTEROPERABILITY,
			};
		});

		it('should set empty CCMs by height and validators data at the block height', async () => {
			jest.spyOn(blockEventHandler['_sendingChainAPIClient'], 'getEvents').mockResolvedValue([]);
			await blockEventHandler['_saveOnNewBlock'](sampleBlockHeader);
			expect(blockEventHandler['_db'].saveToDBOnNewBlock).toHaveBeenCalledWith(sampleBlockHeader);
			expect(blockEventHandler['_db'].setCCMsByHeight).toHaveBeenCalledWith(
				[],
				sampleBlockHeader.height as number,
			);
			expect(blockEventHandler['_sendingChainAPIClient'].getEvents).toHaveBeenCalledWith(
				sampleBlockHeader.height as number,
			);
			expect(
				blockEventHandler['_sendingChainAPIClient'].getBFTParametersAtHeight,
			).toHaveBeenCalledWith(sampleBlockHeader.height as number);
			expect(blockEventHandler['_db'].setValidatorsDataByHash).toHaveBeenCalledWith(
				sampleValidatorsData.validatorsHash,
				{ ...sampleValidatorsData, height: sampleBlockHeader.height },
				sampleBlockHeader.height as number,
			);
		});

		it('should set CCMs from events by height and validators data at the block height', async () => {
			const ccm = getSampleCCM();

			jest.spyOn(blockEventHandler['_sendingChainAPIClient'], 'getEvents').mockResolvedValue([
				{
					data: codec.encode(ccmSendSuccessDataSchema, { ccm }).toString('hex'),
					height: sampleBlockHeader.height,
					index: 1,
					module: MODULE_NAME_INTEROPERABILITY,
					name: CCM_SEND_SUCCESS,
					topics: [],
				},
			]);

			(blockEventHandler as any)['_isReceivingChainMainchain'] = true;
			await blockEventHandler['_saveOnNewBlock'](sampleBlockHeader);

			expect(blockEventHandler['_db'].saveToDBOnNewBlock).toHaveBeenCalledWith(sampleBlockHeader);
			expect(blockEventHandler['_db'].setCCMsByHeight).toHaveBeenCalledWith(
				[{ ...ccm, height: sampleBlockHeader.height as number }],
				sampleBlockHeader.height as number,
			);
			expect(blockEventHandler['_sendingChainAPIClient'].getEvents).toHaveBeenCalledWith(
				sampleBlockHeader.height as number,
			);
			expect(
				blockEventHandler['_sendingChainAPIClient'].getBFTParametersAtHeight,
			).toHaveBeenCalledWith(sampleBlockHeader.height as number);
			expect(blockEventHandler['_db'].setValidatorsDataByHash).toHaveBeenCalledWith(
				sampleValidatorsData.validatorsHash,
				{ ...sampleValidatorsData, height: sampleBlockHeader.height },
				sampleBlockHeader.height as number,
			);
		});
	});

	describe('_initializeReceivingChainClient', () => {
		beforeEach(async () => {
			await blockEventHandler.load(initArgs);
		});

		it('should throw error if connect fails on _receivingChainAPIClient', async () => {
			const fakeError = new Error('Unable to connect');
			jest
				.spyOn(blockEventHandler['_receivingChainAPIClient'], 'connect')
				.mockRejectedValue(fakeError);
			jest.spyOn(initArgs.logger as Logger, 'error');

			await blockEventHandler['_initializeReceivingChainClient']();

			expect(blockEventHandler['_receivingChainAPIClient'].connect).toHaveBeenCalled();
			expect((initArgs.logger as Logger).error).toHaveBeenCalledWith(
				fakeError,
				'Not able to connect to receivingChainAPIClient. Trying again on next new block.',
			);
		});

		it('should call connect on _receivingChainAPIClient and subscribe', async () => {
			jest.spyOn(blockEventHandler['_receivingChainAPIClient'], 'connect').mockResolvedValue();
			jest.spyOn(blockEventHandler['_receivingChainAPIClient'], 'subscribe');

			await blockEventHandler['_initializeReceivingChainClient']();

			expect(blockEventHandler['_receivingChainAPIClient'].connect).toHaveBeenCalled();
			expect(blockEventHandler['_receivingChainAPIClient'].subscribe).toHaveBeenCalled();
		});
	});

	describe('_newBlockReceivingChainHandler', () => {
		const sidechainLastCertificate: LastCertificate = {
			height: 1,
			stateRoot: cryptography.utils.hash(Buffer.alloc(2)),
			timestamp: Math.floor(Date.now() / 1000),
			validatorsHash: cryptography.utils.hash(Buffer.alloc(2)),
		};
		const sidechainChainAccount: ChainAccount = {
			lastCertificate: sidechainLastCertificate,
			name: 'sidechain1',
			status: 1,
		};

		beforeEach(async () => {
			jest.spyOn(blockEventHandler as any, '_initializeReceivingChainClient');
			await blockEventHandler.load(initArgs);
		});

		it('Should return if the receiving chain is syncing', async () => {
			jest
				.spyOn(blockEventHandler['_receivingChainAPIClient'], 'getNodeInfo')
				.mockResolvedValue({ syncing: true, finalizedHeight: 1 } as any);
			jest.spyOn(initArgs.logger as Logger, 'debug');
			await blockEventHandler['_newBlockReceivingChainHandler']();

			expect((initArgs.logger as Logger).debug).toHaveBeenCalledWith('Receiving chain is syncing.');
		});

		it('Should throw error if no channel data available on receiving chain', async () => {
			jest
				.spyOn(blockEventHandler['_receivingChainAPIClient'], 'getNodeInfo')
				.mockResolvedValue({ syncing: false, finalizedHeight: 1 } as any);
			jest
				.spyOn(blockEventHandler['_receivingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue(undefined);
			jest.spyOn(initArgs.logger as Logger, 'debug');

			await blockEventHandler['_newBlockReceivingChainHandler']();

			expect((initArgs.logger as Logger).debug).toHaveBeenCalledWith(
				new Error('No channel data available on receiving chain.'),
				'Error occured while receiving block from receiving chain.',
			);
		});

		it('Should throw error if no chain data available on receiving chain', async () => {
			jest
				.spyOn(blockEventHandler['_receivingChainAPIClient'], 'getNodeInfo')
				.mockResolvedValue({ syncing: false, finalizedHeight: 1 } as any);
			jest
				.spyOn(blockEventHandler['_receivingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue({ inbox: { size: 1 } } as any);
			jest
				.spyOn(blockEventHandler['_receivingChainAPIClient'], 'getChainAccount')
				.mockResolvedValue(undefined);
			jest.spyOn(initArgs.logger as Logger, 'debug');

			await blockEventHandler['_newBlockReceivingChainHandler']();

			expect((initArgs.logger as Logger).debug).toHaveBeenCalledWith(
				new Error('No chain data available on receiving chain.'),
				'Error occured while receiving block from receiving chain.',
			);
		});

		it('Should throw if failed to get transaction by id on receiving chain', async () => {
			jest
				.spyOn(blockEventHandler['_receivingChainAPIClient'], 'getNodeInfo')
				.mockResolvedValue({ syncing: false, finalizedHeight: 1 } as any);
			jest
				.spyOn(blockEventHandler['_receivingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue({ inbox: { size: 1 } } as any);
			jest
				.spyOn(blockEventHandler['_receivingChainAPIClient'], 'getChainAccount')
				.mockResolvedValue(sidechainChainAccount);
			jest
				.spyOn(blockEventHandler['_receivingChainAPIClient'], 'getTransactionByID')
				.mockRejectedValue('Failed to get transaction by ID');
			jest.spyOn(initArgs.logger as Logger, 'debug');
			blockEventHandler['_lastSentCCUTxID'] = 'txID';
			await blockEventHandler['_newBlockReceivingChainHandler']();

			expect((initArgs.logger as Logger).debug).toHaveBeenCalledWith(
				new Error(`Failed to get transaction with ID ${blockEventHandler['_lastSentCCUTxID']}`),
				'Error occured while receiving block from receiving chain.',
			);
		});

		it('Should set _lastSentCCM, _lastSentCCUTxID and call cleanup if last tx was included on receiving chain', async () => {
			jest
				.spyOn(blockEventHandler['_receivingChainAPIClient'], 'getNodeInfo')
				.mockResolvedValue({ syncing: false, finalizedHeight: 1 } as any);
			jest
				.spyOn(blockEventHandler['_receivingChainAPIClient'], 'getChannelAccount')
				.mockResolvedValue({ inbox: { size: 1 } } as any);
			jest
				.spyOn(blockEventHandler['_receivingChainAPIClient'], 'getChainAccount')
				.mockResolvedValue(sidechainChainAccount);
			jest
				.spyOn(blockEventHandler['_receivingChainAPIClient'], 'getTransactionByID')
				.mockResolvedValue({} as never);
			jest.spyOn(blockEventHandler as any, '_cleanup');

			blockEventHandler['_lastSentCCUTxID'] = 'txID';
			await blockEventHandler['_newBlockReceivingChainHandler']();

			expect(blockEventHandler['_cleanup']).toHaveBeenCalled();
		});
	});

	describe('_cleanup', () => {
		beforeEach(async () => {
			jest.spyOn(blockEventHandler as any, '_initializeReceivingChainClient');
			jest.spyOn(blockEventHandler['_db'], 'getListOfCCUs').mockResolvedValue({
				list: [
					{
						id: '133',
					},
					{
						id: '123',
					},
				],
				total: 2,
			});
			jest.spyOn(blockEventHandler['_db'], 'deleteCCUTransaction');
			jest.spyOn(blockEventHandler['_db'], 'deleteCCMsBetweenHeight');
			jest.spyOn(blockEventHandler['_db'], 'deleteBlockHeadersBetweenHeight');
			jest.spyOn(blockEventHandler['_db'], 'deleteAggregateCommitsBetweenHeight');
			jest.spyOn(blockEventHandler['_db'], 'deleteValidatorsHashBetweenHeights');
			jest.spyOn(initArgs.logger as Logger, 'debug');
			await blockEventHandler.load(initArgs);
		});

		it('Should delete CCUs if ccuSaveLimit is not equal to -1', async () => {
			(blockEventHandler as any)['_ccuSaveLimit'] = 1;
			(blockEventHandler as any)['_lastCertificate'] = {
				height: 1,
				stateRoot: cryptography.utils.hash(Buffer.alloc(2)),
				timestamp: Math.floor(Date.now() / 1000),
				validatorsHash: cryptography.utils.hash(Buffer.alloc(2)),
			};
			await blockEventHandler['_cleanup']();
			expect(blockEventHandler['_db'].deleteCCUTransaction).toHaveBeenCalled();
			expect(blockEventHandler['_db'].deleteCCMsBetweenHeight).toHaveBeenCalled();
			expect(blockEventHandler['_db'].deleteBlockHeadersBetweenHeight).toHaveBeenCalled();
			expect(blockEventHandler['_db'].deleteAggregateCommitsBetweenHeight).toHaveBeenCalled();
			expect(blockEventHandler['_db'].deleteValidatorsHashBetweenHeights).toHaveBeenCalled();
			expect((initArgs.logger as Logger).debug).toHaveBeenCalled();
		});

		it('Should delete if there is a info at finalized height', async () => {
			(blockEventHandler as any)['_ccuSaveLimit'] = 1;
			blockEventHandler['_receivingChainFinalizedHeight'] = 2;
			const lastDeletionHeight = 1;
			blockEventHandler['_lastDeletionHeight'] = lastDeletionHeight;
			const finalizedInfoAtHeight = { lastCertificateHeight: 5, inboxSize: 1 };
			blockEventHandler['_heightToDeleteIndex'].set(
				blockEventHandler['_receivingChainFinalizedHeight'],
				finalizedInfoAtHeight,
			);
			(blockEventHandler as any)['_lastCertificate'] = {
				height: 1,
				stateRoot: cryptography.utils.hash(Buffer.alloc(2)),
				timestamp: Math.floor(Date.now() / 1000),
				validatorsHash: cryptography.utils.hash(Buffer.alloc(2)),
			};
			await blockEventHandler['_cleanup']();
			expect(blockEventHandler['_db'].deleteCCUTransaction).toHaveBeenCalled();
			expect(blockEventHandler['_db'].deleteCCMsBetweenHeight).toHaveBeenCalledWith(
				lastDeletionHeight,
				finalizedInfoAtHeight.lastCertificateHeight - 1,
			);
			expect(blockEventHandler['_db'].deleteBlockHeadersBetweenHeight).toHaveBeenCalledWith(
				lastDeletionHeight,
				finalizedInfoAtHeight.lastCertificateHeight - 1,
			);
			expect(blockEventHandler['_db'].deleteAggregateCommitsBetweenHeight).toHaveBeenCalledWith(
				lastDeletionHeight,
				finalizedInfoAtHeight.lastCertificateHeight - 1,
			);
			expect(blockEventHandler['_db'].deleteValidatorsHashBetweenHeights).toHaveBeenCalledWith(
				lastDeletionHeight,
				finalizedInfoAtHeight.lastCertificateHeight - 1,
			);
			expect((initArgs.logger as Logger).debug).toHaveBeenCalled();
		});

		it('Should not delete if last certificate height is zero', async () => {
			(blockEventHandler as any)['_ccuSaveLimit'] = 1;
			(blockEventHandler as any)['_lastCertificate'] = {
				height: 0,
				stateRoot: cryptography.utils.hash(Buffer.alloc(2)),
				timestamp: Math.floor(Date.now() / 1000),
				validatorsHash: cryptography.utils.hash(Buffer.alloc(2)),
			};
			await blockEventHandler['_cleanup']();
			expect(blockEventHandler['_db'].deleteCCUTransaction).toHaveBeenCalled();
			expect(blockEventHandler['_db'].deleteCCMsBetweenHeight).not.toHaveBeenCalled();
			expect(blockEventHandler['_db'].deleteBlockHeadersBetweenHeight).not.toHaveBeenCalled();
			expect(blockEventHandler['_db'].deleteAggregateCommitsBetweenHeight).not.toHaveBeenCalled();
			expect(blockEventHandler['_db'].deleteValidatorsHashBetweenHeights).not.toHaveBeenCalled();
			expect((initArgs.logger as Logger).debug).not.toHaveBeenCalled();
		});
	});

	describe('_deleteBlockHandler', () => {
		let sampleBlockHeader: Record<string, unknown>;

		beforeEach(async () => {
			sampleBlockHeader = testing.createFakeBlockHeader({ height: 100 }).toJSON();
			sampleBlockHeader.generatorAddress = 'lskoaknq582o6fw7sp82bm2hnj7pzp47mpmbmux2g';
			jest.spyOn(blockEventHandler as any, '_initializeReceivingChainClient');
			jest.spyOn(blockEventHandler['_db'], 'deleteCCMsByHeight');
			jest.spyOn(blockEventHandler['_db'], 'deleteBlockHeaderByHeight');
			jest.spyOn(blockEventHandler['_db'], 'deleteAggregateCommitByHeight');
			jest.spyOn(blockEventHandler['_db'], 'deleteValidatorsHashByHeight');

			await blockEventHandler.load(initArgs);
		});

		it('Should delete all the data associated with the deleted block', async () => {
			await blockEventHandler['_deleteBlockHandler']({ blockHeader: sampleBlockHeader });

			expect(blockEventHandler['_db'].deleteCCMsByHeight).toHaveBeenCalledWith(
				sampleBlockHeader.height,
			);
			expect(blockEventHandler['_db'].deleteBlockHeaderByHeight).toHaveBeenCalledWith(
				sampleBlockHeader.height,
			);
			expect(blockEventHandler['_db'].deleteAggregateCommitByHeight).toHaveBeenCalledWith(
				sampleBlockHeader.height,
			);
			expect(blockEventHandler['_db'].deleteValidatorsHashByHeight).toHaveBeenCalledWith(
				sampleBlockHeader.height,
			);
		});
	});
});
