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

const BigNum = require('@liskhq/bignum');
const {
	BlockReward,
} = require('../../../../../../src/modules/chain/blocks/block_reward');

describe('BlockReward @slow', () => {
	let blockReward;

	const totalAmount = '10000000000000000';
	const milestones = [
		'500000000', // Initial Reward
		'400000000', // Milestone 1
		'300000000', // Milestone 2
		'200000000', // Milestone 3
		'100000000', // Milestone 4
	];

	before(async () => {
		blockReward = new BlockReward({
			distance: 3000000,
			rewardOffset: 1451520,
			milestones: [...milestones],
			totalAmount: '10000000000000000',
		});
	});

	describe('calcMilestone', () => {
		it('when height is undefined should throw an error', async () =>
			expect(() => blockReward.calcMilestone()).to.throw(
				(TypeError, 'Invalid block height')
			));

		it('when height == 0 should return 0', async () =>
			expect(blockReward.calcMilestone(0)).to.equal(0));

		it('when height == 1 should return 0', async () =>
			expect(blockReward.calcMilestone(1)).to.equal(0));

		it('when height == (offset - 1) should return 0', async () =>
			expect(blockReward.calcMilestone(1451519)).to.equal(0));

		it('when height == (offset) should return 0', async () =>
			expect(blockReward.calcMilestone(1451520)).to.equal(0));

		it('when height == (offset + 1) should return 0', async () =>
			expect(blockReward.calcMilestone(1451521)).to.equal(0));

		it('when height == (offset + 2) should return 0', async () =>
			expect(blockReward.calcMilestone(1451522)).to.equal(0));

		it('when height == (distance) should return 0', async () =>
			expect(blockReward.calcMilestone(3000000)).to.equal(0));

		it('when height == (distance + 1) should return 0', async () =>
			expect(blockReward.calcMilestone(3000001)).to.equal(0));

		it('when height == (distance + 2) should return 0', async () =>
			expect(blockReward.calcMilestone(3000002)).to.equal(0));

		it('when height == (milestoneOne - 1) should return 0', async () =>
			expect(blockReward.calcMilestone(4451519)).to.equal(0));

		it('when height == (milestoneOne) should return 1', async () =>
			expect(blockReward.calcMilestone(4451520)).to.equal(1));

		it('when height == (milestoneOne + 1) should return 1', async () =>
			expect(blockReward.calcMilestone(4451521)).to.equal(1));

		it('when height == (milestoneTwo - 1) should return 1', async () =>
			expect(blockReward.calcMilestone(7451519)).to.equal(1));

		it('when height == (milestoneTwo) should return 2', async () =>
			expect(blockReward.calcMilestone(7451520)).to.equal(2));

		it('when height == (milestoneTwo + 1) should return 2', async () =>
			expect(blockReward.calcMilestone(7451521)).to.equal(2));

		it('when height == (milestoneThree - 1) should return 2', async () =>
			expect(blockReward.calcMilestone(10451519)).to.equal(2));

		it('when height == (milestoneThree) should return 3', async () =>
			expect(blockReward.calcMilestone(10451520)).to.equal(3));

		it('when height == (milestoneThree + 1) should return 3', async () =>
			expect(blockReward.calcMilestone(10451521)).to.equal(3));

		it('when height == (milestoneFour - 1) should return 3', async () =>
			expect(blockReward.calcMilestone(13451519)).to.equal(3));

		it('when height == (milestoneFour) should return 4', async () =>
			expect(blockReward.calcMilestone(13451520)).to.equal(4));

		it('when height == (milestoneFour + 1) should return 4', async () =>
			expect(blockReward.calcMilestone(13451521)).to.equal(4));

		it('when height == (milestoneFour * 2) should return 4', async () =>
			expect(blockReward.calcMilestone(new BigNum(13451520).times(2))).to.equal(
				4
			));

		it('when height == (milestoneFour * 10) should return 4', async () =>
			expect(
				blockReward.calcMilestone(new BigNum(13451520).times(10))
			).to.equal(4));

		it('when height == (milestoneFour * 100) should return 4', async () =>
			expect(
				blockReward.calcMilestone(new BigNum(13451520).times(100))
			).to.equal(4));

		it('when height == (milestoneFour * 1000) should return 4', async () =>
			expect(
				blockReward.calcMilestone(new BigNum(13451520).times(1000))
			).to.equal(4));

		it('when height == (milestoneFour * 10000) should return 4', async () =>
			expect(
				blockReward.calcMilestone(new BigNum(13451520).times(10000))
			).to.equal(4));

		it('when height == (milestoneFour * 100000) should return 4', async () =>
			expect(
				blockReward.calcMilestone(new BigNum(13451520).times(100000))
			).to.equal(4));
	});

	describe('calcReward', () => {
		it('when height is undefined should throw an error', async () =>
			expect(() => blockReward.calcReward()).to.throw(
				(TypeError, 'Invalid block height')
			));

		it('when height == 0 should return 0', async () =>
			expect(blockReward.calcReward(0).equals(0)).to.be.true);

		it('when height == 1 should return 0', async () =>
			expect(blockReward.calcReward(1).equals('0')).to.be.true);

		it('when height == (offset - 1) should return 0', async () =>
			expect(blockReward.calcReward(1451519).equals('0')).to.be.true);

		it('when height == (offset) should return 500000000', async () =>
			expect(blockReward.calcReward(1451520).equals('500000000')).to.be.true);

		it('when height == (offset + 1) should return 500000000', async () =>
			expect(blockReward.calcReward(1451521).equals('500000000')).to.be.true);

		it('when height == (offset + 2) should return 500000000', async () =>
			expect(blockReward.calcReward(1451522).equals('500000000')).to.be.true);

		it('when height == (distance) should return 500000000', async () =>
			expect(blockReward.calcReward(3000000).equals('500000000')).to.be.true);

		it('when height == (distance + 1) should return 500000000', async () =>
			expect(blockReward.calcReward(3000001).equals('500000000')).to.be.true);

		it('when height == (distance + 2) should return 500000000', async () =>
			expect(blockReward.calcReward(3000002).equals('500000000')).to.be.true);

		it('when height == (milestoneOne - 1) should return 500000000', async () =>
			expect(blockReward.calcReward(4451519).equals('500000000')).to.be.true);

		it('when height == (milestoneOne) should return 400000000', async () =>
			expect(blockReward.calcReward(4451520).equals('400000000')).to.be.true);

		it('when height == (milestoneOne + 1) should return 400000000', async () =>
			expect(blockReward.calcReward(4451521).equals('400000000')).to.be.true);

		it('when height == (milestoneTwo - 1) should return 400000000', async () =>
			expect(blockReward.calcReward(7451519).equals('400000000')).to.be.true);

		it('when height == (milestoneTwo) should return 300000000', async () =>
			expect(blockReward.calcReward(7451521).equals('300000000')).to.be.true);

		it('when height == (milestoneTwo + 1) should return 300000000', async () =>
			expect(blockReward.calcReward(7451522).equals('300000000')).to.be.true);

		it('when height == (milestoneThree - 1) should return 300000000', async () =>
			expect(blockReward.calcReward(10451519).equals('300000000')).to.be.true);

		it('when height == (milestoneThree) should return 200000000', async () =>
			expect(blockReward.calcReward(10451520).equals('200000000')).to.be.true);

		it('when height == (milestoneThree + 1) should return 200000000', async () =>
			expect(blockReward.calcReward(10451521).equals('200000000')).to.be.true);

		it('when height == (milestoneFour - 1) should return 200000000', async () =>
			expect(blockReward.calcReward(13451519).equals('200000000')).to.be.true);

		it('when height == (milestoneFour) should return 100000000', async () =>
			expect(blockReward.calcReward(13451520).equals('100000000')).to.be.true);

		it('when height == (milestoneFour + 1) should return 100000000', async () =>
			expect(blockReward.calcReward(13451521).equals('100000000')).to.be.true);

		it('when height == (milestoneFour * 2) should return 100000000', async () =>
			expect(
				blockReward
					.calcReward(new BigNum(13451520).times(2))
					.equals('100000000')
			).to.be.true);

		it('when height == (milestoneFour * 10) should return 100000000', async () =>
			expect(
				blockReward
					.calcReward(new BigNum(13451520).times(10))
					.equals('100000000')
			).to.be.true);

		it('when height == (milestoneFour * 100) should return 100000000', async () =>
			expect(
				blockReward
					.calcReward(new BigNum(13451520).times(100))
					.equals('100000000')
			).to.be.true);

		it('when height == (milestoneFour * 1000) should return 100000000', async () =>
			expect(
				blockReward
					.calcReward(new BigNum(13451520).times(1000))
					.equals('100000000')
			).to.be.true);

		it('when height == (milestoneFour * 10000) should return 100000000', async () =>
			expect(
				blockReward
					.calcReward(new BigNum(13451520).times(10000))
					.equals('100000000')
			).to.be.true);

		it('when height == (milestoneFour * 100000) should return 100000000', async () =>
			expect(
				blockReward
					.calcReward(new BigNum(13451520).times(100000))
					.equals('100000000')
			).to.be.true);
	});

	describe('calcSupply', () => {
		it('when height is undefined should throw an error', async () =>
			expect(() => blockReward.calcSupply()).to.throw(
				(TypeError, 'Invalid block height')
			));

		it('when height == 0 should return 10000000000000000', async () =>
			expect(blockReward.calcSupply(0).equals('10000000000000000')).to.be.true);

		it('when height == 1 should return 10000000000000000', async () =>
			expect(blockReward.calcSupply(1).equals('10000000000000000')).to.be.true);

		it('when height == (offset - 1) should return 10000000000000000', async () =>
			expect(blockReward.calcSupply(1451519).equals('10000000000000000')).to.be
				.true);

		it('when height == (offset) should return 10000000500000000', async () =>
			expect(blockReward.calcSupply(1451520).equals('10000000500000000')).to.be
				.true);

		it('when height == (offset + 1) should return 10000001000000000', async () =>
			expect(blockReward.calcSupply(1451521).equals('10000001000000000')).to.be
				.true);

		it('when height == (offset + 2) should return 10000001500000000', async () =>
			expect(blockReward.calcSupply(1451522).equals('10000001500000000')).to.be
				.true);

		it('when height == (distance) should return 10774240500000000', async () =>
			expect(blockReward.calcSupply(3000000).equals('10774240500000000')).to.be
				.true);

		it('when height == (distance + 1) should return 10774241000000000', async () =>
			expect(blockReward.calcSupply(3000001).equals('10774241000000000')).to.be
				.true);

		it('when height == (distance + 2) should return 10774241500000000', async () =>
			expect(blockReward.calcSupply(3000002).equals('10774241500000000')).to.be
				.true);

		it('when height == (milestoneOne - 1) should return 11500000000000000', async () =>
			expect(blockReward.calcSupply(4451519).equals('11500000000000000')).to.be
				.true);

		it('when height == (milestoneOne) should return 11500000400000000', async () =>
			expect(blockReward.calcSupply(4451520).equals('11500000400000000')).to.be
				.true);

		it('when height == (milestoneOne + 1) should return 11500000800000000', async () =>
			expect(blockReward.calcSupply(4451521).equals('11500000800000000')).to.be
				.true);

		it('when height == (milestoneTwo - 1) should return 12700000000000000', async () =>
			expect(blockReward.calcSupply(7451519).equals('12700000000000000')).to.be
				.true);

		it('when height == (milestoneTwo) should return 12700000300000000', async () =>
			expect(blockReward.calcSupply(7451520).equals('12700000300000000')).to.be
				.true);

		it('when height == (milestoneTwo + 1) should return 12700000600000000', async () =>
			expect(blockReward.calcSupply(7451521).equals('12700000600000000')).to.be
				.true);

		it('when height == (milestoneThree - 1) should return 13600000000000000', async () =>
			expect(blockReward.calcSupply(10451519).equals('13600000000000000')).to.be
				.true);

		it('when height == (milestoneThree) should return 13600000200000000', async () =>
			expect(blockReward.calcSupply(10451520).equals('13600000200000000')).to.be
				.true);

		it('when height == (milestoneThree + 1) should return 13600000400000000', async () =>
			expect(blockReward.calcSupply(10451521).equals('13600000400000000')).to.be
				.true);

		it('when height == (milestoneFour - 1) should return 14200000000000000', async () =>
			expect(blockReward.calcSupply(13451519).equals('14200000000000000')).to.be
				.true);

		it('when height == (milestoneFour) should return 14200000100000000', async () =>
			expect(blockReward.calcSupply(13451520).equals('14200000100000000')).to.be
				.true);

		it('when height == (milestoneFour + 1) should return 14200000200000000', async () =>
			expect(blockReward.calcSupply(13451521).equals('14200000200000000')).to.be
				.true);

		it('when height == (milestoneFour * 2) should return 15545152100000000', async () =>
			expect(
				blockReward
					.calcSupply(new BigNum(13451520).times(2))
					.equals('15545152100000000')
			).to.be.true);

		it('when height == (milestoneFour * 10) should return 26306368100000000', async () =>
			expect(
				blockReward
					.calcSupply(new BigNum(13451520).times(10))
					.equals('26306368100000000')
			).to.be.true);

		it('when height == (milestoneFour * 100) should return 147370048100000000', async () =>
			expect(
				blockReward
					.calcSupply(new BigNum(13451520).times(100))
					.equals('147370048100000000')
			).to.be.true);

		it('when height == (milestoneFour * 1000) should return 1358006848100000000', async () =>
			expect(
				blockReward
					.calcSupply(new BigNum(13451520).times(1000))
					.equals('1358006848100000000')
			).to.be.true);

		it('when height == (milestoneFour * 10000) should return 13464374848100000000', async () =>
			expect(
				blockReward
					.calcSupply(new BigNum(13451520).times(10000))
					.equals('13464374848100000000')
			).to.be.true);

		it('when height == (milestoneFour * 100000) should return 134528054848100000000', async () =>
			expect(
				blockReward
					.calcSupply(new BigNum(13451520).times(100000))
					.equals('134528054848100000000')
			).to.be.true);

		describe('completely', () => {
			describe('before reward offset', () => {
				it('should be ok', async () => {
					let supply = blockReward.calcSupply(1);

					for (let i = 1; i < 1451520; i++) {
						supply = blockReward.calcSupply(i);
						expect(supply.equals(totalAmount)).to.be.true;
					}
				});
			});

			describe('for milestone 0', () => {
				it('should be ok', async () => {
					let supply = blockReward.calcSupply(1451519);
					let prev = supply;

					for (let i = 1451520; i < 4451520; i++) {
						supply = blockReward.calcSupply(i);
						expect(supply.equals(prev.plus(milestones[0]))).to.be.true;
						prev = supply;
					}
				});
			});

			describe('for milestone 1', () => {
				it('should be ok', async () => {
					let supply = blockReward.calcSupply(4451519);
					let prev = supply;

					for (let i = 4451520; i < 7451520; i++) {
						supply = blockReward.calcSupply(i);
						expect(supply.equals(prev.plus(milestones[1]))).to.be.true;
						prev = supply;
					}
				});
			});

			describe('for milestone 2', () => {
				it('should be ok', async () => {
					let supply = blockReward.calcSupply(7451519);
					let prev = supply;

					for (let i = 7451520; i < 10451520; i++) {
						supply = blockReward.calcSupply(i);
						expect(supply.equals(prev.plus(milestones[2]))).to.be.true;
						prev = supply;
					}
				});
			});

			describe('for milestone 3', () => {
				it('should be ok', async () => {
					let supply = blockReward.calcSupply(10451519);
					let prev = supply;

					for (let i = 10451520; i < 13451520; i++) {
						supply = blockReward.calcSupply(i);
						expect(supply.equals(prev.plus(milestones[3]))).to.be.true;
						prev = supply;
					}
				});
			});

			describe('for milestone 4 and beyond', () => {
				it('should be ok', async () => {
					let supply = blockReward.calcSupply(13451519);
					let prev = supply;

					for (let i = 13451520; i < 13451520 + 100; i++) {
						supply = blockReward.calcSupply(i);
						expect(supply.equals(prev.plus(milestones[4]))).to.be.true;
						prev = supply;
					}
				});
			});
		});
	});
});
