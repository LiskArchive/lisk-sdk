/*
 * Copyright © 2018 Lisk Foundation
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

import { BlockHeader } from '../../src/types';
import { BlockHeader as blockHeaderFixture } from '../fixtures/blocks';
import { validateBlockHeader } from '../../src/utils';

describe('utils', () => {
	describe('validateBlockHeader', () => {
		it('should be ok for valid headers', async () => {
			const header = blockHeaderFixture();
			expect(() => validateBlockHeader(header)).not.toThrow();
		});

		it('should throw error if any header is not valid format', async () => {
			let header: BlockHeader;

			// Setting non-integer value
			header = blockHeaderFixture({ maxHeightPreviouslyForged: 'AB1' });
			expect(() => validateBlockHeader(header)).toThrow(Error);

			// Setting non-integer value
			header = blockHeaderFixture({ maxHeightPrevoted: 'Al123' });
			expect(() => validateBlockHeader(header)).toThrow(Error);

			// Setting empty
			header = blockHeaderFixture();
			const {
				maxHeightPreviouslyForged,
				...withoutMaxHeightPreviouslyForged
			} = header;
			expect(() =>
				validateBlockHeader(withoutMaxHeightPreviouslyForged as any),
			).toThrow(Error);

			// Setting empty
			header = blockHeaderFixture();
			const { maxHeightPrevoted, ...withoutMaxHeightPrevoted } = header;
			expect(() =>
				validateBlockHeader(withoutMaxHeightPrevoted as any),
			).toThrow(Error);
		});
	});
});
