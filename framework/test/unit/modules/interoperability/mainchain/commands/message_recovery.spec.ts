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
import { Proof } from '@liskhq/lisk-tree/dist-node/merkle_tree/types';
import { CommandExecuteContext, MainchainInteroperabilityModule } from '../../../../../../src';
import { BaseCCCommand } from '../../../../../../src/modules/interoperability/base_cc_command';
import { BaseCCMethod } from '../../../../../../src/modules/interoperability/base_cc_method';
import {
	CCMStatusCode,
	COMMAND_NAME_MESSAGE_RECOVERY,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	MODULE_NAME_INTEROPERABILITY,
	CHAIN_ID_MAINCHAIN,
} from '../../../../../../src/modules/interoperability/constants';
import { MainchainMessageRecoveryCommand } from '../../../../../../src/modules/interoperability/mainchain/commands/message_recovery';
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

const createCommandVerifyContext = (
	inputTx: Transaction,
	transactionParams: MessageRecoveryParams,
) => {
	const transaction = new Transaction({
		...inputTx,
		params: codec.encode(messageRecoveryParamsSchema, transactionParams),
	});

	return createTransactionContext({
		transaction,
	}).createCommandVerifyContext<MessageRecoveryParams>(messageRecoveryParamsSchema);
};

const generateProof = async (ccms: Buffer[]): Promise<Proof> => {
	const LEAF_PREFIX = Buffer.from('00', 'hex');

	const merkleTree = new MerkleTree();
	await merkleTree.init(ccms);

	const queryHashes: Buffer[] = [];
	for (const data of ccms) {
		const leafValueWithoutNodeIndex = Buffer.concat(
			[LEAF_PREFIX, data],
			LEAF_PREFIX.length + data.length,
		);
		const leafHash = utils.hash(leafValueWithoutNodeIndex);
		queryHashes.push(leafHash);
	}

	return merkleTree.generateProof(queryHashes);
};

