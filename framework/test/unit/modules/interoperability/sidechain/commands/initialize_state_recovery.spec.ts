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
import { when } from 'jest-when';
import { Transaction } from '@liskhq/lisk-chain';
import { utils } from '@liskhq/lisk-cryptography';
import { validator } from '@liskhq/lisk-validator';
import { codec } from '@liskhq/lisk-codec';
import { SparseMerkleTree } from '@liskhq/lisk-db';
import {
	COMMAND_NAME_STATE_RECOVERY_INIT,
	EMPTY_HASH,
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
import { StateMachine, Modules } from '../../../../../../src';
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
	chainDataSchema,
	ChainAccountStore,
	ChainStatus,
} from '../../../../../../src/modules/interoperability/stores/chain_account';
import { createStoreGetter } from '../../../../../../src/testing/utils';
import { OwnChainAccountStore } from '../../../../../../src/modules/interoperability/stores/own_chain_account';
import { getMainchainID } from '../../../../../../src/modules/interoperability/utils';
import { InvalidSMTVerificationEvent } from '../../../../../../src/modules/interoperability/events/invalid_smt_verification';

describe('Sidechain InitializeStateRecoveryCommand', () => {
	const interopMod = new Modules.Interoperability.SidechainInteroperabilityModule();
	type StoreMock = Mocked<SidechainInteroperabilityInternalMethod, 'createTerminatedStateAccount'>;
	const getSetHas = () => ({
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
	});
	const chainAccountStoreMock = {
		...getSetHas(),
		key: Buffer.from('chainAccount', 'hex'),
	};
	const ownChainAccountStoreMock = getSetHas();
	const terminatedStateAccountMock = getSetHas();
	let stateRecoveryInitCommand: InitializeStateRecoveryCommand;
	let commandExecuteContext: StateMachine.CommandExecuteContext<StateRecoveryInitParams>;
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
	let ownChainAccount: OwnChainAccount;

	beforeEach(async () => {
		stateRecoveryInitCommand = interopMod['_stateRecoveryInitCommand'];

		ownChainAccount = {
			name: 'sidechain',
			chainID: utils.intToBuffer(2, 4),
			nonce: BigInt('0'),
		};

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

		sidechainChainAccountEncoded = codec.encode(chainDataSchema, sidechainChainAccount);

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
			mainchainStateRoot: EMPTY_HASH,
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

		const chainAccountStore = new ChainAccountStore(interopMod.name, 1);
		chainAccountStoreMock.key = chainAccountStore.key;

		interopMod.stores.register(ChainAccountStore, chainAccountStoreMock as never);
		interopMod.stores.register(OwnChainAccountStore, ownChainAccountStoreMock as never);

		interopStoreMock = {
			createTerminatedStateAccount: jest.fn(),
		};
		jest.spyOn(SparseMerkleTree.prototype, 'verify').mockResolvedValue(true);
	});

	describe('verify schema', () => {
		it('should reject when chain id has invalid length', () => {
			expect(() =>
				validator.validate(stateRecoveryInitCommand.schema, {
					...transactionParams,
					chainID: Buffer.alloc(20, 255),
				}),
			).toThrow("Property '.chainID' maxLength exceeded");
		});

		it('should reject when siblingHashes contains bytes with invalid length', () => {
			expect(() =>
				validator.validate(stateRecoveryInitCommand.schema, {
					...transactionParams,
					siblingHashes: [Buffer.alloc(100, 255)],
				}),
			).toThrow("Property '.siblingHashes.0' maxLength exceeded");
		});
	});

	describe('verify', () => {
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
			terminatedStateAccountMock.has.mockResolvedValue(true);
			ownChainAccountStoreMock.get.mockResolvedValue(ownChainAccount);
			chainAccountStoreMock.get.mockResolvedValue(mainchainAccount);
			commandVerifyContext = transactionContext.createCommandVerifyContext<StateRecoveryInitParams>(
				stateRecoveryInitParamsSchema,
			);
		});

		it('should return status OK for valid params', async () => {
			const result = await stateRecoveryInitCommand.verify(commandVerifyContext);
			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return error if chain id is same as mainchain id', async () => {
			commandVerifyContext.params.chainID = getMainchainID(ownChainAccount.chainID);

			await expect(stateRecoveryInitCommand.verify(commandVerifyContext)).rejects.toThrow(
				'Chain ID is not valid.',
			);
		});

		it('should return error if chain id is same as own chain account id', async () => {
			commandVerifyContext.params.chainID = ownChainAccount.chainID;

			await expect(stateRecoveryInitCommand.verify(commandVerifyContext)).rejects.toThrow(
				'Chain ID is not valid.',
			);
		});

		it("should not return error if terminated state account doesn't exist", async () => {
			await terminatedStateSubstore.del(createStoreGetter(stateStore), transactionParams.chainID);

			await expect(stateRecoveryInitCommand.verify(commandVerifyContext)).resolves.not.toThrow(
				'Sidechain is already terminated.',
			);
		});

		it('should not return error if terminated state account exists but not initialized', async () => {
			await terminatedStateSubstore.set(createStoreGetter(stateStore), transactionParams.chainID, {
				...terminatedStateAccount,
				initialized: false,
			});

			await expect(stateRecoveryInitCommand.verify(commandVerifyContext)).resolves.not.toThrow(
				'Sidechain is already terminated.',
			);
		});

		it('should return error if terminated state account exists and is initialized', async () => {
			await terminatedStateSubstore.set(createStoreGetter(stateStore), transactionParams.chainID, {
				...terminatedStateAccount,
				initialized: true,
			});

			await expect(stateRecoveryInitCommand.verify(commandVerifyContext)).rejects.toThrow(
				'Sidechain is already terminated.',
			);
		});

		it('should return error if sidechain data does not match schema', async () => {
			const invalidSidechainChainAccountEncoded = codec.encode(chainDataSchema, {
				...sidechainChainAccount,
				lastCertificate: {
					...sidechainChainAccount.lastCertificate,
					stateRoot: Buffer.alloc(0),
				},
			});
			transactionParams = {
				chainID: utils.intToBuffer(3, 4),
				bitmap: Buffer.alloc(0),
				siblingHashes: [],
				sidechainAccount: invalidSidechainChainAccountEncoded,
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
				"Lisk validator found 1 error[s]:\nProperty '.lastCertificate.stateRoot' minLength not satisfied",
			);
		});

		it('should return error if the sidechain has ChainStatus.REGISTERED status', async () => {
			await terminatedStateSubstore.set(createStoreGetter(stateStore), transactionParams.chainID, {
				...terminatedStateAccount,
				initialized: false,
			});
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
				status: ChainStatus.REGISTERED,
			};
			sidechainChainAccountEncoded = codec.encode(chainDataSchema, sidechainChainAccount);
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
				'Sidechain has status registered.',
			);
		});

		it('should return error if the sidechain is active on the mainchain and does not violate the liveness requirement', async () => {
			await terminatedStateSubstore.set(createStoreGetter(stateStore), transactionParams.chainID, {
				...terminatedStateAccount,
				initialized: false,
			});
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
			sidechainChainAccountEncoded = codec.encode(chainDataSchema, sidechainChainAccount);
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
				'Sidechain is still active and obeys the liveness requirement.',
			);
		});

		it('should not return error if the sidechain is active on the mainchain and does violate the liveness requirement', async () => {
			await terminatedStateSubstore.set(createStoreGetter(stateStore), transactionParams.chainID, {
				...terminatedStateAccount,
				initialized: false,
			});
			const mainchainID = getMainchainID(transactionParams.chainID);
			when(chainAccountStoreMock.get)
				.calledWith(expect.anything(), mainchainID)
				.mockResolvedValue({
					...mainchainAccount,
					lastCertificate: {
						...mainchainAccount.lastCertificate,
						timestamp: LIVENESS_LIMIT + 50,
					},
				} as ChainAccount);
			sidechainChainAccount = {
				name: 'sidechain1',
				lastCertificate: {
					height: 10,
					stateRoot: utils.getRandomBytes(32),
					timestamp: 10,
					validatorsHash: utils.getRandomBytes(32),
				},
				status: ChainStatus.ACTIVE,
			};
			sidechainChainAccountEncoded = codec.encode(chainDataSchema, sidechainChainAccount);
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

			await expect(stateRecoveryInitCommand.verify(commandVerifyContext)).resolves.not.toThrow(
				'Sidechain is still active and obeys the liveness requirement.',
			);
		});
	});

	describe('execute', () => {
		let invalidSMTVerificationEvent: InvalidSMTVerificationEvent;
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
			invalidSMTVerificationEvent = new InvalidSMTVerificationEvent(interopMod.name);
			stateRecoveryInitCommand['events'].register(
				InvalidSMTVerificationEvent,
				invalidSMTVerificationEvent,
			);
		});

		it('should return error if terminated state account exists and proof of inclusion is not verified', async () => {
			jest.spyOn(SparseMerkleTree.prototype, 'verify').mockResolvedValue(false);
			jest.spyOn(invalidSMTVerificationEvent, 'error');

			const msg = `given chainID: ${commandExecuteContext.params.chainID.toString('hex')}.`;
			await expect(stateRecoveryInitCommand.execute(commandExecuteContext)).rejects.toThrow(
				`State recovery initialization proof of inclusion is not valid for ${msg}.`,
			);
			expect(interopStoreMock.createTerminatedStateAccount).not.toHaveBeenCalled();
			expect(invalidSMTVerificationEvent.error).toHaveBeenCalled();
		});

		it('should return error if terminated state account does not exist and proof of inclusion is not verified', async () => {
			jest.spyOn(SparseMerkleTree.prototype, 'verify').mockResolvedValue(false);
			jest.spyOn(invalidSMTVerificationEvent, 'error');

			const mainchainID = getMainchainID(commandExecuteContext.chainID);

			when(chainAccountStoreMock.get)
				.calledWith(expect.anything(), mainchainID)
				.mockResolvedValue(mainchainAccount);

			await terminatedStateSubstore.del(
				createStoreGetter(commandExecuteContext.stateStore as any),
				transactionParams.chainID,
			);

			const msg = `mainchainID: ${mainchainID.toString('hex')}`;
			await expect(stateRecoveryInitCommand.execute(commandExecuteContext)).rejects.toThrow(
				`State recovery initialization proof of inclusion is not valid for ${msg}.`,
			);
			expect(interopStoreMock.createTerminatedStateAccount).not.toHaveBeenCalled();
			expect(invalidSMTVerificationEvent.error).toHaveBeenCalled();
		});

		it('should create a terminated state account when there is none', async () => {
			const mainchainID = getMainchainID(commandExecuteContext.chainID);

			when(chainAccountStoreMock.get)
				.calledWith(expect.anything(), mainchainID)
				.mockResolvedValue(mainchainAccount);

			jest.spyOn(terminatedStateSubstore, 'has').mockResolvedValue(false);
			jest.spyOn(stateRecoveryInitCommand['internalMethod'], 'createTerminatedStateAccount');

			await stateRecoveryInitCommand.execute(commandExecuteContext);

			const accountFromStore = await terminatedStateSubstore.get(
				commandExecuteContext,
				transactionParams.chainID,
			);

			expect(accountFromStore).toEqual({ ...terminatedStateAccount, initialized: true });
			expect(
				stateRecoveryInitCommand['internalMethod'].createTerminatedStateAccount,
			).toHaveBeenCalledTimes(1);
		});

		it('should update the terminated state account when there is one', async () => {
			const terminatedStateStore = interopMod.stores.get(TerminatedStateStore);

			jest.spyOn(stateRecoveryInitCommand['internalMethod'], 'createTerminatedStateAccount');
			jest.spyOn(terminatedStateStore, 'get').mockResolvedValue(terminatedStateAccount);
			jest.spyOn(terminatedStateStore, 'set');

			await stateRecoveryInitCommand.execute(commandExecuteContext);

			const deserializedSidechainAccount = codec.decode<ChainAccount>(
				chainDataSchema,
				commandExecuteContext.params.sidechainAccount,
			);
			expect(terminatedStateStore.set).toHaveBeenCalledWith(
				commandExecuteContext,
				commandExecuteContext.params.chainID,
				{
					stateRoot: deserializedSidechainAccount.lastCertificate.stateRoot,
					mainchainStateRoot: EMPTY_HASH,
					initialized: true,
				},
			);

			const accountFromStore = await terminatedStateSubstore.get(
				commandExecuteContext,
				transactionParams.chainID,
			);
			expect(accountFromStore).toEqual(terminatedStateAccount);

			expect(
				stateRecoveryInitCommand['internalMethod'].createTerminatedStateAccount,
			).not.toHaveBeenCalled();
		});
	});
});
