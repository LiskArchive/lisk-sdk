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

const time = require('../../src/transactions/utils/time');

describe('#castVotes transaction', () => {
	const passphrase = 'secret';
	const secondPassphrase = 'second secret';
	const firstPublicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const secondPublicKey =
		'922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa';
	const thirdPublicKey =
		'215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca';
	const fourthPublicKey =
		'd019a4b6fa37e8ebeb64766c7b239d962fb3b3f265b8d3083206097b912cd914';
	const tooShortPublicKey =
		'd019a4b6fa37e8ebeb64766c7b239d962fb3b3f265b8d3083206097b912cd9';
	const plusPrependedPublicKey =
		'+5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const votePublicKeys = [firstPublicKey, secondPublicKey];
	const unvotePublicKeys = [thirdPublicKey, fourthPublicKey];
	const address = '18160565574430594874L';
	const timeWithOffset = 38350076;

	let getTimeWithOffsetStub;
	let castVotesTransaction;

	beforeEach(() => {
		getTimeWithOffsetStub = sandbox
			.stub(time, 'getTimeWithOffset')
			.returns(timeWithOffset);
	});

	describe('when the transaction is created with one passphrase and the votes object', () => {
		beforeEach(() => {
			castVotesTransaction = castVotes({ passphrase, votes: [firstPublicKey] });
		});

		it('should create a cast votes transaction', () => {
			castVotesTransaction.should.be.ok();
		});

		it('should use time.getTimeWithOffset to calculate the timestamp', () => {
			getTimeWithOffsetStub.should.be.calledWithExactly(undefined);
		});

		it('should use time.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
			const offset = -10;
			castVotes({ passphrase, vote: [firstPublicKey], timeOffset: offset });

			getTimeWithOffsetStub.should.be.calledWithExactly(offset);
		});

		describe('the returned cast votes transaction', () => {
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

			it('should have fee string equal to 100000000', () => {
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
					.and.equal(firstPublicKey);
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

			it('should not have the second signature property', () => {
				castVotesTransaction.should.not.have.property('signSignature');
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

				it('should contain one element', () => {
					castVotesTransaction.asset.votes.should.have.length(1);
				});

				it('should have a vote for the delegate public key', () => {
					const votes = castVotesTransaction.asset.votes[0];
					votes.substring(1, votes.length).should.be.equal(firstPublicKey);
				});
			});
		});
	});

	describe('with first and second passphrase', () => {
		beforeEach(() => {
			castVotesTransaction = castVotes({
				passphrase,
				vote: [firstPublicKey],
				secondPassphrase,
			});
		});

		it('should have the second signature property as hex string', () => {
			castVotesTransaction.should.have
				.property('signSignature')
				.and.be.hexString();
		});
	});

	describe('when the cast vote transaction is created with the votes and unvotes', () => {
		beforeEach(() => {
			castVotesTransaction = castVotes({
				passphrase,
				votes: votePublicKeys,
				unvotes: unvotePublicKeys,
			});
		});

		it('the transaction should have the votes object', () => {
			castVotesTransaction.asset.should.have
				.property('votes')
				.and.be.type('object');
		});

		it('the transaction should have two upvotes and two unvotes', () => {
			const expectedArray = [
				`+${firstPublicKey}`,
				`+${secondPublicKey}`,
				`-${thirdPublicKey}`,
				`-${fourthPublicKey}`,
			];
			castVotesTransaction.asset.votes.should.be.eql(expectedArray);
		});
	});

	describe('when the cast vote transaction is created with the unvotes', () => {
		beforeEach(() => {
			castVotesTransaction = castVotes({
				passphrase,
				unvotes: unvotePublicKeys,
			});
		});

		it('the transaction should have the votes object', () => {
			castVotesTransaction.asset.should.have
				.property('votes')
				.and.be.type('object');
		});

		it('the transaction should have two upvotes and two unvotes', () => {
			const expectedArray = [`-${thirdPublicKey}`, `-${fourthPublicKey}`];
			castVotesTransaction.asset.votes.should.be.eql(expectedArray);
		});
	});

	describe('when the cast vote transaction is created with one too short public key', () => {
		it('should throw an error', () => {
			castVotes
				.bind(null, {
					passphrase,
					unvotes: unvotePublicKeys,
					votes: [tooShortPublicKey],
				})
				.should.throw(
					'Public key d019a4b6fa37e8ebeb64766c7b239d962fb3b3f265b8d3083206097b912cd9 length differs from the expected 32 bytes for a public key.',
				);
		});
	});

	describe('when the cast vote transaction is created with one plus prepended public key', () => {
		it('should throw an error', () => {
			castVotes
				.bind(null, {
					passphrase,
					unvotes: unvotePublicKeys,
					votes: [plusPrependedPublicKey],
				})
				.should.throw('Invalid hex string');
		});
	});
});
