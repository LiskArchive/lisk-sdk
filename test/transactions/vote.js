import slots from '../../src/time/slots';
import vote from '../../src/transactions/vote';
import cryptoModule from '../../src/transactions/crypto';

describe('vote.js', () => {
	it('should be ok', () => {
		(vote).should.be.ok();
	});

	it('should be object', () => {
		(vote).should.be.type('object');
	});

	it('should have createVote property', () => {
		(vote).should.have.property('createVote');
	});

	describe('#createVote', () => {
		const createVote = vote.createVote;
		const publicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
		const publicKeys = [`+${publicKey}`];

		it('should be ok', () => {
			(createVote).should.be.ok();
		});

		it('should be function', () => {
			(createVote).should.be.type('function');
		});

		it('should create vote', () => {
			const vt = createVote('secret', publicKeys, 'second secret');
			(vt).should.be.ok();
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
				const vt = createVote('secret', publicKeys, null);
				(vt).should.have.property('timestamp').and.be.equal(slots.getTime());
			});

			it('should use time slots with an offset of -10 seconds to get the time for the timestamp', () => {
				const offset = -10;
				const vt = createVote('secret', publicKeys, null, offset);

				(vt).should.have.property('timestamp').and.be.equal(slots.getTime() + offset);
			});
		});

		describe('returned vote', () => {
			let vt;

			beforeEach(() => {
				vt = createVote('secret', publicKeys, 'second secret');
			});

			it('should be ok', () => {
				(vt).should.be.ok();
			});

			it('should be object', () => {
				(vt).should.be.type('object');
			});

			it('should have recipientId string equal to sender', () => {
				(vt).should.have.property('recipientId').and.be.type('string').and.equal(cryptoModule.getAddress(publicKey));
			});

			it('should have amount number equal to 0', () => {
				(vt).should.have.property('amount').and.be.type('number').and.equal(0);
			});

			it('should have type number equal to 3', () => {
				(vt).should.have.property('type').and.be.type('number').and.equal(3);
			});

			it('should have timestamp number', () => {
				(vt).should.have.property('timestamp').and.be.type('number');
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				(vt).should.have.property('senderPublicKey').and.be.type('string').and.equal(publicKey).and.be.hexString();
			});

			it('should have signature hex string', () => {
				(vt).should.have.property('signature').and.be.type('string').and.be.hexString();
			});

			it('should have second signature hex string', () => {
				(vt).should.have.property('signSignature').and.be.type('string').and.be.hexString();
			});

			it('should be signed correctly', () => {
				const result = cryptoModule.verify(vt);
				(result).should.be.ok();
			});

			it('should be second signed correctly', () => {
				const result = cryptoModule.verifySecondSignature(vt, cryptoModule.getKeys('second secret').publicKey);
				(result).should.be.ok();
			});

			it('should not be signed correctly now', () => {
				vt.amount = 100;
				const result = cryptoModule.verify(vt);
				(result).should.be.not.ok();
			});

			it('should not be second signed correctly now', () => {
				vt.amount = 100;
				const result = cryptoModule.verifySecondSignature(vt, cryptoModule.getKeys('second secret').publicKey);
				(result).should.be.not.ok();
			});

			it('should have asset', () => {
				(vt).should.have.property('asset').and.not.be.empty();
			});

			describe('vote asset', () => {
				it('should be ok', () => {
					(vt.asset).should.have.property('votes').and.be.ok();
				});

				it('should be object', () => {
					(vt.asset.votes).should.be.type('object');
				});

				it('should be not empty', () => {
					(vt.asset.votes).should.be.not.empty();
				});

				it('should contains one element', () => {
					(vt.asset.votes.length).should.be.equal(1);
				});

				it('should have public keys in hex', () => {
					vt.asset.votes.forEach((v) => {
						(v).should.be.type('string').and.startWith('+');
						(v.slice(1)).should.be.hexString();
					});
				});

				it('should be equal to sender public key', () => {
					const v = vt.asset.votes[0];
					(v.substring(1, v.length)).should.be.equal(publicKey);
				});
			});
		});
	});
});
