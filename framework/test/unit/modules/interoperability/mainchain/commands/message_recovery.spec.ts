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
import { codec } from '@liskhq/lisk-codec';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { when } from 'jest-when';
import { CommandExecuteContext } from '../../../../../../src';
import { BaseCCCommand } from '../../../../../../src/modules/interoperability/base_cc_command';
import { BaseInteroperableAPI } from '../../../../../../src/modules/interoperability/base_interoperable_api';
import {
	CHAIN_ACTIVE,
	COMMAND_ID_MESSAGE_RECOVERY,
	MODULE_ID_INTEROPERABILITY,
} from '../../../../../../src/modules/interoperability/constants';
import { MessageRecoveryCommand } from '../../../../../../src/modules/interoperability/mainchain/commands/message_recovery';
import { MainchainInteroperabilityStore } from '../../../../../../src/modules/interoperability/mainchain/store';
import {
	ccmSchema,
	messageRecoveryParams,
} from '../../../../../../src/modules/interoperability/schema';
import { CCMsg, MessageRecoveryParams } from '../../../../../../src/modules/interoperability/types';
import {
	getIDAsKeyForStore,
	swapReceivingAndSendingChainIDs,
} from '../../../../../../src/modules/interoperability/utils';
import { TransactionContext } from '../../../../../../src/node/state_machine';
import { createTransactionContext } from '../../../../../../src/testing';
import { Mocked } from '../../../../../utils/types';

describe('Mainchain MessageRecoveryCommand', () => {
	type StoreMock = Mocked<
		MainchainInteroperabilityStore,
		| 'isLive'
		| 'addToOutbox'
		| 'getChainAccount'
		| 'setTerminatedOutboxAccount'
		| 'getTerminatedOutboxAccount'
		| 'chainAccountExist'
		| 'terminatedOutboxAccountExist'
	>;

	const moduleID = 1;
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
				nonce: BigInt(1),
				moduleID: moduleID + 1,
				crossChainCommandID: 1,
				sendingChainID: 2,
				receivingChainID: 3,
				fee: BigInt(1),
				status: 1,
				params: Buffer.alloc(0),
			},
			{
				nonce: BigInt(2),
				moduleID: moduleID + 1,
				crossChainCommandID: 2,
				sendingChainID: 3,
				receivingChainID: 2,
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
			addToOutbox: jest.fn(),
			getChainAccount: jest.fn(),
			getTerminatedOutboxAccount: jest.fn(),
			setTerminatedOutboxAccount: jest.fn(),
			chainAccountExist: jest.fn().mockResolvedValue(true),
			isLive: jest.fn().mockResolvedValue(true),
			terminatedOutboxAccountExist: jest.fn().mockResolvedValue(true),
		};

		jest
			.spyOn(messageRecoveryCommand, 'getInteroperabilityStore' as any)
			.mockImplementation(() => storeMock);
		jest.spyOn(regularMerkleTree, 'calculateRootFromUpdateData').mockReturnValue(Buffer.alloc(32));

		let chainID;
		for (const ccm of ccms) {
			chainID = getIDAsKeyForStore(ccm.sendingChainID);

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

		chainID = getIDAsKeyForStore(transactionParams.chainID);

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
			const chainID = getIDAsKeyForStore(transactionParams.chainID);
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
			const chainID = getIDAsKeyForStore(ccm.sendingChainID);
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

		interoperableCCAPIs.set(moduleID, api);

		// Assert
		await expect(messageRecoveryCommand.execute(commandExecuteContext)).rejects.toThrow(
			'beforeRecoverCCM Error',
		);
	});

	it('should throw when terminated chain outbox does not exist', async () => {
		// Assign & Arrange
		const chainID = getIDAsKeyForStore(transactionParams.chainID);

		when(storeMock.terminatedOutboxAccountExist).calledWith(chainID).mockResolvedValue(false);

		// Assert
		await expect(messageRecoveryCommand.execute(commandExecuteContext)).rejects.toThrow(
			'Terminated outbox account does not exist',
		);
	});

	it('should not add CCM to outbox when sending chain of the CCM does not exist', async () => {
		// Assign & Arrange & Act
		for (const ccm of ccms) {
			const chainID = getIDAsKeyForStore(ccm.sendingChainID);

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
			const chainID = getIDAsKeyForStore(ccm.sendingChainID);

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
			const chainID = getIDAsKeyForStore(ccm.sendingChainID);

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
});
