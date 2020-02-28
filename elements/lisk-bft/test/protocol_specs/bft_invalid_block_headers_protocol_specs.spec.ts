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
import * as invalidBlockHeaderSpec from '../bft_specs/bft_invalid_block_headers.json';

import { FinalityManager } from '../../src/finality_manager';
import { StateStoreMock } from '../unit/state_store_mock';

describe('FinalityManager', () => {
	describe('addBlockHeader', () => {
		let chainStub: {
			dataAccess: {
				getBlockHeadersByHeightBetween: jest.Mock;
				getLastBlockHeader: jest.Mock;
			};
			slots: {
				getSlotNumber: jest.Mock;
				isWithinTimeslot: jest.Mock;
				getEpochTime: jest.Mock;
			};
		};
		let dposStub: {
			getMinActiveHeight: jest.Mock;
		};
		let stateStore: StateStoreMock;

		beforeEach(async () => {
			chainStub = {
				dataAccess: {
					getBlockHeadersByHeightBetween: jest.fn().mockResolvedValue([]),
					getLastBlockHeader: jest.fn().mockResolvedValue([]),
				},
				slots: {
					getSlotNumber: jest.fn(),
					isWithinTimeslot: jest.fn(),
					getEpochTime: jest.fn(),
				},
			};
			dposStub = {
				getMinActiveHeight: jest.fn(),
			};
			stateStore = new StateStoreMock();
		});

		invalidBlockHeaderSpec.testCases.forEach(testCase => {
			it('should fail adding invalid block header', async () => {
				// Arrange
				const finalityManager = new FinalityManager({
					chain: chainStub,
					dpos: dposStub,
					finalizedHeight: invalidBlockHeaderSpec.config.finalizedHeight,
					activeDelegates: invalidBlockHeaderSpec.config.activeDelegates,
				});
				for (const blockHeader of testCase.config.blockHeaders) {
					when(dposStub.getMinActiveHeight)
						.calledWith(blockHeader.height, blockHeader.generatorPublicKey)
						.mockResolvedValue(blockHeader.delegateMinHeightActive);
				}
				chainStub.dataAccess.getBlockHeadersByHeightBetween.mockResolvedValue(
					testCase.config.blockHeaders,
				);

				// Act & Assert
				await expect(
					finalityManager.addBlockHeader(testCase.input as any, stateStore),
				).rejects.toThrow();
			});
		});
	});
});
