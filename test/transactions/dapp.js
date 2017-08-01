import slots from '../../src/time/slots';
import dapp from '../../src/transactions/dapp';
import cryptoModule from '../../src/transactions/crypto';

describe('dapp.js', () => {
	it('should be object', () => {
		(dapp).should.be.type('object');
	});

	it('should have properties', () => {
		(dapp).should.have.property('createDapp');
	});

	describe('#createDapp', () => {
		const createDapp = dapp.createDapp;
		let trs;
		const options = {
			category: 0,
			name: 'Lisk Guestbook',
			description: 'The official Lisk guestbook',
			tags: 'guestbook message sidechain',
			type: 0,
			link: 'https://github.com/MaxKK/guestbookDapp/archive/master.zip',
			icon: 'https://raw.githubusercontent.com/MaxKK/guestbookDapp/master/icon.png',
		};

		it('should be a function', () => {
			(createDapp).should.be.type('function');
		});

		describe('without second signature', () => {
			beforeEach(() => {
				trs = createDapp('secret', null, options);
			});

			it('should create dapp without second signature', () => {
				(trs).should.be.ok();
			});

			describe('returned dapp', () => {
				it('should be object', () => {
					(trs).should.be.type('object');
				});

				it('should have id as string', () => {
					(trs).should.have.property('id').be.type('string');
				});

				it('should have type as number and equal 9', () => {
					(trs).should.have.property('type').be.type('number').and.equal(5);
				});

				it('should have amount as number and equal 0', () => {
					(trs).should.have.property('amount').be.type('number').and.equal(0);
				});

				it('should have fee as number and equal 2500000000', () => {
					(trs).should.have.property('fee').be.type('number').and.equal(2500000000);
				});

				it('should have null recipientId', () => {
					trs.should.have.property('recipientId').equal(null);
				});

				it('should have senderPublicKey as hex string', () => {
					(trs).should.have.property('senderPublicKey').and.be.type('string').and.be.hexString();
				});

				it('should have timestamp as number', () => {
					(trs).should.have.property('timestamp').and.be.type('number').and.not.NaN();
				});

				describe('timestamp', () => {
					let now;
					let clock;

					beforeEach(() => {
						now = new Date();
						clock = sinon.useFakeTimers(now, 'Date');
					});

					afterEach(() => {
						clock.restore();
					});

					it('should use time slots to get the time for the timestamp', () => {
						trs = createDapp('secret', null, options);

						(trs).should.have.property('timestamp').and.be.equal(slots.getTime());
					});

					it('should use time slots with an offset of -10 seconds to get the time for the timestamp', () => {
						const offset = -10;
						trs = createDapp('secret', null, options, offset);

						(trs).should.have.property('timestamp').and.be.equal(slots.getTime() + offset);
					});
				});

				it('should have dapp inside asset', () => {
					(trs).should.have.property('asset').and.have.property('dapp');
				});

				describe('dapp asset', () => {
					it('should be ok', () => {
						(trs.asset.dapp).should.be.ok();
					});

					it('should be object', () => {
						(trs.asset.dapp).should.be.type('object');
					});

					it('should have category property', () => {
						(trs.asset.dapp).should.have.property('category').and.equal(options.category);
					});

					it('should have name property', () => {
						(trs.asset.dapp).should.have.property('name').and.equal(options.name);
					});

					it('should have tags property', () => {
						(trs.asset.dapp).should.have.property('tags').and.equal(options.tags);
					});

					it('should have type property', () => {
						(trs.asset.dapp).should.have.property('type').and.equal(options.type);
					});

					it('should have link property', () => {
						(trs.asset.dapp).should.have.property('link').and.equal(options.link);
					});

					it('should have icon property', () => {
						(trs.asset.dapp).should.have.property('icon').and.equal(options.icon);
					});
				});

				it('should have signature as hex string', () => {
					(trs).should.have.property('signature').and.be.type('string');
					should.doesNotThrow(() => {
						Buffer.from(trs.signature, 'hex');
					});
				});

				it('should be signed correctly', () => {
					const result = cryptoModule.verify(trs);
					(result).should.be.ok();
				});

				it('should not be signed correctly if modified', () => {
					trs.amount = 10000;
					const result = cryptoModule.verify(trs);
					(result).should.be.not.ok();
				});
			});
		});

		describe('with second signature', () => {
			const publicKey = '653d60e438792fe89b8d6831e0627277025f48015b972cf6bcf10e6e75b7857f';

			beforeEach(() => {
				trs = createDapp('secret', 'secret 2', options);
			});

			it('should create dapp with second signature', () => {
				(trs).should.be.ok();
			});

			describe('returned dapp', () => {
				it('should have signature as hex string', () => {
					(trs).should.have.property('signature').and.be.type('string').and.be.hexString();
				});

				it('should have second signature in hex', () => {
					(trs).should.have.property('signSignature').and.be.type('string').and.be.hexString();
				});

				it('should be second signed correctly', () => {
					const result = cryptoModule.verifySecondSignature(trs, publicKey);
					(result).should.be.ok();
				});

				it('should not be second signed correctly if modified', () => {
					trs.amount = 10000;
					const result = cryptoModule.verifySecondSignature(trs, publicKey);
					(result).should.be.not.ok();
				});
			});
		});
	});
});
