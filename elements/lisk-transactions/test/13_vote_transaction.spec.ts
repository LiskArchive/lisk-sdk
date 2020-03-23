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

describe('Vote transaction', () => {
	describe('validateAsset', () => {
		describe('when asset.votes contains valid contents', () => {
			it.todo('should not return errors');
		});

		describe('when asset.votes does not include any vote', () => {
			it.todo('should return errors');
		});

		describe('when asset.votes includes more than 20 elements', () => {
			it.todo('should return errors');
		});

		describe('when asset.votes includes more than 10 positive votes', () => {
			it.todo('should return errors');
		});

		describe('when asset.votes includes more than 10 negative votes', () => {
			it.todo('should return errors');
		});

		describe('when asset.votes includes duplicate delegates within positive amount', () => {
			it.todo('should return errors');
		});

		describe('when asset.votes includes duplicate delegates within positive and negative amount', () => {
			it.todo('should return errors');
		});

		describe('when asset.votes includes zero amount', () => {
			it.todo('should return errors');
		});

		describe('when asset.votes includes amount which is greater than int64 range', () => {
			it.todo('should return errors');
		});

		describe('when asset.votes includes amount which is less than int64 range', () => {
			it.todo('should return errors');
		});

		describe('when asset.votes includes amount which is not multiple of 10 * 10^8', () => {
			it.todo('should return errors');
		});
	});

	describe('applyAsset', () => {
		describe('when asset.votes contain positive amount which makes account.votes to be 10 entries', () => {
			it.todo('should not return error');
			it.todo('should make account to have correct balance');
			it.todo('should not change account.unlocking');
			it.todo('should order account.votes');
			it.todo(
				'should make upvoted delegate account to have correct totalVotesReceived',
			);
			it.todo('should create vote object when it does not exist before');
			it.todo('should update vote object when it exists before');
		});

		describe('when asset.votes contain negative amount which makes account.votes to be 0 entries', () => {
			it.todo('should not return error');
			it.todo('should not change account balance');
			it.todo('should remove vote which has zero amount');
			it.todo('should update vote which has non-zero amount');
			it.todo('should make account to have correct unlocking');
			it.todo('should order account.unlocking');
			it.todo(
				'should make downvoted delegate account to have correct totalVotesReceived',
			);
		});

		describe('when asset.votes contain negative and positive amount which makes account.votes to be 10 entries', () => {
			it.todo('should not return error');
			it.todo('should make account to have correct balance');
			it.todo('should make account to have correct unlocking');
			it.todo('should order account.votes');
			it.todo('should order account.unlocking');
			it.todo(
				'should make upvoted delegate account to have correct totalVotesReceived',
			);
			it.todo(
				'should make downvoted delegate account to have correct totalVotesReceived',
			);
		});

		describe('when asset.votes contain delegate address which is not registered', () => {
			it.todo('should return errors');
		});

		describe('when the last asset.votes amount makes sender not having sufficient balance', () => {
			it.todo('should return errors');
		});

		describe('when asset.votes positive amount makese account.votes entries more than 10', () => {
			it.todo('should return errors');
		});

		describe('when asset.votes negative amount decrease acount.votes entries yet positive amount makes account exceeds more than 10', () => {
			it.todo('should return errors');
		});

		describe('when asset.votes negative amount and makes account.unlocking more than 20 entries', () => {
			it.todo('should return errors');
		});

		describe('when asset.votes negative amount exceeds the previously voted amount', () => {
			it.todo('should return errors');
		});
	});

	describe('undoAsset', () => {
		describe('when asset.votes contain positive amount which makes account.votes to be 10 entries', () => {
			it.todo('should not return error');
			it.todo('should make account to have original values before apply');
			it.todo(
				'should make upvoted delegate account to have original values before apply',
			);
		});

		describe('when asset.votes contain negative amount which makes account.votes to be 0 entries', () => {
			it.todo('should not return error');
			it.todo('should make account to have original values before apply');
			it.todo(
				'should make downvoted delegate account to have original values before apply',
			);
		});

		describe('when asset.votes contain negative and positive amount which makes account.votes to be 10 entries', () => {
			it.todo('should not return error');
			it.todo('should make account to have original values before apply');
			it.todo(
				'should make upvoted delegate account to have original values before apply',
			);
			it.todo(
				'should make downvoted delegate account to have original values before apply',
			);
		});
	});
});
