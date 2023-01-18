import { when } from 'jest-when';
import { Transaction } from '@liskhq/lisk-chain';
import { utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { SparseMerkleTree } from '@liskhq/lisk-db';
import {
	COMMAND_NAME_STATE_RECOVERY_INIT,
	EMPTY_BYTES,
	LIVENESS_LIMIT,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../../src/modules/interoperability/constants';
import { SidechainInteroperabilityInternalMethod } from '../../../../../../src/modules/interoperability/sidechain/internal_method';
import { Mocked } from '../../../../../utils/types';
import { InitializeStateRecoveryCommand } from '../../../../../../src/modules/interoperability/sidechain/commands/initialize_state_recovery';
import {
	ChainAccount,
	OwnChainAccount,
	StateRecoveryInitParams,
} from '../../../../../../src/modules/interoperability/types';
import { CommandExecuteContext, SidechainInteroperabilityModule } from '../../../../../../src';
import { TransactionContext } from '../../../../../../src/state_machine';
import { stateRecoveryInitParamsSchema } from '../../../../../../src/modules/interoperability/schemas';
import { createTransactionContext } from '../../../../../../src/testing';
import { CommandVerifyContext, VerifyStatus } from '../../../../../../src/state_machine/types';
import { PrefixedStateReadWriter } from '../../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../../src/testing/in_memory_prefixed_state';
import {
	TerminatedStateAccount,
	TerminatedStateStore,
} from '../../../../../../src/modules/interoperability/stores/terminated_state';
import {
	chainAccountSchema,
	ChainAccountStore,
	ChainStatus,
} from '../../../../../../src/modules/interoperability/stores/chain_account';
import { createStoreGetter } from '../../../../../../src/testing/utils';
import { OwnChainAccountStore } from '../../../../../../src/modules/interoperability/stores/own_chain_account';
import { getMainchainID } from '../../../../../../src/modules/interoperability/utils';

describe('Sidechain InitializeStateRecoveryCommand', () => {
	const interopMod = new SidechainInteroperabilityModule();
	type StoreMock = Mocked<SidechainInteroperabilityInternalMethod, 'createTerminatedStateAccount'>;
	const chainAccountStoreMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
		key: Buffer.from('chainAccount', 'hex'),
	};
	const ownChainAccountStoreMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
	};
	const terminatedStateAccountMock = {
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
	};
	let stateRecoveryInitCommand: InitializeStateRecoveryCommand;
	let commandExecuteContext: CommandExecuteContext<StateRecoveryInitParams>;
	let transaction: Transaction;
	let transactionParams: StateRecoveryInitParams;
	let encodedTransactionParams: Buffer;
	let transactionContext: TransactionContext;
	let interopStoreMock: StoreMock;
	let sidechainChainAccount: ChainAccount;
	let sidechainChainAccountEncoded: Buffer;
	let terminatedStateSubstore: TerminatedStateStore;
	let terminatedStateAccount: TerminatedStateAccount;
	let commandVerifyContext: CommandVerifyContext<StateRecoveryInitParams>;
	let stateStore: PrefixedStateReadWriter;
	let mainchainAccount: ChainAccount;

	beforeEach(async () => {
		stateRecoveryInitCommand = new InitializeStateRecoveryCommand(
			interopMod.stores,
			interopMod.events,
			new Map(),
			new Map(),
			interopMod['internalMethod'],
		);

		sidechainChainAccount = {
			name: 'sidechain1',
			lastCertificate: {
				height: 10,
				stateRoot: utils.getRandomBytes(32),
				timestamp: 100,
				validatorsHash: utils.getRandomBytes(32),
			},
			status: ChainStatus.TERMINATED,
		};

		sidechainChainAccountEncoded = codec.encode(chainAccountSchema, sidechainChainAccount);

		transactionParams = {
			chainID: utils.intToBuffer(3, 4),
			bitmap: Buffer.alloc(0),
			siblingHashes: [],
			sidechainAccount: sidechainChainAccountEncoded,
		};

		encodedTransactionParams = codec.encode(stateRecoveryInitParamsSchema, transactionParams);

		transaction = new Transaction({
			module: MODULE_NAME_INTEROPERABILITY,
			command: COMMAND_NAME_STATE_RECOVERY_INIT,
			fee: BigInt(100000000),
			nonce: BigInt(0),
			params: encodedTransactionParams,
			senderPublicKey: utils.getRandomBytes(32),
			signatures: [],
		});

		terminatedStateAccount = {
			stateRoot: sidechainChainAccount.lastCertificate.stateRoot,
			mainchainStateRoot: EMPTY_BYTES,
			initialized: false,
		};

		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());

		terminatedStateSubstore = interopMod.stores.get(TerminatedStateStore);

		await terminatedStateSubstore.set(
			createStoreGetter(stateStore),
			transactionParams.chainID,
			terminatedStateAccount,
		);

		transactionContext = createTransactionContext({
			transaction,
			stateStore,
		});

		commandExecuteContext = transactionContext.createCommandExecuteContext<StateRecoveryInitParams>(
			stateRecoveryInitParamsSchema,
		);

		const chainAccountStore = new ChainAccountStore(interopMod.name);
		chainAccountStoreMock.key = chainAccountStore.key;

		interopMod.stores.register(ChainAccountStore, chainAccountStoreMock as never);
		interopMod.stores.register(OwnChainAccountStore, ownChainAccountStoreMock as never);

		interopStoreMock = {
			createTerminatedStateAccount: jest.fn(),
		};
		jest.spyOn(SparseMerkleTree.prototype, 'verify').mockResolvedValue(true);
	});

	describe('verify', () => {
		let ownChainAccount: OwnChainAccount;
		beforeEach(() => {
			mainchainAccount = {
				name: 'mainchain',
				lastCertificate: {
					height: 10,
					stateRoot: utils.getRandomBytes(32),
					timestamp: 100 + LIVENESS_LIMIT,
					validatorsHash: utils.getRandomBytes(32),
				},
				status: ChainStatus.ACTIVE,
			};
			ownChainAccount = {
				name: 'sidechain',
				chainID: utils.intToBuffer(2, 4),
				nonce: BigInt('0'),
			};
			terminatedStateAccountMock.has.mockResolvedValue(true);
			ownChainAccountStoreMock.get.mockResolvedValue(ownChainAccount);
			chainAccountStoreMock.get.mockResolvedValue(mainchainAccount);
			interopStoreMock = {
				createTerminatedStateAccount: jest.fn(),
			};
			commandVerifyContext = transactionContext.createCommandVerifyContext<StateRecoveryInitParams>(
				stateRecoveryInitParamsSchema,
			);
		});

		it('should reject when chain id has invalid length', async () => {
			await expect(
				stateRecoveryInitCommand.verify(
					createTransactionContext({
						transaction: new Transaction({
							module: MODULE_NAME_INTEROPERABILITY,
							command: COMMAND_NAME_STATE_RECOVERY_INIT,
							fee: BigInt(100000000),
							nonce: BigInt(0),
							params: codec.encode(stateRecoveryInitParamsSchema, {
								...transactionParams,
								chainID: Buffer.alloc(20, 255),
							}),
							senderPublicKey: utils.getRandomBytes(32),
							signatures: [],
						}),
						stateStore,
					}).createCommandVerifyContext(stateRecoveryInitParamsSchema),
				),
			).rejects.toThrow("Property '.chainID' maxLength exceeded");
		});

		it('should reject when sibglingHashes contains bytes with invalid length', async () => {
			await expect(
				stateRecoveryInitCommand.verify(
					createTransactionContext({
						transaction: new Transaction({
							module: MODULE_NAME_INTEROPERABILITY,
							command: COMMAND_NAME_STATE_RECOVERY_INIT,
							fee: BigInt(100000000),
							nonce: BigInt(0),
							params: codec.encode(stateRecoveryInitParamsSchema, {
								...transactionParams,
								siblingHashes: [Buffer.alloc(100, 255)],
							}),
							senderPublicKey: utils.getRandomBytes(32),
							signatures: [],
						}),
						stateStore,
					}).createCommandVerifyContext(stateRecoveryInitParamsSchema),
				),
			).rejects.toThrow("Property '.siblingHashes.0' maxLength exceeded");
		});

		it('should return status OK for valid params', async () => {
			const result = await stateRecoveryInitCommand.verify(commandVerifyContext);
			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return error if chain id is same as mainchain id or own chain account id', async () => {
			commandVerifyContext.params.chainID = ownChainAccount.chainID;

			await expect(stateRecoveryInitCommand.verify(commandVerifyContext)).rejects.toThrow(
				'Chain ID is not valid.',
			);
		});

		it('should return error if terminated state account exists and is initialized', async () => {
			await terminatedStateSubstore.set(createStoreGetter(stateStore), transactionParams.chainID, {
				...terminatedStateAccount,
				initialized: true,
			});

			await expect(stateRecoveryInitCommand.verify(commandVerifyContext)).rejects.toThrow(
				'Sidechain is already terminated',
			);
		});

		it('should return error if the sidechain is not terminated on the mainchain but the sidechain violates the liveness requirement', async () => {
			const mainchainID = getMainchainID(transactionParams.chainID);
			when(chainAccountStoreMock.get)
				.calledWith(expect.anything(), mainchainID)
				.mockResolvedValue(mainchainAccount);
			sidechainChainAccount = {
				name: 'sidechain1',
				lastCertificate: {
					height: 10,
					stateRoot: utils.getRandomBytes(32),
					timestamp: 100,
					validatorsHash: utils.getRandomBytes(32),
				},
				status: ChainStatus.ACTIVE,
			};
			sidechainChainAccountEncoded = codec.encode(chainAccountSchema, sidechainChainAccount);
			transactionParams = {
				chainID: utils.intToBuffer(3, 4),
				bitmap: Buffer.alloc(0),
				siblingHashes: [],
				sidechainAccount: sidechainChainAccountEncoded,
			};
			encodedTransactionParams = codec.encode(stateRecoveryInitParamsSchema, transactionParams);
			transaction = new Transaction({
				module: MODULE_NAME_INTEROPERABILITY,
				command: COMMAND_NAME_STATE_RECOVERY_INIT,
				fee: BigInt(100000000),
				nonce: BigInt(0),
				params: encodedTransactionParams,
				senderPublicKey: utils.getRandomBytes(32),
				signatures: [],
			});
			transactionContext = createTransactionContext({
				transaction,
				stateStore,
			});
			commandVerifyContext = transactionContext.createCommandVerifyContext<StateRecoveryInitParams>(
				stateRecoveryInitParamsSchema,
			);

			await expect(stateRecoveryInitCommand.verify(commandVerifyContext)).rejects.toThrow(
				'Sidechain is not terminated.',
			);
		});

		it('should return error if terminated state account exists and proof of inclusion is not verified', async () => {
			jest.spyOn(SparseMerkleTree.prototype, 'verify').mockResolvedValue(false);

			await expect(stateRecoveryInitCommand.verify(commandVerifyContext)).rejects.toThrow(
				'State recovery initialization proof of inclusion is not valid',
			);
		});

		it('should return error if terminated state account does not exist and proof of inclusion is not verified', async () => {
			jest.spyOn(SparseMerkleTree.prototype, 'verify').mockResolvedValue(false);
			const mainchainID = getMainchainID(transactionParams.chainID);

			when(chainAccountStoreMock.get)
				.calledWith(expect.anything(), mainchainID)
				.mockResolvedValue(mainchainAccount);

			await terminatedStateSubstore.del(createStoreGetter(stateStore), transactionParams.chainID);

			await expect(stateRecoveryInitCommand.verify(commandVerifyContext)).rejects.toThrow(
				'State recovery initialization proof of inclusion is not valid',
			);
		});
	});

	describe('execute', () => {
		it('should create a terminated state account when there is none', async () => {
			// Arrange & Assign & Act
			await stateRecoveryInitCommand.execute(commandExecuteContext);

			const accountFromStore = await terminatedStateSubstore.get(
				commandExecuteContext,
				transactionParams.chainID,
			);

			// Assert
			expect(accountFromStore).toEqual({ ...terminatedStateAccount, initialized: true });
			expect(interopStoreMock.createTerminatedStateAccount).not.toHaveBeenCalled();
		});

		it('should update the terminated state account when there is one', async () => {
			// Arrange & Assign & Act
			when(terminatedStateAccountMock.has)
				.calledWith(expect.anything(), transactionParams.chainID)
				.mockResolvedValue(false);

			const terminatedStateStore = interopMod.stores.get(TerminatedStateStore);
			terminatedStateStore.get = terminatedStateAccountMock.get;
			terminatedStateAccountMock.get.mockResolvedValue(terminatedStateAccount);
			await stateRecoveryInitCommand.execute(commandExecuteContext);

			const accountFromStore = await terminatedStateSubstore.get(
				commandExecuteContext,
				transactionParams.chainID,
			);

			// Assert
			expect(accountFromStore).toEqual(terminatedStateAccount);
		});
	});
});
