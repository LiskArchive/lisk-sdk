/*
 * Copyright © 2019 Lisk Foundation
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
import { castVotes } from '../src/cast_votes';
import { VoteAsset } from '../src/11_vote_transaction';
import { TransactionJSON } from '../src/transaction_types';
import * as time from '../src/utils/time';

describe('#castVotes transaction', () => {
	const fixedPoint = 10 ** 8;
	const passphrase = 'secret';
	const secondPassphrase = 'second secret';
	const transactionType = 11;
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
	const timeWithOffset = 38350076;
	const amount = '0';
	const fee = (1 * fixedPoint).toString();
	const networkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

	let getTimeWithOffsetStub: jest.SpyInstance;
	let castVotesTransaction: Partial<TransactionJSON>;

	beforeEach(() => {
		getTimeWithOffsetStub = jest
			.spyOn(time, 'getTimeWithOffset')
			.mockReturnValue(timeWithOffset);
		return Promise.resolve();
	});

	describe('when the transaction is created with one passphrase and the votes', () => {
		beforeEach(() => {
			castVotesTransaction = castVotes({
				passphrase,
				votes: votePublicKeys,
				networkIdentifier,
			});
			return Promise.resolve();
		});

		it('should create a cast votes transaction', () => {
			return expect(castVotesTransaction).toBeTruthy();
		});

		it('should use time.getTimeWithOffset to calculate the timestamp', () => {
			return expect(getTimeWithOffsetStub).toHaveBeenCalledWith(undefined);
		});

		it('should use time.getTimeWithOffset with an offset of -10 seconds to calculate the timestamp', () => {
			const offset = -10;
			castVotes({
				passphrase,
				votes: votePublicKeys,
				timeOffset: offset,
				networkIdentifier,
			});

			return expect(getTimeWithOffsetStub).toHaveBeenCalledWith(offset);
		});

		describe('the returned cast votes transaction', () => {
			it('should be an object', () => {
				return expect(castVotesTransaction).toBeObject();
			});

			it('should have id string', () => {
				return expect(castVotesTransaction.id).toBeString();
			});

			it('should have type number equal to 3', () => {
				return expect(castVotesTransaction).toHaveProperty(
					'type',
					transactionType,
				);
			});

			it('should have fee string equal to 100000000', () => {
				return expect(castVotesTransaction).toHaveProperty('fee', fee);
			});

			it('should have senderPublicKey hex string equal to sender public key', () => {
				return expect(castVotesTransaction).toHaveProperty(
					'senderPublicKey',
					firstPublicKey,
				);
			});

			it('should have timestamp number equal to result of time.getTimeWithOffset', () => {
				return expect(castVotesTransaction).toHaveProperty(
					'timestamp',
					timeWithOffset,
				);
			});

			it('should have signature hex string', () => {
				return expect(castVotesTransaction.signature).toBeString();
			});

			it('second signature property should be undefined', () => {
				return expect(castVotesTransaction.signSignature).toBeUndefined();
			});

			it('should have asset', () => {
				return expect(Object.keys(castVotesTransaction)).not.toHaveLength(0);
			});

			describe('votes asset', () => {
				it('should be array', () => {
					return expect((castVotesTransaction.asset as any).votes).toBeArray();
				});

				it('should contain two elements', () => {
					const { votes } = castVotesTransaction.asset as VoteAsset;
					return expect(votes).toHaveLength(2);
				});

				it('should have a vote for the delegate public key', () => {
					const { votes } = castVotesTransaction.asset as VoteAsset;
					const expectedArray = [`+${firstPublicKey}`, `+${secondPublicKey}`];
					return expect(votes).toEqual(expectedArray);
				});
			});
		});
	});

	describe('with first and second passphrase', () => {
		beforeEach(() => {
			castVotesTransaction = castVotes({
				passphrase,
				votes: [firstPublicKey],
				secondPassphrase,
				networkIdentifier,
			});
			return Promise.resolve();
		});

		it('should have the second signature property as hex string', () => {
			return expect(castVotesTransaction.signSignature).toBeString();
		});
	});

	describe('when the cast vote transaction is created with the votes and unvotes', () => {
		beforeEach(() => {
			castVotesTransaction = castVotes({
				passphrase,
				votes: votePublicKeys,
				unvotes: unvotePublicKeys,
				networkIdentifier,
			});
			return Promise.resolve();
		});

		it('the transaction should have the votes as an array', () => {
			return expect((castVotesTransaction.asset as any).votes).toBeArray();
		});

		it('the transaction should have the votes and the unvotes', () => {
			const expectedArray = [
				`+${firstPublicKey}`,
				`+${secondPublicKey}`,
				`-${thirdPublicKey}`,
				`-${fourthPublicKey}`,
			];
			const { votes } = castVotesTransaction.asset as VoteAsset;
			return expect(votes).toEqual(expectedArray);
		});
	});

	describe('when the cast vote transaction is created with the invalid votes and invalid unvotes', () => {
		it('should throw error when null was provided for votes', () => {
			return expect(
				castVotes.bind(null, {
					passphrase,
					votes: null as any,
					networkIdentifier,
				}),
			).toThrowError(
				'Please provide a valid votes value. Expected an array if present.',
			);
		});

		it('should throw error when string was provided for votes', () => {
			return expect(
				castVotes.bind(null, {
					passphrase,
					votes: `+${firstPublicKey}` as any,
					networkIdentifier,
				}),
			).toThrowError(
				'Please provide a valid votes value. Expected an array if present.',
			);
		});

		it('should throw error when null was provided for unvotes', () => {
			return expect(
				castVotes.bind(null, {
					passphrase,
					unvotes: null as any,
					networkIdentifier,
				}),
			).toThrowError(
				'Please provide a valid unvotes value. Expected an array if present.',
			);
		});

		it('should throw error when string was provided for unvotes', () => {
			return expect(
				castVotes.bind(null, {
					passphrase,
					unvotes: `-${firstPublicKey}` as any,
					networkIdentifier,
				}),
			).toThrowError(
				'Please provide a valid unvotes value. Expected an array if present.',
			);
		});
	});

	describe('when the cast vote transaction is created with the unvotes', () => {
		beforeEach(() => {
			castVotesTransaction = castVotes({
				passphrase,
				unvotes: unvotePublicKeys,
				networkIdentifier,
			});
			return Promise.resolve();
		});

		it('the transaction should have the votes array', () => {
			return expect((castVotesTransaction.asset as any).votes).toBeArray();
		});

		it('the transaction asset should have the unvotes', () => {
			const expectedArray = [`-${thirdPublicKey}`, `-${fourthPublicKey}`];
			const { votes } = castVotesTransaction.asset as VoteAsset;
			return expect(votes).toEqual(expectedArray);
		});
	});

	describe('when the cast vote transaction is created with one too short public key', () => {
		it('should throw an error', () => {
			return expect(
				castVotes.bind(null, {
					passphrase,
					unvotes: unvotePublicKeys,
					votes: [tooShortPublicKey],
					networkIdentifier,
				}),
			).toThrowError(
				'Public key d019a4b6fa37e8ebeb64766c7b239d962fb3b3f265b8d3083206097b912cd9 length differs from the expected 32 bytes for a public key.',
			);
		});
	});

	describe('when the cast vote transaction is created with one plus prepended public key', () => {
		it('should throw an error', () => {
			return expect(
				castVotes.bind(null, {
					passphrase,
					unvotes: unvotePublicKeys,
					votes: [plusPrependedPublicKey],
					networkIdentifier,
				}),
			).toThrowError('Argument must be a valid hex string.');
		});
	});

	describe('when the cast vote transaction is created with duplicated public keys', () => {
		describe('Given votes and unvotes with duplication', () => {
			it('should throw a duplication error', () => {
				const votes = [firstPublicKey, secondPublicKey];
				const unvotes = [firstPublicKey, thirdPublicKey];
				return expect(
					castVotes.bind(null, {
						passphrase,
						unvotes,
						votes,
						networkIdentifier,
					}),
				).toThrowError(
					'Duplicated public key: 5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09.',
				);
			});
		});

		describe('Given votes with duplication', () => {
			it('should throw a duplication error for votes', () => {
				const votes = [firstPublicKey, secondPublicKey, firstPublicKey];
				return expect(
					castVotes.bind(null, {
						passphrase,
						votes,
						networkIdentifier,
					}),
				).toThrowError(
					'Duplicated public key: 5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09.',
				);
			});
		});

		describe('Given unvotes with duplication', () => {
			it('should throw a duplication error for unvotes', () => {
				const unvotes = [firstPublicKey, secondPublicKey, firstPublicKey];
				return expect(
					castVotes.bind(null, {
						passphrase,
						unvotes,
						networkIdentifier,
					}),
				).toThrowError(
					'Duplicated public key: 5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09.',
				);
			});
		});
	});

	describe('unsigned cast votes transaction', () => {
		describe('when the cast votes transaction is created without a passphrase', () => {
			beforeEach(() => {
				castVotesTransaction = castVotes({
					votes: votePublicKeys,
					unvotes: unvotePublicKeys,
					networkIdentifier,
				});
				return Promise.resolve();
			});

			it('should have the type', () => {
				return expect(castVotesTransaction).toHaveProperty(
					'type',
					transactionType,
				);
			});

			it('should have the amount', () => {
				return expect(castVotesTransaction.asset).toHaveProperty(
					'amount',
					amount,
				);
			});

			it('should not have the recipient id', () => {
				return expect(castVotesTransaction.asset).not.toHaveProperty(
					'recipientId',
				);
			});

			it('should have the sender public key', () => {
				return expect(castVotesTransaction).toHaveProperty(
					'senderPublicKey',
					undefined,
				);
			});

			it('should have the timestamp', () => {
				return expect(castVotesTransaction).toHaveProperty('timestamp');
			});

			it('should have the asset with the votes', () => {
				return expect(castVotesTransaction.asset).toHaveProperty('votes');
			});

			it('should not have the signature', () => {
				return expect(castVotesTransaction).not.toHaveProperty('signature');
			});

			it('should not have the id', () => {
				return expect(castVotesTransaction).not.toHaveProperty('id');
			});
		});
	});
});
