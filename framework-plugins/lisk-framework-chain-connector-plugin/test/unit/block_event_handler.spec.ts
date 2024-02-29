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

import { MAX_CCM_SIZE, testing } from 'lisk-sdk';
import { BlockEventHandler } from '../../src/block_event_handler';

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

	const apiClientMocks = () => ({
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
			saveToDBOnNewBlock: jest.fn(),
			getBlockHeaderByHeight: jest.fn(),
			deleteBlockHeadersBetweenHeight: jest.fn(),
			getAggregateCommitByHeight: jest.fn(),
			deleteAggregateCommitsBetweenHeight: jest.fn(),
			getValidatorsDataByHash: jest.fn(),
			setValidatorsDataByHash: jest.fn(),
			getValidatorsDataByHeight: jest.fn(),
			deleteValidatorsHashByHeight: jest.fn(),
			deleteValidatorsHashBetweenHeights: jest.fn(),
			deleteValidatorsDataByHash: jest.fn(),
			getCCMsByHeight: jest.fn(),
			getCCMsBetweenHeights: jest.fn(),
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
	});

	describe('load', () => {
		beforeEach(async () => {
			(blockEventHandler as any)['_db'] = chainConnectorDBMock;
			(blockEventHandler as any)['_ccuHandler'] = ccuHandlerMock;
			(blockEventHandler as any)['_sendingChainAPIClient'] = sendingChainAPIClientMock;
			(blockEventHandler as any)['_receivingChainAPIClient'] = receivingChainAPIClientMock;
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
			jest.spyOn(blockEventHandler as any, '_initializeReceivingChainClient').mockResolvedValue({});
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
			expect(blockEventHandler['_receivingChainAPIClient'].connect).toHaveBeenCalledTimes(1);
		});

		it('Should call getLastSentCCM on db', () => {
			expect(blockEventHandler['_db'].getLastSentCCM).toHaveBeenCalledTimes(1);
		});

		it('Should call connect on receivingChainAPIClient', () => {
			expect(blockEventHandler['_receivingChainAPIClient'].connect).toHaveBeenCalledTimes(1);
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

	describe('handleNewBlock', () => {
		it.todo('should log error and return when _saveOnNewBlock fails');
		it.todo('should return after getNodeInfo when the node is syncing');
		it.todo(
			'should log error and call _initializeReceivingChainClient when getChainAccount call fails',
		);
		it.todo('should log message and return when chainAccount does not exists');
		it.todo('should log message and return when ccuFrequency is not reached');
		it.todo('should log message and return when receiving chain is not registered yet');
		it.todo(
			'should log message and return when last CCU sent was not included on the receiving chain',
		);
		it.todo('should log error and return when computeCCU fails');
		it.todo('should log error when submitCCU fails');
		it.todo('should log message submitCCU returns undefined');
		it.todo('should set _lastSentCCM and _lastSentCCUTxID when submitCCU is successfull');
	});

	describe('_saveOnNewBlock', () => {
		it.todo('should set empty CCMs by height and validators data at the block height');
		it.todo('should set CCMs from events by height and validators data at the block height');
	});

	describe('_initializeReceivingChainClient', () => {
		it.todo('should throw error if connect fails on _receivingChainAPIClient');
		it.todo('should call connect on _receivingChainAPIClient and subscribe');
	});

	describe('_newBlockReceivingChainHandler', () => {
		it.todo('Should return if the receiving chain is syncing');
		it.todo('Should throw error if no channel data available on receiving chain');
		it.todo('Should throw error if no chain data available on receiving chain');
		it.todo('Should throw if failed to get transaction by id on receiving chain');
		it.todo(
			'Should set _lastSentCCM, _lastSentCCUTxID and call cleanup if last tx was included on receiving chain',
		);
	});

	describe('_cleanup', () => {
		it.todo('Should delete CCUs if ccuSaveLimit is not equal to -1');
		it.todo('Should delete if there is a info at finalized height');
		it.todo('Should not delete if last certificate height is zero');
	});

	describe('_deleteBlockHandler', () => {
		it.todo('Should delete all the data associated with the deleted block');
	});
});
