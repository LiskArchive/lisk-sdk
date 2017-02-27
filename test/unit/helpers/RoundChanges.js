'use strict'; /*jslint mocha:true, expr:true */

var chai = require('chai');
var express = require('express');
var ip = require('ip');
var _  = require('lodash');
var node = require('../../node.js');
var RoundChanges = require('../../../helpers/RoundChanges.js');

describe('RoundChanges', function () {

	describe('constructor', function () {

		it('should accept valid round fees', function () {
			var round = 1;
			var fees = 500;
			var rewards = [0, 0, 100, 10];

			var scope = {
				round: round,
				__private: {
					feesByRound: {},
					rewardsByRound: {}
				}
			};
			scope.__private.feesByRound[round] = fees;
			scope.__private.rewardsByRound[round] = rewards;

			var roundChanges = new RoundChanges(scope);

			node.expect(roundChanges.roundFees).equal(fees);
			node.expect(_.isEqual(roundChanges.roundRewards, rewards)).to.be.ok;
		});

		it('should take floor from fees value', function () {
			var round = 1;
			var fees = 50.9999999999999;

			var scope = {
				round: round,
				__private: {
					feesByRound: {},
					rewardsByRound: {}
				}
			};
			scope.__private.feesByRound[round] = fees;

			var roundChanges = new RoundChanges(scope);

			node.expect(roundChanges.roundFees).equal(50);
		});

		it('should take rounded number after exceeding precision', function () {
			var round = 1;
			var fees = 50.999999999999999; //exceeded precision
			node.expect(fees).equals(51);
			var scope = {
				round: round,
				__private: {
					feesByRound: {},
					rewardsByRound: {}
				}
			};
			scope.__private.feesByRound[round] = fees;

			var roundChanges = new RoundChanges(scope);

			node.expect(roundChanges.roundFees).equal(51);
		});

		it('should works properly for Infinity', function () {
			var round = 1;
			var fees = Number.MAX_VALUE;
			var scope = {
				round: round,
				__private: {
					feesByRound: {},
					rewardsByRound: {}
				}
			};
			scope.__private.feesByRound[round] = fees * 2;

			var roundChanges = new RoundChanges(scope);

			node.expect(roundChanges.roundFees).equal(Infinity);
		});

		it('should accept accept backwards values if present', function () {
			var round = 1;
			var fees = 500;
			var rewards = [0, 0, 100, 10];
			var unRewards = rewards.map(function (reward) {
				return reward + 1;
			});
			var unFees = fees + 1;

			var scope = {
				round: round,
				backwards: true,
				__private: {
					feesByRound: {},
					rewardsByRound: {},
					unFeesByRound: {},
					unRewardsByRound: {}
				}
			};
			scope.__private.feesByRound[round] = fees;
			scope.__private.rewardsByRound[round] = rewards;
			scope.__private.unFeesByRound[round] = unFees;
			scope.__private.unRewardsByRound[round] = unRewards;

			var roundChanges = new RoundChanges(scope);

			node.expect(roundChanges.roundFees).equal(unFees);
			node.expect(_.isEqual(roundChanges.roundRewards, unRewards)).to.be.ok;
		});
	});

	describe('at', function () {
		it('should calculate given reward for mocked data', function () {
			var round = 1;
			var fees = 500;
			var rewards = [0, 0, 100, 10];

			var scope = {
				round: round,
				__private: {
					feesByRound: {},
					rewardsByRound: {}
				}
			};
			scope.__private.feesByRound[round] = fees;
			scope.__private.rewardsByRound[round] = rewards;

			var roundChanges = new RoundChanges(scope);
			var rewardsAt = 2;
			var res = roundChanges.at(rewardsAt);

			node.expect(res.fees).equal(4);
			node.expect(res.feesRemaining).equal(96);
			node.expect(res.rewards).equal(rewards[rewardsAt]); //100
			node.expect(res.balance).equal(104);
		});

		it('should deal with Infinite', function () {
			var round = 1;
			var fees = Infinity;
			var rewards = [0, 0, 100, 10];

			var scope = {
				round: round,
				__private: {
					feesByRound: {},
					rewardsByRound: {}
				}
			};
			scope.__private.feesByRound[round] = fees;
			scope.__private.rewardsByRound[round] = rewards;

			var roundChanges = new RoundChanges(scope);
			var rewardsAt = 2;
			var res = roundChanges.at(rewardsAt);

			node.expect(res.fees).equal(Infinity);
			node.expect(res.feesRemaining).to.be.NaN;
			node.expect(res.rewards).equal(rewards[rewardsAt]); //100
			node.expect(res.balance).equal(Infinity);
		});

		it('should deal with max numbers', function () {
			var round = 1;
			var fees = Number.MAX_VALUE; //1.7976931348623157e+308

			var rewards = [0, 0, 100, 10];

			var scope = {
				round: round,
				__private: {
					feesByRound: {},
					rewardsByRound: {}
				}
			};
			scope.__private.feesByRound[round] = fees;
			scope.__private.rewardsByRound[round] = rewards;

			var roundChanges = new RoundChanges(scope);
			var rewardsAt = 2;
			var res = roundChanges.at(rewardsAt);
			var expectedFees = 1779894192932990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099; // 1.7976931348623157e+308 / 101 (delegates num)
			node.expect(res.fees).equal(expectedFees);
			node.expect(res.rewards).equal(rewards[rewardsAt]); //100
			node.expect(res.feesRemaining).equal(1);
			var expectedBalance = 1779894192932990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990199; // 1.7976931348623157e+308 / 101 (delegates num) + 100
			node.expect(res.balance).equal(expectedBalance);
		});
	});
});
