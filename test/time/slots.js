/*
 * Copyright © 2017 Lisk Foundation
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
 *
 */
import slots from '../../src/time/slots';

describe('slots module', () => {
	const nowRealTime = 1464109220000;
	const nowEpochTime = 20;
	let clock;

	before(() => {
		clock = sinon.useFakeTimers(nowRealTime, 'Date');
	});

	after(() => {
		clock.restore();
	});

	describe('exports', () => {
		it('should be an object', () => {
			(slots).should.be.type('object');
		});

		it('should export interval number', () => {
			(slots).should.have.property('interval').be.type('number').and.not.be.NaN();
		});

		it('should export delegates number', () => {
			(slots).should.have.property('delegates').be.type('number').and.not.be.NaN();
		});

		it('should export getTime function', () => {
			(slots).should.have.property('getTime').be.type('function');
		});

		it('should export getTimeWithOffset function', () => {
			(slots).should.have.property('getTimeWithOffset').be.type('function');
		});

		it('should export getRealTime function', () => {
			(slots).should.have.property('getRealTime').be.type('function');
		});

		it('should export getSlotNumber function', () => {
			(slots).should.have.property('getSlotNumber').be.type('function');
		});

		it('should export getSlotTime function', () => {
			(slots).should.have.property('getSlotTime').be.type('function');
		});

		it('should export getNextSlot function', () => {
			(slots).should.have.property('getNextSlot').be.type('function');
		});

		it('should export getLastSlot function', () => {
			(slots).should.have.property('getLastSlot').be.type('function');
		});
	});

	describe('#getTime', () => {
		const { getTime } = slots;

		it('should return current time as number', () => {
			const time = getTime();

			(time).should.be.equal(nowEpochTime);
		});

		it('should return epoch time for provided time as number, equal to 10', () => {
			const realTime = 1464109210001;
			const time = getTime(realTime);

			(time).should.be.equal(10);
		});
	});

	describe('#getTimeWithOffset', () => {
		const { getTimeWithOffset } = slots;

		it('should get time with undefined offset', () => {
			const time = getTimeWithOffset();

			(time).should.be.equal(nowEpochTime);
		});

		it('should get time with positive offset', () => {
			const offset = 3;
			const time = getTimeWithOffset(offset);

			(time).should.be.equal(23);
		});

		it('should get time with negative offset', () => {
			const offset = -3;
			const time = getTimeWithOffset(offset);

			(time).should.be.equal(17);
		});
	});

	describe('#getRealTime', () => {
		const { getRealTime } = slots;

		it('should return real current time for undefined input', () => {
			const realTime = getRealTime();

			(realTime).should.be.equal(nowRealTime);
		});

		it('should return return real time, convert 10 to 1464109210000', () => {
			const realTime = getRealTime(10);

			(realTime).should.be.equal(1464109210000);
		});
	});

	describe('#getSlotNumber', () => {
		const { getSlotNumber } = slots;

		it('should return slot number for undefined input', () => {
			const slot = getSlotNumber();

			(slot).should.be.equal(2);
		});

		it('should return slot number, equal to 1', () => {
			const slot = getSlotNumber(10);

			(slot).should.be.equal(1);
		});
	});

	describe('#getSlotTime', () => {
		const { getSlotTime } = slots;

		it('should return slot time number, equal to 196140', () => {
			const slotTime = getSlotTime(19614);

			(slotTime).should.be.equal(196140);
		});
	});

	describe('#getNextSlot', () => {
		const { getNextSlot } = slots;
		const currentSlot = 2;

		it('should return next slot number', () => {
			const nextSlot = getNextSlot();

			(nextSlot).should.be.equal(currentSlot + 1);
		});
	});

	describe('#getLastSlot', () => {
		const { getLastSlot } = slots;

		it('should return last slot number', () => {
			const nextSlot = 1337;
			const lastSlot = getLastSlot(nextSlot);

			(lastSlot).should.be.equal(nextSlot + slots.delegates);
		});
	});
});
