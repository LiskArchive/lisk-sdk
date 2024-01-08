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
import { utils, address } from '@liskhq/lisk-cryptography';
import { testing } from '../../../../../src';
import { ClaimRewardsCommand } from '../../../../../src/modules/pos/commands/claim_rewards';
import { MAX_NUMBER_BYTES_Q96 } from '../../../../../src/modules/pos/constants';
import { InternalMethod } from '../../../../../src/modules/pos/internal_method';
import { PoSModule } from '../../../../../src/modules/pos/module';
import { ValidatorStore } from '../../../../../src/modules/pos/stores/validator';
import { StakerStore } from '../../../../../src/modules/pos/stores/staker';
import { ValidatorAccount, TokenMethod, StakerData } from '../../../../../src/modules/pos/types';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { createFakeBlockHeader, InMemoryPrefixedStateDB } from '../../../../../src/testing';
import { createStoreGetter } from '../../../../../src/testing/utils';

describe('Claim Rewards command', () => {
	const pos = new PoSModule();
	const publicKey = utils.getRandomBytes(32);
	const senderAddress = address.getAddressFromPublicKey(publicKey);
	let claimRewardsCommand: ClaimRewardsCommand;
	let internalMethod: InternalMethod;
	let tokenMethod: TokenMethod;
	let stateStore: PrefixedStateReadWriter;
	let validatorStore: ValidatorStore;
	let stakerStore: StakerStore;
	let transaction: Transaction;
	let stakerData: StakerData;
	let validatorInfo1: ValidatorAccount;
	let validatorInfo2: ValidatorAccount;

	beforeEach(async () => {
		internalMethod = new InternalMethod(pos.stores, pos.events, pos.name);
		tokenMethod = {
			lock: jest.fn(),
			unlock: jest.fn(),
			getAvailableBalance: jest.fn(),
			burn: jest.fn(),
			transfer: jest.fn(),
			getLockedAmount: jest.fn(),
		};
		internalMethod.addDependencies(tokenMethod);
		claimRewardsCommand = new ClaimRewardsCommand(pos.stores, pos.events);
		claimRewardsCommand.addDependencies({ internalMethod });
		const transactionDetails = {
			module: 'pos',
			command: claimRewardsCommand.name,
			senderPublicKey: publicKey,
			nonce: BigInt(0),
			fee: BigInt(100000000),
			params: Buffer.alloc(0),
			signatures: [publicKey],
		};
		transaction = new Transaction(transactionDetails);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		validatorStore = pos.stores.get(ValidatorStore);
		stakerStore = pos.stores.get(StakerStore);
		stakerData = {
			stakes: [
				{
					validatorAddress: senderAddress,
					amount: BigInt(10),
					sharingCoefficients: [
						{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					],
				},
				{
					validatorAddress: Buffer.alloc(20, 1),
					amount: BigInt(20),
					sharingCoefficients: [
						{ tokenID: Buffer.alloc(0), coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					],
				},
			],
			pendingUnlocks: [],
		};
		validatorInfo1 = {
			consecutiveMissedBlocks: 0,
			isBanned: false,
			lastGeneratedHeight: 5,
			name: 'validator1',
			reportMisbehaviorHeights: [],
			selfStake: BigInt(0),
			totalStake: BigInt(0),
			commission: 0,
			lastCommissionIncreaseHeight: 0,
			sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
		};
		validatorInfo2 = {
			consecutiveMissedBlocks: 0,
			isBanned: false,
			lastGeneratedHeight: 5,
			name: 'validator1',
			reportMisbehaviorHeights: [],
			selfStake: BigInt(0),
			totalStake: BigInt(0),
			commission: 0,
			lastCommissionIncreaseHeight: 0,
			sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(32) }],
		};

		await validatorStore.set(createStoreGetter(stateStore), senderAddress, validatorInfo1);
		await validatorStore.set(createStoreGetter(stateStore), Buffer.alloc(20, 1), validatorInfo2);
		jest.spyOn(internalMethod, 'assignStakeRewards').mockResolvedValue();
	});

	describe('execute', () => {
		it('should throw if staker data does not exist for the sender address', async () => {
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header: createFakeBlockHeader({ height: 500 }),
				})
				.createCommandExecuteContext<Record<string, never>>();

			await expect(claimRewardsCommand.execute(context)).rejects.toThrow();
		});

		it('should call method assign stake rewards for each entry in sent stakes and update the staker data correctly if staker data exists for the sender address', async () => {
			await stakerStore.set(createStoreGetter(stateStore), senderAddress, stakerData);
			const context = testing
				.createTransactionContext({
					stateStore,
					transaction,
					header: createFakeBlockHeader({ height: 500 }),
				})
				.createCommandExecuteContext<Record<string, never>>();

			await claimRewardsCommand.execute(context);
			const updatedStakerData = await stakerStore.get(context, senderAddress);

			expect(internalMethod.assignStakeRewards).toHaveBeenCalledTimes(stakerData.stakes.length);
			expect(updatedStakerData.stakes[0].sharingCoefficients).toStrictEqual(
				validatorInfo1.sharingCoefficients,
			);
			expect(updatedStakerData.stakes[1].sharingCoefficients).toStrictEqual(
				validatorInfo2.sharingCoefficients,
			);
		});
	});
});
