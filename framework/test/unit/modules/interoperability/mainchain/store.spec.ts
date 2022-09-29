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
import { MainchainInteroperabilityModule, testing } from '../../../../../src';
import { StoreGetter } from '../../../../../src/modules/base_store';
import {
	CCM_STATUS_CHANNEL_UNAVAILABLE,
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
} from '../../../../../src/modules/interoperability/constants';
import { createCCMsgBeforeSendContext } from '../../../../../src/modules/interoperability/context';
import { MainchainInteroperabilityStore } from '../../../../../src/modules/interoperability/mainchain/store';
import { ForwardCCMsgResult } from '../../../../../src/modules/interoperability/mainchain/types';
import { ChainAccountStore } from '../../../../../src/modules/interoperability/stores/chain_account';
import { ChannelDataStore } from '../../../../../src/modules/interoperability/stores/channel_data';
import { TerminatedStateStore } from '../../../../../src/modules/interoperability/stores/terminated_state';
import {
	BeforeSendCCMsgMethodContext,
	CCMForwardContext,
	CCMsg,
	CCUpdateParams,
	SendInternalContext,
} from '../../../../../src/modules/interoperability/types';
import { EventQueue } from '../../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { MethodContext } from '../../../../../src/state_machine/types';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { loggerMock } from '../../../../../src/testing/mocks';
import { createStoreGetter } from '../../../../../src/testing/utils';

