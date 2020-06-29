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

	beforeEach(() => {
		rounds = new Rounds({
			blocksPerRound: ACTIVE_DELEGATES,
			genesisBlockHeight: 50,
			initRound: 3,
		});
	});

	describe('calc', () => {
		it('should calculate round number from given block height', () => {
			expect(rounds.calcRound(100)).toEqual(1);
			expect(rounds.calcRound(200)).toEqual(2);
			expect(rounds.calcRound(303)).toEqual(3);
			return expect(rounds.calcRound(304)).toEqual(4);
		});

		it('should calculate round number from Number.MAX_VALUE', () => {
			const res = rounds.calcRound(Number.MAX_VALUE);
			expect(typeof res === 'number').toBe(true);
			return expect(res).toBeLessThan(Number.MAX_VALUE);
		});
	});

	describe('bootstrap period', () => {
		it('should return true if the height is not in the bootstrap period', () => {
			expect(rounds.isBootstrapPeriod(354)).toBeFalse();
		});

		it('should return true if the height is in bootstrap period', () => {
			expect(rounds.isBootstrapPeriod(353)).toBeTrue();
		});

		it('should return the end height of the bootstrap period', () => {
			expect(rounds.lastHeightBootstrap()).toEqual(353);
		});
	});
});
