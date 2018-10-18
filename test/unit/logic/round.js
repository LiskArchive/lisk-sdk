/* eslint-disable mocha/no-skipped-tests */
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

var rewire = require('rewire');
var Promise = require('bluebird');
var Bignum = require('../../../helpers/bignum.js');
var DBSandbox = require('../../common/db_sandbox').DBSandbox;

var Round = rewire('../../../logic/round.js');
var genesisBlock = __testContext.config.genesisBlock;

const { ACTIVE_DELEGATES } = global.constants;

describe('rounds', () => {
	var db;
	var dbSandbox;
	var round;
	var validScope;

	before(done => {
		dbSandbox = new DBSandbox(__testContext.config.db, 'rounds_logic');
		dbSandbox.create((err, __db) => {
			db = __db;

			validScope = {
				backwards: false,
				round: 1,
				roundOutsiders: [],
				roundDelegates: [genesisBlock.generatorPublicKey],
				roundFees: ACTIVE_DELEGATES,
				roundRewards: [10],
				library: {
					db: undefined,
					logger: {
						trace: sinonSandbox.spy(),
						debug: sinonSandbox.spy(),
						info: sinonSandbox.spy(),
						log: sinonSandbox.spy(),
						warn: sinonSandbox.spy(),
						error: sinonSandbox.spy(),
					},
				},
				modules: {
					accounts: {
						mergeAccountAndGet: sinonSandbox.stub(),
					},
				},
				block: {
					generatorPublicKey: genesisBlock.generatorPublicKey,
					id: genesisBlock.id,
					height: 1,
					timestamp: 100,
				},
			};
			done();
		});
	});

	function isPromise(obj) {
		return typeof obj.then == 'function';
	}

	describe('constructor', () => {
		var scope;

		describe('when calling with required properties', () => {
			before(done => {
				scope = _.cloneDeep(validScope);
				round = new Round(_.cloneDeep(scope), db);
				done();
			});

			it('should return Round instance', () => {
				return expect(round).to.be.instanceof(Round);
			});

			it('should set scope', () => {
				return expect(round.scope).to.deep.equal(scope);
			});

			it('should set t', () => {
				return expect(round.t).to.deep.equal(db);
			});
		});

		describe('when calling with missing properties', () => {
			beforeEach(done => {
				scope = _.cloneDeep(validScope);
				done();
			});

			describe.skip('library', () => {
				it('should throw', done => {
					var property = 'library';
					delete scope[property];
					try {
						round = new Round(_.cloneDeep(scope), db);
					} catch (err) {
						expect(err).to.equal(
							`Missing required scope property: ${property}`
						);
					}
					done();
				});
			});

			describe.skip('modules', () => {
				it('should throw', done => {
					var property = 'modules';
					delete scope[property];
					try {
						round = new Round(_.cloneDeep(scope), db);
					} catch (err) {
						expect(err).to.equal(
							`Missing required scope property: ${property}`
						);
					}
					done();
				});
			});

			describe.skip('block', () => {
				it('should throw', done => {
					var property = 'block';
					delete scope[property];
					try {
						round = new Round(_.cloneDeep(scope), db);
					} catch (err) {
						expect(err).to.equal(
							`Missing required scope property: ${property}`
						);
					}
					done();
				});
			});

			describe('round', () => {
				it('should throw', done => {
					var property = 'round';
					delete scope[property];
					try {
						round = new Round(_.cloneDeep(scope), db);
					} catch (err) {
						expect(err).to.equal(
							`Missing required scope property: ${property}`
						);
					}
					done();
				});
			});

			describe('backwards', () => {
				it('should throw', done => {
					var property = 'backwards';
					delete scope[property];
					try {
						round = new Round(_.cloneDeep(scope), db);
					} catch (err) {
						expect(err).to.equal(
							`Missing required scope property: ${property}`
						);
					}
					done();
				});
			});

			describe('when finish round', () => {
				beforeEach(done => {
					// Set finishRound, so now we need additional properties
					scope.finishRound = true;
					done();
				});

				describe('roundFees', () => {
					it('should throw', done => {
						var property = 'roundFees';
						delete scope[property];
						try {
							round = new Round(_.cloneDeep(scope), db);
						} catch (err) {
							expect(err).to.equal(
								`Missing required scope property: ${property}`
							);
						}
						done();
					});
				});

				describe('roundRewards', () => {
					it('should throw', done => {
						var property = 'roundRewards';
						delete scope[property];
						try {
							round = new Round(_.cloneDeep(scope), db);
						} catch (err) {
							expect(err).to.equal(
								`Missing required scope property: ${property}`
							);
						}
						done();
					});
				});

				describe('roundDelegates', () => {
					it('should throw', done => {
						var property = 'roundDelegates';
						delete scope[property];
						try {
							round = new Round(_.cloneDeep(scope), db);
						} catch (err) {
							expect(err).to.equal(
								`Missing required scope property: ${property}`
							);
						}
						done();
					});
				});

				describe('roundOutsiders', () => {
					it('should throw', done => {
						var property = 'roundOutsiders';
						delete scope[property];
						try {
							round = new Round(_.cloneDeep(scope), db);
						} catch (err) {
							expect(err).to.equal(
								`Missing required scope property: ${property}`
							);
						}
						done();
					});
				});
			});
		});
	});

	describe('mergeBlockGenerator', () => {
		var scope;

		describe('when going forward', () => {
			var args = null;

			before(() => {
				scope = _.cloneDeep(validScope);
				scope.backwards = false;
				round = new Round(_.cloneDeep(scope), db);
				args = {
					producedBlocks: 1,
					publicKey: scope.block.generatorPublicKey,
					round: scope.round,
				};
				scope.modules.accounts.mergeAccountAndGet.callsArgWith(1, null, args);
				return round.mergeBlockGenerator();
			});

			it('should call modules.accounts.mergeAccountAndGet with proper params', () => {
				return expect(
					round.scope.modules.accounts.mergeAccountAndGet
				).to.be.calledWith(args);
			});
		});

		describe('when going backwards', () => {
			var args = null;

			before(() => {
				scope = _.cloneDeep(validScope);
				scope.backwards = true;
				round = new Round(_.cloneDeep(scope), db);
				args = {
					producedBlocks: -1,
					publicKey: scope.block.generatorPublicKey,
					round: scope.round,
				};
				scope.modules.accounts.mergeAccountAndGet.callsArgWith(1, null, args);
				return round.mergeBlockGenerator();
			});

			it('should call modules.accounts.mergeAccountAndGet with proper params', () => {
				return expect(
					round.scope.modules.accounts.mergeAccountAndGet
				).to.be.calledWith(args);
			});
		});
	});

	describe('updateMissedBlocks', () => {
		var scope;
		var stub;
		var res;

		describe('when there are no outsiders', () => {
			before(done => {
				scope = _.cloneDeep(validScope);
				res = round.updateMissedBlocks();
				done();
			});

			it('should return t object', () => {
				expect(res).to.not.be.instanceOf(Promise);
				return expect(res).to.deep.equal(db);
			});
		});

		describe('when there are outsiders', () => {
			before(done => {
				scope = _.cloneDeep(validScope);
				scope.roundOutsiders = ['abc'];
				round = new Round(_.cloneDeep(scope), db);
				stub = sinonSandbox.stub(db.rounds, 'updateMissedBlocks');
				stub
					.withArgs(scope.backwards, scope.roundOutsiders)
					.resolves('success');
				res = round.updateMissedBlocks();
				done();
			});

			it('should return promise', () => {
				return expect(isPromise(res)).to.be.true;
			});

			it('query should be called with proper args', () => {
				return res.then(res => {
					expect(res).to.equal('success');
					expect(stub.calledWith(scope.backwards, scope.roundOutsiders)).to.be
						.true;
				});
			});
		});
	});

	describe('getVotes', () => {
		var stub;
		var res;
		var scope;

		before(done => {
			scope = _.cloneDeep(validScope);
			stub = sinonSandbox.stub(db.rounds, 'getVotes');
			stub.withArgs(scope.round).resolves('success');
			res = round.getVotes();
			done();
		});

		it('should return promise', () => {
			return expect(isPromise(res)).to.be.true;
		});

		it('query should be called with proper args', () => {
			return res.then(res => {
				expect(res).to.equal('success');
				expect(stub.calledWith(scope.round)).to.be.true;
			});
		});
	});

	describe('updateVotes', () => {
		var getVotes_stub;
		var updateVotes_stub;
		var res;
		var scope;
		var delegate;

		describe('when getVotes returns at least one entry', () => {
			before(() => {
				scope = _.cloneDeep(validScope);

				delegate = {
					amount: 10000,
					delegate:
						'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
					address: '16010222169256538112L',
				};

				scope.library.db = db;
				scope.modules.accounts.generateAddressByPublicKey = function() {
					return delegate.address;
				};

				return db.task(t => {
					// Init stubs
					getVotes_stub = sinonSandbox.stub(t.rounds, 'getVotes');
					getVotes_stub.withArgs(scope.round).resolves([delegate, delegate]);
					updateVotes_stub = sinonSandbox.stub(t.rounds, 'updateVotes');
					updateVotes_stub
						.withArgs(delegate.address, delegate.amount)
						.resolves('QUERY');

					round = new Round(_.cloneDeep(scope), t);
					res = round.updateVotes();
				});
			});

			it('should return promise', () => {
				return expect(isPromise(res)).to.be.true;
			});

			it('getVotes query should be called with proper args', () => {
				return expect(getVotes_stub.calledWith(scope.round)).to.be.true;
			});

			it('updateVotes should be called twice', () => {
				return expect(updateVotes_stub.calledTwice).to.be.true;
			});

			it('updateVotes query should be called with proper args', () => {
				return expect(
					updateVotes_stub.alwaysCalledWith(delegate.address, delegate.amount)
				).to.be.true;
			});

			it('getVotes result should contain 2 queries', () => {
				return res.then(res => {
					expect(res).to.deep.equal(['QUERY', 'QUERY']);
				});
			});
		});

		describe('when getVotes returns no entries', () => {
			before(() => {
				scope = _.cloneDeep(validScope);

				delegate = {
					amount: 10000,
					delegate:
						'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
					address: '16010222169256538112L',
				};

				scope.library.db = db;
				scope.modules.accounts.generateAddressByPublicKey = function() {
					return delegate.address;
				};

				return db.task(t => {
					// Init stubs
					getVotes_stub = sinonSandbox.stub(t.rounds, 'getVotes');
					getVotes_stub.withArgs(scope.round).resolves([]);
					updateVotes_stub = sinonSandbox.stub(t.rounds, 'updateVotes');
					updateVotes_stub
						.withArgs(delegate.address, delegate.amount)
						.resolves('QUERY');

					round = new Round(_.cloneDeep(scope), t);
					res = round.updateVotes();
				});
			});

			it('should return promise', () => {
				return expect(isPromise(res)).to.be.true;
			});

			it('getVotes query should be called with proper args', () => {
				return expect(getVotes_stub.calledWith(scope.round)).to.be.true;
			});

			it('updateVotes should be not called', () => {
				return expect(updateVotes_stub.called).to.be.false;
			});
		});
	});

	describe('flushRound', () => {
		var stub;
		var res;
		var scope;

		before(done => {
			scope = _.cloneDeep(validScope);
			stub = sinonSandbox.stub(db.rounds, 'flush');
			stub.withArgs(validScope.round).resolves('success');
			round = new Round(_.cloneDeep(scope), db);
			res = round.flushRound();
			done();
		});

		it('should return promise', () => {
			return expect(isPromise(res)).to.be.true;
		});

		it('query should be called with proper args', () => {
			return res.then(res => {
				expect(res).to.equal('success');
				expect(stub.calledWith(validScope.round)).to.be.true;
			});
		});
	});

	describe('updateDelegatesRanks', () => {
		let stub;
		let res;
		let scope;

		before(done => {
			scope = _.cloneDeep(validScope);
			stub = sinonSandbox.stub(db.rounds, 'updateDelegatesRanks');
			stub.resolves('success');
			round = new Round(_.cloneDeep(scope), db);
			res = round.updateDelegatesRanks();
			done();
		});

		it('should return promise', () => {
			return expect(isPromise(res)).to.be.true;
		});

		it('query should be called with proper args', () => {
			return res.then(res => {
				expect(res).to.equal('success');
				expect(stub.calledOnce).to.be.true;
			});
		});
	});

	describe('restoreRoundSnapshot', () => {
		var res;

		before(done => {
			sinonSandbox
				.stub(db.rounds, 'restoreRoundSnapshot')
				.withArgs()
				.resolves('success');
			res = round.restoreRoundSnapshot();
			done();
		});

		it('should return promise', () => {
			return expect(isPromise(res)).to.be.true;
		});

		it('query should be called with no args', () => {
			return res.then(res => {
				expect(res).to.equal('success');
				expect(db.rounds.restoreRoundSnapshot.calledWith()).to.be.true;
			});
		});
	});

	describe('restoreVotesSnapshot', () => {
		var stub;
		var res;

		before(done => {
			stub = sinonSandbox.stub(db.rounds, 'restoreVotesSnapshot');
			stub.withArgs().resolves('success');
			res = round.restoreVotesSnapshot();
			done();
		});

		it('should return promise', () => {
			return expect(isPromise(res)).to.be.true;
		});

		it('query should be called with no args', () => {
			return res.then(res => {
				expect(res).to.equal('success');
				expect(stub.calledWith()).to.be.true;
			});
		});
	});

	describe('checkSnapshotAvailability', () => {
		const stubs = {};
		let scope;
		let res;

		before(done => {
			// Init stubs and scope
			stubs.checkSnapshotAvailability = sinonSandbox.stub(
				db.rounds,
				'checkSnapshotAvailability'
			);
			stubs.countRoundSnapshot = sinonSandbox.stub(
				db.rounds,
				'countRoundSnapshot'
			);
			scope = _.cloneDeep(validScope);
			done();
		});

		afterEach(done => {
			stubs.checkSnapshotAvailability.resetHistory();
			stubs.countRoundSnapshot.resetHistory();
			done();
		});

		it('should return promise', () => {
			stubs.checkSnapshotAvailability.resolves();
			stubs.countRoundSnapshot.resolves();
			scope.round = 1;
			round = new Round(scope, db);
			res = round.checkSnapshotAvailability();

			return expect(isPromise(res)).to.be.true;
		});

		it('should resolve without any error when checkSnapshotAvailability query returns 1', () => {
			stubs.checkSnapshotAvailability.withArgs(1).resolves(1);
			scope.round = 1;
			round = new Round(scope, db);
			res = round.checkSnapshotAvailability();

			return res.then(() => {
				expect(stubs.checkSnapshotAvailability).to.have.been.calledWith(1);
				return expect(stubs.countRoundSnapshot.called).to.be.false;
			});
		});

		it('should resolve without any error when checkSnapshotAvailability query returns null and table is empty', () => {
			stubs.checkSnapshotAvailability.withArgs(2).resolves(null);
			stubs.countRoundSnapshot.resolves(0);
			scope.round = 2;
			round = new Round(scope, db);
			res = round.checkSnapshotAvailability();

			return res.then(() => {
				expect(stubs.checkSnapshotAvailability).to.have.been.calledWith(2);
				return expect(stubs.countRoundSnapshot.called).to.be.true;
			});
		});

		it('should be rejected with proper error when checkSnapshotAvailability query returns null and table is not empty', () => {
			stubs.checkSnapshotAvailability.withArgs(2).resolves(null);
			stubs.countRoundSnapshot.resolves(1);
			scope.round = 2;
			round = new Round(scope, db);
			res = round.checkSnapshotAvailability();

			return expect(res).to.eventually.be.rejectedWith(
				'Snapshot for round 2 not available'
			);
		});
	});

	describe('deleteRoundRewards', () => {
		var stub;
		var res;

		before(done => {
			stub = sinonSandbox.stub(db.rounds, 'deleteRoundRewards');
			stub.withArgs(validScope.round).resolves('success');
			round = new Round(_.cloneDeep(validScope), db);
			res = round.deleteRoundRewards();
			done();
		});

		it('should return promise', () => {
			return expect(isPromise(res)).to.be.true;
		});

		it('query should be called with no args', () => {
			return res.then(res => {
				expect(res).to.equal('success');
				expect(stub).to.have.been.calledWith(validScope.round);
			});
		});
	});

	describe('applyRound', () => {
		var res;
		var batch_stub;
		var insertRoundRewards_stub;
		var scope;

		function sumChanges(forward, backwards) {
			var results = {};
			forward.forEach(res => {
				if (results[res.publicKey]) {
					results[res.publicKey].balance += res.balance || 0;
					results[res.publicKey].u_balance += res.u_balance || 0;
					results[res.publicKey].rewards += res.rewards || 0;
					results[res.publicKey].fees += res.fees || 0;
				} else {
					results[res.publicKey] = {
						balance: res.balance || 0,
						u_balance: res.u_balance || 0,
						rewards: res.rewards || 0,
						fees: res.fees || 0,
					};
				}
			});
			backwards.forEach(res => {
				if (results[res.publicKey]) {
					results[res.publicKey].balance += res.balance || 0;
					results[res.publicKey].u_balance += res.u_balance || 0;
					results[res.publicKey].rewards += res.rewards || 0;
					results[res.publicKey].fees += res.fees || 0;
				} else {
					results[res.publicKey] = {
						balance: res.balance || 0,
						u_balance: res.u_balance || 0,
						rewards: res.rewards || 0,
						fees: res.fees || 0,
					};
				}
			});
			return results;
		}

		describe.skip('with no delegates', () => {
			describe('forward', () => {
				before(done => {
					scope = _.cloneDeep(validScope);
					scope.backwards = false;
					scope.roundDelegates = [];
					round = new Round(_.cloneDeep(scope), db);
					res = round.applyRound();
					done();
				});

				it('should return t object', () => {
					return expect(res).to.deep.equal(db);
				});

				it('should not call mergeAccountAndGet', () => {
					return expect(round.scope.modules.accounts.mergeAccountAndGet.called)
						.to.be.false;
				});
			});

			describe('backwards', () => {
				before(done => {
					scope = _.cloneDeep(validScope);
					scope.backwards = true;
					scope.roundDelegates = [];
					round = new Round(_.cloneDeep(scope), db);
					res = round.applyRound();
					done();
				});

				it('should not call mergeAccountAndGet', () => {
					return expect(round.scope.modules.accounts.mergeAccountAndGet.called)
						.to.be.false;
				});

				it('should return t object', () => {
					return expect(res).to.deep.equal(db);
				});
			});
		});

		describe('with only one delegate', () => {
			describe('when there are no remaining fees', () => {
				var forwardResults = [];
				var backwardsResults = [];

				before(done => {
					validScope.roundDelegates = [genesisBlock.generatorPublicKey];
					validScope.roundFees = ACTIVE_DELEGATES; // 1 LSK fee per delegate, no remaining fees
					done();
				});

				describe('forward', () => {
					var called = 0;

					before(() => {
						round.scope.modules.accounts.mergeAccountAndGet.resetHistory();
						return db.task(t => {
							insertRoundRewards_stub = sinonSandbox
								.stub(t.rounds, 'insertRoundRewards')
								.resolves('success');
							batch_stub = sinonSandbox.stub(t, 'batch').resolves('success');
							scope = _.cloneDeep(validScope);
							scope.backwards = false;
							round = new Round(_.cloneDeep(scope), t);
							res = round.applyRound();
						});
					});

					it('query should be called', () => {
						return res.then(res => {
							expect(res).to.equal('success');
							expect(batch_stub.called).to.be.true;
						});
					});

					it('should call mergeAccountAndGet with proper args (apply rewards)', () => {
						var index = 0; // Delegate index on list
						var balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						var feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						var args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							u_balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (for apply remaining fees)', () => {
						return expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called);
					});

					it('should call insertRoundRewards with proper args', () => {
						return expect(insertRoundRewards_stub).to.have.been.calledWith(
							validScope.block.timestamp,
							forwardResults[0].fees.toString(),
							forwardResults[0].rewards.toString(),
							validScope.round,
							forwardResults[0].publicKey
						);
					});
				});

				describe('backwards', () => {
					var called = 0;

					before(() => {
						round.scope.modules.accounts.mergeAccountAndGet.resetHistory();
						return db.task(t => {
							insertRoundRewards_stub = sinonSandbox
								.stub(t.rounds, 'insertRoundRewards')
								.resolves('success');
							batch_stub = sinonSandbox.stub(t, 'batch').resolves('success');
							scope = _.cloneDeep(validScope);
							scope.backwards = true;
							round = new Round(_.cloneDeep(scope), t);
							res = round.applyRound();
						});
					});

					it('query should be called', () => {
						return res.then(res => {
							expect(res).to.equal('success');
							expect(batch_stub.called).to.be.true;
						});
					});

					it('should call mergeAccountAndGet with proper args (apply rewards)', () => {
						var index = 0; // Delegate index on list
						var balancePerDelegate = Number(
							new Bignum(validScope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(validScope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						var feesPerDelegate = Number(
							new Bignum(validScope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						var args = {
							publicKey: validScope.roundDelegates[index],
							balance: -balancePerDelegate,
							u_balance: -balancePerDelegate,
							round: validScope.round,
							fees: -feesPerDelegate,
							rewards: -validScope.roundRewards[index],
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (for apply remaining fees)', () => {
						return expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called);
					});

					it('should not call insertRoundRewards', () => {
						return expect(insertRoundRewards_stub).to.have.not.been.called;
					});
				});

				describe('consistency checks for each delegate', () => {
					var result;

					before(done => {
						result = sumChanges(forwardResults, backwardsResults);
						done();
					});

					it('balance should sum to 0', () => {
						return _.each(result, res => {
							expect(res.balance).to.equal(0);
						});
					});

					it('u_balance should sum to 0', () => {
						return _.each(result, res => {
							expect(res.u_balance).to.equal(0);
						});
					});

					it('fees should sum to 0', () => {
						return _.each(result, res => {
							expect(res.fees).to.equal(0);
						});
					});

					it('rewards should sum to 0', () => {
						return _.each(result, res => {
							expect(res.rewards).to.equal(0);
						});
					});
				});
			});

			describe('when there are remaining fees', () => {
				var forwardResults = [];
				var backwardsResults = [];

				before(done => {
					validScope.roundDelegates = [genesisBlock.generatorPublicKey];
					validScope.roundFees = 100; // 0 LSK fee per delegate, 100 remaining fees
					done();
				});

				describe('forward', () => {
					var called = 0;

					before(() => {
						round.scope.modules.accounts.mergeAccountAndGet.resetHistory();
						return db.task(t => {
							insertRoundRewards_stub = sinonSandbox
								.stub(t.rounds, 'insertRoundRewards')
								.resolves('success');
							batch_stub = sinonSandbox.stub(t, 'batch').resolves('success');
							scope = _.cloneDeep(validScope);
							scope.backwards = false;
							round = new Round(_.cloneDeep(scope), t);
							res = round.applyRound();
						});
					});

					it('query should be called', () => {
						return res.then(res => {
							expect(res).to.equal('success');
							expect(batch_stub.called).to.be.true;
						});
					});

					it('should call mergeAccountAndGet with proper args (apply rewards)', () => {
						var index = 0; // Delegate index on list
						var balancePerDelegate = Number(
							new Bignum(validScope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(validScope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						var feesPerDelegate = Number(
							new Bignum(validScope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						var args = {
							publicKey: validScope.roundDelegates[index],
							balance: balancePerDelegate,
							u_balance: balancePerDelegate,
							round: validScope.round,
							fees: feesPerDelegate,
							rewards: validScope.roundRewards[index],
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (fees)', () => {
						var index = 0; // Delegate index on list
						var feesPerDelegate = new Bignum(
							validScope.roundFees.toPrecision(15)
						)
							.dividedBy(ACTIVE_DELEGATES)
							.integerValue(Bignum.ROUND_FLOOR);
						var remainingFees = Number(
							new Bignum(validScope.roundFees.toPrecision(15))
								.minus(feesPerDelegate.multipliedBy(ACTIVE_DELEGATES))
								.toFixed()
						);

						var args = {
							publicKey: validScope.roundDelegates[index], // Remaining fees are applied to last delegate of round
							balance: remainingFees,
							u_balance: remainingFees,
							round: validScope.round,
							fees: remainingFees,
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (completed)', () => {
						return expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called);
					});

					it('should call insertRoundRewards with proper args', () => {
						return expect(insertRoundRewards_stub).to.have.been.calledWith(
							validScope.block.timestamp,
							(forwardResults[0].fees + forwardResults[1].fees).toString(),
							forwardResults[0].rewards.toString(),
							validScope.round,
							forwardResults[0].publicKey
						);
					});
				});

				describe('backwards', () => {
					var called = 0;

					before(() => {
						round.scope.modules.accounts.mergeAccountAndGet.resetHistory();
						return db.task(t => {
							insertRoundRewards_stub = sinonSandbox
								.stub(t.rounds, 'insertRoundRewards')
								.resolves('success');
							batch_stub = sinonSandbox.stub(t, 'batch').resolves('success');
							scope = _.cloneDeep(validScope);
							scope.backwards = true;
							round = new Round(_.cloneDeep(scope), t);
							res = round.applyRound();
						});
					});

					it('query should be called', () => {
						return res.then(res => {
							expect(res).to.equal('success');
							expect(batch_stub.called).to.be.true;
						});
					});

					it('should call mergeAccountAndGet with proper args (apply rewards)', () => {
						var index = 0; // Delegate index on list
						var balancePerDelegate = Number(
							new Bignum(validScope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(validScope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						var feesPerDelegate = Number(
							new Bignum(validScope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						var args = {
							publicKey: validScope.roundDelegates[index],
							balance: -balancePerDelegate,
							u_balance: -balancePerDelegate,
							round: validScope.round,
							fees: -feesPerDelegate,
							rewards: -validScope.roundRewards[index],
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (fees)', () => {
						var index = 0; // Delegate index on list
						var feesPerDelegate = new Bignum(
							validScope.roundFees.toPrecision(15)
						)
							.dividedBy(ACTIVE_DELEGATES)
							.integerValue(Bignum.ROUND_FLOOR);
						var remainingFees = Number(
							new Bignum(validScope.roundFees.toPrecision(15))
								.minus(feesPerDelegate.multipliedBy(ACTIVE_DELEGATES))
								.toFixed()
						);

						var args = {
							publicKey: validScope.roundDelegates[index], // Remaining fees are applied to last delegate of round
							balance: -remainingFees,
							u_balance: -remainingFees,
							round: validScope.round,
							fees: -remainingFees,
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (completed)', () => {
						return expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called);
					});

					it('should not call insertRoundRewards', () => {
						return expect(insertRoundRewards_stub).to.have.not.been.called;
					});
				});

				describe('consistency checks for each delegate', () => {
					var result;

					before(done => {
						result = sumChanges(forwardResults, backwardsResults);
						done();
					});

					it('balance should sum to 0', () => {
						return _.each(result, res => {
							expect(res.balance).to.equal(0);
						});
					});

					it('u_balance should sum to 0', () => {
						return _.each(result, res => {
							expect(res.u_balance).to.equal(0);
						});
					});

					it('fees should sum to 0', () => {
						return _.each(result, res => {
							expect(res.fees).to.equal(0);
						});
					});

					it('rewards should sum to 0', () => {
						return _.each(result, res => {
							expect(res.rewards).to.equal(0);
						});
					});
				});
			});
		});

		describe('with 3 delegates', () => {
			describe('when there are no remaining fees', () => {
				var forwardResults = [];
				var backwardsResults = [];

				before(done => {
					validScope.roundDelegates = [
						'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
						'968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b',
						'380b952cd92f11257b71cce73f51df5e0a258e54f60bb82bccd2ba8b4dff2ec9',
					];
					validScope.roundRewards = [1, 2, 3];
					validScope.roundFees = ACTIVE_DELEGATES; // 1 LSK fee per delegate, no remaining fees
					done();
				});

				describe('forward', () => {
					var called = 0;

					before(() => {
						round.scope.modules.accounts.mergeAccountAndGet.resetHistory();
						return db.task(t => {
							insertRoundRewards_stub = sinonSandbox
								.stub(t.rounds, 'insertRoundRewards')
								.resolves('success');
							batch_stub = sinonSandbox.stub(t, 'batch').resolves('success');
							scope = _.cloneDeep(validScope);
							scope.backwards = false;
							round = new Round(_.cloneDeep(scope), t);
							res = round.applyRound();
						});
					});

					it('query should be called', () => {
						return res.then(res => {
							expect(res).to.equal('success');
							expect(batch_stub.called).to.be.true;
						});
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 1st delegate', () => {
						var index = 0; // Delegate index on list
						var balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						var feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						var args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							u_balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 2nd delegate', () => {
						var index = 1; // Delegate index on list
						var balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						var feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						var args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							u_balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 3th delegate', () => {
						var index = 2; // Delegate index on list
						var balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						var feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						var args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							u_balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (for applying remaining fees)', () => {
						return expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called);
					});

					it('should call insertRoundRewards with proper args', () => {
						expect(insertRoundRewards_stub).to.have.been.calledWith(
							validScope.block.timestamp,
							forwardResults[0].fees.toString(),
							forwardResults[0].rewards.toString(),
							validScope.round,
							forwardResults[0].publicKey
						);
						expect(insertRoundRewards_stub).to.have.been.calledWith(
							validScope.block.timestamp,
							forwardResults[1].fees.toString(),
							forwardResults[1].rewards.toString(),
							validScope.round,
							forwardResults[1].publicKey
						);
						return expect(insertRoundRewards_stub).to.have.been.calledWith(
							validScope.block.timestamp,
							forwardResults[2].fees.toString(),
							forwardResults[2].rewards.toString(),
							validScope.round,
							forwardResults[2].publicKey
						);
					});
				});

				describe('backwards', () => {
					var called = 0;

					before(() => {
						round.scope.modules.accounts.mergeAccountAndGet.resetHistory();
						return db.task(t => {
							insertRoundRewards_stub = sinonSandbox
								.stub(t.rounds, 'insertRoundRewards')
								.resolves('success');
							batch_stub = sinonSandbox.stub(t, 'batch').resolves('success');
							scope = _.cloneDeep(validScope);
							scope.backwards = true;
							round = new Round(_.cloneDeep(scope), t);
							res = round.applyRound();
						});
					});

					it('query should be called', () => {
						return res.then(res => {
							expect(res).to.equal('success');
							expect(batch_stub.called).to.be.true;
						});
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 1st delegate', () => {
						var index = 2; // Delegate index on list
						var balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						var feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						var args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							u_balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 2nd delegate', () => {
						var index = 1; // Delegate index on list
						var balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						var feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						var args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							u_balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 3th delegate', () => {
						var index = 0; // Delegate index on list
						var balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						var feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						var args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							u_balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (for applying remaining fees)', () => {
						return expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called);
					});

					it('should not call insertRoundRewards', () => {
						return expect(insertRoundRewards_stub).to.have.not.been.called;
					});
				});

				describe('consistency checks for each delegate', () => {
					var result;

					before(done => {
						result = sumChanges(forwardResults, backwardsResults);
						done();
					});

					it('balance should sum to 0', () => {
						return _.each(result, res => {
							expect(res.balance).to.equal(0);
						});
					});

					it('u_balance should sum to 0', () => {
						return _.each(result, res => {
							expect(res.u_balance).to.equal(0);
						});
					});

					it('fees should sum to 0', () => {
						return _.each(result, res => {
							expect(res.fees).to.equal(0);
						});
					});

					it('rewards should sum to 0', () => {
						return _.each(result, res => {
							expect(res.rewards).to.equal(0);
						});
					});
				});
			});

			describe('when there are remaining fees', () => {
				var forwardResults = [];
				var backwardsResults = [];

				before(done => {
					validScope.roundDelegates = [
						'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
						'968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b',
						'380b952cd92f11257b71cce73f51df5e0a258e54f60bb82bccd2ba8b4dff2ec9',
					];
					validScope.roundRewards = [1, 2, 3];
					validScope.roundFees = 1000; // 9 LSK fee per delegate, 91 remaining fees
					done();
				});

				describe('forward', () => {
					var called = 0;

					before(() => {
						round.scope.modules.accounts.mergeAccountAndGet.resetHistory();
						return db.task(t => {
							insertRoundRewards_stub = sinonSandbox
								.stub(t.rounds, 'insertRoundRewards')
								.resolves('success');
							batch_stub = sinonSandbox.stub(t, 'batch').resolves('success');
							scope = _.cloneDeep(validScope);
							scope.backwards = false;
							round = new Round(_.cloneDeep(scope), t);
							res = round.applyRound();
						});
					});

					it('query should be called', () => {
						return res.then(res => {
							expect(res).to.equal('success');
							expect(batch_stub.called).to.be.true;
						});
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 1st delegate', () => {
						var index = 0; // Delegate index on list
						var balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						var feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						var args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							u_balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 2nd delegate', () => {
						var index = 1; // Delegate index on list
						var balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						var feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						var args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							u_balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 3th delegate', () => {
						var index = 2; // Delegate index on list
						var balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						var feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						var args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							u_balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (fees)', () => {
						var index = 2; // Delegate index on list
						var feesPerDelegate = new Bignum(scope.roundFees.toPrecision(15))
							.dividedBy(ACTIVE_DELEGATES)
							.integerValue(Bignum.ROUND_FLOOR);
						var remainingFees = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.minus(feesPerDelegate.multipliedBy(ACTIVE_DELEGATES))
								.toFixed()
						);

						var args = {
							publicKey: scope.roundDelegates[index], // Remaining fees are applied to last delegate of round
							balance: remainingFees,
							u_balance: remainingFees,
							round: scope.round,
							fees: remainingFees,
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (completed)', () => {
						return expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called);
					});

					it('should call insertRoundRewards with proper args', () => {
						expect(insertRoundRewards_stub).to.have.been.calledWith(
							validScope.block.timestamp,
							forwardResults[0].fees.toString(),
							forwardResults[0].rewards.toString(),
							validScope.round,
							forwardResults[0].publicKey
						);
						expect(insertRoundRewards_stub).to.have.been.calledWith(
							validScope.block.timestamp,
							forwardResults[1].fees.toString(),
							forwardResults[1].rewards.toString(),
							validScope.round,
							forwardResults[1].publicKey
						);
						return expect(insertRoundRewards_stub).to.have.been.calledWith(
							validScope.block.timestamp,
							(forwardResults[2].fees + forwardResults[3].fees).toString(),
							forwardResults[2].rewards.toString(),
							validScope.round,
							forwardResults[2].publicKey
						);
					});
				});

				describe('backwards', () => {
					var called = 0;

					before(() => {
						round.scope.modules.accounts.mergeAccountAndGet.resetHistory();
						return db.task(t => {
							insertRoundRewards_stub = sinonSandbox
								.stub(t.rounds, 'insertRoundRewards')
								.resolves('success');
							batch_stub = sinonSandbox.stub(t, 'batch').resolves('success');
							scope = _.cloneDeep(validScope);
							scope.backwards = true;
							round = new Round(_.cloneDeep(scope), t);
							res = round.applyRound();
						});
					});

					it('query should be called', () => {
						return res.then(res => {
							expect(res).to.equal('success');
							expect(batch_stub.called).to.be.true;
						});
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 1st delegate', () => {
						var index = 2; // Delegate index on list
						var balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						var feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						var args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							u_balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 2nd delegate', () => {
						var index = 1; // Delegate index on list
						var balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						var feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						var args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							u_balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 3th delegate', () => {
						var index = 0; // Delegate index on list
						var balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						var feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						var args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							u_balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (fees)', () => {
						var index = 2; // Delegate index on list
						var feesPerDelegate = new Bignum(scope.roundFees.toPrecision(15))
							.dividedBy(ACTIVE_DELEGATES)
							.integerValue(Bignum.ROUND_FLOOR);
						var remainingFees = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.minus(feesPerDelegate.multipliedBy(ACTIVE_DELEGATES))
								.toFixed()
						);

						var args = {
							publicKey: scope.roundDelegates[index], // Remaining fees are applied to last delegate of round
							balance: -remainingFees,
							u_balance: -remainingFees,
							round: scope.round,
							fees: -remainingFees,
						};
						var result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (completed)', () => {
						return expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called);
					});

					it('should not call insertRoundRewards', () => {
						return expect(insertRoundRewards_stub).to.have.not.been.called;
					});
				});

				describe('consistency checks for each delegate', () => {
					var result;

					before(done => {
						result = sumChanges(forwardResults, backwardsResults);
						done();
					});

					it('balance should sum to 0', () => {
						return _.each(result, res => {
							expect(res.balance).to.equal(0);
						});
					});

					it('u_balance should sum to 0', () => {
						return _.each(result, res => {
							expect(res.u_balance).to.equal(0);
						});
					});

					it('fees should sum to 0', () => {
						return _.each(result, res => {
							expect(res.fees).to.equal(0);
						});
					});

					it('rewards should sum to 0', () => {
						return _.each(result, res => {
							expect(res.rewards).to.equal(0);
						});
					});
				});
			});
		});
	});

	describe('land', () => {
		var batch_stub; // eslint-disable-line no-unused-vars
		var roundOutsiders_stub;
		var updateVotes_stub;
		var getVotes_stub;
		let updateDelegatesRanks_stub;
		var flush_stub;
		var res;
		var scope;

		before(() => {
			scope = _.cloneDeep(validScope);
			// Init required properties
			scope.roundOutsiders = ['abc'];
			scope.library.db = db;
			scope.modules.accounts.generateAddressByPublicKey = function() {
				return delegate.address;
			};

			var delegate = {
				amount: 10000,
				delegate:
					'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
				address: '16010222169256538112L',
			};

			round.scope.modules.accounts.mergeAccountAndGet.resetHistory();
			return db.task(t => {
				// Init stubs
				batch_stub = sinonSandbox.stub(t, 'none').resolves();
				roundOutsiders_stub = sinonSandbox
					.stub(t.rounds, 'updateMissedBlocks')
					.resolves();
				getVotes_stub = sinonSandbox
					.stub(t.rounds, 'getVotes')
					.resolves([delegate]);
				updateVotes_stub = sinonSandbox
					.stub(t.rounds, 'updateVotes')
					.resolves('QUERY');
				updateDelegatesRanks_stub = sinonSandbox
					.stub(t.rounds, 'updateDelegatesRanks')
					.resolves();
				flush_stub = sinonSandbox.stub(t.rounds, 'flush').resolves();

				round = new Round(_.cloneDeep(scope), t);
				res = round.land();
			});
		});

		it('should return promise', () => {
			return expect(isPromise(res)).to.be.true;
		});

		it('query getVotes should be called twice', () => {
			// 2x updateVotes which calls 1x getVotes
			return expect(getVotes_stub.callCount).to.equal(2);
		});

		it('query updateVotes should be called twice', () => {
			return expect(updateVotes_stub.callCount).to.equal(2);
		});

		it('query updateMissedBlocks should be called once', () => {
			return expect(roundOutsiders_stub.callCount).to.equal(1);
		});

		it('query flushRound should be called twice', () => {
			return expect(flush_stub.callCount).to.equal(2);
		});

		it('query updateDelegatesRanks should be called once', () => {
			return expect(updateDelegatesRanks_stub.callCount).to.equal(1);
		});

		it('modules.accounts.mergeAccountAndGet should be called 4 times', () => {
			// 3x delegates + 1x remaining fees
			return expect(
				round.scope.modules.accounts.mergeAccountAndGet.callCount
			).to.equal(4);
		});
	});

	describe('backwardLand', () => {
		var batch_stub; // eslint-disable-line no-unused-vars
		var roundOutsiders_stub;
		var updateVotes_stub;
		var getVotes_stub;
		var restoreRoundSnapshot_stub;
		var restoreVotesSnapshot_stub;
		let checkSnapshotAvailability_stub;
		let updateDelegatesRanks_stub;
		var deleteRoundRewards_stub;
		var flush_stub;
		var res;
		var scope;

		before(() => {
			scope = _.cloneDeep(validScope);
			// Init required properties
			scope.roundOutsiders = ['abc'];
			scope.library.db = db;
			scope.modules.accounts.generateAddressByPublicKey = function() {
				return delegate.address;
			};

			var delegate = {
				amount: 10000,
				delegate:
					'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
				address: '16010222169256538112L',
			};

			round.scope.modules.accounts.mergeAccountAndGet.resetHistory();
			return db.task(t => {
				// Init stubs
				batch_stub = sinonSandbox.stub(t, 'none').resolves();
				roundOutsiders_stub = sinonSandbox
					.stub(t.rounds, 'updateMissedBlocks')
					.resolves();
				getVotes_stub = sinonSandbox
					.stub(t.rounds, 'getVotes')
					.resolves([delegate]);
				updateVotes_stub = sinonSandbox
					.stub(t.rounds, 'updateVotes')
					.resolves('QUERY');
				flush_stub = sinonSandbox.stub(t.rounds, 'flush').resolves();
				checkSnapshotAvailability_stub = sinonSandbox
					.stub(t.rounds, 'checkSnapshotAvailability')
					.resolves(1);
				restoreRoundSnapshot_stub = sinonSandbox
					.stub(t.rounds, 'restoreRoundSnapshot')
					.resolves();
				restoreVotesSnapshot_stub = sinonSandbox
					.stub(t.rounds, 'restoreVotesSnapshot')
					.resolves();
				deleteRoundRewards_stub = sinonSandbox
					.stub(t.rounds, 'deleteRoundRewards')
					.resolves();
				updateDelegatesRanks_stub = sinonSandbox
					.stub(t.rounds, 'updateDelegatesRanks')
					.resolves();

				round = new Round(_.cloneDeep(scope), t);
				res = round.backwardLand();
			});
		});

		it('should return promise', () => {
			return expect(isPromise(res)).to.be.true;
		});

		it('query getVotes should not be called', () => {
			return expect(getVotes_stub.called).to.be.false;
		});

		it('query updateVotes should not be called', () => {
			return expect(updateVotes_stub.called).to.be.false;
		});

		it('query updateMissedBlocks not be called', () => {
			return expect(roundOutsiders_stub.called).to.be.false;
		});

		it('query updateDelegatesRanks should be called once', () => {
			return expect(updateDelegatesRanks_stub.callCount).to.equal(1);
		});

		it('query flushRound should be called once', () => {
			return expect(flush_stub.callCount).to.equal(1);
		});

		it('modules.accounts.mergeAccountAndGet should be called 4 times', () => {
			// 3x delegates + 1x remaining fees
			return expect(
				round.scope.modules.accounts.mergeAccountAndGet.callCount
			).to.equal(4);
		});

		it('query checkSnapshotAvailability should be called once', () => {
			return expect(checkSnapshotAvailability_stub.callCount).to.equal(1);
		});

		it('query restoreRoundSnapshot should be called once', () => {
			return expect(restoreRoundSnapshot_stub.callCount).to.equal(1);
		});

		it('query restoreVotesSnapshot should be called once', () => {
			return expect(restoreVotesSnapshot_stub.callCount).to.equal(1);
		});

		it('query deleteRoundRewards should be called once', () => {
			return expect(deleteRoundRewards_stub.callCount).to.equal(1);
		});
	});
});
