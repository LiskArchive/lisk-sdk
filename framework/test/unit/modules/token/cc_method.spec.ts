/*
 * Copyright © 2020 Lisk Foundation
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
import { address, utils } from '@liskhq/lisk-cryptography';
import { TokenModule } from '../../../../src/modules/token';
import {
	CCM_STATUS_OK,
	CHAIN_ID_LENGTH,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	TokenEventResult,
} from '../../../../src/modules/token/constants';
import { TokenInteroperableMethod } from '../../../../src/modules/token/cc_method';
import { crossChainForwardMessageParams } from '../../../../src/modules/token/schemas';
import { MethodContext, createMethodContext, EventQueue } from '../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { fakeLogger } from '../../../utils/mocks';
import { UserStore, userStoreSchema } from '../../../../src/modules/token/stores/user';
import { SupplyStore } from '../../../../src/modules/token/stores/supply';
import { EscrowStore } from '../../../../src/modules/token/stores/escrow';
import { BeforeCCCExecutionEvent } from '../../../../src/modules/token/events/before_ccc_execution';
import { BeforeCCMForwardingEvent } from '../../../../src/modules/token/events/before_ccm_forwarding';
import { RecoverEvent } from '../../../../src/modules/token/events/recover';
import {
	CCMStatusCode,
	CROSS_CHAIN_COMMAND_REGISTRATION,
} from '../../../../src/modules/interoperability/constants';
import { ccuParamsSchema } from '../../../../src';
import { InternalMethod } from '../../../../src/modules/token/internal_method';
import { InitializeUserAccountEvent } from '../../../../src/modules/token/events/initialize_user_account';

describe('TokenInteroperableMethod', () => {
	const tokenModule = new TokenModule();
	const internalMethod = new InternalMethod(tokenModule.stores, tokenModule.events);
	const defaultPublicKey = Buffer.from(
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
		'hex',
	);
	const defaultAddress = address.getAddressFromPublicKey(defaultPublicKey);
	const ownChainID = Buffer.from([1, 0, 0, 0]);
	const defaultTokenID = Buffer.concat([ownChainID, Buffer.alloc(4)]);
	const defaultForeignTokenID = Buffer.from([2, 0, 0, 0, 0, 0, 0, 0]);
	const defaultAccount = {
		availableBalance: BigInt(10000000000),
		lockedBalances: [
			{
				module: 'pos',
				amount: BigInt(100000000),
			},
		],
	};
	const fee = BigInt('1000');
	const defaultTotalSupply = BigInt('100000000000000');
	const defaultEscrowAmount = BigInt('100000000000');
	const sendingChainID = Buffer.from([3, 0, 0, 0]);
	const defaultEncodedCCUParams = codec.encode(ccuParamsSchema, {
		activeValidatorsUpdate: {
			blsKeysUpdate: [],
			bftWeightsUpdate: [],
			bftWeightsUpdateBitmap: Buffer.alloc(0),
		},
		certificate: Buffer.alloc(1),
		certificateThreshold: BigInt(1),
		inboxUpdate: {
			crossChainMessages: [],
			messageWitnessHashes: [],
			outboxRootWitness: {
				bitmap: Buffer.alloc(1),
				siblingHashes: [],
			},
		},
		sendingChainID: Buffer.from('04000001', 'hex'),
	});
	const userAccountInitializationFee = BigInt('10000');
	const escrowAccountInitializationFee = BigInt('1000');

	internalMethod.init({
		userAccountInitializationFee,
		escrowAccountInitializationFee,
	});

	let tokenInteropMethod: TokenInteroperableMethod;
	let stateStore: PrefixedStateReadWriter;
	let contextStore: Map<string, unknown>;
	let methodContext: MethodContext;
	let userStore: UserStore;
	let escrowStore: EscrowStore;

	const checkEventResult = (
		eventQueue: EventQueue,
		BaseEvent: any,
		expectedResult: TokenEventResult,
		length = 1,
		index = 0,
	) => {
		expect(eventQueue.getEvents()).toHaveLength(length);
		expect(eventQueue.getEvents()[index].toObject().name).toEqual(new BaseEvent('token').name);
		expect(
			codec.decode<Record<string, unknown>>(
				new BaseEvent('token').schema,
				eventQueue.getEvents()[index].toObject().data,
			).result,
		).toEqual(expectedResult);
	};

	beforeEach(async () => {
		internalMethod.addDependencies({ payFee: jest.fn() });
		tokenInteropMethod = new TokenInteroperableMethod(tokenModule.stores, tokenModule.events);
		tokenInteropMethod.addDependencies(
			{
				send: jest.fn().mockResolvedValue(true),
				getMessageFeeTokenID: jest.fn().mockResolvedValue(defaultTokenID),
				getMessageFeeTokenIDFromCCM: jest.fn().mockResolvedValue(defaultTokenID),
			} as never,
			internalMethod,
		);

		methodContext = createMethodContext({
			stateStore: new PrefixedStateReadWriter(new InMemoryPrefixedStateDB()),
			eventQueue: new EventQueue(0).getChildQueue(Buffer.from([0])),
			contextStore: new Map<string, unknown>(),
		});
		userStore = tokenModule.stores.get(UserStore);
		await userStore.save(methodContext, defaultAddress, defaultTokenID, defaultAccount);
		await userStore.save(methodContext, defaultAddress, defaultForeignTokenID, defaultAccount);

		const supplyStore = tokenModule.stores.get(SupplyStore);
		await supplyStore.set(methodContext, defaultTokenID, {
			totalSupply: defaultTotalSupply,
		});

		escrowStore = tokenModule.stores.get(EscrowStore);
		await escrowStore.set(
			methodContext,
			Buffer.concat([defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH), defaultTokenID]),
			{ amount: defaultEscrowAmount },
		);
		await escrowStore.set(
			methodContext,
			Buffer.concat([Buffer.from([3, 0, 0, 0]), defaultTokenID]),
			{ amount: defaultEscrowAmount },
		);
	});

	describe('beforeCrossChainCommandExecute', () => {
		it('should credit fee to transaction sender if token id is not native', async () => {
			jest
				.spyOn(tokenInteropMethod['_interopMethod'], 'getMessageFeeTokenIDFromCCM')
				.mockResolvedValue(defaultForeignTokenID);
			await expect(
				tokenInteropMethod.beforeCrossChainCommandExecute({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: ownChainID,
						fee,
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: ownChainID,
					header: {
						timestamp: Date.now(),
						height: 10,
					},
					stateStore,
					contextStore,
					transaction: {
						fee,
						senderAddress: defaultAddress,
						params: defaultEncodedCCUParams,
					},
				}),
			).resolves.toBeUndefined();
			const { availableBalance } = await userStore.get(
				methodContext,
				userStore.getKey(defaultAddress, defaultForeignTokenID),
			);
			expect(availableBalance).toEqual(defaultAccount.availableBalance + fee);
			checkEventResult(
				methodContext.eventQueue,
				BeforeCCCExecutionEvent,
				TokenEventResult.SUCCESSFUL,
			);
		});

		it('should throw if escrow balance is not sufficient', async () => {
			await expect(
				tokenInteropMethod.beforeCrossChainCommandExecute({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: ownChainID,
						fee: fee + defaultEscrowAmount,
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: ownChainID,
					header: {
						timestamp: Date.now(),
						height: 10,
					},
					stateStore,
					contextStore,
					transaction: {
						fee,
						senderAddress: defaultAddress,
						params: defaultEncodedCCUParams,
					},
				}),
			).rejects.toThrow('Insufficient balance in the sending chain for the message fee.');
			checkEventResult(
				methodContext.eventQueue,
				BeforeCCCExecutionEvent,
				TokenEventResult.INSUFFICIENT_ESCROW_BALANCE,
			);
		});

		it('should deduct escrow account for fee and credit to sender if token id is native', async () => {
			await expect(
				tokenInteropMethod.beforeCrossChainCommandExecute({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: ownChainID,
						fee,
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: ownChainID,
					header: {
						timestamp: Date.now(),
						height: 10,
					},
					stateStore,
					contextStore,
					transaction: {
						fee,
						senderAddress: defaultAddress,
						params: defaultEncodedCCUParams,
					},
				}),
			).resolves.toBeUndefined();
			const { availableBalance } = await userStore.get(
				methodContext,
				userStore.getKey(defaultAddress, defaultTokenID),
			);
			expect(availableBalance).toEqual(defaultAccount.availableBalance + fee);
			const { amount } = await escrowStore.get(
				methodContext,
				userStore.getKey(sendingChainID, defaultTokenID),
			);
			expect(amount).toEqual(defaultEscrowAmount - fee);
			checkEventResult(
				methodContext.eventQueue,
				BeforeCCCExecutionEvent,
				TokenEventResult.SUCCESSFUL,
			);
		});
	});

	describe('beforeCrossChainMessageForwarding', () => {
		it('should throw if messageFeeTokenID is not LSK', async () => {
			jest
				.spyOn(tokenInteropMethod['_interopMethod'], 'getMessageFeeTokenIDFromCCM')
				.mockResolvedValue(defaultForeignTokenID);
			await expect(
				tokenInteropMethod.beforeCrossChainMessageForwarding({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: ownChainID,
						fee: fee + defaultEscrowAmount,
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: ownChainID,
					header: {
						timestamp: Date.now(),
						height: 10,
					},
					stateStore,
					contextStore,
					transaction: {
						fee,
						senderAddress: defaultAddress,
						params: defaultEncodedCCUParams,
					},
					ccmFailed: false,
				}),
			).rejects.toThrow('Message fee token should be LSK.');
		});

		it(`should emit ${TokenEventResult.SUCCESSFUL} if there is no ccm fee`, async () => {
			await expect(
				tokenInteropMethod.beforeCrossChainMessageForwarding({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(0),
						status: CCMStatusCode.OK,
						params: codec.encode(crossChainForwardMessageParams, {
							tokenID: utils.getRandomBytes(9),
							amount: BigInt(1000),
							senderAddress: defaultAddress,
							forwardToChainID: Buffer.from([4, 0, 0, 0]),
							recipientAddress: defaultAddress,
							data: 'ddd',
							forwardedMessageFee: BigInt(2000),
						}),
					},
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: ownChainID,
					header: {
						timestamp: Date.now(),
						height: 10,
					},
					stateStore,
					contextStore,
					transaction: {
						fee,
						senderAddress: defaultAddress,
						params: defaultEncodedCCUParams,
					},
					ccmFailed: false,
				}),
			).resolves.toBeUndefined();
			checkEventResult(
				methodContext.eventQueue,
				BeforeCCMForwardingEvent,
				TokenEventResult.SUCCESSFUL,
			);
		});

		it('should throw if escrow balance is not sufficient', async () => {
			await expect(
				tokenInteropMethod.beforeCrossChainMessageForwarding({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: ownChainID,
						fee: fee + defaultEscrowAmount,
						status: CCMStatusCode.OK,
						params: utils.getRandomBytes(30),
					},
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: ownChainID,
					header: {
						timestamp: Date.now(),
						height: 10,
					},
					stateStore,
					contextStore,
					transaction: {
						fee,
						senderAddress: defaultAddress,
						params: defaultEncodedCCUParams,
					},
					ccmFailed: false,
				}),
			).rejects.toThrow('Insufficient balance in the sending chain for the message fee.');
			checkEventResult(
				methodContext.eventQueue,
				BeforeCCMForwardingEvent,
				TokenEventResult.INSUFFICIENT_ESCROW_BALANCE,
			);
		});

		it('should credit to relayer account if ccm failed', async () => {
			await expect(
				tokenInteropMethod.beforeCrossChainMessageForwarding({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: ownChainID,
						fee,
						status: CCMStatusCode.FAILED_CCM,
						params: codec.encode(crossChainForwardMessageParams, {
							tokenID: utils.getRandomBytes(9),
							amount: BigInt(1000),
							senderAddress: defaultAddress,
							forwardToChainID: Buffer.from([4, 0, 0, 0]),
							recipientAddress: defaultAddress,
							data: 'ddd',
							forwardedMessageFee: BigInt(2000),
						}),
					},
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: ownChainID,
					header: {
						timestamp: Date.now(),
						height: 10,
					},
					stateStore,
					contextStore,
					transaction: {
						fee,
						senderAddress: defaultAddress,
						params: defaultEncodedCCUParams,
					},
					ccmFailed: true,
				}),
			).resolves.toBeUndefined();

			const { amount } = await escrowStore.get(
				methodContext,
				escrowStore.getKey(sendingChainID, defaultTokenID),
			);
			expect(amount).toEqual(defaultEscrowAmount - fee);
			const { availableBalance } = await userStore.get(
				methodContext,
				userStore.getKey(defaultAddress, defaultTokenID),
			);
			expect(availableBalance).toEqual(defaultAccount.availableBalance + fee);
			checkEventResult(
				methodContext.eventQueue,
				BeforeCCMForwardingEvent,
				TokenEventResult.SUCCESSFUL,
			);
		});

		it('should credit to receiving chain escrow account if ccm did not fail', async () => {
			await expect(
				tokenInteropMethod.beforeCrossChainMessageForwarding({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee,
						status: CCMStatusCode.OK,
						params: codec.encode(crossChainForwardMessageParams, {
							tokenID: utils.getRandomBytes(9),
							amount: BigInt(1000),
							senderAddress: defaultAddress,
							forwardToChainID: Buffer.from([4, 0, 0, 0]),
							recipientAddress: defaultAddress,
							data: 'ddd',
							forwardedMessageFee: BigInt(2000),
						}),
					},
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: ownChainID,
					header: {
						timestamp: Date.now(),
						height: 10,
					},
					stateStore,
					contextStore,
					transaction: {
						fee,
						senderAddress: defaultAddress,
						params: defaultEncodedCCUParams,
					},
					ccmFailed: false,
				}),
			).resolves.toBeUndefined();

			const { amount: sendingChainAmount } = await escrowStore.get(
				methodContext,
				escrowStore.getKey(sendingChainID, defaultTokenID),
			);
			expect(sendingChainAmount).toEqual(defaultEscrowAmount - fee);
			const { amount: receivingChainAmount } = await escrowStore.get(
				methodContext,
				escrowStore.getKey(Buffer.from([0, 0, 0, 1]), defaultTokenID),
			);
			expect(receivingChainAmount).toEqual(fee);
			checkEventResult(
				methodContext.eventQueue,
				BeforeCCMForwardingEvent,
				TokenEventResult.SUCCESSFUL,
			);
		});
	});

	describe('verifyCrossChainMessage', () => {
		it('should resolve if token id is native and escrow amount is sufficient', async () => {
			await expect(
				tokenInteropMethod.verifyCrossChainMessage({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: ownChainID,
						fee,
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: ownChainID,
					header: {
						timestamp: Date.now(),
						height: 10,
					},
					stateStore,
					contextStore,
					transaction: {
						fee,
						senderAddress: defaultAddress,
						params: defaultEncodedCCUParams,
					},
				}),
			).resolves.toBeUndefined();
		});

		it('should reject if token id is native and sending chain escrow account does not have sufficient balance', async () => {
			await expect(
				tokenInteropMethod.verifyCrossChainMessage({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: ownChainID,
						fee: fee + defaultEscrowAmount,
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: ownChainID,
					header: {
						timestamp: Date.now(),
						height: 10,
					},
					stateStore,
					contextStore,
					transaction: {
						fee,
						senderAddress: defaultAddress,
						params: defaultEncodedCCUParams,
					},
				}),
			).rejects.toThrow('Insufficient escrow amount.');
		});

		it('should resolve if token id is not native', async () => {
			jest
				.spyOn(tokenInteropMethod['_interopMethod'], 'getMessageFeeTokenIDFromCCM')
				.mockResolvedValue(defaultForeignTokenID);
			await expect(
				tokenInteropMethod.verifyCrossChainMessage({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: ownChainID,
						fee,
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: ownChainID,
					header: {
						timestamp: Date.now(),
						height: 10,
					},
					stateStore,
					contextStore,
					transaction: {
						fee,
						senderAddress: defaultAddress,
						params: defaultEncodedCCUParams,
					},
				}),
			).resolves.toBeUndefined();
		});
	});

	describe('recover', () => {
		const createRecoverContext = (store: PrefixedStateReadWriter) => ({
			getMethodContext: () => methodContext,
			eventQueue: new EventQueue(0),
			getStore: (moduleID: Buffer, prefix: Buffer) => store.getStore(moduleID, prefix),
			module: tokenModule.name,
			stateStore: store,
			chainID: ownChainID,
		});
		it('should reject if store prefix is not store prefix user', async () => {
			await expect(
				tokenInteropMethod.recover({
					...createRecoverContext(stateStore),
					storeKey: Buffer.concat([defaultAddress, defaultTokenID]),
					substorePrefix: Buffer.from([0xff, 0xff]),
					storeValue: codec.encode(userStoreSchema, {
						availableBalance: defaultAccount.availableBalance * BigInt(2),
						lockedBalances: [{ module: 'dpos', amount: BigInt(20) }],
					}),
					terminatedChainID: sendingChainID,
				}),
			).rejects.toThrow('Invalid arguments.');
			checkEventResult(
				methodContext.eventQueue,
				RecoverEvent,
				TokenEventResult.RECOVER_FAIL_INVALID_INPUTS,
			);
		});

		it('should reject if store key is not 28 bytes', async () => {
			await expect(
				tokenInteropMethod.recover({
					...createRecoverContext(stateStore),
					module: tokenModule.name,
					storeKey: Buffer.concat([defaultAddress, defaultTokenID, Buffer.alloc(20)]),
					substorePrefix: userStore.subStorePrefix,
					storeValue: codec.encode(userStoreSchema, {
						availableBalance: defaultAccount.availableBalance * BigInt(2),
						lockedBalances: [{ module: 'pos', amount: BigInt(20) }],
					}),
					terminatedChainID: sendingChainID,
				}),
			).rejects.toThrow('Invalid arguments.');
			checkEventResult(
				methodContext.eventQueue,
				RecoverEvent,
				TokenEventResult.RECOVER_FAIL_INVALID_INPUTS,
			);
		});

		it('should reject if store value cannot be decoded', async () => {
			await expect(
				tokenInteropMethod.recover({
					...createRecoverContext(stateStore),
					storeKey: Buffer.concat([defaultAddress, defaultTokenID]),
					substorePrefix: userStore.subStorePrefix,
					storeValue: utils.getRandomBytes(32),
					terminatedChainID: sendingChainID,
				}),
			).rejects.toThrow('Invalid arguments.');
			checkEventResult(
				methodContext.eventQueue,
				RecoverEvent,
				TokenEventResult.RECOVER_FAIL_INVALID_INPUTS,
			);
		});

		it('should reject if token is not native', async () => {
			jest
				.spyOn(tokenInteropMethod['_interopMethod'], 'getMessageFeeTokenIDFromCCM')
				.mockResolvedValue(defaultForeignTokenID);
			await expect(
				tokenInteropMethod.recover({
					...createRecoverContext(stateStore),
					storeKey: Buffer.concat([defaultAddress, defaultForeignTokenID]),
					substorePrefix: userStore.subStorePrefix,
					storeValue: codec.encode(userStoreSchema, {
						availableBalance: defaultAccount.availableBalance * BigInt(2),
						lockedBalances: [{ module: 'pos', amount: BigInt(20) }],
					}),
					terminatedChainID: sendingChainID,
				}),
			).rejects.toThrow('Insufficient escrow amount.');
			checkEventResult(
				methodContext.eventQueue,
				RecoverEvent,
				TokenEventResult.RECOVER_FAIL_INSUFFICIENT_ESCROW,
			);
		});

		it('should reject if not enough balance is escrowed', async () => {
			const recipient = utils.getRandomBytes(20);
			await expect(
				tokenInteropMethod.recover({
					...createRecoverContext(stateStore),
					storeKey: Buffer.concat([recipient, defaultTokenID]),
					substorePrefix: userStore.subStorePrefix,
					storeValue: codec.encode(userStoreSchema, {
						availableBalance: defaultEscrowAmount,
						lockedBalances: [{ module: 'pos', amount: BigInt(20) }],
					}),
					terminatedChainID: sendingChainID,
				}),
			).rejects.toThrow('Insufficient escrow amount.');
			checkEventResult(
				methodContext.eventQueue,
				RecoverEvent,
				TokenEventResult.RECOVER_FAIL_INSUFFICIENT_ESCROW,
			);
		});

		it('should deduct escrowed amount for the total recovered amount', async () => {
			const recipient = utils.getRandomBytes(20);
			await userStore.set(methodContext, Buffer.concat([recipient, defaultTokenID]), {
				availableBalance: BigInt(0),
				lockedBalances: [],
			});
			await expect(
				tokenInteropMethod.recover({
					...createRecoverContext(stateStore),
					storeKey: Buffer.concat([recipient, defaultTokenID]),
					substorePrefix: userStore.subStorePrefix,
					storeValue: codec.encode(userStoreSchema, defaultAccount),
					terminatedChainID: sendingChainID,
				}),
			).resolves.toBeUndefined();

			const { amount } = await escrowStore.get(
				methodContext,
				userStore.getKey(sendingChainID, defaultTokenID),
			);
			expect(amount).toEqual(
				defaultEscrowAmount -
					defaultAccount.availableBalance -
					defaultAccount.lockedBalances[0].amount,
			);
			checkEventResult(methodContext.eventQueue, RecoverEvent, TokenEventResult.SUCCESSFUL);
		});

		it('should initialize the account if it does not exist and credit it the total recovered amount', async () => {
			const recipient = utils.getRandomBytes(20);

			await expect(
				tokenInteropMethod.recover({
					...createRecoverContext(stateStore),
					storeKey: Buffer.concat([recipient, defaultTokenID]),
					substorePrefix: userStore.subStorePrefix,
					storeValue: codec.encode(userStoreSchema, defaultAccount),
					terminatedChainID: sendingChainID,
				}),
			).resolves.toBeUndefined();

			const { availableBalance } = await userStore.get(
				methodContext,
				userStore.getKey(recipient, defaultTokenID),
			);
			expect(availableBalance).toEqual(
				defaultAccount.availableBalance + defaultAccount.lockedBalances[0].amount,
			);
			checkEventResult(
				methodContext.eventQueue,
				InitializeUserAccountEvent,
				TokenEventResult.SUCCESSFUL,
				2,
				0,
			);
			checkEventResult(methodContext.eventQueue, RecoverEvent, TokenEventResult.SUCCESSFUL, 2, 1);
		});

		it('should credit the address for the total recovered amount', async () => {
			const recipient = utils.getRandomBytes(20);
			await userStore.set(methodContext, Buffer.concat([recipient, defaultTokenID]), {
				availableBalance: BigInt(0),
				lockedBalances: [],
			});
			await expect(
				tokenInteropMethod.recover({
					...createRecoverContext(stateStore),
					storeKey: Buffer.concat([recipient, defaultTokenID]),
					substorePrefix: userStore.subStorePrefix,
					storeValue: codec.encode(userStoreSchema, defaultAccount),
					terminatedChainID: sendingChainID,
				}),
			).resolves.toBeUndefined();

			const { availableBalance } = await userStore.get(
				methodContext,
				userStore.getKey(recipient, defaultTokenID),
			);
			expect(availableBalance).toEqual(
				defaultAccount.availableBalance + defaultAccount.lockedBalances[0].amount,
			);
			checkEventResult(methodContext.eventQueue, RecoverEvent, TokenEventResult.SUCCESSFUL);
		});
	});
});
