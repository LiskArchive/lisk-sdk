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
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { dataStructures } from '@liskhq/lisk-utils';
import {
	Chain,
	Validator,
	CONSENSUS_STATE_VALIDATORS_KEY,
	validatorsSchema,
} from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import * as invalidBlockHeaderSpec from '../bft_specs/bft_invalid_block_headers.json';

import { FinalityManager } from '../../src/finality_manager';
import { StateStoreMock } from '../utils/state_store_mock';
import { convertHeader } from '../fixtures/blocks';

describe('FinalityManager', () => {
	describe('addBlockHeader', () => {
		let stateStore: StateStoreMock;
		let chainStub: Chain;

		beforeEach(() => {
			chainStub = ({
				slots: {
					getSlotNumber: jest.fn(),
					isWithinTimeslot: jest.fn(),
					timeSinceGenesis: jest.fn(),
				},
				dataAccess: {
					getConsensusState: jest.fn(),
				},
				numberOfValidators: 103,
			} as unknown) as Chain;
			stateStore = new StateStoreMock();
		});

		invalidBlockHeaderSpec.testCases.forEach(testCase => {
			it('should fail adding invalid block header', async () => {
				const validatorsMap = new dataStructures.BufferMap<Validator>();
				for (const blockHeader of testCase.config.blockHeaders) {
					const addr = getAddressFromPublicKey(Buffer.from(blockHeader.generatorPublicKey, 'hex'));
					validatorsMap.set(addr, {
						address: addr,
						isConsensusParticipant: true,
						minActiveHeight: blockHeader.delegateMinHeightActive,
					});
				}
				stateStore.consensus.set(
					CONSENSUS_STATE_VALIDATORS_KEY,
					codec.encode(validatorsSchema, { validators: validatorsMap.values() }),
				);
				// Arrange
				stateStore.chain.lastBlockHeaders = testCase.config.blockHeaders.map(bh =>
					convertHeader(bh),
				);

				const finalityManager = new FinalityManager({
					chain: chainStub,
					finalizedHeight: invalidBlockHeaderSpec.config.finalizedHeight,
					threshold: invalidBlockHeaderSpec.config.activeDelegates,
				});

				// Act & Assert
				await expect(
					finalityManager.addBlockHeader(testCase.input as any, stateStore),
				).rejects.toThrow();
			});
		});
	});
});
