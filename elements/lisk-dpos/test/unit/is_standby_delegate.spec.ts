/*
 * Copyright © 2020 Lisk Foundation
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
import {
	generateDelegateLists,
	generateDelegateListsWithStandby,
} from '../utils/delegates';
import {
	ACTIVE_DELEGATES,
	EPOCH_TIME,
	BLOCK_TIME,
	DELEGATE_LIST_ROUND_OFFSET,
} from '../fixtures/constants';
import * as delegatePublicKeys from '../fixtures/delegate_publickeys.json';
import { Dpos } from '../../src';
import { Slots } from '@liskhq/lisk-chain';
import { ForgersList } from '../../src/types';
import { StateStoreMock } from '../utils/state_store_mock';
import { CONSENSUS_STATE_FORGERS_LIST_KEY } from '../../src/constants';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';

const createStateStore = (list: ForgersList = []) => {
	return new StateStoreMock([], {
		[CONSENSUS_STATE_FORGERS_LIST_KEY]: JSON.stringify(list),
	});
};

describe('dpos.isStandbyDelegate', () => {
	let dpos: Dpos;
	const defaultPublicKey = delegatePublicKeys[0];
	const defaultAddress = getAddressFromPublicKey(defaultPublicKey);
	const delegateListRoundOffset = DELEGATE_LIST_ROUND_OFFSET;

	beforeEach(() => {
		// Arrange
		const slots = new Slots({ epochTime: EPOCH_TIME, interval: BLOCK_TIME });
		const chain = {
			slots,
		};

		dpos = new Dpos({
			chain: chain as any,
			activeDelegates: ACTIVE_DELEGATES,
			delegateListRoundOffset,
		});
	});

	describe('When a block is the latest block', () => {
		// Arrange
		const standByAddress = getAddressFromPublicKey(delegatePublicKeys[1]);
		const activeRounds = [17, 14, 11];
		// Height in round 17
		const height = 17 * ACTIVE_DELEGATES;

		it('should return true if its a standby delegate', async () => {
			const lists = generateDelegateListsWithStandby({
				address: standByAddress,
				activeRounds,
			});

			// Act
			const isStandby = await dpos.isStandByDelegate(
				standByAddress,
				height,
				createStateStore(lists),
			);
			// Assert
			expect(isStandby).toEqual(true);
		});

		it('should return false if a delegate is not present', async () => {
			const lists = generateDelegateLists({
				address: defaultAddress,
				activeRounds,
			});

			// Act
			const isStandby = await dpos.isStandByDelegate(
				standByAddress,
				height,
				createStateStore(lists),
			);
			// Assert
			expect(isStandby).toEqual(false);
		});

		it('should return false if a delegate is an active delegate', async () => {
			const lists = generateDelegateLists({
				address: defaultAddress,
				activeRounds,
			});

			// Act
			const isStandby = await dpos.isStandByDelegate(
				defaultAddress,
				height,
				createStateStore(lists),
			);
			// Assert
			expect(isStandby).toEqual(false);
		});
	});

	describe('When the latest block is 3 rounds old', () => {
		// Arrange
		const standByAddress = getAddressFromPublicKey(delegatePublicKeys[1]);
		const activeRounds = [16, 15, 14];
		// Height in round 17
		const height = 14 * ACTIVE_DELEGATES;

		it('should return true if its a standby delegate', async () => {
			const lists = generateDelegateListsWithStandby({
				address: standByAddress,
				activeRounds,
			});

			// Act
			const isStandby = await dpos.isStandByDelegate(
				standByAddress,
				height,
				createStateStore(lists),
			);
			// Assert
			expect(isStandby).toEqual(true);
		});

		it('should return false if a delegate does not exist', async () => {
			const lists = generateDelegateLists({
				address: defaultAddress,
				activeRounds,
			});

			// Act
			const isStandby = await dpos.isStandByDelegate(
				standByAddress,
				height,
				createStateStore(lists),
			);
			// Assert
			expect(isStandby).toEqual(false);
		});

		it('should return false if its an active delegate', async () => {
			const lists = generateDelegateLists({
				address: defaultAddress,
				activeRounds,
			});

			// Act
			const isStandby = await dpos.isStandByDelegate(
				defaultAddress,
				height,
				createStateStore(lists),
			);
			// Assert
			expect(isStandby).toEqual(false);
		});
	});
});
