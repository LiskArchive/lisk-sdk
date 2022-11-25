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
import { PoSMethod } from '../../../../src/modules/pos/method';
import { MethodContext } from '../../../../src/state_machine/method_context';
import { EventQueue } from '../../../../src/state_machine';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { PoSModule } from '../../../../src/modules/pos/module';
import { StakerStore } from '../../../../src/modules/pos/stores/staker';
import { ValidatorStore } from '../../../../src/modules/pos/stores/validator';
import { NameStore } from '../../../../src/modules/pos/stores/name';
import { createStoreGetter } from '../../../../src/testing/utils';
import {
	COMMISSION_INCREASE_PERIOD,
	MAX_COMMISSION_INCREASE_RATE,
	MAX_NUMBER_BYTES_Q96,
} from '../../../../src/modules/pos/constants';

describe('PoSMethod', () => {
	const pos = new PoSModule();

	let posMethod: PoSMethod;
	let methodContext: MethodContext;
	let stateStore: PrefixedStateReadWriter;
	let stakerSubStore: StakerStore;
	let validatorSubStore: ValidatorStore;
	let nameSubStore: NameStore;
	const address = utils.getRandomBytes(20);
	const stakerData = {
		sentStakes: [
			{
				validatorAddress: utils.getRandomBytes(20),
				amount: BigInt(0),
				stakeSharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
			},
		],
		pendingUnlocks: [
			{
				validatorAddress: utils.getRandomBytes(20),
				amount: BigInt(0),
				unstakeHeight: 0,
			},
		],
	};

	const validatorData = {
		name: 'validator1',
		totalStakeReceived: BigInt(0),
		selfStake: BigInt(0),
		lastGeneratedHeight: 0,
		isBanned: false,
		pomHeights: [0],
		consecutiveMissedBlocks: 0,
		commission: 0,
		lastCommissionIncreaseHeight: 0,
		sharingCoefficients: [{ tokenID: Buffer.alloc(8), coefficient: Buffer.alloc(24) }],
	};

	beforeEach(() => {
		posMethod = new PoSMethod(pos.stores, pos.events);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		stakerSubStore = pos.stores.get(StakerStore);
		validatorSubStore = pos.stores.get(ValidatorStore);
		nameSubStore = pos.stores.get(NameStore);
		methodContext = new MethodContext({
			stateStore,
			eventQueue: new EventQueue(0),
			contextStore: new Map<string, unknown>(),
		});
	});

	describe('isNameAvailable', () => {
		describe('when name already exists', () => {
			it('should return false', async () => {
				await nameSubStore.set(createStoreGetter(stateStore), Buffer.from(validatorData.name), {
					validatorAddress: Buffer.alloc(0),
				});
				await expect(
					posMethod.isNameAvailable(methodContext, validatorData.name),
				).resolves.toBeFalse();
			});
		});

		describe('when name does not exist and exceeds the maximum length', () => {
			it('should return false', async () => {
				await expect(
					posMethod.isNameAvailable(
						methodContext,
						'nnwkfnwkfnkwrnfkrnfeknekerfnkjenejnfekfnekfnjkdnwknw',
					),
				).resolves.toBeFalse();
			});
		});

		describe('when name does not exist and has length less than 1', () => {
			it('should return false', async () => {
				await expect(posMethod.isNameAvailable(methodContext, '')).resolves.toBeFalse();
			});
		});

		describe('when name does not exist and contains invalid symbol', () => {
			it('should return false', async () => {
				await expect(
					posMethod.isNameAvailable(methodContext, 'Ajldnfdf-_.dv$%&^#'),
				).resolves.toBeFalse();
			});
		});

		describe('when name does not exist and is a valid name', () => {
			it('should return true', async () => {
				await expect(
					posMethod.isNameAvailable(methodContext, 'abcdefghijklmnopqrstuvwxyz0123456789!@$&_.'),
				).resolves.toBeFalse();
			});
		});
	});

	describe('getStaker', () => {
		describe('when input address is valid', () => {
			it('should return correct staker data corresponding to the input address', async () => {
				await stakerSubStore.set(createStoreGetter(stateStore), address, stakerData);
				const stakerDataReturned = await posMethod.getStaker(methodContext, address);

				expect(stakerDataReturned).toStrictEqual(stakerData);
			});
		});
	});

	describe('getValidator', () => {
		describe('when input address is valid', () => {
			it('should return correct validator data corresponding to the input address', async () => {
				await validatorSubStore.set(createStoreGetter(stateStore), address, validatorData);
				const validatorDataReturned = await posMethod.getValidator(methodContext, address);

				expect(validatorDataReturned).toStrictEqual(validatorData);
			});
		});
	});

	describe('updateSharedRewards', () => {
		const { q96 } = math;
		const moduleName = 'pos';
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

		const validatorData1 = {
			consecutiveMissedBlocks: 0,
			isBanned: false,
			lastGeneratedHeight: 5,
			name: 'validator1',
			pomHeights: [],
			selfStake: BigInt(0),
			totalStakeReceived: BigInt(0),
			commission: 0,
			lastCommissionIncreaseHeight: 0,
			sharingCoefficients: [
				{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				{ tokenID: tokenID2, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				{ tokenID: tokenID3, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
			],
		};
		const validatorData2 = {
			consecutiveMissedBlocks: 0,
			isBanned: false,
			lastGeneratedHeight: 5,
			name: 'validator2',
			pomHeights: [],
			selfStake: BigInt(0),
			totalStakeReceived: BigInt(4),
			commission: 0,
			lastCommissionIncreaseHeight: 0,
			sharingCoefficients: [
				{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				{ tokenID: tokenID3, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
			],
		};
		const validatorData3 = {
			consecutiveMissedBlocks: 0,
			isBanned: false,
			lastGeneratedHeight: 5,
			name: 'validator3',
			pomHeights: [],
			selfStake: BigInt(0),
			totalStakeReceived: BigInt(4),
			commission: 0,
			lastCommissionIncreaseHeight: 0,
			sharingCoefficients: [
				{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				{ tokenID: tokenID2, coefficient: Buffer.from('a40000000000000000000000', 'hex') },
				{ tokenID: tokenID3, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
			],
		};
		const defaultConfig = {
			factorSelfStakes: 10,
			maxLengthName: 20,
			maxNumberSentStakes: 10,
			maxNumberPendingUnlocks: 20,
			failSafeMissedBlocks: 50,
			failSafeInactiveWindow: 260000,
			punishmentWindow: 780000,
			roundLength: 103,
			minWeightStandby: BigInt(1000) * BigInt(10 ** 8),
			numberActiveValidators: 101,
			numberStandbyValidators: 2,
			posTokenID: Buffer.from('0000000000000000', 'hex'),
			validatorRegistrationFee: BigInt(10) * BigInt(10) ** BigInt(8),
			maxBFTWeightCap: 500,
			commissionIncreasePeriod: COMMISSION_INCREASE_PERIOD,
			maxCommissionIncreaseRate: MAX_COMMISSION_INCREASE_RATE,
		};
		let tokenMethod: any;

		beforeEach(async () => {
			tokenMethod = { lock: jest.fn() };
			posMethod.init(moduleName, defaultConfig, tokenMethod);
			await validatorSubStore.set(createStoreGetter(stateStore), address1, validatorData1);
			await validatorSubStore.set(createStoreGetter(stateStore), address2, validatorData2);
			await validatorSubStore.set(createStoreGetter(stateStore), address3, validatorData3);
			jest.spyOn(tokenMethod, 'lock');
			jest.spyOn(validatorSubStore, 'set');
		});

		it('should return if totalStakeReceived is 0', async () => {
			await expect(
				posMethod.updateSharedRewards(methodContext, address1, tokenID1, BigInt(50)),
			).resolves.toBeUndefined();
			expect(tokenMethod.lock).not.toHaveBeenCalled();
			expect(validatorSubStore.set).not.toHaveBeenCalled();
		});

		it('should initialize sharing coefficient to zero and set the appropriate amounts in correct order to validator store for the specified token if there does not exist an item in validatorStore for the token id', async () => {
			const newTokenID = tokenID2;
			const reward = BigInt(50);
			const rewardQ = q96(reward);
			const commissionQ = q96(BigInt(validatorData2.commission));
			const rewardFractionQ = q96(BigInt(1)).sub(commissionQ.div(q96(BigInt(10000))));
			const selfStakeQ = q96(validatorData2.selfStake);
			const totalStakesQ = q96(validatorData2.totalStakeReceived);
			const oldSharingCoefficient = q96(0);
			const sharingCoefficientIncrease = rewardQ.muldiv(rewardFractionQ, totalStakesQ);
			const sharedRewards = sharingCoefficientIncrease.mul(totalStakesQ.sub(selfStakeQ)).floor();
			const newSharingCoefficient = oldSharingCoefficient.add(sharingCoefficientIncrease);
			const updatedValidatorData = {
				consecutiveMissedBlocks: 0,
				isBanned: false,
				lastGeneratedHeight: 5,
				name: 'validator2',
				pomHeights: [],
				selfStake: BigInt(0),
				totalStakeReceived: BigInt(4),
				commission: 0,
				lastCommissionIncreaseHeight: 0,
				sharingCoefficients: [
					{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					{ tokenID: tokenID2, coefficient: newSharingCoefficient.toBuffer() },
					{ tokenID: tokenID3, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				],
			};

			await expect(
				posMethod.updateSharedRewards(methodContext, address2, newTokenID, reward),
			).resolves.toBeUndefined();
			expect(tokenMethod.lock).toHaveBeenCalledTimes(1);
			expect(validatorSubStore.set).toHaveBeenCalledTimes(1);
			expect(tokenMethod.lock).toHaveBeenCalledWith(
				methodContext,
				address2,
				moduleName,
				newTokenID,
				sharedRewards,
			);
			expect(validatorSubStore.set).toHaveBeenCalledWith(
				methodContext,
				address2,
				updatedValidatorData,
			);
		});

		it('should lock the appropriate amount of rewards and update the validator store with updated sharing coefficients if the token id is already present', async () => {
			const reward = BigInt(70);
			const rewardQ = q96(reward);
			const commissionQ = q96(BigInt(validatorData3.commission));
			const rewardFractionQ = q96(BigInt(1)).sub(commissionQ.div(q96(BigInt(10000))));
			const selfStakeQ = q96(validatorData3.selfStake);
			const totalStakesQ = q96(validatorData3.totalStakeReceived);
			const oldSharingCoefficient = q96(validatorData3.sharingCoefficients[1].coefficient);
			const sharingCoefficientIncrease = rewardQ.muldiv(rewardFractionQ, totalStakesQ);
			const sharedRewards = sharingCoefficientIncrease.mul(totalStakesQ.sub(selfStakeQ)).floor();
			const newSharingCoefficient = oldSharingCoefficient.add(sharingCoefficientIncrease);
			const updatedValidatorData = {
				consecutiveMissedBlocks: 0,
				isBanned: false,
				lastGeneratedHeight: 5,
				name: 'validator3',
				pomHeights: [],
				selfStake: BigInt(0),
				totalStakeReceived: BigInt(4),
				commission: 0,
				lastCommissionIncreaseHeight: 0,
				sharingCoefficients: [
					{ tokenID: tokenID1, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
					{ tokenID: tokenID2, coefficient: newSharingCoefficient.toBuffer() },
					{ tokenID: tokenID3, coefficient: Buffer.alloc(MAX_NUMBER_BYTES_Q96) },
				],
			};

			await expect(
				posMethod.updateSharedRewards(methodContext, address3, tokenID2, reward),
			).resolves.toBeUndefined();
			expect(tokenMethod.lock).toHaveBeenCalledTimes(1);
			expect(validatorSubStore.set).toHaveBeenCalledTimes(1);
			expect(tokenMethod.lock).toHaveBeenCalledWith(
				methodContext,
				address3,
				moduleName,
				tokenID2,
				sharedRewards,
			);
			expect(validatorSubStore.set).toHaveBeenCalledWith(
				methodContext,
				address3,
				updatedValidatorData,
			);
		});
	});
});
