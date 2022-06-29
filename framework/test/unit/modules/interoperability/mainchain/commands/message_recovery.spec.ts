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

import { when } from 'jest-when';
import { codec } from '@liskhq/lisk-codec';
import { Transaction } from '@liskhq/lisk-chain';
import { getRandomBytes, hash, intToBuffer } from '@liskhq/lisk-cryptography';
import { MerkleTree, regularMerkleTree } from '@liskhq/lisk-tree';
import { CommandExecuteContext } from '../../../../../../src';
import { BaseCCCommand } from '../../../../../../src/modules/interoperability/base_cc_command';
import { BaseInteroperableAPI } from '../../../../../../src/modules/interoperability/base_interoperable_api';
import {
	CHAIN_ACTIVE,
	COMMAND_ID_MESSAGE_RECOVERY_BUFFER,
	MODULE_ID_INTEROPERABILITY_BUFFER,
	STORE_PREFIX_TERMINATED_OUTBOX,
} from '../../../../../../src/modules/interoperability/constants';
import { MessageRecoveryCommand } from '../../../../../../src/modules/interoperability/mainchain/commands/message_recovery';
import { MainchainInteroperabilityStore } from '../../../../../../src/modules/interoperability/mainchain/store';
import {
	ccmSchema,
	messageRecoveryParamsSchema,
	terminatedOutboxSchema,
} from '../../../../../../src/modules/interoperability/schema';
import { CCMsg, MessageRecoveryParams } from '../../../../../../src/modules/interoperability/types';
import { CommandVerifyContext, VerifyStatus } from '../../../../../../src/state_machine/types';
import { createTransactionContext } from '../../../../../../src/testing';
import { swapReceivingAndSendingChainIDs } from '../../../../../../src/modules/interoperability/utils';
import { TransactionContext } from '../../../../../../src/state_machine';
import { Mocked } from '../../../../../utils/types';
import { PrefixedStateReadWriter } from '../../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../../src/testing/in_memory_prefixed_state';

