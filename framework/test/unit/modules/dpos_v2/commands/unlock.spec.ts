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

import { BlockHeader, Transaction } from '@liskhq/lisk-chain';
import { utils } from '@liskhq/lisk-cryptography';
import * as testing from '../../../../../src/testing';
import {
	UnlockCommand,
	CommandExecuteContext,
	DPoSModule,
	CommandVerifyContext,
} from '../../../../../src';
import {
	defaultConfig,
	EMPTY_KEY,
	SELF_VOTE_PUNISH_TIME,
	VOTER_PUNISH_TIME,
	WAIT_TIME_SELF_VOTE,
	WAIT_TIME_VOTE,
} from '../../../../../src/modules/dpos_v2/constants';
import { TokenMethod, UnlockingObject, VoterData } from '../../../../../src/modules/dpos_v2/types';
import { liskToBeddows } from '../../../../utils/assets';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing';
import { DelegateStore } from '../../../../../src/modules/dpos_v2/stores/delegate';
import { VoterStore } from '../../../../../src/modules/dpos_v2/stores/voter';
import { createStoreGetter } from '../../../../../src/testing/utils';
import { GenesisDataStore } from '../../../../../src/modules/dpos_v2/stores/genesis';
import { VerifyStatus } from '../../../../../src/state_machine';

