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

import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { when } from 'jest-when';
import { MainchainInteroperabilityModule, testing } from '../../../../../src';
import { StoreGetter } from '../../../../../src/modules/base_store';
import {
	MAINCHAIN_ID,
	LIVENESS_LIMIT,
	MAX_CCM_SIZE,
	CCM_STATUS_OK,
	CHAIN_ACTIVE,
	CHAIN_REGISTERED,
	EMPTY_FEE_ADDRESS,
	MAINCHAIN_ID_BUFFER,
	MODULE_NAME_INTEROPERABILITY,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	CHAIN_TERMINATED,
	CCM_STATUS_CODE_FAILED_CCM,
	EVENT_NAME_CCM_PROCESSED,
	EVENT_NAME_CCM_SEND_SUCCESS,
	CCM_PROCESSED_RESULT_DISCARDED,
	CCM_PROCESSED_RESULT_BOUNCED,
	EMPTY_BYTES,
} from '../../../../../src/modules/interoperability/constants';
import { createCCMsgBeforeSendContext } from '../../../../../src/modules/interoperability/context';
import { CcmProcessedEvent } from '../../../../../src/modules/interoperability/events/ccm_processed';
import { CcmSendSuccessEvent } from '../../../../../src/modules/interoperability/events/ccm_send_success';
import { MainchainInteroperabilityInternalMethod } from '../../../../../src/modules/interoperability/mainchain/store';
import { ForwardCCMsgResult } from '../../../../../src/modules/interoperability/mainchain/types';
import { ccmSchema } from '../../../../../src/modules/interoperability/schemas';
import { ChainAccountStore } from '../../../../../src/modules/interoperability/stores/chain_account';
import { ChannelDataStore } from '../../../../../src/modules/interoperability/stores/channel_data';
import { OwnChainAccountStore } from '../../../../../src/modules/interoperability/stores/own_chain_account';
import {
	BeforeSendCCMsgMethodContext,
	CCMForwardContext,
	CCMsg,
	CCUpdateParams,
	SendInternalContext,
} from '../../../../../src/modules/interoperability/types';
import { NamedRegistry } from '../../../../../src/modules/named_registry';
import { MIN_RETURN_FEE } from '../../../../../src/modules/token/constants';
import { EventQueue } from '../../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { MethodContext } from '../../../../../src/state_machine/types';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { loggerMock } from '../../../../../src/testing/mocks';
import { createStoreGetter } from '../../../../../src/testing/utils';

