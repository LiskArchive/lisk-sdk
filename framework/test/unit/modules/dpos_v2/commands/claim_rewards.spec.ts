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

import { Transaction } from '@liskhq/lisk-chain';
import { utils, address } from '@liskhq/lisk-cryptography';
import { testing } from '../../../../../src';
import { ClaimRewardsCommand } from '../../../../../src/modules/dpos_v2/commands/claim_rewards';
import { MAX_NUMBER_BYTES_Q96 } from '../../../../../src/modules/dpos_v2/constants';
import { InternalMethod } from '../../../../../src/modules/dpos_v2/internal_method';
import { DPoSModule } from '../../../../../src/modules/dpos_v2/module';
import { DelegateStore } from '../../../../../src/modules/dpos_v2/stores/delegate';
import { VoterStore } from '../../../../../src/modules/dpos_v2/stores/voter';
import { DelegateAccount, TokenMethod, VoterData } from '../../../../../src/modules/dpos_v2/types';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { createFakeBlockHeader, InMemoryPrefixedStateDB } from '../../../../../src/testing';
import { createStoreGetter } from '../../../../../src/testing/utils';

describe('Change Commission command', () => {
	const dpos = new DPoSModule();
	const publicKey = utils.getRandomBytes(32);
	const senderAddress = address.getAddressFromPublicKey(publicKey);
	let claimRewardsCommand: ClaimRewardsCommand;
	let internalMethod: InternalMethod;
	let tokenMethod: TokenMethod;
	let stateStore: PrefixedStateReadWriter;
	let delegateStore: DelegateStore;
	let voterStore: VoterStore;
	let transaction: Transaction;
	let voterData: VoterData;
	let delegateInfo1: DelegateAccount;
	let delegateInfo2: DelegateAccount;

	beforeEach(async () => {
		internalMethod = new InternalMethod(dpos.stores, dpos.events, dpos.name);
		tokenMethod = {
			lock: jest.fn(),
			unlock: jest.fn(),
			getAvailableBalance: jest.fn(),
			burn: jest.fn(),
			transfer: jest.fn(),
			getLockedAmount: jest.fn(),
		};
		internalMethod.addDependencies(tokenMethod);
		claimRewardsCommand = new ClaimRewardsCommand(dpos.stores, dpos.events);
		claimRewardsCommand.addDependencies({ internalMethod });
		const transactionDetails = {
			module: 'dpos',
			command: claimRewardsCommand.name,
			senderPublicKey: publicKey,
			nonce: BigInt(0),
			fee: BigInt(100000000),
			params: Buffer.alloc(0),
			signatures: [publicKey],
		};
		transaction = new Transaction(transactionDetails);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		delegateStore = dpos.stores.get(DelegateStore);
		voterStore = dpos.stores.get(VoterStore);
		voterData = {
			sentVotes: [
				{
					delegateAddress: senderAddress,
					amount: BigInt(10),
					voteSharingCoefficients: [
						{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					],
				},
				{
					delegateAddress: Buffer.alloc(20, 1),
					amount: BigInt(20),
					voteSharingCoefficients: [
						{ tokenID: Buffer.alloc(0), coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					],
				},
			],
			pendingUnlocks: [],
		};
		delegateInfo1 = {
			consecutiveMissedBlocks: 0,
			isBanned: false,
			lastGeneratedHeight: 5,
			name: 'delegate1',
			pomHeights: [],
			selfVotes: BigInt(0),
			totalVotesReceived: BigInt(0),
			commission: 0,
			lastCommissionIncreaseHeight: 0,
			sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
		};
		delegateInfo2 = {
			consecutiveMissedBlocks: 0,
			isBanned: false,
			lastGeneratedHeight: 5,
			name: 'delegate1',
			pomHeights: [],
			selfVotes: BigInt(0),
			totalVotesReceived: BigInt(0),
			commission: 0,
			lastCommissionIncreaseHeight: 0,
			sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(32) }],
		};

		await delegateStore.set(createStoreGetter(stateStore), senderAddress, delegateInfo1);
		await delegateStore.set(createStoreGetter(stateStore), Buffer.alloc(20, 1), delegateInfo2);
		jest.spyOn(internalMethod, 'assignVoteRewards').mockResolvedValue();
	});

	describe('execute', () => {
		it('should throw if voter data does not exist for the sender address', async () => {
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header: createFakeBlockHeader({ height: 500 }),
				})
				.createCommandExecuteContext<Record<string, never>>();

			await expect(claimRewardsCommand.execute(context)).rejects.toThrow();
		});

		it('should call method assign vote rewards for each entry in sent votes and update the voter data correctly if voter data exists for the sender address', async () => {
			await voterStore.set(createStoreGetter(stateStore), senderAddress, voterData);
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header: createFakeBlockHeader({ height: 500 }),
				})
				.createCommandExecuteContext<Record<string, never>>();

			await claimRewardsCommand.execute(context);
			const updatedVoterData = await voterStore.get(context, senderAddress);

			expect(internalMethod.assignVoteRewards).toHaveBeenCalledTimes(voterData.sentVotes.length);
			expect(updatedVoterData.sentVotes[0].voteSharingCoefficients).toStrictEqual(
				delegateInfo1.sharingCoefficients,
			);
			expect(updatedVoterData.sentVotes[1].voteSharingCoefficients).toStrictEqual(
				delegateInfo2.sharingCoefficients,
			);
		});
	});
});
