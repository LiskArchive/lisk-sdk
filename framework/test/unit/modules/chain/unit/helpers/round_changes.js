/*
 * Copyright © 2018 Lisk Foundation
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
 */

'use strict';

const RoundChanges = require('../../../../../../src/modules/chain/helpers/round_changes.js');

describe('RoundChanges', () => {
	let validScope;

	beforeEach(done => {
		validScope = {
			round: 1,
			roundFees: 500,
			roundRewards: [0, 0, 100, 10],
		};
		done();
	});

	describe('constructor', () => {
		it('should accept valid scope', async () => {
			const roundChanges = new RoundChanges(validScope);

			expect(roundChanges.roundFees).equal(validScope.roundFees);
			return expect(
				_.isEqual(roundChanges.roundRewards, validScope.roundRewards)
			).to.be.ok;
		});

		it('should floor fees value', async () => {
			validScope.roundFees = 50.9999999999999; // Float

			const roundChanges = new RoundChanges(validScope);

			return expect(roundChanges.roundFees).equal(50);
		});

		it('should round up fees after exceeding precision', async () => {
			validScope.roundFees = 50.999999999999999; // Exceeded precision

			const roundChanges = new RoundChanges(validScope);

			return expect(roundChanges.roundFees).equal(51);
		});

		it('should accept Infinite fees as expected', async () => {
			validScope.roundFees = Number.MAX_VALUE * 2; // Infinity

			const roundChanges = new RoundChanges(validScope);

			return expect(roundChanges.roundFees).equal(Infinity);
		});
	});

	describe('at', () => {
		it('should calculate round changes from valid scope', async () => {
			const roundChanges = new RoundChanges(validScope);
			const rewardsAt = 2;
			const res = roundChanges.at(rewardsAt);

			expect(res.fees).equal(4);
			expect(res.feesRemaining).equal(96);
			expect(res.rewards).equal(validScope.roundRewards[rewardsAt]); // 100
			return expect(res.balance).equal(104);
		});

		it('should calculate round changes from Infinite fees', async () => {
			validScope.roundFees = Infinity;

			const roundChanges = new RoundChanges(validScope);
			const rewardsAt = 2;
			const res = roundChanges.at(rewardsAt);

			expect(res.fees).equal(Infinity);
			expect(res.feesRemaining).to.be.NaN;
			expect(res.rewards).equal(validScope.roundRewards[rewardsAt]); // 100
			return expect(res.balance).equal(Infinity);
		});

		it('should calculate round changes from Number.MAX_VALUE fees', async () => {
			validScope.roundFees = Number.MAX_VALUE; // 1.7976931348623157e+308

			const roundChanges = new RoundChanges(validScope);
			const rewardsAt = 2;
			const res = roundChanges.at(rewardsAt);
			const expectedFees = 1779894192932990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099; // 1.7976931348623157e+308 / 101 (delegates num)

			expect(res.fees).equal(expectedFees);
			expect(res.rewards).equal(validScope.roundRewards[rewardsAt]); // 100
			expect(res.feesRemaining).equal(1);

			const expectedBalance = 1779894192932990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990199; // 1.7976931348623157e+308 / 101 (delegates num) + 100
			return expect(res.balance).equal(expectedBalance);
		});
	});
});
