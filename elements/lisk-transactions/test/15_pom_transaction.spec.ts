/*
 * Copyright © 2020 Lisk Foundation
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

describe('Proof-of-misbehavior transaction', () => {
	describe('validateAsset', () => {
		it.todo(
			'when first height is greater than or equal to second height but equal maxHeighPrevoted it should not return errors',
		);

		it.todo(
			"when height is greater than the second header's maxHeightPreviouslyForged it should not return errors",
		);

		it.todo(
			'when maxHeightPrevoted is greater than ther second maxHeightPrevoted it should not return errors',
		);

		it.todo('when headers are not contradicting it should return errors');

		it.todo('when headers are not properly signed it should return errors');
	});

	describe('applyAsset', () => {
		it.todo('should add reward to balance of the sender');
		it.todo('should deduct reward to balance of the misbehaving delegate');

		it.todo(
			'should append height h to pomHeights property of misbehaving account',
		);

		it.todo('should set isBanned property to true is pomHeights.length === 5');

		it.todo('should return errors if misbehaving account is not a delegate');

		it.todo('should return errors if misbehaving account is already banned');

		it.todo(
			'should return errors if misbehaving account is already punished at height h',
		);

		it.todo('should return errors if |header1.height - h| >= 260000');

		it.todo('should return errors if |header2.height - h| >= 260000');
	});

	describe('undoAsset', () => {
		it.todo('should deduct reward to balance of the sender');
		it.todo('should add reward to balance of the misbehaving delegate');

		it.todo(
			'should remove height h from pomHeights property of misbehaving account',
		);

		it.todo(
			'should set isBanned property to false is pomHeights.length becomes less than 5',
		);
	});
});