describe('UnlockCommand', () => {
	const dpos = new DPoSModule();

	let unlockCommand: UnlockCommand;
	let stateStore: PrefixedStateReadWriter;
	let delegateSubstore: DelegateStore;
	let voterSubstore: VoterStore;
	let genesisSubstore: GenesisDataStore;
	let mockTokenMethod: TokenMethod;
	let blockHeight: number;
	let header: BlockHeader;
	let unlockableObject: UnlockingObject;
	let unlockableObject2: UnlockingObject;
	let unlockableObject3: UnlockingObject;
	let nonUnlockableObject: UnlockingObject;
	let context: CommandExecuteContext;
	let verifyContext: CommandVerifyContext;
	let storedData: VoterData;
	const delegate1 = {
		name: 'delegate1',
		address: utils.getRandomBytes(32),
		amount: liskToBeddows(100),
	};
	const delegate2 = {
		name: 'delegate2',
		address: utils.getRandomBytes(32),
		amount: liskToBeddows(200),
	};
	const delegate3 = {
		name: 'delegate3',
		address: utils.getRandomBytes(32),
		amount: liskToBeddows(300),
	};
	const delegate4 = {
		name: 'delegate4',
		address: utils.getRandomBytes(32),
		amount: liskToBeddows(400),
	};
	const defaultDelegateInfo = {
		totalVotesReceived: BigInt(100000000),
		selfVotes: BigInt(0),
		lastGeneratedHeight: 0,
		isBanned: false,
		pomHeights: [],
		consecutiveMissedBlocks: 0,
		commission: 0,
		lastCommissionIncreaseHeight: 0,
		sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
	};
	const publicKey = utils.getRandomBytes(32);
	const transaction = new Transaction({
		module: 'dpos',
		command: 'unlock',
		senderPublicKey: publicKey,
		nonce: BigInt(0),
		fee: BigInt(100000000),
		params: Buffer.alloc(0),
		signatures: [publicKey],
	});
	const chainID = Buffer.from(
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
		'hex',
	);

	beforeEach(() => {
		unlockCommand = new UnlockCommand(dpos.stores, dpos.events);
		mockTokenMethod = {
			lock: jest.fn(),
			unlock: jest.fn(),
			getAvailableBalance: jest.fn(),
			burn: jest.fn(),
			transfer: jest.fn(),
			getLockedAmount: jest.fn(),
		};
		unlockCommand.addDependencies({
			tokenMethod: mockTokenMethod,
		});
		unlockCommand.init({
			roundLength: defaultConfig.roundLength,
			governanceTokenID: Buffer.alloc(8),
		});
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		delegateSubstore = dpos.stores.get(DelegateStore);
		voterSubstore = dpos.stores.get(VoterStore);
		genesisSubstore = dpos.stores.get(GenesisDataStore);
		blockHeight = 8760000;
		header = testing.createFakeBlockHeader({
			height: blockHeight,
			aggregateCommit: {
				aggregationBits: Buffer.alloc(0),
				certificateSignature: Buffer.alloc(0),
				height: blockHeight,
			},
		});
	});

	describe('verify', () => {
		it('should return an OK verify status', async () => {
			verifyContext = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					chainID,
				})
				.createCommandVerifyContext();

			const result = await unlockCommand.verify(verifyContext);

			expect(result.status).toBe(VerifyStatus.OK);
		});

		it('should return an error if transaction params are not empty', async () => {
			const transactionX = new Transaction({
				module: 'dpos',
				command: 'unlock',
				senderPublicKey: publicKey,
				nonce: BigInt(0),
				fee: BigInt(100000000),
				params: Buffer.alloc(5),
				signatures: [publicKey],
			});

			verifyContext = testing
				.createTransactionContext({
					stateStore,
					transaction: transactionX,
					header,
					chainID,
				})
				.createCommandVerifyContext();

			const expected = {
				status: VerifyStatus.FAIL,
				error: new Error('Unlock transaction params must be empty.'),
			};

			const result = await unlockCommand.verify(verifyContext);

			expect(result).toMatchObject(expected);
		});
	});

	describe(`when non self-voted non-punished account waits ${WAIT_TIME_VOTE} blocks since unvoteHeight`, () => {
		beforeEach(async () => {
			await genesisSubstore.set(createStoreGetter(stateStore), EMPTY_KEY, {
				height: 8760000,
				initRounds: 1,
				initDelegates: [],
			});
			await delegateSubstore.set(createStoreGetter(stateStore), delegate1.address, {
				name: delegate1.name,
				...defaultDelegateInfo,
			});
			await delegateSubstore.set(createStoreGetter(stateStore), delegate2.address, {
				name: delegate2.name,
				...defaultDelegateInfo,
			});

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
			await voterSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				sentVotes: [
					{
						delegateAddress: unlockableObject.delegateAddress,
						amount: unlockableObject.amount,
						voteSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
				],
				pendingUnlocks: [unlockableObject, nonUnlockableObject],
			});
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					chainID,
				})
				.createCommandExecuteContext();
			await unlockCommand.execute(context);
			storedData = await voterSubstore.get(
				createStoreGetter(stateStore),
				transaction.senderAddress,
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
			await genesisSubstore.set(createStoreGetter(stateStore), EMPTY_KEY, {
				height: 8760000,
				initRounds: 1,
				initDelegates: [],
			});
			await delegateSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				...defaultDelegateInfo,
				name: 'nonpunishedselfvoter',
			});
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
			await voterSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				sentVotes: [
					{
						delegateAddress: unlockableObject.delegateAddress,
						amount: delegate1.amount,
						voteSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
					{
						delegateAddress: nonUnlockableObject.delegateAddress,
						amount: delegate2.amount,
						voteSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
				],
				pendingUnlocks: [unlockableObject, nonUnlockableObject],
			});
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					chainID,
				})
				.createCommandExecuteContext();
			await unlockCommand.execute(context);
			storedData = await voterSubstore.get(
				createStoreGetter(stateStore),
				transaction.senderAddress,
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
			await genesisSubstore.set(createStoreGetter(stateStore), EMPTY_KEY, {
				height: 8760000,
				initRounds: 1,
				initDelegates: [],
			});
			await delegateSubstore.set(createStoreGetter(stateStore), delegate1.address, {
				...defaultDelegateInfo,
				name: 'punishedvoter1',
				pomHeights: [blockHeight - VOTER_PUNISH_TIME],
			});
			// This covers scenario: has not waited pomHeight + 260,000 blocks but waited unvoteHeight + 2000 blocks and pomHeight is more than unvoteHeight + 2000 blocks
			await delegateSubstore.set(createStoreGetter(stateStore), delegate2.address, {
				...defaultDelegateInfo,
				name: 'punishedvoter2',
				pomHeights: [blockHeight],
			});
			// This covers scenario: has not waited pomHeight + 260,000 blocks but waited unvoteHeight + 2000 blocks and pomHeight is equal to unvoteHeight + 2000 blocks
			await delegateSubstore.set(createStoreGetter(stateStore), delegate3.address, {
				...defaultDelegateInfo,
				name: 'punishedvoter3',
				pomHeights: [blockHeight - 1000],
			});
			await delegateSubstore.set(createStoreGetter(stateStore), delegate4.address, {
				...defaultDelegateInfo,
				name: 'punishedvoter4',
				pomHeights: [blockHeight - VOTER_PUNISH_TIME],
			});
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
			await voterSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				sentVotes: [
					{
						delegateAddress: unlockableObject.delegateAddress,
						amount: unlockableObject.amount,
						voteSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
					{
						delegateAddress: unlockableObject2.delegateAddress,
						amount: unlockableObject2.amount,
						voteSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
					{
						delegateAddress: unlockableObject3.delegateAddress,
						amount: unlockableObject3.amount,
						voteSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
					{
						delegateAddress: nonUnlockableObject.delegateAddress,
						amount: nonUnlockableObject.amount,
						voteSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
				],
				pendingUnlocks: [
					unlockableObject,
					unlockableObject2,
					unlockableObject3,
					nonUnlockableObject,
				],
			});
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					chainID,
				})
				.createCommandExecuteContext();
			await unlockCommand.execute(context);
			storedData = await voterSubstore.get(
				createStoreGetter(stateStore),
				transaction.senderAddress,
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
			await genesisSubstore.set(createStoreGetter(stateStore), EMPTY_KEY, {
				height: 8760000,
				initRounds: 1,
				initDelegates: [],
			});
			await delegateSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				...defaultDelegateInfo,
				name: 'punishedselfvoter',
				pomHeights: [blockHeight - SELF_VOTE_PUNISH_TIME],
			});
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
			await voterSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				sentVotes: [
					{
						delegateAddress: unlockableObject.delegateAddress,
						amount: unlockableObject.amount,
						voteSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
					{
						delegateAddress: nonUnlockableObject.delegateAddress,
						amount: nonUnlockableObject.amount,
						voteSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
				],
				pendingUnlocks: [unlockableObject, nonUnlockableObject],
			});
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					chainID,
				})
				.createCommandExecuteContext();
			await unlockCommand.execute(context);
			storedData = await voterSubstore.get(
				createStoreGetter(stateStore),
				transaction.senderAddress,
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
			await genesisSubstore.set(createStoreGetter(stateStore), EMPTY_KEY, {
				height: 8760000,
				initRounds: 1,
				initDelegates: [],
			});
			await delegateSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				...defaultDelegateInfo,
				name: 'punishedselfvoter',
				pomHeights: [blockHeight - 1],
			});
			nonUnlockableObject = {
				delegateAddress: transaction.senderAddress,
				amount: delegate1.amount,
				unvoteHeight: blockHeight - WAIT_TIME_SELF_VOTE,
			};
			await voterSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				sentVotes: [
					{
						delegateAddress: nonUnlockableObject.delegateAddress,
						amount: nonUnlockableObject.amount,
						voteSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
				],
				pendingUnlocks: [nonUnlockableObject],
			});
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					chainID,
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
			await genesisSubstore.set(createStoreGetter(stateStore), EMPTY_KEY, {
				height: 10,
				initRounds: 1,
				initDelegates: [],
			});
			await delegateSubstore.set(createStoreGetter(stateStore), delegate1.address, {
				name: delegate1.name,
				...defaultDelegateInfo,
			});
			await delegateSubstore.set(createStoreGetter(stateStore), delegate2.address, {
				name: delegate2.name,
				...defaultDelegateInfo,
			});
			nonUnlockableObject = {
				delegateAddress: delegate2.address,
				amount: delegate2.amount,
				unvoteHeight: blockHeight,
			};
			await voterSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				sentVotes: [
					{
						delegateAddress: unlockableObject.delegateAddress,
						amount: unlockableObject.amount,
						voteSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
				],
				pendingUnlocks: [nonUnlockableObject],
			});
		});

		it('should not unlock any votes', async () => {
			// Arrange
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header: testing.createFakeBlockHeader({
						height: blockHeight,
						aggregateCommit: {
							aggregationBits: Buffer.alloc(0),
							certificateSignature: Buffer.alloc(0),
							height: 0,
						},
					}),
					chainID,
				})
				.createCommandExecuteContext();

			await expect(unlockCommand.execute(context)).rejects.toThrow(
				'No eligible voter data was found for unlocking',
			);
		});
	});

	describe(`when certificate is generated`, () => {
		beforeEach(async () => {
			await genesisSubstore.set(createStoreGetter(stateStore), EMPTY_KEY, {
				height: 8760000,
				initRounds: 1,
				initDelegates: [],
			});
			await delegateSubstore.set(createStoreGetter(stateStore), delegate1.address, {
				name: delegate1.name,
				...defaultDelegateInfo,
			});
			await delegateSubstore.set(createStoreGetter(stateStore), delegate2.address, {
				name: delegate2.name,
				...defaultDelegateInfo,
			});

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
			await voterSubstore.set(createStoreGetter(stateStore), transaction.senderAddress, {
				sentVotes: [
					{
						delegateAddress: unlockableObject.delegateAddress,
						amount: unlockableObject.amount,
						voteSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
					},
				],
				pendingUnlocks: [unlockableObject, nonUnlockableObject],
			});
			context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header,
					chainID,
				})
				.createCommandExecuteContext();
			await unlockCommand.execute(context);
			storedData = await voterSubstore.get(
				createStoreGetter(stateStore),
				transaction.senderAddress,
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
