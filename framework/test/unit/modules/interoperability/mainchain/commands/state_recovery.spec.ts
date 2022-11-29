/*
 * Copyright © 2022 Lisk Foundation
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
import { sparseMerkleTree } from '@liskhq/lisk-tree';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	MainchainInteroperabilityModule,
} from '../../../../../../src';
import { BaseCCCommand } from '../../../../../../src/modules/interoperability/base_cc_command';
import { BaseCCMethod } from '../../../../../../src/modules/interoperability/base_cc_method';
import { COMMAND_NAME_STATE_RECOVERY } from '../../../../../../src/modules/interoperability/constants';
import { StateRecoveryCommand } from '../../../../../../src/modules/interoperability/mainchain/commands/state_recovery';
import { stateRecoveryParamsSchema } from '../../../../../../src/modules/interoperability/schemas';
import {
	TerminatedStateAccount,
	TerminatedStateStore,
} from '../../../../../../src/modules/interoperability/stores/terminated_state';
import { StateRecoveryParams } from '../../../../../../src/modules/interoperability/types';
import { TransactionContext, VerifyStatus } from '../../../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../../../src/state_machine/prefixed_state_read_writer';
import { createTransactionContext } from '../../../../../../src/testing';
import { InMemoryPrefixedStateDB } from '../../../../../../src/testing/in_memory_prefixed_state';
import { createStoreGetter } from '../../../../../../src/testing/utils';

describe('Mainchain StateRecoveryCommand', () => {
	const interopMod = new MainchainInteroperabilityModule();
	const module = 'module';
	let chainIDAsBuffer: Buffer;
	let stateRecoveryCommand: StateRecoveryCommand;
	let commandVerifyContext: CommandVerifyContext<StateRecoveryParams>;
	let commandExecuteContext: CommandExecuteContext<StateRecoveryParams>;
	let interoperableCCMethods: Map<string, BaseCCMethod>;
	let interoperableMethod: any;
	let ccCommands: Map<string, BaseCCCommand[]>;
	let transaction: Transaction;
	let transactionParams: StateRecoveryParams;
	let encodedTransactionParams: Buffer;
	let transactionContext: TransactionContext;
	let stateStore: PrefixedStateReadWriter;
	let terminatedStateSubstore: TerminatedStateStore;
	let terminatedStateAccount: TerminatedStateAccount;

	beforeEach(async () => {
		interoperableCCMethods = new Map();
		interoperableMethod = {
			module,
			recover: jest.fn(),
		};
		interoperableCCMethods.set('module', interoperableMethod);
		ccCommands = new Map();
		stateRecoveryCommand = new StateRecoveryCommand(
			interopMod.stores,
			interopMod.events,
			interoperableCCMethods,
			ccCommands,
			interopMod['internalMethod'],
		);
		transactionParams = {
			chainID: utils.intToBuffer(3, 4),
			module,
			storeEntries: [
				{
					substorePrefix: Buffer.from([1]),
					storeKey: utils.getRandomBytes(32),
					storeValue: utils.getRandomBytes(32),
					bitmap: utils.getRandomBytes(32),
				},
			],
			siblingHashes: [utils.getRandomBytes(32)],
		};
		chainIDAsBuffer = transactionParams.chainID;
		encodedTransactionParams = codec.encode(stateRecoveryParamsSchema, transactionParams);
		transaction = new Transaction({
			module,
			command: COMMAND_NAME_STATE_RECOVERY,
			fee: BigInt(100000000),
			nonce: BigInt(0),
			params: encodedTransactionParams,
			senderPublicKey: utils.getRandomBytes(32),
			signatures: [],
		});
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		terminatedStateSubstore = interopMod.stores.get(TerminatedStateStore);
		terminatedStateAccount = {
			initialized: true,
			stateRoot: Buffer.from(
				'3f91f1b7bc96933102dcce6a6c9200c68146a8327c16b91f8e4b37f40e2e2fb4',
				'hex',
			),
			mainchainStateRoot: utils.getRandomBytes(32),
		};
		await terminatedStateSubstore.set(
			createStoreGetter(stateStore),
			chainIDAsBuffer,
			terminatedStateAccount as any,
		);
		transactionContext = createTransactionContext({
			transaction,
			stateStore,
		});
		commandVerifyContext = transactionContext.createCommandVerifyContext<StateRecoveryParams>(
			stateRecoveryParamsSchema,
		);
		commandExecuteContext = transactionContext.createCommandExecuteContext<StateRecoveryParams>(
			stateRecoveryParamsSchema,
		);
		jest.spyOn(sparseMerkleTree, 'verify').mockReturnValue(true);
		jest.spyOn(sparseMerkleTree, 'calculateRoot').mockReturnValue(utils.getRandomBytes(32));
	});

	describe('verify', () => {
		it('should return status OK for valid params', async () => {
			const result = await stateRecoveryCommand.verify(commandVerifyContext);
			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return error if terminated state does not exist', async () => {
			await terminatedStateSubstore.del(createStoreGetter(stateStore), chainIDAsBuffer);
			const result = await stateRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('The terminated state does not exist.');
		});

		it('should return error if terminated state is not initialized', async () => {
			await terminatedStateSubstore.set(createStoreGetter(stateStore), chainIDAsBuffer, {
				...terminatedStateAccount,
				initialized: false,
			});
			const result = await stateRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('The terminated state is not initialized.');
		});

		it('should return error if module is interoperability module', async () => {
			commandVerifyContext.params.module = 'interoperability';
			const result = await stateRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Interoperability module cannot be recovered.');
		});

		it('should return error if module not registered on chain', async () => {
			interoperableCCMethods.delete(module);
			const result = await stateRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Module is not registered on the chain.');
		});

		it('should return error if module not recoverable', async () => {
			const moduleMethod = interoperableCCMethods.get(module) as BaseCCMethod;
			moduleMethod.recover = undefined;
			const result = await stateRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Module is not recoverable.');
		});

		it('should return error if recovered store value is empty', async () => {
			commandVerifyContext.params.storeEntries[0] = {
				substorePrefix: Buffer.alloc(0),
				storeKey: Buffer.alloc(0),
				storeValue: Buffer.alloc(0),
				bitmap: Buffer.alloc(0),
			};

			const result = await stateRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Recovered store value cannot be empty.');
		});

		it('should return error if proof of inclusion is not verified', async () => {
			jest.spyOn(sparseMerkleTree, 'verify').mockReturnValue(false);

			const result = await stateRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('State recovery proof of inclusion is not valid.');
		});
	});

	describe('execute', () => {
		it('should resolve if params are valid', async () => {
			await expect(stateRecoveryCommand.execute(commandExecuteContext)).resolves.toBeUndefined();
		});

		it('should throw error if recovery not available for module', async () => {
			interoperableCCMethods.delete('module');

			await expect(stateRecoveryCommand.execute(commandExecuteContext)).rejects.toThrow(
				`Recovery failed for module: ${module}`,
			);
		});

		it('should throw error if recover method fails', async () => {
			interoperableMethod.recover = jest.fn().mockRejectedValue(new Error('error'));

			await expect(stateRecoveryCommand.execute(commandExecuteContext)).rejects.toThrow(
				`Recovery failed for module: ${module}`,
			);
		});

		it('should set root value for terminated state substore', async () => {
			const newStateRoot = utils.getRandomBytes(32);
			jest.spyOn(sparseMerkleTree, 'calculateRoot').mockReturnValue(newStateRoot);

			await stateRecoveryCommand.execute(commandExecuteContext);

			const newTerminatedStateAccount = await terminatedStateSubstore.get(
				createStoreGetter(stateStore),
				chainIDAsBuffer,
			);

			expect(newTerminatedStateAccount.stateRoot.toString('hex')).toBe(
				newStateRoot.toString('hex'),
			);
		});
	});
});
