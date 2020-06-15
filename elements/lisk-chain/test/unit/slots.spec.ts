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

const MS_IN_A_SEC = 1000;

describe('Slots', () => {
	const DEFAULT_BLOCK_TIME = 10;
	const GENESIS_BLOCK_TIMESTAMP =
		new Date(Date.UTC(2020, 5, 15, 0, 0, 0, 0)).getTime() / MS_IN_A_SEC;
	const TIME_AFTER_EPOCH = 10000;

	const slots = new Slots({
		genesisBlockTimestamp: GENESIS_BLOCK_TIMESTAMP,
		interval: DEFAULT_BLOCK_TIME,
	});

	beforeEach(() => {
		jest
			.spyOn(Date, 'now')
			.mockReturnValue(
				new Date(GENESIS_BLOCK_TIMESTAMP * MS_IN_A_SEC).getTime() +
					TIME_AFTER_EPOCH,
			);
	});

	describe('timeSinceGenesis', () => {
		it('should return time after epoch in second', () => {
			expect(slots.timeSinceGenesis()).toBe(10);
		});
	});

	describe('getSlotNumber', () => {
		it('should return correct slot number from default epoch', () => {
			expect(slots.getSlotNumber()).toBe(1);
		});

		it('should return correct slot number from input epoch', () => {
			const time =
				new Date(GENESIS_BLOCK_TIMESTAMP * MS_IN_A_SEC).getTime() +
				TIME_AFTER_EPOCH * 2;
			expect(slots.getSlotNumber(time / MS_IN_A_SEC)).toBe(2);
		});
	});

	describe('getSlotTime', () => {
		it('should return correct time corresponds to the slot', () => {
			const time =
				new Date(GENESIS_BLOCK_TIMESTAMP * MS_IN_A_SEC).getTime() +
				TIME_AFTER_EPOCH * 2;
			expect(slots.getSlotTime(2)).toBe(time);
		});
	});

	describe('getNextSlot', () => {
		it('should return correct next slot', () => {
			expect(slots.getNextSlot()).toBe(2);
		});
	});

	describe('isWithinTimeslot', () => {
		it('should return true if the slot is within time', () => {
			const time =
				new Date(GENESIS_BLOCK_TIMESTAMP * MS_IN_A_SEC).getTime() +
				TIME_AFTER_EPOCH * 5;
			const slot = slots.getSlotNumber(time / MS_IN_A_SEC);
			expect(slots.isWithinTimeslot(slot, time / MS_IN_A_SEC)).toBeTrue();
		});

		it('should return true if the slot is begining of the time', () => {
			const time =
				new Date(GENESIS_BLOCK_TIMESTAMP * MS_IN_A_SEC).getTime() +
				TIME_AFTER_EPOCH * 5;
			const slot = slots.getSlotNumber(time / MS_IN_A_SEC);
			expect(slots.isWithinTimeslot(slot, time / MS_IN_A_SEC + 5)).toBeTrue();
		});

		it('should return true if the slot is end of the time', () => {
			const time =
				new Date(GENESIS_BLOCK_TIMESTAMP * MS_IN_A_SEC).getTime() +
				TIME_AFTER_EPOCH * 5;
			const slot = slots.getSlotNumber(time / MS_IN_A_SEC);
			expect(slots.isWithinTimeslot(slot, time / MS_IN_A_SEC + 9)).toBeTrue();
		});

		it('should return false if the slot is out of the time', () => {
			const time =
				new Date(GENESIS_BLOCK_TIMESTAMP * MS_IN_A_SEC).getTime() +
				TIME_AFTER_EPOCH * 5;
			const slot = slots.getSlotNumber(time / MS_IN_A_SEC);
			expect(slots.isWithinTimeslot(slot, time / MS_IN_A_SEC - 1)).toBeFalse();
		});
	});
});
