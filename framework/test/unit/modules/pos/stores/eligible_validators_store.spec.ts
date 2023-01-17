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

import { utils } from '@liskhq/lisk-cryptography';
import { StoreGetter } from '../../../../../src/modules/base_store';
import { defaultConfig, TOKEN_ID_LENGTH } from '../../../../../src/modules/pos/constants';
import { EligibleValidatorsStore } from '../../../../../src/modules/pos/stores/eligible_validators';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { createStoreGetter } from '../../../../../src/testing/utils';

describe('EligibleValidatorsStore', () => {
	let stateStore: PrefixedStateReadWriter;
	let eligibleValidatorsStore: EligibleValidatorsStore;
	let context: StoreGetter;
	const storeKeys = [];
	const eligibleValidators = [
		{
			address: Buffer.from('fa1c00809ff1b10cd269a711eef40a465ba4a9cb'),
			validatorWeight: BigInt(10),
			lastPomHeight: 278,
		},
		{
			address: Buffer.from('e81fa3d9650e6427c2e35c6b41c249589e5da84c'),
			validatorWeight: BigInt(11),
			lastPomHeight: 478,
		},
		{
			address: Buffer.from('14b23e2adad2afd2990bc80907989d96ee20cff6'),
			validatorWeight: BigInt(12),
			lastPomHeight: 978,
		},
	];
	const defaultValidatorAccount = {
		name: 'rand',
		commission: 0,
		consecutiveMissedBlocks: 0,
		isBanned: false,
		lastCommissionIncreaseHeight: 0,
		lastGeneratedHeight: 0,
		reportMisbehaviorHeights: [],
		selfStake: BigInt(200000000000),
		totalStake: BigInt(250000000000),
		sharingCoefficients: [],
	};

	beforeEach(async () => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		context = createStoreGetter(stateStore);
		eligibleValidatorsStore = new EligibleValidatorsStore('pos');
		eligibleValidatorsStore.init({
			...defaultConfig,
			minWeightStandby: BigInt(defaultConfig.minWeightStandby),
			posTokenID: Buffer.alloc(TOKEN_ID_LENGTH),
			validatorRegistrationFee: BigInt(defaultConfig.validatorRegistrationFee),
		});
		for (const eligibleValidator of eligibleValidators) {
			const key = eligibleValidatorsStore.getKey(
				eligibleValidator.address,
				eligibleValidator.validatorWeight,
			);
			storeKeys.push(key);
			await eligibleValidatorsStore.set(context, key, {
				lastPomHeight: eligibleValidator.lastPomHeight,
			});
		}
	});

	describe('getTop', () => {
		it('should get keys and values for top n validators in order of validator weight', async () => {
			const returnedValue = await eligibleValidatorsStore.getTop(context, 2);

			expect(returnedValue).toHaveLength(2);
			expect(returnedValue[0].value.lastPomHeight).toBe(978);
			expect(returnedValue[1].value.lastPomHeight).toBe(478);
		});
	});

	describe('getAll', () => {
		it('should get all keys and values in correct order', async () => {
			const returnedValue = await eligibleValidatorsStore.getAll(context);

			expect(returnedValue).toHaveLength(3);
			expect(returnedValue[0].value.lastPomHeight).toBe(978);
			expect(returnedValue[2].value.lastPomHeight).toBe(278);
		});
	});

	describe('splitKey', () => {
		it('should return address and weight', () => {
			const address = utils.getRandomBytes(20);
			const key = eligibleValidatorsStore.getKey(address, BigInt(999));
			expect(eligibleValidatorsStore.splitKey(key)).toEqual([address, BigInt(999)]);
		});
	});

	describe('update', () => {
		it('should delete original key and not insert if validator is banned', async () => {
			await eligibleValidatorsStore.update(context, eligibleValidators[0].address, BigInt(10), {
				...defaultValidatorAccount,
				isBanned: true,
			});
			await expect(
				eligibleValidatorsStore.has(
					context,
					eligibleValidatorsStore.getKey(
						eligibleValidators[0].address,
						defaultValidatorAccount.totalStake,
					),
				),
			).resolves.toBeFalse();
		});

		it('should delete original key and not insert if validator does not have minWeight', async () => {
			await eligibleValidatorsStore.update(context, eligibleValidators[0].address, BigInt(10), {
				...defaultValidatorAccount,
				selfStake: BigInt(0),
			});

			await expect(
				eligibleValidatorsStore.has(
					context,
					eligibleValidatorsStore.getKey(eligibleValidators[0].address, BigInt(0)),
				),
			).resolves.toBeFalse();
		});

		it('should insert new key with latest pomHeight', async () => {
			await eligibleValidatorsStore.update(context, eligibleValidators[0].address, BigInt(10), {
				...defaultValidatorAccount,
				reportMisbehaviorHeights: [10, 20, 30],
			});
			await expect(
				eligibleValidatorsStore.get(
					context,
					eligibleValidatorsStore.getKey(
						eligibleValidators[0].address,
						defaultValidatorAccount.totalStake,
					),
				),
			).resolves.toEqual({ lastPomHeight: 30 });
		});

		it('should insert new key with 0 if validator does not have pomHeights', async () => {
			await eligibleValidatorsStore.update(context, eligibleValidators[0].address, BigInt(10), {
				...defaultValidatorAccount,
			});
			await expect(
				eligibleValidatorsStore.get(
					context,
					eligibleValidatorsStore.getKey(
						eligibleValidators[0].address,
						defaultValidatorAccount.totalStake,
					),
				),
			).resolves.toEqual({ lastPomHeight: 0 });
		});
	});
});
