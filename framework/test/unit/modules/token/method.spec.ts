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
	CCM_STATUS_OK,
	CHAIN_ID_LENGTH,
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	TokenEventResult,
	USER_SUBSTORE_INITIALIZATION_FEE,
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
import { crossChainTransferMessageParams } from '../../../../src/modules/token/schemas';
import { EscrowStore } from '../../../../src/modules/token/stores/escrow';
import { SupplyStore } from '../../../../src/modules/token/stores/supply';
import { SupportedTokensStore } from '../../../../src/modules/token/stores/supported_tokens';
import { UserStore } from '../../../../src/modules/token/stores/user';
import { MethodContext, createMethodContext, EventQueue } from '../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { DEFAULT_LOCAL_ID } from '../../../utils/mocks/transaction';

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
				module: 'dpos',
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
		method.init({
			ownChainID: Buffer.from([0, 0, 0, 1]),
			escrowAccountInitializationFee: defaultEscrowAccountInitFee,
			userAccountInitializationFee: defaultUserAccountInitFee,
			feeTokenID: defaultTokenID,
			minBalances: [
				{
					tokenID: DEFAULT_LOCAL_ID,
					amount: BigInt(5000000),
				},
			],
		});
		await tokenModule.init({
			genesisConfig: {
				chainID: '00000001',
			} as never,
			generatorConfig: {},
			moduleConfig: {
				accountInitializationFee: USER_SUBSTORE_INITIALIZATION_FEE,
			},
		});
		method.addDependencies({
			send: jest.fn().mockResolvedValue(true),
			getMessageFeeTokenID: jest.fn().mockResolvedValue(defaultTokenID),
		} as never);
		methodContext = createMethodContext({
			stateStore: new PrefixedStateReadWriter(new InMemoryPrefixedStateDB()),
			eventQueue: new EventQueue(0).getChildQueue(Buffer.from([0])),
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
			Buffer.concat([defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH), defaultTokenID]),
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

	describe('getMainchainTokenID', () => {
		it('should return mainchain token ID', () => {
			expect(method.getMainchainTokenID()).toEqual(Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]));
		});
	});

	describe('userAccountExists', () => {
		it('should return zero if data does not exist', async () => {
			await expect(
				method.userAccountExists(methodContext, utils.getRandomBytes(20), defaultTokenID),
			).resolves.toEqual(false);
		});

		it('should return balance if data exists', async () => {
			await expect(
				method.userAccountExists(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(true);
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
				method.getLockedAmount(methodContext, defaultAddress, defaultTokenID, 'dpos'),
			).resolves.toEqual(defaultAccount.lockedBalances[0].amount);
		});
	});

	describe('getEscrowedAmount', () => {
		it('should reject if token is not native', async () => {
			await expect(
				method.getEscrowedAmount(
					methodContext,
					defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
					defaultForeignTokenID,
				),
			).rejects.toThrow('Only native token can have escrow amount');
		});

		it('should reject if escrow account does not exist', async () => {
			await expect(
				method.getEscrowedAmount(
					methodContext,
					defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
					Buffer.from([0, 0, 0, 1, 0, 0, 0, 1]),
				),
			).rejects.toThrow('does not exist');
		});

		it('should return balance if data exists', async () => {
			await expect(
				method.getEscrowedAmount(
					methodContext,
					defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
					defaultTokenID,
				),
			).resolves.toEqual(defaultEscrowAmount);
		});
	});

	describe('initializeToken', () => {
		it('should reject if there is no available local ID', async () => {
			const supplyStore = tokenModule.stores.get(SupplyStore);
			await supplyStore.set(methodContext, Buffer.concat([ownChainID, Buffer.alloc(4, 255)]), {
				totalSupply: defaultTotalSupply,
			});
			await expect(method.initializeToken(methodContext)).rejects.toThrow('No available token ID');
		});

		it('should return next tokenID', async () => {
			await expect(method.initializeToken(methodContext)).resolves.toEqual(
				Buffer.concat([ownChainID, Buffer.from([0, 0, 0, 1])]),
			);
		});

		it('log initialize token event', async () => {
			await method.initializeToken(methodContext);
			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
			expect(
				codec.decode<Record<string, unknown>>(
					new InitializeTokenEvent('token').schema,
					methodContext.eventQueue.getEvents()[0].toObject().data,
				).tokenID,
			).toEqual(Buffer.concat([ownChainID, Buffer.from([0, 0, 0, 1])]));
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

		it('should reject if supply exceed max balance', async () => {
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

		it('should reject if receiving address does not exist', async () => {
			await expect(
				method.mint(methodContext, utils.getRandomBytes(20), defaultTokenID, BigInt(100)),
			).rejects.toThrow('does not exist');
			checkEventResult(
				methodContext.eventQueue,
				MintEvent,
				TokenEventResult.FAIL_RECIPIENT_NOT_INITIALIZED,
			);
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
				method.initializeUserAccount(
					methodContext,
					defaultAddress,
					defaultTokenID,
					defaultAddress,
					defaultUserAccountInitFee,
				),
			).resolves.toBeUndefined();
			expect(methodContext.eventQueue.getEvents()).toBeEmpty();
		});

		it('should reject if inititialization fee is not matching the config', async () => {
			const newAddress = utils.getRandomBytes(20);
			await expect(
				method.initializeUserAccount(
					methodContext,
					newAddress,
					defaultTokenID,
					defaultAddress,
					BigInt(100),
				),
			).rejects.toThrow('Invalid initialization fee');
			checkEventResult(
				methodContext.eventQueue,
				InitializeUserAccountEvent,
				TokenEventResult.INVALID_INITIALIZATION_FEE_VALUE,
			);
		});

		it('should reject if address does not have balance for inititialization fee', async () => {
			const newAddress = utils.getRandomBytes(20);
			const feePayingAddress = utils.getRandomBytes(20);
			const userStore = tokenModule.stores.get(UserStore);
			await userStore.addAvailableBalanceWithCreate(
				methodContext,
				feePayingAddress,
				defaultTokenID,
				BigInt(4000000),
			);

			await expect(
				method.initializeUserAccount(
					methodContext,
					newAddress,
					defaultTokenID,
					feePayingAddress,
					defaultUserAccountInitFee,
				),
			).rejects.toThrow('Insufficient balance');
			checkEventResult(
				methodContext.eventQueue,
				InitializeUserAccountEvent,
				TokenEventResult.FAIL_INSUFFICIENT_BALANCE,
			);
		});

		it('should burn fee, create new account when initializing non default token', async () => {
			const newAddress = utils.getRandomBytes(20);

			await expect(
				method.initializeUserAccount(
					methodContext,
					newAddress,
					defaultForeignTokenID,
					defaultAddress,
					defaultUserAccountInitFee,
				),
			).resolves.toBeUndefined();
			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance - defaultUserAccountInitFee);
			const supplyStore = tokenModule.stores.get(SupplyStore);
			const { totalSupply } = await supplyStore.get(methodContext, defaultTokenID);
			expect(totalSupply).toEqual(defaultTotalSupply - defaultUserAccountInitFee);
			await expect(
				method.userAccountExists(methodContext, newAddress, defaultForeignTokenID),
			).resolves.toBeTrue();
			checkEventResult(methodContext.eventQueue, BurnEvent, TokenEventResult.SUCCESSFUL, 2, 0);
			checkEventResult(
				methodContext.eventQueue,
				InitializeUserAccountEvent,
				TokenEventResult.SUCCESSFUL,
				2,
				1,
			);
		});

		it('should burn fee, create new account', async () => {
			const newAddress = utils.getRandomBytes(20);

			await expect(
				method.initializeUserAccount(
					methodContext,
					newAddress,
					defaultTokenID,
					defaultAddress,
					defaultUserAccountInitFee,
				),
			).resolves.toBeUndefined();
			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance - defaultUserAccountInitFee);
			const supplyStore = tokenModule.stores.get(SupplyStore);
			const { totalSupply } = await supplyStore.get(methodContext, defaultTokenID);
			expect(totalSupply).toEqual(defaultTotalSupply - defaultUserAccountInitFee);
			await expect(
				method.userAccountExists(methodContext, newAddress, defaultTokenID),
			).resolves.toBeTrue();
			checkEventResult(methodContext.eventQueue, BurnEvent, TokenEventResult.SUCCESSFUL, 2, 0);
			checkEventResult(
				methodContext.eventQueue,
				InitializeUserAccountEvent,
				TokenEventResult.SUCCESSFUL,
				2,
				1,
			);
		});
	});

	describe('initializeEscrowAccount', () => {
		it('should do nothing if account is already initialized', async () => {
			await expect(
				method.initializeEscrowAccount(
					methodContext,
					defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
					defaultTokenID,
					defaultAddress,
					defaultEscrowAccountInitFee,
				),
			).resolves.toBeUndefined();
			expect(methodContext.eventQueue.getEvents()).toBeEmpty();
		});

		it('should reject if inititialization fee is not matching the config', async () => {
			await expect(
				method.initializeEscrowAccount(
					methodContext,
					Buffer.from([0, 0, 0, 4]),
					defaultTokenID,
					defaultAddress,
					BigInt(100),
				),
			).rejects.toThrow('Invalid initialization fee');
			checkEventResult(
				methodContext.eventQueue,
				InitializeEscrowAccountEvent,
				TokenEventResult.INVALID_INITIALIZATION_FEE_VALUE,
			);
		});

		it('should reject if token id is not native', async () => {
			await expect(
				method.initializeEscrowAccount(
					methodContext,
					Buffer.from([0, 0, 0, 4]),
					defaultForeignTokenID,
					defaultAddress,
					BigInt(100),
				),
			).rejects.toThrow('is not native token');
		});

		it('should reject if address does not have balance for inititialization fee', async () => {
			const feePayingAddress = utils.getRandomBytes(20);
			const userStore = tokenModule.stores.get(UserStore);
			await userStore.addAvailableBalanceWithCreate(
				methodContext,
				feePayingAddress,
				defaultTokenID,
				BigInt(40000000),
			);

			await expect(
				method.initializeEscrowAccount(
					methodContext,
					Buffer.from([0, 0, 0, 4]),
					defaultTokenID,
					feePayingAddress,
					defaultEscrowAccountInitFee,
				),
			).rejects.toThrow('Insufficient balance');
			checkEventResult(
				methodContext.eventQueue,
				InitializeEscrowAccountEvent,
				TokenEventResult.FAIL_INSUFFICIENT_BALANCE,
			);
		});

		it('should burn fee, create new account', async () => {
			await expect(
				method.initializeEscrowAccount(
					methodContext,
					Buffer.from([0, 0, 0, 4]),
					defaultTokenID,
					defaultAddress,
					defaultEscrowAccountInitFee,
				),
			).resolves.toBeUndefined();
			await expect(
				method.getAvailableBalance(methodContext, defaultAddress, defaultTokenID),
			).resolves.toEqual(defaultAccount.availableBalance - defaultUserAccountInitFee);
			const supplyStore = tokenModule.stores.get(SupplyStore);
			const { totalSupply } = await supplyStore.get(methodContext, defaultTokenID);
			expect(totalSupply).toEqual(defaultTotalSupply - defaultEscrowAccountInitFee);
			const escrowStore = tokenModule.stores.get(EscrowStore);
			await expect(
				escrowStore.has(methodContext, Buffer.concat([Buffer.from([0, 0, 0, 4]), defaultTokenID])),
			).resolves.toBeTrue();
			checkEventResult(methodContext.eventQueue, BurnEvent, TokenEventResult.SUCCESSFUL, 2);
			checkEventResult(
				methodContext.eventQueue,
				InitializeEscrowAccountEvent,
				TokenEventResult.SUCCESSFUL,
				2,
				1,
			);
		});
	});

	describe('transfer', () => {
		it('should reject and add eventif sender address does not exist', async () => {
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

		it('should reject if recipient address is not initialized', async () => {
			const newAddress = utils.getRandomBytes(20);
			await expect(
				method.transfer(
					methodContext,
					defaultAddress,
					newAddress,
					defaultTokenID,
					defaultAccount.availableBalance,
				),
			).rejects.toThrow('does not have an account for the specified token');
			checkEventResult(
				methodContext.eventQueue,
				TransferEvent,
				TokenEventResult.FAIL_RECIPIENT_NOT_INITIALIZED,
			);
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
	});

	describe('transferCrossChain', () => {
		it('should reject when data exceeds max length', async () => {
			await expect(
				method.transferCrossChain(
					methodContext,
					defaultAddress,
					defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
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

		it('should reject when token is native and escrow account is not initialized', async () => {
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
			).rejects.toThrow('Escrow account for receiving chain ');
			checkEventResult(
				methodContext.eventQueue,
				TransferCrossChainEvent,
				TokenEventResult.ESCROW_NOT_INITIALIZED,
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
					defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
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
					defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
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
					defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
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
					defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
					utils.getRandomBytes(20),
					unknownToken,
					BigInt(100000),
					BigInt('10000'),
					'data',
				),
			).rejects.toThrow(
				'Token must be native to either the sending, the receiving chain or the mainchain',
			);
			checkEventResult(
				methodContext.eventQueue,
				TransferCrossChainEvent,
				TokenEventResult.INVALID_TOKEN_ID,
			);
		});

		it('should debit amount from sender and move to escrow', async () => {
			await expect(
				method.transferCrossChain(
					methodContext,
					defaultAddress,
					defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
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
				escrowStore.getKey(defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH), defaultTokenID),
			);
			expect(amount).toEqual(defaultEscrowAmount + BigInt('100000'));
			checkEventResult(
				methodContext.eventQueue,
				TransferCrossChainEvent,
				TokenEventResult.SUCCESSFUL,
			);
		});

		it('should send information to interoperability', async () => {
			jest.spyOn(method['_interoperabilityMethod'], 'send').mockResolvedValue(true);
			const recipient = utils.getRandomBytes(20);
			await method.transferCrossChain(
				methodContext,
				defaultAddress,
				defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
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
				defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
				BigInt('10000'),
				CCM_STATUS_OK,
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
	});

	describe('lock', () => {
		it('should reject if address does not exist', async () => {
			await expect(
				method.lock(
					methodContext,
					utils.getRandomBytes(20),
					'dpos',
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
					'dpos',
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
			expect(lockedBalances[0].module).toEqual('dpos');
			checkEventResult(methodContext.eventQueue, LockEvent, TokenEventResult.SUCCESSFUL);
		});
	});

	describe('unlock', () => {
		it('should reject if address does not exist', async () => {
			await expect(
				method.unlock(methodContext, utils.getRandomBytes(20), 'dpos', defaultTokenID, BigInt(10)),
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
				TokenEventResult.FAIL_INSUFFICIENT_BALANCE,
			);
		});

		it('should reject if address does not have sufficient corresponding locked balance for the specified module', async () => {
			await expect(
				method.unlock(
					methodContext,
					defaultAddress,
					'dpos',
					defaultTokenID,
					defaultAccount.lockedBalances[0].amount + BigInt(1),
				),
			).rejects.toThrow('does not have sufficient locked balance for amount');
			checkEventResult(
				methodContext.eventQueue,
				UnlockEvent,
				TokenEventResult.FAIL_INSUFFICIENT_BALANCE,
			);
		});

		it('should update address balance', async () => {
			await expect(
				method.unlock(
					methodContext,
					defaultAddress,
					'dpos',
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
					'dpos',
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
		it('should reject if address does not have sufficient balance', async () => {
			await expect(
				method.payMessageFee(
					methodContext,
					defaultAddress,
					defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
					defaultAccount.availableBalance + BigInt(1),
				),
			).rejects.toThrow('does not have sufficient balance');
		});

		it('should escrow if fee is native token', async () => {
			await expect(
				method.payMessageFee(
					methodContext,
					defaultAddress,
					defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
					BigInt(100),
				),
			).resolves.toBeUndefined();
			const escrowStore = tokenModule.stores.get(EscrowStore);
			const { amount } = await escrowStore.get(
				methodContext,
				escrowStore.getKey(defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH), defaultTokenID),
			);
			expect(amount).toEqual(defaultEscrowAmount + BigInt('100'));
		});

		it('should debit fee from the address', async () => {
			await expect(
				method.payMessageFee(
					methodContext,
					defaultAddress,
					defaultForeignTokenID.slice(0, CHAIN_ID_LENGTH),
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
			await expect(method.supportAllTokens(methodContext)).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
			expect(methodContext.eventQueue.getEvents()[0].toObject().name).toEqual(
				new AllTokensSupportedEvent('token').name,
			);
		});
	});

	describe('removeAllTokensSupport', () => {
		it('should call remove support all token', async () => {
			await tokenModule.stores.get(SupportedTokensStore).supportAll(methodContext);
			await expect(method.removeAllTokensSupport(methodContext)).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
			expect(methodContext.eventQueue.getEvents()[0].toObject().name).toEqual(
				new AllTokensSupportRemovedEvent('token').name,
			);
		});
	});

	describe('supportAllTokensFromChainID', () => {
		it('should call support chain', async () => {
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
	});

	describe('supportTokenID', () => {
		it('should call support token', async () => {
			await expect(
				method.supportTokenID(methodContext, Buffer.from([1, 2, 3, 4, 0, 0, 0, 0])),
			).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
			expect(methodContext.eventQueue.getEvents()[0].toObject().name).toEqual(
				new TokenIDSupportedEvent('token').name,
			);
		});
	});

	describe('removeSupportTokenID', () => {
		it('should call remove support for token', async () => {
			await tokenModule.stores
				.get(SupportedTokensStore)
				.supportToken(methodContext, Buffer.from([1, 2, 3, 4, 0, 0, 0, 0]));
			await expect(
				method.removeSupportTokenID(methodContext, Buffer.from([1, 2, 3, 4, 0, 0, 0, 0])),
			).resolves.toBeUndefined();

			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
			expect(methodContext.eventQueue.getEvents()[0].toObject().name).toEqual(
				new TokenIDSupportRemovedEvent('token').name,
			);
		});
	});
});
