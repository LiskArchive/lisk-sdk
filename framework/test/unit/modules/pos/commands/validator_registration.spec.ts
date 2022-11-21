/*
 * Copyright © 2021 Lisk Foundation
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

import { Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import * as testing from '../../../../../src/testing';
import { RegisterValidatorCommand } from '../../../../../src/modules/pos/commands/register_validator';
import { validatorRegistrationCommandParamsSchema } from '../../../../../src/modules/pos/schemas';
import {
	ValidatorRegistrationParams,
	TokenMethod,
	ValidatorsMethod,
} from '../../../../../src/modules/pos/types';
import { EventQueue, VerifyStatus } from '../../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { ValidatorStore } from '../../../../../src/modules/pos/stores/validator';
import { NameStore } from '../../../../../src/modules/pos/stores/name';
import { PoSModule } from '../../../../../src';
import { createStoreGetter } from '../../../../../src/testing/utils';
import {
	COMMISSION,
	DELEGATE_REGISTRATION_FEE,
	TOKEN_ID_FEE,
} from '../../../../../src/modules/pos/constants';
import { ValidatorRegisteredEvent } from '../../../../../src/modules/pos/events/validator_registered';

describe('Validator registration command', () => {
	const pos = new PoSModule();
	let validatorRegistrationCommand: RegisterValidatorCommand;
	let validatorRegisteredEvent: ValidatorRegisteredEvent;
	let stateStore: PrefixedStateReadWriter;
	let validatorSubstore: ValidatorStore;
	let nameSubstore: NameStore;
	let mockTokenMethod: TokenMethod;
	let mockValidatorsMethod: ValidatorsMethod;

	const transactionParams = {
		name: 'gojosatoru',
		generatorKey: utils.getRandomBytes(32),
		blsKey: utils.getRandomBytes(48),
		proofOfPossession: utils.getRandomBytes(96),
		validatorRegistrationFee: DELEGATE_REGISTRATION_FEE,
	};
	const defaultValidatorInfo = {
		name: transactionParams.name,
		totalStakeReceived: BigInt(0),
		selfStake: BigInt(0),
		lastGeneratedHeight: 0,
		isBanned: false,
		pomHeights: [],
		consecutiveMissedBlocks: 0,
		commission: COMMISSION,
		lastCommissionIncreaseHeight: 0,
		sharingCoefficients: [],
	};
	const encodedTransactionParams = codec.encode(
		validatorRegistrationCommandParamsSchema,
		transactionParams,
	);
	const publicKey = utils.getRandomBytes(32);
	const transaction = new Transaction({
		module: 'pos',
		command: 'registerValidator',
		senderPublicKey: publicKey,
		nonce: BigInt(0),
		fee: BigInt(100000000),
		params: encodedTransactionParams,
		signatures: [publicKey],
	});
	const chainID = Buffer.from(
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
		'hex',
	);

	// TODO: move this function to utils and import from all other tests using it
	const checkEventResult = (
		eventQueue: EventQueue,
		EventClass: any,
		moduleName: string,
		expectedResult: any,
		length = 1,
		index = 0,
	) => {
		expect(eventQueue.getEvents()).toHaveLength(length);
		expect(eventQueue.getEvents()[index].toObject().name).toEqual(new EventClass(moduleName).name);

		const eventData = codec.decode<Record<string, unknown>>(
			new EventClass(moduleName).schema,
			eventQueue.getEvents()[index].toObject().data,
		);

		expect(eventData).toEqual(expectedResult);
	};

	beforeEach(() => {
		validatorRegistrationCommand = new RegisterValidatorCommand(pos.stores, pos.events);
		validatorRegistrationCommand.init({
			tokenIDFee: TOKEN_ID_FEE,
			validatorRegistrationFee: DELEGATE_REGISTRATION_FEE,
		});
		mockTokenMethod = {
			lock: jest.fn(),
			unlock: jest.fn(),
			getAvailableBalance: jest.fn(),
			burn: jest.fn(),
			transfer: jest.fn(),
			getLockedAmount: jest.fn(),
		};
		mockValidatorsMethod = {
			setValidatorGeneratorKey: jest.fn(),
			registerValidatorKeys: jest.fn().mockResolvedValue(true),
			getValidatorKeys: jest.fn(),
			getGeneratorsBetweenTimestamps: jest.fn(),
			setValidatorsParams: jest.fn(),
		};
		validatorRegistrationCommand.addDependencies(mockTokenMethod, mockValidatorsMethod);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		validatorSubstore = pos.stores.get(ValidatorStore);
		nameSubstore = pos.stores.get(NameStore);

		validatorRegisteredEvent = pos.events.get(ValidatorRegisteredEvent);
		jest.spyOn(validatorRegisteredEvent, 'log');
	});

	describe('verify', () => {
		it('should return status OK for valid params', async () => {
			const context = testing
				.createTransactionContext({
					transaction,
					chainID,
				})
				.createCommandVerifyContext<ValidatorRegistrationParams>(
					validatorRegistrationCommandParamsSchema,
				);
			const result = await validatorRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return error if name is invalid', async () => {
			const invalidParams = codec.encode(validatorRegistrationCommandParamsSchema, {
				...transactionParams,
				name: '*@#&$_2',
			});
			const invalidTransaction = new Transaction({
				module: 'pos',
				command: 'registerValidator',
				senderPublicKey: publicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: invalidParams,
				signatures: [publicKey],
			});
			const context = testing
				.createTransactionContext({
					transaction: invalidTransaction,
					chainID,
				})
				.createCommandVerifyContext<ValidatorRegistrationParams>(
					validatorRegistrationCommandParamsSchema,
				);
			const result = await validatorRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude("'name' is in an unsupported format");
		});

		it('should return error if generatorKey is invalid', async () => {
			const invalidParams = codec.encode(validatorRegistrationCommandParamsSchema, {
				...transactionParams,
				generatorKey: utils.getRandomBytes(64),
			});
			const invalidTransaction = new Transaction({
				module: 'pos',
				command: 'registerValidator',
				senderPublicKey: publicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: invalidParams,
				signatures: [publicKey],
			});
			const context = testing
				.createTransactionContext({
					transaction: invalidTransaction,
					chainID,
				})
				.createCommandVerifyContext<ValidatorRegistrationParams>(
					validatorRegistrationCommandParamsSchema,
				);
			const result = await validatorRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude("Property '.generatorKey' maxLength exceeded");
		});

		it('should return error if blsKey is invalid', async () => {
			const invalidParams = codec.encode(validatorRegistrationCommandParamsSchema, {
				...transactionParams,
				blsKey: utils.getRandomBytes(64),
			});
			const invalidTransaction = new Transaction({
				module: 'pos',
				command: 'registerValidator',
				senderPublicKey: publicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: invalidParams,
				signatures: [publicKey],
			});
			const context = testing
				.createTransactionContext({
					transaction: invalidTransaction,
					chainID,
				})
				.createCommandVerifyContext<ValidatorRegistrationParams>(
					validatorRegistrationCommandParamsSchema,
				);
			const result = await validatorRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude("Property '.blsKey' maxLength exceeded");
		});

		it('should return error if proofOfPossession is invalid', async () => {
			const invalidParams = codec.encode(validatorRegistrationCommandParamsSchema, {
				...transactionParams,
				proofOfPossession: utils.getRandomBytes(64),
			});
			const invalidTransaction = new Transaction({
				module: 'pos',
				command: 'registerValidator',
				senderPublicKey: publicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: invalidParams,
				signatures: [publicKey],
			});
			const context = testing
				.createTransactionContext({
					transaction: invalidTransaction,
					chainID,
				})
				.createCommandVerifyContext<ValidatorRegistrationParams>(
					validatorRegistrationCommandParamsSchema,
				);
			const result = await validatorRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude("'.proofOfPossession' minLength not satisfied");
		});

		it('should return error if store key name already exists in name store', async () => {
			await nameSubstore.set(
				createStoreGetter(stateStore),
				Buffer.from(transactionParams.name, 'utf8'),
				{ validatorAddress: transaction.senderAddress },
			);
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					chainID,
				})
				.createCommandVerifyContext<ValidatorRegistrationParams>(
					validatorRegistrationCommandParamsSchema,
				);
			const result = await validatorRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Name substore must not have an entry for the store key name',
			);
		});

		it('should return error if store key address already exists in validator store', async () => {
			await validatorSubstore.set(
				createStoreGetter(stateStore),
				transaction.senderAddress,
				defaultValidatorInfo,
			);
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					chainID,
				})
				.createCommandVerifyContext<ValidatorRegistrationParams>(
					validatorRegistrationCommandParamsSchema,
				);
			const result = await validatorRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Validator substore must not have an entry for the store key address',
			);
		});

		it('should return error if validator registration fee is different from what is required in config', async () => {
			const invalidTransactionParams = {
				...transactionParams,
				validatorRegistrationFee: BigInt(0),
			};

			const encodedInvalidTransactionParams = codec.encode(
				validatorRegistrationCommandParamsSchema,
				invalidTransactionParams,
			);
			const invalidTransaction = new Transaction({
				module: 'pos',
				command: 'registerValidator',
				senderPublicKey: publicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: encodedInvalidTransactionParams,
				signatures: [publicKey],
			});

			await validatorSubstore.set(
				createStoreGetter(stateStore),
				invalidTransaction.senderAddress,
				defaultValidatorInfo,
			);
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction: invalidTransaction,
					chainID,
				})
				.createCommandVerifyContext<ValidatorRegistrationParams>(
					validatorRegistrationCommandParamsSchema,
				);

			const result = await validatorRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Invalid validator registration fee.');
		});

		it('should return error if account does not have enough balance for the registration fee', async () => {
			mockTokenMethod.getAvailableBalance = jest
				.fn()
				.mockResolvedValue(DELEGATE_REGISTRATION_FEE - BigInt(1));
			validatorRegistrationCommand = new RegisterValidatorCommand(pos.stores, pos.events);
			validatorRegistrationCommand.init({
				tokenIDFee: TOKEN_ID_FEE,
				validatorRegistrationFee: DELEGATE_REGISTRATION_FEE,
			});
			validatorRegistrationCommand.addDependencies(mockTokenMethod, mockValidatorsMethod);

			await validatorSubstore.set(
				createStoreGetter(stateStore),
				transaction.senderAddress,
				defaultValidatorInfo,
			);
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					chainID,
				})
				.createCommandVerifyContext<ValidatorRegistrationParams>(
					validatorRegistrationCommandParamsSchema,
				);

			const result = await validatorRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Not sufficient amount for validator registration fee.',
			);
		});
	});

	describe('execute', () => {
		it('should call validators Method registerValidatorKeys', async () => {
			const context = testing
				.createTransactionContext({
					transaction,
					chainID,
				})
				.createCommandExecuteContext<ValidatorRegistrationParams>(
					validatorRegistrationCommandParamsSchema,
				);
			await validatorRegistrationCommand.execute(context);

			expect(mockValidatorsMethod.registerValidatorKeys).toHaveBeenCalledWith(
				expect.anything(),
				transaction.senderAddress,
				context.params.blsKey,
				context.params.generatorKey,
				context.params.proofOfPossession,
			);
		});

		it('should throw error if registerValidatorKeys fails', async () => {
			mockValidatorsMethod.registerValidatorKeys = jest
				.fn()
				.mockRejectedValue(new Error('Failed to register validator keys'));
			const context = testing
				.createTransactionContext({
					transaction,
					chainID,
				})
				.createCommandExecuteContext<ValidatorRegistrationParams>(
					validatorRegistrationCommandParamsSchema,
				);

			await expect(validatorRegistrationCommand.execute(context)).rejects.toThrow(
				'Failed to register validator keys',
			);
		});

		it('should set validator info in validator substore', async () => {
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					chainID,
				})
				.createCommandExecuteContext<ValidatorRegistrationParams>(
					validatorRegistrationCommandParamsSchema,
				);
			await validatorRegistrationCommand.execute(context);
			const storedData = await validatorSubstore.get(
				createStoreGetter(stateStore),
				transaction.senderAddress,
			);

			expect(storedData).toEqual(defaultValidatorInfo);
		});

		it('should set validator name in name substore', async () => {
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					chainID,
				})
				.createCommandExecuteContext<ValidatorRegistrationParams>(
					validatorRegistrationCommandParamsSchema,
				);
			await validatorRegistrationCommand.execute(context);
			const storedData = await nameSubstore.get(
				context,
				Buffer.from(transactionParams.name, 'utf8'),
			);

			expect(storedData.validatorAddress).toEqual(transaction.senderAddress);
		});

		it('should emit an event when a validator is registered', async () => {
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					chainID,
				})
				.createCommandExecuteContext<ValidatorRegistrationParams>(
					validatorRegistrationCommandParamsSchema,
				);

			await validatorRegistrationCommand.execute(context);

			// check if the event has been dispatched correctly
			expect(validatorRegisteredEvent.log).toHaveBeenCalledWith(expect.anything(), {
				address: transaction.senderAddress,
				name: transactionParams.name,
			});

			// check if the event is in the event queue
			checkEventResult(context.eventQueue, ValidatorRegisteredEvent, 'pos', {
				address: transaction.senderAddress,
				name: transactionParams.name,
			});
		});
	});
});