describe('Mainchain MessageRecoveryCommand', () => {
	const interopModule = new MainchainInteroperabilityModule();

	let command: MainchainMessageRecoveryCommand;

	beforeEach(() => {
		command = new MainchainMessageRecoveryCommand(
			interopModule.stores,
			interopModule.events,
			new Map(),
			new Map(),
			{
				addToOutbox: jest.fn(),
				isLive: jest.fn().mockResolvedValue(true),
			} as never,
		);
	});

	describe('verify', () => {
		// let stateStore: PrefixedStateReadWriter;
		let commandVerifyContext: CommandVerifyContext<MessageRecoveryParams>;
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
		let generatedProof: any;

		beforeEach(async () => {
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
			generatedProof = await generateProof(ccmsEncoded);
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

			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandVerifyContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 1,
				});

			jest.spyOn(regularMerkleTree, 'verifyDataBlock').mockReturnValue(true);
		});

		it('should return error if terminated outbox account does not exist', async () => {
			await interopModule.stores
				.get(TerminatedOutboxStore)
				.del(createStoreGetter(commandVerifyContext.stateStore as any), chainID);
			const result = await command.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Terminated outbox account does not exist.`);
		});

		it('should return error if idxs are not sorted in ascending order', async () => {
			transactionParams.idxs = [3, 1, 2, 0];
			commandVerifyContext = createCommandVerifyContext(transaction, transactionParams);

			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandVerifyContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 1,
				});

			const result = await command.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				`Cross-chain message indexes are not sorted in ascending order.`,
			);
		});

		it('should return error if cross-chain message is not pending', async () => {
			transactionParams.idxs = [0];
			commandVerifyContext = createCommandVerifyContext(transaction, transactionParams);

			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandVerifyContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 1,
				});

			const result = await command.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Cross-chain message is not pending.`);
		});

		it('should return error if ccm.status !== CCMStatusCode.OK', async () => {
			ccms = [
				{
					nonce: BigInt(0),
					module: MODULE_NAME_INTEROPERABILITY,
					crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
					sendingChainID: utils.intToBuffer(2, 4),
					receivingChainID: utils.intToBuffer(3, 4),
					fee: BigInt(1),
					status: CCMStatusCode.FAILED_CCM,
					params: Buffer.alloc(0),
				},
			];
			ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));
			transactionParams.crossChainMessages = [...ccmsEncoded];
			transactionParams.idxs = [11, 12, 13];

			commandVerifyContext = createCommandVerifyContext(transaction, transactionParams);

			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandVerifyContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 1,
				});

			const result = await command.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Cross-chain message status is not valid.`);
		});

		it('should return error if cross-chain message receiving chain ID is not valid', async () => {
			ccms = [
				{
					nonce: BigInt(0),
					module: MODULE_NAME_INTEROPERABILITY,
					crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
					sendingChainID: utils.intToBuffer(2, 4),
					receivingChainID: utils.intToBuffer(2, 4),
					fee: BigInt(1),
					status: CCMStatusCode.OK,
					params: Buffer.alloc(0),
				},
			];
			ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));
			transactionParams.crossChainMessages = [...ccmsEncoded];
			transactionParams.idxs = [11, 12, 13];

			commandVerifyContext = createCommandVerifyContext(transaction, transactionParams);

			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandVerifyContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 1,
				});

			const result = await command.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				`Cross-chain message receiving chain ID is not valid.`,
			);
		});

		it('should return error if message recovery proof of inclusion is not valid', async () => {
			jest.spyOn(regularMerkleTree, 'verifyDataBlock').mockReturnValue(false);

			ccms = [
				{
					nonce: BigInt(0),
					module: MODULE_NAME_INTEROPERABILITY,
					crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
					sendingChainID: utils.intToBuffer(2, 4),
					receivingChainID: chainID,
					fee: BigInt(1),
					status: CCMStatusCode.OK,
					params: Buffer.alloc(0),
				},
			];
			ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));
			transactionParams.crossChainMessages = [...ccmsEncoded];
			transactionParams.idxs = [11, 12, 13];
			transactionParams.chainID = chainID;

			commandVerifyContext = createCommandVerifyContext(transaction, transactionParams);

			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandVerifyContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 1,
				});

			const result = await command.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Message recovery proof of inclusion is not valid.`);
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
					receivingChainID: utils.intToBuffer(3, 4),
					fee: BigInt(2),
					status: 0,
					params: Buffer.alloc(0),
				},
			];
			ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));
			generatedProof = await generateProof(ccmsEncoded);
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
			commandVerifyContext = createCommandVerifyContext(transaction, transactionParams);
			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandVerifyContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 1,
				});

			const result = await command.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Cross-chain message status is not valid.`);
		});

		it('should return status OK for valid params', async () => {
			ccms = [
				{
					nonce: BigInt(0),
					module: MODULE_NAME_INTEROPERABILITY,
					crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
					sendingChainID: utils.intToBuffer(2, 4),
					receivingChainID: chainID,
					fee: BigInt(1),
					status: CCMStatusCode.OK,
					params: Buffer.alloc(0),
				},
			];
			ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));
			transactionParams.crossChainMessages = [...ccmsEncoded];
			transactionParams.idxs = [11, 12, 13];
			transactionParams.chainID = chainID;

			commandVerifyContext = createCommandVerifyContext(transaction, transactionParams);

			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandVerifyContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 1,
				});

			const result = await command.verify(commandVerifyContext);
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
		let commandExecuteContext: CommandExecuteContext<MessageRecoveryParams>;
		let transaction: Transaction;
		let transactionParams: MessageRecoveryParams;
		let encodedTransactionParams: Buffer;
		let transactionContext: TransactionContext;
		let ccms: CCMsg[];

		beforeEach(() => {
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

			interopModule.stores.get(OwnChainAccountStore).get = ownChainAccountStoreMock.get;
			ownChainAccountStoreMock.get.mockResolvedValue({
				name: `mainchain`,
				chainID: utils.intToBuffer(0, 4),
				nonce: BigInt(0),
			});

			jest
				.spyOn(regularMerkleTree, 'calculateRootFromUpdateData')
				.mockReturnValue(Buffer.alloc(32));

			let chainID;

			interopModule.stores.register(ChainAccountStore, chainAccountStoreMock as never);
			interopModule.stores.register(OwnChainAccountStore, ownChainAccountStoreMock as never);
			interopModule.stores.register(TerminatedOutboxStore, terminatedOutboxAccountMock as never);

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

			interopModule.stores.get(TerminatedOutboxStore).get = terminatedOutboxAccountMock.get;
			terminatedOutboxAccountMock.get.mockResolvedValue({
				outboxRoot: utils.getRandomBytes(32),
				outboxSize: 1,
				partnerChainInboxSize: 1,
			});

			terminatedOutboxAccountMock.has.mockResolvedValue(true);
		});

		it('should proceed without error if the sending chain is the mainchain', async () => {
			ccms = [
				{
					nonce: BigInt(0),
					module: MODULE_NAME_INTEROPERABILITY,
					crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
					sendingChainID: CHAIN_ID_MAINCHAIN,
					receivingChainID: utils.intToBuffer(3, 4),
					fee: BigInt(1),
					status: 1,
					params: Buffer.alloc(0),
				},
			];

			commandExecuteContext = createCommandExecuteContext(ccms);
			await expect(command.execute(commandExecuteContext)).resolves.toBeUndefined();
		});

		it('should proceed without error if the sending chain is not the mainchain', async () => {
			ccms = [
				{
					nonce: BigInt(0),
					module: MODULE_NAME_INTEROPERABILITY,
					crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
					sendingChainID: Buffer.from('abc', 'hex'),
					receivingChainID: utils.intToBuffer(3, 4),
					fee: BigInt(1),
					status: 1,
					params: Buffer.alloc(0),
				},
			];

			commandExecuteContext = createCommandExecuteContext(ccms);
			await expect(command.execute(commandExecuteContext)).resolves.toBeUndefined();
		});

		it('should throw when terminated chain outbox does not exist', async () => {
			// Assign & Arrange
			const { chainID } = transactionParams;

			when(terminatedOutboxAccountMock.get).calledWith(chainID).mockResolvedValue(false);

			// Assert
			await expect(command.execute(commandExecuteContext)).rejects.toThrow(
				'Terminated outbox account does not exist',
			);
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
				command['ccCommands'].set(ccm.module, ([
					{
						name: ccm.crossChainCommand,
						execute: jest.fn(),
					},
				] as unknown) as BaseCCCommand[]);
			}

			const ccmsWithSwappedChainIds = ccms.map(swapReceivingAndSendingChainIDs);

			// Act
			await command.execute(commandExecuteContext);

			// Assert
			expect.assertions(ccms.length);
			for (const ccm of ccmsWithSwappedChainIds) {
				const commands = command['ccCommands'].get(ccm.module) as BaseCCCommand[];
				const ccCommand = commands.find(cmd => cmd.name === ccm.crossChainCommand) as BaseCCCommand;
				expect(ccCommand.execute).toHaveBeenCalled();
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

		beforeEach(() => {
			command['interoperableCCMethods'].set(
				'token',
				new (class TokenMethod extends BaseCCMethod {
					public verifyCrossChainMessage = jest.fn();
					public beforeCrossChainCommandExecute = jest.fn();
					public afterCrossChainCommandExecute = jest.fn();
				})(interopModule.stores, interopModule.events),
			);
			command['ccCommands'].set('token', [
				new (class CrossChainTransfer extends BaseCCCommand {
					public verify = jest.fn();
					public execute = jest.fn();
				})(interopModule.stores, interopModule.events),
			]);
			jest.spyOn(command['events'].get(CcmProcessedEvent), 'log');
			jest.spyOn(command['events'].get(CcmSendSuccessEvent), 'log');
			context = createCrossChainMessageContext({
				ccm: defaultCCM,
			});
		});

		it('should log event when verifyCrossChainMessage fails', async () => {
			((command['interoperableCCMethods'].get('token') as BaseCCMethod)
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
			(((command['ccCommands'].get(defaultCCM.module) as BaseCCCommand[]).find(
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
			((command['interoperableCCMethods'].get('token') as BaseCCMethod)
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
			((command['interoperableCCMethods'].get('token') as BaseCCMethod)
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
			(((command['ccCommands'].get(defaultCCM.module) as BaseCCCommand[]).find(
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
				(command['interoperableCCMethods'].get('token') as BaseCCMethod)
					.afterCrossChainCommandExecute as jest.Mock,
			).toHaveBeenCalledTimes(1);
		});

		it('should log event when command afterCrossChainCommandExecute fails', async () => {
			((command['interoperableCCMethods'].get('token') as BaseCCMethod)
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
			((command['interoperableCCMethods'].get('token') as BaseCCMethod)
				.afterCrossChainCommandExecute as jest.Mock).mockRejectedValue('error');
			jest.spyOn(context.eventQueue, 'createSnapshot').mockReturnValue(99);
			jest.spyOn(context.stateStore, 'createSnapshot').mockReturnValue(10);
			jest.spyOn(context.eventQueue, 'restoreSnapshot');
			jest.spyOn(context.stateStore, 'restoreSnapshot');

			await expect(command['_applyRecovery'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.restoreSnapshot).toHaveBeenCalledWith(99);
			expect(context.stateStore.restoreSnapshot).toHaveBeenCalledWith(10);
		});

		it('should log success event when all the hooks pass', async () => {
			const ccMethod = command['interoperableCCMethods'].get('token');
			const ccCommand = command['ccCommands']
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

	describe('_forwardRecovery', () => {
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

		beforeEach(() => {
			command['interoperableCCMethods'].set(
				'token',
				new (class TokenMethod extends BaseCCMethod {
					public verifyCrossChainMessage = jest.fn();
					public beforeCrossChainMessageForwarding = jest.fn();
				})(interopModule.stores, interopModule.events),
			);
			command['ccCommands'].set('token', [
				new (class CrossChainTransfer extends BaseCCCommand {
					public schema = { $id: 'test/ccu', properties: {}, type: 'object' };
					public verify = jest.fn();
					public execute = jest.fn();
				})(interopModule.stores, interopModule.events),
			]);
			jest.spyOn(command['events'].get(CcmProcessedEvent), 'log');
			jest.spyOn(command['events'].get(CcmSendSuccessEvent), 'log');
			context = createCrossChainMessageContext({
				ccm: defaultCCM,
			});
		});

		it('should log event when verifyCrossChainMessage fails', async () => {
			((command['interoperableCCMethods'].get('token') as BaseCCMethod)
				.verifyCrossChainMessage as jest.Mock).mockRejectedValue('error');
			await expect(command['_forwardRecovery'](context)).resolves.toBeUndefined();

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

		it('should log event when command beforeCrossChainMessageForwarding fails', async () => {
			((command['interoperableCCMethods'].get('token') as BaseCCMethod)
				.beforeCrossChainMessageForwarding as jest.Mock).mockRejectedValue('error');

			await expect(command['_forwardRecovery'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm.sendingChainID,
				{
					ccmID: expect.any(Buffer),
					code: CCMProcessedCode.INVALID_CCM_BEFORE_CCC_FORWARDING_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should revert to the original state/event when command beforeCrossChainMessageForwarding fails', async () => {
			((command['interoperableCCMethods'].get('token') as BaseCCMethod)
				.beforeCrossChainMessageForwarding as jest.Mock).mockRejectedValue('error');
			jest.spyOn(context.eventQueue, 'createSnapshot').mockReturnValue(99);
			jest.spyOn(context.stateStore, 'createSnapshot').mockReturnValue(10);
			jest.spyOn(context.eventQueue, 'restoreSnapshot');
			jest.spyOn(context.stateStore, 'restoreSnapshot');

			await expect(command['_forwardRecovery'](context)).resolves.toBeUndefined();

			expect(context.eventQueue.restoreSnapshot).toHaveBeenCalledWith(99);
			expect(context.stateStore.restoreSnapshot).toHaveBeenCalledWith(10);
		});

		it('should add to outbox and log success', async () => {
			const ccMethod = command['interoperableCCMethods'].get('token');

			await expect(command['_forwardRecovery'](context)).resolves.toBeUndefined();

			expect(ccMethod?.verifyCrossChainMessage).toHaveBeenCalledTimes(1);
			expect(ccMethod?.beforeCrossChainMessageForwarding).toHaveBeenCalledTimes(1);

			expect(command['internalMethod'].addToOutbox).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.sendingChainID,
				expect.objectContaining({
					sendingChainID: context.ccm.receivingChainID,
					receivingChainID: context.ccm.sendingChainID,
					status: CCMStatusCode.RECOVERED,
				}),
			);
			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm.sendingChainID,
				{
					ccmID: expect.any(Buffer),
					code: CCMProcessedCode.SUCCESS,
					result: CCMProcessedResult.FORWARDED,
				},
			);
		});
	});
});
