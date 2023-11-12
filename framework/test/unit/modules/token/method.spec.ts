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
import { TokenMethod, TokenModule } from '../../../../src/modules/token';
import {
	CHAIN_ID_LENGTH,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	TokenEventResult,
	USER_ACCOUNT_INITIALIZATION_FEE,
} from '../../../../src/modules/token/constants';
import { AllTokensFromChainSupportedEvent } from '../../../../src/modules/token/events/all_tokens_from_chain_supported';
import { AllTokensFromChainSupportRemovedEvent } from '../../../../src/modules/token/events/all_tokens_from_chain_supported_removed';
import { AllTokensSupportedEvent } from '../../../../src/modules/token/events/all_tokens_supported';
import { AllTokensSupportRemovedEvent } from '../../../../src/modules/token/events/all_tokens_supported_removed';
import { BurnEvent } from '../../../../src/modules/token/events/burn';
import { InitializeEscrowAccountEvent } from '../../../../src/modules/token/events/initialize_escrow_account';
import { InitializeTokenEvent } from '../../../../src/modules/token/events/initialize_token';
import { InitializeUserAccountEvent } from '../../../../src/modules/token/events/initialize_user_account';
import { LockEvent } from '../../../../src/modules/token/events/lock';
import { MintEvent } from '../../../../src/modules/token/events/mint';
import { TokenIDSupportedEvent } from '../../../../src/modules/token/events/token_id_supported';
import { TokenIDSupportRemovedEvent } from '../../../../src/modules/token/events/token_id_supported_removed';
import { TransferEvent } from '../../../../src/modules/token/events/transfer';
import { TransferCrossChainEvent } from '../../../../src/modules/token/events/transfer_cross_chain';
import { UnlockEvent } from '../../../../src/modules/token/events/unlock';
import { InternalMethod } from '../../../../src/modules/token/internal_method';
import { crossChainTransferMessageParams } from '../../../../src/modules/token/schemas';
import { EscrowStore } from '../../../../src/modules/token/stores/escrow';
import { SupplyStore } from '../../../../src/modules/token/stores/supply';
import {
	ALL_SUPPORTED_TOKENS_KEY,
	SupportedTokensStore,
} from '../../../../src/modules/token/stores/supported_tokens';
import { UserStore } from '../../../../src/modules/token/stores/user';
import { MethodContext, createMethodContext, EventQueue } from '../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';

