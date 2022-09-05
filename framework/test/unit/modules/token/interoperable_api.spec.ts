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
import { TokenAPI, TokenModule } from '../../../../src/modules/token';
import {
	CCM_STATUS_OK,
	CHAIN_ID_LENGTH,
	CROSS_CHAIN_COMMAND_NAME_FORWARD,
	EMPTY_BYTES,
	MIN_BALANCE,
	TOKEN_ID_LENGTH,
} from '../../../../src/modules/token/constants';
import { TokenInteroperableAPI } from '../../../../src/modules/token/cc_api';
import { userStoreSchema } from '../../../../src/modules/token/schemas';
import { APIContext, createAPIContext, EventQueue } from '../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { fakeLogger } from '../../../utils/mocks';
import { UserStore } from '../../../../src/modules/token/stores/user';
import { SupplyStore } from '../../../../src/modules/token/stores/supply';
import { AvailableLocalIDStore } from '../../../../src/modules/token/stores/available_local_id';
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

	let tokenInteropAPI: TokenInteroperableAPI;
	let tokenAPI: TokenAPI;
	let interopAPI: {
		getOwnChainAccount: jest.Mock;
		send: jest.Mock;
		error: jest.Mock;
		terminateChain: jest.Mock;
		getChannel: jest.Mock;
	};
	let stateStore: PrefixedStateReadWriter;
	let apiContext: APIContext;
	let userStore: UserStore;

	beforeEach(async () => {
		tokenAPI = new TokenAPI(tokenModule.stores, tokenModule.events, tokenModule.name);
		tokenInteropAPI = new TokenInteroperableAPI(tokenModule.stores, tokenModule.events, tokenAPI);
		interopAPI = {
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
		tokenAPI.addDependencies(interopAPI as never);
		tokenInteropAPI.addDependencies(interopAPI);
		tokenAPI.init({
			minBalances,
		});

		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		apiContext = createAPIContext({
			stateStore,
			eventQueue: new EventQueue(0),
		});
		userStore = tokenModule.stores.get(UserStore);
		await userStore.set(
			apiContext,
			userStore.getKey(defaultAddress, defaultTokenIDAlias),
			defaultAccount,
		);
		await userStore.set(
			apiContext,
			userStore.getKey(defaultAddress, defaultForeignTokenID),
			defaultAccount,
		);

		const supplyStore = tokenModule.stores.get(SupplyStore);
		await supplyStore.set(apiContext, defaultTokenIDAlias.slice(CHAIN_ID_LENGTH), {
			totalSupply: defaultTotalSupply,
		});

		const nextAvailableLocalIDStore = tokenModule.stores.get(AvailableLocalIDStore);
		await nextAvailableLocalIDStore.set(apiContext, EMPTY_BYTES, {
			nextAvailableLocalID: Buffer.from([0, 0, 0, 5]),
		});

		const escrowStore = tokenModule.stores.get(EscrowStore);
		await escrowStore.set(
			apiContext,
			Buffer.concat([
				defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
				defaultTokenIDAlias.slice(CHAIN_ID_LENGTH),
			]),
			{ amount: defaultEscrowAmount },
		);
		await escrowStore.set(
			apiContext,
			Buffer.concat([Buffer.from([3, 0, 0, 0]), defaultTokenIDAlias.slice(CHAIN_ID_LENGTH)]),
			{ amount: defaultEscrowAmount },
		);
	});

	describe('beforeApplyCCM', () => {
		it('should reject if fee is negative', async () => {
			await expect(
				tokenInteropAPI.beforeApplyCCM({
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
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: utils.getRandomBytes(32),
					ccu,
					trsSender: defaultAddress,
				}),
			).rejects.toThrow('Fee must be greater or equal to zero');
		});

		it('should credit fee to transaction sender if fee token id is not native', async () => {
			interopAPI.getChannel.mockResolvedValue({ messageFeeTokenID: defaultForeignTokenID });
			await expect(
				tokenInteropAPI.beforeApplyCCM({
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
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: utils.getRandomBytes(32),
					ccu,
					trsSender: defaultAddress,
				}),
			).resolves.toBeUndefined();
			await expect(
				tokenAPI.getAvailableBalance(apiContext, defaultAddress, defaultForeignTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + fee);
		});

		it('should terminate sending chain if escrow balance is not sufficient', async () => {
			await expect(
				tokenInteropAPI.beforeApplyCCM({
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
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: utils.getRandomBytes(32),
					ccu,
					trsSender: defaultAddress,
				}),
			).resolves.toBeUndefined();
			expect(interopAPI.terminateChain).toHaveBeenCalled();
		});

		it('should deduct escrow account for fee and credit to sender if token id is native', async () => {
			await expect(
				tokenInteropAPI.beforeApplyCCM({
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
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: utils.getRandomBytes(32),
					ccu,
					trsSender: defaultAddress,
				}),
			).resolves.toBeUndefined();
			await expect(
				tokenAPI.getAvailableBalance(apiContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + fee);
			await expect(
				tokenAPI.getEscrowedAmount(apiContext, sendingChainID, defaultTokenID),
			).resolves.toEqual(defaultEscrowAmount - fee);
		});
	});

	describe('beforeRecoverCCM', () => {
		it('should reject if fee is negative', async () => {
			await expect(
				tokenInteropAPI.beforeRecoverCCM({
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
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: utils.getRandomBytes(32),
					trsSender: defaultAddress,
				}),
			).rejects.toThrow('Fee must be greater or equal to zero');
		});

		it('should credit fee to transaction sender if message fee token id is not native', async () => {
			interopAPI.getChannel.mockResolvedValue({ messageFeeTokenID: defaultForeignTokenID });
			await expect(
				tokenInteropAPI.beforeRecoverCCM({
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
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: utils.getRandomBytes(32),
					trsSender: defaultAddress,
				}),
			).resolves.toBeUndefined();
			await expect(
				tokenAPI.getAvailableBalance(apiContext, defaultAddress, defaultForeignTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + fee);
		});

		it('should terminate sending chain if escrow balance is not sufficient', async () => {
			await expect(
				tokenInteropAPI.beforeRecoverCCM({
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
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: utils.getRandomBytes(32),
					trsSender: defaultAddress,
				}),
			).resolves.toBeUndefined();
			expect(interopAPI.terminateChain).toHaveBeenCalled();
		});

		it('should deduct escrow account for fee and credit to sender if token id is native', async () => {
			await expect(
				tokenInteropAPI.beforeRecoverCCM({
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
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: utils.getRandomBytes(32),
					trsSender: defaultAddress,
				}),
			).resolves.toBeUndefined();
			await expect(
				tokenAPI.getAvailableBalance(apiContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + fee);
			await expect(
				tokenAPI.getEscrowedAmount(apiContext, sendingChainID, defaultTokenID),
			).resolves.toEqual(defaultEscrowAmount - fee);
		});
	});

	describe('beforeSendCCM', () => {
		it('should reject if fee is negative', async () => {
			await expect(
				tokenInteropAPI.beforeSendCCM({
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
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: utils.getRandomBytes(32),
				}),
			).rejects.toThrow('Fee must be greater or equal to zero');
		});

		it('should credit receiving chain escrow account for fee if message token id is native', async () => {
			await expect(
				tokenInteropAPI.beforeSendCCM({
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
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: utils.getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			await expect(
				tokenAPI.getEscrowedAmount(apiContext, Buffer.from([0, 0, 0, 1]), defaultTokenID),
			).resolves.toEqual(fee);
		});

		it('should reject if fee payer does not have sufficient balance', async () => {
			await expect(
				tokenInteropAPI.beforeSendCCM({
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
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: utils.getRandomBytes(32),
				}),
			).rejects.toThrow('does not have sufficient balance for fee');
		});

		it('should deduct fee from fee payer', async () => {
			await expect(
				tokenInteropAPI.beforeSendCCM({
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
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: utils.getRandomBytes(32),
				}),
			).resolves.toBeUndefined();
			await expect(
				tokenAPI.getAvailableBalance(apiContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance - fee);
		});
	});

	describe('recover', () => {
		it('should reject if store fix is not store prefix user', async () => {
			await expect(
				tokenInteropAPI.recover({
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
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: utils.getRandomBytes(32),
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
				tokenInteropAPI.recover({
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
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: utils.getRandomBytes(32),
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
				tokenInteropAPI.recover({
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
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: utils.getRandomBytes(32),
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
				tokenInteropAPI.recover({
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
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: utils.getRandomBytes(32),
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
				tokenInteropAPI.recover({
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
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: utils.getRandomBytes(32),
					module: tokenModule.name,
					storeKey: Buffer.concat([recipient, defaultTokenID]),
					storePrefix: userStore.subStorePrefix,
					storeValue: codec.encode(userStoreSchema, defaultAccount),
					terminatedChainID: sendingChainID,
				}),
			).resolves.toBeUndefined();
			await expect(
				tokenAPI.getEscrowedAmount(apiContext, sendingChainID, defaultTokenID),
			).resolves.toEqual(
				defaultEscrowAmount -
					defaultAccount.availableBalance -
					defaultAccount.lockedBalances[0].amount,
			);
		});

		it('should credit the address for the total recovered amount', async () => {
			const recipient = utils.getRandomBytes(20);
			await expect(
				tokenInteropAPI.recover({
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
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(0),
					getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: utils.getRandomBytes(32),
					module: tokenModule.name,
					storeKey: Buffer.concat([recipient, defaultTokenID]),
					storePrefix: userStore.subStorePrefix,
					storeValue: codec.encode(userStoreSchema, defaultAccount),
					terminatedChainID: sendingChainID,
				}),
			).resolves.toBeUndefined();
			await expect(
				tokenAPI.getAvailableBalance(apiContext, recipient, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + defaultAccount.lockedBalances[0].amount);
		});
	});
});
