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
import { utils } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { when } from 'jest-when';
import { CCMsg, MessageRecoveryParams } from '../../../../../../src/modules/interoperability/types';
import { SidechainMessageRecoveryCommand } from '../../../../../../src/modules/interoperability/sidechain/commands/message_recovery';
import { CommandExecuteContext, SidechainInteroperabilityModule } from '../../../../../../src';
import { BaseInteroperableMethod } from '../../../../../../src/modules/interoperability/base_interoperable_method';
import { BaseCCCommand } from '../../../../../../src/modules/interoperability/base_cc_command';
import { TransactionContext } from '../../../../../../src/state_machine';
import {
	COMMAND_NAME_MESSAGE_RECOVERY,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	EMPTY_BYTES,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../../src/modules/interoperability/constants';
import {
	ccmSchema,
	messageRecoveryParamsSchema,
} from '../../../../../../src/modules/interoperability/schemas';
import { createTransactionContext } from '../../../../../../src/testing';
import { swapReceivingAndSendingChainIDs } from '../../../../../../src/modules/interoperability/utils';
import { OwnChainAccountStore } from '../../../../../../src/modules/interoperability/stores/own_chain_account';
import { TerminatedOutboxStore } from '../../../../../../src/modules/interoperability/stores/terminated_outbox';

describe('Sidechain MessageRecoveryCommand', () => {
	const interopMod = new SidechainInteroperabilityModule();
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

	let messageRecoveryCommand: SidechainMessageRecoveryCommand;
	let commandExecuteContext: CommandExecuteContext<MessageRecoveryParams>;
	let interoperableCCMethods: Map<string, BaseInteroperableMethod>;
	let ccCommands: Map<string, BaseCCCommand[]>;
	let transaction: Transaction;
	let transactionParams: MessageRecoveryParams;
	let encodedTransactionParams: Buffer;
	let transactionContext: TransactionContext;
	let ccms: CCMsg[];

	beforeEach(() => {
		interoperableCCMethods = new Map();
		ccCommands = new Map();

		messageRecoveryCommand = new SidechainMessageRecoveryCommand(
			interopMod.stores,
			interopMod.events,
			interoperableCCMethods,
			ccCommands,
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
				module: MODULE_NAME_INTEROPERABILITY,
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
				sendingChainID: utils.intToBuffer(2, 4),
				receivingChainID: utils.intToBuffer(3, 4),
				fee: BigInt(1),
				status: 1,
				params: Buffer.alloc(0),
			},
		];

		commandExecuteContext = createCommandExecuteContext(ccms);

		jest.spyOn(messageRecoveryCommand, 'getInteroperabilityInternalMethod' as any);
		jest.spyOn(regularMerkleTree, 'calculateRootFromUpdateData').mockReturnValue(Buffer.alloc(32));

		interopMod.stores.register(OwnChainAccountStore, ownChainAccountStoreMock as never);
		interopMod.stores.register(TerminatedOutboxStore, terminatedOutboxAccountMock as never);

		for (const ccm of ccms) {
			const chainID = ccm.sendingChainID;

			when(ownChainAccountStoreMock.get)
				.calledWith(expect.anything(), EMPTY_BYTES)
				.mockResolvedValue({
					name: `chain${chainID.toString('hex')}`,
					chainID: ccm.sendingChainID,
					nonce: BigInt(0),
				});
		}

		// Set an example ccCommand for the message recovery command
		for (const ccm of ccms) {
			const previousCCCommands = ccCommands.get(ccm.module) ?? [];
			ccCommands.set(ccm.module, ([
				...previousCCCommands,
				{
					module: ccm.module,
					name: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
					execute: jest.fn(),
					schema: {
						$id: '/id',
						type: 'object',
						properties: {},
					},
				},
			] as unknown) as BaseCCCommand[]);
		}

		const { chainID } = transactionParams;

		when(terminatedOutboxAccountMock.get)
			.calledWith(expect.anything(), chainID)
			.mockResolvedValue({
				outboxRoot: utils.getRandomBytes(32),
				outboxSize: 1,
				partnerChainInboxSize: 1,
			});

		terminatedOutboxAccountMock.has.mockResolvedValue(true);
	});

	// The verify hook is already tested under ../../mainchain/commands/message_recovery.ts hence not added here to avoid duplication

	// TODO: Fix in #7727
	// eslint-disable-next-line jest/no-disabled-tests
	it.skip('should process CCM successfully', async () => {
		// Arrange
		const ccmsWithSwappedChainIds = ccms.map(swapReceivingAndSendingChainIDs);

		// Act
		await messageRecoveryCommand.execute(commandExecuteContext);

		// Assert
		expect.assertions(ccmsWithSwappedChainIds.length);

		for (const ccm of ccmsWithSwappedChainIds) {
			const commands = ccCommands.get(ccm.module) as BaseCCCommand[];
			const command = commands.find(cmd => cmd.name === ccm.crossChainCommand) as BaseCCCommand;
			expect(command.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					ccm,
				}),
			);
		}
	});

	// TODO: Fix in #7727
	// eslint-disable-next-line jest/no-disabled-tests
	it.skip('should not trigger command execute for a sendingChainID different than ownChainAccountID', async () => {
		// Arrange & Assign
		const newCcm = {
			nonce: BigInt(2),
			module: 'token',
			crossChainCommand: 'crosschainTransfer',
			sendingChainID: utils.intToBuffer(3, 4),
			receivingChainID: utils.intToBuffer(2, 4),
			fee: BigInt(1),
			status: 1,
			params: Buffer.alloc(0),
		};

		ccms.push(newCcm);

		const previousCCCommands = ccCommands.get(newCcm.module) ?? [];
		ccCommands.set(newCcm.module, ([
			...previousCCCommands,
			{
				module: newCcm.module,
				name: 'crosschainTransfer',
				execute: jest.fn(),
				schema: {
					$id: '/id',
					type: 'object',
					properties: {},
				},
			},
		] as unknown) as BaseCCCommand[]);

		commandExecuteContext = createCommandExecuteContext(ccms);

		const ccmsWithSwappedChainIds = ccms.map(swapReceivingAndSendingChainIDs);

		// Act
		await messageRecoveryCommand.execute(commandExecuteContext);

		// Assert
		expect.assertions(ccmsWithSwappedChainIds.length);
		for (const ccm of ccmsWithSwappedChainIds) {
			const commands = ccCommands.get(ccm.module) as BaseCCCommand[];
			const command = commands.find(cmd => cmd.name === ccm.crossChainCommand) as BaseCCCommand;
			if (ccm.sendingChainID.equals(transactionParams.chainID)) {
				expect(command.execute).toHaveBeenCalledWith(
					expect.objectContaining({
						ccm,
					}),
				);
			} else {
				expect(command.execute).not.toHaveBeenCalled();
			}
		}
	});

	it('should throw when beforeRecoverCCM of ccMethods of the ccm fails', async () => {
		// Assign & Arrange
		const method = ({
			beforeRecoverCCM: jest.fn(() => {
				throw new Error('beforeRecoverCCM Error');
			}),
			name: MODULE_NAME_INTEROPERABILITY,
		} as unknown) as BaseInteroperableMethod;

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

	it("should skip CCM's proccessing when ownchainID is not equal to CCM's sendingChainID", async () => {
		// Arrange & Assign
		for (const ccm of ccms) {
			const chainID = ccm.sendingChainID;

			when(ownChainAccountStoreMock.get)
				.calledWith(expect.anything(), EMPTY_BYTES)
				.mockResolvedValue({
					name: `chain${chainID.toString('hex')}`,
					chainID: utils.intToBuffer(0, 4),
					nonce: BigInt(0),
				});
		}

		const amountOfCommands = [...ccCommands.values()]
			.map(commands => commands.length)
			.reduce((acc, cur) => acc + cur);

		// Act
		await messageRecoveryCommand.execute(commandExecuteContext);

		// Assert
		expect.assertions(amountOfCommands);
		// Be sure no commands that BaseCommand has is called
		for (const [, commands] of ccCommands) {
			for (const command of commands) {
				expect(command.execute).not.toHaveBeenCalled();
			}
		}
	});

	it("should skip CCM's proccessing when there are no ccCommands to execute", async () => {
		// Arrange & Assign
		ccCommands = new Map();
		BaseCCCommand.prototype.execute = jest.fn();

		// Act
		await messageRecoveryCommand.execute(commandExecuteContext);

		// Assert
		expect(BaseCCCommand.prototype.execute).not.toHaveBeenCalled();
	});

	it("should skip CCM's proccessing when there is no crossChainCommand associated with a module to execute", async () => {
		// Arrange & Assign
		ccCommands.set(MODULE_NAME_INTEROPERABILITY, ([
			{
				name: 'ccCommand2',
				execute: jest.fn(),
				schema: {
					$id: '/id',
					type: 'object',
					properties: {},
				},
			},
		] as unknown) as BaseCCCommand[]);
		BaseCCCommand.prototype.execute = jest.fn();

		// Act
		await messageRecoveryCommand.execute(commandExecuteContext);

		// Assert
		expect(BaseCCCommand.prototype.execute).not.toHaveBeenCalled();
	});
});