describe('token module', () => {
	const tokenModule = new TokenModule();
	const defaultAddress = utils.getRandomBytes(20);
	const ownChainID = Buffer.from([0, 0, 0, 1]);
	const defaultTokenID = Buffer.concat([ownChainID, Buffer.alloc(4)]);
	const defaultForeignTokenID = Buffer.from([0, 0, 0, 2, 0, 0, 0, 0]);
	const defaultAccount = {
		availableBalance: BigInt(10000000000),
		lockedBalances: [
			{
				module: 'pos',
				amount: BigInt(100000000),
			},
		],
	};
	const defaultTotalSupply = BigInt('100000000000000');
	const defaultEscrowAmount = BigInt('100000000000');
	const defaultUserAccountInitFee = BigInt('50000000');
	const defaultEscrowAccountInitFee = BigInt('50000000');

	let method: TokenMethod;
	let methodContext: MethodContext;

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
		method = new TokenMethod(tokenModule.stores, tokenModule.events, tokenModule.name);
		const internalMethod = new InternalMethod(tokenModule.stores, tokenModule.events);
		const config = {
			ownChainID: Buffer.from([0, 0, 0, 1]),
			escrowAccountInitializationFee: defaultEscrowAccountInitFee,
			userAccountInitializationFee: defaultUserAccountInitFee,
		};
		method.init(config);
		internalMethod.init(config);
		internalMethod.addDependencies({ payFee: jest.fn() });
		await tokenModule.init({
			genesisConfig: {
				chainID: '00000001',
			} as never,
			moduleConfig: {
				accountInitializationFee: USER_ACCOUNT_INITIALIZATION_FEE,
			},
		});
		method.addDependencies(
			{
				send: jest.fn().mockResolvedValue(true),
				getMessageFeeTokenID: jest.fn().mockResolvedValue(defaultTokenID),
			} as never,
			internalMethod,
		);
		methodContext = createMethodContext({
			stateStore: new PrefixedStateReadWriter(new InMemoryPrefixedStateDB()),
			eventQueue: new EventQueue(0).getChildQueue(Buffer.from([0])),
			contextStore: new Map(),
		});
		const userStore = tokenModule.stores.get(UserStore);
		await userStore.save(methodContext, defaultAddress, defaultTokenID, defaultAccount);
		await userStore.save(methodContext, defaultAddress, defaultForeignTokenID, defaultAccount);

		const supplyStore = tokenModule.stores.get(SupplyStore);
		await supplyStore.set(methodContext, defaultTokenID, {
			totalSupply: defaultTotalSupply,
		});

		const escrowStore = tokenModule.stores.get(EscrowStore);
		await escrowStore.set(
			methodContext,
			Buffer.concat([defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH), defaultTokenID]),
			{ amount: defaultEscrowAmount },
		);
	});

	describe('isNativeToken', () => {
		it('should return true when tokenID is native', () => {
			expect(method.isNativeToken(defaultTokenID)).toBeTrue();
		});

		it('should return false if token ID is not native', () => {
			expect(method.isNativeToken(defaultForeignTokenID)).toBeFalse();
		});
	});

	describe('getTokenIDLSK', () => {
		it('should return mainchain token ID', () => {
			expect(method.getTokenIDLSK()).toEqual(Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]));
		});
	});

	describe('userSubstoreExists', () => {
		it('should return zero if data does not exist', async () => {
			await expect(
				method.userSubstoreExists(methodContext, utils.getRandomBytes(20), defaultTokenID),
			).resolves.toBe(false);
		});

		it('should return balance if data exists', async () => {
			await expect(
				method.userSubstoreExists(methodContext, defaultAddress, defaultTokenID),
			).resolves.toBe(true);
		});
	});

	describe('getAvailableBalance', () => {
		it('should return zero if data does not exist', async () => {
			await expect(
				method.getAvailableBalance(methodContext, utils.getRandomBytes(20), defaultTokenID),
			).resolves.toEqual(BigInt(0));
		});

		it('should return balance if data exists', async () => {
			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance);
		});
	});

	describe('getLockedAmount', () => {
		it('should return zero if data does not exist', async () => {
			await expect(
				method.getLockedAmount(methodContext, utils.getRandomBytes(20), defaultTokenID, 'auth'),
			).resolves.toEqual(BigInt(0));
			await expect(
				method.getLockedAmount(methodContext, defaultAddress, defaultTokenID, 'auth'),
			).resolves.toEqual(BigInt(0));
		});

		it('should return balance if data exists', async () => {
			await expect(
				method.getLockedAmount(methodContext, defaultAddress, defaultTokenID, 'pos'),
			).resolves.toEqual(defaultAccount.lockedBalances[0].amount);
		});
	});

	describe('getEscrowedAmount', () => {
		it('should reject if token is not native', async () => {
			await expect(
				method.getEscrowedAmount(
					methodContext,
					defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH),
					defaultForeignTokenID,
				),
			).rejects.toThrow('Only native token can have escrow amount');
		});

		it('should reject if escrow chain is native', async () => {
			await expect(
				method.getEscrowedAmount(methodContext, method['_config'].ownChainID, defaultTokenID),
			).rejects.toThrow('Escrow is not defined for own chain');
		});

		it('should return 0 if escrow account does not exist', async () => {
			await expect(
				method.getEscrowedAmount(
					methodContext,
					defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH),
					Buffer.from([0, 0, 0, 1, 0, 0, 0, 1]),
				),
			).resolves.toBe(BigInt(0));
		});

		it('should return balance if data exists', async () => {
			await expect(
				method.getEscrowedAmount(
					methodContext,
					defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH),
					defaultTokenID,
				),
			).resolves.toEqual(defaultEscrowAmount);
		});
	});

	describe('initializeToken', () => {
		const tokenID = Buffer.concat([ownChainID, Buffer.alloc(4, 255)]);

		it('should reject if token is not native', async () => {
			try {
				await method.initializeToken(methodContext, Buffer.from([2, 0, 0, 0, 0, 0, 0, 0]));
			} catch (e: any) {
				expect(e.message).toBe('Only native token can be initialized.');
				checkEventResult(
					methodContext.eventQueue,
					InitializeTokenEvent,
					TokenEventResult.TOKEN_ID_NOT_NATIVE,
				);
			}
		});

		it('should reject if there is no available local ID', async () => {
			try {
				const supplyStore = tokenModule.stores.get(SupplyStore);
				await supplyStore.set(methodContext, tokenID, {
					totalSupply: defaultTotalSupply,
				});
				await method.initializeToken(methodContext, tokenID);
			} catch (e: any) {
				expect(e.message).toBe('The specified token ID is not available.');
				checkEventResult(
					methodContext.eventQueue,
					InitializeTokenEvent,
					TokenEventResult.TOKEN_ID_NOT_AVAILABLE,
				);
			}
		});

		it('logs initialize token event', async () => {
			await method.initializeToken(methodContext, tokenID);
			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
			checkEventResult(methodContext.eventQueue, InitializeTokenEvent, TokenEventResult.SUCCESSFUL);
			await expect(
				tokenModule.stores.get(SupplyStore).has(methodContext, tokenID),
			).resolves.toBeTrue();
		});
	});

	describe('mint', () => {
		it('should reject if token is not native', async () => {
			await expect(
				method.mint(methodContext, defaultAddress, defaultForeignTokenID, BigInt(100)),
			).rejects.toThrow('Only native token can be minted');

			checkEventResult(
				methodContext.eventQueue,
				MintEvent,
				TokenEventResult.MINT_FAIL_NON_NATIVE_TOKEN,
			);
		});

		it('should reject if token is not initialized', async () => {
			await expect(
				method.mint(
					methodContext,
					defaultAddress,
					Buffer.concat([ownChainID, Buffer.from([0, 0, 0, 1])]),
					BigInt(100),
				),
			).rejects.toThrow('is not initialized');
			checkEventResult(
				methodContext.eventQueue,
				MintEvent,
				TokenEventResult.MINT_FAIL_TOKEN_NOT_INITIALIZED,
			);
		});

		it('should reject if supply exceeds maximum range allowed', async () => {
			await expect(
				method.mint(
					methodContext,
					defaultAddress,
					defaultTokenID,
					BigInt(2) ** BigInt(64) - defaultTotalSupply,
				),
			).rejects.toThrow('exceeds maximum range allowed');
			checkEventResult(
				methodContext.eventQueue,
				MintEvent,
				TokenEventResult.MINT_FAIL_TOTAL_SUPPLY_TOO_BIG,
			);
		});

		it('should not update balance if amount is zero', async () => {
			await expect(
				method.mint(methodContext, defaultAddress, defaultTokenID, BigInt(0)),
			).resolves.toBeUndefined();

			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance);

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should reject if amount is negative', async () => {
			await expect(
				method.mint(methodContext, defaultAddress, defaultTokenID, BigInt(-1)),
			).resolves.toBeUndefined();
		});

		it('should initialize account if account does not exist', async () => {
			await expect(
				method.mint(methodContext, utils.getRandomBytes(20), defaultTokenID, BigInt(100)),
			).resolves.toBeUndefined();
			expect(method['_internalMethod']['_feeMethod'].payFee).toHaveBeenCalledWith(
				expect.anything(),
				method['_config'].userAccountInitializationFee,
			);
			checkEventResult(
				methodContext.eventQueue,
				InitializeUserAccountEvent,
				TokenEventResult.SUCCESSFUL,
				2,
				0,
			);
			checkEventResult(methodContext.eventQueue, MintEvent, TokenEventResult.SUCCESSFUL, 2, 1);
		});

		it('should update recipient balance and total supply', async () => {
			await expect(
				method.mint(methodContext, defaultAddress, defaultTokenID, BigInt(10000)),
			).resolves.toBeUndefined();
			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance + BigInt(10000));
			const supplyStore = tokenModule.stores.get(SupplyStore);
			const { totalSupply } = await supplyStore.get(methodContext, defaultTokenID);
			expect(totalSupply).toEqual(defaultTotalSupply + BigInt(10000));
			checkEventResult(methodContext.eventQueue, MintEvent, TokenEventResult.SUCCESSFUL);
		});
	});

	describe('burn', () => {
		it('should reject if address does not exist', async () => {
			await expect(
				method.burn(
					methodContext,
					utils.getRandomBytes(20),
					defaultTokenID,
					defaultAccount.availableBalance + BigInt(1),
				),
			).rejects.toThrow('does not exist');
			checkEventResult(
				methodContext.eventQueue,
				BurnEvent,
				TokenEventResult.FAIL_INSUFFICIENT_BALANCE,
			);
		});

		it('should reject if address does not have enough balance', async () => {
			await expect(
				method.burn(
					methodContext,
					defaultAddress,
					defaultTokenID,
					defaultAccount.availableBalance + BigInt(1),
				),
			).rejects.toThrow('does not have sufficient balance for amount');
			checkEventResult(
				methodContext.eventQueue,
				BurnEvent,
				TokenEventResult.FAIL_INSUFFICIENT_BALANCE,
			);
		});

		it('should update address balance', async () => {
			await expect(
				method.burn(
					methodContext,
					defaultAddress,
					defaultForeignTokenID,
					defaultAccount.availableBalance,
				),
			).resolves.toBeUndefined();
			await expect(
				method.getAvailableBalance(methodContext, defaultForeignTokenID, defaultTokenID),
			).resolves.toEqual(BigInt(0));

			const supplyStore = tokenModule.stores.get(SupplyStore);
			const { totalSupply } = await supplyStore.get(methodContext, defaultTokenID);
			expect(totalSupply).toEqual(defaultTotalSupply);
			checkEventResult(methodContext.eventQueue, BurnEvent, TokenEventResult.SUCCESSFUL);
		});

		it('should not update address balance if amount is zero', async () => {
			await expect(
				method.burn(methodContext, defaultAddress, defaultTokenID, BigInt(0)),
			).resolves.toBeUndefined();

			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance);

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should reject if amount is negative', async () => {
			await expect(
				method.burn(methodContext, defaultAddress, defaultTokenID, BigInt(-1)),
			).resolves.toBeUndefined();
		});

		it('should update address balance and total supply', async () => {
			await expect(
				method.burn(methodContext, defaultAddress, defaultTokenID, defaultAccount.availableBalance),
			).resolves.toBeUndefined();
			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(BigInt(0));

			const supplyStore = tokenModule.stores.get(SupplyStore);
			const { totalSupply } = await supplyStore.get(methodContext, defaultTokenID);
			expect(totalSupply).toEqual(defaultTotalSupply - defaultAccount.availableBalance);
			checkEventResult(methodContext.eventQueue, BurnEvent, TokenEventResult.SUCCESSFUL);
		});
	});

	describe('initializeUserAccount', () => {
		it('should do nothing if account is already initialized', async () => {
			await expect(
				method.initializeUserAccount(methodContext, defaultAddress, defaultTokenID),
			).resolves.toBeUndefined();
			expect(methodContext.eventQueue.getEvents()).toBeEmpty();
		});

		it('should reject if payFee fails', async () => {
			const newAddress = utils.getRandomBytes(20);
			const feePayingAddress = utils.getRandomBytes(20);
			const userStore = tokenModule.stores.get(UserStore);
			await userStore.addAvailableBalanceWithCreate(
				methodContext,
				feePayingAddress,
				defaultTokenID,
				BigInt(4000000),
			);
			(method['_internalMethod']['_feeMethod'].payFee as jest.Mock).mockImplementation(() => {
				throw new Error('Insufficient fee');
			});

			await expect(
				method.initializeUserAccount(methodContext, newAddress, defaultTokenID),
			).rejects.toThrow('Insufficient fee');
		});

		it('create new account', async () => {
			const newAddress = utils.getRandomBytes(20);

			await expect(
				method.initializeUserAccount(methodContext, newAddress, defaultForeignTokenID),
			).resolves.toBeUndefined();
			expect(method['_internalMethod']['_feeMethod'].payFee).toHaveBeenCalledWith(
				expect.anything(),
				method['_config'].userAccountInitializationFee,
			);
			await expect(
				method.userSubstoreExists(methodContext, newAddress, defaultForeignTokenID),
			).resolves.toBeTrue();
			checkEventResult(
				methodContext.eventQueue,
				InitializeUserAccountEvent,
				TokenEventResult.SUCCESSFUL,
			);
		});
	});

	describe('initializeEscrowAccount', () => {
		it('should do nothing if account is already initialized', async () => {
			await expect(
				method.initializeEscrowAccount(
					methodContext,
					defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH),
					defaultTokenID,
				),
			).resolves.toBeUndefined();
			expect(methodContext.eventQueue.getEvents()).toBeEmpty();
		});

		it('should reject if token id is not native', async () => {
			await expect(
				method.initializeEscrowAccount(
					methodContext,
					Buffer.from([0, 0, 0, 4]),
					defaultForeignTokenID,
				),
			).rejects.toThrow('is not native token');
		});

		it('should reject for own chain ID', async () => {
			await expect(
				method.initializeEscrowAccount(methodContext, method['_config'].ownChainID, defaultTokenID),
			).rejects.toThrow('Can not initialize escrow account for own chain');
		});

		it('should reject if address does not have balance for inititialization fee', async () => {
			(method['_internalMethod']['_feeMethod'].payFee as jest.Mock).mockImplementation(() => {
				throw new Error('Insufficient fee');
			});
			const feePayingAddress = utils.getRandomBytes(20);
			const userStore = tokenModule.stores.get(UserStore);
			await userStore.addAvailableBalanceWithCreate(
				methodContext,
				feePayingAddress,
				defaultTokenID,
				BigInt(40000000),
			);

			await expect(
				method.initializeEscrowAccount(methodContext, Buffer.from([0, 0, 0, 4]), defaultTokenID),
			).rejects.toThrow('Insufficient fee');
		});

		it('should create new account', async () => {
			await expect(
				method.initializeEscrowAccount(methodContext, Buffer.from([0, 0, 0, 4]), defaultTokenID),
			).resolves.toBeUndefined();
			const escrowStore = tokenModule.stores.get(EscrowStore);
			await expect(
				escrowStore.has(methodContext, Buffer.concat([Buffer.from([0, 0, 0, 4]), defaultTokenID])),
			).resolves.toBeTrue();
			expect(method['_internalMethod']['_feeMethod'].payFee).toHaveBeenCalledWith(
				expect.anything(),
				method['_config'].escrowAccountInitializationFee,
			);
			checkEventResult(
				methodContext.eventQueue,
				InitializeEscrowAccountEvent,
				TokenEventResult.SUCCESSFUL,
			);
		});
	});

	describe('transfer', () => {
		it('should reject and add event if sender address does not exist', async () => {
			const newAddress = utils.getRandomBytes(20);
			await expect(
				method.transfer(methodContext, newAddress, defaultAddress, defaultTokenID, BigInt(100)),
			).rejects.toThrow('does not exist');
			checkEventResult(
				methodContext.eventQueue,
				TransferEvent,
				TokenEventResult.FAIL_INSUFFICIENT_BALANCE,
			);
		});

		it('should reject and add eventif sender address does not have sufficient balance', async () => {
			const newAddress = utils.getRandomBytes(20);
			const userStore = tokenModule.stores.get(UserStore);
			await userStore.addAvailableBalanceWithCreate(
				methodContext,
				newAddress,
				defaultForeignTokenID,
				BigInt(0),
			);

			await expect(
				method.transfer(
					methodContext,
					defaultAddress,
					newAddress,
					defaultTokenID,
					defaultAccount.availableBalance + BigInt(100),
				),
			).rejects.toThrow('does not have sufficient balance');
			checkEventResult(
				methodContext.eventQueue,
				TransferEvent,
				TokenEventResult.FAIL_INSUFFICIENT_BALANCE,
			);
		});

		it('should intialize recipient address is not initialized', async () => {
			const newAddress = utils.getRandomBytes(20);
			await expect(
				method.transfer(
					methodContext,
					defaultAddress,
					newAddress,
					defaultTokenID,
					defaultAccount.availableBalance,
				),
			).resolves.toBeUndefined();
			expect(method['_internalMethod']['_feeMethod'].payFee).toHaveBeenCalledWith(
				expect.anything(),
				method['_config'].userAccountInitializationFee,
			);
			checkEventResult(
				methodContext.eventQueue,
				InitializeUserAccountEvent,
				TokenEventResult.SUCCESSFUL,
				2,
				0,
			);
			checkEventResult(methodContext.eventQueue, TransferEvent, TokenEventResult.SUCCESSFUL, 2, 1);
		});

		it('should debit from sender, credit recipient', async () => {
			const newAddress = utils.getRandomBytes(20);
			const userStore = tokenModule.stores.get(UserStore);
			await userStore.addAvailableBalanceWithCreate(
				methodContext,
				newAddress,
				defaultTokenID,
				BigInt(0),
			);

			await expect(
				method.transfer(methodContext, defaultAddress, newAddress, defaultTokenID, BigInt(100)),
			).resolves.toBeUndefined();
			checkEventResult(methodContext.eventQueue, TransferEvent, TokenEventResult.SUCCESSFUL);

			await expect(
				method.getAvailableBalance(methodContext, newAddress, defaultTokenID),
			).resolves.toEqual(BigInt(100));
			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance - BigInt(100));
		});

		it('should reject if amount is zero', async () => {
			await expect(
				method.transfer(methodContext, defaultAddress, defaultAddress, defaultTokenID, BigInt(0)),
			).resolves.toBeUndefined();
		});

		it('should reject if amount is negative', async () => {
			await expect(
				method.transfer(methodContext, defaultAddress, defaultAddress, defaultTokenID, BigInt(-1)),
			).resolves.toBeUndefined();
		});
	});

	describe('transferCrossChain', () => {
		it('should reject when data exceeds max length', async () => {
			await expect(
				method.transferCrossChain(
					methodContext,
					defaultAddress,
					defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH),
					utils.getRandomBytes(20),
					defaultTokenID,
					BigInt('100'),
					BigInt('10000'),
					'!'.repeat(65),
				),
			).rejects.toThrow('Maximum data allowed is');
			checkEventResult(
				methodContext.eventQueue,
				TransferCrossChainEvent,
				TokenEventResult.DATA_TOO_LONG,
			);
		});

		it('should initialize escrow account when token is native and escrow account is not initialized', async () => {
			await expect(
				method.transferCrossChain(
					methodContext,
					defaultAddress,
					Buffer.from([0, 0, 0, 4]),
					utils.getRandomBytes(20),
					defaultTokenID,
					BigInt('100'),
					BigInt('10000'),
					'data',
				),
			).resolves.toBeUndefined();
			expect(method['_internalMethod']['_feeMethod'].payFee).toHaveBeenCalledWith(
				expect.anything(),
				method['_config'].escrowAccountInitializationFee,
			);
			checkEventResult(
				methodContext.eventQueue,
				InitializeEscrowAccountEvent,
				TokenEventResult.SUCCESSFUL,
				2,
				0,
			);
			checkEventResult(
				methodContext.eventQueue,
				TransferCrossChainEvent,
				TokenEventResult.SUCCESSFUL,
				2,
				1,
			);
		});

		it('should reject when sender does not have balance for message fee', async () => {
			const newAddress = utils.getRandomBytes(20);
			const userStore = tokenModule.stores.get(UserStore);
			await userStore.addAvailableBalanceWithCreate(
				methodContext,
				newAddress,
				defaultForeignTokenID,
				BigInt(150),
			);

			jest
				.spyOn(method['_interoperabilityMethod'], 'getMessageFeeTokenID')
				.mockResolvedValue(defaultForeignTokenID);

			await expect(
				method.transferCrossChain(
					methodContext,
					newAddress,
					defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH),
					utils.getRandomBytes(20),
					defaultTokenID,
					BigInt('100'),
					BigInt('10000'),
					'data',
				),
			).rejects.toThrow('does not have sufficient balance');
			checkEventResult(
				methodContext.eventQueue,
				TransferCrossChainEvent,
				TokenEventResult.FAIL_INSUFFICIENT_BALANCE,
			);
		});

		it('should reject when sender does not have balance for amount', async () => {
			const newAddress = utils.getRandomBytes(20);
			const userStore = tokenModule.stores.get(UserStore);
			await userStore.addAvailableBalanceWithCreate(
				methodContext,
				newAddress,
				defaultForeignTokenID,
				BigInt(10000),
			);
			await userStore.addAvailableBalanceWithCreate(
				methodContext,
				newAddress,
				defaultTokenID,
				BigInt(99),
			);

			jest
				.spyOn(method['_interoperabilityMethod'], 'getMessageFeeTokenID')
				.mockResolvedValue(defaultForeignTokenID);

			await expect(
				method.transferCrossChain(
					methodContext,
					newAddress,
					defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH),
					utils.getRandomBytes(20),
					defaultTokenID,
					BigInt('100'),
					BigInt('10000'),
					'data',
				),
			).rejects.toThrow('does not have sufficient balance');
			checkEventResult(
				methodContext.eventQueue,
				TransferCrossChainEvent,
				TokenEventResult.FAIL_INSUFFICIENT_BALANCE,
			);
		});

		it('should reject when sender does not have balance for amount and message fee when token is the same', async () => {
			const newAddress = utils.getRandomBytes(20);
			const userStore = tokenModule.stores.get(UserStore);
			await userStore.addAvailableBalanceWithCreate(
				methodContext,
				newAddress,
				defaultTokenID,
				BigInt(150),
			);

			await expect(
				method.transferCrossChain(
					methodContext,
					newAddress,
					defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH),
					utils.getRandomBytes(20),
					defaultTokenID,
					BigInt('100'),
					BigInt('10000'),
					'data',
				),
			).rejects.toThrow('does not have sufficient balance');
			checkEventResult(
				methodContext.eventQueue,
				TransferCrossChainEvent,
				TokenEventResult.FAIL_INSUFFICIENT_BALANCE,
			);
		});

		it('should reject if token is not native to sending or receiving chain nor mainchain', async () => {
			const unknownToken = Buffer.from([1, 2, 3, 4, 0, 0, 0, 0]);
			const newAddress = utils.getRandomBytes(20);
			const userStore = tokenModule.stores.get(UserStore);
			await userStore.addAvailableBalanceWithCreate(
				methodContext,
				defaultAddress,
				unknownToken,
				BigInt(15000000),
			);
			await userStore.addAvailableBalanceWithCreate(
				methodContext,
				newAddress,
				defaultTokenID,
				BigInt(15000000),
			);
			await expect(
				method.transferCrossChain(
					methodContext,
					defaultAddress,
					defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH),
					utils.getRandomBytes(20),
					unknownToken,
					BigInt(100000),
					BigInt('10000'),
					'data',
				),
			).rejects.toThrow('Token must be native to either the sending or the receiving chain');
			checkEventResult(
				methodContext.eventQueue,
				TransferCrossChainEvent,
				TokenEventResult.INVALID_TOKEN_ID,
			);
		});

		it('should reject if receiving chain is own chain', async () => {
			await expect(
				method.transferCrossChain(
					methodContext,
					defaultAddress,
					method['_config'].ownChainID,
					utils.getRandomBytes(20),
					defaultTokenID,
					BigInt('100000'),
					BigInt('10000'),
					'data',
				),
			).rejects.toThrow('Receiving chain cannot be the sending chain.');
			checkEventResult(
				methodContext.eventQueue,
				TransferCrossChainEvent,
				TokenEventResult.INVALID_RECEIVING_CHAIN,
			);
		});

		it('should debit amount from sender and move to escrow', async () => {
			await expect(
				method.transferCrossChain(
					methodContext,
					defaultAddress,
					defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH),
					utils.getRandomBytes(20),
					defaultTokenID,
					BigInt('100000'),
					BigInt('10000'),
					'data',
				),
			).resolves.toBeUndefined();
			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance - BigInt('100000'));
			const escrowStore = tokenModule.stores.get(EscrowStore);
			const { amount } = await escrowStore.get(
				methodContext,
				escrowStore.getKey(defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH), defaultTokenID),
			);
			expect(amount).toEqual(defaultEscrowAmount + BigInt('100000'));
			checkEventResult(
				methodContext.eventQueue,
				TransferCrossChainEvent,
				TokenEventResult.SUCCESSFUL,
			);
		});

		it('should send information to interoperability', async () => {
			jest.spyOn(method['_interoperabilityMethod'], 'send').mockResolvedValue();
			const recipient = utils.getRandomBytes(20);
			await method.transferCrossChain(
				methodContext,
				defaultAddress,
				defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH),
				recipient,
				defaultTokenID,
				BigInt('100000'),
				BigInt('10000'),
				'data',
			);

			expect(method['_interoperabilityMethod'].send).toHaveBeenCalledWith(
				expect.anything(),
				defaultAddress,
				'token',
				CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH),
				BigInt('10000'),
				codec.encode(crossChainTransferMessageParams, {
					tokenID: defaultTokenID,
					amount: BigInt('100000'),
					senderAddress: defaultAddress,
					recipientAddress: recipient,
					data: 'data',
				}),
			);
			checkEventResult(
				methodContext.eventQueue,
				TransferCrossChainEvent,
				TokenEventResult.SUCCESSFUL,
			);
		});

		it('should reject if amount is zero', async () => {
			await expect(
				method.transferCrossChain(
					methodContext,
					defaultAddress,
					defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH),
					utils.getRandomBytes(20),
					defaultTokenID,
					BigInt(0),
					BigInt('10000'),
					'data',
				),
			).resolves.toBeUndefined();
		});

		it('should reject if amount is negative', async () => {
			await expect(
				method.transferCrossChain(
					methodContext,
					defaultAddress,
					defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH),
					utils.getRandomBytes(20),
					defaultTokenID,
					BigInt(-1),
					BigInt('10000'),
					'data',
				),
			).resolves.toBeUndefined();
		});

		it('should reject if messageFee is negative', async () => {
			await expect(
				method.transferCrossChain(
					methodContext,
					defaultAddress,
					defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH),
					utils.getRandomBytes(20),
					defaultTokenID,
					BigInt('100000'),
					BigInt(-1),
					'data',
				),
			).resolves.toBeUndefined();
		});
	});

	describe('lock', () => {
		it('should reject if address does not exist', async () => {
			await expect(
				method.lock(
					methodContext,
					utils.getRandomBytes(20),
					'pos',
					defaultTokenID,
					defaultAccount.availableBalance + BigInt(1),
				),
			).rejects.toThrow('does not exist');
			checkEventResult(
				methodContext.eventQueue,
				LockEvent,
				TokenEventResult.FAIL_INSUFFICIENT_BALANCE,
			);
		});

		it('should reject if address does not have enough balance', async () => {
			await expect(
				method.lock(
					methodContext,
					defaultAddress,
					'pos',
					defaultTokenID,
					defaultAccount.availableBalance + BigInt(1),
				),
			).rejects.toThrow('does not have sufficient balance for amount');
			checkEventResult(
				methodContext.eventQueue,
				LockEvent,
				TokenEventResult.FAIL_INSUFFICIENT_BALANCE,
			);
		});

		it('should not update availableBalance and lockedBalance for module if amount is zero', async () => {
			await expect(
				method.lock(methodContext, defaultAddress, 'token', defaultTokenID, BigInt(0)),
			).resolves.toBeUndefined();

			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance);

			await expect(
				method.getLockedAmount(methodContext, defaultAddress, defaultTokenID, 'pos'),
			).resolves.toBe(defaultAccount.lockedBalances[0].amount);

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should reject if amount is negative', async () => {
			await expect(
				method.lock(methodContext, defaultAddress, 'pos', defaultTokenID, BigInt(-1)),
			).resolves.toBeUndefined();
		});

		it('should update address balance', async () => {
			await expect(
				method.lock(
					methodContext,
					defaultAddress,
					'token',
					defaultTokenID,
					defaultAccount.availableBalance,
				),
			).resolves.toBeUndefined();
			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(BigInt(0));
			checkEventResult(methodContext.eventQueue, LockEvent, TokenEventResult.SUCCESSFUL);
		});

		it('should update locked balances to be sorted by module ID', async () => {
			await expect(
				method.lock(
					methodContext,
					defaultAddress,
					'token',
					defaultTokenID,
					defaultAccount.availableBalance,
				),
			).resolves.toBeUndefined();
			const userStore = tokenModule.stores.get(UserStore);
			const { lockedBalances } = await userStore.get(
				methodContext,
				userStore.getKey(defaultAddress, defaultTokenID),
			);
			expect(lockedBalances[0].module).toBe('pos');
			checkEventResult(methodContext.eventQueue, LockEvent, TokenEventResult.SUCCESSFUL);
		});
	});

	describe('unlock', () => {
		it('should reject if address does not exist', async () => {
			await expect(
				method.unlock(methodContext, utils.getRandomBytes(20), 'pos', defaultTokenID, BigInt(10)),
			).rejects.toThrow('does not exist');
			checkEventResult(
				methodContext.eventQueue,
				UnlockEvent,
				TokenEventResult.FAIL_INSUFFICIENT_BALANCE,
			);
		});

		it('should reject if address does not have any corresponding locked balance for the specified module', async () => {
			await expect(
				method.unlock(methodContext, defaultAddress, 'sample', defaultTokenID, BigInt(100)),
			).rejects.toThrow('does not have locked balance for module sample');
			checkEventResult(
				methodContext.eventQueue,
				UnlockEvent,
				TokenEventResult.INSUFFICIENT_LOCKED_AMOUNT,
			);
		});

		it('should reject if address does not have sufficient corresponding locked balance for the specified module', async () => {
			await expect(
				method.unlock(
					methodContext,
					defaultAddress,
					'pos',
					defaultTokenID,
					defaultAccount.lockedBalances[0].amount + BigInt(1),
				),
			).rejects.toThrow('does not have sufficient locked balance for amount');
			checkEventResult(
				methodContext.eventQueue,
				UnlockEvent,
				TokenEventResult.INSUFFICIENT_LOCKED_AMOUNT,
			);
		});

		it('should not update availableBalance and lockedBalance for module if amount is zero', async () => {
			await expect(
				method.unlock(methodContext, defaultAddress, 'pos', defaultTokenID, BigInt(0)),
			).resolves.toBeUndefined();

			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance);

			await expect(
				method.getLockedAmount(methodContext, defaultAddress, defaultTokenID, 'pos'),
			).resolves.toBe(defaultAccount.lockedBalances[0].amount);

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should reject if amount is negative', async () => {
			await expect(
				method.unlock(methodContext, defaultAddress, 'pos', defaultTokenID, BigInt(-1)),
			).resolves.toBeUndefined();
		});

		it('should update address balance', async () => {
			await expect(
				method.unlock(
					methodContext,
					defaultAddress,
					'pos',
					defaultTokenID,
					defaultAccount.lockedBalances[0].amount - BigInt(1),
				),
			).resolves.toBeUndefined();
			const userStore = tokenModule.stores.get(UserStore);
			const { lockedBalances } = await userStore.get(
				methodContext,
				userStore.getKey(defaultAddress, defaultTokenID),
			);
			expect(lockedBalances[0].amount).toEqual(BigInt(1));
			checkEventResult(methodContext.eventQueue, UnlockEvent, TokenEventResult.SUCCESSFUL);
		});

		it('should remove lockedBalances entry if amount becomes zero', async () => {
			await expect(
				method.unlock(
					methodContext,
					defaultAddress,
					'pos',
					defaultTokenID,
					defaultAccount.lockedBalances[0].amount,
				),
			).resolves.toBeUndefined();
			const userStore = tokenModule.stores.get(UserStore);
			const { lockedBalances } = await userStore.get(
				methodContext,
				userStore.getKey(defaultAddress, defaultTokenID),
			);
			expect(lockedBalances).toHaveLength(0);
			checkEventResult(methodContext.eventQueue, UnlockEvent, TokenEventResult.SUCCESSFUL);
		});
	});

	describe('payMessageFee', () => {
		it('should reject if fee is negative', async () => {
			await expect(
				method.payMessageFee(
					methodContext,
					defaultAddress,
					defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH),
					BigInt(-1),
				),
			).rejects.toThrow('Invalid Message Fee');
		});

		it('should reject if address does not have sufficient balance', async () => {
			await expect(
				method.payMessageFee(
					methodContext,
					defaultAddress,
					defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH),
					defaultAccount.availableBalance + BigInt(1),
				),
			).rejects.toThrow('does not have sufficient balance');
		});

		it('should escrow if fee is native token', async () => {
			await expect(
				method.payMessageFee(
					methodContext,
					defaultAddress,
					defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH),
					BigInt(100),
				),
			).resolves.toBeUndefined();
			const escrowStore = tokenModule.stores.get(EscrowStore);
			const { amount } = await escrowStore.get(
				methodContext,
				escrowStore.getKey(defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH), defaultTokenID),
			);
			expect(amount).toEqual(defaultEscrowAmount + BigInt('100'));
		});

		it('should debit fee from the address', async () => {
			await expect(
				method.payMessageFee(
					methodContext,
					defaultAddress,
					defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH),
					BigInt(100),
				),
			).resolves.toBeUndefined();
			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance - BigInt('100'));
		});
	});

	describe('supportAllTokens', () => {
		it('should call support all token', async () => {
			const supportAllSpy = jest.spyOn(tokenModule.stores.get(SupportedTokensStore), 'supportAll');
			await expect(method.supportAllTokens(methodContext)).resolves.toBeUndefined();

			expect(supportAllSpy).toHaveBeenCalledOnce();
			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
			expect(methodContext.eventQueue.getEvents()[0].toObject().name).toEqual(
				new AllTokensSupportedEvent('token').name,
			);
		});
	});

	describe('removeAllTokensSupport', () => {
		it('should call remove support all token', async () => {
			const supportedTokensStore = tokenModule.stores.get(SupportedTokensStore);

			await supportedTokensStore.supportAll(methodContext);
			const removeAllSpy = jest.spyOn(supportedTokensStore, 'removeAll');
			await expect(method.removeAllTokensSupport(methodContext)).resolves.toBeUndefined();

			expect(removeAllSpy).toHaveBeenCalledOnce();
			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
			expect(methodContext.eventQueue.getEvents()[0].toObject().name).toEqual(
				new AllTokensSupportRemovedEvent('token').name,
			);
		});
	});

	describe('supportAllTokensFromChainID', () => {
		it('should return early if all tokens are already supported', async () => {
			await tokenModule.stores
				.get(SupportedTokensStore)
				.set(methodContext, ALL_SUPPORTED_TOKENS_KEY, { supportedTokenIDs: [] });

			await expect(
				method.supportAllTokensFromChainID(methodContext, Buffer.from([1, 2, 3, 4])),
			).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should return early if the chain ID is the same as the own chain ID', async () => {
			const chainID = Buffer.from([1, 2, 3, 4]);
			method['_config'].ownChainID = chainID;

			await method.supportAllTokensFromChainID(methodContext, chainID);

			await expect(
				method.supportAllTokensFromChainID(methodContext, chainID),
			).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should set an empty array of supported token IDs for the chain ID', async () => {
			await tokenModule.stores
				.get(SupportedTokensStore)
				.set(methodContext, ALL_SUPPORTED_TOKENS_KEY, { supportedTokenIDs: [] });

			await expect(
				method.supportAllTokensFromChainID(methodContext, Buffer.from([1, 2, 3, 4])),
			).resolves.toBeUndefined();

			const supportedTokens = await tokenModule.stores
				.get(SupportedTokensStore)
				.get(methodContext, ALL_SUPPORTED_TOKENS_KEY);

			expect(supportedTokens.supportedTokenIDs).toHaveLength(0);
		});

		it('should log AllTokensFromChainSupportedEvent', async () => {
			await expect(
				method.supportAllTokensFromChainID(methodContext, Buffer.from([1, 2, 3, 4])),
			).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
			expect(methodContext.eventQueue.getEvents()[0].toObject().name).toEqual(
				new AllTokensFromChainSupportedEvent('token').name,
			);
		});
	});

	describe('removeAllTokensSupportFromChainID', () => {
		it('should call remove support from chain', async () => {
			await tokenModule.stores
				.get(SupportedTokensStore)
				.supportChain(methodContext, Buffer.from([1, 2, 3, 4]));
			await expect(
				method.removeAllTokensSupportFromChainID(methodContext, Buffer.from([1, 2, 3, 4])),
			).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
			expect(methodContext.eventQueue.getEvents()[0].toObject().name).toEqual(
				new AllTokensFromChainSupportRemovedEvent('token').name,
			);
		});

		it('should throw an error if all tokens from all chains are supported', async () => {
			await tokenModule.stores
				.get(SupportedTokensStore)
				.set(methodContext, ALL_SUPPORTED_TOKENS_KEY, { supportedTokenIDs: [] });

			await expect(
				method.removeAllTokensSupportFromChainID(methodContext, Buffer.from([1, 2, 3, 4])),
			).rejects.toThrow('Invalid operation. All tokens from all chains are supported.');

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should throw an error if the chain ID is the same as the own chain ID', async () => {
			const chainID = Buffer.from([1, 2, 3, 4]);
			method['_config'].ownChainID = chainID;

			await expect(
				method.removeAllTokensSupportFromChainID(methodContext, chainID),
			).rejects.toThrow(
				'Invalid operation. All tokens from all the specified chain should be supported.',
			);

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should return early if there are no supportedTokens', async () => {
			await expect(
				method.removeAllTokensSupportFromChainID(methodContext, Buffer.from([1, 2, 3, 4])),
			).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should remove the chain ID from the supported tokens store', async () => {
			await tokenModule.stores
				.get(SupportedTokensStore)
				.supportChain(methodContext, Buffer.from([1, 2, 3, 4]));

			await expect(
				method.removeAllTokensSupportFromChainID(methodContext, Buffer.from([1, 2, 3, 4])),
			).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
			expect(methodContext.eventQueue.getEvents()[0].toObject().name).toEqual(
				new AllTokensFromChainSupportRemovedEvent('token').name,
			);
		});
	});

	describe('supportTokenID', () => {
		it('should call support token', async () => {
			const supportTokenSpy = jest.spyOn(
				tokenModule.stores.get(SupportedTokensStore),
				'supportToken',
			);
			await expect(
				method.supportTokenID(methodContext, Buffer.from([1, 2, 3, 4, 0, 0, 0, 0])),
			).resolves.toBeUndefined();

			expect(supportTokenSpy).toHaveBeenCalledOnce();
			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
			expect(methodContext.eventQueue.getEvents()[0].toObject().name).toEqual(
				new TokenIDSupportedEvent('token').name,
			);
		});
	});

	describe('removeSupport', () => {
		it('should call remove support for token', async () => {
			await expect(
				method.removeSupport(methodContext, Buffer.from([1, 2, 3, 4, 0, 0, 0, 0])),
			).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
			expect(methodContext.eventQueue.getEvents()[0].toObject().name).toEqual(
				new TokenIDSupportRemovedEvent('token').name,
			);
		});

		it('should throw an error if all tokens are supported', async () => {
			await tokenModule.stores
				.get(SupportedTokensStore)
				.set(methodContext, ALL_SUPPORTED_TOKENS_KEY, { supportedTokenIDs: [] });

			await expect(
				method.removeSupport(methodContext, Buffer.from([1, 2, 3, 4, 0, 0, 0, 0])),
			).rejects.toThrow('All tokens are supported.');

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should throw an error if the specified token is the mainchain token or the own chain ID', async () => {
			const tokenId = Buffer.from([1, 2, 3, 4, 0, 0, 0, 0]);
			const chainID = Buffer.from([1, 2, 3, 4]);
			method['_config'].ownChainID = chainID;

			await expect(method.removeSupport(methodContext, tokenId)).rejects.toThrow(
				'Cannot remove support for the specified token.',
			);

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should return early and log an event if the specified token is not supported', async () => {
			const tokenId = Buffer.from([1, 2, 3, 4, 0, 0, 0, 0]);

			await expect(method.removeSupport(methodContext, tokenId)).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
			expect(methodContext.eventQueue.getEvents()[0].toObject().name).toEqual(
				new TokenIDSupportRemovedEvent('token').name,
			);
		});

		it('should throw an error if all tokens from the specified chain are supported', async () => {
			const tokenId = Buffer.from([1, 2, 3, 4, 0, 0, 0, 0]);
			const chainID = Buffer.from([1, 2, 3, 4]);

			await tokenModule.stores.get(SupportedTokensStore).supportChain(methodContext, chainID);

			await expect(method.removeSupport(methodContext, tokenId)).rejects.toThrow(
				'All tokens from the specified chain are supported.',
			);

			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
		});

		it('should remove the specified token from the supported tokens list', async () => {
			const tokenId = Buffer.from([1, 2, 3, 4, 0, 0, 0, 0]);

			await tokenModule.stores.get(SupportedTokensStore).supportToken(methodContext, tokenId);

			await expect(method.removeSupport(methodContext, tokenId)).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
			expect(methodContext.eventQueue.getEvents()[0].toObject().name).toEqual(
				new TokenIDSupportRemovedEvent('token').name,
			);
		});

		it('should log an event when support is removed for token', async () => {
			const tokenId = Buffer.from([1, 2, 3, 4, 0, 0, 0, 0]);

			await expect(method.removeSupport(methodContext, tokenId)).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
			expect(methodContext.eventQueue.getEvents()[0].toObject().name).toEqual(
				new TokenIDSupportRemovedEvent('token').name,
			);
		});
	});

	describe('getTotalSupply', () => {
		it('should return the total supply', async () => {
			await expect(method.getTotalSupply(methodContext)).resolves.toEqual({
				totalSupply: [
					{
						tokenID: defaultTokenID,
						totalSupply: defaultTotalSupply,
					},
				],
			});
		});
	});

	describe('escrowSubstoreExists', () => {
		const escrowChainID = defaultForeignTokenID.subarray(0, CHAIN_ID_LENGTH);

		it('should return false if escrow subStore does not exist for the given chain id and token id', async () => {
			const escrowStore = tokenModule.stores.get(EscrowStore);
			await escrowStore.del(methodContext, escrowStore.getKey(escrowChainID, defaultTokenID));
			await expect(
				method.escrowSubstoreExists(methodContext, escrowChainID, defaultTokenID),
			).resolves.toBeFalse();
		});

		it('should return true if escrow subStore exists for the given chain id and token id', async () => {
			await expect(
				method.escrowSubstoreExists(methodContext, escrowChainID, defaultTokenID),
			).resolves.toBeTrue();
		});
	});

	describe('isTokenIDAvailable', () => {
		it('should return true if provided tokenID exists in SupplyStore', async () => {
			await expect(method.isTokenSupported(methodContext, defaultTokenID)).resolves.toBeTrue();
		});

		it('should return false if provided tokenID does not exist in SupplyStore', async () => {
			await expect(method.isTokenSupported(methodContext, Buffer.alloc(8, 1))).resolves.toBeFalse();
		});
	});
});
