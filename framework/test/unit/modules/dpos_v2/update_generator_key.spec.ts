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
import * as testing from '../../../../src/testing';
import { UpdateGeneratorKeyCommand } from '../../../../src/modules/dpos_v2/commands/update_generator_key';
import { updateGeneratorKeyCommandParamsSchema } from '../../../../src/modules/dpos_v2/schemas';
import { UpdateGeneratorKeyParams, ValidatorsMethod } from '../../../../src/modules/dpos_v2/types';
import { VerifyStatus } from '../../../../src/state_machine';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { DPoSModule } from '../../../../src/modules/dpos_v2/module';
import { DelegateStore } from '../../../../src/modules/dpos_v2/stores/delegate';
import { createStoreGetter } from '../../../../src/testing/utils';

describe('Update generator key command', () => {
	const dpos = new DPoSModule();

	let updateGeneratorCommand: UpdateGeneratorKeyCommand;
	let stateStore: PrefixedStateReadWriter;
	let delegateSubstore: DelegateStore;

	const transactionParams = codec.encode(updateGeneratorKeyCommandParamsSchema, {
		generatorKey: utils.getRandomBytes(32),
	});
	const publicKey = utils.getRandomBytes(32);
	const transaction = new Transaction({
		module: 'dpos',
		command: 'updateGeneratorKey',
		senderPublicKey: publicKey,
		nonce: BigInt(0),
		fee: BigInt(100000000),
		params: transactionParams,
		signatures: [publicKey],
	});
	const chainID = Buffer.from(
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
		'hex',
	);
	const mockValidatorsMethod = { setValidatorGeneratorKey: jest.fn() };

	beforeEach(async () => {
		updateGeneratorCommand = new UpdateGeneratorKeyCommand(dpos.stores, dpos.events);
		updateGeneratorCommand.addDependencies((mockValidatorsMethod as unknown) as ValidatorsMethod);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		delegateSubstore = dpos.stores.get(DelegateStore);
		await delegateSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
			name: 'mrrobot',
			totalVotesReceived: BigInt(10000000000),
			selfVotes: BigInt(1000000000),
			lastGeneratedHeight: 100,
			isBanned: false,
			pomHeights: [],
			consecutiveMissedBlocks: 0,
		});
	});

	describe('verify', () => {
		it('should return status OK for valid params', async () => {
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					chainID,
				})
				.createCommandVerifyContext<UpdateGeneratorKeyParams>(
					updateGeneratorKeyCommandParamsSchema,
				);
			const result = await updateGeneratorCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return error if generatorKey is invalid', async () => {
			const invalidParams = codec.encode(updateGeneratorKeyCommandParamsSchema, {
				generatorKey: utils.getRandomBytes(64),
			});
			const invalidTransaction = new Transaction({
				module: 'dpos',
				command: 'updateGeneratorKey',
				senderPublicKey: publicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: invalidParams,
				signatures: [publicKey],
			});
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction: invalidTransaction,
					chainID,
				})
				.createCommandVerifyContext<UpdateGeneratorKeyParams>(
					updateGeneratorKeyCommandParamsSchema,
				);
			const result = await updateGeneratorCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude("Property '.generatorKey' maxLength exceeded");
		});

		it('should return error if store key address does not exist', async () => {
			const context = testing
				.createTransactionContext({
					transaction,
					chainID,
				})
				.createCommandVerifyContext<UpdateGeneratorKeyParams>(
					updateGeneratorKeyCommandParamsSchema,
				);
			const result = await updateGeneratorCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Delegate substore must have an entry for the store key address',
			);
		});
	});

	describe('execute', () => {
		it('should call validators Method setValidatorGeneratorKey', async () => {
			const context = testing
				.createTransactionContext({
					transaction,
					chainID,
				})
				.createCommandExecuteContext<UpdateGeneratorKeyParams>(
					updateGeneratorKeyCommandParamsSchema,
				);
			await updateGeneratorCommand.execute(context);

			expect(mockValidatorsMethod.setValidatorGeneratorKey).toHaveBeenCalledWith(
				expect.anything(),
				transaction.senderAddress,
				context.params.generatorKey,
			);
		});
	});
});
