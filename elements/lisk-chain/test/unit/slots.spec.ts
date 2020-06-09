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

import { Slots } from '../../src/slots';

describe('Slots', () => {
	const DEFAULT_BLOCK_TIME = 10;
	const SEC_IN_MS = 1000;
	const DEFAULT_TIME = new Date(2020, 5, 9, 11, 0, 0, 0).toISOString();

	const slots = new Slots({
		interval: DEFAULT_BLOCK_TIME,
	});

	beforeEach(() => {
		jest.spyOn(Date, 'now').mockReturnValue(new Date(DEFAULT_TIME).getTime());
	});

	describe('getRealTime', () => {
		it('should return time after epoch in second', () => {
			expect(slots.getRealTime(new Date(DEFAULT_TIME).getTime())).toBe(
				new Date(DEFAULT_TIME).getTime() * 1000,
			);
		});
	});

	describe('getSlotNumber', () => {
		it('should return correct slot number from default epoch', () => {
			expect(slots.getSlotNumber()).toBe(
				new Date(DEFAULT_TIME).getTime() / SEC_IN_MS / DEFAULT_BLOCK_TIME,
			);
		});

		it('should return correct slot number from input epoch', () => {
			expect(slots.getSlotNumber(20)).toBe(2);
		});
	});

	describe('getSlotTime', () => {
		it('should return correct time corresponds to the slot', () => {
			expect(slots.getSlotTime(2)).toBe(20);
		});
	});

	describe('getNextSlot', () => {
		it('should return correct next slot', () => {
			const expectedNextSlot =
				new Date(DEFAULT_TIME).getTime() / SEC_IN_MS / DEFAULT_BLOCK_TIME + 1;
			expect(slots.getNextSlot()).toBe(expectedNextSlot);
		});
	});

	describe('isWithinTimeslot', () => {
		it('should return true if the slot is within time', () => {
			expect(slots.isWithinTimeslot(5, 55)).toBeTrue();
		});

		it('should return true if the slot is begining of the time', () => {
			expect(slots.isWithinTimeslot(5, 50)).toBeTrue();
		});

		it('should return true if the slot is end of the time', () => {
			expect(slots.isWithinTimeslot(5, 59)).toBeTrue();
		});

		it('should return false if the slot is out of the time', () => {
			expect(slots.isWithinTimeslot(5, 49)).toBeFalse();
		});
	});
});
