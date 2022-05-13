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

import { Transaction, StateStore } from '@liskhq/lisk-chain';
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { getRandomBytes, hash } from '@liskhq/lisk-cryptography';
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { when } from 'jest-when';
import { BaseCCCommand } from '../../../../../../src/modules/interoperability/base_cc_command';
import { BaseInteroperableAPI } from '../../../../../../src/modules/interoperability/base_interoperable_api';
import {
	COMMAND_ID_MESSAGE_RECOVERY,
	MODULE_ID_INTEROPERABILITY,
	STORE_PREFIX_TERMINATED_OUTBOX,
} from '../../../../../../src/modules/interoperability/constants';
import { MessageRecoveryCommand } from '../../../../../../src/modules/interoperability/sidechain/commands/message_recovery';
import { SidechainInteroperabilityStore } from '../../../../../../src/modules/interoperability/sidechain/store';
import {
	ccmSchema,
	messageRecoveryParams,
	terminatedOutboxSchema,
} from '../../../../../../src/modules/interoperability/schema';
import { CCMsg, MessageRecoveryParams } from '../../../../../../src/modules/interoperability/types';
import { getIDAsKeyForStore } from '../../../../../../src/modules/interoperability/utils';
import { CommandVerifyContext, VerifyStatus } from '../../../../../../src/node/state_machine/types';
import { createTransactionContext } from '../../../../../../src/testing';

describe('Sidechain MessageRecoveryCommand', () => {
	let stateStore: StateStore;
	let sidechainInteroperabilityStore: SidechainInteroperabilityStore;
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

	beforeEach(async () => {
		interoperableCCAPIs = new Map();
		ccCommands = new Map();
		stateStore = new StateStore(new InMemoryKVStore());

		terminatedOutboxSubstore = stateStore.getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_TERMINATED_OUTBOX,
		);
		mockGetStore = jest.fn();
		when(mockGetStore)
			.calledWith(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_TERMINATED_OUTBOX)
			.mockReturnValue(terminatedOutboxSubstore);
		sidechainInteroperabilityStore = new SidechainInteroperabilityStore(
			MODULE_ID_INTEROPERABILITY,
			mockGetStore,
			new Map(),
		);
		messageRecoveryCommand = new MessageRecoveryCommand(
			MODULE_ID_INTEROPERABILITY,
			interoperableCCAPIs,
			ccCommands,
		);

		ccms = [
			{
				nonce: BigInt(0),
				moduleID: 1,
				crossChainCommandID: 1,
				sendingChainID: 2,
				receivingChainID: 3,
				fee: BigInt(1),
				status: 0,
				params: Buffer.alloc(0),
			},
		];
		const ccmsEncoded = ccms.map(ccm => codec.encode(ccmSchema, ccm));
		terminatedChainOutboxSize = 1;
		const proof = {
			size: terminatedChainOutboxSize,
			indexes: [1],
			siblingHashes: [getRandomBytes(32)],
		};
		const outboxRoot = getRandomBytes(32);
		transactionParams = {
			chainID: 3,
			crossChainMessages: [...ccmsEncoded],
			idxs: proof.indexes,
			siblingHashes: proof.siblingHashes,
		};
		chainID = getIDAsKeyForStore(transactionParams.chainID);
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
		commandVerifyContext = createTransactionContext({
			transaction,
		}).createCommandVerifyContext<MessageRecoveryParams>(messageRecoveryParams);

		jest
			.spyOn(messageRecoveryCommand, 'getInteroperabilityStore' as any)
			.mockImplementation(() => sidechainInteroperabilityStore);
		jest.spyOn(regularMerkleTree, 'calculateRootFromUpdateData').mockReturnValue(Buffer.alloc(32));

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
		commandVerifyContext = createTransactionContext({
			transaction,
		}).createCommandVerifyContext<MessageRecoveryParams>(messageRecoveryParams);

		const result = await messageRecoveryCommand.verify(commandVerifyContext);

		expect(result.status).toBe(VerifyStatus.FAIL);
		expect(result.error?.message).toInclude(`Cross chain messages are still pending`);
	});

	it('should return error if cross chain message that needs to be recovered is not valid', async () => {
		ccms = [
			{
				nonce: BigInt(0),
				moduleID: 1,
				crossChainCommandID: 1,
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
			idxs: [1],
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
		commandVerifyContext = createTransactionContext({
			transaction,
		}).createCommandVerifyContext<MessageRecoveryParams>(messageRecoveryParams);
		const proof = {
			size: terminatedChainOutboxSize,
			indexes: transactionParams.idxs,
			siblingHashes: transactionParams.siblingHashes,
		};
		const hashedCCMs = ccmsEncoded.map(ccm => hash(ccm));
		const outboxRoot = regularMerkleTree.calculateRootFromUpdateData(hashedCCMs, proof);

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

	// eslint-disable-next-line jest/no-disabled-tests
	it.skip('should return status OK for valid params', async () => {
		const result = await messageRecoveryCommand.verify(commandVerifyContext);

		expect(result.status).toBe(VerifyStatus.OK);
	});
});
