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

import { StateStore } from '@liskhq/lisk-chain';
import { InMemoryKVStore, KVStore } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { Transaction } from '@liskhq/lisk-chain';
import * as fixtures from './fixtures.json';
import * as testing from '../../../../src/testing';
import { RegisterMultisignatureCommand } from '../../../../src/modules/auth/commands/register_multisignature';
import { MODULE_ID_AUTH, STORE_PREFIX_AUTH } from '../../../../src/modules/auth/constants';
import {
	authAccountSchema,
	registerMultisignatureParamsSchema,
} from '../../../../src/modules/auth/schemas';
import {
	AuthAccount,
	Keys,
	RegisterMultisignatureParams,
} from '../../../../src/modules/auth/types';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerifyStatus,
} from '../../../../src/node/state_machine';

describe('Register Multisignature command', () => {
	let decodedParams: Keys;
	let registerMultisignatureCommand: RegisterMultisignatureCommand;
	let db: KVStore;
	let stateStore: StateStore;
	let authStore: StateStore;
	let transaction: Transaction;

	const defaultTestCase = fixtures.testCases[0];
	const networkIdentifier = Buffer.from(defaultTestCase.input.networkIdentifier, 'hex');

	beforeEach(async () => {
		registerMultisignatureCommand = new RegisterMultisignatureCommand(MODULE_ID_AUTH);
		const buffer = Buffer.from(defaultTestCase.output.transaction, 'hex');
		transaction = Transaction.fromBytes(buffer);
		decodedParams = codec.decode<Keys>(registerMultisignatureParamsSchema, transaction.params);
	});

	describe('verify', () => {
		it('should not return status OK for valid params', async () => {
			const context = testing
				.createTransactionContext({
					transaction,
					networkIdentifier,
				})
				.createCommandVerifyContext(registerMultisignatureParamsSchema) as CommandVerifyContext<
				Record<string, unknown>
			>;
			const result = await registerMultisignatureCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return error if params has numberOfSignatures > 64', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				numberOfSignatures: 100,
				mandatoryKeys: [getRandomBytes(32)],
				optionalKeys: [getRandomBytes(32)],
			});
			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					networkIdentifier,
				})
				.createCommandVerifyContext(registerMultisignatureParamsSchema) as CommandVerifyContext<
				Record<string, unknown>
			>;
			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toBe(
				'The numberOfSignatures is bigger than the count of Mandatory and Optional keys.',
			);
		});

		it('should return error if params has numberOfSignatures < 1', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				numberOfSignatures: 0,
				mandatoryKeys: [getRandomBytes(32)],
				optionalKeys: [getRandomBytes(32)],
			});
			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					networkIdentifier,
				})
				.createCommandVerifyContext(registerMultisignatureParamsSchema) as CommandVerifyContext<
				Record<string, unknown>
			>;
			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toBe(
				'The numberOfSignatures needs to be equal or bigger than the number of Mandatory keys.',
			);
		});

		it('should return error if params has more than 64 mandatory keys', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				numberOfSignatures: 2,
				mandatoryKeys: [...Array(65).keys()].map(() => getRandomBytes(32)),
				optionalKeys: [],
			});
			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					networkIdentifier,
				})
				.createCommandVerifyContext(registerMultisignatureParamsSchema) as CommandVerifyContext<
				Record<string, unknown>
			>;
			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toBe(
				'The count of Mandatory and Optional keys should be between 1 and 64.',
			);
		});

		it('should return error if params mandatory keys contains items with length bigger than 32', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				numberOfSignatures: 2,
				mandatoryKeys: [...Array(1).keys()].map(() => getRandomBytes(64)),
				optionalKeys: [],
			});
			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					networkIdentifier,
				})
				.createCommandVerifyContext(registerMultisignatureParamsSchema) as CommandVerifyContext<
				Record<string, unknown>
			>;
			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toBe(
				'The numberOfSignatures is bigger than the count of Mandatory and Optional keys.',
			);
		});

		it('should return error if params mandatory keys contains items with length smaller than 32', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				numberOfSignatures: 2,
				mandatoryKeys: [...Array(1).keys()].map(() => getRandomBytes(10)),
				optionalKeys: [],
			});
			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					networkIdentifier,
				})
				.createCommandVerifyContext(registerMultisignatureParamsSchema) as CommandVerifyContext<
				Record<string, unknown>
			>;
			const result = await registerMultisignatureCommand.verify(context);
			expect(result.error?.message).toBe(
				'The numberOfSignatures is bigger than the count of Mandatory and Optional keys.',
			);
		});

		it('should return error if params optional keys contains items with length bigger than 32', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				numberOfSignatures: 2,
				mandatoryKeys: [],
				optionalKeys: [...Array(1).keys()].map(() => getRandomBytes(64)),
			});
			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					networkIdentifier,
				})
				.createCommandVerifyContext(registerMultisignatureParamsSchema) as CommandVerifyContext<
				Record<string, unknown>
			>;
			const result = await registerMultisignatureCommand.verify(context);
			expect(result.error?.message).toBe(
				'The numberOfSignatures is bigger than the count of Mandatory and Optional keys.',
			);
		});

		it('should return error if params optional keys contains items with length smaller than 32', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				numberOfSignatures: 2,
				mandatoryKeys: [],
				optionalKeys: [...Array(1).keys()].map(() => getRandomBytes(31)),
			});
			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					networkIdentifier,
				})
				.createCommandVerifyContext(registerMultisignatureParamsSchema) as CommandVerifyContext<
				Record<string, unknown>
			>;
			const result = await registerMultisignatureCommand.verify(context);
			expect(result.error?.message).toBe(
				'The numberOfSignatures is bigger than the count of Mandatory and Optional keys.',
			);
		});

		it('should return error if params has more than 64 optional keys', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				numberOfSignatures: 2,
				mandatoryKeys: [],
				optionalKeys: [...Array(65).keys()].map(() => getRandomBytes(32)),
			});
			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					networkIdentifier,
				})
				.createCommandVerifyContext(registerMultisignatureParamsSchema) as CommandVerifyContext<
				Record<string, unknown>
			>;
			const result = await registerMultisignatureCommand.verify(context);
			expect(result.error?.message).toBe(
				'The count of Mandatory and Optional keys should be between 1 and 64.',
			);
		});

		it('should return error when there are duplicated mandatory keys', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				mandatoryKeys: [decodedParams.mandatoryKeys[0], decodedParams.mandatoryKeys[0]],
			});
			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					networkIdentifier,
				})
				.createCommandVerifyContext(registerMultisignatureParamsSchema) as CommandVerifyContext<
				Record<string, unknown>
			>;

			const result = await registerMultisignatureCommand.verify(context);
			expect(result.error?.message).toBe('MandatoryKeys contains duplicate public keys.');
		});

		it('should return error when there are duplicated optional keys', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				optionalKeys: [decodedParams.optionalKeys[0], decodedParams.optionalKeys[0]],
			});
			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					networkIdentifier,
				})
				.createCommandVerifyContext(registerMultisignatureParamsSchema) as CommandVerifyContext<
				Record<string, unknown>
			>;

			const result = await registerMultisignatureCommand.verify(context);
			expect(result.error?.message).toBe('OptionalKeys contains duplicate public keys.');
		});

		it('should return error when numberOfSignatures is bigger than the count of all keys', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				numberOfSignatures: 5,
			});
			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					networkIdentifier,
				})
				.createCommandVerifyContext(registerMultisignatureParamsSchema) as CommandVerifyContext<
				Record<string, unknown>
			>;
			const result = await registerMultisignatureCommand.verify(context);
			expect(result.error?.message).toBe(
				'The numberOfSignatures is bigger than the count of Mandatory and Optional keys.',
			);
		});

		it('should return error when numberOfSignatures is smaller than mandatory key count', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				numberOfSignatures: 1,
			});
			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					networkIdentifier,
				})
				.createCommandVerifyContext(registerMultisignatureParamsSchema) as CommandVerifyContext<
				Record<string, unknown>
			>;
			const result = await registerMultisignatureCommand.verify(context);
			expect(result.error?.message).toBe(
				'The numberOfSignatures needs to be equal or bigger than the number of Mandatory keys.',
			);
		});

		it('should return error when mandatory and optional key sets are not disjointed', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				numberOfSignatures: 2,
				mandatoryKeys: [
					Buffer.from('48e041ae61a32777c899c1f1b0a9588bdfe939030613277a39556518cc66d371', 'hex'),
					Buffer.from('483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180', 'hex'),
				],
				optionalKeys: [
					Buffer.from('483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180', 'hex'),
				],
			});
			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					networkIdentifier,
				})
				.createCommandVerifyContext(registerMultisignatureParamsSchema) as CommandVerifyContext<
				Record<string, unknown>
			>;

			const result = await registerMultisignatureCommand.verify(context);
			expect(result.error?.message).toBe(
				'Invalid combination of Mandatory and Optional keys. Repeated keys across Mandatory and Optional were found.',
			);
		});

		it('should return error when mandatory keys set is not sorted', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				numberOfSignatures: 2,
				mandatoryKeys: [
					Buffer.from('48e041ae61a32777c899c1f1b0a9588bdfe939030613277a39556518cc66d371', 'hex'),
					Buffer.from('483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180', 'hex'),
				],
			});
			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					networkIdentifier,
				})
				.createCommandVerifyContext(registerMultisignatureParamsSchema) as CommandVerifyContext<
				Record<string, unknown>
			>;

			const result = await registerMultisignatureCommand.verify(context);
			expect(result.error?.message).toBe('Mandatory keys should be sorted lexicographically.');
		});

		it('should return error when optional keys set is not sorted', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				numberOfSignatures: 2,
				optionalKeys: [
					Buffer.from('48e041ae61a32777c899c1f1b0a9588bdfe939030613277a39556518cc66d371', 'hex'),
					Buffer.from('483077a8b23208f2fd85dacec0fbb0b590befea0a1fcd76a5b43f33063aaa180', 'hex'),
				],
			});
			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					networkIdentifier,
				})
				.createCommandVerifyContext(registerMultisignatureParamsSchema) as CommandVerifyContext<
				Record<string, unknown>
			>;

			const result = await registerMultisignatureCommand.verify(context);
			expect(result.error?.message).toBe('Optional keys should be sorted lexicographically.');
		});

		it('should return error when the number of optional and mandatory keys is more than 64', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				numberOfSignatures: 2,
				optionalKeys: [...Array(65).keys()].map(() => getRandomBytes(64)),
				mandatoryKeys: [...Array(65).keys()].map(() => getRandomBytes(64)),
			});
			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					networkIdentifier,
				})
				.createCommandVerifyContext(registerMultisignatureParamsSchema) as CommandVerifyContext<
				Record<string, unknown>
			>;

			const result = await registerMultisignatureCommand.verify(context);
			expect(result.error?.message).toBe(
				'The count of Mandatory and Optional keys should be between 1 and 64.',
			);
		});

		it('should return error when the number of optional and mandatory keys is less than 1', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				optionalKeys: [],
				mandatoryKeys: [],
				numberOfSignatures: 0,
			});
			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					networkIdentifier,
				})
				.createCommandVerifyContext(registerMultisignatureParamsSchema) as CommandVerifyContext<
				Record<string, unknown>
			>;

			const result = await registerMultisignatureCommand.verify(context);
			expect(result.error?.message).toBe(
				'The count of Mandatory and Optional keys should be between 1 and 64.',
			);
		});
	});

	describe('execute', () => {
		beforeEach(() => {
			db = new InMemoryKVStore() as never;
			stateStore = new StateStore(db);
			authStore = stateStore.getStore(MODULE_ID_AUTH, STORE_PREFIX_AUTH);
		});

		it('should not throw when registering for first time', async () => {
			await authStore.setWithSchema(
				transaction.senderAddress,
				{
					optionalKeys: [],
					mandatoryKeys: [],
					numberOfSignatures: 0,
					nonce: BigInt(0),
				},
				registerMultisignatureParamsSchema,
			);
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					networkIdentifier,
				})
				.createCommandExecuteContext(
					registerMultisignatureParamsSchema,
				) as CommandExecuteContext<RegisterMultisignatureParams>;

			await expect(registerMultisignatureCommand.execute(context)).toResolve();
			const updatedStore = stateStore.getStore(MODULE_ID_AUTH, STORE_PREFIX_AUTH);
			const updatedData = await updatedStore.getWithSchema<AuthAccount>(
				transaction.senderAddress,
				authAccountSchema,
			);
			expect(updatedData.mandatoryKeys).toEqual(decodedParams.mandatoryKeys);
		});

		it('should throw error when account is already multisignature', async () => {
			await authStore.setWithSchema(
				transaction.senderAddress,
				{ ...decodedParams, nonce: BigInt(0) },
				registerMultisignatureParamsSchema,
			);
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					networkIdentifier,
				})
				.createCommandExecuteContext(
					registerMultisignatureParamsSchema,
				) as CommandExecuteContext<RegisterMultisignatureParams>;

			await expect(registerMultisignatureCommand.execute(context)).rejects.toThrow(
				'Register multisignature only allowed once per account.',
			);
		});
	});
});
