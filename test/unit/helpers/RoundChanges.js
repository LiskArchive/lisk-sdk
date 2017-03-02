'use strict';

var chai = require('chai');
var express = require('express');
var ip = require('ip');
var _  = require('lodash');
var node = require('../../node.js');
var RoundChanges = require('../../../helpers/RoundChanges.js');

describe('RoundChanges', function () {

	var validScope;

	beforeEach(function () {
		validScope = {
			round: 1,
			__private: {
				feesByRound: {
					1: 500
				},
				unFeesByRound: {},
				rewardsByRound: {
					1: [0, 0, 100, 10]
				},
				unRewardsByRound: {}
			}
		};
	});

	describe('constructor', function () {

		it('should accept valid scope', function () {
			var roundChanges = new RoundChanges(validScope);

			node.expect(roundChanges.roundFees).equal(validScope.__private.feesByRound[1]);
			node.expect(_.isEqual(roundChanges.roundRewards, validScope.__private.rewardsByRound[1])).to.be.ok;
		});

		it('should floor fees value', function () {
			validScope.__private.feesByRound[1] = 50.9999999999999; // Float

			var roundChanges = new RoundChanges(validScope);

			node.expect(roundChanges.roundFees).equal(50);
		});

		it('should round up fees after exceeding precision', function () {
			validScope.__private.feesByRound[1] = 50.999999999999999; // Exceeded precision

			var roundChanges = new RoundChanges(validScope);

			node.expect(roundChanges.roundFees).equal(51);
		});

		it('should accept Infinite fees as expected', function () {
			validScope.__private.feesByRound[1] = Number.MAX_VALUE * 2; // Infinity

			var roundChanges = new RoundChanges(validScope);

			node.expect(roundChanges.roundFees).equal(Infinity);
		});

		it('should accept backwards values when present', function () {
			validScope.__private.unRewardsByRound[1] = validScope.__private.rewardsByRound[1].map(function (reward) {
				return reward + 1;
			});
			validScope.__private.unFeesByRound[1] = validScope.__private.feesByRound[1] + 1;
			validScope.backwards = true;

			var roundChanges = new RoundChanges(validScope);

			node.expect(roundChanges.roundFees).equal(validScope.__private.unFeesByRound[1]);
			node.expect(_.isEqual(roundChanges.roundRewards, validScope.__private.unRewardsByRound[1])).to.be.ok;
		});
	});

	describe('at', function () {

		it('should calculate round changes from valid scope', function () {
			var roundChanges = new RoundChanges(validScope);
			var rewardsAt = 2;
			var res = roundChanges.at(rewardsAt);

			node.expect(res.fees).equal(4);
			node.expect(res.feesRemaining).equal(96);
			node.expect(res.rewards).equal(validScope.__private.rewardsByRound[1][rewardsAt]); // 100
			node.expect(res.balance).equal(104);
		});

		it('should calculate round changes from Infinite fees', function () {
			validScope.__private.feesByRound[1] = Infinity;

			var roundChanges = new RoundChanges(validScope);
			var rewardsAt = 2;
			var res = roundChanges.at(rewardsAt);

			node.expect(res.fees).equal(Infinity);
			node.expect(res.feesRemaining).to.be.NaN;
			node.expect(res.rewards).equal(validScope.__private.rewardsByRound[1][rewardsAt]); // 100
			node.expect(res.balance).equal(Infinity);
		});

		it('should calculate round changes from Number.MAX_VALUE fees', function () {
			validScope.__private.feesByRound[1] = Number.MAX_VALUE; // 1.7976931348623157e+308

			var roundChanges = new RoundChanges(validScope);
			var rewardsAt = 2;
			var res = roundChanges.at(rewardsAt);
			var expectedFees = 1779894192932990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099; // 1.7976931348623157e+308 / 101 (delegates num)

			node.expect(res.fees).equal(expectedFees);
			node.expect(res.rewards).equal(validScope.__private.rewardsByRound[1][rewardsAt]); // 100
			node.expect(res.feesRemaining).equal(1);

			var expectedBalance = 1779894192932990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990199; // 1.7976931348623157e+308 / 101 (delegates num) + 100
			node.expect(res.balance).equal(expectedBalance);
		});
	});
});
