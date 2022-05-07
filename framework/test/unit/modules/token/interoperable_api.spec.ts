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

import { StateStore } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { TokenAPI } from '../../../../src/modules/token';
import {
	CCM_STATUS_OK,
	CHAIN_ID_LENGTH,
	CROSS_CHAIN_COMMAND_ID_FORWARD,
	EMPTY_BYTES,
	MIN_BALANCE,
	MODULE_ID_TOKEN,
	STORE_PREFIX_AVAILABLE_LOCAL_ID,
	STORE_PREFIX_ESCROW,
	STORE_PREFIX_SUPPLY,
	STORE_PREFIX_USER,
	TOKEN_ID_LENGTH,
} from '../../../../src/modules/token/constants';
import { TokenInteroperableAPI } from '../../../../src/modules/token/interoperable_api';
import {
	availableLocalIDStoreSchema,
	escrowStoreSchema,
	supplyStoreSchema,
	userStoreSchema,
} from '../../../../src/modules/token/schemas';
import { getUserStoreKey } from '../../../../src/modules/token/utils';
import { APIContext, createAPIContext, EventQueue } from '../../../../src/node/state_machine';
import { fakeLogger } from '../../../utils/node';

describe('CrossChain Forward command', () => {
	const defaultAddress = getRandomBytes(20);
	const defaultTokenIDAlias = Buffer.alloc(TOKEN_ID_LENGTH, 0);
	const defaultTokenID = Buffer.from([0, 0, 0, 1, 0, 0, 0, 0]);
	const defaultForeignTokenID = Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]);
	const defaultAccount = {
		availableBalance: BigInt(10000000000),
		lockedBalances: [
			{
				moduleID: 12,
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
		certificate: getRandomBytes(20),
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
	let stateStore: StateStore;
	let apiContext: APIContext;

	beforeEach(async () => {
		const moduleID = MODULE_ID_TOKEN;
		tokenAPI = new TokenAPI(moduleID);
		tokenInteropAPI = new TokenInteroperableAPI(moduleID, tokenAPI);
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
		tokenAPI.addDependencies(interopAPI);
		tokenInteropAPI.addDependencies(interopAPI);
		tokenAPI.init({
			minBalances,
		});

		stateStore = new StateStore(new InMemoryKVStore());
		apiContext = createAPIContext({
			stateStore: new StateStore(new InMemoryKVStore()),
			eventQueue: new EventQueue(),
		});
		const userStore = apiContext.getStore(MODULE_ID_TOKEN, STORE_PREFIX_USER);
		await userStore.setWithSchema(
			getUserStoreKey(defaultAddress, defaultTokenIDAlias),
			defaultAccount,
			userStoreSchema,
		);
		await userStore.setWithSchema(
			getUserStoreKey(defaultAddress, defaultForeignTokenID),
			defaultAccount,
			userStoreSchema,
		);

		const supplyStore = apiContext.getStore(MODULE_ID_TOKEN, STORE_PREFIX_SUPPLY);
		await supplyStore.setWithSchema(
			defaultTokenIDAlias.slice(CHAIN_ID_LENGTH),
			{ totalSupply: defaultTotalSupply },
			supplyStoreSchema,
		);

		const nextAvailableLocalIDStore = apiContext.getStore(
			MODULE_ID_TOKEN,
			STORE_PREFIX_AVAILABLE_LOCAL_ID,
		);
		await nextAvailableLocalIDStore.setWithSchema(
			EMPTY_BYTES,
			{ nextAvailableLocalID: Buffer.from([0, 0, 0, 5]) },
			availableLocalIDStoreSchema,
		);

		const escrowStore = apiContext.getStore(MODULE_ID_TOKEN, STORE_PREFIX_ESCROW);
		await escrowStore.setWithSchema(
			Buffer.concat([
				defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
				defaultTokenIDAlias.slice(CHAIN_ID_LENGTH),
			]),
			{ amount: defaultEscrowAmount },
			escrowStoreSchema,
		);
		await escrowStore.setWithSchema(
			Buffer.concat([Buffer.from([3, 0, 0, 0]), defaultTokenIDAlias.slice(CHAIN_ID_LENGTH)]),
			{ amount: defaultEscrowAmount },
			escrowStoreSchema,
		);
	});

	describe('beforeApplyCCM', () => {
		it('should reject if fee is negative', async () => {
			await expect(
				tokenInteropAPI.beforeApplyCCM({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(-3),
						status: CCM_STATUS_OK,
						params: getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
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
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee,
						status: CCM_STATUS_OK,
						params: getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
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
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: fee + defaultEscrowAmount,
						status: CCM_STATUS_OK,
						params: getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
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
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee,
						status: CCM_STATUS_OK,
						params: getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
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
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(-3),
						status: CCM_STATUS_OK,
						params: getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
					trsSender: defaultAddress,
				}),
			).rejects.toThrow('Fee must be greater or equal to zero');
		});

		it('should credit fee to transaction sender if message fee token id is not native', async () => {
			interopAPI.getChannel.mockResolvedValue({ messageFeeTokenID: defaultForeignTokenID });
			await expect(
				tokenInteropAPI.beforeRecoverCCM({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee,
						status: CCM_STATUS_OK,
						params: getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
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
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: fee + defaultEscrowAmount,
						status: CCM_STATUS_OK,
						params: getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
					trsSender: defaultAddress,
				}),
			).resolves.toBeUndefined();
			expect(interopAPI.terminateChain).toHaveBeenCalled();
		});

		it('should deduct escrow account for fee and credit to sender if token id is native', async () => {
			await expect(
				tokenInteropAPI.beforeRecoverCCM({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee,
						status: CCM_STATUS_OK,
						params: getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
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
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(-3),
						status: CCM_STATUS_OK,
						params: getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
				}),
			).rejects.toThrow('Fee must be greater or equal to zero');
		});

		it('should credit receiving chain escrow account for fee if message token id is native', async () => {
			await expect(
				tokenInteropAPI.beforeSendCCM({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee,
						status: CCM_STATUS_OK,
						params: getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
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
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: fee + defaultAccount.availableBalance + BigInt(1),
						status: CCM_STATUS_OK,
						params: getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
				}),
			).rejects.toThrow('does not have sufficient balance for fee');
		});

		it('should deduct fee from fee payer', async () => {
			await expect(
				tokenInteropAPI.beforeSendCCM({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee,
						status: CCM_STATUS_OK,
						params: getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
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
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(-3),
						status: CCM_STATUS_OK,
						params: getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
					moduleID: MODULE_ID_TOKEN,
					storeKey: Buffer.concat([defaultAddress, defaultTokenID]),
					storePrefix: STORE_PREFIX_ESCROW,
					storeValue: codec.encode(userStoreSchema, {
						availableBalance: defaultAccount.availableBalance * BigInt(2),
						lockedBalances: [{ moduleID: 3, amount: BigInt(20) }],
					}),
					terminatedChainID: sendingChainID,
				}),
			).rejects.toThrow('Invalid store prefix');
		});

		it('should reject if store key is not 28 bytes', async () => {
			await expect(
				tokenInteropAPI.recover({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(-3),
						status: CCM_STATUS_OK,
						params: getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
					moduleID: MODULE_ID_TOKEN,
					storeKey: Buffer.concat([defaultAddress, defaultTokenID, Buffer.alloc(20)]),
					storePrefix: STORE_PREFIX_USER,
					storeValue: codec.encode(userStoreSchema, {
						availableBalance: defaultAccount.availableBalance * BigInt(2),
						lockedBalances: [{ moduleID: 3, amount: BigInt(20) }],
					}),
					terminatedChainID: sendingChainID,
				}),
			).rejects.toThrow('Invalid store key');
		});

		it('should reject if token is not native', async () => {
			await expect(
				tokenInteropAPI.recover({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(-3),
						status: CCM_STATUS_OK,
						params: getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
					moduleID: MODULE_ID_TOKEN,
					storeKey: Buffer.concat([defaultAddress, defaultForeignTokenID]),
					storePrefix: STORE_PREFIX_USER,
					storeValue: codec.encode(userStoreSchema, {
						availableBalance: defaultAccount.availableBalance * BigInt(2),
						lockedBalances: [{ moduleID: 3, amount: BigInt(20) }],
					}),
					terminatedChainID: sendingChainID,
				}),
			).rejects.toThrow('does not match with own chain ID');
		});

		it('should reject if not enough balance is escrowed', async () => {
			const recipient = getRandomBytes(20);
			await expect(
				tokenInteropAPI.recover({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(-3),
						status: CCM_STATUS_OK,
						params: getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
					moduleID: MODULE_ID_TOKEN,
					storeKey: Buffer.concat([recipient, defaultTokenID]),
					storePrefix: STORE_PREFIX_USER,
					storeValue: codec.encode(userStoreSchema, {
						availableBalance: defaultEscrowAmount,
						lockedBalances: [{ moduleID: 3, amount: BigInt(20) }],
					}),
					terminatedChainID: sendingChainID,
				}),
			).rejects.toThrow('is not sufficient for');
		});

		it('should deduct escrowed amount for the total recovered amount', async () => {
			const recipient = getRandomBytes(20);
			await expect(
				tokenInteropAPI.recover({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(-3),
						status: CCM_STATUS_OK,
						params: getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
					moduleID: MODULE_ID_TOKEN,
					storeKey: Buffer.concat([recipient, defaultTokenID]),
					storePrefix: STORE_PREFIX_USER,
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
			const recipient = getRandomBytes(20);
			await expect(
				tokenInteropAPI.recover({
					ccm: {
						crossChainCommandID: CROSS_CHAIN_COMMAND_ID_FORWARD,
						moduleID: MODULE_ID_TOKEN,
						nonce: BigInt(1),
						sendingChainID,
						receivingChainID: Buffer.from([0, 0, 0, 1]),
						fee: BigInt(-3),
						status: CCM_STATUS_OK,
						params: getRandomBytes(30),
					},
					feeAddress: defaultAddress,
					getAPIContext: () => apiContext,
					eventQueue: new EventQueue(),
					getStore: (moduleID: number, prefix: number) => stateStore.getStore(moduleID, prefix),
					logger: fakeLogger,
					networkIdentifier: getRandomBytes(32),
					moduleID: MODULE_ID_TOKEN,
					storeKey: Buffer.concat([recipient, defaultTokenID]),
					storePrefix: STORE_PREFIX_USER,
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
