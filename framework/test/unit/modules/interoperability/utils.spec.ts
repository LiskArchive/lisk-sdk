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

import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { updateActiveValidators } from '../../../../src/modules/interoperability/utils';

describe('Utils', () => {
	describe('updateActiveValidators', () => {
		const validator1 = {
			blsKey: getRandomBytes(48),
			bftWeight: BigInt(1),
		};
		const validator2 = {
			blsKey: getRandomBytes(48),
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
				{ blsKey: getRandomBytes(48), bftWeight: BigInt(1) },
			];

			// Should be in lexicographical order
			activeValidatorsUpdate.sort((v1, v2) => v1.blsKey.compare(v2.blsKey));

			expect(updateActiveValidators(activeValidators, activeValidatorsUpdate)).toEqual(
				activeValidatorsUpdate,
			);
		});

		it('should remove a validator when its bftWeight=0', () => {
			const activeValidatorsLocal = [...activeValidators];
			const validator3 = { blsKey: getRandomBytes(48), bftWeight: BigInt(3) };
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
});
