import slots from '../../src/time/slots';

describe('slots.js', () => {
	it('should be ok', () => {
		(slots).should.be.ok();
	});

	it('should be object', () => {
		(slots).should.be.type('object');
	});

	it('should have properties', () => {
		const properties = ['interval', 'delegates', 'getTime', 'getRealTime', 'getSlotNumber', 'getSlotTime', 'getNextSlot', 'getLastSlot'];
		properties.forEach((property) => {
			(slots).should.have.property(property);
		});
	});

	describe('.interval', () => {
		const interval = slots.interval;

		it('should be ok', () => {
			(interval).should.be.ok();
		});

		it('should be number and not NaN', () => {
			(interval).should.be.type('number').and.not.NaN();
		});
	});

	describe('.delegates', () => {
		const delegates = slots.delegates;

		it('should be ok', () => {
			(delegates).should.be.ok();
		});

		it('should be number and not NaN', () => {
			(delegates).should.be.type('number').and.not.NaN();
		});
	});

	describe('#getTime', () => {
		const getTime = slots.getTime;

		it('should be ok', () => {
			(getTime).should.be.ok();
		});

		it('should be a function', () => {
			(getTime).should.be.type('function');
		});

		it('should return epoch time as number, equal to 10', () => {
			const d = 1464109210000;
			const time = getTime(d);

			(time).should.be.type('number').and.equal(10);
		});
	});

	describe('#getTimeWithOffset', () => {
		const getTimeWithOffset = slots.getTimeWithOffset;
		const now = new Date(1464109210000);
		let clock;

		before(() => {
			clock = sinon.useFakeTimers(now, 'Date');
		});

		after(() => {
			clock.restore();
		});

		it('should be ok', () => {
			(getTimeWithOffset).should.be.ok();
		});

		it('should be a function', () => {
			(getTimeWithOffset).should.be.type('function');
		});

		it('should call getTime using the offset', () => {
			const offset = -3;

			const time = getTimeWithOffset(offset);

			(time).should.be.type('number').and.equal(7);
		});

		it('should handle undefined offset', () => {
			const time = getTimeWithOffset();

			(time).should.be.type('number').and.equal(10);
		});
	});

	describe('#getRealTime', () => {
		const getRealTime = slots.getRealTime;

		it('should be ok', () => {
			(getRealTime).should.be.ok();
		});

		it('should be a function', () => {
			(getRealTime).should.be.type('function');
		});

		it('should return return real time, convert 10 to 1464109210000', () => {
			const d = 10;
			const real = getRealTime(d);

			(real).should.be.ok();
			(real).should.be.type('number').and.equal(1464109210000);
		});

		it('should return real time, even when undefined input', () => {
			const getRealTimeOutput = getRealTime(undefined);

			(getRealTimeOutput).should.be.ok();
		});
	});

	describe('#getSlotNumber', () => {
		const getSlotNumber = slots.getSlotNumber;

		it('should be ok', () => {
			(getSlotNumber).should.be.ok();
		});

		it('should be a function', () => {
			(getSlotNumber).should.be.type('function');
		});

		it('should return slot number, equal to 1', () => {
			const slot = getSlotNumber(10);

			(slot).should.be.type('number').and.equal(1);
		});
	});

	describe('#getSlotTime', () => {
		const getSlotTime = slots.getSlotTime;

		it('should be ok', () => {
			(getSlotTime).should.be.ok();
		});

		it('should be function', () => {
			(getSlotTime).should.be.type('function');
		});

		it('should return slot time number, equal to ', () => {
			const slot = 19614;
			const slotTime = getSlotTime(slot);

			(slotTime).should.be.ok();
			(slotTime).should.be.type('number').and.equal(196140);
		});
	});

	describe('#getNextSlot', () => {
		const getNextSlot = slots.getNextSlot;

		it('should be ok', () => {
			(getNextSlot).should.be.ok();
		});

		it('should be function', () => {
			(getNextSlot).should.be.type('function');
		});

		it('should return next slot number', () => {
			const nextSlot = getNextSlot();

			(nextSlot).should.be.ok();
			(nextSlot).should.be.type('number').and.not.NaN();
		});
	});

	describe('#getLastSlot', () => {
		const getLastSlot = slots.getLastSlot;

		it('should be ok', () => {
			(getLastSlot).should.be.ok();
		});

		it('should be function', () => {
			(getLastSlot).should.be.type('function');
		});

		it('should return last slot number', () => {
			const lastSlot = getLastSlot(slots.getNextSlot());

			(lastSlot).should.be.ok();
			(lastSlot).should.be.type('number').and.not.NaN();
		});
	});
});
