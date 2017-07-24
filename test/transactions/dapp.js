import slots from '../../src/time/slots';
import dapp from '../../src/transactions/dapp';
import cryptoModule from '../../src/transactions/crypto';

describe('dapp.js', function () {

	it('should be object', function () {
		(dapp).should.be.type('object');
	});

	it('should have properties', function () {
		(dapp).should.have.property('createDapp');
	});

	describe('#createDapp', function () {
		var createDapp = dapp.createDapp;
		var trs;
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

		describe('without second signature', function () {

			beforeEach(function () {
				trs = createDapp('secret', null, options);
			});

			it('should create dapp without second signature', function () {
				(trs).should.be.ok();
			});

			describe('returned dapp', function () {

				it('should be object', function () {
					(trs).should.be.type('object');
				});

				it('should have id as string', function () {
					(trs).should.have.property('id').be.type('string');
				});

				it('should have type as number and equal 9', function () {
					(trs).should.have.property('type').be.type('number').and.equal(5);
				});

				it('should have amount as number and equal 0', function () {
					(trs).should.have.property('amount').be.type('number').and.equal(0);
				});

				it('should have fee as number and equal 2500000000', function () {
					(trs).should.have.property('fee').be.type('number').and.equal(2500000000);
				});

				it('should have null recipientId', function () {
					trs.should.have.property('recipientId').equal(null);
				});

				it('should have senderPublicKey as hex string', function () {
					(trs).should.have.property('senderPublicKey').and.be.type('string').and.be.hexString();
				});

				it('should have timestamp as number', function () {
					(trs).should.have.property('timestamp').and.be.type('number').and.not.NaN();
				});

				describe('timestamp', function () {
					let now;
					let clock;
					let time;
					let getTimeStub;

					beforeEach(function () {
						now = new Date();
						clock = sinon.useFakeTimers(now, 'Date');
						time = 36174862;
						getTimeStub = sinon.stub(slots, 'getTime').returns(time);
					});

					afterEach(function () {
						getTimeStub.restore();
						clock.restore();
					});

					it('should use time slots to get the time for the timestamp', function () {
						trs = createDapp('secret', null, options);

						(trs).should.have.property('timestamp').and.be.equal(time);
						(getTimeStub.calledWithExactly(now.getTime())).should.be.true();
					});

					it('should use time slots with an offset to get the time for the timestamp', function () {
						var offset = 10;
						trs = createDapp('secret', null, options, offset);

						(trs).should.have.property('timestamp').and.be.equal(time);
						(getTimeStub.calledWithExactly(now.getTime() - offset)).should.be.true();
					});
				});

				it('should have dapp inside asset', function () {
					(trs).should.have.property('asset').and.have.property('dapp');
				});

				describe('dapp asset', function () {

					it('should be ok', function () {
						(trs.asset.dapp).should.be.ok();
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
					(trs).should.have.property('signature').and.be.type('string');
					should.doesNotThrow(function () {
						Buffer.from(trs.signature, 'hex');
					});
				});

				it('should be signed correctly', function () {
					var result = cryptoModule.verify(trs);
					(result).should.be.ok();
				});

				it('should not be signed correctly if modified', function () {
					trs.amount = 10000;
					var result = cryptoModule.verify(trs);
					(result).should.be.not.ok();
				});
			});

		});

		describe('with second signature', function () {
			var publicKey = '653d60e438792fe89b8d6831e0627277025f48015b972cf6bcf10e6e75b7857f';

			beforeEach(function () {
				trs = createDapp('secret', 'secret 2', options);
			});

			it('should create dapp with second signature', function () {
				(trs).should.be.ok();
			});

			describe('returned dapp', function () {

				it('should have signature as hex string', function () {
					(trs).should.have.property('signature').and.be.type('string').and.be.hexString();
				});

				it('should have second signature in hex', function () {
					(trs).should.have.property('signSignature').and.be.type('string').and.be.hexString();
				});

				it('should be second signed correctly', function () {
					var result = cryptoModule.verifySecondSignature(trs, publicKey);
					(result).should.be.ok();
				});

				it('should not be second signed correctly if modified', function () {
					trs.amount = 10000;
					var result = cryptoModule.verifySecondSignature(trs, publicKey);
					(result).should.be.not.ok();
				});
			});

		});
	});
});
