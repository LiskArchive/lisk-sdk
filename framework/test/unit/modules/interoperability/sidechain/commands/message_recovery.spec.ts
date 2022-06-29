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
import { getRandomBytes, intToBuffer } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { when } from 'jest-when';
import { CCMsg, MessageRecoveryParams } from '../../../../../../src/modules/interoperability/types';
import { MessageRecoveryCommand } from '../../../../../../src/modules/interoperability/sidechain/commands/message_recovery';
import { CommandExecuteContext } from '../../../../../../src';
import { BaseInteroperableAPI } from '../../../../../../src/modules/interoperability/base_interoperable_api';
import { BaseCCCommand } from '../../../../../../src/modules/interoperability/base_cc_command';
import { TransactionContext } from '../../../../../../src/state_machine';
import {
	COMMAND_ID_MESSAGE_RECOVERY_BUFFER,
	MODULE_ID_INTEROPERABILITY_BUFFER,
} from '../../../../../../src/modules/interoperability/constants';
import {
	ccmSchema,
	messageRecoveryParamsSchema,
} from '../../../../../../src/modules/interoperability/schema';
import { createTransactionContext } from '../../../../../../src/testing';
import { swapReceivingAndSendingChainIDs } from '../../../../../../src/modules/interoperability/utils';
import { SidechainInteroperabilityStore } from '../../../../../../src/modules/interoperability/sidechain/store';
import { Mocked } from '../../../../../utils/types';

describe('Sidechain MessageRecoveryCommand', () => {
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
		SidechainInteroperabilityStore,
		| 'getOwnChainAccount'
		| 'getTerminatedOutboxAccount'
		| 'setTerminatedOutboxAccount'
		| 'terminatedOutboxAccountExist'
	>;

	const moduleID = intToBuffer(1, 4);

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
			getOwnChainAccount: jest.fn(),
			getTerminatedOutboxAccount: jest.fn(),
			setTerminatedOutboxAccount: jest.fn(),
			terminatedOutboxAccountExist: jest.fn().mockResolvedValue(true),
		};

		jest
			.spyOn(messageRecoveryCommand, 'getInteroperabilityStore' as any)
			.mockImplementation(() => storeMock);
		jest.spyOn(regularMerkleTree, 'calculateRootFromUpdateData').mockReturnValue(Buffer.alloc(32));

		for (const ccm of ccms) {
			const chainID = ccm.sendingChainID;

			when(storeMock.getOwnChainAccount)
				.calledWith()
				.mockResolvedValue({
					name: `chain${chainID.toString('hex')}`,
					id: ccm.sendingChainID,
					nonce: BigInt(0),
				});
		}

		// Set an example ccCommand for the message recovery command
		for (const ccm of ccms) {
			const previousCCCommands = ccCommands.get(ccm.moduleID.readInt32BE(0)) ?? [];
			ccCommands.set(ccm.moduleID.readInt32BE(0), ([
				...previousCCCommands,
				{
					moduleID: ccm.moduleID,
					ID: ccm.crossChainCommandID,
					name: 'ccCommand',
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

		when(storeMock.getTerminatedOutboxAccount)
			.calledWith(chainID)
			.mockResolvedValue({
				outboxRoot: getRandomBytes(32),
				outboxSize: 1,
				partnerChainInboxSize: 1,
			});
	});

	// The verify hook is already tested under ../../mainchain/commands/message_recovery.ts hence not added here to avoid duplication

	it('should process CCM successfully', async () => {
		// Arrange
		const ccmsWithSwappedChainIds = ccms.map(swapReceivingAndSendingChainIDs);

		// Act
		await messageRecoveryCommand.execute(commandExecuteContext);

		// Assert
		expect.assertions(ccmsWithSwappedChainIds.length);
		for (const ccm of ccmsWithSwappedChainIds) {
			const commands = ccCommands.get(ccm.moduleID.readInt32BE(0)) as BaseCCCommand[];
			const command = commands.find(cmd => cmd.ID.equals(ccm.crossChainCommandID)) as BaseCCCommand;
			expect(command.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					ccm,
				}),
			);
		}
	});

	it('should not trigger command execute for a sendingChainID different than ownChainAccountID', async () => {
		// Arrange & Assign
		const newCcm = {
			nonce: BigInt(2),
			moduleID: intToBuffer(moduleID.readInt32BE(0) + 1, 4),
			crossChainCommandID: intToBuffer(2, 4),
			sendingChainID: intToBuffer(3, 4),
			receivingChainID: intToBuffer(2, 4),
			fee: BigInt(1),
			status: 1,
			params: Buffer.alloc(0),
		};

		ccms.push(newCcm);

		const previousCCCommands = ccCommands.get(newCcm.moduleID.readInt32BE(0)) ?? [];
		ccCommands.set(newCcm.moduleID.readInt32BE(0), ([
			...previousCCCommands,
			{
				moduleID: newCcm.moduleID,
				ID: newCcm.crossChainCommandID,
				name: 'ccCommand',
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
			const commands = ccCommands.get(ccm.moduleID.readInt32BE(0)) as BaseCCCommand[];
			const command = commands.find(cmd => cmd.ID.equals(ccm.crossChainCommandID)) as BaseCCCommand;
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
		const { chainID } = transactionParams;

		when(storeMock.terminatedOutboxAccountExist).calledWith(chainID).mockResolvedValue(false);

		// Assert
		await expect(messageRecoveryCommand.execute(commandExecuteContext)).rejects.toThrow(
			'Terminated outbox account does not exist',
		);
	});

	it("should skip CCM's proccessing when ownchainID is not equal to CCM's sendingChainID", async () => {
		// Arrange & Assign
		for (const ccm of ccms) {
			const chainID = ccm.sendingChainID;

			when(storeMock.getOwnChainAccount)
				.calledWith()
				.mockResolvedValue({
					name: `chain${chainID.toString('hex')}`,
					id: intToBuffer(0, 4),
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
		ccCommands.set(moduleID.readInt32BE(0), ([
			{
				moduleID,
				ID: intToBuffer(3000, 4),
				name: 'ccCommand',
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
