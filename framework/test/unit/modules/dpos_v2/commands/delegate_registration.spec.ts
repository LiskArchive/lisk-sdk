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
import { DelegateRegistrationCommand } from '../../../../../src/modules/dpos_v2/commands/delegate_registration';
import { delegateRegistrationCommandParamsSchema } from '../../../../../src/modules/dpos_v2/schemas';
import {
	DelegateRegistrationParams,
	ValidatorsMethod,
} from '../../../../../src/modules/dpos_v2/types';
import { VerifyStatus } from '../../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { DelegateStore } from '../../../../../src/modules/dpos_v2/stores/delegate';
import { NameStore } from '../../../../../src/modules/dpos_v2/stores/name';
import { DPoSModule } from '../../../../../src';
import { createStoreGetter } from '../../../../../src/testing/utils';

describe('Delegate registration command', () => {
	const dpos = new DPoSModule();
	let delegateRegistrationCommand: DelegateRegistrationCommand;
	let stateStore: PrefixedStateReadWriter;
	let delegateSubstore: DelegateStore;
	let nameSubstore: NameStore;
	let mockValidatorsMethod: ValidatorsMethod;

	const transactionParams = {
		name: 'gojosatoru',
		generatorKey: utils.getRandomBytes(32),
		blsKey: utils.getRandomBytes(48),
		proofOfPossession: utils.getRandomBytes(96),
	};
	const defaultDelegateInfo = {
		name: transactionParams.name,
		totalVotesReceived: BigInt(0),
		selfVotes: BigInt(0),
		lastGeneratedHeight: 0,
		isBanned: false,
		pomHeights: [],
		consecutiveMissedBlocks: 0,
		commission: 0,
		lastCommissionIncreaseHeight: 0,
		sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
	};
	const encodedTransactionParams = codec.encode(
		delegateRegistrationCommandParamsSchema,
		transactionParams,
	);
	const publicKey = utils.getRandomBytes(32);
	const transaction = new Transaction({
		module: 'dpos',
		command: 'registerDelegate',
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

	beforeEach(() => {
		delegateRegistrationCommand = new DelegateRegistrationCommand(dpos.stores, dpos.events);
		mockValidatorsMethod = {
			setValidatorGeneratorKey: jest.fn(),
			registerValidatorKeys: jest.fn().mockResolvedValue(true),
			getValidatorKeys: jest.fn(),
			getGeneratorsBetweenTimestamps: jest.fn(),
			setValidatorsParams: jest.fn(),
		};
		delegateRegistrationCommand.addDependencies(mockValidatorsMethod);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		delegateSubstore = dpos.stores.get(DelegateStore);
		nameSubstore = dpos.stores.get(NameStore);
	});

	describe('verify', () => {
		it('should return status OK for valid params', async () => {
			const context = testing
				.createTransactionContext({
					transaction,
					chainID,
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
				module: 'dpos',
				command: 'registerDelegate',
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
				generatorKey: utils.getRandomBytes(64),
			});
			const invalidTransaction = new Transaction({
				module: 'dpos',
				command: 'registerDelegate',
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
				blsKey: utils.getRandomBytes(64),
			});
			const invalidTransaction = new Transaction({
				module: 'dpos',
				command: 'registerDelegate',
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
				proofOfPossession: utils.getRandomBytes(64),
			});
			const invalidTransaction = new Transaction({
				module: 'dpos',
				command: 'registerDelegate',
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
				.createCommandVerifyContext<DelegateRegistrationParams>(
					delegateRegistrationCommandParamsSchema,
				);
			const result = await delegateRegistrationCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude("'.proofOfPossession' minLength not satisfied");
		});

		it('should return error if store key name already exists in name store', async () => {
			await nameSubstore.set(
				createStoreGetter(stateStore),
				Buffer.from(transactionParams.name, 'utf8'),
				{ delegateAddress: transaction.senderAddress },
			);
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					chainID,
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

		// TODO: Issue #7665
		it.skip('should return error if store key address already exists in delegate store', async () => {
			await delegateSubstore.set(
				createStoreGetter(stateStore),
				transaction.senderAddress,
				defaultDelegateInfo,
			);
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					chainID,
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

	// TODO: Issue #7665
	describe.skip('execute', () => {
		it('should call validators Method registerValidatorKeys', async () => {
			const context = testing
				.createTransactionContext({
					transaction,
					chainID,
				})
				.createCommandExecuteContext<DelegateRegistrationParams>(
					delegateRegistrationCommandParamsSchema,
				);
			await delegateRegistrationCommand.execute(context);

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
					chainID,
				})
				.createCommandExecuteContext<DelegateRegistrationParams>(
					delegateRegistrationCommandParamsSchema,
				);
			await delegateRegistrationCommand.execute(context);
			const storedData = await delegateSubstore.get(
				createStoreGetter(stateStore),
				transaction.senderAddress,
			);

			expect(storedData).toEqual(defaultDelegateInfo);
		});

		it('should set delegate name in name substore', async () => {
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					chainID,
				})
				.createCommandExecuteContext<DelegateRegistrationParams>(
					delegateRegistrationCommandParamsSchema,
				);
			await delegateRegistrationCommand.execute(context);
			const storedData = await nameSubstore.get(
				context,
				Buffer.from(transactionParams.name, 'utf8'),
			);

			expect(storedData.delegateAddress).toEqual(transaction.senderAddress);
		});
	});
});
