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

const time = require('../../src/transactions/utils/time');

afterEach(() => sandbox.restore());

describe('#castVotes transaction', () => {
	const secret = 'secret';
	const secondSecret = 'second secret';
	const publicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const publicKeys = [`+${publicKey}`];
	const secondPublicKey =
		'0401c8ac9f29ded9e1e4d5b6b43051cb25b22f27c7b7b35092161e851946f82f';
	const address = '18160565574430594874L';
	const timeWithOffset = 38350076;

	let getTimeWithOffsetStub;
	let castVotesTransaction;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox
			.stub(time, 'getTimeWithOffset')
			.returns(timeWithOffset);
	});

	describe('without second secret', () => {
		beforeEach(() => {
			castVotesTransaction = castVotes({ secret, delegates: publicKeys });
		});

		it('should create a cast votes transaction', () => {
			castVotesTransaction.should.be.ok();
		});

		it('should use time.getTimeWithOffset to calculate the timestamp', () => {
			getTimeWithOffsetStub.calledWithExactly(undefined).should.be.true();
		});

		it('should use time.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
			const offset = -10;
			castVotes({ secret, delegates: publicKeys, timeOffset: offset });

			getTimeWithOffsetStub.calledWithExactly(offset).should.be.true();
		});

		describe('returned cast votes transaction', () => {
			it('should be an object', () => {
				castVotesTransaction.should.be.type('object');
			});

			it('should have id string', () => {
				castVotesTransaction.should.have.property('id').and.be.type('string');
			});

			it('should have type number equal to 3', () => {
				castVotesTransaction.should.have
					.property('type')
					.and.be.type('number')
					.and.equal(3);
			});

			it('should have amount string equal to 0', () => {
				castVotesTransaction.should.have
					.property('amount')
					.and.be.type('string')
					.and.equal('0');
			});

			it('should have fee string equal to 0', () => {
				castVotesTransaction.should.have
					.property('fee')
					.and.be.type('string')
					.and.equal('100000000');
			});

			it('should have recipientId string equal to address', () => {
				castVotesTransaction.should.have
					.property('recipientId')
					.and.be.type('string')
					.and.equal(address);
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				castVotesTransaction.should.have
					.property('senderPublicKey')
					.and.be.hexString()
					.and.equal(publicKey);
			});

			it('should have timestamp number equal to result of time.getTimeWithOffset', () => {
				castVotesTransaction.should.have
					.property('timestamp')
					.and.be.type('number')
					.and.equal(timeWithOffset);
			});

			it('should have signature hex string', () => {
				castVotesTransaction.should.have
					.property('signature')
					.and.be.hexString();
			});

			it('should be signed correctly', () => {
				const result = cryptoModule.verifyTransaction(castVotesTransaction);
				result.should.be.ok();
			});

			it('should not be signed correctly if modified', () => {
				castVotesTransaction.amount = 100;
				const result = cryptoModule.verifyTransaction(castVotesTransaction);
				result.should.be.not.ok();
			});

			it('should have asset', () => {
				castVotesTransaction.should.have.property('asset').and.not.be.empty();
			});

			describe('votes asset', () => {
				it('should be object', () => {
					castVotesTransaction.asset.should.have
						.property('votes')
						.and.be.type('object');
				});

				it('should not be empty', () => {
					castVotesTransaction.asset.votes.should.not.be.empty();
				});

				it('should contain one element', () => {
					castVotesTransaction.asset.votes.should.have.length(1);
				});

				it('should have public keys in hex', () => {
					castVotesTransaction.asset.votes.forEach(v => {
						v.should.be.type('string').and.startWith('+');
						v.slice(1).should.be.hexString();
					});
				});

				it('should have a vote for the delegate public key', () => {
					const v = castVotesTransaction.asset.votes[0];
					v.substring(1, v.length).should.be.equal(publicKey);
				});
			});
		});
	});

	describe('with second secret', () => {
		beforeEach(() => {
			castVotesTransaction = castVotes({
				secret,
				delegates: publicKeys,
				secondSecret,
			});
		});

		it('should create a vote transaction with a second secret', () => {
			const castVotesTransactionWithoutSecondSecret = castVotes({
				secret,
				delegates: publicKeys,
			});
			castVotesTransaction.should.be.ok();
			castVotesTransaction.should.not.be.equal(
				castVotesTransactionWithoutSecondSecret,
			);
		});

		describe('returned cast votes transaction', () => {
			it('should have second signature hex string', () => {
				castVotesTransaction.should.have
					.property('signSignature')
					.and.be.hexString();
			});

			it('should be second signed correctly', () => {
				const result = cryptoModule.verifyTransaction(
					castVotesTransaction,
					secondPublicKey,
				);
				result.should.be.ok();
			});

			it('should not be second signed correctly if modified', () => {
				castVotesTransaction.amount = 100;
				const result = cryptoModule.verifyTransaction(
					castVotesTransaction,
					secondPublicKey,
				);
				result.should.not.be.ok();
			});
		});
	});
});
