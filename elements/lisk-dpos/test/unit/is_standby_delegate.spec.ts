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
import { Slots } from '@liskhq/lisk-chain';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { forgerListSchema } from '../../src/schemas';
import {
	generateDelegateLists,
	generateDelegateListsWithStandby,
} from '../utils/delegates';
import {
	ACTIVE_DELEGATES,
	BLOCK_TIME,
	DELEGATE_LIST_ROUND_OFFSET,
} from '../fixtures/constants';
import * as delegatePublicKeys from '../fixtures/delegate_publickeys.json';
import { Dpos } from '../../src';
import { ForgersList } from '../../src/types';
import { StateStoreMock } from '../utils/state_store_mock';
import { CONSENSUS_STATE_DELEGATE_FORGERS_LIST } from '../../src/constants';

const MS_IN_A_SEC = 1000;
const GENESIS_BLOCK_TIMESTAMP =
	new Date(Date.UTC(2020, 5, 15, 0, 0, 0, 0)).getTime() / MS_IN_A_SEC;

const createStateStore = (list: ForgersList = []): StateStoreMock => {
	const binaryForgerList = codec.encode(forgerListSchema, {
		forgersList: list,
	});

	return new StateStoreMock([], {
		[CONSENSUS_STATE_DELEGATE_FORGERS_LIST]: binaryForgerList,
	});
};

describe('dpos.isStandbyDelegate', () => {
	let dpos: Dpos;
	const defaultAddress = getAddressFromPublicKey(
		Buffer.from(delegatePublicKeys[0], 'hex'),
	);
	const delegateListRoundOffset = DELEGATE_LIST_ROUND_OFFSET;

	beforeEach(() => {
		// Arrange
		const slots = new Slots({
			genesisBlockTimestamp: GENESIS_BLOCK_TIMESTAMP,
			interval: BLOCK_TIME,
		});
		const chain = {
			slots,
		};

		const initDelegates = delegatePublicKeys.map(pk =>
			getAddressFromPublicKey(Buffer.from(pk, 'hex')),
		);
		dpos = new Dpos({
			chain: chain as any,
			activeDelegates: ACTIVE_DELEGATES,
			initDelegates,
			genesisBlockHeight: 0,
			initRound: 3,
			delegateListRoundOffset,
		});
	});

	describe('When a block is the latest block', () => {
		// Arrange
		const standByAddress = getAddressFromPublicKey(
			Buffer.from(delegatePublicKeys[1], 'hex'),
		);
		const activeRounds = [17, 14, 11];
		// Height in round 17
		const height = 17 * ACTIVE_DELEGATES;

		it('should return true if it is a standby delegate', async () => {
			const lists = generateDelegateListsWithStandby({
				address: standByAddress,
				activeRounds,
			});

			// Act
			const isStandby = await dpos.isStandbyDelegate(
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
			const isStandby = await dpos.isStandbyDelegate(
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
			const isStandby = await dpos.isStandbyDelegate(
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
		const standByAddress = getAddressFromPublicKey(
			Buffer.from(delegatePublicKeys[1], 'hex'),
		);
		const activeRounds = [16, 15, 14];
		// Height in round 17
		const height = 14 * ACTIVE_DELEGATES;

		it('should return true if its a standby delegate', async () => {
			const lists = generateDelegateListsWithStandby({
				address: standByAddress,
				activeRounds,
			});

			// Act
			const isStandby = await dpos.isStandbyDelegate(
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
			const isStandby = await dpos.isStandbyDelegate(
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
			const isStandby = await dpos.isStandbyDelegate(
				defaultAddress,
				height,
				createStateStore(lists),
			);
			// Assert
			expect(isStandby).toEqual(false);
		});
	});
});
