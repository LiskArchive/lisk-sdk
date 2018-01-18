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

var express = require('express');
var ip = require('ip');
var RoundChanges = require('../../../helpers/RoundChanges.js');

describe('RoundChanges', function () {

	var validScope;

	beforeEach(function () {
		validScope = {
			round: 1,
			roundFees: 500,
			roundRewards: [0, 0, 100, 10]
		};
	});

	describe('constructor', function () {

		it('should accept valid scope', function () {
			var roundChanges = new RoundChanges(validScope);

			roundChanges.roundFees.should.equal(validScope.roundFees);
			_.isEqual(roundChanges.roundRewards, validScope.roundRewards).should.be.ok;
		});

		it('should floor fees value', function () {
			validScope.roundFees = 50.9999999999999; // Float

			var roundChanges = new RoundChanges(validScope);

			roundChanges.roundFees.should.equal(50);
		});

		it('should round up fees after exceeding precision', function () {
			validScope.roundFees = 50.999999999999999; // Exceeded precision

			var roundChanges = new RoundChanges(validScope);

			roundChanges.roundFees.should.equal(51);
		});

		it('should accept Infinite fees as expected', function () {
			validScope.roundFees = Number.MAX_VALUE * 2; // Infinity

			var roundChanges = new RoundChanges(validScope);

			roundChanges.roundFees.should.equal(Infinity);
		});
	});

	describe('at', function () {

		it('should calculate round changes from valid scope', function () {
			var roundChanges = new RoundChanges(validScope);
			var rewardsAt = 2;
			var res = roundChanges.at(rewardsAt);

			res.fees.should.equal(4);
			res.feesRemaining.should.equal(96);
			res.rewards.should.equal(validScope.roundRewards[rewardsAt]); // 100
			res.balance.should.equal(104);
		});

		it('should calculate round changes from Infinite fees', function () {
			validScope.roundFees = Infinity;

			var roundChanges = new RoundChanges(validScope);
			var rewardsAt = 2;
			var res = roundChanges.at(rewardsAt);

			res.fees.should.equal(Infinity);
			res.feesRemaining.should.be.NaN;
			res.rewards.should.equal(validScope.roundRewards[rewardsAt]); // 100
			res.balance.should.equal(Infinity);
		});

		it('should calculate round changes from Number.MAX_VALUE fees', function () {
			validScope.roundFees = Number.MAX_VALUE; // 1.7976931348623157e+308

			var roundChanges = new RoundChanges(validScope);
			var rewardsAt = 2;
			var res = roundChanges.at(rewardsAt);
			var expectedFees = 1779894192932990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099; // 1.7976931348623157e+308 / 101 (delegates num)

			res.fees.should.equal(expectedFees);
			res.rewards.should.equal(validScope.roundRewards[rewardsAt]); // 100
			res.feesRemaining.should.equal(1);

			var expectedBalance = 1779894192932990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990199; // 1.7976931348623157e+308 / 101 (delegates num) + 100
			res.balance.should.equal(expectedBalance);
		});
	});
});
