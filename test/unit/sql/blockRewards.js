'use strict';

var chai = require('chai');
var expect = require('chai').expect;

var sql = require('../../sql/blockRewards.js');
var constants = require('../../../helpers/constants.js');
var modulesLoader = require('../../common/initModule').modulesLoader;
var db;

before(function (done) {
	modulesLoader.getDbConnection(function (err, db_handle) {
		if (err) {
			return done(err);
		}
		db = db_handle;
		done();
	});
});

constants.rewards.distance = 3000000;
constants.rewards.offset = 1451520;

function calcBlockReward (height, reward, done) {
	return db.query(sql.calcBlockReward, {height: height}).then(function (rows) {
		expect(rows).to.be.an('array');
		expect(rows.length).to.equal(1);
		expect(rows[0]).to.be.an('object');
		if (rows[0].reward == null) {
			expect(rows[0].reward).to.equal(reward);
		} else {
			expect(Number(rows[0].reward)).to.equal(reward);
		}
		done();
	}).catch(function (err) {
		done(err);
	});
};

function calcSupply (height, supply, done) {
	return db.query(sql.calcSupply, {height: height}).then(function (rows) {
		expect(rows).to.be.an('array');
		expect(rows.length).to.equal(1);
		expect(rows[0]).to.be.an('object');
		if (rows[0].supply == null) {
			expect(rows[0].supply).to.equal(supply);
		} else {
			expect(Number(rows[0].supply)).to.equal(supply);
		}
		done();
	}).catch(function (err) {
		done(err);
	});
};

function calcSupply_test (height_start, height_end, expected_reward, done) {
	return db.query(sql.calcSupply_test, {height_start: height_start, height_end: height_end, expected_reward: expected_reward}).then(function (rows) {
		expect(rows).to.be.an('array');
		expect(rows.length).to.equal(1);
		expect(rows[0]).to.be.an('object');
		expect(rows[0].result).to.equal(true);
		done();
	}).catch(function (err) {
		done(err);
	});
};

function calcSupply_test_fail (height_start, height_end, expected_reward, done) {
	return db.query(sql.calcSupply_test, {height_start: height_start, height_end: height_end, expected_reward: expected_reward}).then(function (rows) {
		expect(rows).to.be.an('array');
		expect(rows.length).to.equal(1);
		expect(rows[0]).to.be.an('object');
		expect(rows[0].result).to.equal(false);
		done();
	}).catch(function (err) {
		done(err);
	});
};

function calcBlockReward_test (height_start, height_end, expected_reward, done) {
	return db.query(sql.calcBlockReward_test, {height_start: height_start, height_end: height_end, expected_reward: expected_reward}).then(function (rows) {
		expect(rows).to.be.an('array');
		expect(rows.length).to.equal(1);
		expect(rows[0]).to.be.an('object');
		expect(Number(rows[0].result)).to.equal(0);
		done();
	}).catch(function (err) {
		done(err);
	});
};

