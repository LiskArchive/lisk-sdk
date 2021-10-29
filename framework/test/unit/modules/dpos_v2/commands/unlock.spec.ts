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
import { codec } from '@liskhq/lisk-codec';
import { hash, getRandomBytes } from '@liskhq/lisk-cryptography';
import { InMemoryKVStore, KVStore } from '@liskhq/lisk-db';
import * as testing from '../../../../../src/testing';
import { UnlockCommand } from '../../../../../src/modules/dpos_v2/commands/unlock';
import {
	MODULE_ID_DPOS,
	STORE_PREFIX_DELEGATE,
	STORE_PREFIX_VOTER,
	COMMAND_ID_UNLOCK,
} from '../../../../../src/modules/dpos_v2/constants';
import { delegateStoreSchema, voterStoreSchema } from '../../../../../src/modules/dpos_v2/schemas';
import { TokenAPI, UnlockingObject, VoterData } from '../../../../../src/modules/dpos_v2/types';
import { CommandExecuteContext } from '../../../../../src/node/state_machine/types';
import { liskToBeddows } from '../../../../utils/assets';

// TODO: Also add 2 test cases from PR:
// https://github.com/LiskHQ/lisk-sdk/pull/6807/files

describe('UnlockCommand', () => {
	let unlockCommand: UnlockCommand;
	let db: KVStore;
	let stateStore: StateStore;
	let delegateSubstore: StateStore;
	let voterSubstore: StateStore;
	let mockTokenAPI: TokenAPI;
	let lastBlockHeight: number;
	let header: BlockHeader;
	let unlockObj1: UnlockingObject;
	let unlockObj2: UnlockingObject;
	let unlockObj3: UnlockingObject;
	let context: CommandExecuteContext<Record<string, unknown>>;

	const delegate1 = { name: 'delegate1', address: getRandomBytes(32), amount: liskToBeddows(100) };
	const delegate2 = { name: 'delegate2', address: getRandomBytes(32), amount: liskToBeddows(120) };
	const delegate3 = { name: 'delegate3', address: getRandomBytes(32), amount: liskToBeddows(80) };
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

	beforeEach(async () => {
		unlockCommand = new UnlockCommand(MODULE_ID_DPOS);
		mockTokenAPI = {
			unlock: jest.fn(),
			lock: jest.fn(),
		};
		unlockCommand.addDependencies({
			tokenIDDPoS: { chainID: 0, localID: 0 },
			tokenAPI: mockTokenAPI,
		});
		db = new InMemoryKVStore() as never;
		stateStore = new StateStore(db);
		delegateSubstore = stateStore.getStore(MODULE_ID_DPOS, STORE_PREFIX_DELEGATE);
		voterSubstore = stateStore.getStore(MODULE_ID_DPOS, STORE_PREFIX_VOTER);
		lastBlockHeight = 8760000;
		header = new BlockHeader({
			height: lastBlockHeight,
			generatorAddress: getRandomBytes(20),
			previousBlockID: Buffer.alloc(0),
			timestamp: Math.floor(Date.now() / 1000),
			version: 0,
			transactionRoot: hash(Buffer.alloc(0)),
			stateRoot: hash(Buffer.alloc(0)),
			maxHeightGenerated: 0,
			maxHeightPrevoted: 0,
			assetsRoot: hash(Buffer.alloc(0)),
			aggregateCommit: {
				height: 0,
				aggregationBits: Buffer.alloc(0),
				certificateSignature: Buffer.alloc(0),
			},
			validatorsHash: hash(Buffer.alloc(0)),
		});
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
		await delegateSubstore.setWithSchema(
			delegate3.address,
			{
				name: delegate3.name,
				...defaultDelegateInfo,
			},
			delegateStoreSchema,
		);
	});

	describe('when non self-voted non punished account waits 2000 blocks', () => {
		beforeEach(async () => {
			unlockObj1 = {
				delegateAddress: delegate1.address,
				amount: delegate1.amount,
				unvoteHeight: lastBlockHeight - 2001,
			};
			unlockObj2 = {
				delegateAddress: delegate2.address,
				amount: delegate2.amount,
				unvoteHeight: lastBlockHeight - 2000,
			};
			unlockObj3 = {
				delegateAddress: delegate3.address,
				amount: delegate3.amount,
				unvoteHeight: lastBlockHeight - 1000,
			};
			await voterSubstore.setWithSchema(
				transaction.senderAddress,
				{
					sentVotes: [
						{ delegateAddress: unlockObj1.delegateAddress, amount: unlockObj1.amount },
						{ delegateAddress: unlockObj2.delegateAddress, amount: unlockObj2.amount },
						{ delegateAddress: unlockObj3.delegateAddress, amount: unlockObj3.amount },
					],
					pendingUnlocks: [unlockObj1, unlockObj2, unlockObj3],
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

		it('should only remove eligible pending unlocks from voter substore', async () => {
			await unlockCommand.execute(context);
			const storedData = codec.decode<VoterData>(
				voterStoreSchema,
				await voterSubstore.get(transaction.senderAddress),
			);

			expect(storedData.pendingUnlocks).toHaveLength(1);
			expect(storedData.pendingUnlocks).toEqual([unlockObj3]);
		});
	});

	describe('when self-voted non punished account waits 260000 blocks', () => {
		beforeEach(async () => {
			await delegateSubstore.setWithSchema(
				transaction.senderAddress,
				{
					...defaultDelegateInfo,
					name: 'selfvoter',
				},
				delegateStoreSchema,
			);
			unlockObj1 = {
				delegateAddress: transaction.senderAddress,
				amount: delegate1.amount,
				unvoteHeight: lastBlockHeight - 260001,
			};
			unlockObj2 = {
				delegateAddress: transaction.senderAddress,
				amount: delegate2.amount,
				unvoteHeight: lastBlockHeight - 260000,
			};
			unlockObj3 = {
				delegateAddress: transaction.senderAddress,
				amount: delegate3.amount,
				unvoteHeight: lastBlockHeight - 250000,
			};
			await voterSubstore.setWithSchema(
				transaction.senderAddress,
				{
					sentVotes: [
						{ delegateAddress: transaction.senderAddress, amount: delegate1.amount },
						{ delegateAddress: transaction.senderAddress, amount: delegate2.amount },
						{ delegateAddress: transaction.senderAddress, amount: delegate3.amount },
					],
					pendingUnlocks: [unlockObj1, unlockObj2, unlockObj3],
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

		it('should only remove eligible pending unlocks from voter substore', async () => {
			await unlockCommand.execute(context);
			const storedData = codec.decode<VoterData>(
				voterStoreSchema,
				await voterSubstore.get(transaction.senderAddress),
			);

			expect(storedData.pendingUnlocks).toHaveLength(1);
			expect(storedData.pendingUnlocks).toEqual([unlockObj3]);
		});
	});

	describe('when non self-voted punished account has waited pomHeight + 260000 and unvoteHeight + 2000 blocks', () => {
		beforeEach(async () => {
			await delegateSubstore.setWithSchema(
				delegate3.address,
				{
					...defaultDelegateInfo,
					name: 'punisheddelegate',
					pomHeights: [lastBlockHeight - 260000],
				},
				delegateStoreSchema,
			);
			unlockObj1 = {
				delegateAddress: delegate1.address,
				amount: delegate1.amount,
				unvoteHeight: lastBlockHeight - 2001,
			};
			unlockObj2 = {
				delegateAddress: delegate2.address,
				amount: delegate2.amount,
				unvoteHeight: lastBlockHeight - 1000,
			};
			unlockObj3 = {
				delegateAddress: delegate3.address,
				amount: delegate3.amount,
				unvoteHeight: lastBlockHeight - 2000,
			};
			await voterSubstore.setWithSchema(
				transaction.senderAddress,
				{
					sentVotes: [
						{ delegateAddress: unlockObj1.delegateAddress, amount: unlockObj1.amount },
						{ delegateAddress: unlockObj2.delegateAddress, amount: unlockObj2.amount },
						{ delegateAddress: unlockObj3.delegateAddress, amount: unlockObj3.amount },
					],
					pendingUnlocks: [unlockObj1, unlockObj2, unlockObj3],
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

		it('should only remove eligible pending unlocks from voter substore', async () => {
			await unlockCommand.execute(context);
			const storedData = codec.decode<VoterData>(
				voterStoreSchema,
				await voterSubstore.get(transaction.senderAddress),
			);

			expect(storedData.pendingUnlocks).toHaveLength(1);
			expect(storedData.pendingUnlocks).toEqual([unlockObj2]);
		});
	});

	describe('when non self-voted punished account has waited pomHeight + 260000 blocks but not waited for unlockHeight + 2000 blocks', () => {
		beforeEach(async () => {
			await delegateSubstore.setWithSchema(
				delegate3.address,
				{
					...defaultDelegateInfo,
					name: 'punisheddelegate',
					pomHeights: [lastBlockHeight - 260000],
				},
				delegateStoreSchema,
			);
			unlockObj1 = {
				delegateAddress: delegate1.address,
				amount: delegate1.amount,
				unvoteHeight: lastBlockHeight - 2001,
			};
			unlockObj2 = {
				delegateAddress: delegate2.address,
				amount: delegate2.amount,
				unvoteHeight: lastBlockHeight - 2000,
			};
			unlockObj3 = {
				delegateAddress: delegate3.address,
				amount: delegate3.amount,
				unvoteHeight: lastBlockHeight - 1000,
			};
			await voterSubstore.setWithSchema(
				transaction.senderAddress,
				{
					sentVotes: [
						{ delegateAddress: unlockObj1.delegateAddress, amount: unlockObj1.amount },
						{ delegateAddress: unlockObj2.delegateAddress, amount: unlockObj2.amount },
						{ delegateAddress: unlockObj3.delegateAddress, amount: unlockObj3.amount },
					],
					pendingUnlocks: [unlockObj1, unlockObj2, unlockObj3],
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

		it('should only remove eligible pending unlocks from voter substore', async () => {
			await unlockCommand.execute(context);
			const storedData = codec.decode<VoterData>(
				voterStoreSchema,
				await voterSubstore.get(transaction.senderAddress),
			);

			expect(storedData.pendingUnlocks).toHaveLength(1);
			expect(storedData.pendingUnlocks).toEqual([unlockObj3]);
		});
	});
});
