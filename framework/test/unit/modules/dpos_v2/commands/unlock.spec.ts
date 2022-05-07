/*
 * Copyright © 2021 Lisk Foundation
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

import { BlockHeader, StateStore, Transaction } from '@liskhq/lisk-chain';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore, KVStore } from '@liskhq/lisk-db';
import * as testing from '../../../../../src/testing';
import { UnlockCommand } from '../../../../../src/modules/dpos_v2/commands/unlock';
import {
	EMPTY_KEY,
	SELF_VOTE_PUNISH_TIME,
	VOTER_PUNISH_TIME,
	WAIT_TIME_SELF_VOTE,
	WAIT_TIME_VOTE,
	MODULE_ID_DPOS,
	STORE_PREFIX_DELEGATE,
	STORE_PREFIX_GENESIS_DATA,
	STORE_PREFIX_VOTER,
	COMMAND_ID_UNLOCK,
} from '../../../../../src/modules/dpos_v2/constants';
import {
	delegateStoreSchema,
	genesisDataStoreSchema,
	voterStoreSchema,
} from '../../../../../src/modules/dpos_v2/schemas';
import {
	BFTAPI,
	TokenAPI,
	UnlockingObject,
	VoterData,
} from '../../../../../src/modules/dpos_v2/types';
import { CommandExecuteContext } from '../../../../../src/node/state_machine/types';
import { liskToBeddows } from '../../../../utils/assets';

describe('UnlockCommand', () => {
	let unlockCommand: UnlockCommand;
	let db: KVStore;
	let stateStore: StateStore;
	let delegateSubstore: StateStore;
	let voterSubstore: StateStore;
	let genesisSubstore: StateStore;
	let mockTokenAPI: TokenAPI;
	let mockBFTAPI: BFTAPI;
	let blockHeight: number;
	let header: BlockHeader;
	let unlockableObject: UnlockingObject;
	let unlockableObject2: UnlockingObject;
	let unlockableObject3: UnlockingObject;
	let nonUnlockableObject: UnlockingObject;
	let context: CommandExecuteContext;
	let storedData: VoterData;
	const delegate1 = { name: 'delegate1', address: getRandomBytes(32), amount: liskToBeddows(100) };
	const delegate2 = { name: 'delegate2', address: getRandomBytes(32), amount: liskToBeddows(200) };
	const delegate3 = { name: 'delegate3', address: getRandomBytes(32), amount: liskToBeddows(300) };
	const delegate4 = { name: 'delegate4', address: getRandomBytes(32), amount: liskToBeddows(400) };
	const defaultDelegateInfo = {
		totalVotesReceived: BigInt(100000000),
		selfVotes: BigInt(0),
		lastGeneratedHeight: 0,
		isBanned: false,
		pomHeights: [],
		consecutiveMissedBlocks: 0,
	};
	const publicKey = getRandomBytes(32);
	const transaction = new Transaction({
		moduleID: MODULE_ID_DPOS,
		commandID: COMMAND_ID_UNLOCK,
		senderPublicKey: publicKey,
		nonce: BigInt(0),
		fee: BigInt(100000000),
		params: Buffer.alloc(0),
		signatures: [publicKey],
	});
	const networkIdentifier = Buffer.from(
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
		'hex',
	);

	beforeEach(() => {
		unlockCommand = new UnlockCommand(MODULE_ID_DPOS);
		mockTokenAPI = {
			unlock: jest.fn(),
			lock: jest.fn(),
			getAvailableBalance: jest.fn(),
			transfer: jest.fn(),
			getLockedAmount: jest.fn(),
		};
		mockBFTAPI = {
			setBFTParameters: jest.fn(),
			getBFTParameters: jest.fn(),
			areHeadersContradicting: jest.fn(),
			getBFTHeights: jest.fn().mockResolvedValue({ maxHeightCertified: 8760000 }),
		};
		unlockCommand.addDependencies({
			tokenAPI: mockTokenAPI,
			bftAPI: mockBFTAPI,
		});
		db = new InMemoryKVStore() as never;
		stateStore = new StateStore(db);
		delegateSubstore = stateStore.getStore(MODULE_ID_DPOS, STORE_PREFIX_DELEGATE);
		voterSubstore = stateStore.getStore(MODULE_ID_DPOS, STORE_PREFIX_VOTER);
		genesisSubstore = stateStore.getStore(MODULE_ID_DPOS, STORE_PREFIX_GENESIS_DATA);
		blockHeight = 8760000;
		header = testing.createFakeBlockHeader({ height: blockHeight });
	});

	describe(`when non self-voted non-punished account waits ${WAIT_TIME_VOTE} blocks since unvoteHeight`, () => {
		beforeEach(async () => {
			await genesisSubstore.setWithSchema(
				EMPTY_KEY,
				{
					height: 8760000,
					initRounds: 1,
					initDelegates: [],
				},
				genesisDataStoreSchema,
			);
			await delegateSubstore.setWithSchema(
				delegate1.address,
				{
					name: delegate1.name,
					...defaultDelegateInfo,
				},
				delegateStoreSchema,
			);
			await delegateSubstore.setWithSchema(
				delegate2.address,
				{
					name: delegate2.name,
					...defaultDelegateInfo,
				},
				delegateStoreSchema,
			);

			unlockableObject = {
				delegateAddress: delegate1.address,
				amount: delegate1.amount,
				unvoteHeight: blockHeight - WAIT_TIME_VOTE,
			};
			nonUnlockableObject = {
				delegateAddress: delegate2.address,
				amount: delegate2.amount,
				unvoteHeight: blockHeight,
			};
			await voterSubstore.setWithSchema(
				transaction.senderAddress,
				{
					sentVotes: [
						{ delegateAddress: unlockableObject.delegateAddress, amount: unlockableObject.amount },
					],
					pendingUnlocks: [unlockableObject, nonUnlockableObject],
				},
				voterStoreSchema,
			);
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					networkIdentifier,
				})
				.createCommandExecuteContext();
			await unlockCommand.execute(context);
			storedData = await voterSubstore.getWithSchema<VoterData>(
				transaction.senderAddress,
				voterStoreSchema,
			);
		});

		it('should remove eligible pending unlock from voter substore', () => {
			expect(storedData.pendingUnlocks).not.toContainEqual(unlockableObject);
		});

		it('should not remove ineligible pending unlock from voter substore', () => {
			expect(storedData.pendingUnlocks).toContainEqual(nonUnlockableObject);
		});
	});

	describe(`when self-voted non-punished account waits ${WAIT_TIME_SELF_VOTE} blocks since unvoteHeight`, () => {
		beforeEach(async () => {
			await genesisSubstore.setWithSchema(
				EMPTY_KEY,
				{
					height: 8760000,
					initRounds: 1,
					initDelegates: [],
				},
				genesisDataStoreSchema,
			);
			await delegateSubstore.setWithSchema(
				transaction.senderAddress,
				{
					...defaultDelegateInfo,
					name: 'nonpunishedselfvoter',
				},
				delegateStoreSchema,
			);
			unlockableObject = {
				delegateAddress: transaction.senderAddress,
				amount: delegate1.amount,
				unvoteHeight: blockHeight - WAIT_TIME_SELF_VOTE,
			};
			nonUnlockableObject = {
				delegateAddress: transaction.senderAddress,
				amount: delegate2.amount,
				unvoteHeight: blockHeight,
			};
			await voterSubstore.setWithSchema(
				transaction.senderAddress,
				{
					sentVotes: [
						{ delegateAddress: unlockableObject.delegateAddress, amount: delegate1.amount },
						{ delegateAddress: nonUnlockableObject.delegateAddress, amount: delegate2.amount },
					],
					pendingUnlocks: [unlockableObject, nonUnlockableObject],
				},
				voterStoreSchema,
			);
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					networkIdentifier,
				})
				.createCommandExecuteContext();
			await unlockCommand.execute(context);
			storedData = await voterSubstore.getWithSchema<VoterData>(
				transaction.senderAddress,
				voterStoreSchema,
			);
		});

		it('should remove eligible pending unlock from voter substore', () => {
			expect(storedData.pendingUnlocks).not.toContainEqual(unlockableObject);
		});

		it('should not remove ineligible pending unlock from voter substore', () => {
			expect(storedData.pendingUnlocks).toContainEqual(nonUnlockableObject);
		});
	});

	describe(`when non self-voted punished account waits ${VOTER_PUNISH_TIME} blocks and unvoteHeight + ${WAIT_TIME_VOTE} blocks since last pomHeight`, () => {
		beforeEach(async () => {
			await genesisSubstore.setWithSchema(
				EMPTY_KEY,
				{
					height: 8760000,
					initRounds: 1,
					initDelegates: [],
				},
				genesisDataStoreSchema,
			);
			await delegateSubstore.setWithSchema(
				delegate1.address,
				{
					...defaultDelegateInfo,
					name: 'punishedvoter1',
					pomHeights: [blockHeight - VOTER_PUNISH_TIME],
				},
				delegateStoreSchema,
			);
			// This covers scenario: has not waited pomHeight + 260,000 blocks but waited unvoteHeight + 2000 blocks and pomHeight is more than unvoteHeight + 2000 blocks
			await delegateSubstore.setWithSchema(
				delegate2.address,
				{
					...defaultDelegateInfo,
					name: 'punishedvoter2',
					pomHeights: [blockHeight],
				},
				delegateStoreSchema,
			);
			// This covers scenario: has not waited pomHeight + 260,000 blocks but waited unvoteHeight + 2000 blocks and pomHeight is equal to unvoteHeight + 2000 blocks
			await delegateSubstore.setWithSchema(
				delegate3.address,
				{
					...defaultDelegateInfo,
					name: 'punishedvoter3',
					pomHeights: [blockHeight - 1000],
				},
				delegateStoreSchema,
			);
			await delegateSubstore.setWithSchema(
				delegate4.address,
				{
					...defaultDelegateInfo,
					name: 'punishedvoter4',
					pomHeights: [blockHeight - VOTER_PUNISH_TIME],
				},
				delegateStoreSchema,
			);
			unlockableObject = {
				delegateAddress: delegate1.address,
				amount: delegate1.amount,
				unvoteHeight: blockHeight - WAIT_TIME_VOTE,
			};
			unlockableObject2 = {
				delegateAddress: delegate2.address,
				amount: delegate2.amount,
				unvoteHeight: blockHeight - WAIT_TIME_VOTE - 1000,
			};
			unlockableObject3 = {
				delegateAddress: delegate3.address,
				amount: delegate3.amount,
				unvoteHeight: blockHeight - WAIT_TIME_VOTE - 1000,
			};
			nonUnlockableObject = {
				delegateAddress: delegate4.address,
				amount: delegate4.amount,
				unvoteHeight: blockHeight,
			};
			await voterSubstore.setWithSchema(
				transaction.senderAddress,
				{
					sentVotes: [
						{ delegateAddress: unlockableObject.delegateAddress, amount: unlockableObject.amount },
						{
							delegateAddress: unlockableObject2.delegateAddress,
							amount: unlockableObject2.amount,
						},
						{
							delegateAddress: unlockableObject3.delegateAddress,
							amount: unlockableObject3.amount,
						},
						{
							delegateAddress: nonUnlockableObject.delegateAddress,
							amount: nonUnlockableObject.amount,
						},
					],
					pendingUnlocks: [
						unlockableObject,
						unlockableObject2,
						unlockableObject3,
						nonUnlockableObject,
					],
				},
				voterStoreSchema,
			);
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					networkIdentifier,
				})
				.createCommandExecuteContext();
			await unlockCommand.execute(context);
			storedData = await voterSubstore.getWithSchema<VoterData>(
				transaction.senderAddress,
				voterStoreSchema,
			);
		});

		it('should remove eligible pending unlock from voter substore', () => {
			expect(storedData.pendingUnlocks).not.toContainEqual(unlockableObject);
			expect(storedData.pendingUnlocks).not.toContainEqual(unlockableObject2);
			expect(storedData.pendingUnlocks).not.toContainEqual(unlockableObject3);
		});

		it('should not remove ineligible pending unlock from voter substore', () => {
			expect(storedData.pendingUnlocks).toContainEqual(nonUnlockableObject);
		});
	});

	describe(`when self-voted punished account waits ${SELF_VOTE_PUNISH_TIME} blocks and waits unvoteHeight + ${WAIT_TIME_SELF_VOTE} blocks since pomHeight`, () => {
		beforeEach(async () => {
			await genesisSubstore.setWithSchema(
				EMPTY_KEY,
				{
					height: 8760000,
					initRounds: 1,
					initDelegates: [],
				},
				genesisDataStoreSchema,
			);
			await delegateSubstore.setWithSchema(
				transaction.senderAddress,
				{
					...defaultDelegateInfo,
					name: 'punishedselfvoter',
					pomHeights: [blockHeight - SELF_VOTE_PUNISH_TIME],
				},
				delegateStoreSchema,
			);
			unlockableObject = {
				delegateAddress: transaction.senderAddress,
				amount: delegate1.amount,
				unvoteHeight: blockHeight - WAIT_TIME_SELF_VOTE,
			};
			nonUnlockableObject = {
				delegateAddress: transaction.senderAddress,
				amount: delegate2.amount,
				unvoteHeight: blockHeight,
			};
			await voterSubstore.setWithSchema(
				transaction.senderAddress,
				{
					sentVotes: [
						{ delegateAddress: unlockableObject.delegateAddress, amount: unlockableObject.amount },
						{
							delegateAddress: nonUnlockableObject.delegateAddress,
							amount: nonUnlockableObject.amount,
						},
					],
					pendingUnlocks: [unlockableObject, nonUnlockableObject],
				},
				voterStoreSchema,
			);
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					networkIdentifier,
				})
				.createCommandExecuteContext();
			await unlockCommand.execute(context);
			storedData = await voterSubstore.getWithSchema<VoterData>(
				transaction.senderAddress,
				voterStoreSchema,
			);
		});

		it('should remove eligible pending unlock from voter substore', () => {
			expect(storedData.pendingUnlocks).not.toContainEqual(unlockableObject);
		});

		it('should not remove ineligible pending unlock from voter substore', () => {
			expect(storedData.pendingUnlocks).toContainEqual(nonUnlockableObject);
		});
	});

	describe(`when self-voted punished account does not wait ${SELF_VOTE_PUNISH_TIME} blocks and waits unvoteHeight + ${WAIT_TIME_SELF_VOTE} blocks since pomHeight`, () => {
		beforeEach(async () => {
			await genesisSubstore.setWithSchema(
				EMPTY_KEY,
				{
					height: 8760000,
					initRounds: 1,
					initDelegates: [],
				},
				genesisDataStoreSchema,
			);
			await delegateSubstore.setWithSchema(
				transaction.senderAddress,
				{
					...defaultDelegateInfo,
					name: 'punishedselfvoter',
					pomHeights: [blockHeight - 1],
				},
				delegateStoreSchema,
			);
			nonUnlockableObject = {
				delegateAddress: transaction.senderAddress,
				amount: delegate1.amount,
				unvoteHeight: blockHeight - WAIT_TIME_SELF_VOTE,
			};
			await voterSubstore.setWithSchema(
				transaction.senderAddress,
				{
					sentVotes: [
						{
							delegateAddress: nonUnlockableObject.delegateAddress,
							amount: nonUnlockableObject.amount,
						},
					],
					pendingUnlocks: [nonUnlockableObject],
				},
				voterStoreSchema,
			);
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					networkIdentifier,
				})
				.createCommandExecuteContext();
		});

		it('should throw error', async () => {
			await expect(unlockCommand.execute(context)).rejects.toThrow(
				'No eligible voter data was found for unlocking',
			);
		});
	});

	describe(`when certificate is not generated`, () => {
		beforeEach(async () => {
			await genesisSubstore.setWithSchema(
				EMPTY_KEY,
				{
					height: 10,
					initRounds: 1,
					initDelegates: [],
				},
				genesisDataStoreSchema,
			);
			await delegateSubstore.setWithSchema(
				delegate1.address,
				{
					name: delegate1.name,
					...defaultDelegateInfo,
				},
				delegateStoreSchema,
			);
			await delegateSubstore.setWithSchema(
				delegate2.address,
				{
					name: delegate2.name,
					...defaultDelegateInfo,
				},
				delegateStoreSchema,
			);
			nonUnlockableObject = {
				delegateAddress: delegate2.address,
				amount: delegate2.amount,
				unvoteHeight: blockHeight,
			};
			await voterSubstore.setWithSchema(
				transaction.senderAddress,
				{
					sentVotes: [
						{ delegateAddress: unlockableObject.delegateAddress, amount: unlockableObject.amount },
					],
					pendingUnlocks: [nonUnlockableObject],
				},
				voterStoreSchema,
			);
		});

		it('should not unlock any votes', async () => {
			// Arrange
			mockBFTAPI.getBFTHeights = jest.fn().mockResolvedValue({ maxHeightCertified: 0 });
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					networkIdentifier,
				})
				.createCommandExecuteContext();

			await expect(unlockCommand.execute(context)).rejects.toThrow(
				'No eligible voter data was found for unlocking',
			);
		});
	});

	describe(`when certificate is generated`, () => {
		beforeEach(async () => {
			await genesisSubstore.setWithSchema(
				EMPTY_KEY,
				{
					height: 8760000,
					initRounds: 1,
					initDelegates: [],
				},
				genesisDataStoreSchema,
			);
			await delegateSubstore.setWithSchema(
				delegate1.address,
				{
					name: delegate1.name,
					...defaultDelegateInfo,
				},
				delegateStoreSchema,
			);
			await delegateSubstore.setWithSchema(
				delegate2.address,
				{
					name: delegate2.name,
					...defaultDelegateInfo,
				},
				delegateStoreSchema,
			);

			unlockableObject = {
				delegateAddress: delegate1.address,
				amount: delegate1.amount,
				unvoteHeight: blockHeight - WAIT_TIME_VOTE,
			};
			nonUnlockableObject = {
				delegateAddress: delegate2.address,
				amount: delegate2.amount,
				unvoteHeight: blockHeight,
			};
			await voterSubstore.setWithSchema(
				transaction.senderAddress,
				{
					sentVotes: [
						{ delegateAddress: unlockableObject.delegateAddress, amount: unlockableObject.amount },
					],
					pendingUnlocks: [unlockableObject, nonUnlockableObject],
				},
				voterStoreSchema,
			);
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					networkIdentifier,
				})
				.createCommandExecuteContext();
			await unlockCommand.execute(context);
			storedData = await voterSubstore.getWithSchema<VoterData>(
				transaction.senderAddress,
				voterStoreSchema,
			);
		});

		it('should remove eligible pending unlock from voter substore', () => {
			expect(storedData.pendingUnlocks).not.toContainEqual(unlockableObject);
		});

		it('should not remove ineligible pending unlock from voter substore', () => {
			expect(storedData.pendingUnlocks).toContainEqual(nonUnlockableObject);
		});
	});
});
