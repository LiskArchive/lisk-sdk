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
import { validator } from '@liskhq/lisk-validator';
import * as testing from '../../../../src/testing';
import { RegisterMultisignatureCommand } from '../../../../src/modules/auth/commands/register_multisignature';
import { registerMultisignatureParamsSchema } from '../../../../src/modules/auth/schemas';
import { RegisterMultisignatureParams } from '../../../../src/modules/auth/types';
import { VerifyStatus } from '../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { AuthModule } from '../../../../src/modules/auth';
import { AuthAccount, AuthAccountStore } from '../../../../src/modules/auth/stores/auth_account';
import { InvalidSignatureEvent } from '../../../../src/modules/auth/events/invalid_signature';
import { MultisignatureRegistrationEvent } from '../../../../src/modules/auth/events/multisignature_registration';
import { chainID, decodedParams, keyPairs, unsignedRegisterMultisigTx } from './multisig_fixture';

describe('Register Multisignature command', () => {
	let registerMultisignatureCommand: RegisterMultisignatureCommand;
	let stateStore: PrefixedStateReadWriter;
	let authAccountStore: AuthAccountStore;

	const authModule = new AuthModule();

	const defaultAuthAccount: AuthAccount = {
		numberOfSignatures: 0,
		mandatoryKeys: [],
		optionalKeys: [],
		nonce: BigInt(0),
	};

	const transaction = new Transaction(unsignedRegisterMultisigTx);
	transaction.sign(chainID, keyPairs[0].privateKey);

	beforeEach(() => {
		registerMultisignatureCommand = new RegisterMultisignatureCommand(
			authModule.stores,
			authModule.events,
		);
	});
	describe('verify schema', () => {
		it('should return error if params has numberOfSignatures > 64', () => {
			expect(() =>
				validator.validate(registerMultisignatureCommand.schema, {
					numberOfSignatures: 100,
					mandatoryKeys: [utils.getRandomBytes(32)],
					optionalKeys: [utils.getRandomBytes(32)],
					signatures: [utils.getRandomBytes(64)],
				}),
			).toThrow('must be <= 64');
		});

		it('should return error if params has numberOfSignatures < 1', () => {
			expect(() =>
				validator.validate(registerMultisignatureCommand.schema, {
					numberOfSignatures: 0,
					mandatoryKeys: [utils.getRandomBytes(32)],
					optionalKeys: [utils.getRandomBytes(32)],
					signatures: [utils.getRandomBytes(64)],
				}),
			).toThrow('must be >= 1');
		});

		it('should return error if params has more than 64 mandatory keys', () => {
			expect(() =>
				validator.validate(registerMultisignatureCommand.schema, {
					numberOfSignatures: 2,
					mandatoryKeys: [...Array(65).keys()].map(() => utils.getRandomBytes(32)),
					optionalKeys: [],
					signatures: [utils.getRandomBytes(64)],
				}),
			).toThrow('must NOT have more than 64 items');
		});

		it('should return error if params mandatory keys contains items with length bigger than 32 bytes', () => {
			expect(() =>
				validator.validate(registerMultisignatureCommand.schema, {
					numberOfSignatures: 2,
					mandatoryKeys: [utils.getRandomBytes(32), utils.getRandomBytes(64)],
					optionalKeys: [],
					signatures: [utils.getRandomBytes(64), utils.getRandomBytes(64)],
				}),
			).toThrow("Property '.mandatoryKeys.1' maxLength exceeded");
		});

		it('should return error if params mandatory keys contains items with length smaller than 32 bytes', () => {
			expect(() =>
				validator.validate(registerMultisignatureCommand.schema, {
					numberOfSignatures: 2,
					mandatoryKeys: [utils.getRandomBytes(10), utils.getRandomBytes(32)],
					optionalKeys: [],
					signatures: [utils.getRandomBytes(64), utils.getRandomBytes(64)],
				}),
			).toThrow('minLength not satisfied');
		});

		it('should return error if params optional keys contains items with length bigger than 32 bytes', () => {
			expect(() =>
				validator.validate(registerMultisignatureCommand.schema, {
					numberOfSignatures: 1,
					mandatoryKeys: [],
					optionalKeys: [utils.getRandomBytes(64)],
					signatures: [utils.getRandomBytes(64)],
				}),
			).toThrow('maxLength exceeded');
		});

		it('should return error if params optional keys contains items with length smaller than 32 bytes', () => {
			expect(() =>
				validator.validate(registerMultisignatureCommand.schema, {
					numberOfSignatures: 1,
					mandatoryKeys: [],
					optionalKeys: [utils.getRandomBytes(31)],
					signatures: [utils.getRandomBytes(64)],
				}),
			).toThrow('minLength not satisfied');
		});

		it('should return error if params has more than 64 optional keys', () => {
			expect(() =>
				validator.validate(registerMultisignatureCommand.schema, {
					numberOfSignatures: 2,
					mandatoryKeys: [],
					optionalKeys: [...Array(65).keys()].map(() => utils.getRandomBytes(32)),
					signatures: [utils.getRandomBytes(64)],
				}),
			).toThrow('must NOT have more than 64 items');
		});

		it('should return error when the number of optional and mandatory keys is more than 64', () => {
			expect(() =>
				validator.validate(registerMultisignatureCommand.schema, {
					numberOfSignatures: 2,
					optionalKeys: [...Array(65).keys()].map(() => utils.getRandomBytes(32)),
					mandatoryKeys: [...Array(65).keys()].map(() => utils.getRandomBytes(32)),
					signatures: [utils.getRandomBytes(64)],
				}),
			).toThrow('must NOT have more than 64 item');
		});

		it('should return error when the number of optional and mandatory keys is less than 1', () => {
			expect(() =>
				validator.validate(registerMultisignatureCommand.schema, {
					optionalKeys: [],
					mandatoryKeys: [],
					numberOfSignatures: 0,
					signatures: [utils.getRandomBytes(64)],
				}),
			).toThrow('must be >= 1');
		});
	});

	describe('verify', () => {
		it('should return status OK for valid params: 2 mandatory, 2 optional and all 4 required signatures present', async () => {
			const context = testing
				.createTransactionContext({
					transaction,
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return status OK for valid params: 2 mandatory keys, 0 optional keys and both 2 required signatures present', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				optionalKeys: [],
				numberOfSignatures: 2,
				signatures: [decodedParams.signatures[0], decodedParams.signatures[1]],
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return status OK for valid params: 0 mandatory keys, 2 optional keys and both 2 required signatures present', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				mandatoryKeys: [],
				numberOfSignatures: 2,
				signatures: [decodedParams.signatures[2], decodedParams.signatures[3]],
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return status OK when the total number of mandatory and optional keys is 64', async () => {
			const mandatoryKeys = [...Array(20).keys()].map(() => utils.getRandomBytes(32));
			const optionalKeys = [...Array(44).keys()].map(() => utils.getRandomBytes(32));

			mandatoryKeys.sort((a, b) => a.compare(b));
			optionalKeys.sort((a, b) => a.compare(b));

			const params = codec.encode(registerMultisignatureParamsSchema, {
				mandatoryKeys,
				optionalKeys,
				numberOfSignatures: 64,
				signatures: [...Array(64).keys()].map(() => utils.getRandomBytes(64)),
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return error when there are duplicated mandatory keys', async () => {
			const publicKey = utils.getRandomBytes(32);
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				mandatoryKeys: [publicKey, publicKey],
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toBe('MandatoryKeys contains duplicate public keys.');
		});

		it('should return error when there are duplicated optional keys', async () => {
			const publicKey = utils.getRandomBytes(32);
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				optionalKeys: [publicKey, publicKey],
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

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
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toBe(
				'The numberOfSignatures is bigger than the count of Mandatory and Optional keys.',
			);
		});

		it('should return error when numberOfSignatures is smaller than mandatory key count', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				numberOfSignatures: 1,
				signatures: [utils.getRandomBytes(64)],
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toBe(
				'The numberOfSignatures needs to be equal or bigger than the number of Mandatory keys.',
			);
		});

		it('should return error when mandatory and optional key sets are not disjointed', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				optionalKeys: [keyPairs[0].publicKey, keyPairs[2].publicKey],
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toBe(
				'Invalid combination of Mandatory and Optional keys. Repeated keys across Mandatory and Optional were found.',
			);
		});

		it('should return error when mandatory keys set is not sorted', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				mandatoryKeys: [keyPairs[1].publicKey, keyPairs[0].publicKey],
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toBe('Mandatory keys should be sorted lexicographically.');
		});

		it('should return error when optional keys set is not sorted', async () => {
			const params = codec.encode(registerMultisignatureParamsSchema, {
				...decodedParams,
				optionalKeys: [keyPairs[3].publicKey, keyPairs[2].publicKey],
			});

			const context = testing
				.createTransactionContext({
					transaction: new Transaction({ ...transaction.toObject(), params }),
					chainID,
				})
				.createCommandVerifyContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			const result = await registerMultisignatureCommand.verify(context);

			expect(result.error?.message).toBe('Optional keys should be sorted lexicographically.');
		});
	});

	describe('execute', () => {
		const eventQueueMock: any = { add: jest.fn() };

		beforeEach(() => {
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			authAccountStore = authModule.stores.get(AuthAccountStore);
		});

		it('should not throw when registering for the first time and signatures are valid', async () => {
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					chainID,
				})
				.createCommandExecuteContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			await authAccountStore.set(context, transaction.senderAddress, defaultAuthAccount);

			context.eventQueue = eventQueueMock;
			jest.spyOn(authModule.events.get(MultisignatureRegistrationEvent), 'log');

			await expect(registerMultisignatureCommand.execute(context)).resolves.toBeUndefined();

			const authAccount = await authAccountStore.get(context, transaction.senderAddress);

			expect(authAccount.numberOfSignatures).toBe(decodedParams.numberOfSignatures);
			expect(authAccount.mandatoryKeys).toEqual(decodedParams.mandatoryKeys);
			expect(authAccount.optionalKeys).toEqual(decodedParams.optionalKeys);
			expect(authModule.events.get(MultisignatureRegistrationEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				transaction.senderAddress,
				{
					numberOfSignatures: context.params.numberOfSignatures,
					mandatoryKeys: context.params.mandatoryKeys,
					optionalKeys: context.params.optionalKeys,
				},
			);
		});

		it('should throw when the signature is incorrect', async () => {
			const invalidSignature = utils.getRandomBytes(64);
			decodedParams.signatures[0] = invalidSignature;

			const invalidTransaction = new Transaction({
				...transaction.toObject(),
				params: codec.encode(registerMultisignatureParamsSchema, decodedParams),
			});

			const context = testing
				.createTransactionContext({
					stateStore,
					transaction: invalidTransaction,
					chainID,
				})
				.createCommandExecuteContext<RegisterMultisignatureParams>(
					registerMultisignatureParamsSchema,
				);

			await authAccountStore.set(context, transaction.senderAddress, defaultAuthAccount);
			context.eventQueue = eventQueueMock;
			jest.spyOn(authModule.events.get(InvalidSignatureEvent), 'error');

			await expect(registerMultisignatureCommand.execute(context)).rejects.toThrow(
				`Invalid signature for public key ${context.params.mandatoryKeys[0].toString('hex')}.`,
			);

			expect(authModule.events.get(InvalidSignatureEvent).error).toHaveBeenCalledWith(
				expect.anything(),
				invalidTransaction.senderAddress,
				{
					numberOfSignatures: context.params.numberOfSignatures,
					mandatoryKeys: context.params.mandatoryKeys,
					optionalKeys: context.params.optionalKeys,
					failingPublicKey: context.params.mandatoryKeys[0],
					failingSignature: invalidSignature,
				},
			);
		});
	});
});
