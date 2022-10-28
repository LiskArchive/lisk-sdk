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

import { StoreGetter } from '../../../../../src/modules/base_store';
import { EligibleDelegatesStore } from '../../../../../src/modules/dpos_v2/stores/eligible_delegates';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { createStoreGetter } from '../../../../../src/testing/utils';

describe('EligibleDelegatesStore', () => {
	let stateStore: PrefixedStateReadWriter;
	let eligibleDelegatesStore: EligibleDelegatesStore;
	let context: StoreGetter;
	const storeKeys = [];
	const eligibleDelegates = [
		{
			address: Buffer.from('fa1c00809ff1b10cd269a711eef40a465ba4a9cb'),
			delegateWeight: BigInt(10),
			lastPomHeight: 278,
		},
		{
			address: Buffer.from('e81fa3d9650e6427c2e35c6b41c249589e5da84c'),
			delegateWeight: BigInt(11),
			lastPomHeight: 478,
		},
		{
			address: Buffer.from('14b23e2adad2afd2990bc80907989d96ee20cff6'),
			delegateWeight: BigInt(12),
			lastPomHeight: 978,
		},
	];

	beforeEach(async () => {
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		context = createStoreGetter(stateStore);
		eligibleDelegatesStore = new EligibleDelegatesStore('dpos');
		for (const eligibleDelegate of eligibleDelegates) {
			const key = eligibleDelegatesStore.getKey(
				eligibleDelegate.address,
				eligibleDelegate.delegateWeight,
			);
			storeKeys.push(key);
			await eligibleDelegatesStore.set(context, key, {
				lastPomHeight: eligibleDelegate.lastPomHeight,
			});
		}
	});

	describe('getTop', () => {
		it('should get keys and values for top n delegates in order of delegate weight', async () => {
			const returnedValue = await eligibleDelegatesStore.getTop(context, 2);

			expect(returnedValue).toHaveLength(2);
			expect(returnedValue[0].value.lastPomHeight).toEqual(978);
			expect(returnedValue[1].value.lastPomHeight).toEqual(478);
		});
	});

	describe('getAll', () => {
		it('should get all keys and values in correct order', async () => {
			const returnedValue = await eligibleDelegatesStore.getAll(context);

			expect(returnedValue).toHaveLength(3);
			expect(returnedValue[0].value.lastPomHeight).toEqual(978);
			expect(returnedValue[2].value.lastPomHeight).toEqual(278);
		});
	});
});
