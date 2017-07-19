
if (typeof module !== 'undefined' && module.exports) {
	var slots = require('../../lib/time/slots');
	var common = require('../common');
	var lisk = common.lisk;
}

describe('dapp.js', function () {

	var dapp = lisk.dapp;

	it('should be object', function () {
		(dapp).should.be.type('object');
	});

	it('should have properties', function () {
		(dapp).should.have.property('createDapp');
	});

	describe('#createDapp', function () {

		var createDapp = dapp.createDapp;
		var trs = null;

		var options = {
			category: 0,
			name: 'Lisk Guestbook',
			description: 'The official Lisk guestbook',
			tags: 'guestbook message sidechain',
			type: 0,
			link: 'https://github.com/MaxKK/guestbookDapp/archive/master.zip',
			icon: 'https://raw.githubusercontent.com/MaxKK/guestbookDapp/master/icon.png'
		};

		it('should be a function', function () {
			(createDapp).should.be.type('function');
		});

		it('should create dapp without second signature', function () {
			trs = createDapp('secret', null, options);
			(trs).should.be.ok;
		});

		it('should create delegate with second signature', function () {
			trs = createDapp('secret', 'secret 2', options);
			(trs).should.be.ok;
		});

		it('should use time slots to get the time for the timestamp', function () {
			var now = new Date();
			var clock = sinon.useFakeTimers(now, 'Date');
			var time = 36174862;
			var stub = sinon.stub(slots, 'getTime').returns(time);

			trs = createDapp('secret', null, options);
			(trs).should.have.property('timestamp').and.be.equal(time);
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

			trs = createDapp('secret', null, options, offset);

			(trs).should.have.property('timestamp').and.be.equal(time);
			(stub.calledWithExactly(now.getTime() - offset)).should.be.true();

			stub.restore();
			clock.restore();
		});

		describe('returned dapp', function () {
			// var keys = lisk.crypto.getKeys('secret');
			var secondKeys = lisk.crypto.getKeys('secret 2');

			beforeEach(function () {
				trs = createDapp('secret', 'secret 2', options);
			});

			it('should be object', function () {
				(trs).should.be.type('object');
			});

			it('should have id as string', function () {
				(trs.id).should.be.type('string');
			});

			it('should have type as number and equal 9', function () {
				(trs.type).should.be.type('number').and.equal(5);
			});

			it('should have amount as number and eqaul 0', function () {
				(trs.amount).should.be.type('number').and.equal(0);
			});

			it('should have fee as number and equal 2500000000', function () {
				(trs.fee).should.be.type('number').and.equal(2500000000);
			});

			it('should have null recipientId', function () {
				trs.should.have.property('recipientId').equal(null);
			});

			it('should have senderPublicKey as hex string', function () {
				(trs.senderPublicKey).should.be.type('string').and.match(function () {
					try {
						new Buffer(trs.senderPublicKey, 'hex');
					} catch (e) {
						return false;
					}

					return true;
				});
			});

			it('should have timestamp as number', function () {
				(trs.timestamp).should.be.type('number').and.not.NaN;
			});

			it('should have dapp inside asset', function () {
				(trs.asset).should.have.property('dapp');
			});

			describe('dapp asset', function () {

				it('should be ok', function () {
					(trs.asset.dapp).should.be.ok;
				});

				it('should be object', function () {
					(trs.asset.dapp).should.be.type('object');
				});

				it('should have category property', function () {
					(trs.asset.dapp).should.have.property('category').and.equal(options.category);
				});

				it('should have name property', function () {
					(trs.asset.dapp).should.have.property('name').and.equal(options.name);
				});

				it('should have tags property', function () {
					(trs.asset.dapp).should.have.property('tags').and.equal(options.tags);
				});

				it('should have type property', function () {
					(trs.asset.dapp).should.have.property('type').and.equal(options.type);
				});

				it('should have link property', function () {
					(trs.asset.dapp).should.have.property('link').and.equal(options.link);
				});

				it('should have icon property', function () {
					(trs.asset.dapp).should.have.property('icon').and.equal(options.icon);
				});
			});

			it('should have signature as hex string', function () {
				(trs.signature).should.be.type('string').and.match(function () {
					try {
						new Buffer(trs.signature, 'hex');
					} catch (e) {
						return false;
					}

					return true;
				});
			});

			it('should have second signature in hex', function () {
				(trs).should.have.property('signSignature').and.type('string').and.match(function () {
					try {
						new Buffer(trs.signSignature, 'hex');
					} catch (e) {
						return false;
					}

					return true;
				});
			});

			it('should be signed correctly', function () {
				var result = lisk.crypto.verify(trs);
				(result).should.be.ok;
			});

			it('should not be signed correctly now', function () {
				trs.amount = 10000;
				var result = lisk.crypto.verify(trs);
				(result).should.be.not.ok;
			});

			it('should be second signed correctly', function () {
				trs.amount = 0;
				var result = lisk.crypto.verifySecondSignature(trs, secondKeys.publicKey);
				(result).should.be.ok;
			});

			it('should not be second signed correctly now', function () {
				trs.amount = 10000;
				var result = lisk.crypto.verifySecondSignature(trs, secondKeys.publicKey);
				(result).should.be.not.ok;
			});
		});
	});
});
