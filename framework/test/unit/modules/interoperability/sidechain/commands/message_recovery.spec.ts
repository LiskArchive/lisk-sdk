import { Transaction } from '@liskhq/lisk-chain';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { when } from 'jest-when';
import { CCMsg, MessageRecoveryParams } from '../../../../../../src/modules/interoperability/types';
import { MessageRecoveryCommand } from '../../../../../../src/modules/interoperability/sidechain/commands/message_recovery';
import { CommandExecuteContext } from '../../../../../../src';
import { BaseInteroperableAPI } from '../../../../../../src/modules/interoperability/base_interoperable_api';
import { BaseCCCommand } from '../../../../../../src/modules/interoperability/base_cc_command';
import { TransactionContext } from '../../../../../../src/node/state_machine';
import {
	COMMAND_ID_MESSAGE_RECOVERY,
	MODULE_ID_INTEROPERABILITY,
} from '../../../../../../src/modules/interoperability/constants';
import {
	ccmSchema,
	messageRecoveryParams,
} from '../../../../../../src/modules/interoperability/schema';
import { createTransactionContext } from '../../../../../../src/testing';
import {
	getIDAsKeyForStore,
	swapChainIDs,
} from '../../../../../../src/modules/interoperability/utils';
import { SidechainInteroperabilityStore } from '../../../../../../src/modules/interoperability/sidechain/store';
import { Mocked } from '../../../../../utils/types';

describe('Sidechain MessageRecoveryCommand', () => {
	type StoreMock = Mocked<SidechainInteroperabilityStore, 'getOwnChainAccount'>;

	const moduleID = 1;

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
			MODULE_ID_INTEROPERABILITY,
			interoperableCCAPIs,
			ccCommands,
		);

		ccms = [
			{
				nonce: BigInt(0),
				moduleID,
				crossChainCommandID: 1,
				sendingChainID: 2,
				receivingChainID: 3,
				fee: BigInt(1),
				status: 1,
				params: Buffer.alloc(0),
			},
			{
				nonce: BigInt(0),
				moduleID: moduleID + 1,
				crossChainCommandID: 1,
				sendingChainID: 2,
				receivingChainID: 3,
				fee: BigInt(1),
				status: 1,
				params: Buffer.alloc(0),
			},
			{
				nonce: BigInt(0),
				moduleID: moduleID + 1,
				crossChainCommandID: 2,
				sendingChainID: 2,
				receivingChainID: 3,
				fee: BigInt(1),
				status: 1,
				params: Buffer.alloc(0),
			},
		];

		const ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));

		transactionParams = {
			chainID: 3,
			crossChainMessages: [...ccmsEncoded],
			idxs: [0],
			siblingHashes: [getRandomBytes(32)],
		};

		encodedTransactionParams = codec.encode(messageRecoveryParams, transactionParams);

		transaction = new Transaction({
			moduleID: MODULE_ID_INTEROPERABILITY,
			commandID: COMMAND_ID_MESSAGE_RECOVERY,
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
			messageRecoveryParams,
		);

		storeMock = {
			getOwnChainAccount: jest.fn(),
		};

		jest
			.spyOn(messageRecoveryCommand, 'getInteroperabilityStore' as any)
			.mockImplementation(() => storeMock);

		for (const ccm of ccms) {
			const chainID = getIDAsKeyForStore(ccm.sendingChainID);

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
			const previousCCCommands = ccCommands.get(ccm.moduleID) ?? [];
			ccCommands.set(ccm.moduleID, ([
				...previousCCCommands,
				{
					moduleID: ccm.moduleID,
					ID: ccm.crossChainCommandID,
					name: 'ccCommand',
					execute: jest.fn(),
					schema: {
						$id: 'id',
						type: 'object',
						properties: {},
					},
				},
			] as unknown) as BaseCCCommand[]);
		}
	});

	it('should process CCM successfully', async () => {
		// Arrange
		const ccmsWithSwappedChainIds = ccms.map(swapChainIDs);

		// Act
		await messageRecoveryCommand.execute(commandExecuteContext);

		// Assert
		expect.assertions(ccmsWithSwappedChainIds.length);
		for (const ccm of ccmsWithSwappedChainIds) {
			const commands = ccCommands.get(ccm.moduleID) as BaseCCCommand[];
			const command = commands.find(cmd => cmd.ID === ccm.crossChainCommandID) as BaseCCCommand;
			expect(command.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					ccm,
				}),
			);
		}
	});

	it("should skip CCM's proccessing when ownchainID is not equal to CCM's sendingChainID", async () => {
		// Arrange & Assign
		for (const ccm of ccms) {
			const chainID = getIDAsKeyForStore(ccm.sendingChainID);

			when(storeMock.getOwnChainAccount)
				.calledWith()
				.mockResolvedValue({
					name: `chain${chainID.toString('hex')}`,
					id: 0,
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
		ccCommands.set(moduleID, ([
			{
				moduleID,
				ID: 3000,
				name: 'ccCommand',
				execute: jest.fn(),
				schema: {
					$id: 'id',
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
