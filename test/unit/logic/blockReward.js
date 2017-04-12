'use strict';

var chai = require('chai');
var expect = require('chai').expect;

var BlockReward = require('../../../logic/blockReward.js');
var constants = require('../../../helpers/constants.js');

constants.rewards.distance = 3000000;
constants.rewards.offset = 1451520;

describe('BlockReward', function () {

	var blockReward = new BlockReward();

	describe('returning calcMilestone', function () {

		it('when height is undefined should throw an error', function () {
			expect(blockReward.calcMilestone).to.throw(/Invalid block height/);
		});

		it('when height == 0 should return 0', function () {
			expect(blockReward.calcMilestone(0)).to.equal(0);
		});

		it('when height == 1 should return 0', function () {
			expect(blockReward.calcMilestone(1)).to.equal(0);
		});

		it('when height == (offset - 1) should return 0', function () {
			expect(blockReward.calcMilestone(1451519)).to.equal(0);
		});

		it('when height == (offset) should return 0', function () {
			expect(blockReward.calcMilestone(1451520)).to.equal(0);
		});

		it('when height == (offset + 1) should return 0', function () {
			expect(blockReward.calcMilestone(1451521)).to.equal(0);
		});

		it('when height == (offset + 2) should return 0', function () {
			expect(blockReward.calcMilestone(1451522)).to.equal(0);
		});

		it('when height == (distance) should return 0', function () {
			expect(blockReward.calcMilestone(3000000)).to.equal(0);
		});

		it('when height == (distance + 1) should return 0', function () {
			expect(blockReward.calcMilestone(3000001)).to.equal(0);
		});

		it('when height == (distance + 2) should return 0', function () {
			expect(blockReward.calcMilestone(3000002)).to.equal(0);
		});

		it('when height == (milestoneOne - 1) should return 0', function () {
			expect(blockReward.calcMilestone(4451519)).to.equal(0);
		});

		it('when height == (milestoneOne) should return 1', function () {
			expect(blockReward.calcMilestone(4451520)).to.equal(1);
		});

		it('when height == (milestoneOne + 1) should return 1', function () {
			expect(blockReward.calcMilestone(4451521)).to.equal(1);
		});

		it('when height == (milestoneTwo - 1) should return 1', function () {
			expect(blockReward.calcMilestone(7451519)).to.equal(1);
		});

		it('when height == (milestoneTwo) should return 2', function () {
			expect(blockReward.calcMilestone(7451520)).to.equal(2);
		});

		it('when height == (milestoneTwo + 1) should return 2', function () {
			expect(blockReward.calcMilestone(7451521)).to.equal(2);
		});

		it('when height == (milestoneThree - 1) should return 2', function () {
			expect(blockReward.calcMilestone(10451519)).to.equal(2);
		});

		it('when height == (milestoneThree) should return 3', function () {
			expect(blockReward.calcMilestone(10451520)).to.equal(3);
		});

		it('when height == (milestoneThree + 1) should return 3', function () {
			expect(blockReward.calcMilestone(10451521)).to.equal(3);
		});

		it('when height == (milestoneFour - 1) should return 3', function () {
			expect(blockReward.calcMilestone(13451519)).to.equal(3);
		});

		it('when height == (milestoneFour) should return 4', function () {
			expect(blockReward.calcMilestone(13451520)).to.equal(4);
		});

		it('when height == (milestoneFour + 1) should return 4', function () {
			expect(blockReward.calcMilestone(13451521)).to.equal(4);
		});

		it('when height == (milestoneFour * 2) should return 4', function () {
			expect(blockReward.calcMilestone(13451520 * 2)).to.equal(4);
		});

		it('when height == (milestoneFour * 10) should return 4', function () {
			expect(blockReward.calcMilestone(13451520 * 10)).to.equal(4);
		});

		it('when height == (milestoneFour * 100) should return 4', function () {
			expect(blockReward.calcMilestone(13451520 * 100)).to.equal(4);
		});

		it('when height == (milestoneFour * 1000) should return 4', function () {
			expect(blockReward.calcMilestone(13451520 * 1000)).to.equal(4);
		});

		it('when height == (milestoneFour * 10000) should return 4', function () {
			expect(blockReward.calcMilestone(13451520 * 10000)).to.equal(4);
		});

		it('when height == (milestoneFour * 100000) should return 4', function () {
			expect(blockReward.calcMilestone(13451520 * 100000)).to.equal(4);
		});
	});

	describe('returning calcReward', function () {

		it('when height is undefined should throw an error', function () {
			expect(blockReward.calcReward).to.throw(/Invalid block height/);
		});

		it('when height == 0 should return 0', function () {
			expect(blockReward.calcReward(0)).to.equal(0);
		});

		it('when height == 1 should return 0', function () {
			expect(blockReward.calcReward(1)).to.equal(0);
		});

		it('when height == (offset - 1) should return 0', function () {
			expect(blockReward.calcReward(1451519)).to.equal(0);
		});

		it('when height == (offset) should return 500000000', function () {
			expect(blockReward.calcReward(1451520)).to.equal(500000000);
		});

		it('when height == (offset + 1) should return 500000000', function () {
			expect(blockReward.calcReward(1451521)).to.equal(500000000);
		});

		it('when height == (offset + 2) should return 500000000', function () {
			expect(blockReward.calcReward(1451522)).to.equal(500000000);
		});

		it('when height == (distance) should return 500000000', function () {
			expect(blockReward.calcReward(3000000)).to.equal(500000000);
		});

		it('when height == (distance + 1) should return 500000000', function () {
			expect(blockReward.calcReward(3000001)).to.equal(500000000);
		});

		it('when height == (distance + 2) should return 500000000', function () {
			expect(blockReward.calcReward(3000002)).to.equal(500000000);
		});

		it('when height == (milestoneOne - 1) should return 500000000', function () {
			expect(blockReward.calcReward(4451519)).to.equal(500000000);
		});

		it('when height == (milestoneOne) should return 400000000', function () {
			expect(blockReward.calcReward(4451520)).to.equal(400000000);
		});

		it('when height == (milestoneOne + 1) should return 400000000', function () {
			expect(blockReward.calcReward(4451521)).to.equal(400000000);
		});

		it('when height == (milestoneTwo - 1) should return 400000000', function () {
			expect(blockReward.calcReward(7451519)).to.equal(400000000);
		});

		it('when height == (milestoneTwo) should return 300000000', function () {
			expect(blockReward.calcReward(7451521)).to.equal(300000000);
		});

		it('when height == (milestoneTwo + 1) should return 300000000', function () {
			expect(blockReward.calcReward(7451522)).to.equal(300000000);
		});

		it('when height == (milestoneThree - 1) should return 300000000', function () {
			expect(blockReward.calcReward(10451519)).to.equal(300000000);
		});

		it('when height == (milestoneThree) should return 200000000', function () {
			expect(blockReward.calcReward(10451520)).to.equal(200000000);
		});

		it('when height == (milestoneThree + 1) should return 200000000', function () {
			expect(blockReward.calcReward(10451521)).to.equal(200000000);
		});

		it('when height == (milestoneFour - 1) should return 200000000', function () {
			expect(blockReward.calcReward(13451519)).to.equal(200000000);
		});

		it('when height == (milestoneFour) should return 100000000', function () {
			expect(blockReward.calcReward(13451520)).to.equal(100000000);
		});

		it('when height == (milestoneFour + 1) should return 100000000', function () {
			expect(blockReward.calcReward(13451521)).to.equal(100000000);
		});

		it('when height == (milestoneFour * 2) should return 100000000', function () {
			expect(blockReward.calcReward(13451520 * 2)).to.equal(100000000);
		});

		it('when height == (milestoneFour * 10) should return 100000000', function () {
			expect(blockReward.calcReward(13451520 * 10)).to.equal(100000000);
		});

		it('when height == (milestoneFour * 100) should return 100000000', function () {
			expect(blockReward.calcReward(13451520 * 100)).to.equal(100000000);
		});

		it('when height == (milestoneFour * 1000) should return 100000000', function () {
			expect(blockReward.calcReward(13451520 * 1000)).to.equal(100000000);
		});

		it('when height == (milestoneFour * 10000) should return 100000000', function () {
			expect(blockReward.calcReward(13451520 * 10000)).to.equal(100000000);
		});

		it('when height == (milestoneFour * 100000) should return 100000000', function () {
			expect(blockReward.calcReward(13451520 * 100000)).to.equal(100000000);
		});
	});

	describe('returning calcSupply', function () {

		it('when height is undefined should throw an error', function () {
			expect(blockReward.calcSupply).to.throw(/Invalid block height/);
		});

		it('when height == 0 should return 10000000000000000', function () {
			expect(blockReward.calcSupply(0)).to.equal(10000000000000000);
		});

		it('when height == 1 should return 10000000000000000', function () {
			expect(blockReward.calcSupply(1)).to.equal(10000000000000000);
		});

		it('when height == (offset - 1) should return 10000000000000000', function () {
			expect(blockReward.calcSupply(1451519)).to.equal(10000000000000000);
		});

		it('when height == (offset) should return 10000000500000000', function () {
			expect(blockReward.calcSupply(1451520)).to.equal(10000000500000000);
		});

		it('when height == (offset + 1) should return 10000001000000000', function () {
			expect(blockReward.calcSupply(1451521)).to.equal(10000001000000000);
		});

		it('when height == (offset + 2) should return 10000001500000000', function () {
			expect(blockReward.calcSupply(1451522)).to.equal(10000001500000000);
		});

		it('when height == (distance) should return 10774240500000000', function () {
			expect(blockReward.calcSupply(3000000)).to.equal(10774240500000000);
		});

		it('when height == (distance + 1) should return 10774241000000000', function () {
			expect(blockReward.calcSupply(3000001)).to.equal(10774241000000000);
		});

		it('when height == (distance + 2) should return 10774241500000000', function () {
			expect(blockReward.calcSupply(3000002)).to.equal(10774241500000000);
		});

		it('when height == (milestoneOne - 1) should return 11500000000000000', function () {
			expect(blockReward.calcSupply(4451519)).to.equal(11500000000000000);
		});

		it('when height == (milestoneOne) should return 11500000400000000', function () {
			expect(blockReward.calcSupply(4451520)).to.equal(11500000400000000);
		});

		it('when height == (milestoneOne + 1) should return 11500000800000000', function () {
			expect(blockReward.calcSupply(4451521)).to.equal(11500000800000000);
		});

		it('when height == (milestoneTwo - 1) should return 12700000000000000', function () {
			expect(blockReward.calcSupply(7451519)).to.equal(12700000000000000);
		});

		it('when height == (milestoneTwo) should return 12700000300000000', function () {
			expect(blockReward.calcSupply(7451520)).to.equal(12700000300000000);
		});

		it('when height == (milestoneTwo + 1) should return 12700000600000000', function () {
			expect(blockReward.calcSupply(7451521)).to.equal(12700000600000000);
		});

		it('when height == (milestoneThree - 1) should return 13600000000000000', function () {
			expect(blockReward.calcSupply(10451519)).to.equal(13600000000000000);
		});

		it('when height == (milestoneThree) should return 13600000200000000', function () {
			expect(blockReward.calcSupply(10451520)).to.equal(13600000200000000);
		});

		it('when height == (milestoneThree + 1) should return 13600000400000000', function () {
			expect(blockReward.calcSupply(10451521)).to.equal(13600000400000000);
		});

		it('when height == (milestoneFour - 1) should return 14200000000000000', function () {
			expect(blockReward.calcSupply(13451519)).to.equal(14200000000000000);
		});

		it('when height == (milestoneFour) should return 14200000100000000', function () {
			expect(blockReward.calcSupply(13451520)).to.equal(14200000100000000);
		});

		it('when height == (milestoneFour + 1) should return 14200000200000000', function () {
			expect(blockReward.calcSupply(13451521)).to.equal(14200000200000000);
		});

		it('when height == (milestoneFour * 2) should return 15545152100000000', function () {
			expect(blockReward.calcSupply(13451520 * 2)).to.equal(15545152100000000);
		});

		it('when height == (milestoneFour * 10) should return 26306368100000000', function () {
			expect(blockReward.calcSupply(13451520 * 10)).to.equal(26306368100000000);
		});

		it('when height == (milestoneFour * 100) should return 147370048100000000', function () {
			expect(blockReward.calcSupply(13451520 * 100)).to.equal(147370048100000000);
		});

		it('when height == (milestoneFour * 1000) should return 1358006848100000000', function () {
			expect(blockReward.calcSupply(13451520 * 1000)).to.equal(1358006848100000000);
		});

		it('when height == (milestoneFour * 10000) should return 13464374848100000000', function () {
			expect(blockReward.calcSupply(13451520 * 10000)).to.equal(13464374848100000000);
		});

		it('when height == (milestoneFour * 100000) should return 134528054848100000000', function () {
			expect(blockReward.calcSupply(13451520 * 100000)).to.equal(134528054848100000000);
		});

		describe('completely', function () {

			describe('before reward offset', function () {

				it('should be ok', function () {
					var supply = blockReward.calcSupply(1);
					var prev = supply;

					for (var i = 1; i < 1451520; i++) {
						supply = blockReward.calcSupply(i);
						expect(supply).to.equal(constants.totalAmount);
						prev = supply;
					}
				});
			});

			describe('for milestone 0', function () {

				it('should be ok', function () {
					var supply = blockReward.calcSupply(1451519);
					var prev = supply;

					for (var i = 1451520; i < 4451520; i++) {
						supply = blockReward.calcSupply(i);
						expect(supply).to.equal(prev + constants.rewards.milestones[0]);
						prev = supply;
					}
				});
			});

			describe('for milestone 1', function () {

				it('should be ok', function () {
					var supply = blockReward.calcSupply(4451519);
					var prev = supply;

					for (var i = 4451520; i < 7451520; i++) {
						supply = blockReward.calcSupply(i);
						expect(supply).to.equal(prev + constants.rewards.milestones[1]);
						prev = supply;
					}
				});
			});

			describe('for milestone 2', function () {

				it('should be ok', function () {
					var supply = blockReward.calcSupply(7451519);
					var prev = supply;

					for (var i = 7451520; i < 10451520; i++) {
						supply = blockReward.calcSupply(i);
						expect(supply).to.equal(prev + constants.rewards.milestones[2]);
						prev = supply;
					}
				});
			});

			describe('for milestone 3', function () {

				it('should be ok', function () {
					var supply = blockReward.calcSupply(10451519);
					var prev = supply;

					for (var i = 10451520; i < 13451520; i++) {
						supply = blockReward.calcSupply(i);
						expect(supply).to.equal(prev + constants.rewards.milestones[3]);
						prev = supply;
					}
				});
			});

			describe('for milestone 4 and beyond', function () {

				it('should be ok', function () {
					var supply = blockReward.calcSupply(13451519);
					var prev = supply;

					for (var i = 13451520; i < (13451520 + 100); i++) {
						supply = blockReward.calcSupply(i);
						expect(supply).to.equal(prev + constants.rewards.milestones[4]);
						prev = supply;
					}
				});
			});
		});
	});
});
