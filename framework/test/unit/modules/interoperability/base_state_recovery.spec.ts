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
import { SparseMerkleTree } from '@liskhq/lisk-db';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	MainchainInteroperabilityModule,
} from '../../../../src';
import { BaseCCCommand } from '../../../../src/modules/interoperability/base_cc_command';
import { BaseCCMethod } from '../../../../src/modules/interoperability/base_cc_method';
import {
	COMMAND_NAME_STATE_RECOVERY,
	HASH_LENGTH,
	RECOVERED_STORE_VALUE,
} from '../../../../src/modules/interoperability/constants';
import { RecoverStateCommand } from '../../../../src/modules/interoperability/mainchain/commands/recover_state';
import { stateRecoveryParamsSchema } from '../../../../src/modules/interoperability/schemas';
import {
	TerminatedStateAccount,
	TerminatedStateStore,
} from '../../../../src/modules/interoperability/stores/terminated_state';
import { StateRecoveryParams } from '../../../../src/modules/interoperability/types';
import { TransactionContext, VerifyStatus } from '../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { createTransactionContext } from '../../../../src/testing';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { createStoreGetter } from '../../../../src/testing/utils';
import { InvalidSMTVerificationEvent } from '../../../../src/modules/interoperability/events/invalid_smt_verification';
import { computeStorePrefix } from '../../../../src/modules/base_store';

describe('RecoverStateCommand', () => {
	// Since the code is same for both mainchain and sidechain, using mainchain will be enough to test both
	const interopMod = new MainchainInteroperabilityModule();
	const moduleName = 'fooModule';
	let chainIDAsBuffer: Buffer;
	let stateRecoveryCommand: RecoverStateCommand;
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
			module: moduleName,
			recover: jest.fn(),
		};
		interoperableCCMethods.set(moduleName, interoperableMethod);
		ccCommands = new Map();
		stateRecoveryCommand = new RecoverStateCommand(
			interopMod.stores,
			interopMod.events,
			interoperableCCMethods,
			ccCommands,
			interopMod['internalMethod'],
		);
		transactionParams = {
			chainID: utils.intToBuffer(3, 4),
			module: moduleName,
			storeEntries: [
				{
					substorePrefix: Buffer.from([1, 1]),
					storeKey: utils.getRandomBytes(32),
					storeValue: utils.getRandomBytes(32),
					bitmap: utils.getRandomBytes(32),
				},
			],
			siblingHashes: [utils.getRandomBytes(HASH_LENGTH)],
		};
		chainIDAsBuffer = transactionParams.chainID;
		encodedTransactionParams = codec.encode(stateRecoveryParamsSchema, transactionParams);
		transaction = new Transaction({
			module: moduleName,
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
			mainchainStateRoot: utils.getRandomBytes(HASH_LENGTH),
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
		commandVerifyContext =
			transactionContext.createCommandVerifyContext<StateRecoveryParams>(stateRecoveryParamsSchema);
		commandExecuteContext =
			transactionContext.createCommandExecuteContext<StateRecoveryParams>(
				stateRecoveryParamsSchema,
			);
		jest.spyOn(SparseMerkleTree.prototype, 'verify').mockResolvedValue(true);
		jest
			.spyOn(SparseMerkleTree.prototype, 'calculateRoot')
			.mockResolvedValue(utils.getRandomBytes(HASH_LENGTH));
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

		it('should return error if module not registered on chain', async () => {
			interoperableCCMethods.delete(moduleName);
			const result = await stateRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Module is not registered on the chain.');
		});

		it('should return error if module not recoverable', async () => {
			const moduleMethod = interoperableCCMethods.get(moduleName) as BaseCCMethod;
			moduleMethod.recover = undefined;
			const result = await stateRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Module is not recoverable.');
		});

		it('should return error if recovered store keys are not pairwise distinct', async () => {
			commandVerifyContext.params.storeEntries.push(commandVerifyContext.params.storeEntries[0]);

			const result = await stateRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Recovered store keys are not pairwise distinct.');
		});
	});

	describe('execute', () => {
		it('should resolve if params are valid', async () => {
			await expect(stateRecoveryCommand.execute(commandExecuteContext)).resolves.toBeUndefined();
		});

		it('should return error if proof of inclusion is not valid', async () => {
			const invalidSMTVerificationEvent = interopMod.events.get(InvalidSMTVerificationEvent);
			jest.spyOn(SparseMerkleTree.prototype, 'verify').mockResolvedValue(false);
			jest.spyOn(invalidSMTVerificationEvent, 'error');

			await expect(stateRecoveryCommand.execute(commandExecuteContext)).rejects.toThrow(
				'State recovery proof of inclusion is not valid',
			);
			expect(invalidSMTVerificationEvent.error).toHaveBeenCalled();
		});

		it(`should throw error if recovery not available for "${moduleName}"`, async () => {
			interoperableCCMethods.delete(moduleName);

			await expect(stateRecoveryCommand.execute(commandExecuteContext)).rejects.toThrow(
				`Recovery failed for module: ${moduleName}`,
			);
		});

		it('should throw error if recover method fails', async () => {
			interoperableMethod.recover = jest.fn().mockRejectedValue(new Error('error'));

			await expect(stateRecoveryCommand.execute(commandExecuteContext)).rejects.toThrow(
				`Recovery failed for module: ${moduleName}`,
			);
		});

		it('should set root value for terminated state substore', async () => {
			const newStateRoot = utils.getRandomBytes(HASH_LENGTH);
			jest.spyOn(SparseMerkleTree.prototype, 'calculateRoot').mockResolvedValue(newStateRoot);

			await stateRecoveryCommand.execute(commandExecuteContext);

			const newTerminatedStateAccount = await terminatedStateSubstore.get(
				createStoreGetter(stateStore),
				chainIDAsBuffer,
			);

			const storeQueriesUpdate = [];
			const storePrefix = computeStorePrefix(transactionParams.module);
			for (const entry of transactionParams.storeEntries) {
				storeQueriesUpdate.push({
					key: Buffer.concat([storePrefix, entry.substorePrefix, utils.hash(entry.storeKey)]),
					value: RECOVERED_STORE_VALUE,
					bitmap: entry.bitmap,
				});
			}
			expect(SparseMerkleTree.prototype.calculateRoot).toHaveBeenCalledWith({
				queries: storeQueriesUpdate,
				siblingHashes: transactionParams.siblingHashes,
			});

			expect(newTerminatedStateAccount.stateRoot.toString('hex')).toBe(
				newStateRoot.toString('hex'),
			);
		});
	});
});
