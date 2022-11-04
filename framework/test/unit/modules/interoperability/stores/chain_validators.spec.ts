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

import { utils as cryptoUtils } from '@liskhq/lisk-cryptography';
import { StoreGetter } from '../../../../../src';
import {
	ChainValidatorsStore,
	updateActiveValidators,
} from '../../../../../src/modules/interoperability/stores/chain_validators';
import * as chainValidators from '../../../../../src/modules/interoperability/stores/chain_validators';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { createStoreGetter } from '../../../../../src/testing/utils';

describe('ChainValidatorsStore', () => {
	let context: StoreGetter;
	let chainValidatorsStore: ChainValidatorsStore;

	const chainID = Buffer.from([0, 0, 0, 0]);

	beforeEach(async () => {
		context = createStoreGetter(new PrefixedStateReadWriter(new InMemoryPrefixedStateDB()));
		chainValidatorsStore = new ChainValidatorsStore('interoperability');
		await chainValidatorsStore.set(context, chainID, {
			certificateThreshold: BigInt(99),
			activeValidators: new Array(5).fill(0).map(() => ({
				bftWeight: BigInt(1),
				blsKey: cryptoUtils.getRandomBytes(48),
			})),
		});
	});

	describe('updateActiveValidators', () => {
		const validator1 = {
			blsKey: cryptoUtils.getRandomBytes(48),
			bftWeight: BigInt(1),
		};
		const validator2 = {
			blsKey: cryptoUtils.getRandomBytes(48),
			bftWeight: BigInt(2),
		};
		const activeValidators = [validator1, validator2];

		it('should update the existing validator bftWeight with the updated one', () => {
			const activeValidatorsUpdate = [validator1, { ...validator2, bftWeight: BigInt(3) }];

			expect(updateActiveValidators(activeValidators, activeValidatorsUpdate)).toEqual(
				activeValidatorsUpdate,
			);
		});

		it('should add a validator with its bftWeight in lexicographical order', () => {
			const activeValidatorsUpdate = [
				validator1,
				validator2,
				{ blsKey: cryptoUtils.getRandomBytes(48), bftWeight: BigInt(1) },
			];

			// Should be in lexicographical order
			activeValidatorsUpdate.sort((v1, v2) => v1.blsKey.compare(v2.blsKey));

			expect(updateActiveValidators(activeValidators, activeValidatorsUpdate)).toEqual(
				activeValidatorsUpdate,
			);
		});

		it('should remove a validator when its bftWeight=0', () => {
			const activeValidatorsLocal = [...activeValidators];
			const validator3 = { blsKey: cryptoUtils.getRandomBytes(48), bftWeight: BigInt(3) };
			activeValidatorsLocal.push(validator3);
			const activeValidatorsUpdate = [
				validator1,
				validator2,
				{ ...validator3, bftWeight: BigInt(0) },
			];
			const updatedValidators = updateActiveValidators(
				activeValidatorsLocal,
				activeValidatorsUpdate,
			);

			const validator3Exists = updatedValidators.some(v => v.blsKey.equals(validator3.blsKey));
			expect(validator3Exists).toEqual(false);
		});
	});

	describe('updateValidators', () => {
		it('should update the validators and certificate threshold to new information', async () => {
			const newValidators = new Array(5).fill(0).map(() => ({
				bftWeight: BigInt(1),
				blsKey: cryptoUtils.getRandomBytes(48),
			}));
			jest.spyOn(chainValidators, 'updateActiveValidators').mockReturnValue(newValidators);
			await chainValidatorsStore.updateValidators(context, chainID, {
				certificateThreshold: BigInt(65),
				activeValidators: newValidators,
			});

			const updated = await chainValidatorsStore.get(context, chainID);
			expect(updated.certificateThreshold).toEqual(BigInt(65));
			expect(updated.activeValidators).toEqual(newValidators);
		});
	});
});