describe('Mainchain interoperability store', () => {
	const interopMod = new MainchainInteroperabilityModule();

	const chainID = Buffer.from(MAINCHAIN_ID.toString(16), 'hex');
	const timestamp = 2592000 * 100;
	let chainAccount: any;
	let ownChainAccount: any;
	let stateStore: PrefixedStateReadWriter;
	let mainchainInteroperabilityStore: MainchainInteroperabilityStore;
	let terminatedStateSubstore: TerminatedStateStore;
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
			id: MAINCHAIN_ID_BUFFER,
			nonce: BigInt('0'),
		};

		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		context = createStoreGetter(stateStore);

		channelDataSubstore = interopMod.stores.get(ChannelDataStore);
		chainDataSubstore = interopMod.stores.get(ChainAccountStore);
		terminatedStateSubstore = interopMod.stores.get(TerminatedStateStore);
		mainchainInteroperabilityStore = new MainchainInteroperabilityStore(
			interopMod.stores,
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
			fee: BigInt(1),
			status: 1,
			params: Buffer.alloc(0),
		};

		const newCCM = {
			...ccm,
			sendingChainID: ccm.receivingChainID,
			receivingChainID: ccm.sendingChainID,
			status: CCM_STATUS_CHANNEL_UNAVAILABLE,
		};

		beforeEach(() => {
			mainchainInteroperabilityStore.addToOutbox = jest.fn();
		});

		it('should not call addToOutbox if terminatedStateAccount exists', async () => {
			// Arrange
			await terminatedStateSubstore.set(context, ccm.sendingChainID, chainAccount);

			// Act
			await mainchainInteroperabilityStore.bounce(ccm);

			expect(mainchainInteroperabilityStore.addToOutbox).not.toHaveBeenCalled();
		});

		it('should call addToOutbox with new CCM if terminatedStateAccount does exist', async () => {
			// Act
			await mainchainInteroperabilityStore.bounce(ccm);

			expect(mainchainInteroperabilityStore.addToOutbox).toHaveBeenCalledWith(
				newCCM.receivingChainID,
				newCCM,
			);
		});
	});

	describe('isLive', () => {
		beforeEach(async () => {
			await mainchainInteroperabilityStore.setOwnChainAccount(ownChainAccount);
		});

		it('should return true if chainID equals ownChainAccount id', async () => {
			const isLive = await mainchainInteroperabilityStore.isLive(ownChainAccount.id, timestamp);

			expect(isLive).toBe(true);
		});

		it('should return false if ownChainAccount id does not equal mainchain ID', async () => {
			await mainchainInteroperabilityStore.setOwnChainAccount({
				...ownChainAccount,
				id: utils.getRandomBytes(32),
			});
			const isLive = await mainchainInteroperabilityStore.isLive(chainID, timestamp);

			expect(isLive).toBe(false);
		});

		it(`should return false if chain account exists and status is ${CHAIN_TERMINATED}`, async () => {
			await chainDataSubstore.set(context, chainID, { ...chainAccount, status: CHAIN_TERMINATED });
			const isLive = await mainchainInteroperabilityStore.isLive(chainID, timestamp);

			expect(isLive).toBe(false);
		});

		it(`should return false if chain account exists & status is ${CHAIN_ACTIVE} & liveness requirement is not satisfied`, async () => {
			chainAccount.lastCertificate.timestamp = timestamp - LIVENESS_LIMIT - 1;
			await chainDataSubstore.set(context, chainID, { ...chainAccount, status: CHAIN_ACTIVE });

			const isLive = await mainchainInteroperabilityStore.isLive(chainID, timestamp);

			expect(isLive).toBe(false);
		});

		it('should return true if chain account does not exist', async () => {
			const isLive = await mainchainInteroperabilityStore.isLive(
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
			messageFeeTokenID: {
				chainID: utils.intToBuffer(1, 4),
				localID: utils.intToBuffer(2, 4),
			},
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
				mainchainInteroperabilityStore.sendInternal(sendInternalContext),
			).resolves.toEqual(false);
		});

		it('should return false if the receiving chain is not live', async () => {
			jest.spyOn(mainchainInteroperabilityStore, 'isLive').mockResolvedValue(false);
			await chainDataSubstore.set(context, ccm.receivingChainID, chainAccount);

			await expect(
				mainchainInteroperabilityStore.sendInternal(sendInternalContext),
			).resolves.toEqual(false);
			expect(mainchainInteroperabilityStore.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return false if the receiving chain is not active', async () => {
			jest.spyOn(mainchainInteroperabilityStore, 'isLive').mockResolvedValue(false);
			await chainDataSubstore.set(context, ccm.receivingChainID, chainAccount);

			await expect(
				mainchainInteroperabilityStore.sendInternal(sendInternalContext),
			).resolves.toEqual(false);
			expect(mainchainInteroperabilityStore.isLive).toHaveBeenCalledTimes(1);
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

			jest.spyOn(mainchainInteroperabilityStore, 'isLive');
			await chainDataSubstore.set(context, ccm.receivingChainID, activeChainAccount);
			await mainchainInteroperabilityStore.setOwnChainAccount(ownChainAccount);

			await expect(
				mainchainInteroperabilityStore.sendInternal(sendInternalContextLocal),
			).resolves.toEqual(false);
			expect(mainchainInteroperabilityStore.isLive).toHaveBeenCalledTimes(1);
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

			jest.spyOn(mainchainInteroperabilityStore, 'isLive');
			await chainDataSubstore.set(context, ccm.receivingChainID, activeChainAccount);
			await mainchainInteroperabilityStore.setOwnChainAccount(ownChainAccount);

			await expect(
				mainchainInteroperabilityStore.sendInternal(sendInternalContextLocal as any),
			).resolves.toEqual(false);
			expect(mainchainInteroperabilityStore.isLive).toHaveBeenCalledTimes(1);
		});

		it('should return true and call each module beforeSendCCM crossChainMethod', async () => {
			const mainchainInteropStoreLocal = new MainchainInteroperabilityStore(
				interopMod.stores,
				context,
				modsMap,
			);

			jest.spyOn(mainchainInteropStoreLocal, 'isLive');
			await chainDataSubstore.set(context, ccm.receivingChainID, activeChainAccount);
			await mainchainInteropStoreLocal.setOwnChainAccount(ownChainAccount);
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

	describe('forward', () => {
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

			mainchainInteroperabilityStore = new MainchainInteroperabilityStore(
				interopMod.stores,
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
					messageWitness: {
						partnerChainOutboxSize: BigInt(0),
						siblingHashes: [],
					},
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

			jest.spyOn(mainchainInteroperabilityStore, 'isLive').mockImplementation();
			jest.spyOn(mainchainInteroperabilityStore, 'bounce').mockImplementation();
			jest.spyOn(mainchainInteroperabilityStore, 'sendInternal').mockImplementation();
			jest
				.spyOn(mainchainInteroperabilityStore, 'getChainAccount')
				.mockReturnValue(receivingChainAccount);
			jest.spyOn(mainchainInteroperabilityStore, 'addToOutbox').mockImplementation();
			jest.spyOn(mainchainInteroperabilityStore, 'terminateChainInternal').mockImplementation();
		});

		it('should successfully forward CCM', async () => {
			receivingChainAccount.status = CHAIN_ACTIVE;
			jest.spyOn(mainchainInteroperabilityStore, 'isLive').mockResolvedValue(true);
			jest.spyOn(tokenCCMethod, 'forwardMessageFee').mockResolvedValue(true);

			const result = await mainchainInteroperabilityStore.forward(forwardContext);
			expect(tokenCCMethod.forwardMessageFee).toHaveBeenCalledWith(methodContext, ccm);
			expect(mainchainInteroperabilityStore.addToOutbox).toHaveBeenCalledWith(
				receivingChainIDAsStoreKey,
				ccm,
			);
			expect(result).toBe(ForwardCCMsgResult.SUCCESS);
		});

		it('should bounce and inform terminated sidechain when sidechain is not active', async () => {
			const result = await mainchainInteroperabilityStore.forward(forwardContext);
			expect(mainchainInteroperabilityStore.bounce).toHaveBeenCalledWith(ccm);
			expect(mainchainInteroperabilityStore.sendInternal).toHaveBeenCalled();
			expect(result).toBe(ForwardCCMsgResult.INFORM_SIDECHAIN_TERMINATION);
		});

		it('should throw when tokenCCMethod is not present', async () => {
			mainchainInteroperabilityStore['interoperableModuleMethods'].delete('token');
			await expect(mainchainInteroperabilityStore.forward(forwardContext)).rejects.toThrow(
				'TokenCCMethod does not exist',
			);
		});

		it('should return early when ccm status is not OK', async () => {
			(ccm as any).status = -1;
			await expect(mainchainInteroperabilityStore.forward(forwardContext)).resolves.toBe(
				ForwardCCMsgResult.INVALID_CCM,
			);
		});

		it('should return early when receiving chain does not exist after bounce', async () => {
			receivingChainAccount.status = CHAIN_REGISTERED;
			const result = await mainchainInteroperabilityStore.forward(forwardContext);
			expect(mainchainInteroperabilityStore.bounce).toHaveBeenCalledWith(ccm);
			expect(result).toBe(ForwardCCMsgResult.INACTIVE_RECEIVING_CHAIN);
		});

		it('should return early when receiving chain is not yet active after bounce', async () => {
			receivingChainAccount.status = CHAIN_REGISTERED;
			const result = await mainchainInteroperabilityStore.forward(forwardContext);
			expect(mainchainInteroperabilityStore.bounce).toHaveBeenCalledWith(ccm);
			expect(result).toBe(ForwardCCMsgResult.INACTIVE_RECEIVING_CHAIN);
		});

		it('should terminate receiving chain when it is active and ccm is bounced', async () => {
			receivingChainAccount.status = CHAIN_ACTIVE;
			await mainchainInteroperabilityStore.forward(forwardContext);
			expect(mainchainInteroperabilityStore.bounce).toHaveBeenCalledWith(ccm);
			expect(mainchainInteroperabilityStore.terminateChainInternal).toHaveBeenCalledWith(
				ccm.receivingChainID,
				beforeCCMSendContext,
			);
		});
	});
});
