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
	const DEFAULT_EPOCH_TIME = new Date(
		Date.UTC(2016, 4, 24, 17, 0, 0, 0),
	).toISOString();
	const TIME_AFTER_EPOCH = 10000;

	const slots = new Slots({
		epochTime: DEFAULT_EPOCH_TIME,
		interval: DEFAULT_BLOCK_TIME,
	});

	beforeEach(async () => {
		jest
			.spyOn(Date, 'now')
			.mockReturnValue(
				new Date(DEFAULT_EPOCH_TIME).getTime() + TIME_AFTER_EPOCH,
			);
	});

	describe('getEpochTime', () => {
		it('should return time after epoch in second', async () => {
			expect(slots.getEpochTime()).toBe(10);
		});
	});

	describe('getRealTime', () => {
		it('should return time after epoch in second', async () => {
			expect(slots.getRealTime(1000)).toBe(
				new Date(DEFAULT_EPOCH_TIME).getTime() + 1000 * 1000,
			);
		});
	});

	describe('getSlotNumber', () => {
		it('should return correct slot number from default epoch', async () => {
			expect(slots.getSlotNumber()).toBe(1);
		});

		it('should return correct slot number from input epoch', async () => {
			expect(slots.getSlotNumber(20)).toBe(2);
		});
	});

	describe('getSlotTime', () => {
		it('should return correct time corresponds to the slot', async () => {
			expect(slots.getSlotTime(2)).toBe(20);
		});
	});

	describe('getNextSlot', () => {
		it('should return correct next slot', async () => {
			expect(slots.getNextSlot()).toBe(2);
		});
	});

	describe('isWithinTimeslot', () => {
		it('should return true if the slot is within time', async () => {
			expect(slots.isWithinTimeslot(5, 55)).toBeTrue();
		});

		it('should return true if the slot is begining of the time', async () => {
			expect(slots.isWithinTimeslot(5, 50)).toBeTrue();
		});

		it('should return true if the slot is end of the time', async () => {
			expect(slots.isWithinTimeslot(5, 59)).toBeTrue();
		});

		it('should return false if the slot is out of the time', async () => {
			expect(slots.isWithinTimeslot(5, 49)).toBeFalse();
		});
	});
});
