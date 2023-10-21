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

import { codec } from '@liskhq/lisk-codec';
import { Transaction } from '@liskhq/lisk-chain';
import { utils } from '@liskhq/lisk-cryptography';
import { MerkleTree } from '@liskhq/lisk-tree';
import { Proof } from '@liskhq/lisk-tree/dist-node/merkle_tree/types';
import {
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	CommandExecuteContext,
	MainchainInteroperabilityModule,
} from '../../../../../../src';
import { BaseCCCommand } from '../../../../../../src/modules/interoperability/base_cc_command';
import { BaseCCMethod } from '../../../../../../src/modules/interoperability/base_cc_method';
import {
	CCMStatusCode,
	COMMAND_NAME_MESSAGE_RECOVERY,
	CONTEXT_STORE_KEY_CCM_PROCESSING,
	CROSS_CHAIN_COMMAND_CHANNEL_TERMINATED,
	CROSS_CHAIN_COMMAND_REGISTRATION,
	EVENT_TOPIC_CCM_EXECUTION,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../../src/modules/interoperability/constants';
import { RecoverMessageCommand } from '../../../../../../src/modules/interoperability/mainchain/commands/recover_message';
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
import { getMainchainID } from '../../../../../../src/modules/interoperability/utils';
import { TerminatedOutboxStore } from '../../../../../../src/modules/interoperability/stores/terminated_outbox';
import { createStoreGetter } from '../../../../../../src/testing/utils';
import {
	CCMProcessedCode,
	CcmProcessedEvent,
	CCMProcessedResult,
} from '../../../../../../src/modules/interoperability/events/ccm_processed';
import { CcmSendSuccessEvent } from '../../../../../../src/modules/interoperability/events/ccm_send_success';
import { InvalidRMTVerification } from '../../../../../../src/modules/interoperability/events/invalid_rmt_verification';

describe('MessageRecoveryCommand', () => {
	const interopModule = new MainchainInteroperabilityModule();
	const leafPrefix = Buffer.from([0]);

	const appendPrecedingToIndices = (indices: number[], terminatedChainOutboxSize: number) =>
		indices.map(index => index + 2 ** (Math.ceil(Math.log2(terminatedChainOutboxSize)) + 1));

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
	const createCommandExecuteContext = (
		inputTx: Transaction,
		transactionParams: MessageRecoveryParams,
	) => {
		const transaction = new Transaction({
			...inputTx,
			params: codec.encode(messageRecoveryParamsSchema, transactionParams),
		});

		return createTransactionContext({
			transaction,
		}).createCommandExecuteContext<MessageRecoveryParams>(messageRecoveryParamsSchema);
	};

	let command: RecoverMessageCommand;
	let transaction: Transaction;
	let transactionParams: MessageRecoveryParams;
	let encodedTransactionParams: Buffer;
	let merkleTree: MerkleTree;
	let ccms: CCMsg[];
	let chainID: Buffer;
	let terminatedChainOutboxSize: number;
	let proof: Proof;
	let proofInput: any;
	let ccmsEncoded: Buffer[];
	let outboxRoot: Buffer;

	beforeEach(async () => {
		command = new RecoverMessageCommand(
			interopModule.stores,
			interopModule.events,
			new Map(),
			new Map(),
			{
				addToOutbox: jest.fn(),
				isLive: jest.fn().mockResolvedValue(true),
			} as never,
		);
		chainID = utils.intToBuffer(3, 4);
		ccms = [
			{
				nonce: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
				sendingChainID: getMainchainID(chainID),
				receivingChainID: chainID,
				fee: BigInt(0),
				status: CCMStatusCode.OK,
				params: Buffer.alloc(0),
			},
			{
				nonce: BigInt(1),
				module: MODULE_NAME_INTEROPERABILITY,
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
				sendingChainID: getMainchainID(chainID),
				receivingChainID: chainID,
				fee: BigInt(0),
				status: CCMStatusCode.OK,
				params: Buffer.alloc(0),
			},
			{
				nonce: BigInt(2),
				module: MODULE_NAME_INTEROPERABILITY,
				crossChainCommand: CROSS_CHAIN_COMMAND_CHANNEL_TERMINATED,
				sendingChainID: getMainchainID(chainID),
				receivingChainID: chainID,
				fee: BigInt(0),
				status: CCMStatusCode.OK,
				params: Buffer.alloc(0),
			},
		];
		ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));
		// Initialize a regular merkle tree with encoded ccms to mimic the outbox tree
		merkleTree = new MerkleTree();
		await merkleTree.init(ccmsEncoded);
		terminatedChainOutboxSize = merkleTree.size;
		outboxRoot = merkleTree.root;
		proofInput = [ccmsEncoded[0], ccmsEncoded[1]]
			.map(ccm => Buffer.concat([leafPrefix, ccm]))
			.map(prefixedCCM => utils.hash(prefixedCCM));
		proof = await merkleTree.generateProof(proofInput);
		transactionParams = {
			chainID,
			crossChainMessages: [ccmsEncoded[0], ccmsEncoded[1]],
			idxs: [...proof.idxs],
			siblingHashes: [...proof.siblingHashes],
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
	});

	describe('verify', () => {
		let commandVerifyContext: CommandVerifyContext<MessageRecoveryParams>;

		beforeEach(async () => {
			commandVerifyContext = createTransactionContext({
				transaction,
			}).createCommandVerifyContext<MessageRecoveryParams>(messageRecoveryParamsSchema);
			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandVerifyContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 0,
				});
		});

		it('should return error if terminated outbox account does not exist', async () => {
			await interopModule.stores
				.get(TerminatedOutboxStore)
				.del(createStoreGetter(commandVerifyContext.stateStore as any), chainID);
			const result = await command.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Terminated outbox account does not exist.`);
		});

		it('should return error if there are no ccms to recover', async () => {
			ccms = [];
			ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));
			transactionParams.crossChainMessages = [...ccmsEncoded];
			commandVerifyContext = createCommandVerifyContext(transaction, transactionParams);

			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandVerifyContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 0,
				});

			const result = await command.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude('No cross-chain messages to recover.');
		});

		it('should return error if inclusion proof indices and number of ccms do not have the same length', async () => {
			transactionParams.idxs = appendPrecedingToIndices([1, 2, 3, 4], terminatedChainOutboxSize);
			commandVerifyContext = createCommandVerifyContext(transaction, transactionParams);

			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandVerifyContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 0,
				});

			const result = await command.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Inclusion proof indices and cross-chain messages do not have the same length.',
			);
		});

		it('should return error if cross chain messages indexes are not strictly increasing', async () => {
			transactionParams.idxs = appendPrecedingToIndices([2, 1], terminatedChainOutboxSize);
			commandVerifyContext = createCommandVerifyContext(transaction, transactionParams);

			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandVerifyContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 0,
				});

			const result = await command.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				'Cross-chain message indexes are not strictly increasing.',
			);
		});

		it('should return error if idxs[0] === 0', async () => {
			transactionParams.idxs = [0];
			ccms = [ccms[0]];
			ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));
			transactionParams.crossChainMessages = [...ccmsEncoded];
			commandVerifyContext = createCommandVerifyContext(transaction, transactionParams);

			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandVerifyContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 0,
				});

			const result = await command.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Cross-chain message does not have a valid index.`);
		});

		it('should return error if idxs[0] <= 1', async () => {
			transactionParams.idxs = [1];
			ccms = [ccms[0]];
			ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));
			transactionParams.crossChainMessages = [...ccmsEncoded];
			commandVerifyContext = createCommandVerifyContext(transaction, transactionParams);

			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandVerifyContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 0,
				});

			const result = await command.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Cross-chain message does not have a valid index.`);
		});

		it('should return error if cross-chain message is not pending', async () => {
			transactionParams.idxs = appendPrecedingToIndices([0], terminatedChainOutboxSize);
			ccms = [ccms[0]];
			ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));
			transactionParams.crossChainMessages = [...ccmsEncoded];
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

		it('should return error if ccm indices exceed outbox size', async () => {
			ccms = [
				{
					nonce: BigInt(0),
					module: MODULE_NAME_INTEROPERABILITY,
					crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
					sendingChainID: utils.intToBuffer(2, 4),
					receivingChainID: utils.intToBuffer(3, 4),
					fee: BigInt(1),
					status: CCMStatusCode.FAILED_CCM,
					params: Buffer.alloc(0),
				},
			];
			ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));
			transactionParams.crossChainMessages = [...ccmsEncoded];
			// Choose the index such that the position of the ccm in the outbox tree is at terminatedChainOutboxSize,
			// i.e. just outside of the tree.
			transactionParams.idxs = appendPrecedingToIndices(
				[terminatedChainOutboxSize],
				terminatedChainOutboxSize,
			);

			commandVerifyContext = createCommandVerifyContext(transaction, transactionParams);

			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandVerifyContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 0,
				});

			const result = await command.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Cross-chain message was never in the outbox.`);
		});

		it('should return error if ccm.status !== CCMStatusCode.OK', async () => {
			ccms = [
				{
					nonce: BigInt(0),
					module: MODULE_NAME_INTEROPERABILITY,
					crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
					sendingChainID: utils.intToBuffer(2, 4),
					receivingChainID: utils.intToBuffer(3, 4),
					fee: BigInt(1),
					status: CCMStatusCode.FAILED_CCM,
					params: Buffer.alloc(0),
				},
			];
			ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));
			transactionParams.crossChainMessages = [...ccmsEncoded];
			transactionParams.idxs = appendPrecedingToIndices([1], terminatedChainOutboxSize);

			commandVerifyContext = createCommandVerifyContext(transaction, transactionParams);

			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandVerifyContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 0,
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
					crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
					sendingChainID: utils.intToBuffer(2, 4),
					receivingChainID: utils.intToBuffer(2, 4),
					fee: BigInt(1),
					status: CCMStatusCode.OK,
					params: Buffer.alloc(0),
				},
			];
			ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));
			transactionParams.crossChainMessages = [...ccmsEncoded];
			transactionParams.idxs = appendPrecedingToIndices([1], terminatedChainOutboxSize);

			commandVerifyContext = createCommandVerifyContext(transaction, transactionParams);

			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandVerifyContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 0,
				});

			const result = await command.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(
				`Cross-chain message receiving chain ID is not valid.`,
			);
		});

		it('should return error if cross-chain message sending chain is not live', async () => {
			command['internalMethod'].isLive = jest.fn().mockResolvedValue(false);
			ccms = [
				{
					nonce: BigInt(0),
					module: MODULE_NAME_INTEROPERABILITY,
					crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
					sendingChainID: utils.intToBuffer(2, 4),
					receivingChainID: utils.intToBuffer(3, 4),
					fee: BigInt(1),
					status: CCMStatusCode.OK,
					params: Buffer.alloc(0),
				},
			];
			ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));
			transactionParams.crossChainMessages = [...ccmsEncoded];
			transactionParams.idxs = appendPrecedingToIndices([1], terminatedChainOutboxSize);

			commandVerifyContext = createCommandVerifyContext(transaction, transactionParams);

			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandVerifyContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 0,
				});

			const result = await command.verify(commandVerifyContext);

			expect(result.status).toBe(VerifyStatus.FAIL);
			expect(result.error?.message).toInclude(`Cross-chain message sending chain is not live.`);
		});

		it('should return status OK for valid params', async () => {
			const result = await command.verify(commandVerifyContext);
			expect(result.status).toBe(VerifyStatus.OK);
		});
	});

	describe('Mainchain execute', () => {
		let commandExecuteContext: CommandExecuteContext<MessageRecoveryParams>;

		beforeEach(async () => {
			commandExecuteContext = createTransactionContext({
				transaction,
			}).createCommandExecuteContext<MessageRecoveryParams>(messageRecoveryParamsSchema);
			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandExecuteContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 0,
				});
			jest.spyOn(command, '_applyRecovery' as never);
			jest.spyOn(command, '_forwardRecovery' as never);
			jest.spyOn(interopModule.stores.get(TerminatedOutboxStore), 'set');
			jest.spyOn(commandExecuteContext['contextStore'], 'set');
			jest.spyOn(command['events'].get(InvalidRMTVerification), 'error');
		});

		it('should return error if message recovery proof of inclusion is not valid', async () => {
			ccms = [
				{
					nonce: BigInt(0),
					module: MODULE_NAME_INTEROPERABILITY,
					crossChainCommand: CROSS_CHAIN_COMMAND_REGISTRATION,
					sendingChainID: utils.intToBuffer(2, 4),
					receivingChainID: chainID,
					fee: BigInt(1),
					status: CCMStatusCode.OK,
					params: Buffer.alloc(0),
				},
			];
			ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));
			transactionParams.crossChainMessages = [...ccmsEncoded];
			transactionParams.idxs = appendPrecedingToIndices([1], terminatedChainOutboxSize);
			transactionParams.chainID = chainID;

			commandExecuteContext = createCommandExecuteContext(transaction, transactionParams);

			await interopModule.stores
				.get(TerminatedOutboxStore)
				.set(createStoreGetter(commandExecuteContext.stateStore as any), chainID, {
					outboxRoot,
					outboxSize: terminatedChainOutboxSize,
					partnerChainInboxSize: 0,
				});

			await expect(command.execute(commandExecuteContext)).rejects.toThrow(
				'Message recovery proof of inclusion is not valid.',
			);
			expect(command['events'].get(InvalidRMTVerification).error).toHaveBeenCalledWith(
				commandExecuteContext,
			);
		});

		it('should call applyRecovery when sending chain is mainchain', async () => {
			commandExecuteContext.chainID = getMainchainID(chainID);

			await expect(command.execute(commandExecuteContext)).resolves.toBeUndefined();

			for (const crossChainMessage of commandExecuteContext.params.crossChainMessages) {
				const ccm = codec.decode<CCMsg>(ccmSchema, crossChainMessage);
				const ctx: CrossChainMessageContext = {
					...commandExecuteContext,
					ccm,
					eventQueue: commandExecuteContext.eventQueue.getChildQueue(
						Buffer.concat([EVENT_TOPIC_CCM_EXECUTION, utils.hash(crossChainMessage)]),
					),
				};

				expect(command['_applyRecovery']).toHaveBeenCalledWith(ctx);
				expect(commandExecuteContext.contextStore.set).toHaveBeenNthCalledWith(
					1,
					CONTEXT_STORE_KEY_CCM_PROCESSING,
					true,
				);
				expect(commandExecuteContext.contextStore.set).toHaveBeenNthCalledWith(
					2,
					CONTEXT_STORE_KEY_CCM_PROCESSING,
					false,
				);
			}

			expect(interopModule.stores.get(TerminatedOutboxStore).set).toHaveBeenCalledTimes(1);
		});

		it('should call forwardRecovery when sending chain is not mainchain', async () => {
			await expect(command.execute(commandExecuteContext)).resolves.toBeUndefined();

			for (const crossChainMessage of commandExecuteContext.params.crossChainMessages) {
				const ccm = codec.decode<CCMsg>(ccmSchema, crossChainMessage);
				const ctx: CrossChainMessageContext = {
					...commandExecuteContext,
					ccm,
					eventQueue: commandExecuteContext.eventQueue.getChildQueue(
						Buffer.concat([EVENT_TOPIC_CCM_EXECUTION, utils.hash(crossChainMessage)]),
					),
				};

				expect(command['_forwardRecovery']).toHaveBeenCalledWith(ctx);
			}

			const terminatedOutboxStore = command['stores'].get(TerminatedOutboxStore);
			jest.spyOn(terminatedOutboxStore, 'set');

			expect(terminatedOutboxStore.set).toHaveBeenCalledTimes(1);
			expect(commandExecuteContext.contextStore.set).toHaveBeenNthCalledWith(
				1,
				CONTEXT_STORE_KEY_CCM_PROCESSING,
				true,
			);
			expect(commandExecuteContext.contextStore.set).toHaveBeenNthCalledWith(
				2,
				CONTEXT_STORE_KEY_CCM_PROCESSING,
				false,
			);
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
		let recoveredCCM: CCMsg;

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
			jest.spyOn(command, 'execute');
			context = createCrossChainMessageContext({
				ccm: defaultCCM,
			});
			recoveredCCM = {
				...defaultCCM,
				sendingChainID: defaultCCM.receivingChainID,
				receivingChainID: defaultCCM.sendingChainID,
				status: CCMStatusCode.RECOVERED,
			};
		});

		it('should log event when verifyCrossChainMessage fails', async () => {
			(
				(command['interoperableCCMethods'].get('token') as BaseCCMethod)
					.verifyCrossChainMessage as jest.Mock
			).mockRejectedValue('error');
			await expect(command['_applyRecovery'](context)).resolves.toEqual(recoveredCCM);

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm.sendingChainID,
				{
					ccm: recoveredCCM,
					code: CCMProcessedCode.INVALID_CCM_VERIFY_CCM_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
			expect(command.execute).toHaveBeenCalledTimes(0);
		});

		it('should log event if the module is not registered', async () => {
			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					module: 'nonExisting',
				},
			});

			await expect(command['_applyRecovery'](context)).resolves.toEqual({
				...context.ccm,
				receivingChainID: defaultCCM.sendingChainID,
				sendingChainID: defaultCCM.receivingChainID,
				status: CCMStatusCode.RECOVERED,
			});

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm.sendingChainID,
				{
					ccm: {
						...recoveredCCM,
						module: 'nonExisting',
					},
					code: CCMProcessedCode.MODULE_NOT_SUPPORTED,
					result: CCMProcessedResult.DISCARDED,
				},
			);
			expect(command.execute).toHaveBeenCalledTimes(0);
		});

		it('should log event if the command is not registered', async () => {
			context = createCrossChainMessageContext({
				ccm: {
					...defaultCCM,
					crossChainCommand: 'nonExisting',
				},
			});

			await expect(command['_applyRecovery'](context)).resolves.toEqual({
				...context.ccm,
				receivingChainID: defaultCCM.sendingChainID,
				sendingChainID: defaultCCM.receivingChainID,
				status: CCMStatusCode.RECOVERED,
			});

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm.sendingChainID,
				{
					ccm: {
						...recoveredCCM,
						crossChainCommand: 'nonExisting',
					},
					code: CCMProcessedCode.CROSS_CHAIN_COMMAND_NOT_SUPPORTED,
					result: CCMProcessedResult.DISCARDED,
				},
			);
			expect(command.execute).toHaveBeenCalledTimes(0);
		});

		it('should log event when command verify fails', async () => {
			(
				(
					(command['ccCommands'].get(defaultCCM.module) as BaseCCCommand[]).find(
						com => com.name === defaultCCM.crossChainCommand,
					) as BaseCCCommand
				).verify as jest.Mock
			).mockRejectedValue('error');

			await expect(command['_applyRecovery'](context)).resolves.toEqual(recoveredCCM);

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm.sendingChainID,
				{
					ccm: recoveredCCM,
					code: CCMProcessedCode.INVALID_CCM_VERIFY_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should log event when command beforeCrossChainCommandExecute fails', async () => {
			(
				(command['interoperableCCMethods'].get('token') as BaseCCMethod)
					.beforeCrossChainCommandExecute as jest.Mock
			).mockRejectedValue('error');

			await expect(command['_applyRecovery'](context)).resolves.toEqual(recoveredCCM);

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm.sendingChainID,
				{
					ccm: recoveredCCM,
					code: CCMProcessedCode.INVALID_CCM_BEFORE_CCC_EXECUTION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should revert to the original state/event when command beforeCrossChainCommandExecute fails', async () => {
			(
				(command['interoperableCCMethods'].get('token') as BaseCCMethod)
					.beforeCrossChainCommandExecute as jest.Mock
			).mockRejectedValue('error');
			jest.spyOn(context.eventQueue, 'createSnapshot').mockReturnValue(99);
			jest.spyOn(context.stateStore, 'createSnapshot').mockReturnValue(10);
			jest.spyOn(context.eventQueue, 'restoreSnapshot');
			jest.spyOn(context.stateStore, 'restoreSnapshot');

			await expect(command['_applyRecovery'](context)).resolves.toEqual(recoveredCCM);

			expect(context.eventQueue.restoreSnapshot).toHaveBeenCalledWith(99);
			expect(context.stateStore.restoreSnapshot).toHaveBeenCalledWith(10);
		});

		it('should log event and restore the state/event before calling execute when execute fails', async () => {
			(
				(
					(command['ccCommands'].get(defaultCCM.module) as BaseCCCommand[]).find(
						com => com.name === defaultCCM.crossChainCommand,
					) as BaseCCCommand
				).execute as jest.Mock
			).mockRejectedValue('error');
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

			await expect(command['_applyRecovery'](context)).resolves.toEqual(recoveredCCM);

			expect(context.eventQueue.restoreSnapshot).toHaveBeenCalledWith(2);
			expect(context.stateStore.restoreSnapshot).toHaveBeenCalledWith(2);
			expect(
				(command['interoperableCCMethods'].get('token') as BaseCCMethod)
					.afterCrossChainCommandExecute as jest.Mock,
			).toHaveBeenCalledTimes(1);
		});

		it('should log event when command afterCrossChainCommandExecute fails', async () => {
			(
				(command['interoperableCCMethods'].get('token') as BaseCCMethod)
					.afterCrossChainCommandExecute as jest.Mock
			).mockRejectedValue('error');

			await expect(command['_applyRecovery'](context)).resolves.toEqual(recoveredCCM);

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm.sendingChainID,
				{
					ccm: recoveredCCM,
					code: CCMProcessedCode.INVALID_CCM_AFTER_CCC_EXECUTION_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should restore the original state/event when command afterCrossChainCommandExecute fails', async () => {
			(
				(command['interoperableCCMethods'].get('token') as BaseCCMethod)
					.afterCrossChainCommandExecute as jest.Mock
			).mockRejectedValue('error');
			jest.spyOn(context.eventQueue, 'createSnapshot').mockReturnValue(99);
			jest.spyOn(context.stateStore, 'createSnapshot').mockReturnValue(10);
			jest.spyOn(context.eventQueue, 'restoreSnapshot');
			jest.spyOn(context.stateStore, 'restoreSnapshot');

			await expect(command['_applyRecovery'](context)).resolves.toEqual(recoveredCCM);

			expect(context.eventQueue.restoreSnapshot).toHaveBeenCalledWith(99);
			expect(context.stateStore.restoreSnapshot).toHaveBeenCalledWith(10);
		});

		it('should log success event when all the hooks pass', async () => {
			const ccMethod = command['interoperableCCMethods'].get('token');
			const ccCommand = command['ccCommands']
				.get(defaultCCM.module)
				?.find(com => com.name === defaultCCM.crossChainCommand);

			await expect(command['_applyRecovery'](context)).resolves.toEqual(recoveredCCM);

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
					ccm: recoveredCCM,
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
		let recoveredCCM: CCMsg;

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
			recoveredCCM = {
				...defaultCCM,
				sendingChainID: defaultCCM.receivingChainID,
				receivingChainID: defaultCCM.sendingChainID,
				status: CCMStatusCode.RECOVERED,
			};
		});

		it('should log event when verifyCrossChainMessage fails', async () => {
			(
				(command['interoperableCCMethods'].get('token') as BaseCCMethod)
					.verifyCrossChainMessage as jest.Mock
			).mockRejectedValue('error');
			recoveredCCM = {
				...defaultCCM,
				sendingChainID: defaultCCM.receivingChainID,
				receivingChainID: defaultCCM.sendingChainID,
				status: CCMStatusCode.RECOVERED,
			};
			await expect(command['_forwardRecovery'](context)).resolves.toEqual(recoveredCCM);

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				recoveredCCM.sendingChainID,
				recoveredCCM.receivingChainID,
				{
					ccm: recoveredCCM,
					code: CCMProcessedCode.INVALID_CCM_VERIFY_CCM_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should log event when command beforeCrossChainMessageForwarding fails', async () => {
			(
				(command['interoperableCCMethods'].get('token') as BaseCCMethod)
					.beforeCrossChainMessageForwarding as jest.Mock
			).mockRejectedValue('error');

			await expect(command['_forwardRecovery'](context)).resolves.toEqual(recoveredCCM);

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(command['events'].get(CcmProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				context.ccm.receivingChainID,
				context.ccm.sendingChainID,
				{
					ccm: recoveredCCM,
					code: CCMProcessedCode.INVALID_CCM_BEFORE_CCC_FORWARDING_EXCEPTION,
					result: CCMProcessedResult.DISCARDED,
				},
			);
		});

		it('should revert to the original state/event when command beforeCrossChainMessageForwarding fails', async () => {
			(
				(command['interoperableCCMethods'].get('token') as BaseCCMethod)
					.beforeCrossChainMessageForwarding as jest.Mock
			).mockRejectedValue('error');
			jest.spyOn(context.eventQueue, 'createSnapshot').mockReturnValue(99);
			jest.spyOn(context.stateStore, 'createSnapshot').mockReturnValue(10);
			jest.spyOn(context.eventQueue, 'restoreSnapshot');
			jest.spyOn(context.stateStore, 'restoreSnapshot');

			await expect(command['_forwardRecovery'](context)).resolves.toEqual(recoveredCCM);

			expect(context.eventQueue.restoreSnapshot).toHaveBeenCalledWith(99);
			expect(context.stateStore.restoreSnapshot).toHaveBeenCalledWith(10);
		});

		it('should add to outbox and log success', async () => {
			const ccMethod = command['interoperableCCMethods'].get('token');

			await expect(command['_forwardRecovery'](context)).resolves.toEqual(recoveredCCM);

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
					ccm: recoveredCCM,
					code: CCMProcessedCode.SUCCESS,
					result: CCMProcessedResult.FORWARDED,
				},
			);
		});
	});
});
