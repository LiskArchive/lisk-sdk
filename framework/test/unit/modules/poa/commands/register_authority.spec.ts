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

import { address, utils } from '@liskhq/lisk-cryptography';
import { TransactionAttrs } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import * as testing from '../../../../../src/testing';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	Transaction,
	VerifyStatus,
	PoAModule,
} from '../../../../../src';
import { RegisterAuthorityCommand } from '../../../../../src/modules/poa/commands/register_authority';
import {
	COMMAND_REGISTER_AUTHORITY,
	AUTHORITY_REGISTRATION_FEE,
	LENGTH_BLS_KEY,
	LENGTH_PROOF_OF_POSSESSION,
	LENGTH_GENERATOR_KEY,
	MODULE_NAME_POA,
	POA_VALIDATOR_NAME_REGEX,
} from '../../../../../src/modules/poa/constants';

import { registerAuthoritySchema } from '../../../../../src/modules/poa/schemas';
import { RegisterAuthorityParams, ValidatorsMethod } from '../../../../../src/modules/poa/types';

import { createStoreGetter } from '../../../../../src/testing/utils';
import { NameStore, ValidatorStore } from '../../../../../src/modules/poa/stores';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing';
import { ED25519_PUBLIC_KEY_LENGTH } from '../../../../../src/modules/validators/constants';

describe('RegisterAuthority', () => {
	const poaModule = new PoAModule();
	let registerAuthorityCommand: RegisterAuthorityCommand;
	let mockValidatorsMethod: ValidatorsMethod;
	let mockFeeMethod: any;
	let stateStore: PrefixedStateReadWriter;
	let validatorStore: ValidatorStore;
	let nameStore: NameStore;

	const registerAuthorityTransactionParams = {
		name: 'max',
		blsKey: utils.getRandomBytes(LENGTH_BLS_KEY),
		proofOfPossession: utils.getRandomBytes(LENGTH_PROOF_OF_POSSESSION),
		generatorKey: utils.getRandomBytes(LENGTH_GENERATOR_KEY),
	};

	const publicKey = utils.getRandomBytes(ED25519_PUBLIC_KEY_LENGTH);
	const chainID = Buffer.from([0, 0, 0, 1]);

	const buildTransaction = (transaction: Partial<TransactionAttrs>): Transaction => {
		return new Transaction({
			module: transaction.module ?? MODULE_NAME_POA,
			command: transaction.command ?? COMMAND_REGISTER_AUTHORITY,
			senderPublicKey: transaction.senderPublicKey ?? publicKey,
			nonce: transaction.nonce ?? BigInt(0),
			fee: transaction.fee ?? AUTHORITY_REGISTRATION_FEE,
			params:
				transaction.params ??
				codec.encode(registerAuthoritySchema, registerAuthorityTransactionParams),
			signatures: transaction.signatures ?? [publicKey],
		});
	};

	beforeEach(() => {
		registerAuthorityCommand = new RegisterAuthorityCommand(poaModule.stores, poaModule.events);
		mockValidatorsMethod = {
			setValidatorGeneratorKey: jest.fn(),
			registerValidatorKeys: jest.fn(),
			registerValidatorWithoutBLSKey: jest.fn(),
			getValidatorKeys: jest.fn(),
			getGeneratorsBetweenTimestamps: jest.fn(),
			setValidatorsParams: jest.fn(),
		};
		mockFeeMethod = {
			payFee: jest.fn(),
		};
		registerAuthorityCommand.addDependencies(mockValidatorsMethod, mockFeeMethod);

		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		validatorStore = poaModule.stores.get(ValidatorStore);
		nameStore = poaModule.stores.get(NameStore);
	});

	describe('verify', () => {
		let context: CommandVerifyContext<RegisterAuthorityParams>;
		beforeEach(() => {
			context = testing
				.createTransactionContext({
					stateStore,
					transaction: buildTransaction({}),
					chainID,
				})
				.createCommandVerifyContext<RegisterAuthorityParams>(registerAuthoritySchema);
		});

		it('should return error when name does not comply regex', async () => {
			context = testing
				.createTransactionContext({
					stateStore,
					transaction: buildTransaction({
						params: codec.encode(registerAuthoritySchema, {
							...registerAuthorityTransactionParams,
							name: '###',
						}),
					}),
					chainID,
				})
				.createCommandVerifyContext<RegisterAuthorityParams>(registerAuthoritySchema);

			await expect(registerAuthorityCommand.verify(context)).rejects.toThrow(
				`Name does not comply with format ${POA_VALIDATOR_NAME_REGEX.toString()}.`,
			);
		});

		it('should return error when name already exist', async () => {
			await nameStore.set(
				createStoreGetter(stateStore),
				Buffer.from(registerAuthorityTransactionParams.name),
				{
					address: address.getAddressFromPublicKey(context.transaction.senderPublicKey),
				},
			);

			await expect(registerAuthorityCommand.verify(context)).rejects.toThrow(
				'Name already exists.',
			);
		});

		it('should return error when senderAddress already exist', async () => {
			await validatorStore.set(
				createStoreGetter(stateStore),
				address.getAddressFromPublicKey(publicKey),
				{
					name: registerAuthorityTransactionParams.name,
				},
			);

			await expect(registerAuthorityCommand.verify(context)).rejects.toThrow(
				'Validator already exists.',
			);
		});

		it('should return OK when transaction is valid', async () => {
			const result = await registerAuthorityCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.OK);
		});
	});

	describe('execute', () => {
		let context: CommandExecuteContext<RegisterAuthorityParams>;
		beforeEach(() => {
			context = testing
				.createTransactionContext({
					stateStore,
					transaction: buildTransaction({}),
					chainID,
				})
				.createCommandExecuteContext(registerAuthoritySchema);
		});

		it('should call registerValidatorKeys', async () => {
			await registerAuthorityCommand.execute(context);

			expect(mockFeeMethod.payFee).toHaveBeenCalledWith(
				expect.anything(),
				AUTHORITY_REGISTRATION_FEE,
			);
			await expect(
				validatorStore.has(
					createStoreGetter(stateStore),
					address.getAddressFromPublicKey(publicKey),
				),
			).resolves.toBe(true);
			await expect(
				nameStore.has(
					createStoreGetter(stateStore),
					Buffer.from(registerAuthorityTransactionParams.name),
				),
			).resolves.toBe(true);
			expect(mockValidatorsMethod.registerValidatorKeys).toHaveBeenCalledWith(
				expect.anything(),
				address.getAddressFromPublicKey(publicKey),
				context.params.proofOfPossession,
				context.params.generatorKey,
				context.params.blsKey,
			);
		});
	});
});
