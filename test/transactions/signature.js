import slots from '../../src/time/slots';
import signature from '../../src/transactions/signature';

describe('signature.js', () => {
	it('should be ok', () => {
		(signature).should.be.ok();
	});

	it('should be object', () => {
		(signature).should.be.type('object');
	});

	it('should have properties', () => {
		(signature).should.have.property('createSignature');
	});

	describe('#createSignature', () => {
		const createSignature = signature.createSignature;
		let sgn = null;

		it('should be function', () => {
			(createSignature).should.be.type('function');
		});

		it('should create signature transaction', () => {
			sgn = createSignature('secret', 'second secret');
			(sgn).should.be.ok();
			(sgn).should.be.type('object');
		});

		describe('timestamp', () => {
			const now = new Date();
			let clock;

			beforeEach(() => {
				clock = sinon.useFakeTimers(now, 'Date');
			});

			afterEach(() => {
				clock.restore();
			});

			it('should use time slots to get the time for the timestamp', () => {
				sgn = createSignature('secret', 'second secret');
				(sgn).should.have.property('timestamp').and.be.equal(slots.getTime());
			});

			it('should use time slots with an offset of -10 seconds to get the time for the timestamp', () => {
				const offset = -10;

				sgn = createSignature('secret', 'second secret', offset);

				(sgn).should.have.property('timestamp').and.be.equal(slots.getTime() + offset);
			});
		});

		describe('returned signature transaction', () => {
			it('should have empty recipientId', () => {
				(sgn).should.have.property('recipientId').equal(null);
			});

			it('should have amount equal 0', () => {
				(sgn.amount).should.be.type('number').equal(0);
			});

			it('should have asset', () => {
				(sgn.asset).should.be.type('object');
				(sgn.asset).should.be.not.empty();
			});

			it('should have signature inside asset', () => {
				(sgn.asset).should.have.property('signature');
			});

			describe('signature asset', () => {
				it('should be ok', () => {
					(sgn.asset.signature).should.be.ok();
				});

				it('should be object', () => {
					(sgn.asset.signature).should.be.type('object');
				});

				it('should have publicKey property', () => {
					(sgn.asset.signature).should.have.property('publicKey');
				});

				it('should have publicKey in hex', () => {
					(sgn.asset.signature).should.have.property('publicKey').and.be.type('string').and.be.hexString();
				});

				it('should have publicKey in 32 bytes', () => {
					const publicKey = Buffer.from(sgn.asset.signature.publicKey, 'hex');
					(publicKey.length).should.be.equal(32);
				});
			});
		});
	});
});
