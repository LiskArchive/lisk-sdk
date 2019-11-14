/*
 * Copyright © 2019 Lisk Foundation
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

'use strict';

const { when } = require('jest-when');
const { Dpos, Slots } = require('../../../../../../../src/modules/chain/dpos');
const { constants } = require('../../../../../utils');

describe('dpos.getMinActiveHeightsOfDelegates()', () => {
	const stubs = {};
	let dpos;
	let slots;
	beforeEach(() => {
		// Arrange
		stubs.storage = {
			entities: {
				RoundDelegates: {
					get: jest.fn(),
				},
			},
		};

		stubs.logger = {
			debug: jest.fn(),
			log: jest.fn(),
			error: jest.fn(),
		};

		stubs.tx = jest.fn();

		slots = new Slots({
			epochTime: constants.EPOCH_TIME,
			interval: constants.BLOCK_TIME,
			blocksPerRound: constants.ACTIVE_DELEGATES,
		});

		dpos = new Dpos({
			...stubs,
			slots,
			activeDelegates: constants.ACTIVE_DELEGATES,
			delegateListRoundOffset: constants.DELEGATE_LIST_ROUND_OFFSET,
		});
	});

	describe('Given a delegate was not active in previous 3 rounds', () => {
		it('should return first block height of the current round for that delegate', async () => {
			// Arrange
			const numberOfRounds = 1;
			const newDelegate = 'a';
			const delegateListRoundOffset = constants.DELEGATE_LIST_ROUND_OFFSET;
			const limit =
				numberOfRounds +
				dpos.delegateActiveRoundLimit +
				delegateListRoundOffset;
			const activeRound = 9;

			const lists = [...Array(limit)].map((_, index) => ({
				round: activeRound - index,
				delegatePublicKeys: ['x', 'y', 'z'],
			}));

			lists[delegateListRoundOffset] = {
				round: limit,
				delegatePublicKeys: [newDelegate, 'b', 'c'],
			};

			when(stubs.storage.entities.RoundDelegates.get)
				.calledWith(
					{},
					{
						sort: 'round:desc',
						limit,
					},
					stubs.tx,
				)
				.mockResolvedValue(lists);

			// Act
			const minActiveHeightsOfDelegates = await dpos.getMinActiveHeightsOfDelegates(
				1,
				{
					tx: stubs.tx,
				},
			);

			// Assert
			expect(Object.keys(minActiveHeightsOfDelegates).length <= 3).toBe(true);
			expect(minActiveHeightsOfDelegates[newDelegate]).toEqual([
				slots.calcRoundStartHeight(activeRound),
			]);
		});
	});

	describe.skip('Given a delegate was active in previous 1 round', () => {
		it(
			'should return first block height of the previous round for that delegate',
		);
	});

	describe.skip('Given a delegate was active in previous 2 round', () => {
		it(
			'should return first block height of the 2nd previous round for that delegate',
		);
	});

	describe.skip('Given a delegate was active in previous 3 round', () => {
		it(
			'should return first block height of the 3rd previous round for that delegate',
		);
	});

	describe.skip('Given a delegate was active for more than 3 round', () => {
		it(
			'should return first block height of the 3rd previous round for that delegate',
		);
	});

	describe.skip('Given activeMinHeight values are requested for more than one round', () => {
		it('should return activeMinHeight values for each delegate for each round');
	});
});
