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

	describe('when the transaction is created with one passphrase and the votes', () => {
		beforeEach(() => {
			castVotesTransaction = castVotes({ passphrase, votes: votePublicKeys });
		});

		it('should create a cast votes transaction', () => {
			return castVotesTransaction.should.be.ok();
		});

		it('should use time.getTimeWithOffset to calculate the timestamp', () => {
			return getTimeWithOffsetStub.should.be.calledWithExactly(undefined);
		});

		it('should use time.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
			const offset = -10;
			castVotes({ passphrase, votes: votePublicKeys, timeOffset: offset });

			return getTimeWithOffsetStub.should.be.calledWithExactly(offset);
		});

		describe('the returned cast votes transaction', () => {
			it('should be an object', () => {
				return castVotesTransaction.should.be.type('object');
			});

			it('should have id string', () => {
				return castVotesTransaction.should.have
					.property('id')
					.and.be.type('string');
			});

			it('should have type number equal to 3', () => {
				return castVotesTransaction.should.have
					.property('type')
					.and.be.type('number')
					.and.equal(3);
			});

			it('should have amount string equal to 0', () => {
				return castVotesTransaction.should.have
					.property('amount')
					.and.be.type('string')
					.and.equal('0');
			});

			it('should have fee string equal to 100000000', () => {
				return castVotesTransaction.should.have
					.property('fee')
					.and.be.type('string')
					.and.equal('100000000');
			});

			it('should have recipientId string equal to address', () => {
				return castVotesTransaction.should.have
					.property('recipientId')
					.and.be.type('string')
					.and.equal(address);
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				return castVotesTransaction.should.have
					.property('senderPublicKey')
					.and.be.hexString()
					.and.equal(firstPublicKey);
			});

			it('should have timestamp number equal to result of time.getTimeWithOffset', () => {
				return castVotesTransaction.should.have
					.property('timestamp')
					.and.be.type('number')
					.and.equal(timeWithOffset);
			});

			it('should have signature hex string', () => {
				return castVotesTransaction.should.have
					.property('signature')
					.and.be.hexString();
			});

			it('should not have the second signature property', () => {
				return castVotesTransaction.should.not.have.property('signSignature');
			});

			it('should have asset', () => {
				return castVotesTransaction.should.have
					.property('asset')
					.and.not.be.empty();
			});

			describe('votes asset', () => {
				it('should be array', () => {
					return castVotesTransaction.asset.should.have
						.property('votes')
						.and.be.Array();
				});

				it('should contain two elements', () => {
					return castVotesTransaction.asset.votes.should.have.length(2);
				});

				it('should have a vote for the delegate public key', () => {
					const expectedArray = [`+${firstPublicKey}`, `+${secondPublicKey}`];
					return castVotesTransaction.asset.votes.should.be.eql(expectedArray);
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
			return castVotesTransaction.should.have
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

		it('the transaction should have the votes as an array', () => {
			return castVotesTransaction.asset.should.have
				.property('votes')
				.and.be.Array();
		});

		it('the transaction should have the votes and the unvotes', () => {
			const expectedArray = [
				`+${firstPublicKey}`,
				`+${secondPublicKey}`,
				`-${thirdPublicKey}`,
				`-${fourthPublicKey}`,
			];
			return castVotesTransaction.asset.votes.should.be.eql(expectedArray);
		});
	});

	describe('when the cast vote transaction is created with the unvotes', () => {
		beforeEach(() => {
			castVotesTransaction = castVotes({
				passphrase,
				unvotes: unvotePublicKeys,
			});
		});

		it('the transaction should have the votes array', () => {
			return castVotesTransaction.asset.should.have
				.property('votes')
				.and.be.Array();
		});

		it('the transaction asset should have the unvotes', () => {
			const expectedArray = [`-${thirdPublicKey}`, `-${fourthPublicKey}`];
			return castVotesTransaction.asset.votes.should.be.eql(expectedArray);
		});
	});

	describe('when the cast vote transaction is created with one too short public key', () => {
		it('should throw an error', () => {
			return castVotes
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
			return castVotes
				.bind(null, {
					passphrase,
					unvotes: unvotePublicKeys,
					votes: [plusPrependedPublicKey],
				})
				.should.throw('Invalid hex string');
		});
	});

	describe('when the cast vote transaction is created with duplicated public keys', () => {
		describe('Given votes and unvotes with duplication', () => {
			it('should throw a duplication error', () => {
				const votes = [firstPublicKey, secondPublicKey];
				const unvotes = [firstPublicKey, thirdPublicKey];
				return castVotes
					.bind(null, {
						passphrase,
						unvotes,
						votes,
					})
					.should.throw(
						'Duplicated public key: 5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09.',
					);
			});
		});

		describe('Given votes with duplication', () => {
			it('should throw a duplication error for votes', () => {
				const votes = [firstPublicKey, secondPublicKey, firstPublicKey];
				return castVotes
					.bind(null, {
						passphrase,
						votes,
					})
					.should.throw(
						'Duplicated public key: 5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09.',
					);
			});
		});

		describe('Given unvotes with duplication', () => {
			it('should throw a duplication error for unvotes', () => {
				const unvotes = [firstPublicKey, secondPublicKey, firstPublicKey];
				return castVotes
					.bind(null, {
						passphrase,
						unvotes,
					})
					.should.throw(
						'Duplicated public key: 5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09.',
					);
			});
		});
	});
});
