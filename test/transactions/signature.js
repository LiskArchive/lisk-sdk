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
		const emptyStringPublicKey = 'be907b4bac84fee5ce8811db2defc9bf0b2a2a2bbc3d54d8a2257ecd70441962';
		let sgn = null;

		it('should be function', () => {
			(createSignature).should.be.type('function');
		});

		it('should create signature transaction', () => {
			sgn = createSignature('secret', 'second secret');
			(sgn).should.be.ok();
			(sgn).should.be.type('object');
		});

		it('should create signature transaction with empty string', () => {
			sgn = createSignature('secret', '');
			(sgn).should.be.ok();
			(sgn).should.be.type('object');
			(sgn.asset.signature.publicKey).should.be.eql(emptyStringPublicKey);
		});

		describe('timestamp', () => {
			const timeWithOffset = 38350076;
			let stub;

			beforeEach(() => {
				stub = sinon.stub(slots, 'getTimeWithOffset').returns(timeWithOffset);
			});

			afterEach(() => {
				stub.restore();
			});

			it('should use time slots to get the time for the timestamp', () => {
				sgn = createSignature('secret', 'second secret');
				(sgn).should.have.property('timestamp').and.be.equal(timeWithOffset);
				(stub.calledWithExactly(undefined)).should.be.true();
			});

			it('should use time slots with an offset of -10 seconds to get the time for the timestamp', () => {
				const offset = -10;

				sgn = createSignature('secret', 'second secret', offset);

				(sgn).should.have.property('timestamp').and.be.equal(timeWithOffset);
				(stub.calledWithExactly(offset)).should.be.true();
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

		describe('should not have signSignature itself', () => {
			it('should not have signSignature property', () => {
				const sign = createSignature('secret', 'second secret');
				(sign).should.not.have.property('signSignature');
			});
		});
	});
});
