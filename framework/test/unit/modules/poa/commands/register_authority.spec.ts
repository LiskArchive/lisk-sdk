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

import { TransactionAttrs } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import * as testing from '../../../../../src/testing';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	Transaction,
	VerifyStatus,
	PoAModule,
} from '../../../../../src';
import { RegisterAuthorityCommand } from '../../../../../src/modules/poa/commands/register_authority';
import { ValidatorsMethod } from '../../../../../src/modules/pos/types';
import { FeeMethod } from '../../../../../src/modules/interoperability/types';
import {
	COMMAND_REGISTER_AUTHORITY,
	REGISTRATION_FEE,
} from '../../../../../src/modules/poa/constants';

import { registerAuthorityParamsSchema } from '../../../../../src/modules/poa/schemas';
import { RegisterAuthorityParams } from '../../../../../src/modules/poa/types';

import { createStoreGetter } from '../../../../../src/testing/utils';
import { NameStore, ValidatorStore } from '../../../../../src/modules/poa/stores';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing';
import { getSenderAddress } from '../../../../../src/modules/poa/utils';

describe('RegisterAuthority', () => {
	const poa = new PoAModule();
	let registerAuthorityCommand: RegisterAuthorityCommand;
	let mockValidatorsMethod: ValidatorsMethod;
	let mockFeeMethod: FeeMethod;
	let stateStore: PrefixedStateReadWriter;
	let validatorSubstore: ValidatorStore;
	let nameSubstore: NameStore;

	const transactionParams = {
		name: 'max',
		blsKey: utils.getRandomBytes(48),
		proofOfPossession: utils.getRandomBytes(96),
		generatorKey: utils.getRandomBytes(32),
	};

	const publicKey = utils.getRandomBytes(32);
	const chainID = Buffer.from(
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
		'hex',
	);

	const buildTransaction = (transaction: Partial<TransactionAttrs>): Transaction => {
		return new Transaction({
			module: transaction.module ?? 'poa',
			command: transaction.command ?? COMMAND_REGISTER_AUTHORITY,
			senderPublicKey: transaction.senderPublicKey ?? publicKey,
			nonce: transaction.nonce ?? BigInt(0),
			fee: transaction.fee ?? BigInt(1000000000),
			params: transaction.params ?? codec.encode(registerAuthorityParamsSchema, transactionParams),
			signatures: transaction.signatures ?? [publicKey],
		});
	};

	beforeEach(() => {
		registerAuthorityCommand = new RegisterAuthorityCommand(poa.stores, poa.events);
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
		validatorSubstore = poa.stores.get(ValidatorStore);
		nameSubstore = poa.stores.get(NameStore);
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
				.createCommandVerifyContext<RegisterAuthorityParams>(registerAuthorityParamsSchema);
		});

		it('should return error when name does not comply regex', async () => {
			context = testing
				.createTransactionContext({
					stateStore,
					transaction: buildTransaction({
						params: codec.encode(registerAuthorityParamsSchema, {
							...transactionParams,
							name: '###',
						}),
					}),
					chainID,
				})
				.createCommandVerifyContext<RegisterAuthorityParams>(registerAuthorityParamsSchema);

			await expect(registerAuthorityCommand.verify(context)).rejects.toThrow('Invalid name');
		});

		it('should return error when name already exist', async () => {
			await nameSubstore.set(createStoreGetter(stateStore), Buffer.from(transactionParams.name), {
				address: getSenderAddress(context.transaction.senderPublicKey),
			});

			await expect(registerAuthorityCommand.verify(context)).rejects.toThrow('name already exist');
		});

		it('should return error when senderAddress already exist', async () => {
			await validatorSubstore.set(createStoreGetter(stateStore), getSenderAddress(publicKey), {
				name: transactionParams.name,
			});

			await expect(registerAuthorityCommand.verify(context)).rejects.toThrow(
				'validator already exist',
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
				.createCommandExecuteContext(registerAuthorityParamsSchema);
		});

		it('should call registerValidatorKeys', async () => {
			await registerAuthorityCommand.execute(context);

			expect(mockFeeMethod.payFee).toHaveBeenCalledWith(expect.anything(), REGISTRATION_FEE);
			await expect(
				validatorSubstore.has(createStoreGetter(stateStore), getSenderAddress(publicKey)),
			).resolves.toBe(true);
			await expect(
				nameSubstore.has(createStoreGetter(stateStore), Buffer.from(transactionParams.name)),
			).resolves.toBe(true);
			expect(mockValidatorsMethod.registerValidatorKeys).toHaveBeenCalledWith(
				expect.anything(),
				getSenderAddress(publicKey),
				context.params.proofOfPossession,
				context.params.generatorKey,
				context.params.blsKey,
			);
		});
	});
});