describe('Mainchain interoperability internal method', () => {
	const interopMod = new MainchainInteroperabilityModule();
	const ownChainAccountStoreMock = {
		get: jest.fn(),
		set: jest.fn(),
	};
	const chainID = Buffer.from(MAINCHAIN_ID.toString(16), 'hex');
	const timestamp = 2592000 * 100;
	let chainAccount: any;
	let ownChainAccount: any;
	let stateStore: PrefixedStateReadWriter;
	let mainchainInteroperabilityInternalMethod: MainchainInteroperabilityInternalMethod;
	let chainDataSubstore: ChainAccountStore;
	let channelDataSubstore: ChannelDataStore;

	let context: StoreGetter;

	beforeEach(() => {
		chainAccount = {
			name: 'account1',
			lastCertificate: {
				height: 567467,
				timestamp: timestamp - 500000,
				stateRoot: Buffer.alloc(0),
				validatorsHash: Buffer.alloc(0),
			},
			status: 2739,
		};

		ownChainAccount = {
			name: 'mainchain',
			chainID: MAINCHAIN_ID_BUFFER,
			nonce: BigInt('0'),
		};

		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		context = createStoreGetter(stateStore);

		channelDataSubstore = interopMod.stores.get(ChannelDataStore);
		chainDataSubstore = interopMod.stores.get(ChainAccountStore);
		interopMod.stores.register(OwnChainAccountStore, ownChainAccountStoreMock as never);
		mainchainInteroperabilityInternalMethod = new MainchainInteroperabilityInternalMethod(
			interopMod.stores,
			interopMod.events,
			context,
			new Map(),
		);
	});

	describe('bounce', () => {
		const ccm = {
			nonce: BigInt(0),
			module: MODULE_NAME_INTEROPERABILITY,
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
			sendingChainID: utils.intToBuffer(2, 4),
			receivingChainID: utils.intToBuffer(3, 4),
			fee: BigInt(100000),
			status: CCM_STATUS_OK,
			params: Buffer.alloc(0),
		};

		const newCCM = {
			...ccm,
			sendingChainID: ccm.receivingChainID,
			receivingChainID: ccm.sendingChainID,
		};

		const ccmBounceContext = {
			ccm,
			newCCMStatus: CCM_STATUS_OK,
			ccmProcessedEventCode: 0,
			eventQueue: new EventQueue(0),
		};

		const ccmID = utils.hash(codec.encode(ccmSchema, ccm));
		const minimumFee = MIN_RETURN_FEE * BigInt(ccmID.length);
		let ccmProcessedEvent: CcmProcessedEvent;
		let ccmSendSuccessEvent: CcmSendSuccessEvent;

		beforeEach(() => {
			ccmProcessedEvent = mainchainInteroperabilityInternalMethod.events.get(CcmProcessedEvent);
			ccmSendSuccessEvent = mainchainInteroperabilityInternalMethod.events.get(CcmSendSuccessEvent);
			jest.spyOn(ccmProcessedEvent, 'log');
			jest.spyOn(ccmSendSuccessEvent, 'log');
			mainchainInteroperabilityInternalMethod.addToOutbox = jest.fn();
		});

		it(`should not call addToOutbox if ccm status is not equal to ${CCM_STATUS_OK}`, async () => {
			// Act
			await mainchainInteroperabilityInternalMethod.bounce({
				...ccmBounceContext,
				ccm: { ...ccm, status: CCM_STATUS_CODE_FAILED_CCM },
			});

			expect(mainchainInteroperabilityInternalMethod.addToOutbox).not.toHaveBeenCalled();
		});

		it(`should call addToOutbox with new CCM with zero fee if newCCMStatus === ${CCM_STATUS_CODE_FAILED_CCM}`, async () => {
			// Act
			await mainchainInteroperabilityInternalMethod.bounce({
				...ccmBounceContext,
				newCCMStatus: CCM_STATUS_CODE_FAILED_CCM,
			});

			expect(mainchainInteroperabilityInternalMethod.addToOutbox).toHaveBeenCalledWith(
				newCCM.receivingChainID,
				{
					...newCCM,
					fee: BigInt(0),
					status: CCM_STATUS_CODE_FAILED_CCM,
				},
			);
		});

		it(`should call addToOutbox with new CCM with fee minus ${minimumFee} if newCCMStatus !== ${CCM_STATUS_CODE_FAILED_CCM}`, async () => {
			// Act
			await mainchainInteroperabilityInternalMethod.bounce(ccmBounceContext);

			expect(mainchainInteroperabilityInternalMethod.addToOutbox).toHaveBeenCalledWith(
				newCCM.receivingChainID,
				{
					...newCCM,
					status: CCM_STATUS_OK,
					fee: (newCCM.fee -= minimumFee),
				},
			);
		});

		it(`should emit ${EVENT_NAME_CCM_PROCESSED} event if ccm status is ${CCM_STATUS_OK} and ccm fee is >= ${minimumFee}`, async () => {
			// Act
			await mainchainInteroperabilityInternalMethod.bounce(ccmBounceContext);

			expect(ccmProcessedEvent.log).toHaveBeenCalled();
		});

		it(`should emit ${EVENT_NAME_CCM_SEND_SUCCESS} event if ccm status is ${CCM_STATUS_OK} and ccm fee is >= ${minimumFee}`, async () => {
			// Act
			await mainchainInteroperabilityInternalMethod.bounce(ccmBounceContext);

			expect(ccmSendSuccessEvent.log).toHaveBeenCalled();
		});

		it(`should emit ${EVENT_NAME_CCM_PROCESSED} event with if ccm status is not ${CCM_STATUS_OK}`, async () => {
			// Arrange
			const ccmWithChangedStatus = {
				...ccm,
				status: CCM_PROCESSED_RESULT_BOUNCED,
			};
			const newCCMID = utils.hash(codec.encode(ccmSchema, ccmWithChangedStatus));

			// Act
			await mainchainInteroperabilityInternalMethod.bounce({
				...ccmBounceContext,
				ccm: ccmWithChangedStatus,
			});

			expect(ccmProcessedEvent.log).toHaveBeenCalledWith(
				{ eventQueue: ccmBounceContext.eventQueue },
				ccm.sendingChainID,
				ccm.receivingChainID,
				{
					ccmID: newCCMID,
					result: CCM_PROCESSED_RESULT_DISCARDED,
					code: ccmBounceContext.ccmProcessedEventCode,
				},
			);
		});
	});

	describe('isLive', () => {
		beforeEach(async () => {
			when(ownChainAccountStoreMock.get as never)
				.calledWith(expect.anything(), EMPTY_BYTES)
				.mockResolvedValue(ownChainAccount as never);
		});

		it('should return true if chainID equals ownChainAccount id', async () => {
			const isLive = await mainchainInteroperabilityInternalMethod.isLive(
				ownChainAccount.chainID,
				timestamp,
			);

			expect(isLive).toBe(true);
		});

		it('should return false if ownChainAccount id does not equal mainchain ID', async () => {
			when(ownChainAccountStoreMock.get as never)
				.calledWith(expect.anything(), EMPTY_BYTES)
				.mockResolvedValue({
					...ownChainAccount,
					chainID: utils.getRandomBytes(32),
				} as never);

			const isLive = await mainchainInteroperabilityInternalMethod.isLive(chainID, timestamp);

			expect(isLive).toBe(false);
		});

		it(`should return false if chain account exists and status is ${CHAIN_TERMINATED}`, async () => {
			await chainDataSubstore.set(context, chainID, { ...chainAccount, status: CHAIN_TERMINATED });
			const isLive = await mainchainInteroperabilityInternalMethod.isLive(chainID, timestamp);

			expect(isLive).toBe(false);
		});

		it(`should return false if chain account exists & status is ${CHAIN_ACTIVE} & liveness requirement is not satisfied`, async () => {
			chainAccount.lastCertificate.timestamp = timestamp - LIVENESS_LIMIT - 1;
			await chainDataSubstore.set(context, chainID, { ...chainAccount, status: CHAIN_ACTIVE });

			const isLive = await mainchainInteroperabilityInternalMethod.isLive(chainID, timestamp);

			expect(isLive).toBe(false);
		});

		it('should return true if chain account does not exist', async () => {
			const isLive = await mainchainInteroperabilityInternalMethod.isLive(
				utils.getRandomBytes(32),
				timestamp,
			);

			expect(isLive).toBe(true);
		});
	});

	describe('sendInternal', () => {
		const ccMethodMod1 = {
			beforeSendCCM: jest.fn(),
		};
		const ccMethodMod2 = {
			beforeSendCCM: jest.fn(),
		};

		const modsMap = new Map();
		modsMap.set('cc1', ccMethodMod1);
		modsMap.set('cc2', ccMethodMod2);

		const ccm = {
			nonce: BigInt(0),
			module: MODULE_NAME_INTEROPERABILITY,
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
			sendingChainID: utils.intToBuffer(2, 4),
			receivingChainID: utils.intToBuffer(3, 4),
			fee: BigInt(1),
			status: 1,
			params: Buffer.alloc(0),
		};

		const randomOutboxRoot = utils.getRandomBytes(32);
		const channelData = {
			inbox: {
				appendPath: [],
				size: 0,
				root: utils.getRandomBytes(32),
			},
			outbox: {
				appendPath: [],
				size: 1,
				root: randomOutboxRoot,
			},
			partnerChainOutboxRoot: Buffer.alloc(0),
			messageFeeTokenID: Buffer.from('0000000000000011', 'hex'),
		};

		const activeChainAccount = {
			name: 'account1',
			networkID: Buffer.alloc(0),
			lastCertificate: {
				height: 567467,
				timestamp: timestamp - 500000,
				stateRoot: Buffer.alloc(0),
				validatorsHash: Buffer.alloc(0),
			},
			status: 1,
		};

		const beforeSendCCMContext = testing.createBeforeSendCCMsgMethodContext({
			ccm,
			feeAddress: utils.getRandomBytes(32),
		});

		const sendInternalContext: SendInternalContext = {
			...beforeSendCCMContext,
			...ccm,
			timestamp,
		};

		it('should return false if the receiving chain does not exist', async () => {
			await expect(
				mainchainInteroperabilityInternalMethod.sendInternal(sendInternalContext),
			).resolves.toEqual(false);
		});

		it('should return false if the receiving chain is not live', async () => {
			jest.spyOn(mainchainInteroperabilityInternalMethod, 'isLive').mockResolvedValue(false);
			await chainDataSubstore.set(context, ccm.receivingChainID, chainAccount);

			await expect(
				mainchainInteroperabilityInternalMethod.sendInternal(sendInternalContext),
			).resolves.toEqual(false);
			expect(mainchainInteroperabilityInternalMethod.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return false if the receiving chain is not active', async () => {
			jest.spyOn(mainchainInteroperabilityInternalMethod, 'isLive').mockResolvedValue(false);
			await chainDataSubstore.set(context, ccm.receivingChainID, chainAccount);

			await expect(
				mainchainInteroperabilityInternalMethod.sendInternal(sendInternalContext),
			).resolves.toEqual(false);
			expect(mainchainInteroperabilityInternalMethod.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return false if the created ccm is of invalid size', async () => {
			const invalidCCM = {
				nonce: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
				sendingChainID: utils.intToBuffer(2, 4),
				receivingChainID: utils.intToBuffer(3, 4),
				fee: BigInt(1),
				status: 1,
				params: Buffer.alloc(MAX_CCM_SIZE), // invalid size
			};

			const beforeSendCCMContextLocal = testing.createBeforeSendCCMsgMethodContext({
				ccm: invalidCCM,
				feeAddress: utils.getRandomBytes(32),
			});

			const sendInternalContextLocal: SendInternalContext = {
				...beforeSendCCMContextLocal,
				...invalidCCM,
				timestamp,
			};

			jest.spyOn(mainchainInteroperabilityInternalMethod, 'isLive');
			await chainDataSubstore.set(context, ccm.receivingChainID, activeChainAccount);

			when(ownChainAccountStoreMock.get as never)
				.calledWith()
				.mockResolvedValue(ownChainAccount as never);

			await expect(
				mainchainInteroperabilityInternalMethod.sendInternal(sendInternalContextLocal),
			).resolves.toEqual(false);
			expect(mainchainInteroperabilityInternalMethod.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return false if the ccm created is invalid schema', async () => {
			const invalidCCM = {
				nonce: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
				sendingChainID: utils.intToBuffer(2, 4),
				receivingChainID: utils.intToBuffer(3, 4),
				fee: BigInt(1),
				status: 'ccm', // invalid field
				params: Buffer.alloc(0),
			};

			const beforeSendCCMContextLocal = testing.createBeforeSendCCMsgMethodContext({
				ccm: invalidCCM as any,
				feeAddress: utils.getRandomBytes(32),
			});

			const sendInternalContextLocal = {
				beforeSendContext: beforeSendCCMContextLocal,
				...invalidCCM,
				timestamp,
			};

			jest.spyOn(mainchainInteroperabilityInternalMethod, 'isLive');
			await chainDataSubstore.set(context, ccm.receivingChainID, activeChainAccount);
			when(ownChainAccountStoreMock.get as never)
				.calledWith()
				.mockResolvedValue(ownChainAccount as never);

			await expect(
				mainchainInteroperabilityInternalMethod.sendInternal(sendInternalContextLocal as any),
			).resolves.toEqual(false);
			expect(mainchainInteroperabilityInternalMethod.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return true and call each module beforeSendCCM crossChainMethod', async () => {
			const mainchainInteropStoreLocal = new MainchainInteroperabilityInternalMethod(
				interopMod.stores,
				new NamedRegistry(),
				context,
				modsMap,
			);

			jest.spyOn(mainchainInteropStoreLocal, 'isLive');
			await chainDataSubstore.set(context, ccm.receivingChainID, activeChainAccount);

			when(interopMod.stores.get(OwnChainAccountStore).get as never)
				.calledWith()
				.mockResolvedValue(ownChainAccount as never);

			await channelDataSubstore.set(context, ccm.receivingChainID, channelData);
			jest.spyOn(mainchainInteropStoreLocal, 'appendToOutboxTree').mockResolvedValue({} as never);

			await expect(mainchainInteropStoreLocal.sendInternal(sendInternalContext)).resolves.toEqual(
				true,
			);
			expect(mainchainInteropStoreLocal.isLive).toHaveBeenCalledTimes(1);
			expect(mainchainInteropStoreLocal.appendToOutboxTree).toHaveBeenCalledTimes(1);
			expect(ccMethodMod1.beforeSendCCM).toHaveBeenCalledTimes(1);
			expect(ccMethodMod2.beforeSendCCM).toHaveBeenCalledTimes(1);
		});
	});

	// TODO: To be updated in issue #7623
	describe.skip('forward', () => {
		let tokenCCMethod: any;
		let forwardContext: CCMForwardContext;
		let receivingChainAccount: any;
		let ccm: CCMsg;
		let methodContext: MethodContext;
		let receivingChainIDAsStoreKey: Buffer;
		let beforeCCMSendContext: BeforeSendCCMsgMethodContext;

		beforeEach(() => {
			tokenCCMethod = {
				forwardMessageFee: jest.fn(),
			};

			const interoperableModuleMethods = new Map();
			interoperableModuleMethods.set('token', tokenCCMethod);

			mainchainInteroperabilityInternalMethod = new MainchainInteroperabilityInternalMethod(
				interopMod.stores,
				new NamedRegistry(),
				context,
				interoperableModuleMethods,
			);

			receivingChainAccount = {
				name: 'receivingAccount1',
				networkID: utils.getRandomBytes(32),
				lastCertificate: {
					height: 567467,
					timestamp: timestamp - 500000,
					stateRoot: Buffer.alloc(0),
					validatorsHash: Buffer.alloc(0),
				},
				status: 2739,
			};

			ccm = {
				nonce: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
				sendingChainID: utils.intToBuffer(2, 4),
				receivingChainID: utils.intToBuffer(3, 4),
				fee: BigInt(1),
				status: CCM_STATUS_OK,
				params: Buffer.alloc(0),
			};

			receivingChainIDAsStoreKey = ccm.receivingChainID;

			const ccu: CCUpdateParams = {
				activeValidatorsUpdate: [],
				certificate: Buffer.alloc(0),
				inboxUpdate: {
					crossChainMessages: [],
					messageWitnessHashes: [],
					outboxRootWitness: {
						bitmap: Buffer.alloc(0),
						siblingHashes: [],
					},
				},
				newCertificateThreshold: BigInt(1),
				sendingChainID: utils.intToBuffer(2, 4),
			};

			forwardContext = {
				ccm,
				ccu,
				eventQueue: new EventQueue(0),
				feeAddress: Buffer.alloc(0),
				getMethodContext: jest.fn(() => methodContext),
				getStore: jest.fn(),
				logger: loggerMock,
				chainID: Buffer.alloc(0),
			};

			beforeCCMSendContext = createCCMsgBeforeSendContext({
				ccm,
				eventQueue: forwardContext.eventQueue,
				getMethodContext: forwardContext.getMethodContext,
				logger: forwardContext.logger,
				chainID: forwardContext.chainID,
				getStore: forwardContext.getStore,
				feeAddress: EMPTY_FEE_ADDRESS,
			});

			jest.spyOn(mainchainInteroperabilityInternalMethod, 'isLive').mockImplementation();
			jest.spyOn(mainchainInteroperabilityInternalMethod, 'bounce').mockImplementation();
			jest.spyOn(mainchainInteroperabilityInternalMethod, 'sendInternal').mockImplementation();
			interopMod.stores.get(ChainAccountStore).get = jest
				.fn()
				.mockResolvedValue(receivingChainAccount);
			jest.spyOn(mainchainInteroperabilityInternalMethod, 'addToOutbox').mockImplementation();
			jest
				.spyOn(mainchainInteroperabilityInternalMethod, 'terminateChainInternal')
				.mockImplementation();
		});

		it('should successfully forward CCM', async () => {
			receivingChainAccount.status = CHAIN_ACTIVE;
			jest.spyOn(mainchainInteroperabilityInternalMethod, 'isLive').mockResolvedValue(true);
			jest.spyOn(tokenCCMethod, 'forwardMessageFee').mockResolvedValue(true);

			const result = await mainchainInteroperabilityInternalMethod.forward(forwardContext);
			expect(tokenCCMethod.forwardMessageFee).toHaveBeenCalledWith(methodContext, ccm);
			expect(mainchainInteroperabilityInternalMethod.addToOutbox).toHaveBeenCalledWith(
				receivingChainIDAsStoreKey,
				ccm,
			);
			expect(result).toBe(ForwardCCMsgResult.SUCCESS);
		});

		it('should bounce and inform terminated sidechain when sidechain is not active', async () => {
			const result = await mainchainInteroperabilityInternalMethod.forward(forwardContext);
			expect(mainchainInteroperabilityInternalMethod.bounce).toHaveBeenCalledWith(ccm);
			expect(mainchainInteroperabilityInternalMethod.sendInternal).toHaveBeenCalled();
			expect(result).toBe(ForwardCCMsgResult.INFORM_SIDECHAIN_TERMINATION);
		});

		it('should throw when tokenCCMethod is not present', async () => {
			mainchainInteroperabilityInternalMethod['interoperableModuleMethods'].delete('token');
			await expect(mainchainInteroperabilityInternalMethod.forward(forwardContext)).rejects.toThrow(
				'TokenCCMethod does not exist',
			);
		});

		it('should return early when ccm status is not OK', async () => {
			(ccm as any).status = -1;
			await expect(mainchainInteroperabilityInternalMethod.forward(forwardContext)).resolves.toBe(
				ForwardCCMsgResult.INVALID_CCM,
			);
		});

		it('should return early when receiving chain does not exist after bounce', async () => {
			receivingChainAccount.status = CHAIN_REGISTERED;
			const result = await mainchainInteroperabilityInternalMethod.forward(forwardContext);
			expect(mainchainInteroperabilityInternalMethod.bounce).toHaveBeenCalledWith(ccm);
			expect(result).toBe(ForwardCCMsgResult.INACTIVE_RECEIVING_CHAIN);
		});

		it('should return early when receiving chain is not yet active after bounce', async () => {
			receivingChainAccount.status = CHAIN_REGISTERED;
			const result = await mainchainInteroperabilityInternalMethod.forward(forwardContext);
			expect(mainchainInteroperabilityInternalMethod.bounce).toHaveBeenCalledWith(ccm);
			expect(result).toBe(ForwardCCMsgResult.INACTIVE_RECEIVING_CHAIN);
		});

		it('should terminate receiving chain when it is active and ccm is bounced', async () => {
			receivingChainAccount.status = CHAIN_ACTIVE;
			await mainchainInteroperabilityInternalMethod.forward(forwardContext);
			expect(mainchainInteroperabilityInternalMethod.bounce).toHaveBeenCalledWith(ccm);
			expect(mainchainInteroperabilityInternalMethod.terminateChainInternal).toHaveBeenCalledWith(
				ccm.receivingChainID,
				beforeCCMSendContext,
			);
		});
	});
});
