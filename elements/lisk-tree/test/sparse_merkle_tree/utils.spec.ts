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

import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { sortByBitmapAndKey } from '../../src/sparse_merkle_tree/utils';
import { InclusionProofQueryResult } from '../../src/sparse_merkle_tree/types';

describe('utils', () => {
	describe('sortByBitmapAndKey', () => {
		it('should sort by longest bitmap', () => {
			const res1: InclusionProofQueryResult = {
				key: getRandomBytes(2),
				value: getRandomBytes(20),
				bitmap: getRandomBytes(1),
			};

			const res2: InclusionProofQueryResult = {
				key: getRandomBytes(2),
				value: getRandomBytes(20),
				bitmap: getRandomBytes(2),
			};

			expect(sortByBitmapAndKey([res1, res2])).toEqual([res2, res1]);
		});

		it('should sort by longest bitmap breaking tie with smaller key', () => {
			const res1: InclusionProofQueryResult = {
				key: getRandomBytes(2),
				value: getRandomBytes(20),
				bitmap: getRandomBytes(2),
			};

			const res2: InclusionProofQueryResult = {
				key: getRandomBytes(1),
				value: getRandomBytes(20),
				bitmap: getRandomBytes(2),
			};

			expect(sortByBitmapAndKey([res1, res2])).toEqual([res2, res1]);
		});

		it('should not effect sorting if same byte length of key and bitmap are same', () => {
			const res1: InclusionProofQueryResult = {
				key: getRandomBytes(2),
				value: getRandomBytes(20),
				bitmap: getRandomBytes(2),
			};

			const res2: InclusionProofQueryResult = {
				key: getRandomBytes(2),
				value: getRandomBytes(20),
				bitmap: getRandomBytes(2),
			};

			expect(sortByBitmapAndKey([res1, res2])).toEqual([res1, res2]);
		});
	});
});
