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

import * as invalidBlockHeaderSpec from '../bft_specs/bft_invalid_block_headers.json';

import { FinalityManager } from '../../src/finality_manager';

describe('FinalityManager', () => {
	describe('addBlockHeader', () => {
		invalidBlockHeaderSpec.testCases.forEach(testCase => {
			it('should fail adding invalid block header', async () => {
				// Arrange
				const finalityManager = new FinalityManager({
					finalizedHeight: invalidBlockHeaderSpec.config.finalizedHeight,
					activeDelegates: invalidBlockHeaderSpec.config.activeDelegates,
				});
				testCase.config.blockHeaders.forEach(blockHeader => {
					finalityManager.addBlockHeader(blockHeader);
				});

				// Arrange - Verify initial state is set
				expect(finalityManager.headers).toHaveLength(
					testCase.config.blockHeaders.length,
				);

				// Act & Assert
				expect(() => finalityManager.addBlockHeader(testCase.input)).toThrow();
				expect(finalityManager.headers).toHaveLength(
					testCase.output.blockHeaders.length,
				);
			});
		});
	});
});
