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
/* eslint-disable max-classes-per-file */

import { when } from 'jest-when';
import { codec } from '@liskhq/lisk-codec';
import { Transaction } from '@liskhq/lisk-chain';
import { utils } from '@liskhq/lisk-cryptography';
import { MerkleTree, regularMerkleTree } from '@liskhq/lisk-tree';
import { CommandExecuteContext, MainchainInteroperabilityModule } from '../../../../../../src';
import { BaseCCCommand } from '../../../../../../src/modules/interoperability/base_cc_command';
import { BaseCCMethod } from '../../../../../../src/modules/interoperability/base_cc_method';
import {
	COMMAND_NAME_MESSAGE_RECOVERY,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../../src/modules/interoperability/constants';
import { MainchainMessageRecoveryCommand } from '../../../../../../src/modules/interoperability/mainchain/commands/message_recovery';
import { MainchainInteroperabilityInternalMethod } from '../../../../../../src/modules/interoperability/mainchain/internal_method';
import {
	ccmSchema,
	messageRecoveryParamsSchema,
} from '../../../../../../src/modules/interoperability/schemas';
import {
	CCMsg,
	CrossChainMessageContext,
	MessageRecoveryParams,
} from '../../../../../../src/modules/interoperability/types';
import { CommandVerifyContext, VerifyStatus } from '../../../../../../src/state_machine/types';
import {
	createCrossChainMessageContext,
	createTransactionContext,
} from '../../../../../../src/testing';
import { swapReceivingAndSendingChainIDs } from '../../../../../../src/modules/interoperability/utils';
import { TransactionContext } from '../../../../../../src/state_machine';
import { Mocked } from '../../../../../utils/types';
// import { PrefixedStateReadWriter } from '../../../../../../src/state_machine/prefixed_state_read_writer';
// import { InMemoryPrefixedStateDB } from '../../../../../../src/testing/in_memory_prefixed_state';
import { TerminatedOutboxStore } from '../../../../../../src/modules/interoperability/stores/terminated_outbox';
import { createStoreGetter } from '../../../../../../src/testing/utils';
import {
	ChainAccountStore,
	ChainStatus,
} from '../../../../../../src/modules/interoperability/stores/chain_account';
import { OwnChainAccountStore } from '../../../../../../src/modules/interoperability/stores/own_chain_account';
import {
	CCMProcessedCode,
	CcmProcessedEvent,
	CCMProcessedResult,
} from '../../../../../../src/modules/interoperability/events/ccm_processed';
import { CcmSendSuccessEvent } from '../../../../../../src/modules/interoperability/events/ccm_send_success';

describe('Mainchain MessageRecoveryCommand', () => {
	const interopMod = new MainchainInteroperabilityModule();

	describe('verify', () => {
		const LEAF_PREFIX = Buffer.from('00', 'hex');

		// let stateStore: PrefixedStateReadWriter;
		let terminatedOutboxSubstore: TerminatedOutboxStore;
		let messageRecoveryCommand: MainchainMessageRecoveryCommand;
		let commandVerifyContext: CommandVerifyContext<MessageRecoveryParams>;
		let interoperableCCMethods: Map<string, BaseCCMethod>;
		let ccCommands: Map<string, BaseCCCommand[]>;
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
			interoperableCCMethods = new Map();
			ccCommands = new Map();

			terminatedOutboxSubstore = interopMod.stores.get(TerminatedOutboxStore);
			messageRecoveryCommand = new MainchainMessageRecoveryCommand(
				interopMod.stores,
				interopMod.events,
				interoperableCCMethods,
				ccCommands,
				interopMod['internalMethod'],
			);

			ccms = [
				{
					nonce: BigInt(0),
					module: MODULE_NAME_INTEROPERABILITY,
					crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
					sendingChainID: utils.intToBuffer(2, 4),
					receivingChainID: utils.intToBuffer(3, 4),
					fee: BigInt(1),
					status: 0,
					params: Buffer.alloc(0),
				},
				{
					nonce: BigInt(1),
					module: MODULE_NAME_INTEROPERABILITY,
					crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
					sendingChainID: utils.intToBuffer(4, 4),
					receivingChainID: utils.intToBuffer(5, 4),
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
				const leafHash = utils.hash(leafValueWithoutNodeIndex);
				queryHashes.push(leafHash);
			}
			generatedProof = await merkleTree.generateProof(queryHashes);
			terminatedChainOutboxSize = generatedProof.size;
			proof = {
				size: terminatedChainOutboxSize,
				indexes: generatedProof.idxs as number[],
				siblingHashes: generatedProof.siblingHashes as Buffer[],
			};
			hashedCCMs = ccmsEncoded.map(ccm => utils.hash(ccm));
			outboxRoot = regularMerkleTree.calculateRootFromUpdateData(hashedCCMs, proof);
			transactionParams = {
				chainID: utils.intToBuffer(3, 4),
				crossChainMessages: [...ccmsEncoded],
				idxs: proof.indexes,
				siblingHashes: proof.siblingHashes,
			};
			chainID = transactionParams.chainID;
			encodedTransactionParams = codec.encode(messageRecoveryParamsSchema, transactionParams);

			transaction = new Transaction({
				module: MODULE_NAME_INTEROPERABILITY,
				command: COMMAND_NAME_MESSAGE_RECOVERY,
				fee: BigInt(100000000),
				nonce: BigInt(0),
				params: encodedTransactionParams,
				senderPublicKey: utils.getRandomBytes(32),
				signatures: [],
			});
			commandVerifyContext = createTransactionContext({
				transaction,
			}).createCommandVerifyContext<MessageRecoveryParams>(messageRecoveryParamsSchema);

			await terminatedOutboxSubstore.set(
				createStoreGetter(commandVerifyContext.stateStore as any),
				chainID,
				{
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 1,
				},
			);
		});

		it('should return error if the sidechain outbox root is not valid', async () => {
			await terminatedOutboxSubstore.set(
				createStoreGetter(commandVerifyContext.stateStore as any),
				chainID,
				{
					outboxRoot: utils.getRandomBytes(32),
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 1,
				},
			);
			const result = await messageRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`The sidechain outbox root is not valid`);
		});

		it('should return error if terminated outbox account does not exist', async () => {
			await terminatedOutboxSubstore.del(
				createStoreGetter(commandVerifyContext.stateStore as any),
				chainID,
			);
			const result = await messageRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Terminated outbox account does not exist`);
		});

		it('should return error if cross chain messages are still pending', async () => {
			transactionParams.idxs = [0];
			encodedTransactionParams = codec.encode(messageRecoveryParamsSchema, transactionParams);
			transaction = new Transaction({
				module: MODULE_NAME_INTEROPERABILITY,
				command: COMMAND_NAME_MESSAGE_RECOVERY,
				fee: BigInt(100000000),
				nonce: BigInt(0),
				params: encodedTransactionParams,
				senderPublicKey: utils.getRandomBytes(32),
				signatures: [],
			});
			commandVerifyContext = createTransactionContext({
				transaction,
			}).createCommandVerifyContext<MessageRecoveryParams>(messageRecoveryParamsSchema);

			await terminatedOutboxSubstore.set(
				createStoreGetter(commandVerifyContext.stateStore as any),
				chainID,
				{
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 1,
				},
			);

			const result = await messageRecoveryCommand.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Cross chain messages are still pending`);
		});

		it('should return error if cross chain message that needs to be recovered is not valid', async () => {
			ccms = [
				{
					nonce: BigInt(0),
					module: MODULE_NAME_INTEROPERABILITY,
					crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
					sendingChainID: utils.intToBuffer(2, 4),
					receivingChainID: utils.intToBuffer(3, 4),
					fee: BigInt(1),
					status: 1,
					params: Buffer.alloc(0),
				},
				{
					nonce: BigInt(1),
					module: MODULE_NAME_INTEROPERABILITY,
					crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
					sendingChainID: utils.intToBuffer(4, 4),
					receivingChainID: utils.intToBuffer(5, 4),
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
				const leafHash = utils.hash(leafValueWithoutNodeIndex);
				queryHashes.push(leafHash);
			}
			generatedProof = await merkleTree.generateProof(queryHashes);
			terminatedChainOutboxSize = generatedProof.size;
			proof = {
				size: terminatedChainOutboxSize,
				indexes: generatedProof.idxs as number[],
				siblingHashes: generatedProof.siblingHashes as Buffer[],
			};
			hashedCCMs = ccmsEncoded.map(ccm => utils.hash(ccm));
			outboxRoot = regularMerkleTree.calculateRootFromUpdateData(hashedCCMs, proof);
			transactionParams = {
				chainID: utils.intToBuffer(3, 4),
				crossChainMessages: [...ccmsEncoded],
				idxs: proof.indexes,
				siblingHashes: proof.siblingHashes,
			};
			encodedTransactionParams = codec.encode(messageRecoveryParamsSchema, transactionParams);
			transaction = new Transaction({
				module: MODULE_NAME_INTEROPERABILITY,
				command: COMMAND_NAME_MESSAGE_RECOVERY,
				fee: BigInt(100000000),
				nonce: BigInt(0),
				params: encodedTransactionParams,
				senderPublicKey: utils.getRandomBytes(32),
				signatures: [],
			});
			commandVerifyContext = createTransactionContext({
				transaction,
			}).createCommandVerifyContext<MessageRecoveryParams>(messageRecoveryParamsSchema);
			await terminatedOutboxSubstore.set(
				createStoreGetter(commandVerifyContext.stateStore as any),
				chainID,
				{
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 1,
				},
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
				chainID: utils.intToBuffer(3, 4),
				crossChainMessages: [...ccmsEncoded],
				idxs: [0],
				siblingHashes: [utils.getRandomBytes(32)],
			};

			encodedTransactionParams = codec.encode(messageRecoveryParamsSchema, transactionParams);

			transaction = new Transaction({
				module: MODULE_NAME_INTEROPERABILITY,
				command: COMMAND_NAME_MESSAGE_RECOVERY,
				fee: BigInt(100000000),
				nonce: BigInt(0),
				params: encodedTransactionParams,
				senderPublicKey: utils.getRandomBytes(32),
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

		type StoreMock = Mocked<MainchainInteroperabilityInternalMethod, 'isLive' | 'addToOutbox'>;

		const chainAccountStoreMock = {
			get: jest.fn(),
			set: jest.fn(),
			has: jest.fn(),
		};
		const ownChainAccountStoreMock = {
			get: jest.fn(),
			set: jest.fn(),
			has: jest.fn(),
		};
		const terminatedOutboxAccountMock = {
			get: jest.fn(),
			set: jest.fn(),
			has: jest.fn(),
		};
		let messageRecoveryCommand: MainchainMessageRecoveryCommand;
		let commandExecuteContext: CommandExecuteContext<MessageRecoveryParams>;
		let interoperableCCMethods: Map<string, BaseCCMethod>;
		let ccCommands: Map<string, BaseCCCommand[]>;
		let transaction: Transaction;
		let transactionParams: MessageRecoveryParams;
		let encodedTransactionParams: Buffer;
		let transactionContext: TransactionContext;
		let storeMock: StoreMock;
		let ccms: CCMsg[];

		beforeEach(() => {
			interoperableCCMethods = new Map();
			ccCommands = new Map();
			storeMock = {
				addToOutbox: jest.fn(),
				isLive: jest.fn().mockResolvedValue(true),
			};
			interopMod['internalMethod'] = storeMock as any;

			messageRecoveryCommand = new MainchainMessageRecoveryCommand(
				interopMod.stores,
				interopMod.events,
				interoperableCCMethods,
				ccCommands,
				interopMod['internalMethod'],
			);

			ccms = [
				{
					nonce: BigInt(0),
					module: MODULE_NAME_INTEROPERABILITY,
					crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
					sendingChainID: utils.intToBuffer(2, 4),
					receivingChainID: utils.intToBuffer(3, 4),
					fee: BigInt(1),
					status: 1,
					params: Buffer.alloc(0),
				},
				{
					nonce: BigInt(1),
					module: 'token',
					crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
					sendingChainID: utils.intToBuffer(2, 4),
					receivingChainID: utils.intToBuffer(3, 4),
					fee: BigInt(1),
					status: 1,
					params: Buffer.alloc(0),
				},
			];

			commandExecuteContext = createCommandExecuteContext(ccms);

			interopMod.stores.get(OwnChainAccountStore).get = ownChainAccountStoreMock.get;
			ownChainAccountStoreMock.get.mockResolvedValue({
				name: `mainchain`,
				chainID: utils.intToBuffer(0, 4),
				nonce: BigInt(0),
			});

			jest
				.spyOn(regularMerkleTree, 'calculateRootFromUpdateData')
				.mockReturnValue(Buffer.alloc(32));

			let chainID;

			interopMod.stores.register(ChainAccountStore, chainAccountStoreMock as never);
			interopMod.stores.register(OwnChainAccountStore, ownChainAccountStoreMock as never);
			interopMod.stores.register(TerminatedOutboxStore, terminatedOutboxAccountMock as never);

			for (const ccm of ccms) {
				chainID = ccm.sendingChainID;

				chainAccountStoreMock.get.mockResolvedValue({
					name: `chain${chainID.toString('hex')}`,
					status: ChainStatus.ACTIVE,
					lastCertificate: {
						height: 1,
						timestamp: 10,
						stateRoot: Buffer.alloc(0),
						validatorsHash: Buffer.alloc(0),
					},
				});
			}

			chainID = transactionParams.chainID;

			interopMod.stores.get(TerminatedOutboxStore).get = terminatedOutboxAccountMock.get;
			terminatedOutboxAccountMock.get.mockResolvedValue({
				outboxRoot: utils.getRandomBytes(32),
				outboxSize: 1,
				partnerChainInboxSize: 1,
			});

			terminatedOutboxAccountMock.has.mockResolvedValue(true);
		});

		it('should successfully process recovery transaction', async () => {
			// Act
			chainAccountStoreMock.has.mockResolvedValue(true);
			await messageRecoveryCommand.execute(commandExecuteContext);
			expect.assertions(ccms.length + 1);

			{
				// Arrange
				const { chainID } = transactionParams;
				const outboxRoot = Buffer.alloc(32);

				// Assert
				expect(terminatedOutboxAccountMock.set).toHaveBeenCalledWith(
					expect.anything(),
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
					expect.anything(),
					chainID,
					swapReceivingAndSendingChainIDs(ccm),
				);
			}
		});

		it('should throw when beforeRecoverCCM of ccMethods of the ccm fails', async () => {
			// Assign & Arrange
			const method = ({
				beforeRecoverCCM: jest.fn(() => {
					throw new Error('beforeRecoverCCM Error');
				}),
				MODULE_NAME_INTEROPERABILITY,
			} as unknown) as BaseCCMethod;

			interoperableCCMethods.set(MODULE_NAME_INTEROPERABILITY, method);

			// Assert
			await expect(messageRecoveryCommand.execute(commandExecuteContext)).rejects.toThrow(
				'beforeRecoverCCM Error',
			);
		});

		it('should throw when terminated chain outbox does not exist', async () => {
			// Assign & Arrange
			const { chainID } = transactionParams;

			when(terminatedOutboxAccountMock.has).calledWith(chainID).mockResolvedValue(false);

			// Assert
			await expect(messageRecoveryCommand.execute(commandExecuteContext)).rejects.toThrow(
				'Terminated outbox account does not exist',
			);
		});

		it('should not add CCM to outbox when sending chain of the CCM does not exist', async () => {
			// Assign & Arrange & Act
			chainAccountStoreMock.has.mockResolvedValue(false);

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

				when(chainAccountStoreMock.get)
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

		// TODO: Fix in #7727
		// eslint-disable-next-line jest/no-disabled-tests
		it.skip('should execute referenced logic in CCM if ownChainAccountID equals to sendingChainID of the CCM', async () => {
			// Arrange & Assign
			commandExecuteContext = createCommandExecuteContext(
				ccms.map(ccm => ({
					...ccm,
					receivingChainID: utils.intToBuffer(0, 4),
				})),
			);

			for (const ccm of ccms) {
				ccCommands.set(ccm.module, ([
					{
						name: ccm.crossChainCommand,
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
				const commands = ccCommands.get(ccm.module) as BaseCCCommand[];
				const command = commands.find(cmd => cmd.name === ccm.crossChainCommand) as BaseCCCommand;
				expect(command.execute).toHaveBeenCalled();
			}
		});

		it("should skip CCM's proccessing when there is no crossChainCommand associated with a module to execute", async () => {
			// Arrange & Assign
			commandExecuteContext = createCommandExecuteContext(
				ccms.map(ccm => ({
					...ccm,
					receivingChainID: utils.intToBuffer(0, 4),
				})),
			);

			for (const ccm of ccms) {
				ccCommands.set(ccm.module, ([
					{
						ID: utils.intToBuffer(500, 4),
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
					receivingChainID: utils.intToBuffer(0, 4),
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

	describe('_applyRecovery', () => {
		const defaultCCM = {
			nonce: BigInt(0),
			module: 'token',
			crossChainCommand: 'crossChainTransfer',
			sendingChainID: Buffer.from([0, 0, 2, 0]),
			receivingChainID: Buffer.from([0, 0, 3, 0]),
			fee: BigInt(20000),
			status: 0,
			params: Buffer.alloc(0),
		};
		let context: CrossChainMessageContext;
		let command: MainchainMessageRecoveryCommand;
		let ccMethods: Map<string, BaseCCMethod>;
		let ccCommands: Map<string, BaseCCCommand[]>;
		let internalMethod: MainchainInteroperabilityInternalMethod;

		beforeEach(() => {
			const interopModule = new MainchainInteroperabilityModule();
			ccMethods = new Map();
			ccMethods.set(
				'token',
				new (class TokenMethod extends BaseCCMethod {
					public verifyCrossChainMessage = jest.fn();
					public beforeCrossChainCommandExecute = jest.fn();
					public afterCrossChainCommandExecute = jest.fn();
				})(interopModule.stores, interopModule.events),
			);
			ccCommands = new Map();
			ccCommands.set('token', [
				new (class CrossChainTransfer extends BaseCCCommand {
					public schema = { $id: 'test/ccu', properties: {}, type: 'object' };
					public verify = jest.fn();
					public execute = jest.fn();
				})(interopModule.stores, interopModule.events),
			]);
			internalMethod = {} as any;
			interopModule['internalMethod'] = internalMethod;
			command = new MainchainMessageRecoveryCommand(
				interopModule.stores,
				interopModule.events,
				ccMethods,
				ccCommands,
				interopModule['internalMethod'],
			);
			jest.spyOn(command['events'].get(CcmProcessedEvent), 'log');
			jest.spyOn(command['events'].get(CcmSendSuccessEvent), 'log');
			context = createCrossChainMessageContext({
				ccm: defaultCCM,
			});
		});

		it('should log event when verifyCrossChainMessage fails', async () => {
			((ccMethods.get('token') as BaseCCMethod)
				.verifyCrossChainMessage as jest.Mock).mockRejectedValue('error');
			await expect(command['_applyRecovery'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm.sendingChainID,
				{
					ccmID: expect.any(Buffer),
					code: CCMProcessedCode.INVALID_CCM_VERIFY_CCM_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should log event if the module is not registered', async () => {
			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					module: 'nonExisting',
				},
			});

			await expect(command['_applyRecovery'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm.sendingChainID,
				{
					ccmID: expect.any(Buffer),
					code: CCMProcessedCode.MODULE_NOT_SUPPORTED,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should log event if the command is not registered', async () => {
			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					crossChainCommand: 'nonExisting',
				},
			});

			await expect(command['_applyRecovery'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm.sendingChainID,
				{
					ccmID: expect.any(Buffer),
					code: CCMProcessedCode.CROSS_CHAIN_COMMAND_NOT_SUPPORTED,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should log event when command verify fails', async () => {
			(((ccCommands.get(defaultCCM.module) as BaseCCCommand[]).find(
				com => com.name === defaultCCM.crossChainCommand,
			) as BaseCCCommand).verify as jest.Mock).mockRejectedValue('error');

			await expect(command['_applyRecovery'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm.sendingChainID,
				{
					ccmID: expect.any(Buffer),
					code: CCMProcessedCode.INVALID_CCM_VERIFY_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should log event when command beforeCrossChainCommandExecute fails', async () => {
			((ccMethods.get('token') as BaseCCMethod)
				.beforeCrossChainCommandExecute as jest.Mock).mockRejectedValue('error');

			await expect(command['_applyRecovery'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm.sendingChainID,
				{
					ccmID: expect.any(Buffer),
					code: CCMProcessedCode.INVALID_CCM_BEFORE_CCC_EXECUTION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should revert to the original state/event when command beforeCrossChainCommandExecute fails', async () => {
			((ccMethods.get('token') as BaseCCMethod)
				.beforeCrossChainCommandExecute as jest.Mock).mockRejectedValue('error');
			jest.spyOn(context.eventQueue, 'createSnapshot').mockReturnValue(99);
			jest.spyOn(context.stateStore, 'createSnapshot').mockReturnValue(10);
			jest.spyOn(context.eventQueue, 'restoreSnapshot');
			jest.spyOn(context.stateStore, 'restoreSnapshot');

			await expect(command['_applyRecovery'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.restoreSnapshot).toHaveBeenCalledWith(99);
			expect(context.stateStore.restoreSnapshot).toHaveBeenCalledWith(10);
		});

		it('should log event and restore the state/event before calling execute when execute fails', async () => {
			(((ccCommands.get(defaultCCM.module) as BaseCCCommand[]).find(
				com => com.name === defaultCCM.crossChainCommand,
			) as BaseCCCommand).execute as jest.Mock).mockRejectedValue('error');
			let eventQueueCount = 0;
			let stateStoreCount = 0;
			jest.spyOn(context.eventQueue, 'createSnapshot').mockImplementation(() => {
				eventQueueCount += 1;
				return eventQueueCount;
			});
			jest.spyOn(context.stateStore, 'createSnapshot').mockImplementation(() => {
				stateStoreCount += 1;
				return stateStoreCount;
			});
			jest.spyOn(context.eventQueue, 'restoreSnapshot');
			jest.spyOn(context.stateStore, 'restoreSnapshot');

			await expect(command['_applyRecovery'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.restoreSnapshot).toHaveBeenCalledWith(2);
			expect(context.stateStore.restoreSnapshot).toHaveBeenCalledWith(2);
			expect(
				(ccMethods.get('token') as BaseCCMethod).afterCrossChainCommandExecute as jest.Mock,
			).toHaveBeenCalledTimes(1);
		});

		it('should log event when command afterCrossChainCommandExecute fails', async () => {
			((ccMethods.get('token') as BaseCCMethod)
				.afterCrossChainCommandExecute as jest.Mock).mockRejectedValue('error');

			await expect(command['_applyRecovery'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm.sendingChainID,
				{
					ccmID: expect.any(Buffer),
					code: CCMProcessedCode.INVALID_CCM_AFTER_CCC_EXECUTION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should restore the original state/event when command afterCrossChainCommandExecute fails', async () => {
			((ccMethods.get('token') as BaseCCMethod)
				.afterCrossChainCommandExecute as jest.Mock).mockRejectedValue('error');
			jest.spyOn(context.eventQueue, 'createSnapshot').mockReturnValue(99);
			jest.spyOn(context.stateStore, 'createSnapshot').mockReturnValue(10);
			jest.spyOn(context.eventQueue, 'restoreSnapshot');
			jest.spyOn(context.stateStore, 'restoreSnapshot');

			await expect(command['_applyRecovery'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.restoreSnapshot).toHaveBeenCalledWith(99);
			expect(context.stateStore.restoreSnapshot).toHaveBeenCalledWith(10);
		});

		it('call all the hooks if defined', async () => {
			const ccMethod = ccMethods.get('token');
			const ccCommand = ccCommands
				.get(defaultCCM.module)
				?.find(com => com.name === defaultCCM.crossChainCommand);

			await expect(command['_applyRecovery'](context)).resolves.toBeUndefined();

			expect(ccMethod?.verifyCrossChainMessage).toHaveBeenCalledTimes(1);
			expect(ccMethod?.beforeCrossChainCommandExecute).toHaveBeenCalledTimes(1);
			expect(ccMethod?.afterCrossChainCommandExecute).toHaveBeenCalledTimes(1);
			expect(ccCommand?.verify).toHaveBeenCalledTimes(1);
			expect(ccCommand?.execute).toHaveBeenCalledTimes(1);

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm.sendingChainID,
				{
					ccmID: expect.any(Buffer),
					code: CCMProcessedCode.SUCCESS,
					result: CCMProcessedResult.APPLIED,
				},
			);
		});
	});
});
