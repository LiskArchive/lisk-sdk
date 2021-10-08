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
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import * as testing from '../../../../src/testing';
import { UpdateGeneratorKeyCommand } from '../../../../src/modules/dpos_v2/commands/update_generator_key';
import {
	MODULE_ID_DPOS,
	COMMAND_ID_UPDATE_GENERATOR_KEY,
} from '../../../../src/modules/dpos_v2/constants';
import { updateGeneratorKeyCommandParamsSchema } from '../../../../src/modules/dpos_v2/schemas';
import { UpdateGeneratorKeyParams, ValidatorsAPI } from '../../../../src/modules/dpos_v2/types';
import { VerifyStatus } from '../../../../src/node/state_machine';

describe('Update generator key command', () => {
	let updateGeneratorCommand: UpdateGeneratorKeyCommand;
	const transactionParams = codec.encode(updateGeneratorKeyCommandParamsSchema, {
		generatorKey: getRandomBytes(32),
	});
	const publicKey = getRandomBytes(32);
	const transaction = new Transaction({
		moduleID: MODULE_ID_DPOS,
		commandID: COMMAND_ID_UPDATE_GENERATOR_KEY,
		senderPublicKey: publicKey,
		nonce: BigInt(0),
		fee: BigInt(100000000),
		params: transactionParams,
		signatures: [publicKey],
	});
	const networkIdentifier = Buffer.from(
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
		'hex',
	);
	const mockValidatorsAPI = { setValidatorGeneratorKey: jest.fn() };

	beforeEach(() => {
		updateGeneratorCommand = new UpdateGeneratorKeyCommand(MODULE_ID_DPOS);
		updateGeneratorCommand.addDependencies((mockValidatorsAPI as unknown) as ValidatorsAPI);
	});

	describe('verify', () => {
		it('should return status OK for valid params', async () => {
			const context = testing
				.createTransactionContext({
					transaction,
					networkIdentifier,
				})
				.createCommandVerifyContext<UpdateGeneratorKeyParams>(
					updateGeneratorKeyCommandParamsSchema,
				);
			const result = await updateGeneratorCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return error if generatorKey is invalid', async () => {
			const invalidParams = codec.encode(updateGeneratorKeyCommandParamsSchema, {
				generatorKey: getRandomBytes(64),
			});
			const invalidTransaction = new Transaction({
				moduleID: MODULE_ID_DPOS,
				commandID: COMMAND_ID_UPDATE_GENERATOR_KEY,
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
				.createCommandVerifyContext<UpdateGeneratorKeyParams>(
					updateGeneratorKeyCommandParamsSchema,
				);
			const result = await updateGeneratorCommand.verify(context);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude("Property '.generatorKey' maxLength exceeded");
		});
	});

	describe('execute', () => {
		it('should call validators API setValidatorGeneratorKey', async () => {
			const context = testing
				.createTransactionContext({
					transaction,
					networkIdentifier,
				})
				.createCommandExecuteContext<UpdateGeneratorKeyParams>(
					updateGeneratorKeyCommandParamsSchema,
				);
			await updateGeneratorCommand.execute(context);
			const apiContext = context.getAPIContext();

			expect(mockValidatorsAPI.setValidatorGeneratorKey).toHaveBeenCalledWith(
				apiContext,
				transaction.senderAddress,
				context.params.generatorKey,
			);
		});
	});
});
