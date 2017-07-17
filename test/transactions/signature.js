if (typeof module !== 'undefined' && module.exports) {
	var slots = require('../../lib/time/slots');
	var common = require('../common');
	var lisk = common.lisk;
}

describe('signature.js', function () {

	var signature = lisk.signature;

	it('should be ok', function () {
		(signature).should.be.ok;
	});

	it('should be object', function () {
		(signature).should.be.type('object');
	});

	it('should have properties', function () {
		(signature).should.have.property('createSignature');
	});

	describe('#createSignature', function () {

		var createSignature = signature.createSignature;
		var sgn = null;

		it('should be function', function () {
			(createSignature).should.be.type('function');
		});

		it('should create signature transaction', function () {
			sgn = createSignature('secret', 'second secret');
			(sgn).should.be.ok;
			(sgn).should.be.type('object');
		});

		it('should use time slots to get the time for the timestamp', function () {
			var now = new Date();
			var clock = sinon.useFakeTimers(now, 'Date');
			var time = 36174862;
			var stub = sinon.stub(slots, 'getTime').returns(time);

			sgn = createSignature('secret', 'second secret');
			(sgn).should.have.property('timestamp').and.be.equal(time);
			(stub.calledWithExactly(now.getTime())).should.be.true();

			stub.restore();
			clock.restore();
		});

		it('should use time slots with an offset to get the time for the timestamp', function () {
			var now = new Date();
			var clock = sinon.useFakeTimers(now, 'Date');
			var offset = 10e3;
			var time = 36174862;
			var stub = sinon.stub(slots, 'getTime').returns(time);

			sgn = createSignature('secret', 'second secret', offset);

			(sgn).should.have.property('timestamp').and.be.equal(time);
			(stub.calledWithExactly(now.getTime() - offset)).should.be.true();

			stub.restore();
			clock.restore();
		});

		describe('returned signature transaction', function () {

			it('should have empty recipientId', function () {
				(sgn).should.have.property('recipientId').equal(null);
			});

			it('should have amount equal 0', function () {
				(sgn.amount).should.be.type('number').equal(0);
			});

			it('should have asset', function () {
				(sgn.asset).should.be.type('object');
				(sgn.asset).should.be.not.empty;
			});

			it('should have signature inside asset', function () {
				(sgn.asset).should.have.property('signature');
			});

			describe('signature asset', function () {

				it('should be ok', function () {
					(sgn.asset.signature).should.be.ok;
				});

				it('should be object', function () {
					(sgn.asset.signature).should.be.type('object');
				});

				it('should have publicKey property', function () {
					(sgn.asset.signature).should.have.property('publicKey');
				});

				it('should have publicKey in hex', function () {
					(sgn.asset.signature.publicKey).should.be.type('string').and.match(function () {
						try {
							new Buffer(sgn.asset.signature.publicKey);
						} catch (e) {
							return false;
						}

						return true;
					});
				});

				it('should have publicKey in 32 bytes', function () {
					var publicKey = new Buffer(sgn.asset.signature.publicKey, 'hex');
					(publicKey.length).should.be.equal(32);
				});

			});

		});

	});

});
