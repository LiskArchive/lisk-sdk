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
import * as validMixvoteTransactionScenario from '../fixtures/vote_transaction/vote_transaction_10_upvotes_and_10_downvotes.json';

import { castVotes } from '../src/cast_votes';
import { TransactionJSON } from '../src/transaction_types';

describe('#castVotes transaction', () => {
	let castVotesTransaction: Partial<TransactionJSON>;

	describe('when the transaction is created with one passphrase and the votes', () => {
		beforeEach(() => {
			castVotesTransaction = castVotes({
				passphrase:
					validMixvoteTransactionScenario.testCases.input.account.passphrase,
				votes: validMixvoteTransactionScenario.testCases.output.asset.votes.slice(),
				networkIdentifier:
					validMixvoteTransactionScenario.testCases.input.networkIdentifier,
				fee: validMixvoteTransactionScenario.testCases.output.fee,
				nonce: validMixvoteTransactionScenario.testCases.output.nonce,
			});
		});

		it('should create a cast votes transaction', () => {
			expect(castVotesTransaction.id).toEqual(
				validMixvoteTransactionScenario.testCases.output.id,
			);
			expect(castVotesTransaction.signatures).toStrictEqual(
				validMixvoteTransactionScenario.testCases.output.signatures,
			);
		});
	});

	describe('when the cast vote transaction is created with the invalid votes', () => {
		it('should throw error when votes was not provided', () => {
			return expect(() =>
				castVotes({
					passphrase:
						validMixvoteTransactionScenario.testCases.input.account.passphrase,
					votes: undefined,
					networkIdentifier:
						validMixvoteTransactionScenario.testCases.input.networkIdentifier,
					fee: validMixvoteTransactionScenario.testCases.output.fee,
					nonce: validMixvoteTransactionScenario.testCases.output.nonce,
				}),
			).toThrow('Votes must present to create transaction.');
		});
	});

	describe('when the cast vote transaction is created with duplicated delegate address', () => {
		describe('Given votes and unvotes with duplication', () => {
			it('should throw a duplication error', () => {
				return expect(() =>
					castVotes({
						passphrase:
							validMixvoteTransactionScenario.testCases.input.account
								.passphrase,
						votes: [
							...validMixvoteTransactionScenario.testCases.output.asset.votes.slice(
								0,
								19,
							),
							{
								delegateAddress:
									validMixvoteTransactionScenario.testCases.output.asset
										.votes[0].delegateAddress,
								amount: '1000000000',
							},
						],
						networkIdentifier:
							validMixvoteTransactionScenario.testCases.input.networkIdentifier,
						fee: validMixvoteTransactionScenario.testCases.output.fee,
						nonce: validMixvoteTransactionScenario.testCases.output.nonce,
					}),
				).toThrow('Delegate address must be unique');
			});
		});

		describe('Given votes more than 20', () => {
			it('should throw a validation error for votes', () => {
				return expect(() =>
					castVotes({
						passphrase:
							validMixvoteTransactionScenario.testCases.input.account
								.passphrase,
						votes: [
							...validMixvoteTransactionScenario.testCases.output.asset.votes.slice(),
							{
								delegateAddress: '123L',
								amount: '1000000000',
							},
						],
						networkIdentifier:
							validMixvoteTransactionScenario.testCases.input.networkIdentifier,
						fee: validMixvoteTransactionScenario.testCases.output.fee,
						nonce: validMixvoteTransactionScenario.testCases.output.nonce,
					}),
				).toThrow('should NOT have more than 20 item');
			});
		});
	});

	describe('unsigned cast votes transaction', () => {
		describe('when the cast votes transaction is created without a passphrase', () => {
			beforeEach(() => {
				castVotesTransaction = castVotes({
					votes: validMixvoteTransactionScenario.testCases.output.asset.votes.slice(),
					networkIdentifier:
						validMixvoteTransactionScenario.testCases.input.networkIdentifier,
					fee: validMixvoteTransactionScenario.testCases.output.fee,
					nonce: validMixvoteTransactionScenario.testCases.output.nonce,
				});
			});

			it('should have the type', () => {
				return expect(castVotesTransaction).toHaveProperty('type', 13);
			});

			it('should not have the sender public key', () => {
				return expect(castVotesTransaction).toHaveProperty(
					'senderPublicKey',
					undefined,
				);
			});

			it('should have the asset with the votes', () => {
				return expect(castVotesTransaction.asset).toHaveProperty('votes');
			});

			it('should not have the signatures', () => {
				return expect(castVotesTransaction).not.toHaveProperty('signatures');
			});

			it('should not have the id', () => {
				return expect(castVotesTransaction).not.toHaveProperty('id');
			});
		});
	});
});
