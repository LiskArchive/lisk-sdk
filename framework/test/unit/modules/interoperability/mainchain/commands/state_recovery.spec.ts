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
import { CommandExecuteContext, CommandVerifyContext } from '../../../../../../src';
import { BaseCCCommand } from '../../../../../../src/modules/interoperability/base_cc_command';
import { BaseInteroperableAPI } from '../../../../../../src/modules/interoperability/base_interoperable_api';
import {
	COMMAND_NAME_STATE_RECOVERY,
	MODULE_NAME_INTEROPERABILITY,
	STORE_PREFIX_TERMINATED_STATE,
} from '../../../../../../src/modules/interoperability/constants';
import { StateRecoveryCommand } from '../../../../../../src/modules/interoperability/mainchain/commands/state_recovery';
import {
	stateRecoveryParamsSchema,
	terminatedStateSchema,
} from '../../../../../../src/modules/interoperability/schemas';
import {
	StateRecoveryParams,
	TerminatedStateAccount,
} from '../../../../../../src/modules/interoperability/types';
import { TransactionContext, VerifyStatus } from '../../../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../../../src/state_machine/prefixed_state_read_writer';
import { SubStore } from '../../../../../../src/state_machine/types';
import { createTransactionContext } from '../../../../../../src/testing';
import { InMemoryPrefixedStateDB } from '../../../../../../src/testing/in_memory_prefixed_state';

describe('Mainchain StateRecoveryCommand', () => {
	let chainIDAsBuffer: Buffer;
	let stateRecoveryCommand: StateRecoveryCommand;
	let commandVerifyContext: CommandVerifyContext<StateRecoveryParams>;
	let commandExecuteContext: CommandExecuteContext<StateRecoveryParams>;
	let interoperableCCAPIs: Map<number, BaseInteroperableAPI>;
	let interoperableAPI: any;
	let ccCommands: Map<number, BaseCCCommand[]>;
	let transaction: Transaction;
	let transactionParams: StateRecoveryParams;
	let encodedTransactionParams: Buffer;
	let transactionContext: TransactionContext;
	let stateStore: PrefixedStateReadWriter;
	let terminatedStateSubstore: SubStore;
	let terminatedStateAccount: TerminatedStateAccount;

	beforeEach(async () => {
		interoperableCCAPIs = new Map();
		interoperableAPI = {
			moduleID: utils.intToBuffer(1, 4),
			recover: jest.fn(),
		};
		interoperableCCAPIs.set(1, interoperableAPI);
		ccCommands = new Map();
		stateRecoveryCommand = new StateRecoveryCommand(
			interoperableAPI['moduleID'],
			interoperableCCAPIs,
			ccCommands,
		);
		transactionParams = {
			chainID: utils.intToBuffer(3, 4),
			moduleID: utils.intToBuffer(1, 4),
			storeEntries: [
				{
					storePrefix: 1,
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
			module: MODULE_NAME_INTEROPERABILITY,
			command: COMMAND_NAME_STATE_RECOVERY,
			fee: BigInt(100000000),
			nonce: BigInt(0),
			params: encodedTransactionParams,
			senderPublicKey: utils.getRandomBytes(32),
			signatures: [],
		});
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		terminatedStateSubstore = stateStore.getStore(
			interoperableAPI['moduleID'],
			STORE_PREFIX_TERMINATED_STATE,
		);
		terminatedStateAccount = {
			initialized: true,
			stateRoot: Buffer.from(
				'3f91f1b7bc96933102dcce6a6c9200c68146a8327c16b91f8e4b37f40e2e2fb4',
				'hex',
			),
			mainchainStateRoot: utils.getRandomBytes(32),
		};
		await terminatedStateSubstore.setWithSchema(
			chainIDAsBuffer,
			terminatedStateAccount as any,
			terminatedStateSchema,
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

		it('should return error if terminated state account does not exist', async () => {
			await terminatedStateSubstore.del(chainIDAsBuffer);
			const result = await stateRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('The terminated account does not exist');
		});

		it('should return error if terminated state account is not initialized', async () => {
			await terminatedStateSubstore.setWithSchema(
				chainIDAsBuffer,
				{ ...terminatedStateAccount, initialized: false },
				terminatedStateSchema,
			);
			const result = await stateRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('The terminated account is not initialized');
		});

		it('should return error if proof of inclusion is not verified', async () => {
			jest.spyOn(sparseMerkleTree, 'verify').mockReturnValue(false);

			const result = await stateRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Failed to verify proof of inclusion');
		});
	});

	describe('execute', () => {
		it('should resolve if params are valid', async () => {
			await expect(stateRecoveryCommand.execute(commandExecuteContext)).resolves.toBeUndefined();
		});

		it('should throw error if recovery not available for module', async () => {
			interoperableCCAPIs.delete(1);

			await expect(stateRecoveryCommand.execute(commandExecuteContext)).rejects.toThrow(
				'Recovery not available for module',
			);
		});

		it('should throw error if recover api fails', async () => {
			interoperableAPI.recover = jest.fn().mockRejectedValue(new Error('error'));

			await expect(stateRecoveryCommand.execute(commandExecuteContext)).rejects.toThrow(
				'Recovery failed',
			);
		});

		it('should set root value for terminated state substore', async () => {
			const newStateRoot = utils.getRandomBytes(32);
			jest.spyOn(sparseMerkleTree, 'calculateRoot').mockReturnValue(newStateRoot);

			await stateRecoveryCommand.execute(commandExecuteContext);

			const newTerminatedStateAccount = await terminatedStateSubstore.getWithSchema<TerminatedStateAccount>(
				chainIDAsBuffer,
				terminatedStateSchema,
			);

			expect(newTerminatedStateAccount.stateRoot.toString('hex')).toBe(
				newStateRoot.toString('hex'),
			);
		});
	});
});