describe('Mainchain MessageRecoveryCommand', () => {
	describe('verify', () => {
		const LEAF_PREFIX = Buffer.from('00', 'hex');
		let stateStore: PrefixedStateReadWriter;
		let mainchainInteroperabilityStore: MainchainInteroperabilityStore;
		let terminatedOutboxSubstore: any;
		let mockGetStore: any;
		let messageRecoveryCommand: MessageRecoveryCommand;
		let commandVerifyContext: CommandVerifyContext<MessageRecoveryParams>;
		let interoperableCCAPIs: Map<number, BaseInteroperableAPI>;
		let ccCommands: Map<number, BaseCCCommand[]>;
		let transaction: Transaction;
		let transactionParams: MessageRecoveryParams;
		let encodedTransactionParams: Buffer;
		let ccms: CCMsg[];
		let chainID: Buffer;
		let terminatedChainOutboxSize: number;
		let proof: any;
		let hashedCCMs: Buffer[];
		let ccmsEncoded: Buffer[];
		let outboxRoot: Buffer;
		let queryHashes: Buffer[];
		let merkleTree: MerkleTree;
		let generatedProof: any;

		beforeEach(async () => {
			interoperableCCAPIs = new Map();
			ccCommands = new Map();
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());

			terminatedOutboxSubstore = stateStore.getStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				STORE_PREFIX_TERMINATED_OUTBOX,
			);
			mockGetStore = jest.fn();
			when(mockGetStore)
				.calledWith(MODULE_ID_INTEROPERABILITY_BUFFER, STORE_PREFIX_TERMINATED_OUTBOX)
				.mockReturnValue(terminatedOutboxSubstore);
			mainchainInteroperabilityStore = new MainchainInteroperabilityStore(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				mockGetStore,
				new Map(),
			);
			messageRecoveryCommand = new MessageRecoveryCommand(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				interoperableCCAPIs,
				ccCommands,
			);

			ccms = [
				{
					nonce: BigInt(0),
					moduleID: intToBuffer(1, 4),
					crossChainCommandID: intToBuffer(1, 4),
					sendingChainID: intToBuffer(2, 4),
					receivingChainID: intToBuffer(3, 4),
					fee: BigInt(1),
					status: 0,
					params: Buffer.alloc(0),
				},
				{
					nonce: BigInt(1),
					moduleID: intToBuffer(1, 4),
					crossChainCommandID: intToBuffer(1, 4),
					sendingChainID: intToBuffer(4, 4),
					receivingChainID: intToBuffer(5, 4),
					fee: BigInt(2),
					status: 0,
					params: Buffer.alloc(0),
				},
			];
			ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));
			merkleTree = new MerkleTree();
			await merkleTree.init(ccmsEncoded);
			queryHashes = [];
			for (const data of ccmsEncoded) {
				const leafValueWithoutNodeIndex = Buffer.concat(
					[LEAF_PREFIX, data],
					LEAF_PREFIX.length + data.length,
				);
				const leafHash = hash(leafValueWithoutNodeIndex);
				queryHashes.push(leafHash);
			}
			generatedProof = await merkleTree.generateProof(queryHashes);
			terminatedChainOutboxSize = generatedProof.size;
			proof = {
				size: terminatedChainOutboxSize,
				indexes: generatedProof.idxs as number[],
				siblingHashes: generatedProof.siblingHashes as Buffer[],
			};
			hashedCCMs = ccmsEncoded.map(ccm => hash(ccm));
			outboxRoot = regularMerkleTree.calculateRootFromUpdateData(hashedCCMs, proof);
			transactionParams = {
				chainID: intToBuffer(3, 4),
				crossChainMessages: [...ccmsEncoded],
				idxs: proof.indexes,
				siblingHashes: proof.siblingHashes,
			};
			chainID = transactionParams.chainID;
			encodedTransactionParams = codec.encode(messageRecoveryParamsSchema, transactionParams);

			transaction = new Transaction({
				moduleID: MODULE_ID_INTEROPERABILITY_BUFFER,
				commandID: COMMAND_ID_MESSAGE_RECOVERY_BUFFER,
				fee: BigInt(100000000),
				nonce: BigInt(0),
				params: encodedTransactionParams,
				senderPublicKey: getRandomBytes(32),
				signatures: [],
			});
			commandVerifyContext = createTransactionContext({
				transaction,
			}).createCommandVerifyContext<MessageRecoveryParams>(messageRecoveryParamsSchema);

			jest
				.spyOn(messageRecoveryCommand, 'getInteroperabilityStore' as any)
				.mockImplementation(() => mainchainInteroperabilityStore);

			await terminatedOutboxSubstore.setWithSchema(
				chainID,
				{
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 1,
				},
				terminatedOutboxSchema,
			);
		});

		it('should return error if the sidechain outbox root is not valid', async () => {
			await terminatedOutboxSubstore.setWithSchema(
				chainID,
				{
					outboxRoot: getRandomBytes(32),
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 1,
				},
				terminatedOutboxSchema,
			);
			const result = await messageRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`The sidechain outbox root is not valid`);
		});

		it('should return error if terminated outbox account does not exist', async () => {
			await terminatedOutboxSubstore.del(chainID);
			const result = await messageRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Terminated outbox account does not exist`);
		});

		it('should return error if cross chain messages are still pending', async () => {
			transactionParams.idxs = [0];
			encodedTransactionParams = codec.encode(messageRecoveryParamsSchema, transactionParams);
			transaction = new Transaction({
				moduleID: MODULE_ID_INTEROPERABILITY_BUFFER,
				commandID: COMMAND_ID_MESSAGE_RECOVERY_BUFFER,
				fee: BigInt(100000000),
				nonce: BigInt(0),
				params: encodedTransactionParams,
				senderPublicKey: getRandomBytes(32),
				signatures: [],
			});
			commandVerifyContext = createTransactionContext({
				transaction,
			}).createCommandVerifyContext<MessageRecoveryParams>(messageRecoveryParamsSchema);

			const result = await messageRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Cross chain messages are still pending`);
		});

		it('should return error if cross chain message that needs to be recovered is not valid', async () => {
			ccms = [
				{
					nonce: BigInt(0),
					moduleID: intToBuffer(1, 4),
					crossChainCommandID: intToBuffer(1, 4),
					sendingChainID: intToBuffer(2, 4),
					receivingChainID: intToBuffer(3, 4),
					fee: BigInt(1),
					status: 1,
					params: Buffer.alloc(0),
				},
				{
					nonce: BigInt(1),
					moduleID: intToBuffer(1, 4),
					crossChainCommandID: intToBuffer(1, 4),
					sendingChainID: intToBuffer(4, 4),
					receivingChainID: intToBuffer(5, 4),
					fee: BigInt(2),
					status: 0,
					params: Buffer.alloc(0),
				},
			];
			ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));
			merkleTree = new MerkleTree();
			await merkleTree.init(ccmsEncoded);
			queryHashes = [];
			for (const data of ccmsEncoded) {
				const leafValueWithoutNodeIndex = Buffer.concat(
					[LEAF_PREFIX, data],
					LEAF_PREFIX.length + data.length,
				);
				const leafHash = hash(leafValueWithoutNodeIndex);
				queryHashes.push(leafHash);
			}
			generatedProof = await merkleTree.generateProof(queryHashes);
			terminatedChainOutboxSize = generatedProof.size;
			proof = {
				size: terminatedChainOutboxSize,
				indexes: generatedProof.idxs as number[],
				siblingHashes: generatedProof.siblingHashes as Buffer[],
			};
			hashedCCMs = ccmsEncoded.map(ccm => hash(ccm));
			outboxRoot = regularMerkleTree.calculateRootFromUpdateData(hashedCCMs, proof);
			transactionParams = {
				chainID: intToBuffer(3, 4),
				crossChainMessages: [...ccmsEncoded],
				idxs: proof.indexes,
				siblingHashes: proof.siblingHashes,
			};
			encodedTransactionParams = codec.encode(messageRecoveryParamsSchema, transactionParams);
			transaction = new Transaction({
				moduleID: MODULE_ID_INTEROPERABILITY_BUFFER,
				commandID: COMMAND_ID_MESSAGE_RECOVERY_BUFFER,
				fee: BigInt(100000000),
				nonce: BigInt(0),
				params: encodedTransactionParams,
				senderPublicKey: getRandomBytes(32),
				signatures: [],
			});
			commandVerifyContext = createTransactionContext({
				transaction,
			}).createCommandVerifyContext<MessageRecoveryParams>(messageRecoveryParamsSchema);
			await terminatedOutboxSubstore.setWithSchema(
				chainID,
				{
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 1,
				},
				terminatedOutboxSchema,
			);

			const result = await messageRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				`Cross chain message that needs to be recovered is not valid`,
			);
		});

		it('should return status OK for valid params', async () => {
			const result = await messageRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.OK);
		});
	});

	describe('Mainchain execute', () => {
		const createCommandExecuteContext = (ccms: CCMsg[]) => {
			const ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));

			transactionParams = {
				chainID: intToBuffer(3, 4),
				crossChainMessages: [...ccmsEncoded],
				idxs: [0],
				siblingHashes: [getRandomBytes(32)],
			};

			encodedTransactionParams = codec.encode(messageRecoveryParamsSchema, transactionParams);

			transaction = new Transaction({
				moduleID: MODULE_ID_INTEROPERABILITY_BUFFER,
				commandID: COMMAND_ID_MESSAGE_RECOVERY_BUFFER,
				fee: BigInt(100000000),
				nonce: BigInt(0),
				params: encodedTransactionParams,
				senderPublicKey: getRandomBytes(32),
				signatures: [],
			});

			transactionContext = createTransactionContext({
				transaction,
			});

			commandExecuteContext = transactionContext.createCommandExecuteContext<MessageRecoveryParams>(
				messageRecoveryParamsSchema,
			);

			return commandExecuteContext;
		};

		type StoreMock = Mocked<
			MainchainInteroperabilityStore,
			| 'isLive'
			| 'addToOutbox'
			| 'getChainAccount'
			| 'setTerminatedOutboxAccount'
			| 'getTerminatedOutboxAccount'
			| 'chainAccountExist'
			| 'terminatedOutboxAccountExist'
			| 'getOwnChainAccount'
		>;

		const moduleID = intToBuffer(1, 4);
		const networkID = getRandomBytes(32);

		let messageRecoveryCommand: MessageRecoveryCommand;
		let commandExecuteContext: CommandExecuteContext<MessageRecoveryParams>;
		let interoperableCCAPIs: Map<number, BaseInteroperableAPI>;
		let ccCommands: Map<number, BaseCCCommand[]>;
		let transaction: Transaction;
		let transactionParams: MessageRecoveryParams;
		let encodedTransactionParams: Buffer;
		let transactionContext: TransactionContext;
		let storeMock: StoreMock;
		let ccms: CCMsg[];

		beforeEach(() => {
			interoperableCCAPIs = new Map();
			ccCommands = new Map();

			messageRecoveryCommand = new MessageRecoveryCommand(
				MODULE_ID_INTEROPERABILITY_BUFFER,
				interoperableCCAPIs,
				ccCommands,
			);

			ccms = [
				{
					nonce: BigInt(0),
					moduleID,
					crossChainCommandID: intToBuffer(1, 4),
					sendingChainID: intToBuffer(2, 4),
					receivingChainID: intToBuffer(3, 4),
					fee: BigInt(1),
					status: 1,
					params: Buffer.alloc(0),
				},
				{
					nonce: BigInt(1),
					moduleID: intToBuffer(moduleID.readInt32BE(0) + 1, 4),
					crossChainCommandID: intToBuffer(1, 4),
					sendingChainID: intToBuffer(2, 4),
					receivingChainID: intToBuffer(3, 4),
					fee: BigInt(1),
					status: 1,
					params: Buffer.alloc(0),
				},
			];

			commandExecuteContext = createCommandExecuteContext(ccms);

			storeMock = {
				addToOutbox: jest.fn(),
				getChainAccount: jest.fn(),
				getTerminatedOutboxAccount: jest.fn(),
				setTerminatedOutboxAccount: jest.fn(),
				chainAccountExist: jest.fn().mockResolvedValue(true),
				isLive: jest.fn().mockResolvedValue(true),
				terminatedOutboxAccountExist: jest.fn().mockResolvedValue(true),
				getOwnChainAccount: jest.fn(),
			};

			storeMock.getOwnChainAccount.mockResolvedValue({
				name: `mainchain`,
				id: intToBuffer(0, 4),
				nonce: BigInt(0),
			});

			jest
				.spyOn(messageRecoveryCommand, 'getInteroperabilityStore' as any)
				.mockImplementation(() => storeMock);
			jest
				.spyOn(regularMerkleTree, 'calculateRootFromUpdateData')
				.mockReturnValue(Buffer.alloc(32));

			let chainID;
			for (const ccm of ccms) {
				chainID = ccm.sendingChainID;

				when(storeMock.getChainAccount)
					.calledWith(chainID)
					.mockResolvedValue({
						name: `chain${chainID.toString('hex')}`,
						status: CHAIN_ACTIVE,
						networkID,
						lastCertificate: {
							height: 1,
							timestamp: 10,
							stateRoot: Buffer.alloc(0),
							validatorsHash: Buffer.alloc(0),
						},
					});
			}

			chainID = transactionParams.chainID;

			when(storeMock.getTerminatedOutboxAccount)
				.calledWith(chainID)
				.mockResolvedValue({
					outboxRoot: getRandomBytes(32),
					outboxSize: 1,
					partnerChainInboxSize: 1,
				});
		});

		it('should successfully process recovery transaction', async () => {
			// Act
			await messageRecoveryCommand.execute(commandExecuteContext);
			expect.assertions(ccms.length + 1);

			{
				// Arrange
				const chainID = { transactionParams };
				const outboxRoot = Buffer.alloc(32);

				// Assert
				expect(storeMock.setTerminatedOutboxAccount).toHaveBeenCalledWith(
					chainID,
					expect.objectContaining({
						outboxRoot,
					}),
				);
			}

			for (const ccm of ccms) {
				// Assign
				const chainID = ccm.sendingChainID;
				// Assert
				expect(storeMock.addToOutbox).toHaveBeenCalledWith(
					chainID,
					swapReceivingAndSendingChainIDs(ccm),
				);
			}
		});

		it('should throw when beforeRecoverCCM of ccAPIs of the ccm fails', async () => {
			// Assign & Arrange
			const api = ({
				beforeRecoverCCM: jest.fn(() => {
					throw new Error('beforeRecoverCCM Error');
				}),
				moduleID,
			} as unknown) as BaseInteroperableAPI;

			interoperableCCAPIs.set(moduleID.readInt32BE(0), api);

			// Assert
			await expect(messageRecoveryCommand.execute(commandExecuteContext)).rejects.toThrow(
				'beforeRecoverCCM Error',
			);
		});

		it('should throw when terminated chain outbox does not exist', async () => {
			// Assign & Arrange
			const chainID = { transactionParams };

			when(storeMock.terminatedOutboxAccountExist).calledWith(chainID).mockResolvedValue(false);

			// Assert
			await expect(messageRecoveryCommand.execute(commandExecuteContext)).rejects.toThrow(
				'Terminated outbox account does not exist',
			);
		});

		it('should not add CCM to outbox when sending chain of the CCM does not exist', async () => {
			// Assign & Arrange & Act
			for (const ccm of ccms) {
				const chainID = ccm.sendingChainID;

				when(storeMock.chainAccountExist).calledWith(chainID).mockResolvedValue(false);
			}

			await messageRecoveryCommand.execute(commandExecuteContext);

			// Assert
			expect.assertions(ccms.length);
			for (const _ of ccms) {
				expect(storeMock.addToOutbox).not.toHaveBeenCalled();
			}
		});

		it('should not add CCM to outbox when sending chain of the CCM is not live', async () => {
			// Assign & Arrange & Act
			for (const ccm of ccms) {
				const chainID = ccm.sendingChainID;

				when(storeMock.isLive).calledWith(chainID).mockResolvedValue(false);
			}

			await messageRecoveryCommand.execute(commandExecuteContext);

			// Assert
			expect.assertions(ccms.length);
			for (const _ of ccms) {
				expect(storeMock.addToOutbox).not.toHaveBeenCalled();
			}
		});

		it('should not add CCM to outbox when sending chain of the CCM is not active', async () => {
			// Assign & Arrange & Act
			for (const ccm of ccms) {
				const chainID = ccm.sendingChainID;

				when(storeMock.getChainAccount)
					.calledWith(chainID)
					.mockResolvedValue({
						status: -1,
					} as any);
			}

			await messageRecoveryCommand.execute(commandExecuteContext);

			// Assert
			expect.assertions(ccms.length);
			for (const _ of ccms) {
				expect(storeMock.addToOutbox).not.toHaveBeenCalled();
			}
		});

		it('should execute referenced logic in CCM if ownChainAccountID equals to sendingChainID of the CCM', async () => {
			// Arrange & Assign
			commandExecuteContext = createCommandExecuteContext(
				ccms.map(ccm => ({
					...ccm,
					receivingChainID: intToBuffer(0, 4),
				})),
			);

			for (const ccm of ccms) {
				ccCommands.set(ccm.moduleID.readInt32BE(0), ([
					{
						ID: ccm.crossChainCommandID,
						execute: jest.fn(),
					},
				] as unknown) as BaseCCCommand[]);
			}

			const ccmsWithSwappedChainIds = ccms.map(swapReceivingAndSendingChainIDs);

			// Act
			await messageRecoveryCommand.execute(commandExecuteContext);

			// Assert
			expect.assertions(ccms.length);
			for (const ccm of ccmsWithSwappedChainIds) {
				const commands = ccCommands.get(ccm.moduleID.readInt32BE(0)) as BaseCCCommand[];
				const command = commands.find(cmd =>
					cmd.ID.equals(ccm.crossChainCommandID),
				) as BaseCCCommand;
				expect(command.execute).toHaveBeenCalled();
			}
		});

		it("should skip CCM's proccessing when there is no crossChainCommand associated with a module to execute", async () => {
			// Arrange & Assign
			commandExecuteContext = createCommandExecuteContext(
				ccms.map(ccm => ({
					...ccm,
					receivingChainID: intToBuffer(0, 4),
				})),
			);

			for (const ccm of ccms) {
				ccCommands.set(ccm.moduleID.readInt32BE(0), ([
					{
						ID: -1,
						execute: jest.fn(),
					},
				] as unknown) as BaseCCCommand[]);
			}

			BaseCCCommand.prototype.execute = jest.fn();

			// Act
			await messageRecoveryCommand.execute(commandExecuteContext);

			// Assert
			expect.assertions(ccms.length * 2);
			for (const _ of ccms) {
				expect(BaseCCCommand.prototype.execute).not.toHaveBeenCalled();
				expect(storeMock.addToOutbox).not.toHaveBeenCalled();
			}
		});

		it("should skip CCM's proccessing when there are no ccCommands to execute", async () => {
			// Assign
			commandExecuteContext = createCommandExecuteContext(
				ccms.map(ccm => ({
					...ccm,
					receivingChainID: intToBuffer(0, 4),
				})),
			);

			BaseCCCommand.prototype.execute = jest.fn();

			// Act
			await messageRecoveryCommand.execute(commandExecuteContext);

			// Assert
			expect.assertions(ccms.length * 2);
			for (const _ of ccms) {
				expect(BaseCCCommand.prototype.execute).not.toHaveBeenCalled();
				expect(storeMock.addToOutbox).not.toHaveBeenCalled();
			}
		});
	});
});
