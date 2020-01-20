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
import {
	Block as blockFixture,
	BlockHeader as blockHeaderFixture,
} from '../fixtures/blocks';
import {
	extractBFTBlockHeaderFromBlock,
	validateBlockHeader,
} from '../../src/utils';

const constants = {
	ACTIVE_DELEGATES: 101,
	EPOCH_TIME: '2016-05-24T17:00:00.000Z',
	BLOCK_TIME: 10,
};

describe('utils', () => {
	describe('validateBlockHeader', () => {
		it('should be ok for valid headers', async () => {
			const header = blockHeaderFixture();
			expect(validateBlockHeader(header)).toBeTruthy();
		});

		it('should throw error if any header is not valid format', async () => {
			let header: BlockHeader;

			// Setting non-integer value
			header = blockHeaderFixture({ height: '1' });
			expect(() => validateBlockHeader(header)).toThrow(Error);

			// Setting invalid id
			header = blockHeaderFixture({ blockId: 'Al123' });
			expect(() => validateBlockHeader(header)).toThrow(Error);

			// Setting invalid public key;
			header = blockHeaderFixture({ delegatePublicKey: 'abdef' });
			expect(() => validateBlockHeader(header)).toThrow(Error);
		});
	});

	describe('extractBFTBlockHeaderFromBlock', () => {
		it('should extract particular headers for bft for block version 2', async () => {
			// Arrange,
			const block = blockFixture({ version: 2 });
			const delegateMinHeightActive = constants.ACTIVE_DELEGATES * 3 + 1;
			const {
				id: blockId,
				height,
				maxHeightPreviouslyForged,
				maxHeightPrevoted,
				generatorPublicKey: delegatePublicKey,
			} = block;
			block.delegateMinHeightActive = delegateMinHeightActive;

			const blockHeader = {
				blockId,
				height,
				maxHeightPreviouslyForged,
				maxHeightPrevoted,
				delegatePublicKey,
				delegateMinHeightActive,
			};

			expect(extractBFTBlockHeaderFromBlock(block)).toEqual(blockHeader);
		});
	});
});
