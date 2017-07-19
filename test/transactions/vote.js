if (typeof module !== 'undefined' && module.exports) {
	var slots = require('../../lib/time/slots');
	var common = require('../common');
	var lisk = common.lisk;
}

describe('vote.js', function () {

	var vote = lisk.vote;

	it('should be ok', function () {
		(vote).should.be.ok;
	});

	it('should be object', function () {
		(vote).should.be.type('object');
	});

	it('should have createVote property', function () {
		(vote).should.have.property('createVote');
	});

	describe('#createVote', function () {

		var createVote = vote.createVote,
		    vt = null,
		    publicKey = lisk.crypto.getKeys('secret').publicKey,
		    publicKeys = ['+' + publicKey];

		it('should be ok', function () {
			(createVote).should.be.ok;
		});

		it('should be function', function () {
			(createVote).should.be.type('function');
		});

		it('should create vote', function () {
			vt = createVote('secret', publicKeys, 'second secret');
		});

		it('should use time slots to get the time for the timestamp', function () {
			var now = new Date();
			var clock = sinon.useFakeTimers(now, 'Date');
			var time = 36174862;
			var stub = sinon.stub(slots, 'getTime').returns(time);

			vt = createVote('secret', publicKeys, null);

			(vt).should.have.property('timestamp').and.be.equal(time);
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

			vt = createVote('secret', publicKeys, null, offset);

			(vt).should.have.property('timestamp').and.be.equal(time);
			(stub.calledWithExactly(now.getTime() - offset)).should.be.true();

			stub.restore();
			clock.restore();
		});

		describe('returned vote', function () {

			beforeEach(function () {
				vt = createVote('secret', publicKeys, 'second secret');
			});

			it('should be ok', function () {
				(vt).should.be.ok;
			});

			it('should be object', function () {
				(vt).should.be.type('object');
			});

			it('should have recipientId string equal to sender', function () {
				(vt).should.have.property('recipientId').and.be.type('string').and.equal(lisk.crypto.getAddress(publicKey));
			});

			it('should have amount number eaul to 0', function () {
				(vt).should.have.property('amount').and.be.type('number').and.equal(0);
			});

			it('should have type number equal to 3', function () {
				(vt).should.have.property('type').and.be.type('number').and.equal(3);
			});

			it('should have timestamp number', function () {
				(vt).should.have.property('timestamp').and.be.type('number');
			});

			it('should have senderPublicKey hex string equal to sender public key', function () {
				(vt).should.have.property('senderPublicKey').and.be.type('string').and.match(function () {
					try {
						new Buffer(vt.senderPublicKey, 'hex');
					} catch (e) {
						return false;
					}

					return true;
				}).and.equal(publicKey);
			});

			it('should have signature hex string', function () {
				(vt).should.have.property('signature').and.be.type('string').and.match(function () {
					try {
						new Buffer(vt.signature, 'hex');
					} catch (e) {
						return false;
					}

					return true;
				});
			});

			it('should have second signature hex string', function () {
				(vt).should.have.property('signSignature').and.be.type('string').and.match(function () {
					try {
						new Buffer(vt.signSignature, 'hex');
					} catch (e) {
						return false;
					}

					return true;
				});
			});

			it('should be signed correctly', function () {
				var result = lisk.crypto.verify(vt);
				(result).should.be.ok;
			});

			it('should be second signed correctly', function () {
				var result = lisk.crypto.verifySecondSignature(vt, lisk.crypto.getKeys('second secret').publicKey);
				(result).should.be.ok;
			});

			it('should not be signed correctly now', function () {
				vt.amount = 100;
				var result = lisk.crypto.verify(vt);
				(result).should.be.not.ok;
			});

			it('should not be second signed correctly now', function () {
				vt.amount = 100;
				var result = lisk.crypto.verifySecondSignature(vt, lisk.crypto.getKeys('second secret').publicKey);
				(result).should.be.not.ok;
			});

			it('should have asset', function () {
				(vt).should.have.property('asset').and.not.empty;
			});

			describe('vote asset', function () {

				it('should be ok', function () {
					(vt.asset).should.have.property('votes').and.be.ok;
				});

				it('should be object', function () {
					(vt.asset.votes).should.be.type('object');
				});

				it('should be not empty', function () {
					(vt.asset.votes).should.be.not.empty;
				});

				it('should contains one element', function () {
					(vt.asset.votes.length).should.be.equal(1);
				});

				it('should have public keys in hex', function () {
					vt.asset.votes.forEach(function (v) {
						(v).should.be.type('string').startWith('+').and.match(function () {
							try {
								new Buffer(v.substring(1, v.length), 'hex');
							} catch (e) {
								return false;
							}

							return true;
						});
					});
				});

				it('should be equal to sender public key', function () {
					var v = vt.asset.votes[0];
					(v.substring(1, v.length)).should.be.equal(publicKey);
				});
			});
		});
	});
});
