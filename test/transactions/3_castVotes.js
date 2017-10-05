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
import castVotes from '../../src/transactions/3_castVotes';
import cryptoModule from '../../src/crypto';
import slots from '../../src/time/slots';

afterEach(() => sandbox.restore());

describe('#castVotes', () => {
	const secret = 'secret';
	const secondSecret = 'second secret';
	const publicKey = '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const publicKeys = [`+${publicKey}`];
	const secondPublicKey = '0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
	const address = '18160565574430594874L';
	const timeWithOffset = 38350076;

	let getTimeWithOffsetStub;
	let voteTransaction;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox.stub(slots, 'getTimeWithOffset').returns(timeWithOffset);
	});

	describe('without second secret', () => {
		beforeEach(() => {
			voteTransaction = castVotes(secret, publicKeys);
		});

		it('should create a vote transaction', () => {
			(voteTransaction).should.be.ok();
		});

		it('should use slots.getTimeWithOffset to calculate the timestamp', () => {
			(getTimeWithOffsetStub.calledWithExactly(undefined)).should.be.true();
		});

		it('should use slots.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
			const offset = -10;
			castVotes(secret, publicKeys, null, offset);

			(getTimeWithOffsetStub.calledWithExactly(offset)).should.be.true();
		});

		describe('returned vote', () => {
			it('should be an object', () => {
				(voteTransaction).should.be.type('object');
			});

			it('should have id string', () => {
				(voteTransaction).should.have.property('id').and.be.type('string');
			});

			it('should have type number equal to 3', () => {
				(voteTransaction).should.have.property('type').and.be.type('number').and.equal(3);
			});

			it('should have amount number equal to 0', () => {
				(voteTransaction).should.have.property('amount').and.be.type('number').and.equal(0);
			});

			it('should have fee number equal to 0', () => {
				(voteTransaction).should.have.property('fee').and.be.type('number').and.equal(1e8);
			});

			it('should have recipientId string equal to address', () => {
				(voteTransaction).should.have.property('recipientId').and.be.type('string').and.equal(address);
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				(voteTransaction).should.have.property('senderPublicKey').and.be.hexString().and.equal(publicKey);
			});

			it('should have timestamp number equal to result of slots.getTimeWithOffset', () => {
				(voteTransaction).should.have.property('timestamp').and.be.type('number').and.equal(timeWithOffset);
			});

			it('should have signature hex string', () => {
				(voteTransaction).should.have.property('signature').and.be.hexString();
			});

			it('should be signed correctly', () => {
				const result = cryptoModule.verifyTransaction(voteTransaction);
				(result).should.be.ok();
			});

			it('should not be signed correctly if modified', () => {
				voteTransaction.amount = 100;
				const result = cryptoModule.verifyTransaction(voteTransaction);
				(result).should.be.not.ok();
			});

			it('should have asset', () => {
				(voteTransaction).should.have.property('asset').and.not.be.empty();
			});

			describe('votes asset', () => {
				it('should be object', () => {
					(voteTransaction.asset).should.have.property('votes').and.be.type('object');
				});

				it('should not be empty', () => {
					(voteTransaction.asset.votes).should.not.be.empty();
				});

				it('should contain one element', () => {
					(voteTransaction.asset.votes).should.have.length(1);
				});

				it('should have public keys in hex', () => {
					voteTransaction.asset.votes.forEach((v) => {
						(v).should.be.type('string').and.startWith('+');
						(v.slice(1)).should.be.hexString();
					});
				});

				it('should have a vote for the delegate public key', () => {
					const v = voteTransaction.asset.votes[0];
					(v.substring(1, v.length)).should.be.equal(publicKey);
				});
			});
		});
	});

	describe('with second secret', () => {
		beforeEach(() => {
			voteTransaction = castVotes(secret, publicKeys, secondSecret);
		});

		it('should create a vote transaction with a second secret', () => {
			const voteTransactionWithoutSecondSecret = castVotes(secret, publicKeys);
			(voteTransaction).should.be.ok();
			(voteTransaction).should.not.be.equal(voteTransactionWithoutSecondSecret);
		});

		describe('returned vote', () => {
			it('should have second signature hex string', () => {
				(voteTransaction).should.have.property('signSignature').and.be.hexString();
			});

			it('should be second signed correctly', () => {
				const result = cryptoModule.verifyTransaction(voteTransaction, secondPublicKey);
				(result).should.be.ok();
			});

			it('should not be second signed correctly if modified', () => {
				voteTransaction.amount = 100;
				const result = cryptoModule.verifyTransaction(voteTransaction, secondPublicKey);
				(result).should.not.be.ok();
			});
		});
	});
});