describe('BlockRewardsSQL', function () {

	describe('checking SQL function getBlockRewards()', function () {

		it('SQL rewards should be equal to those in constants', function (done) {
			db.query(sql.getBlockRewards).then(function (rows) {
				expect(rows).to.be.an('array');
				expect(rows.length).to.equal(1);
				expect(rows[0]).to.be.an('object');
				// Checking supply
				expect(Number(rows[0].supply)).to.equal(constants.totalAmount);
				// Checking reward start
				expect(Number(rows[0].start)).to.equal(constants.rewards.offset);
				// Checking distance between milestones
				expect(Number(rows[0].distance)).to.equal(constants.rewards.distance);
				// Checking milestones
				expect(Number(rows[0].milestones[0])).to.equal(constants.rewards.milestones[0]);
				expect(Number(rows[0].milestones[1])).to.equal(constants.rewards.milestones[1]);
				expect(Number(rows[0].milestones[2])).to.equal(constants.rewards.milestones[2]);
				expect(Number(rows[0].milestones[3])).to.equal(constants.rewards.milestones[3]);
				expect(Number(rows[0].milestones[4])).to.equal(constants.rewards.milestones[4]);
				done();
			}).catch(function (err) {
				done(err);
			});
		});
	});


	describe('checking SQL function calcBlockReward(int)', function () {

		it('when height is undefined should return null', function (done) {
			// Height, expected reward, callback
			calcBlockReward(undefined, null, done);
		});

		it('when height == 0 should return null', function (done) {
			calcBlockReward(0, null, done);
		});

		it('when height == 1 should return 0', function (done) {
			calcBlockReward(1, 0, done);
		});

		it('when height == (offset - 1) should return 0', function (done) {
			calcBlockReward(1451519, 0, done);
		});

		it('when height == (offset) should return 500000000', function (done) {
			calcBlockReward(1451520, 500000000, done);
		});

		it('when height == (offset + 1) should return 500000000', function (done) {
			calcBlockReward(1451521, 500000000, done);
		});

		it('when height == (offset + 2) should return 500000000', function (done) {
			calcBlockReward(1451522, 500000000, done);
		});

		it('when height == (distance) should return 500000000', function (done) {
			calcBlockReward(3000000, 500000000, done);
		});

		it('when height == (distance + 1) should return 500000000', function (done) {
			calcBlockReward(3000001, 500000000, done);
		});

		it('when height == (distance + 2) should return 500000000', function (done) {
			calcBlockReward(3000002, 500000000, done);
		});

		it('when height == (milestoneOne - 1) should return 500000000', function (done) {
			calcBlockReward(4451519, 500000000, done);
		});

		it('when height == (milestoneOne) should return 400000000', function (done) {
			calcBlockReward(4451520, 400000000, done);
		});

		it('when height == (milestoneOne + 1) should return 400000000', function (done) {
			calcBlockReward(4451521, 400000000, done);
		});

		it('when height == (milestoneTwo - 1) should return 400000000', function (done) {
			calcBlockReward(7451519, 400000000, done);
		});

		it('when height == (milestoneTwo) should return 300000000', function (done) {
			calcBlockReward(7451521, 300000000, done);
		});

		it('when height == (milestoneTwo + 1) should return 300000000', function (done) {
			calcBlockReward(7451522, 300000000, done);
		});

		it('when height == (milestoneThree - 1) should return 300000000', function (done) {
			calcBlockReward(10451519, 300000000, done);
		});

		it('when height == (milestoneThree) should return 200000000', function (done) {
			calcBlockReward(10451520, 200000000, done);
		});

		it('when height == (milestoneThree + 1) should return 200000000', function (done) {
			calcBlockReward(10451521, 200000000, done);
		});

		it('when height == (milestoneFour - 1) should return 200000000', function (done) {
			calcBlockReward(13451519, 200000000, done);
		});

		it('when height == (milestoneFour) should return 100000000', function (done) {
			calcBlockReward(13451520, 100000000, done);
		});

		it('when height == (milestoneFour + 1) should return 100000000', function (done) {
			calcBlockReward(13451521, 100000000, done);
		});

		it('when height == (milestoneFour * 2) should return 100000000', function (done) {
			calcBlockReward((13451520 * 2), 100000000, done);
		});

		it('when height == (milestoneFour * 10) should return 100000000', function (done) {
			calcBlockReward((13451520 * 10), 100000000, done);
		});

		it('when height == (milestoneFour * 100) should return 100000000', function (done) {
			// Height, expected reward, callback
			calcBlockReward((13451520 * 100), 100000000, done);
		});

		// Following example expected to fail because height is int and (milestoneFour * 1000) is bigint
		// However, it will take 400+ years to reach height of last passing test, so is safe to ignore
		it('when height == (milestoneFour * 1000) should overflow int and return error', function (done) {
			db.query(sql.calcBlockReward, {height: (13451520 * 1000)}).then(function (rows) {
				done('Should not pass');
			}).catch(function (err) {
				expect(err).to.be.an('error');
				expect(err.message).to.contain('function calcblockreward(bigint) does not exist');
				done();
			});
		});
	});

	describe('checking SQL function calcSupply(int)', function () {

		it('when height is undefined should return null', function (done) {
			calcSupply(undefined, null, done);
		});

		it('when height == 0 should return null', function (done) {
			calcSupply(0, null, done);
		});

		it('when height == 1 should return 10000000000000000', function (done) {
			calcSupply(1, 10000000000000000, done);
		});

		it('when height == (offset - 1) should return 10000000000000000', function (done) {
			calcSupply(1451519, 10000000000000000, done);
		});

		it('when height == (offset) should return 10000000500000000', function (done) {
			calcSupply(1451520, 10000000500000000, done);
		});

		it('when height == (offset + 1) should return 10000001000000000', function (done) {
			calcSupply(1451521, 10000001000000000, done);
		});

		it('when height == (offset + 2) should return 10000001500000000', function (done) {
			calcSupply(1451522, 10000001500000000, done);
		});

		it('when height == (distance) should return 10774240500000000', function (done) {
			calcSupply(3000000, 10774240500000000, done);
		});

		it('when height == (distance + 1) should return 10774241000000000', function (done) {
			calcSupply(3000001, 10774241000000000, done);
		});

		it('when height == (distance + 2) should return 10774241500000000', function (done) {
			calcSupply(3000002, 10774241500000000, done);
		});

		it('when height == (milestoneOne - 1) should return 11500000000000000', function (done) {
			calcSupply(4451519, 11500000000000000, done);
		});

		it('when height == (milestoneOne) should return 11500000400000000', function (done) {
			calcSupply(4451520, 11500000400000000, done);
		});

		it('when height == (milestoneOne + 1) should return 11500000800000000', function (done) {
			calcSupply(4451521, 11500000800000000, done);
		});

		it('when height == (milestoneTwo - 1) should return 12700000000000000', function (done) {
			calcSupply(7451519, 12700000000000000, done);
		});

		it('when height == (milestoneTwo) should return 12700000300000000', function (done) {
			calcSupply(7451520, 12700000300000000, done);
		});

		it('when height == (milestoneTwo + 1) should return 12700000600000000', function (done) {
			calcSupply(7451521, 12700000600000000, done);
		});

		it('when height == (milestoneThree - 1) should return 13600000000000000', function (done) {
			calcSupply(10451519, 13600000000000000, done);
		});

		it('when height == (milestoneThree) should return 13600000200000000', function (done) {
			calcSupply(10451520, 13600000200000000, done);
		});

		it('when height == (milestoneThree + 1) should return 13600000400000000', function (done) {
			calcSupply(10451521, 13600000400000000, done);
		});

		it('when height == (milestoneFour - 1) should return 14200000000000000', function (done) {
			calcSupply(13451519, 14200000000000000, done);
		});

		it('when height == (milestoneFour) should return 14200000100000000', function (done) {
			calcSupply(13451520, 14200000100000000, done);
		});

		it('when height == (milestoneFour + 1) should return 14200000200000000', function (done) {
			calcSupply(13451521, 14200000200000000, done);
		});

		it('when height == (milestoneFour * 2) should return 15545152100000000', function (done) {
			calcSupply((13451520 * 2), 15545152100000000, done);
		});

		it('when height == (milestoneFour * 10) should return 26306368100000000', function (done) {
			calcSupply((13451520 * 10), 26306368100000000, done);
		});

		it('when height == (milestoneFour * 100) should return 147370048100000000', function (done) {
			calcSupply((13451520 * 100), 147370048100000000, done);
		});

		// Following example expected to fail because height is int and (milestoneFour * 1000) is bigint
		// However, it will take 400+ years to reach height of last passing test, so is safe to ignore
		it('when height == (milestoneFour * 1000) should overflow int and return error', function (done) {
			db.query(sql.calcSupply, {height: (13451520 * 1000)}).then(function (rows) {
				done('Should not pass');
			}).catch(function (err) {
				expect(err).to.be.an('error');
				expect(err.message).to.contain('function calcsupply(bigint) does not exist');
				done();
			});
		});
	});

	describe('checking completely SQL functions calcSupply(int) and calcBlockReward(int)', function () {

		describe('check if calcBlockReward_test can fail', function () {

			it('calcBlockReward_test should return 1000 for 1000 not matching block rewards', function (done) {
				db.query(sql.calcBlockReward_test, {height_start: 1, height_end: 1000, expected_reward: 1}).then(function (rows) {
					expect(rows).to.be.an('array');
					expect(rows.length).to.equal(1);
					expect(rows[0]).to.be.an('object');
					expect(Number(rows[0].result)).to.equal(1000);
					done();
				}).catch(function (err) {
					done(err);
				});
			});
		});

		describe('before reward offset', function () {

			it('calcBlockReward_test should return 0', function (done) {
				calcBlockReward_test(1, 1451519, 0, done);
			});

			it('calcSupply_test should return true', function (done) {
				calcSupply_test(1, 1451519, 0, done);
			});

			it('calcSupply_test_fail should return false', function (done) {
				calcSupply_test_fail(1, 1451519, 1, done);
			});
		});

		describe('for milestone 0', function () {

			it('calcBlockReward_test should return 0', function (done) {
				calcBlockReward_test(1451520, 4451519, constants.rewards.milestones[0], done);
			});

			it('calcSupply_test should return true', function (done) {
				calcSupply_test(1451520, 4451519, constants.rewards.milestones[0], done);
			});

			it('calcSupply_test_fail should return false', function (done) {
				calcSupply_test_fail(1451520, 4451519, 1, done);
			});
		});

		describe('for milestone 1', function () {

			it('calcBlockReward_test should return 0', function (done) {
				calcBlockReward_test(4451520, 7451519, constants.rewards.milestones[1], done);
			});

			it('calcSupply_test should return true', function (done) {
				calcSupply_test(4451520, 7451519, constants.rewards.milestones[1], done);
			});

			it('calcSupply_test_fail should return false', function (done) {
				calcSupply_test_fail(4451520, 7451519, 1, done);
			});
		});

		describe('for milestone 2', function () {

			it('calcBlockReward_test should return 0', function (done) {
				calcBlockReward_test(7451520, 10451519, constants.rewards.milestones[2], done);
			});

			it('calcSupply_test should return true', function (done) {
				calcSupply_test(7451520, 10451519, constants.rewards.milestones[2], done);
			});

			it('calcSupply_test_fail should return false', function (done) {
				calcSupply_test_fail(7451520, 10451519, 1, done);
			});
		});

		describe('for milestone 3', function () {

			it('calcBlockReward_test should return 0', function (done) {
				calcBlockReward_test(10451520, 13451519, constants.rewards.milestones[3], done);
			});

			it('calcSupply_test should return true', function (done) {
				calcSupply_test(10451520, 13451519, constants.rewards.milestones[3], done);
			});

			it('calcSupply_test_fail should return false', function (done) {
				calcSupply_test_fail(10451520, 13451519, 1, done);
			});
		});

		describe('for milestone 4 and beyond', function () {

			it('calcBlockReward_test should return 0', function (done) {
				calcBlockReward_test(13451520, (13451520 + 100), constants.rewards.milestones[4], done);
			});

			it('calcSupply_test should return true', function (done) {
				calcSupply_test(13451520, (13451520 + 100), constants.rewards.milestones[4], done);
			});

			it('calcSupply_test_fail should return false', function (done) {
				calcSupply_test_fail(13451520, (13451520 + 100), 1, done);
			});
		});
	});
});
