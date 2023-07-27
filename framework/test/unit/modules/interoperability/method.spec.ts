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

import { utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { MainchainInteroperabilityModule, TokenMethod, ChannelData } from '../../../../src';
import { BaseInteroperabilityMethod } from '../../../../src/modules/interoperability/base_interoperability_method';
import {
	CCMStatusCode,
	CROSS_CHAIN_COMMAND_CHANNEL_TERMINATED,
	EMPTY_BYTES,
	EMPTY_FEE_ADDRESS,
	MAX_CCM_SIZE,
	MODULE_NAME_INTEROPERABILITY,
	MAX_RESERVED_ERROR_STATUS,
} from '../../../../src/modules/interoperability/constants';
import {
	CCMSentFailedCode,
	CcmSentFailedEvent,
} from '../../../../src/modules/interoperability/events/ccm_send_fail';
import { CcmSendSuccessEvent } from '../../../../src/modules/interoperability/events/ccm_send_success';
import { MainchainInteroperabilityInternalMethod } from '../../../../src/modules/interoperability/mainchain/internal_method';
import { ccmSchema } from '../../../../src/modules/interoperability/schemas';
import {
	ChainAccountStore,
	ChainStatus,
} from '../../../../src/modules/interoperability/stores/chain_account';
import { OwnChainAccountStore } from '../../../../src/modules/interoperability/stores/own_chain_account';
import { EventQueue, MethodContext } from '../../../../src/state_machine';
import { createTransientMethodContext } from '../../../../src/testing';
import { ChannelDataStore } from '../../../../src/modules/interoperability/stores/channel_data';
import { TerminatedStateStore } from '../../../../src/modules/interoperability/stores/terminated_state';
import { TerminatedOutboxStore } from '../../../../src/modules/interoperability/stores/terminated_outbox';
import { getMainchainID } from '../../../../src/modules/interoperability/utils';

class SampleInteroperabilityMethod extends BaseInteroperabilityMethod<MainchainInteroperabilityInternalMethod> {}

describe('Sample Method', () => {
	const interopMod = new MainchainInteroperabilityModule();
	const chainID = utils.intToBuffer(1, 4);
	const interoperableCCMethods = new Map();
	const chainAccountStoreMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
	};
	const channelDataStoreMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
	};
	const ownChainAccountStoreMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
		getOwnChainAccount: jest.fn(),
	};
	const terminatedStateAccountStoreMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
	};
	const terminatedOutboxAccountMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
	};
	let sampleInteroperabilityMethod: SampleInteroperabilityMethod;
	let methodContext: MethodContext;
	let tokenMethodMock: TokenMethod;
	let ccmSendFailEventMock: CcmSentFailedEvent;
	let ccmSendSuccessEventMock: CcmSendSuccessEvent;
	let sampleChannelData: ChannelData;

	beforeEach(() => {
		sampleChannelData = {
			minReturnFeePerByte: Buffer.from('10000000', 'hex'),
			messageFeeTokenID: {
				localID: Buffer.from('10000000', 'hex'),
			},
		} as any;
		const defaultEventQueue = new EventQueue(0, [], [utils.hash(utils.getRandomBytes(32))]);
		methodContext = createTransientMethodContext({ eventQueue: defaultEventQueue });
		tokenMethodMock = {
			payMessageFee: jest.fn(),
		} as any;
		ccmSendFailEventMock = {
			log: jest.fn(),
		} as any;
		ccmSendSuccessEventMock = {
			log: jest.fn(),
		} as any;
		interopMod.events.register(CcmSentFailedEvent, ccmSendFailEventMock);
		interopMod.events.register(CcmSendSuccessEvent, ccmSendSuccessEventMock);
		interopMod['internalMethod']['_tokenMethod'] = tokenMethodMock as any;
		sampleInteroperabilityMethod = new SampleInteroperabilityMethod(
			interopMod.stores,
			interopMod.events,
			interoperableCCMethods,
			interopMod['internalMethod'],
		);
		sampleInteroperabilityMethod.addDependencies(tokenMethodMock as any);

		interopMod.stores.register(ChainAccountStore, chainAccountStoreMock as never);
		interopMod.stores.register(ChannelDataStore, channelDataStoreMock as never);
		interopMod.stores.register(OwnChainAccountStore, ownChainAccountStoreMock as never);
		interopMod.stores.register(TerminatedStateStore, terminatedStateAccountStoreMock as never);
		interopMod.stores.register(TerminatedOutboxStore, terminatedOutboxAccountMock as never);
	});

	describe('getChainAccount', () => {
		it('should call getChainAccount', async () => {
			await sampleInteroperabilityMethod.getChainAccount(methodContext, chainID);

			expect(chainAccountStoreMock.get).toHaveBeenCalledWith(expect.anything(), chainID);
		});
	});

	describe('getChannel', () => {
		it('should call getChannel', async () => {
			await sampleInteroperabilityMethod.getChannel(methodContext, chainID);

			expect(channelDataStoreMock.get).toHaveBeenCalledWith(expect.anything(), chainID);
		});
	});

	describe('getOwnChainAccount', () => {
		it('should call getOwnChainAccount', async () => {
			await sampleInteroperabilityMethod.getOwnChainAccount(methodContext);

			expect(ownChainAccountStoreMock.get).toHaveBeenCalled();
		});
	});

	describe('getTerminatedStateAccount', () => {
		it('should call getTerminatedStateAccount', async () => {
			await sampleInteroperabilityMethod.getTerminatedStateAccount(methodContext, chainID);

			expect(terminatedStateAccountStoreMock.get).toHaveBeenCalled();
		});
	});

	describe('getTerminatedOutboxAccount', () => {
		it('should call getTerminatedStateAccount', async () => {
			await sampleInteroperabilityMethod.getTerminatedOutboxAccount(methodContext, chainID);

			expect(terminatedOutboxAccountMock.get).toHaveBeenCalledWith(expect.anything(), chainID);
		});
	});

	describe('send', () => {
		const sendingAddress = Buffer.from('lskqozpc4ftffaompmqwzd93dfj89g5uezqwhosg9');
		const ownChainAccountSidechain = {
			name: 'mychain',
			chainID: Buffer.from('10001000', 'hex'),
			nonce: BigInt(0),
		};

		const ownChainAccountMainchain = {
			name: 'mychain',
			chainID: getMainchainID(ownChainAccountSidechain.chainID),
			nonce: BigInt(0),
		};

		const ccm = {
			module: 'token',
			crossChainCommand: 'transfer',
			fee: BigInt(100000),
			nonce: ownChainAccountSidechain.nonce,
			params: utils.getRandomBytes(10),
			receivingChainID: Buffer.from('00000001', 'hex'),
			sendingChainID: ownChainAccountSidechain.chainID,
			status: CCMStatusCode.OK,
		};

		const getReceivingChainAccountByStatus = (code: number) => ({
			name: 'mychain',
			lastCertificate: {
				height: 0,
				timestamp: Date.now(),
				stateRoot: utils.getRandomBytes(32),
				validatorsHash: utils.getRandomBytes(32),
			},
			status: code,
		});

		beforeEach(() => {
			jest
				.spyOn(interopMod.stores.get(OwnChainAccountStore), 'get')
				.mockResolvedValue(ownChainAccountSidechain);
			jest.spyOn(interopMod['internalMethod'], 'isLive').mockResolvedValue(true);
		});

		it('should throw error and emit event when invalid ccm format', async () => {
			// Arrange
			const invalidSizeCCM = { ...ccm, params: utils.getRandomBytes(MAX_CCM_SIZE) };

			// Act & Assert
			await expect(
				sampleInteroperabilityMethod.send(
					methodContext,
					sendingAddress,
					invalidSizeCCM.module,
					invalidSizeCCM.crossChainCommand,
					invalidSizeCCM.receivingChainID,
					invalidSizeCCM.fee,
					invalidSizeCCM.params,
					Date.now(),
				),
			).rejects.toThrow('Invalid CCM format.');

			expect(ccmSendFailEventMock.log).toHaveBeenCalledWith(
				expect.anything(),
				{
					ccm: { ...invalidSizeCCM, params: EMPTY_BYTES },
					code: CCMSentFailedCode.INVALID_FORMAT,
				},
				true,
			);
		});

		it('should throw error when timestamp not provided in mainchain context', async () => {
			jest
				.spyOn(interopMod.stores.get(OwnChainAccountStore), 'get')
				.mockResolvedValue(ownChainAccountMainchain);

			await expect(
				sampleInteroperabilityMethod.send(
					methodContext,
					sendingAddress,
					ccm.module,
					ccm.crossChainCommand,
					ccm.receivingChainID,
					ccm.fee,
					ccm.params,
					ccm.status,
				),
			).rejects.toThrow('Timestamp must be provided in mainchain context.');
		});

		it('should throw error and emit event when receiving chain is not live', async () => {
			// Arrange
			jest
				.spyOn(interopMod.stores.get(OwnChainAccountStore), 'get')
				.mockResolvedValue(ownChainAccountSidechain);
			jest.spyOn(interopMod['internalMethod'], 'isLive').mockResolvedValue(false);

			// Act & Assert
			await expect(
				sampleInteroperabilityMethod.send(
					methodContext,
					sendingAddress,
					ccm.module,
					ccm.crossChainCommand,
					ccm.receivingChainID,
					ccm.fee,
					ccm.params,
					Date.now(),
				),
			).rejects.toThrow('Receiving chain is not live.');

			expect(ccmSendFailEventMock.log).toHaveBeenCalledWith(
				expect.anything(),
				{
					ccm: { ...ccm, params: EMPTY_BYTES },
					code: CCMSentFailedCode.CHANNEL_UNAVAILABLE,
				},
				true,
			);
		});

		it('should throw error when processing on mainchain and receiving chain is not active', async () => {
			// Arrange
			const ccmOnMainchain = {
				...ccm,
				nonce: ownChainAccountMainchain.nonce,
				sendingChainID: ownChainAccountMainchain.chainID,
			};

			const receivingChainAccount = getReceivingChainAccountByStatus(ChainStatus.TERMINATED);
			jest
				.spyOn(interopMod.stores.get(OwnChainAccountStore), 'get')
				.mockResolvedValue(ownChainAccountMainchain);
			jest
				.spyOn(interopMod.stores.get(ChainAccountStore), 'get')
				.mockResolvedValue(receivingChainAccount);
			// Act & Assert
			await expect(
				sampleInteroperabilityMethod.send(
					methodContext,
					sendingAddress,
					ccmOnMainchain.module,
					ccmOnMainchain.crossChainCommand,
					ccmOnMainchain.receivingChainID,
					ccmOnMainchain.fee,
					ccmOnMainchain.params,
					Date.now(),
				),
			).rejects.toThrow('Receiving chain is not active.');

			expect(ccmSendFailEventMock.log).toHaveBeenCalledWith(
				expect.anything(),
				{
					ccm: { ...ccmOnMainchain, params: EMPTY_BYTES },
					code: CCMSentFailedCode.CHANNEL_UNAVAILABLE,
				},
				true,
			);
		});

		it('should throw error when processing on sidechain and receiving chain is not active', async () => {
			// Arrange
			const receivingChainAccount = getReceivingChainAccountByStatus(ChainStatus.TERMINATED);

			jest
				.spyOn(interopMod.stores.get(OwnChainAccountStore), 'get')
				.mockResolvedValue(ownChainAccountSidechain);
			jest
				.spyOn(interopMod.stores.get(ChainAccountStore), 'get')
				.mockResolvedValue(receivingChainAccount);
			// Act & Assert
			await expect(
				sampleInteroperabilityMethod.send(
					methodContext,
					sendingAddress,
					ccm.module,
					ccm.crossChainCommand,
					ccm.receivingChainID,
					ccm.fee,
					ccm.params,
					Date.now(),
				),
			).rejects.toThrow('Receiving chain is not active.');

			expect(ccmSendFailEventMock.log).toHaveBeenCalledWith(
				expect.anything(),
				{
					ccm: { ...ccm, params: EMPTY_BYTES },
					code: CCMSentFailedCode.CHANNEL_UNAVAILABLE,
				},
				true,
			);
		});

		it('should throw error when payMessageFee and log event when tokenMethod.payMessageFee fails', async () => {
			// Arrange
			const receivingChainAccount = getReceivingChainAccountByStatus(ChainStatus.ACTIVE);

			jest
				.spyOn(interopMod.stores.get(OwnChainAccountStore), 'get')
				.mockResolvedValue(ownChainAccountSidechain);
			jest
				.spyOn(interopMod.stores.get(ChainAccountStore), 'get')
				.mockResolvedValue(receivingChainAccount);

			(tokenMethodMock as any).payMessageFee.mockRejectedValue(new Error('payMessageFee error'));
			// jest
			// 	.spyOn(tokenMethodMock, 'payMessageFee')
			// 	.mockRejectedValue(new Error('payMessageFee error'));
			// Act & Assert
			await expect(
				sampleInteroperabilityMethod.send(
					methodContext,
					sendingAddress,
					ccm.module,
					ccm.crossChainCommand,
					ccm.receivingChainID,
					ccm.fee,
					ccm.params,
					Date.now(),
				),
			).rejects.toThrow('Failed to pay message fee.');

			expect(ccmSendFailEventMock.log).toHaveBeenCalledWith(
				expect.anything(),
				{
					ccm: { ...ccm, params: EMPTY_BYTES },
					code: CCMSentFailedCode.MESSAGE_FEE_EXCEPTION,
				},
				true,
			);
		});

		it('should process ccm successfully by calling addToOutbox and log success event', async () => {
			// Arrange
			const ccmOnMainchain = {
				...ccm,
				nonce: ownChainAccountMainchain.nonce,
				sendingChainID: ownChainAccountMainchain.chainID,
			};

			const receivingChainAccount = getReceivingChainAccountByStatus(ChainStatus.ACTIVE);

			(tokenMethodMock as any).payMessageFee.mockResolvedValue();
			jest
				.spyOn(interopMod.stores.get(OwnChainAccountStore), 'get')
				.mockResolvedValue(ownChainAccountMainchain);
			jest.spyOn(interopMod['internalMethod'], 'addToOutbox').mockResolvedValue();
			jest
				.spyOn(interopMod.stores.get(ChainAccountStore), 'get')
				.mockResolvedValue(receivingChainAccount);

			interopMod.stores.get(OwnChainAccountStore).set = ownChainAccountStoreMock.set;
			const ccmID = utils.hash(codec.encode(ccmSchema, ccmOnMainchain));

			// Act & Assert
			await expect(
				sampleInteroperabilityMethod.send(
					methodContext,
					sendingAddress,
					ccmOnMainchain.module,
					ccmOnMainchain.crossChainCommand,
					ccmOnMainchain.receivingChainID,
					ccmOnMainchain.fee,
					ccmOnMainchain.params,
					Date.now(),
				),
			).resolves.toBeUndefined();

			expect(ownChainAccountStoreMock.set).toHaveBeenCalledWith(
				expect.anything(),
				EMPTY_BYTES,
				ownChainAccountMainchain,
			);
			expect(ccmSendSuccessEventMock.log).toHaveBeenCalledWith(
				expect.anything(),
				ccmOnMainchain.sendingChainID,
				ccmOnMainchain.receivingChainID,
				ccmID,
				{ ccm: ccmOnMainchain },
			);
		});
	});

	// both `getMessageFeeTokenID` & `getMinReturnFeePerByte` are covered here
	describe('_getChannelCommon', () => {
		const newChainID = Buffer.from('00000000', 'hex');
		beforeEach(() => {
			jest.spyOn(channelDataStoreMock, 'has').mockResolvedValue(true);
		});
		beforeEach(() => {
			jest.spyOn(channelDataStoreMock, 'get').mockResolvedValue(sampleChannelData);
			jest.spyOn(ownChainAccountStoreMock, 'get').mockResolvedValue({
				chainID: Buffer.from('01234567', 'hex'),
			});
		});

		it('should assign chainID as mainchain ID if ownchain ID is not mainchain ID and chainAccount not found', async () => {
			await sampleInteroperabilityMethod['_getChannelCommon'](methodContext, newChainID);
			expect(channelDataStoreMock.get).toHaveBeenCalledWith(
				expect.anything(),
				getMainchainID(newChainID),
			);
		});

		it('should process with input chainID', async () => {
			jest.spyOn(chainAccountStoreMock, 'has').mockResolvedValue(true);

			await sampleInteroperabilityMethod['_getChannelCommon'](methodContext, newChainID);
			expect(channelDataStoreMock.get).toHaveBeenCalledWith(expect.anything(), newChainID);
		});

		it('should throw error if channel is not found', async () => {
			jest.spyOn(channelDataStoreMock, 'has').mockResolvedValue(false);

			await expect(
				sampleInteroperabilityMethod['_getChannelCommon'](methodContext, newChainID),
			).rejects.toThrow('Channel does not exist.');
		});

		it('should return messageFeeTokenID', async () => {
			const messageFeeTokenID = await sampleInteroperabilityMethod['getMessageFeeTokenID'](
				methodContext,
				newChainID,
			);
			expect(messageFeeTokenID).toBe(sampleChannelData.messageFeeTokenID);
		});

		it('should return minReturnFeePerByte', async () => {
			const minReturnFeePerByte = await sampleInteroperabilityMethod['getMinReturnFeePerByte'](
				methodContext,
				newChainID,
			);
			expect(minReturnFeePerByte).toBe(sampleChannelData.minReturnFeePerByte);
		});
	});

	describe('error', () => {
		const errMsg = `Error codes from 0 to ${MAX_RESERVED_ERROR_STATUS} (inclusive) are reserved to the Interoperability module.`;

		it('should throw error for errorStatus 0', async () => {
			await expect(sampleInteroperabilityMethod.error(methodContext, {} as any, 0)).rejects.toThrow(
				errMsg,
			);
		});

		it(`should throw error for errorStatus < ${MAX_RESERVED_ERROR_STATUS}`, async () => {
			await expect(
				sampleInteroperabilityMethod.error(methodContext, {} as any, MAX_RESERVED_ERROR_STATUS - 1),
			).rejects.toThrow(errMsg);
		});

		it(`should throw error for errorStatus ${MAX_RESERVED_ERROR_STATUS}`, async () => {
			await expect(
				sampleInteroperabilityMethod.error(methodContext, {} as any, MAX_RESERVED_ERROR_STATUS),
			).rejects.toThrow(errMsg);
		});

		it(`should not throw error for errorStatus > ${MAX_RESERVED_ERROR_STATUS}`, async () => {
			jest.spyOn(sampleInteroperabilityMethod, 'send');
			try {
				await sampleInteroperabilityMethod.error(
					methodContext,
					{} as any,
					MAX_RESERVED_ERROR_STATUS + 1,
				);
			} catch (err) {
				expect(sampleInteroperabilityMethod.send).toHaveBeenCalled();
			}
		});
	});

	describe('terminateChain', () => {
		beforeEach(() => {
			interopMod['internalMethod'].sendInternal = jest.fn();
			interopMod['internalMethod'].createTerminatedStateAccount = jest.fn();
		});

		it('should do nothing if chain was already terminated', async () => {
			jest.spyOn(terminatedStateAccountStoreMock, 'has').mockResolvedValue(true);
			await sampleInteroperabilityMethod.terminateChain(methodContext, chainID);

			expect(interopMod['internalMethod'].sendInternal).not.toHaveBeenCalled();
		});

		it('should process with input chainID', async () => {
			jest.spyOn(terminatedStateAccountStoreMock, 'has').mockResolvedValue(false);

			await sampleInteroperabilityMethod.terminateChain(methodContext, chainID);

			expect(interopMod['internalMethod'].sendInternal).toHaveBeenCalledWith(
				methodContext,
				EMPTY_FEE_ADDRESS,
				MODULE_NAME_INTEROPERABILITY,
				CROSS_CHAIN_COMMAND_CHANNEL_TERMINATED,
				chainID,
				BigInt(0),
				CCMStatusCode.OK,
				EMPTY_BYTES,
			);
			expect(interopMod['internalMethod'].createTerminatedStateAccount).toHaveBeenCalledWith(
				methodContext,
				chainID,
			);
		});
	});
});
