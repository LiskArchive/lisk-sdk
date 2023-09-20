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
import { validator } from '@liskhq/lisk-validator';
import { TokenModule, TokenMethod, ccuParamsSchema } from '../../../../../src';
import { CrossChainTransferCommand } from '../../../../../src/modules/token/cc_commands/cc_transfer';
import {
	CCM_STATUS_OK,
	CHAIN_ID_LENGTH,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	defaultConfig,
	TokenEventResult,
} from '../../../../../src/modules/token/constants';
import { crossChainTransferMessageParams } from '../../../../../src/modules/token/schemas';
import { EscrowStore } from '../../../../../src/modules/token/stores/escrow';
import { UserStore } from '../../../../../src/modules/token/stores/user';
import { EventQueue } from '../../../../../src/state_machine';
import {
	MethodContext,
	createMethodContext,
} from '../../../../../src/state_machine/method_context';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { fakeLogger } from '../../../../utils/mocks';
import { ccmTransferEventSchema } from '../../../../../src/modules/token/events/ccm_transfer';
import { SupplyStore } from '../../../../../src/modules/token/stores/supply';
import { InternalMethod } from '../../../../../src/modules/token/internal_method';
import { InteroperabilityMethod } from '../../../../../src/modules/token/types';

describe('CrossChain Transfer Command', () => {
	const tokenModule = new TokenModule();
	const internalMethod = new InternalMethod(tokenModule.stores, tokenModule.events);
	const defaultAddress = utils.getRandomBytes(20);
	const randomAddress = utils.getRandomBytes(20);
	const ownChainID = Buffer.from([0, 0, 0, 1]);
	const defaultTokenID = Buffer.from([0, 0, 0, 1, 0, 0, 0, 0]);
	const defaultForeignTokenID = Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]);
	const fee = BigInt('1000');
	const defaultAmount = BigInt(100000000);
	const defaultAccount = {
		availableBalance: BigInt(10000000000),
		lockedBalances: [
			{
				module: 'dpos',
				amount: defaultAmount,
			},
		],
	};
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

	let command: CrossChainTransferCommand;
	let method: TokenMethod;
	let interopMethod: InteroperabilityMethod;
	let stateStore: PrefixedStateReadWriter;
	let methodContext: MethodContext;
	let escrowStore: EscrowStore;
	let userStore: UserStore;

	const createTransactionContextWithOverridingCCMAndParams = (
		{ params, ccm }: { params?: Record<string, unknown>; ccm?: Record<string, unknown> } = {
			params: {},
			ccm: {},
		},
	) => {
		const validParams = {
			tokenID: defaultTokenID,
			amount: defaultAmount,
			senderAddress: defaultAddress,
			recipientAddress: defaultAddress,
			data: 'ddd',
		};

		const finalCCM = {
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
			module: tokenModule.name,
			nonce: BigInt(1),
			sendingChainID: Buffer.from([3, 0, 0, 0]),
			receivingChainID: Buffer.from([0, 0, 0, 1]),
			fee: BigInt(3000),
			status: CCM_STATUS_OK,
			params: codec.encode(crossChainTransferMessageParams, {
				...validParams,
				...params,
			}),
			...ccm,
		};

		const context = {
			ccm: finalCCM,
			feeAddress: defaultAddress,
			transaction: {
				senderAddress: defaultAddress,
				fee: BigInt(0),
				params: defaultEncodedCCUParams,
			},
			header: {
				height: 0,
				timestamp: 0,
			},
			stateStore,
			contextStore: new Map(),
			getMethodContext: () => methodContext,
			eventQueue: new EventQueue(0),
			ccmSize: BigInt(30),
			getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
			logger: fakeLogger,
			chainID: ownChainID,
		};

		return context;
	};

	beforeEach(async () => {
		method = new TokenMethod(tokenModule.stores, tokenModule.events, tokenModule.name);
		command = new CrossChainTransferCommand(tokenModule.stores, tokenModule.events);
		interopMethod = {
			getOwnChainAccount: jest.fn().mockResolvedValue({ chainID: Buffer.from([0, 0, 0, 1]) }),
			send: jest.fn(),
			error: jest.fn(),
			terminateChain: jest.fn(),
			getChannel: jest.fn(),
			getMessageFeeTokenID: jest.fn(),
			getMessageFeeTokenIDFromCCM: jest.fn(),
		};
		const config = {
			ownChainID,
			escrowAccountInitializationFee: BigInt(50000000),
			userAccountInitializationFee: BigInt(50000000),
		};
		internalMethod.addDependencies({ payFee: jest.fn() });

		method.addDependencies(interopMethod, internalMethod);
		internalMethod.init(config);
		method.init(config);
		command.init({
			internalMethod,
			tokenMethod: method,
		});

		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());

		methodContext = createMethodContext({
			stateStore,
			eventQueue: new EventQueue(0),
			contextStore: new Map(),
		});
		userStore = tokenModule.stores.get(UserStore);
		await userStore.save(methodContext, defaultAddress, defaultTokenID, defaultAccount);
		await userStore.save(methodContext, defaultAddress, defaultForeignTokenID, defaultAccount);

		const supplyStore = tokenModule.stores.get(SupplyStore);
		await supplyStore.set(methodContext, defaultTokenID, { totalSupply: BigInt(10000000000) });

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
		jest.spyOn(fakeLogger, 'debug');
	});

	describe('verify schema', () => {
		it('should throw if validation fails', () => {
			// Act & Assert
			expect(() =>
				validator.validate(command.schema, {
					tokenID: Buffer.from([0, 0, 0, 1]),
					amount: defaultAmount,
					senderAddress: defaultAddress,
					recipientAddress: defaultAddress,
					data: 'ddd',
				}),
			).toThrow(`Property '.tokenID' minLength not satisfied`);
		});
	});

	describe('verify', () => {
		it('should throw if token is not native to the sending chain, receiving chain', async () => {
			// Arrange
			const params = codec.encode(crossChainTransferMessageParams, {
				tokenID: defaultForeignTokenID,
				amount: defaultAmount,
				senderAddress: defaultAddress,
				recipientAddress: defaultAddress,
				data: 'ddd',
			});

			const ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				module: tokenModule.name,
				nonce: BigInt(1),
				sendingChainID: Buffer.from([3, 0, 0, 0]),
				receivingChainID: Buffer.from([0, 0, 0, 1]),
				fee: BigInt(30000),
				status: CCM_STATUS_OK,
				params,
			};

			const ctx = {
				ccm,
				feeAddress: defaultAddress,
				transaction: {
					senderAddress: defaultAddress,
					fee: BigInt(0),
					params: defaultEncodedCCUParams,
				},
				header: {
					height: 0,
					timestamp: 0,
				},
				stateStore,
				contextStore: new Map(),
				getMethodContext: () => methodContext,
				eventQueue: new EventQueue(0),
				ccmSize: BigInt(30),
				getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
				logger: fakeLogger,
				chainID: utils.getRandomBytes(32),
			};

			// Act & Assert
			await expect(command.verify(ctx)).rejects.toThrow(
				'Token must be native to either the sending or the receiving chain',
			);
		});

		it('should resolve when valid CCM is provided', async () => {
			// Arrange
			const params = codec.encode(crossChainTransferMessageParams, {
				tokenID: defaultTokenID,
				amount: defaultAmount,
				senderAddress: defaultAddress,
				recipientAddress: defaultAddress,
				data: 'ddd',
			});

			const ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				module: tokenModule.name,
				nonce: BigInt(1),
				sendingChainID: Buffer.from([3, 0, 0, 0]),
				receivingChainID: Buffer.from([0, 0, 0, 1]),
				fee: BigInt(30000),
				status: CCM_STATUS_OK,
				params,
			};

			const ctx = {
				ccm,
				feeAddress: defaultAddress,
				transaction: {
					senderAddress: defaultAddress,
					fee: BigInt(0),
					params: defaultEncodedCCUParams,
				},
				header: {
					height: 0,
					timestamp: 0,
				},
				stateStore,
				contextStore: new Map(),
				getMethodContext: () => methodContext,
				eventQueue: new EventQueue(0),
				ccmSize: BigInt(30),
				getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
				logger: fakeLogger,
				chainID: ownChainID,
			};

			// Act & Assert
			await expect(command.verify(ctx)).resolves.toBeUndefined();
			await expect(command.verify(ctx)).resolves.not.toThrow();
		});

		it('should throw if token is own chain and escrowed amount is not sufficient', async () => {
			// Arrange
			const params = codec.encode(crossChainTransferMessageParams, {
				tokenID: defaultTokenID,
				amount: defaultEscrowAmount + BigInt(1),
				senderAddress: defaultAddress,
				recipientAddress: defaultAddress,
				data: 'ddd',
			});

			const ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				module: tokenModule.name,
				nonce: BigInt(1),
				sendingChainID,
				receivingChainID: Buffer.from([0, 0, 0, 1]),
				fee,
				status: CCM_STATUS_OK,
				params,
			};

			const ctx = {
				ccm,
				feeAddress: defaultAddress,
				transaction: {
					senderAddress: defaultAddress,
					fee: BigInt(0),
					params: defaultEncodedCCUParams,
				},
				header: {
					height: 0,
					timestamp: 0,
				},
				stateStore,
				contextStore: new Map(),
				getMethodContext: () => methodContext,
				eventQueue: new EventQueue(0),
				ccmSize: BigInt(30),
				getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
				logger: fakeLogger,
				chainID: ownChainID,
			};

			// Assert
			await expect(command.verify(ctx)).rejects.toThrow('Insufficient balance in escrow account.');
		});
	});

	describe('execute', () => {
		it('should throw if fail to decode the CCM', async () => {
			// Arrange
			const ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				module: tokenModule.name,
				nonce: BigInt(1),
				sendingChainID: Buffer.from([3, 0, 0, 0]),
				receivingChainID: Buffer.from([0, 0, 0, 1]),
				fee: BigInt(30000),
				status: CCM_STATUS_OK,
				params: Buffer.from(''),
			};

			const ctx = {
				ccm,
				feeAddress: defaultAddress,
				transaction: {
					senderAddress: defaultAddress,
					fee: BigInt(0),
					params: defaultEncodedCCUParams,
				},
				header: {
					height: 0,
					timestamp: 0,
				},
				stateStore,
				contextStore: new Map(),
				getMethodContext: () => methodContext,
				eventQueue: new EventQueue(0),
				ccmSize: BigInt(30),
				getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
				logger: fakeLogger,
				chainID: ownChainID,
			};

			// Act & Assert
			await expect(command.execute(ctx)).rejects.toThrow(
				'Message does not contain a property for fieldNumber: 1.',
			);
		});

		it('should reject with error event added to the queue when token id is not supported', async () => {
			// Arrange
			const params = codec.encode(crossChainTransferMessageParams, {
				tokenID: defaultForeignTokenID,
				amount: defaultAmount,
				senderAddress: defaultAddress,
				recipientAddress: defaultAddress,
				data: 'ddd',
			});

			const ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				module: tokenModule.name,
				nonce: BigInt(1),
				sendingChainID: Buffer.from([3, 0, 0, 0]),
				receivingChainID: Buffer.from([0, 0, 0, 1]),
				fee: BigInt(30000),
				status: CCM_STATUS_OK,
				params,
			};

			const ctx = {
				ccm,
				feeAddress: defaultAddress,
				transaction: {
					senderAddress: defaultAddress,
					fee: BigInt(0),
					params: defaultEncodedCCUParams,
				},
				header: {
					height: 0,
					timestamp: 0,
				},
				stateStore,
				contextStore: new Map(),
				getMethodContext: () => methodContext,
				eventQueue: new EventQueue(0),
				ccmSize: BigInt(30),
				getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
				logger: fakeLogger,
				chainID: ownChainID,
			};

			// Act & Assert
			await expect(command.execute(ctx)).rejects.toThrow(
				`tokenID ${defaultForeignTokenID.toString('hex')} is not supported`,
			);

			const events = ctx.eventQueue.getEvents();
			expect(events).toHaveLength(1);
			expect(events[0].toObject().name).toBe('ccmTransfer');
			expect(codec.decode(ccmTransferEventSchema, events[0].toObject().data)).toEqual({
				senderAddress: defaultAddress,
				recipientAddress: defaultAddress,
				tokenID: defaultForeignTokenID,
				amount: defaultAmount,
				receivingChainID: ccm.receivingChainID,
				result: TokenEventResult.TOKEN_NOT_SUPPORTED,
			});
		});

		it('should assign recipient as sender when CCM status is not ok', async () => {
			// Arrange
			const params = codec.encode(crossChainTransferMessageParams, {
				tokenID: defaultTokenID,
				amount: defaultAmount,
				senderAddress: defaultAddress,
				recipientAddress: randomAddress,
				data: 'ddd',
			});

			const ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				module: tokenModule.name,
				nonce: BigInt(1),
				sendingChainID: Buffer.from([3, 0, 0, 0]),
				receivingChainID: Buffer.from([0, 0, 0, 1]),
				fee: BigInt(30000),
				status: -1,
				params,
			};

			const ctx = {
				ccm,
				feeAddress: defaultAddress,
				transaction: {
					senderAddress: defaultAddress,
					fee: BigInt(0),
					params: defaultEncodedCCUParams,
				},
				header: {
					height: 0,
					timestamp: 0,
				},
				stateStore,
				contextStore: new Map(),
				getMethodContext: () => methodContext,
				eventQueue: new EventQueue(0),
				ccmSize: BigInt(30),
				getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
				logger: fakeLogger,
				chainID: ownChainID,
			};

			// Act & Assert
			await expect(command.execute(ctx)).resolves.toBeUndefined();
			const key = userStore.getKey(defaultAddress, defaultTokenID);
			const userData = await userStore.get(methodContext, key);
			expect(userData.availableBalance).toEqual(defaultAccount.availableBalance + defaultAmount);
		});

		it("should initialize account when recipient user store doesn't exist", async () => {
			// Arrange
			const params = codec.encode(crossChainTransferMessageParams, {
				tokenID: defaultTokenID,
				amount: defaultAmount,
				senderAddress: defaultAddress,
				recipientAddress: randomAddress,
				data: 'ddd',
			});

			const ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				module: tokenModule.name,
				nonce: BigInt(1),
				sendingChainID: Buffer.from([3, 0, 0, 0]),
				receivingChainID: Buffer.from([0, 0, 0, 1]),
				fee: BigInt(defaultConfig.userAccountInitializationFee) + BigInt(1),
				status: CCM_STATUS_OK,
				params,
			};

			const ctx = {
				ccm,
				feeAddress: defaultAddress,
				transaction: {
					senderAddress: defaultAddress,
					fee: BigInt(0),
					params: defaultEncodedCCUParams,
				},
				header: {
					height: 0,
					timestamp: 0,
				},
				stateStore,
				contextStore: new Map(),
				getMethodContext: () => methodContext,
				eventQueue: new EventQueue(0),
				ccmSize: BigInt(30),
				getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
				logger: fakeLogger,
				chainID: ownChainID,
			};

			// Act
			await command.execute(ctx);

			await expect(
				method.userSubstoreExists(methodContext, randomAddress, defaultTokenID),
			).resolves.toBe(true);

			const { availableBalance } = await userStore.get(
				methodContext,
				userStore.getKey(randomAddress, defaultTokenID),
			);
			expect(availableBalance).toEqual(defaultAmount);
		});

		it('should deduct from escrow account when tokenID is native', async () => {
			// Arrange
			const params = codec.encode(crossChainTransferMessageParams, {
				tokenID: defaultTokenID,
				amount: defaultAmount,
				senderAddress: defaultAddress,
				recipientAddress: defaultAddress,
				data: 'ddd',
			});

			const ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				module: tokenModule.name,
				nonce: BigInt(1),
				sendingChainID,
				receivingChainID: Buffer.from([0, 0, 0, 1]),
				fee,
				status: CCM_STATUS_OK,
				params,
			};

			const ctx = {
				ccm,
				feeAddress: defaultAddress,
				transaction: {
					senderAddress: defaultAddress,
					fee: BigInt(0),
					params: defaultEncodedCCUParams,
				},
				header: {
					height: 0,
					timestamp: 0,
				},
				stateStore,
				contextStore: new Map(),
				getMethodContext: () => methodContext,
				eventQueue: new EventQueue(0),
				ccmSize: BigInt(30),
				getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
				logger: fakeLogger,
				chainID: ownChainID,
			};

			// Act
			await command.execute(ctx);

			const { availableBalance } = await userStore.get(
				methodContext,
				userStore.getKey(defaultAddress, defaultTokenID),
			);

			const { amount } = await escrowStore.get(
				methodContext,
				userStore.getKey(sendingChainID, defaultTokenID),
			);

			// Assert
			expect(availableBalance).toEqual(defaultAccount.availableBalance + defaultAmount);
			expect(amount).toEqual(defaultEscrowAmount - defaultAmount);
		});

		it('should resolve with recipient receiving amount and a success event when valid CCM is provided', async () => {
			// Arrange
			const params = codec.encode(crossChainTransferMessageParams, {
				tokenID: defaultTokenID,
				amount: defaultAmount,
				senderAddress: defaultAddress,
				recipientAddress: defaultAddress,
				data: 'ddd',
			});

			const ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				module: tokenModule.name,
				nonce: BigInt(1),
				sendingChainID,
				receivingChainID: Buffer.from([0, 0, 0, 1]),
				fee,
				status: CCM_STATUS_OK,
				params,
			};

			const ctx = {
				ccm,
				feeAddress: defaultAddress,
				transaction: {
					senderAddress: defaultAddress,
					fee: BigInt(0),
					params: defaultEncodedCCUParams,
				},
				header: {
					height: 0,
					timestamp: 0,
				},
				stateStore,
				contextStore: new Map(),
				getMethodContext: () => methodContext,
				eventQueue: new EventQueue(0),
				ccmSize: BigInt(30),
				getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
				logger: fakeLogger,
				chainID: ownChainID,
			};

			// Act
			await command.execute(ctx);

			const events = ctx.eventQueue.getEvents();

			const { amount } = await escrowStore.get(
				methodContext,
				userStore.getKey(sendingChainID, defaultTokenID),
			);

			// Assert
			expect(amount).toEqual(defaultEscrowAmount - defaultAmount);
			expect(events).toHaveLength(1);
			expect(events[0].toObject().name).toBe('ccmTransfer');
			expect(codec.decode(ccmTransferEventSchema, events[0].toObject().data)).toEqual({
				senderAddress: defaultAddress,
				recipientAddress: defaultAddress,
				tokenID: defaultTokenID,
				amount: defaultAmount,
				receivingChainID: ccm.receivingChainID,
				result: ccm.status,
			});
		});

		it('should throw when escrow account has insufficient balance', async () => {
			// Arrange
			const params = codec.encode(crossChainTransferMessageParams, {
				tokenID: defaultTokenID,
				amount: defaultEscrowAmount + BigInt(10),
				senderAddress: defaultAddress,
				recipientAddress: defaultAddress,
				data: 'ddd',
			});

			const ccm = {
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				module: tokenModule.name,
				nonce: BigInt(1),
				sendingChainID,
				receivingChainID: Buffer.from([0, 0, 0, 1]),
				fee,
				status: CCM_STATUS_OK,
				params,
			};

			const ctx = {
				ccm,
				feeAddress: defaultAddress,
				transaction: {
					senderAddress: defaultAddress,
					fee: BigInt(0),
					params: defaultEncodedCCUParams,
				},
				header: {
					height: 0,
					timestamp: 0,
				},
				stateStore,
				contextStore: new Map(),
				getMethodContext: () => methodContext,
				eventQueue: new EventQueue(0),
				ccmSize: BigInt(30),
				getStore: (moduleID: Buffer, prefix: Buffer) => stateStore.getStore(moduleID, prefix),
				logger: fakeLogger,
				chainID: ownChainID,
			};

			// Act && Assert
			await expect(command.execute(ctx)).rejects.toThrow('Insufficient balance in escrow account.');
		});

		it('should throw if escrow account does not exist', async () => {
			const escrowAccountNotExistingContext = createTransactionContextWithOverridingCCMAndParams({
				params: { tokenID: Buffer.from([0, 0, 0, 1, 0, 2, 3, 8]) },
			});

			await expect(command.execute(escrowAccountNotExistingContext)).rejects.toThrow(
				'does not exist',
			);
		});
	});
});
