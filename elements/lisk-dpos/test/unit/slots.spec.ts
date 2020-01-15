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

import { Slots } from '../../src';

import {
	EPOCH_TIME,
	BLOCK_TIME,
	ACTIVE_DELEGATES,
} from '../fixtures/constants';

describe('Slots', () => {
	let slots: Slots;

	beforeEach(async () => {
		slots = new Slots({
			epochTime: EPOCH_TIME,
			interval: BLOCK_TIME,
			blocksPerRound: ACTIVE_DELEGATES,
		});
	});

	describe('calc', () => {
		it('should calculate round number from given block height', async () => {
			expect(slots.calcRound(100)).toEqual(1);
			expect(slots.calcRound(200)).toEqual(2);
			expect(slots.calcRound(303)).toEqual(3);
			return expect(slots.calcRound(304)).toEqual(4);
		});

		it('should calculate round number from Number.MAX_VALUE', async () => {
			const res = slots.calcRound(Number.MAX_VALUE);
			expect(typeof res === 'number').toBe(true);
			return expect(res).toBeLessThan(Number.MAX_VALUE);
		});
	});
});
