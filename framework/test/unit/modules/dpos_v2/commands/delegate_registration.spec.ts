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

import { StateStore, Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore, KVStore } from '@liskhq/lisk-db';
import * as testing from '../../../../../src/testing';
import { DelegateRegistrationCommand } from '../../../../../src/modules/dpos_v2/commands/delegate_registration';
import {
	COMMAND_ID_DELEGATE_REGISTRATION,
	MODULE_ID_DPOS,
	STORE_PREFIX_DELEGATE,
	STORE_PREFIX_NAME,
} from '../../../../../src/modules/dpos_v2/constants';
import {
	delegateStoreSchema,
	delegateRegistrationCommandParamsSchema,
	nameStoreSchema,
} from '../../../../../src/modules/dpos_v2/schemas';
import {
	DelegateRegistrationParams,
	ValidatorsAPI,
} from '../../../../../src/modules/dpos_v2/types';
import { VerifyStatus } from '../../../../../src/node/state_machine';

describe('Delegate registration command', () => {
	let delegateRegistrationCommand: DelegateRegistrationCommand;
	let db: KVStore;
	let stateStore: StateStore;
	let delegateSubstore: StateStore;
	let nameSubstore: StateStore;
	let mockValidatorsAPI: ValidatorsAPI;

	const transactionParams = {
		name: 'gojosatoru',
		generatorKey: getRandomBytes(32),
		blsKey: getRandomBytes(48),
		proofOfPossession: getRandomBytes(96),
	};
	const defaultDelegateInfo = {
		name: transactionParams.name,
		totalVotesReceived: BigInt(0),
		selfVotes: BigInt(0),
		lastGeneratedHeight: 0,
		isBanned: false,
		pomHeights: [],
		consecutiveMissedBlocks: 0,
	};
	const encodedTransactionParams = codec.encode(
		delegateRegistrationCommandParamsSchema,
		transactionParams,
	);
	const publicKey = getRandomBytes(32);
	const transaction = new Transaction({
		moduleID: MODULE_ID_DPOS,
		commandID: COMMAND_ID_DELEGATE_REGISTRATION,
		senderPublicKey: publicKey,
		nonce: BigInt(0),
		fee: BigInt(100000000),
		params: encodedTransactionParams,
		signatures: [publicKey],
	});
	const networkIdentifier = Buffer.from(
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
		'hex',
	);

	beforeEach(() => {
		delegateRegistrationCommand = new DelegateRegistrationCommand(MODULE_ID_DPOS);
		mockValidatorsAPI = {
			setValidatorGeneratorKey: jest.fn(),
			setGeneratorList: jest.fn(),
			registerValidatorKeys: jest.fn().mockResolvedValue(true),
			getValidatorAccount: jest.fn(),
			getGeneratorsBetweenTimestamps: jest.fn(),
			getGeneratorAtTimestamp: jest.fn(),
		};
		delegateRegistrationCommand.addDependencies(mockValidatorsAPI);
		db = new InMemoryKVStore() as never;
		stateStore = new StateStore(db);
		delegateSubstore = stateStore.getStore(MODULE_ID_DPOS, STORE_PREFIX_DELEGATE);
		nameSubstore = stateStore.getStore(MODULE_ID_DPOS, STORE_PREFIX_NAME);
	});

	describe('verify', () => {
		it('should return status OK for valid params', async () => {
			const context = testing
				.createTransactionContext({
					transaction,
					networkIdentifier,
				})
				.createCommandVerifyContext<DelegateRegistrationParams>(
					delegateRegistrationCommandParamsSchema,
				);
			const result = await delegateRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return error if name is invalid', async () => {
			const invalidParams = codec.encode(delegateRegistrationCommandParamsSchema, {
				...transactionParams,
				name: '*@#&$_2',
			});
			const invalidTransaction = new Transaction({
				moduleID: MODULE_ID_DPOS,
				commandID: COMMAND_ID_DELEGATE_REGISTRATION,
				senderPublicKey: publicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: invalidParams,
				signatures: [publicKey],
			});
			const context = testing
				.createTransactionContext({
					transaction: invalidTransaction,
					networkIdentifier,
				})
				.createCommandVerifyContext<DelegateRegistrationParams>(
					delegateRegistrationCommandParamsSchema,
				);
			const result = await delegateRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude("'name' is in an unsupported format");
		});

		it('should return error if generatorKey is invalid', async () => {
			const invalidParams = codec.encode(delegateRegistrationCommandParamsSchema, {
				...transactionParams,
				generatorKey: getRandomBytes(64),
			});
			const invalidTransaction = new Transaction({
				moduleID: MODULE_ID_DPOS,
				commandID: COMMAND_ID_DELEGATE_REGISTRATION,
				senderPublicKey: publicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: invalidParams,
				signatures: [publicKey],
			});
			const context = testing
				.createTransactionContext({
					transaction: invalidTransaction,
					networkIdentifier,
				})
				.createCommandVerifyContext<DelegateRegistrationParams>(
					delegateRegistrationCommandParamsSchema,
				);
			const result = await delegateRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude("Property '.generatorKey' maxLength exceeded");
		});

		it('should return error if blsKey is invalid', async () => {
			const invalidParams = codec.encode(delegateRegistrationCommandParamsSchema, {
				...transactionParams,
				blsKey: getRandomBytes(64),
			});
			const invalidTransaction = new Transaction({
				moduleID: MODULE_ID_DPOS,
				commandID: COMMAND_ID_DELEGATE_REGISTRATION,
				senderPublicKey: publicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: invalidParams,
				signatures: [publicKey],
			});
			const context = testing
				.createTransactionContext({
					transaction: invalidTransaction,
					networkIdentifier,
				})
				.createCommandVerifyContext<DelegateRegistrationParams>(
					delegateRegistrationCommandParamsSchema,
				);
			const result = await delegateRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude("Property '.blsKey' maxLength exceeded");
		});

		it('should return error if proofOfPossession is invalid', async () => {
			const invalidParams = codec.encode(delegateRegistrationCommandParamsSchema, {
				...transactionParams,
				proofOfPossession: getRandomBytes(64),
			});
			const invalidTransaction = new Transaction({
				moduleID: MODULE_ID_DPOS,
				commandID: COMMAND_ID_DELEGATE_REGISTRATION,
				senderPublicKey: publicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: invalidParams,
				signatures: [publicKey],
			});
			const context = testing
				.createTransactionContext({
					transaction: invalidTransaction,
					networkIdentifier,
				})
				.createCommandVerifyContext<DelegateRegistrationParams>(
					delegateRegistrationCommandParamsSchema,
				);
			const result = await delegateRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude("'.proofOfPossession' minLength not satisfied");
		});

		it('should return error if store key name already exists in name store', async () => {
			await nameSubstore.setWithSchema(
				Buffer.from(transactionParams.name, 'utf8'),
				{ delegateAddress: transaction.senderAddress },
				nameStoreSchema,
			);
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					networkIdentifier,
				})
				.createCommandVerifyContext<DelegateRegistrationParams>(
					delegateRegistrationCommandParamsSchema,
				);
			const result = await delegateRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Name substore must not have an entry for the store key name',
			);
		});

		it('should return error if store key address already exists in delegate store', async () => {
			await delegateSubstore.setWithSchema(
				transaction.senderAddress,
				defaultDelegateInfo,
				delegateStoreSchema,
			);
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					networkIdentifier,
				})
				.createCommandVerifyContext<DelegateRegistrationParams>(
					delegateRegistrationCommandParamsSchema,
				);
			const result = await delegateRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Delegate substore must not have an entry for the store key address',
			);
		});
	});

	describe('execute', () => {
		it('should call validators API registerValidatorKeys', async () => {
			const context = testing
				.createTransactionContext({
					transaction,
					networkIdentifier,
				})
				.createCommandExecuteContext<DelegateRegistrationParams>(
					delegateRegistrationCommandParamsSchema,
				);
			await delegateRegistrationCommand.execute(context);

			expect(mockValidatorsAPI.registerValidatorKeys).toHaveBeenCalledWith(
				expect.anything(),
				transaction.senderAddress,
				context.params.blsKey,
				context.params.generatorKey,
				context.params.proofOfPossession,
			);
		});

		it('should throw error if registerValidatorKeys fails', async () => {
			mockValidatorsAPI.registerValidatorKeys = jest
				.fn()
				.mockRejectedValue(new Error('Failed to register validator keys'));
			const context = testing
				.createTransactionContext({
					transaction,
					networkIdentifier,
				})
				.createCommandExecuteContext<DelegateRegistrationParams>(
					delegateRegistrationCommandParamsSchema,
				);

			await expect(delegateRegistrationCommand.execute(context)).rejects.toThrow(
				'Failed to register validator keys',
			);
		});

		it('should set delegate info in delegate substore', async () => {
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					networkIdentifier,
				})
				.createCommandExecuteContext<DelegateRegistrationParams>(
					delegateRegistrationCommandParamsSchema,
				);
			await delegateRegistrationCommand.execute(context);
			const storedData = codec.decode(
				delegateStoreSchema,
				await delegateSubstore.get(transaction.senderAddress),
			);

			expect(storedData).toEqual(defaultDelegateInfo);
		});

		it('should set delegate name in name substore', async () => {
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					networkIdentifier,
				})
				.createCommandExecuteContext<DelegateRegistrationParams>(
					delegateRegistrationCommandParamsSchema,
				);
			await delegateRegistrationCommand.execute(context);
			const storedData = codec.decode<{ delegateAddress: string }>(
				nameStoreSchema,
				await nameSubstore.get(Buffer.from(transactionParams.name, 'utf8')),
			);

			expect(storedData.delegateAddress).toEqual(transaction.senderAddress);
		});
	});
});
