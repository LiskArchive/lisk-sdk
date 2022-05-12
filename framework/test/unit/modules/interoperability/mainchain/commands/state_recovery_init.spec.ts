import { when } from 'jest-when';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { StateStore, Transaction } from '@liskhq/lisk-chain';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import {
	CHAIN_TERMINATED,
	COMMAND_ID_STATE_RECOVERY_INIT,
	EMPTY_BYTES,
	MODULE_ID_INTEROPERABILITY,
	STORE_PREFIX_TERMINATED_STATE,
} from '../../../../../../src/modules/interoperability/constants';
import { MainchainInteroperabilityStore } from '../../../../../../src/modules/interoperability/mainchain/store';
import { Mocked } from '../../../../../utils/types';
import { StateRecoveryInitCommand } from '../../../../../../src/modules/interoperability/mainchain/commands/state_recovery_init';
import {
	ChainAccount,
	StateRecoveryInitParams,
	TerminatedStateAccount,
} from '../../../../../../src/modules/interoperability/types';
import { CommandExecuteContext } from '../../../../../../src';
import { TransactionContext } from '../../../../../../src/node/state_machine';
import {
	chainAccountSchema,
	stateRecoveryInitParams,
	terminatedStateSchema,
} from '../../../../../../src/modules/interoperability/schema';
import { createTransactionContext } from '../../../../../../src/testing';
import { getIDAsKeyForStore } from '../../../../../../src/modules/interoperability/utils';
import { SubStore } from '../../../../../../src/node/state_machine/types';

describe('Mainchain StateRecoveryInitCommand', () => {
	type StoreMock = Mocked<
		MainchainInteroperabilityStore,
		'hasTerminatedStateAccount' | 'createTerminatedStateAccount'
	>;

	const networkID = getRandomBytes(32);

	let stateRecoveryInitCommand: StateRecoveryInitCommand;
	let commandExecuteContext: CommandExecuteContext<StateRecoveryInitParams>;
	let transaction: Transaction;
	let transactionParams: StateRecoveryInitParams;
	let encodedTransactionParams: Buffer;
	let transactionContext: TransactionContext;
	let interopStoreMock: StoreMock;
	let sidechainChainAccount: ChainAccount;
	let sidechainChainAccountEncoded: Buffer;
	let terminatedStateSubstore: SubStore;
	let terminatedStateAccount: TerminatedStateAccount;

	beforeEach(async () => {
		stateRecoveryInitCommand = new StateRecoveryInitCommand(
			MODULE_ID_INTEROPERABILITY,
			new Map(),
			new Map(),
		);

		sidechainChainAccount = {
			name: 'sidechain1',
			networkID,
			lastCertificate: {
				height: 10,
				stateRoot: getRandomBytes(32),
				timestamp: 100,
				validatorsHash: getRandomBytes(32),
			},
			status: CHAIN_TERMINATED,
		};

		sidechainChainAccountEncoded = codec.encode(chainAccountSchema, sidechainChainAccount);

		transactionParams = {
			chainID: 3,
			bitmap: Buffer.alloc(0),
			siblingHashes: [],
			sidechainChainAccount: sidechainChainAccountEncoded,
		};

		encodedTransactionParams = codec.encode(stateRecoveryInitParams, transactionParams);

		transaction = new Transaction({
			moduleID: MODULE_ID_INTEROPERABILITY,
			commandID: COMMAND_ID_STATE_RECOVERY_INIT,
			fee: BigInt(100000000),
			nonce: BigInt(0),
			params: encodedTransactionParams,
			senderPublicKey: getRandomBytes(32),
			signatures: [],
		});

		terminatedStateAccount = {
			stateRoot: sidechainChainAccount.lastCertificate.stateRoot,
			mainchainStateRoot: EMPTY_BYTES,
			initialized: true,
		};

		const stateStore = new StateStore(new InMemoryKVStore());

		terminatedStateSubstore = stateStore.getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_TERMINATED_STATE,
		);

		await terminatedStateSubstore.setWithSchema(
			getIDAsKeyForStore(transactionParams.chainID),
			terminatedStateAccount,
			terminatedStateSchema,
		);

		transactionContext = createTransactionContext({
			transaction,
			stateStore,
		});

		commandExecuteContext = transactionContext.createCommandExecuteContext<StateRecoveryInitParams>(
			stateRecoveryInitParams,
		);

		interopStoreMock = {
			createTerminatedStateAccount: jest.fn(),
			hasTerminatedStateAccount: jest.fn().mockResolvedValue(true),
		};

		jest
			.spyOn(stateRecoveryInitCommand, 'getInteroperabilityStore' as any)
			.mockImplementation(() => interopStoreMock);
	});

	it('should create a terminated state account when there is none', async () => {
		// Arrange & Assign & Act
		await stateRecoveryInitCommand.execute(commandExecuteContext);

		const accountFromStore = await terminatedStateSubstore.getWithSchema(
			getIDAsKeyForStore(transactionParams.chainID),
			terminatedStateSchema,
		);

		// Assert
		expect(accountFromStore).toEqual(terminatedStateAccount);
		expect(interopStoreMock.createTerminatedStateAccount).not.toHaveBeenCalled();
	});

	it('should update the terminated state account when there is one', async () => {
		// Arrange & Assign & Act
		when(interopStoreMock.hasTerminatedStateAccount)
			.calledWith(getIDAsKeyForStore(transactionParams.chainID))
			.mockResolvedValue(false);

		await stateRecoveryInitCommand.execute(commandExecuteContext);

		const accountFromStore = await terminatedStateSubstore.getWithSchema(
			getIDAsKeyForStore(transactionParams.chainID),
			terminatedStateSchema,
		);

		// Assert
		expect(accountFromStore).toEqual(terminatedStateAccount);
		expect(interopStoreMock.createTerminatedStateAccount).toHaveBeenCalledWith(
			transactionParams.chainID,
			terminatedStateAccount.stateRoot,
		);
	});
});
