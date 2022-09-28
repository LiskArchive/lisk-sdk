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
import { utils } from '@liskhq/lisk-cryptography';
import { TokenMethod, TokenModule } from '../../../../src/modules/token';
import {
	CCM_STATUS_OK,
	CHAIN_ID_LENGTH,
	CROSS_CHAIN_COMMAND_NAME_FORWARD,
	MIN_BALANCE,
	TOKEN_ID_LENGTH,
} from '../../../../src/modules/token/constants';
import { TokenInteroperableMethod } from '../../../../src/modules/token/cc_method';
import { userStoreSchema } from '../../../../src/modules/token/schemas';
import { MethodContext, createMethodContext, EventQueue } from '../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { fakeLogger } from '../../../utils/mocks';
import { UserStore } from '../../../../src/modules/token/stores/user';
import { SupplyStore } from '../../../../src/modules/token/stores/supply';
import { EscrowStore } from '../../../../src/modules/token/stores/escrow';

describe('CrossChain Forward command', () => {
	const tokenModule = new TokenModule();
	const defaultAddress = utils.getRandomBytes(20);
	const defaultTokenIDAlias = Buffer.alloc(TOKEN_ID_LENGTH, 0);
	const defaultTokenID = Buffer.from([0, 0, 0, 1, 0, 0, 0, 0]);
	const defaultForeignTokenID = Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]);
	const defaultAccount = {
		availableBalance: BigInt(10000000000),
		lockedBalances: [
			{
				module: 'dpos',
				amount: BigInt(100000000),
			},
		],
	};
	const fee = BigInt('1000');
	const defaultTotalSupply = BigInt('100000000000000');
	const defaultEscrowAmount = BigInt('100000000000');
	const sendingChainID = Buffer.from([3, 0, 0, 0]);
	const ccu = {
		activeValidatorsUpdate: [],
		certificate: utils.getRandomBytes(20),
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
		newCertificateThreshold: BigInt(64),
		sendingChainID,
	};

	let tokenInteropMethod: TokenInteroperableMethod;
	let tokenMethod: TokenMethod;
	let interopMethod: {
		getOwnChainAccount: jest.Mock;
		send: jest.Mock;
		error: jest.Mock;
		terminateChain: jest.Mock;
		getChannel: jest.Mock;
	};
	let stateStore: PrefixedStateReadWriter;
	let methodContext: MethodContext;
	let userStore: UserStore;

	beforeEach(async () => {
		tokenMethod = new TokenMethod(tokenModule.stores, tokenModule.events, tokenModule.name);
		tokenInteropMethod = new TokenInteroperableMethod(
			tokenModule.stores,
			tokenModule.events,
			tokenMethod,
		);
		interopMethod = {
			getOwnChainAccount: jest.fn().mockResolvedValue({ id: Buffer.from([0, 0, 0, 1]) }),
			send: jest.fn(),
			error: jest.fn(),
			terminateChain: jest.fn(),
			getChannel: jest.fn().mockResolvedValue({ messageFeeTokenID: defaultTokenID }),
		};
		const minBalances = [
			{ tokenID: defaultTokenIDAlias, amount: BigInt(MIN_BALANCE) },
			{ tokenID: defaultForeignTokenID, amount: BigInt(MIN_BALANCE) },
		];
		tokenMethod.addDependencies(interopMethod as never);
		tokenInteropMethod.addDependencies(interopMethod);
		tokenMethod.init({
			ownchainID: Buffer.from([0, 0, 0, 1]),
			minBalances,
		});

		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		methodContext = createMethodContext({
			stateStore,
			eventQueue: new EventQueue(0),
		});
		userStore = tokenModule.stores.get(UserStore);
		await userStore.save(methodContext, defaultAddress, defaultTokenIDAlias, defaultAccount);
		await userStore.save(methodContext, defaultAddress, defaultForeignTokenID, defaultAccount);

		const supplyStore = tokenModule.stores.get(SupplyStore);
		await supplyStore.set(methodContext, defaultTokenIDAlias.slice(CHAIN_ID_LENGTH), {
			totalSupply: defaultTotalSupply,
		});

		const escrowStore = tokenModule.stores.get(EscrowStore);
		await escrowStore.set(
			methodContext,
			Buffer.concat([
				defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
				defaultTokenIDAlias.slice(CHAIN_ID_LENGTH),
			]),
			{ amount: defaultEscrowAmount },
		);
		await escrowStore.set(
			methodContext,
			Buffer.concat([Buffer.from([3, 0, 0, 0]), defaultTokenIDAlias.slice(CHAIN_ID_LENGTH)]),
			{ amount: defaultEscrowAmount },
		);
	});

	// TODO: Update with https://github.com/LiskHQ/lisk-sdk/issues/7577
	describe.skip('beforeApplyCCM', () => {
		it('should reject if fee is negative', async () => {
			await expect(
				tokenInteropMethod.beforeApplyCCM({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(-3),
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
					ccu,
					trsSender: defaultAddress,
				}),
			).rejects.toThrow('Fee must be greater or equal to zero');
		});

		it('should credit fee to transaction sender if fee token id is not native', async () => {
			interopMethod.getChannel.mockResolvedValue({ messageFeeTokenID: defaultForeignTokenID });
			await expect(
				tokenInteropMethod.beforeApplyCCM({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee,
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
					ccu,
					trsSender: defaultAddress,
				}),
			).resolves.toBeUndefined();
			await expect(
				tokenMethod.getAvailableBalance(methodContext, defaultAddress, defaultForeignTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + fee);
		});

		it('should terminate sending chain if escrow balance is not sufficient', async () => {
			await expect(
				tokenInteropMethod.beforeApplyCCM({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: fee + defaultEscrowAmount,
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
					ccu,
					trsSender: defaultAddress,
				}),
			).resolves.toBeUndefined();
			expect(interopMethod.terminateChain).toHaveBeenCalled();
		});

		it('should deduct escrow account for fee and credit to sender if token id is native', async () => {
			await expect(
				tokenInteropMethod.beforeApplyCCM({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee,
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
					ccu,
					trsSender: defaultAddress,
				}),
			).resolves.toBeUndefined();
			await expect(
				tokenMethod.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + fee);
			await expect(
				tokenMethod.getEscrowedAmount(methodContext, sendingChainID, defaultTokenID),
			).resolves.toEqual(defaultEscrowAmount - fee);
		});
	});

	// TODO: Update with https://github.com/LiskHQ/lisk-sdk/issues/7577
	describe.skip('beforeRecoverCCM', () => {
		it('should reject if fee is negative', async () => {
			await expect(
				tokenInteropMethod.beforeRecoverCCM({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(-3),
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
					trsSender: defaultAddress,
				}),
			).rejects.toThrow('Fee must be greater or equal to zero');
		});

		it('should credit fee to transaction sender if message fee token id is not native', async () => {
			interopMethod.getChannel.mockResolvedValue({ messageFeeTokenID: defaultForeignTokenID });
			await expect(
				tokenInteropMethod.beforeRecoverCCM({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee,
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
					trsSender: defaultAddress,
				}),
			).resolves.toBeUndefined();
			await expect(
				tokenMethod.getAvailableBalance(methodContext, defaultAddress, defaultForeignTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + fee);
		});

		it('should terminate sending chain if escrow balance is not sufficient', async () => {
			await expect(
				tokenInteropMethod.beforeRecoverCCM({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: fee + defaultEscrowAmount,
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
					trsSender: defaultAddress,
				}),
			).resolves.toBeUndefined();
			expect(interopMethod.terminateChain).toHaveBeenCalled();
		});

		it('should deduct escrow account for fee and credit to sender if token id is native', async () => {
			await expect(
				tokenInteropMethod.beforeRecoverCCM({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee,
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
					trsSender: defaultAddress,
				}),
			).resolves.toBeUndefined();
			await expect(
				tokenMethod.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + fee);
			await expect(
				tokenMethod.getEscrowedAmount(methodContext, sendingChainID, defaultTokenID),
			).resolves.toEqual(defaultEscrowAmount - fee);
		});
	});

	// TODO: Update with https://github.com/LiskHQ/lisk-sdk/issues/7577
	describe.skip('beforeSendCCM', () => {
		it('should reject if fee is negative', async () => {
			await expect(
				tokenInteropMethod.beforeSendCCM({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(-3),
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
				}),
			).rejects.toThrow('Fee must be greater or equal to zero');
		});

		it('should credit receiving chain escrow account for fee if message token id is native', async () => {
			await expect(
				tokenInteropMethod.beforeSendCCM({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee,
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			await expect(
				tokenMethod.getEscrowedAmount(methodContext, Buffer.from([0, 0, 0, 1]), defaultTokenID),
			).resolves.toEqual(fee);
		});

		it('should reject if fee payer does not have sufficient balance', async () => {
			await expect(
				tokenInteropMethod.beforeSendCCM({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: fee + defaultAccount.availableBalance + BigInt(1),
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
				}),
			).rejects.toThrow('does not have sufficient balance for fee');
		});

		it('should deduct fee from fee payer', async () => {
			await expect(
				tokenInteropMethod.beforeSendCCM({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee,
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			await expect(
				tokenMethod.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance - fee);
		});
	});

	// TODO: Update with https://github.com/LiskHQ/lisk-sdk/issues/7577
	describe.skip('recover', () => {
		it('should reject if store fix is not store prefix user', async () => {
			await expect(
				tokenInteropMethod.recover({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(-3),
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
					module: tokenModule.name,
					storeKey: Buffer.concat([defaultAddress, defaultTokenID]),
					storePrefix: Buffer.from([0, 0]),
					storeValue: codec.encode(userStoreSchema, {
						availableBalance: defaultAccount.availableBalance * BigInt(2),
						lockedBalances: [{ module: 'dpos', amount: BigInt(20) }],
					}),
					terminatedChainID: sendingChainID,
				}),
			).rejects.toThrow('Invalid store prefix');
		});

		it('should reject if store key is not 28 bytes', async () => {
			await expect(
				tokenInteropMethod.recover({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(-3),
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
					module: tokenModule.name,
					storeKey: Buffer.concat([defaultAddress, defaultTokenID, Buffer.alloc(20)]),
					storePrefix: userStore.subStorePrefix,
					storeValue: codec.encode(userStoreSchema, {
						availableBalance: defaultAccount.availableBalance * BigInt(2),
						lockedBalances: [{ module: 'dpos', amount: BigInt(20) }],
					}),
					terminatedChainID: sendingChainID,
				}),
			).rejects.toThrow('Invalid store key');
		});

		it('should reject if token is not native', async () => {
			await expect(
				tokenInteropMethod.recover({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(-3),
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
					module: tokenModule.name,
					storeKey: Buffer.concat([defaultAddress, defaultForeignTokenID]),
					storePrefix: userStore.subStorePrefix,
					storeValue: codec.encode(userStoreSchema, {
						availableBalance: defaultAccount.availableBalance * BigInt(2),
						lockedBalances: [{ module: 'dpos', amount: BigInt(20) }],
					}),
					terminatedChainID: sendingChainID,
				}),
			).rejects.toThrow('does not match with own chain ID');
		});

		it('should reject if not enough balance is escrowed', async () => {
			const recipient = utils.getRandomBytes(20);
			await expect(
				tokenInteropMethod.recover({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(-3),
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
					module: tokenModule.name,
					storeKey: Buffer.concat([recipient, defaultTokenID]),
					storePrefix: userStore.subStorePrefix,
					storeValue: codec.encode(userStoreSchema, {
						availableBalance: defaultEscrowAmount,
						lockedBalances: [{ module: 'dpos', amount: BigInt(20) }],
					}),
					terminatedChainID: sendingChainID,
				}),
			).rejects.toThrow('is not sufficient for');
		});

		it('should deduct escrowed amount for the total recovered amount', async () => {
			const recipient = utils.getRandomBytes(20);
			await expect(
				tokenInteropMethod.recover({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(-3),
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
					module: tokenModule.name,
					storeKey: Buffer.concat([recipient, defaultTokenID]),
					storePrefix: userStore.subStorePrefix,
					storeValue: codec.encode(userStoreSchema, defaultAccount),
					terminatedChainID: sendingChainID,
				}),
			).resolves.toBeUndefined();
			await expect(
				tokenMethod.getEscrowedAmount(methodContext, sendingChainID, defaultTokenID),
			).resolves.toEqual(
				defaultEscrowAmount -
					defaultAccount.availableBalance -
					defaultAccount.lockedBalances[0].amount,
			);
		});

		it('should credit the address for the total recovered amount', async () => {
			const recipient = utils.getRandomBytes(20);
			await expect(
				tokenInteropMethod.recover({
					ccm: {
						crossChainCommand: CROSS_CHAIN_COMMAND_NAME_FORWARD,
						module: tokenModule.name,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(-3),
						status: CCM_STATUS_OK,
						params: utils.getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getMethodContext: () => methodContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					chainID: utils.getRandomBytes(32),
					module: tokenModule.name,
					storeKey: Buffer.concat([recipient, defaultTokenID]),
					storePrefix: userStore.subStorePrefix,
					storeValue: codec.encode(userStoreSchema, defaultAccount),
					terminatedChainID: sendingChainID,
				}),
			).resolves.toBeUndefined();
			await expect(
				tokenMethod.getAvailableBalance(methodContext, recipient, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + defaultAccount.lockedBalances[0].amount);
		});
	});
});
