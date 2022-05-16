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

import { StateStore, Transaction } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { sparseMerkleTree } from '@liskhq/lisk-tree';
import { CommandExecuteContext, CommandVerifyContext } from '../../../../../../src';
import { BaseCCCommand } from '../../../../../../src/modules/interoperability/base_cc_command';
import { BaseInteroperableAPI } from '../../../../../../src/modules/interoperability/base_interoperable_api';
import {
	COMMAND_ID_STATE_RECOVERY,
	MODULE_ID_INTEROPERABILITY,
	STORE_PREFIX_TERMINATED_STATE,
} from '../../../../../../src/modules/interoperability/constants';
import { StateRecoveryCommand } from '../../../../../../src/modules/interoperability/mainchain/commands/state_recovery';
import {
	stateRecoveryParams,
	terminatedStateSchema,
} from '../../../../../../src/modules/interoperability/schema';
import {
	StateRecoveryParams,
	TerminatedStateAccount,
} from '../../../../../../src/modules/interoperability/types';
import { getIDAsKeyForStore } from '../../../../../../src/modules/interoperability/utils';
import { TransactionContext, VerifyStatus } from '../../../../../../src/node/state_machine';
import { createTransactionContext } from '../../../../../../src/testing';

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
	let stateStore: StateStore;
	let terminatedStateSubstore: StateStore;
	let terminatedStateAccount: TerminatedStateAccount;

	beforeEach(async () => {
		interoperableCCAPIs = new Map();
		interoperableAPI = {
			recover: jest.fn(),
		};
		interoperableCCAPIs.set(1, interoperableAPI);
		ccCommands = new Map();
		stateRecoveryCommand = new StateRecoveryCommand(
			MODULE_ID_INTEROPERABILITY,
			interoperableCCAPIs,
			ccCommands,
		);
		transactionParams = {
			chainID: 3,
			moduleID: 2,
			storeEntries: [
				{
					storePrefix: 1,
					storeKey: getRandomBytes(32),
					storeValue: getRandomBytes(32),
					bitmap: getRandomBytes(32),
				},
			],
			siblingHashes: [getRandomBytes(32)],
		};
		chainIDAsBuffer = getIDAsKeyForStore(transactionParams.chainID);
		encodedTransactionParams = codec.encode(stateRecoveryParams, transactionParams);
		transaction = new Transaction({
			moduleID: MODULE_ID_INTEROPERABILITY,
			commandID: COMMAND_ID_STATE_RECOVERY,
			fee: BigInt(100000000),
			nonce: BigInt(0),
			params: encodedTransactionParams,
			senderPublicKey: getRandomBytes(32),
			signatures: [],
		});
		stateStore = new StateStore(new InMemoryKVStore());
		terminatedStateSubstore = stateStore.getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_TERMINATED_STATE,
		);
		terminatedStateAccount = {
			initialized: true,
			stateRoot: Buffer.from(
				'3f91f1b7bc96933102dcce6a6c9200c68146a8327c16b91f8e4b37f40e2e2fb4',
				'hex',
			),
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
			stateRecoveryParams,
		);
		commandExecuteContext = transactionContext.createCommandExecuteContext<StateRecoveryParams>(
			stateRecoveryParams,
		);
		jest.spyOn(sparseMerkleTree, 'verify').mockReturnValue(true);
		jest.spyOn(sparseMerkleTree, 'calculateRoot').mockReturnValue(getRandomBytes(32));
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

		it('should throw error if recover api fails', async () => {
			interoperableAPI.recover = jest.fn().mockRejectedValue(new Error('error'));

			await expect(stateRecoveryCommand.execute(commandExecuteContext)).rejects.toThrow(
				'Recovery failed',
			);
		});

		it('should set root value for terminated state substore', async () => {
			const newStateRoot = getRandomBytes(32);
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
