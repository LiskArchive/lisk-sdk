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

import { math } from '@liskhq/lisk-utils';
import { utils } from '@liskhq/lisk-cryptography';
import { DPoSMethod } from '../../../../src/modules/dpos_v2/method';
import { MethodContext } from '../../../../src/state_machine/method_context';
import { EventQueue } from '../../../../src/state_machine';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { DPoSModule } from '../../../../src/modules/dpos_v2/module';
import { VoterStore } from '../../../../src/modules/dpos_v2/stores/voter';
import { DelegateStore } from '../../../../src/modules/dpos_v2/stores/delegate';
import { NameStore } from '../../../../src/modules/dpos_v2/stores/name';
import { createStoreGetter } from '../../../../src/testing/utils';
import {
	COMMISSION_INCREASE_PERIOD,
	MAX_COMMISSION_INCREASE_RATE,
	MAX_NUMBER_BYTES_Q96,
	TOKEN_ID_LENGTH,
} from '../../../../src/modules/dpos_v2/constants';

describe('DposModuleApi', () => {
	const dpos = new DPoSModule();

	let dposMethod: DPoSMethod;
	let methodContext: MethodContext;
	let stateStore: PrefixedStateReadWriter;
	let voterSubStore: VoterStore;
	let delegateSubStore: DelegateStore;
	let nameSubStore: NameStore;
	const address = utils.getRandomBytes(20);
	const voterData = {
		sentVotes: [
			{
				delegateAddress: utils.getRandomBytes(20),
				amount: BigInt(0),
				voteSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
			},
		],
		pendingUnlocks: [
			{
				delegateAddress: utils.getRandomBytes(20),
				amount: BigInt(0),
				unvoteHeight: 0,
			},
		],
	};

	const delegateData = {
		name: 'delegate1',
		totalVotesReceived: BigInt(0),
		selfVotes: BigInt(0),
		lastGeneratedHeight: 0,
		isBanned: false,
		pomHeights: [0],
		consecutiveMissedBlocks: 0,
		commission: 0,
		lastCommissionIncreaseHeight: 0,
		sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
	};

	beforeEach(() => {
		dposMethod = new DPoSMethod(dpos.stores, dpos.events);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		voterSubStore = dpos.stores.get(VoterStore);
		delegateSubStore = dpos.stores.get(DelegateStore);
		nameSubStore = dpos.stores.get(NameStore);
		methodContext = new MethodContext({ stateStore, eventQueue: new EventQueue(0) });
	});

	describe('isNameAvailable', () => {
		describe('when name already exists', () => {
			it('should return false', async () => {
				await nameSubStore.set(createStoreGetter(stateStore), Buffer.from(delegateData.name), {
					delegateAddress: Buffer.alloc(0),
				});
				await expect(
					dposMethod.isNameAvailable(methodContext, delegateData.name),
				).resolves.toBeFalse();
			});
		});

		describe('when name does not exist and exceeds the maximum length', () => {
			it('should return false', async () => {
				await expect(
					dposMethod.isNameAvailable(
						methodContext,
						'nnwkfnwkfnkwrnfkrnfeknekerfnkjenejnfekfnekfnjkdnwknw',
					),
				).resolves.toBeFalse();
			});
		});

		describe('when name does not exist and has length less than 1', () => {
			it('should return false', async () => {
				await expect(dposMethod.isNameAvailable(methodContext, '')).resolves.toBeFalse();
			});
		});

		describe('when name does not exist and contains invalid symbol', () => {
			it('should return false', async () => {
				await expect(
					dposMethod.isNameAvailable(methodContext, 'Ajldnfdf-_.dv$%&^#'),
				).resolves.toBeFalse();
			});
		});

		describe('when name does not exist and is a valid name', () => {
			it('should return true', async () => {
				await expect(
					dposMethod.isNameAvailable(methodContext, 'abcdefghijklmnopqrstuvwxyz0123456789!@$&_.'),
				).resolves.toBeFalse();
			});
		});
	});

	describe('getVoter', () => {
		describe('when input address is valid', () => {
			it('should return correct voter data corresponding to the input address', async () => {
				await voterSubStore.set(createStoreGetter(stateStore), address, voterData);
				const voterDataReturned = await dposMethod.getVoter(methodContext, address);

				expect(voterDataReturned).toStrictEqual(voterData);
			});
		});
	});

	describe('getDelegate', () => {
		describe('when input address is valid', () => {
			it('should return correct delegate data corresponding to the input address', async () => {
				await delegateSubStore.set(createStoreGetter(stateStore), address, delegateData);
				const delegateDataReturned = await dposMethod.getDelegate(methodContext, address);

				expect(delegateDataReturned).toStrictEqual(delegateData);
			});
		});
	});

	describe('updateSharedRewards', () => {
		const { q96 } = math;
		const moduleName = 'dpos';
		const address1 = Buffer.from('bf2e956611a4bd24e7dabc6c66d243327a87028f', 'hex');
		const address2 = Buffer.from('e6746edf586bb2a64d977add677afaebed7730e3', 'hex');
		const address3 = Buffer.from('ea50b241deee288208800f1ab0ae9940fbde54db', 'hex');
		const chainID = Buffer.from([0, 0, 0, 0]);
		const localTokenID1 = Buffer.from([0, 0, 0, 1]);
		const localTokenID2 = Buffer.from([0, 0, 1, 0]);
		const localTokenID3 = Buffer.from([0, 1, 0, 0]);
		const tokenID1 = Buffer.concat([chainID, localTokenID1]);
		const tokenID2 = Buffer.concat([chainID, localTokenID2]);
		const tokenID3 = Buffer.concat([chainID, localTokenID3]);

		const delegateData1 = {
			consecutiveMissedBlocks: 0,
			isBanned: false,
			lastGeneratedHeight: 5,
			name: 'delegate1',
			pomHeights: [],
			selfVotes: BigInt(0),
			totalVotesReceived: BigInt(0),
			commission: 0,
			lastCommissionIncreaseHeight: 0,
			sharingCoefficients: [
				{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				{ tokenID: tokenID2, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				{ tokenID: tokenID3, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
			],
		};
		const delegateData2 = {
			consecutiveMissedBlocks: 0,
			isBanned: false,
			lastGeneratedHeight: 5,
			name: 'delegate2',
			pomHeights: [],
			selfVotes: BigInt(0),
			totalVotesReceived: BigInt(4),
			commission: 0,
			lastCommissionIncreaseHeight: 0,
			sharingCoefficients: [
				{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				{ tokenID: tokenID2, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				{ tokenID: tokenID3, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
			],
		};
		const delegateData3 = {
			consecutiveMissedBlocks: 0,
			isBanned: false,
			lastGeneratedHeight: 5,
			name: 'delegate3',
			pomHeights: [],
			selfVotes: BigInt(0),
			totalVotesReceived: BigInt(4),
			commission: 0,
			lastCommissionIncreaseHeight: 0,
			sharingCoefficients: [
				{ tokenID: tokenID2, coefficient: Buffer.from('a40000000000000000000000', 'hex') },
				{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				{ tokenID: tokenID3, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
			],
		};
		const defaultConfig = {
			factorSelfVotes: 10,
			maxLengthName: 20,
			maxNumberSentVotes: 10,
			maxNumberPendingUnlocks: 20,
			failSafeMissedBlocks: 50,
			failSafeInactiveWindow: 260000,
			punishmentWindow: 780000,
			roundLength: 103,
			minWeightStandby: BigInt(1000) * BigInt(10 ** 8),
			numberActiveDelegates: 101,
			numberStandbyDelegates: 2,
			governanceTokenID: Buffer.from('0000000000000000', 'hex'),
			tokenIDFee: Buffer.from('0000000000000000', 'hex'),
			delegateRegistrationFee: BigInt(10) * BigInt(10) ** BigInt(8),
			maxBFTWeightCap: 500,
			commissionIncreasePeriod: COMMISSION_INCREASE_PERIOD,
			maxCommissionIncreaseRate: MAX_COMMISSION_INCREASE_RATE,
		};
		let tokenMethod: any;

		beforeEach(async () => {
			tokenMethod = { lock: jest.fn() };
			dposMethod.init(moduleName, defaultConfig, tokenMethod);
			await delegateSubStore.set(createStoreGetter(stateStore), address1, delegateData1);
			await delegateSubStore.set(createStoreGetter(stateStore), address2, delegateData2);
			await delegateSubStore.set(createStoreGetter(stateStore), address3, delegateData3);
			jest.spyOn(tokenMethod, 'lock');
			jest.spyOn(delegateSubStore, 'set');
		});

		it('should return if totalVotesReceived is 0', async () => {
			await expect(
				dposMethod.updateSharedRewards(methodContext, address1, tokenID1, BigInt(50)),
			).resolves.toBeUndefined();
			expect(tokenMethod.lock).not.toHaveBeenCalled();
			expect(delegateSubStore.set).not.toHaveBeenCalled();
		});

		it('should initialize sharing coefficient to zero and set the appropriate amounts to delegate store for the specified token if there does not exist an item in delegateStore for the token id', async () => {
			const newTokenID = utils.getRandomBytes(TOKEN_ID_LENGTH);
			const reward = BigInt(50);
			const rewardQ = q96(reward);
			const commissionQ = q96(BigInt(delegateData2.commission));
			const rewardFractionQ = q96(BigInt(1)).sub(commissionQ.div(q96(BigInt(10000))));
			const selfVotesQ = q96(delegateData2.selfVotes);
			const totalVotesQ = q96(delegateData2.totalVotesReceived);
			const oldSharingCoefficient = q96(0);
			const sharingCoefficientIncrease = rewardQ.muldiv(rewardFractionQ, totalVotesQ);
			const sharedRewards = sharingCoefficientIncrease.mul(totalVotesQ.sub(selfVotesQ)).floor();
			const newSharingCoefficient = oldSharingCoefficient.add(sharingCoefficientIncrease);
			const updatedDelegateData = delegateData2;
			updatedDelegateData.sharingCoefficients.push({
				tokenID: newTokenID,
				coefficient: newSharingCoefficient.toBuffer(),
			});

			await expect(
				dposMethod.updateSharedRewards(methodContext, address2, newTokenID, reward),
			).resolves.toBeUndefined();
			expect(tokenMethod.lock).toHaveBeenCalledTimes(1);
			expect(delegateSubStore.set).toHaveBeenCalledTimes(1);
			expect(tokenMethod.lock).toHaveBeenCalledWith(
				methodContext,
				address2,
				moduleName,
				newTokenID,
				sharedRewards,
			);
			expect(delegateSubStore.set).toHaveBeenCalledWith(
				methodContext,
				address2,
				updatedDelegateData,
			);
		});

		it('should lock the appropriate amount of rewards and update the delegate store in correct order with updated sharing coefficients if the token id is aready present but sharing coefficients are not sorted by token id', async () => {
			const reward = BigInt(70);
			const rewardQ = q96(reward);
			const commissionQ = q96(BigInt(delegateData3.commission));
			const rewardFractionQ = q96(BigInt(1)).sub(commissionQ.div(q96(BigInt(10000))));
			const selfVotesQ = q96(delegateData3.selfVotes);
			const totalVotesQ = q96(delegateData3.totalVotesReceived);
			const oldSharingCoefficient = q96(delegateData3.sharingCoefficients[0].coefficient);
			const sharingCoefficientIncrease = rewardQ.muldiv(rewardFractionQ, totalVotesQ);
			const sharedRewards = sharingCoefficientIncrease.mul(totalVotesQ.sub(selfVotesQ)).floor();
			const newSharingCoefficient = oldSharingCoefficient.add(sharingCoefficientIncrease);
			const updatedDelegateData = {
				consecutiveMissedBlocks: 0,
				isBanned: false,
				lastGeneratedHeight: 5,
				name: 'delegate3',
				pomHeights: [],
				selfVotes: BigInt(0),
				totalVotesReceived: BigInt(4),
				commission: 0,
				lastCommissionIncreaseHeight: 0,
				sharingCoefficients: [
					{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					{ tokenID: tokenID2, coefficient: newSharingCoefficient.toBuffer() },
					{ tokenID: tokenID3, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				],
			};

			await expect(
				dposMethod.updateSharedRewards(methodContext, address3, tokenID2, reward),
			).resolves.toBeUndefined();
			expect(tokenMethod.lock).toHaveBeenCalledTimes(1);
			expect(delegateSubStore.set).toHaveBeenCalledTimes(1);
			expect(tokenMethod.lock).toHaveBeenCalledWith(
				methodContext,
				address3,
				moduleName,
				tokenID2,
				sharedRewards,
			);
			expect(delegateSubStore.set).toHaveBeenCalledWith(
				methodContext,
				address3,
				updatedDelegateData,
			);
		});
	});
});
