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

import { Rounds } from '../../src/rounds';

import { ACTIVE_DELEGATES } from '../fixtures/constants';

describe('Slots', () => {
	let rounds: Rounds;

	beforeEach(async () => {
		rounds = new Rounds({
			blocksPerRound: ACTIVE_DELEGATES,
		});
	});

	describe('calc', () => {
		it('should calculate round number from given block height', async () => {
			expect(rounds.calcRound(100)).toEqual(1);
			expect(rounds.calcRound(200)).toEqual(2);
			expect(rounds.calcRound(303)).toEqual(3);
			return expect(rounds.calcRound(304)).toEqual(4);
		});

		it('should calculate round number from Number.MAX_VALUE', async () => {
			const res = rounds.calcRound(Number.MAX_VALUE);
			expect(typeof res === 'number').toBe(true);
			return expect(res).toBeLessThan(Number.MAX_VALUE);
		});
	});
});
