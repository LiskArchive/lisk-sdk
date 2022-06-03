import { when } from 'jest-when';
import { Transaction } from '@liskhq/lisk-chain';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { sparseMerkleTree } from '@liskhq/lisk-tree';
import {
	CHAIN_ACTIVE,
	CHAIN_TERMINATED,
	COMMAND_ID_STATE_RECOVERY_INIT,
	EMPTY_BYTES,
	LIVENESS_LIMIT,
	MAINCHAIN_ID,
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
import { TransactionContext } from '../../../../../../src/state_machine';
import {
	chainAccountSchema,
	stateRecoveryInitParams,
	terminatedStateSchema,
} from '../../../../../../src/modules/interoperability/schema';
import { createTransactionContext } from '../../../../../../src/testing';
import { getIDAsKeyForStore } from '../../../../../../src/modules/interoperability/utils';
import {
	CommandVerifyContext,
	SubStore,
	VerifyStatus,
} from '../../../../../../src/state_machine/types';
import { PrefixedStateReadWriter } from '../../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../../src/testing/in_memory_prefixed_state';

describe('Mainchain StateRecoveryInitCommand', () => {
	type StoreMock = Mocked<
		MainchainInteroperabilityStore,
		| 'hasTerminatedStateAccount'
		| 'createTerminatedStateAccount'
		| 'getOwnChainAccount'
		| 'getChainAccount'
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
	let commandVerifyContext: CommandVerifyContext<StateRecoveryInitParams>;
	let stateStore: PrefixedStateReadWriter;
	let mainchainAccount: ChainAccount;

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
			initialized: false,
		};

		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());

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
			getOwnChainAccount: jest.fn(),
			getChainAccount: jest.fn(),
		};

		jest
			.spyOn(stateRecoveryInitCommand, 'getInteroperabilityStore' as any)
			.mockImplementation(() => interopStoreMock);
	});

	describe('verify', () => {
		beforeEach(() => {
			mainchainAccount = {
				name: 'mainchain',
				networkID,
				lastCertificate: {
					height: 10,
					stateRoot: getRandomBytes(32),
					timestamp: 100 + LIVENESS_LIMIT,
					validatorsHash: getRandomBytes(32),
				},
				status: CHAIN_ACTIVE,
			};
			const ownChainAccount = {
				name: 'mainchain',
				id: MAINCHAIN_ID,
				nonce: BigInt('0'),
			};
			interopStoreMock = {
				createTerminatedStateAccount: jest.fn(),
				hasTerminatedStateAccount: jest.fn().mockResolvedValue(true),
				getOwnChainAccount: jest.fn().mockResolvedValue(ownChainAccount),
				getChainAccount: jest.fn(),
			};
			commandVerifyContext = transactionContext.createCommandVerifyContext<StateRecoveryInitParams>(
				stateRecoveryInitParams,
			);
			jest.spyOn(sparseMerkleTree, 'verify').mockReturnValue(true);
		});

		it('should return status OK for valid params', async () => {
			const result = await stateRecoveryInitCommand.verify(commandVerifyContext);
			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return error if chain id is same as mainchain id or own chain account id', async () => {
			commandVerifyContext.params.chainID = MAINCHAIN_ID;

			const result = await stateRecoveryInitCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Sidechain id is not valid');
		});

		it('should return error if terminated state account exists and is initialized', async () => {
			await terminatedStateSubstore.setWithSchema(
				getIDAsKeyForStore(transactionParams.chainID),
				{ ...terminatedStateAccount, initialized: true },
				terminatedStateSchema,
			);
			const result = await stateRecoveryInitCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('The sidechain is already terminated on this chain');
		});

		it('should return error if the sidechain is not terminated on the mainchain but the sidechain violates the liveness requirement', async () => {
			when(interopStoreMock.getChainAccount)
				.calledWith(getIDAsKeyForStore(MAINCHAIN_ID))
				.mockResolvedValue(mainchainAccount);
			sidechainChainAccount = {
				name: 'sidechain1',
				networkID,
				lastCertificate: {
					height: 10,
					stateRoot: getRandomBytes(32),
					timestamp: 100,
					validatorsHash: getRandomBytes(32),
				},
				status: CHAIN_ACTIVE,
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
			transactionContext = createTransactionContext({
				transaction,
				stateStore,
			});
			commandVerifyContext = transactionContext.createCommandVerifyContext<StateRecoveryInitParams>(
				stateRecoveryInitParams,
			);

			const result = await stateRecoveryInitCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'The sidechain is not terminated on the mainchain but the sidechain already violated the liveness requirement',
			);
		});

		it('should return error if terminated state account exists and proof of inclusion is not verified', async () => {
			jest.spyOn(sparseMerkleTree, 'verify').mockReturnValue(false);

			const result = await stateRecoveryInitCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Failed to verify proof of inclusion');
		});

		it('should return error if terminated state account does not exist and proof of inclusion is not verified', async () => {
			when(interopStoreMock.getChainAccount)
				.calledWith(getIDAsKeyForStore(MAINCHAIN_ID))
				.mockResolvedValue(mainchainAccount);
			jest.spyOn(sparseMerkleTree, 'verify').mockReturnValue(false);
			await terminatedStateSubstore.del(getIDAsKeyForStore(transactionParams.chainID));

			const result = await stateRecoveryInitCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('Failed to verify proof of inclusion');
		});
	});

	describe('execute', () => {
		it('should create a terminated state account when there is none', async () => {
			// Arrange & Assign & Act
			await stateRecoveryInitCommand.execute(commandExecuteContext);

			const accountFromStore = await terminatedStateSubstore.getWithSchema(
				getIDAsKeyForStore(transactionParams.chainID),
				terminatedStateSchema,
			);

			// Assert
			expect(accountFromStore).toEqual({ ...terminatedStateAccount, initialized: true });
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
});
