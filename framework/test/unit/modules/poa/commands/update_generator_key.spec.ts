/*
 * Copyright © 2023 Lisk Foundation
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

import { validator } from '@liskhq/lisk-validator';
import { codec } from '@liskhq/lisk-codec';
import { TransactionAttrs } from '@liskhq/lisk-chain';
import { utils, address } from '@liskhq/lisk-cryptography';

import {
	PoAModule,
	Transaction,
	CommandVerifyContext,
	CommandExecuteContext,
	VerifyStatus,
} from '../../../../../src';
import { UpdateGeneratorKeyParams, ValidatorsMethod } from '../../../../../src/modules/poa/types';
import { ValidatorStore } from '../../../../../src/modules/poa/stores';
import {
	AUTHORITY_REGISTRATION_FEE,
	COMMAND_UPDATE_KEY,
	LENGTH_GENERATOR_KEY,
	MODULE_NAME_POA,
} from '../../../../../src/modules/poa/constants';
import { updateGeneratorKeySchema } from '../../../../../src/modules/poa/schemas';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing';
import * as testing from '../../../../../src/testing';
import { UpdateGeneratorKeyCommand } from '../../../../../src/modules/poa/commands/update_generator_key';
import { createStoreGetter } from '../../../../../src/testing/utils';

describe('UpdateGeneratorKey', () => {
	const poaModule = new PoAModule();
	let updateGeneratorKeyCommand: UpdateGeneratorKeyCommand;
	let stateStore: PrefixedStateReadWriter;
	let mockValidatorsMethod: ValidatorsMethod;
	let validatorStore: ValidatorStore;

	const publicKey = utils.getRandomBytes(32);
	const chainID = Buffer.from([0, 0, 0, 1]);

	const updateGeneratorKeyParams: UpdateGeneratorKeyParams = {
		generatorKey: utils.getRandomBytes(LENGTH_GENERATOR_KEY),
	};

	const buildTransaction = (transaction: Partial<TransactionAttrs>): Transaction => {
		return new Transaction({
			module: transaction.module ?? MODULE_NAME_POA,
			command: transaction.command ?? COMMAND_UPDATE_KEY,
			senderPublicKey: transaction.senderPublicKey ?? publicKey,
			nonce: transaction.nonce ?? BigInt(0),
			fee: transaction.fee ?? AUTHORITY_REGISTRATION_FEE,
			params:
				transaction.params ?? codec.encode(updateGeneratorKeySchema, updateGeneratorKeyParams),
			signatures: transaction.signatures ?? [publicKey],
		});
	};

	beforeEach(async () => {
		updateGeneratorKeyCommand = new UpdateGeneratorKeyCommand(poaModule.stores, poaModule.events);
		mockValidatorsMethod = {
			setValidatorGeneratorKey: jest.fn(),
			registerValidatorKeys: jest.fn(),
			registerValidatorWithoutBLSKey: jest.fn(),
			getValidatorKeys: jest.fn(),
			getGeneratorsBetweenTimestamps: jest.fn(),
			setValidatorsParams: jest.fn(),
		};
		updateGeneratorKeyCommand.addDependencies(mockValidatorsMethod);

		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		validatorStore = poaModule.stores.get(ValidatorStore);

		await validatorStore.set(
			createStoreGetter(stateStore),
			address.getAddressFromPublicKey(publicKey),
			{
				name: 'validator',
			},
		);
	});

	describe('verifySchema', () => {
		it(`should throw error when generator key shorter than ${LENGTH_GENERATOR_KEY}`, () => {
			expect(() =>
				validator.validate(updateGeneratorKeyCommand.schema, {
					generatorKey: utils.getRandomBytes(LENGTH_GENERATOR_KEY - 1),
				}),
			).toThrow(`Property '.generatorKey' minLength not satisfied`);
		});

		it(`should throw error when generator key longer than ${LENGTH_GENERATOR_KEY}`, () => {
			expect(() =>
				validator.validate(updateGeneratorKeyCommand.schema, {
					generatorKey: utils.getRandomBytes(LENGTH_GENERATOR_KEY + 1),
				}),
			).toThrow(`Property '.generatorKey' maxLength exceeded`);
		});
	});

	describe('verify', () => {
		let context: CommandVerifyContext<UpdateGeneratorKeyParams>;
		beforeEach(() => {
			context = testing
				.createTransactionContext({
					stateStore,
					transaction: buildTransaction({}),
					chainID,
				})
				.createCommandVerifyContext<UpdateGeneratorKeyParams>(updateGeneratorKeySchema);
		});

		it('should return error when validator not exist', async () => {
			await validatorStore.del(
				createStoreGetter(stateStore),
				address.getAddressFromPublicKey(publicKey),
			);

			await expect(updateGeneratorKeyCommand.verify(context)).rejects.toThrow(
				'Validator does not exist.',
			);
		});

		it('should return OK when transaction is valid', async () => {
			const result = await updateGeneratorKeyCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.OK);
		});
	});

	describe('execute', () => {
		let context: CommandExecuteContext<UpdateGeneratorKeyParams>;
		beforeEach(async () => {
			context = testing
				.createTransactionContext({
					stateStore,
					transaction: buildTransaction({}),
					chainID,
				})
				.createCommandExecuteContext<UpdateGeneratorKeyParams>(updateGeneratorKeySchema);
		});

		it('should call setValidatorGeneratorKey', async () => {
			await updateGeneratorKeyCommand.execute(context);

			expect(mockValidatorsMethod.setValidatorGeneratorKey).toHaveBeenCalledWith(
				expect.anything(),
				address.getAddressFromPublicKey(publicKey),
				context.params.generatorKey,
			);
		});
	});
});
