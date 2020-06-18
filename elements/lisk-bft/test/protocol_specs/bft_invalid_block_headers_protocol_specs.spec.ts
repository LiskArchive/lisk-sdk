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
import { when } from 'jest-when';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import * as invalidBlockHeaderSpec from '../bft_specs/bft_invalid_block_headers.json';

import { FinalityManager } from '../../src/finality_manager';
import { StateStoreMock } from '../utils/state_store_mock';
import { convertHeader } from '../fixtures/blocks';

describe('FinalityManager', () => {
	describe('addBlockHeader', () => {
		let dposStub: {
			getMinActiveHeight: jest.Mock;
			isStandbyDelegate: jest.Mock;
		};
		let stateStore: StateStoreMock;

		beforeEach(() => {
			dposStub = {
				getMinActiveHeight: jest.fn(),
				isStandbyDelegate: jest.fn(),
			};
			stateStore = new StateStoreMock();
		});

		invalidBlockHeaderSpec.testCases.forEach(testCase => {
			it('should fail adding invalid block header', async () => {
				// Arrange
				stateStore.consensus.lastBlockHeaders = testCase.config.blockHeaders.map(bh => convertHeader(bh));

				const finalityManager = new FinalityManager({
					dpos: dposStub,
					finalizedHeight: invalidBlockHeaderSpec.config.finalizedHeight,
					activeDelegates: invalidBlockHeaderSpec.config.activeDelegates,
				});
				for (const blockHeader of testCase.config.blockHeaders) {
					when(dposStub.getMinActiveHeight)
						.calledWith(
							blockHeader.height,
							getAddressFromPublicKey(
								Buffer.from(blockHeader.generatorPublicKey, 'hex'),
							),
						)
						.mockResolvedValue(blockHeader.delegateMinHeightActive);
				}

				// Act & Assert
				await expect(
					finalityManager.addBlockHeader(testCase.input as any, stateStore),
				).rejects.toThrow();
			});
		});
	});
});
