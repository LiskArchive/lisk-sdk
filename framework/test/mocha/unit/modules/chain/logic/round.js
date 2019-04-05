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
 */

'use strict';

const rewire = require('rewire');
const Promise = require('bluebird');
const Bignum = require('../../../../../../src/modules/chain/helpers/bignum');
const { TestStorageSandbox } = require('../../../../common/storage_sandbox');

const Round = rewire('../../../../../../src/modules/chain/logic/round');
const genesisBlock = __testContext.config.genesisBlock;

const { ACTIVE_DELEGATES } = global.constants;

describe('round', () => {
	let scope;
	let round;
	let task;

	const storageStubs = {
		Round: {
			delete: sinonSandbox.stub().resolves('Round.delete'),
			getTotalVotedAmount: sinonSandbox
				.stub()
				.resolves('Round.getTotalVotedAmount'),
			deleteRoundRewards: sinonSandbox.stub(),
			createRoundRewards: sinonSandbox.stub(),
			restoreRoundSnapshot: sinonSandbox.stub(),
			restoreVotesSnapshot: sinonSandbox.stub(),
			checkSnapshotAvailability: sinonSandbox.stub(),
			countRoundSnapshot: sinonSandbox.stub(),
		},
		Account: {
			increaseFieldBy: sinonSandbox.stub().resolves('Account.increaseFieldBy'),
			decreaseFieldBy: sinonSandbox.stub().resolves('Account.decreaseFieldBy'),
			syncDelegatesRanks: sinonSandbox
				.stub()
				.resolves('Account.syncDelegatesRanks'),
		},
	};

	const storage = new TestStorageSandbox(__testContext.config.db, storageStubs);

	const modules = {
		accounts: {
			generateAddressByPublicKey: sinonSandbox.stub(),
			mergeAccountAndGet: sinonSandbox.stub(),
		},
	};

	const validScope = {
		backwards: false,
		round: 1,
		roundOutsiders: [],
		roundDelegates: [genesisBlock.generatorPublicKey],
		roundFees: ACTIVE_DELEGATES,
		roundRewards: [10],
		library: {
			storage,
			logger: {
				trace: sinonSandbox.spy(),
				debug: sinonSandbox.spy(),
				info: sinonSandbox.spy(),
				log: sinonSandbox.spy(),
				warn: sinonSandbox.spy(),
				error: sinonSandbox.spy(),
			},
		},
		modules,
		block: {
			generatorPublicKey: genesisBlock.generatorPublicKey,
			id: genesisBlock.id,
			height: 1,
			timestamp: 100,
		},
	};

	beforeEach(done => {
		scope = _.cloneDeep(validScope);

		// As the logic
		storage.adapter.task(t => {
			task = t;
			round = new Round(scope, task);
			done();
		});
		sinonSandbox.reset();
	});

	afterEach(async () => {
		sinonSandbox.reset();
	});

	function isPromise(obj) {
		return typeof obj.then === 'function';
	}

	describe('constructor', () => {
		describe('when calling with required properties', () => {
			it('should return Round instance', async () =>
				expect(round).to.be.instanceof(Round));

			it('should set scope', async () => expect(round.scope).to.be.eql(scope));

			it('should set t', async () => expect(round.t).to.be.eql(task));
		});

		describe('when calling with missing properties', () => {
			describe('round', () => {
				it('should throw', done => {
					const property = 'round';
					delete scope[property];
					try {
						round = new Round(scope, task);
					} catch (err) {
						expect(err.message).to.equal(
							`Missing required scope property: ${property}`
						);
					}
					done();
				});
			});

			describe('backwards', () => {
				it('should throw', done => {
					const property = 'backwards';
					delete scope[property];
					try {
						round = new Round(scope, task);
					} catch (err) {
						expect(err.message).to.equal(
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
						const property = 'roundFees';
						delete scope[property];
						try {
							round = new Round(scope, task);
						} catch (err) {
							expect(err.message).to.equal(
								`Missing required scope property: ${property}`
							);
						}
						done();
					});
				});

				describe('roundRewards', () => {
					it('should throw', done => {
						const property = 'roundRewards';
						delete scope[property];
						try {
							round = new Round(scope, task);
						} catch (err) {
							expect(err.message).to.equal(
								`Missing required scope property: ${property}`
							);
						}
						done();
					});
				});

				describe('roundDelegates', () => {
					it('should throw', done => {
						const property = 'roundDelegates';
						delete scope[property];
						try {
							round = new Round(scope, task);
						} catch (err) {
							expect(err.message).to.equal(
								`Missing required scope property: ${property}`
							);
						}
						done();
					});
				});

				describe('roundOutsiders', () => {
					it('should throw', done => {
						const property = 'roundOutsiders';
						delete scope[property];
						try {
							round = new Round(scope, task);
						} catch (err) {
							expect(err.message).to.equal(
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
		describe('when going forward', () => {
			let args = null;

			beforeEach(() => {
				scope.backwards = false;
				round = new Round(scope, task);
				args = {
					producedBlocks: 1,
					publicKey: scope.block.generatorPublicKey,
					round: scope.round,
				};
				scope.modules.accounts.mergeAccountAndGet.callsArgWith(1, null, args);
				return round.mergeBlockGenerator();
			});

			afterEach(async () => {
				round.scope.modules.accounts.mergeAccountAndGet.reset();
			});

			it('should call modules.accounts.mergeAccountAndGet with proper params', async () =>
				expect(
					round.scope.modules.accounts.mergeAccountAndGet
				).to.be.calledWith(args));
		});

		describe('when going backwards', () => {
			let args = null;

			beforeEach(() => {
				scope.backwards = true;
				round = new Round(scope, task);
				args = {
					producedBlocks: -1,
					publicKey: scope.block.generatorPublicKey,
					round: scope.round,
				};
				scope.modules.accounts.mergeAccountAndGet.callsArgWith(1, null, args);
				return round.mergeBlockGenerator();
			});

			it('should call modules.accounts.mergeAccountAndGet with proper params', async () =>
				expect(
					round.scope.modules.accounts.mergeAccountAndGet
				).to.be.calledWith(args));
		});
	});

	describe('updateMissedBlocks', () => {
		let stub;
		let res;

		describe('when there are no outsiders', () => {
			beforeEach(done => {
				res = round.updateMissedBlocks();
				done();
			});

			it('should return t object', async () => {
				expect(res).to.not.be.instanceOf(Promise);
				return expect(res).to.deep.equal(task);
			});
		});

		describe('when there are outsiders', () => {
			beforeEach(done => {
				scope.roundOutsiders = ['abc'];
				round = new Round(scope, task);
				stub = storageStubs.Account.increaseFieldBy;
				stub
					.withArgs(
						{ address_in: scope.roundOutsiders },
						'missedBlocks',
						'1',
						sinonSandbox.match.any
					)
					.resolves('success');
				res = round.updateMissedBlocks();
				done();
			});

			it('should return promise', async () =>
				expect(isPromise(res)).to.be.true);

			it('query should be called with proper args', async () =>
				res.then(response => {
					expect(response).to.equal('success');
					expect(stub).to.be.calledWith(
						{ address_in: scope.roundOutsiders },
						'missedBlocks',
						'1',
						sinonSandbox.match.any
					);
				}));
		});
	});

	describe('getVotes', () => {
		let stub;
		let res;

		beforeEach(done => {
			stub = storageStubs.Round.getTotalVotedAmount;
			stub.withArgs({ round: scope.round }).resolves('success');
			res = round.getVotes();
			done();
		});

		afterEach(async () => {
			stub.reset();
		});

		it('should return promise', async () => expect(isPromise(res)).to.be.true);

		it('query should be called with proper args', async () =>
			res.then(response => {
				expect(response).to.equal('success');
				expect(stub.calledWith({ round: scope.round })).to.be.true;
			}));
	});

	describe('updateVotes', () => {
		let getVotes_stub;
		let updateVotes_stub;
		let res;
		let delegate;

		describe('when getVotes returns at least one entry', () => {
			beforeEach(async () => {
				getVotes_stub = storageStubs.Round.getTotalVotedAmount;
				updateVotes_stub = storageStubs.Account.increaseFieldBy;

				delegate = {
					amount: 10000,
					delegate:
						'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
					address: '16010222169256538112L',
				};

				scope.modules.accounts.generateAddressByPublicKey = function() {
					return delegate.address;
				};

				getVotes_stub
					.withArgs({ round: scope.round })
					.resolves([delegate, delegate]);

				updateVotes_stub
					.withArgs(
						{ address: delegate.address },
						'vote',
						delegate.amount,
						sinonSandbox.match.any
					)
					.resolves('QUERY');

				round = new Round(scope, task);
				res = round.updateVotes();
				await res;
			});

			afterEach(async () => {
				getVotes_stub.reset();
				updateVotes_stub.reset();
			});

			it('should return promise', async () =>
				expect(isPromise(res)).to.be.true);

			it('getVotes query should be called with proper args', async () =>
				expect(getVotes_stub.calledWith({ round: scope.round })).to.be.true);

			it('updateVotes should be called twice', async () =>
				expect(updateVotes_stub.callCount).to.be.eql(2));

			it('updateVotes query should be called with proper args', async () =>
				expect(updateVotes_stub).to.be.calledWith(
					{ address: delegate.address },
					'vote',
					delegate.amount,
					sinonSandbox.match.any
				));

			it('getVotes result should contain 2 queries', async () =>
				res.then(response => {
					expect(response).to.deep.equal(['QUERY', 'QUERY']);
				}));
		});

		describe('when getVotes returns no entries', () => {
			beforeEach(async () => {
				delegate = {
					amount: 10000,
					delegate:
						'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
					address: '16010222169256538112L',
				};

				scope.modules.accounts.generateAddressByPublicKey = function() {
					return delegate.address;
				};

				getVotes_stub.withArgs({ round: scope.round }).resolves([]);
				updateVotes_stub.resetHistory();
				updateVotes_stub
					.withArgs(delegate.address, delegate.amount)
					.resolves('QUERY');

				round = new Round(scope, task);
				res = round.updateVotes();
			});

			afterEach(async () => {
				getVotes_stub.reset();
				updateVotes_stub.reset();
			});

			it('should return promise', async () =>
				expect(isPromise(res)).to.be.true);

			it('getVotes query should be called with proper args', async () =>
				expect(getVotes_stub.calledWith({ round: scope.round })).to.be.true);

			it('updateVotes should be not called', async () =>
				expect(updateVotes_stub.called).to.be.false);
		});
	});

	describe('flushRound', () => {
		let stub;
		let res;

		beforeEach(async () => {
			stub = storageStubs.Round.delete.resolves('success');
			round = new Round(scope, task);
			res = round.flushRound();
		});

		afterEach(async () => {
			stub.reset();
		});

		it('should return promise', async () => expect(isPromise(res)).to.be.true);

		it('query should be called with proper args', async () => {
			const response = await res;
			expect(response).to.equal('success');
			expect(stub).to.be.calledWith({ round: scope.round });
		});
	});

	describe('updateDelegatesRanks', () => {
		let stub;
		let res;

		beforeEach(done => {
			stub = storageStubs.Account.syncDelegatesRanks;
			stub.resolves('success');

			round = new Round(scope, task);
			res = round.updateDelegatesRanks();
			done();
		});

		afterEach(async () => {
			stub.reset();
		});

		it('should return promise', async () => expect(isPromise(res)).to.be.true);

		it('query should be called with proper args', async () =>
			res.then(response => {
				expect(response).to.equal('success');
				expect(stub.calledOnce).to.be.true;
			}));
	});

	describe('restoreRoundSnapshot', () => {
		let res;
		let stub;

		beforeEach(done => {
			stub = storageStubs.Round.restoreRoundSnapshot;
			stub.resolves('success');
			res = round.restoreRoundSnapshot();
			done();
		});

		afterEach(async () => {
			stub.reset();
		});

		it('should return promise', async () => expect(isPromise(res)).to.be.true);

		it('query should be called with no args', async () =>
			res.then(response => {
				expect(response).to.equal('success');
				expect(stub.calledWith()).to.be.true;
			}));
	});

	describe('restoreVotesSnapshot', () => {
		let stub;
		let res;

		beforeEach(done => {
			stub = storageStubs.Round.restoreVotesSnapshot;
			stub.withArgs().resolves('success');
			res = round.restoreVotesSnapshot();
			done();
		});

		afterEach(async () => {
			stub.reset();
		});

		it('should return promise', async () => expect(isPromise(res)).to.be.true);

		it('query should be called with no args', async () =>
			res.then(response => {
				expect(response).to.equal('success');
				expect(stub.calledWith()).to.be.true;
			}));
	});

	describe('checkSnapshotAvailability', () => {
		const stubs = {};
		let res;

		beforeEach(done => {
			// Init stubs and scope
			stubs.checkSnapshotAvailability =
				storageStubs.Round.checkSnapshotAvailability;
			stubs.countRoundSnapshot = storageStubs.Round.countRoundSnapshot;
			done();
		});

		afterEach(async () => {
			stubs.checkSnapshotAvailability.reset();
			stubs.countRoundSnapshot.reset();
		});

		it('should return promise', async () => {
			stubs.checkSnapshotAvailability.resolves();
			stubs.countRoundSnapshot.resolves();
			scope.round = 1;
			round = new Round(scope, task);
			res = round.checkSnapshotAvailability();

			return expect(isPromise(res)).to.be.true;
		});

		it('should resolve without any error when checkSnapshotAvailability query returns 1', async () => {
			stubs.checkSnapshotAvailability.withArgs(1).resolves(1);
			scope.round = 1;
			round = new Round(scope, task);
			res = round.checkSnapshotAvailability();

			return res.then(() => {
				expect(stubs.checkSnapshotAvailability).to.have.been.calledWith(1);
				return expect(stubs.countRoundSnapshot.called).to.be.false;
			});
		});

		it('should resolve without any error when checkSnapshotAvailability query returns null and table is empty', async () => {
			stubs.checkSnapshotAvailability.withArgs(2).resolves(null);
			stubs.countRoundSnapshot.resolves(0);
			scope.round = 2;
			round = new Round(scope, task);
			res = round.checkSnapshotAvailability();

			return res.then(() => {
				expect(stubs.checkSnapshotAvailability).to.have.been.calledWith(2);
				return expect(stubs.countRoundSnapshot.called).to.be.true;
			});
		});

		it('should be rejected with proper error when checkSnapshotAvailability query returns null and table is not empty', async () => {
			stubs.checkSnapshotAvailability.withArgs(2).resolves(null);
			stubs.countRoundSnapshot.resolves(1);
			scope.round = 2;
			round = new Round(scope, task);
			res = round.checkSnapshotAvailability();

			return expect(res).to.eventually.be.rejectedWith(
				'Snapshot for round 2 not available'
			);
		});
	});

	describe('deleteRoundRewards', () => {
		let stub;
		let res;

		beforeEach(done => {
			stub = storageStubs.Round.deleteRoundRewards;
			stub.withArgs(scope.round).resolves('success');
			round = new Round(scope, task);
			res = round.deleteRoundRewards();
			done();
		});

		afterEach(async () => {
			stub.reset();
		});

		it('should return promise', async () => expect(isPromise(res)).to.be.true);

		it('query should be called with no args', async () =>
			res.then(response => {
				expect(response).to.equal('success');
				expect(stub).to.have.been.calledWith(scope.round);
			}));
	});

	describe('rewardsAtRound', () => {
		const validLocalScope = _.cloneDeep(validScope);
		const rewardsAt = 2;

		beforeEach(done => {
			validLocalScope.round = 1;
			validLocalScope.roundFees = 500;
			validLocalScope.roundRewards = [0, 0, 100, 10];
			done();
		});

		it('should calculate round changes from valid scope', async () => {
			round = new Round(validLocalScope, task);
			const res = round.rewardsAtRound(rewardsAt);

			expect(res.fees).equal(4);
			expect(res.feesRemaining).equal(96);
			expect(res.rewards).equal(validLocalScope.roundRewards[rewardsAt]); // 100
			return expect(res.balance).equal(104);
		});

		it('should calculate round changes from Infinite fees', async () => {
			validLocalScope.roundFees = Infinity;

			round = new Round(validLocalScope, task);
			const res = round.rewardsAtRound(rewardsAt);

			expect(res.fees).equal(Infinity);
			expect(res.feesRemaining).to.be.NaN;
			expect(res.rewards).equal(validLocalScope.roundRewards[rewardsAt]); // 100
			return expect(res.balance).equal(Infinity);
		});

		it('should calculate round changes from Number.MAX_VALUE fees', async () => {
			validLocalScope.roundFees = Number.MAX_VALUE; // 1.7976931348623157e+308
			round = new Round(validLocalScope, task);

			const res = round.rewardsAtRound(rewardsAt);
			const expectedFees = 1779894192932990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099; // 1.7976931348623157e+308 / 101 (delegates num)

			expect(res.fees).equal(expectedFees);
			expect(res.rewards).equal(validLocalScope.roundRewards[rewardsAt]); // 100
			expect(res.feesRemaining).equal(1);

			const expectedBalance = 1779894192932990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990099009900990199; // 1.7976931348623157e+308 / 101 (delegates num) + 100
			return expect(res.balance).equal(expectedBalance);
		});
	});

	describe('applyRound', () => {
		let res;
		let insertRoundRewards_stub;

		function sumChanges(forward, backwards) {
			const results = {};
			forward.forEach(response => {
				if (results[response.publicKey]) {
					results[response.publicKey].balance += response.balance || 0;
					results[response.publicKey].rewards += response.rewards || 0;
					results[response.publicKey].fees += response.fees || 0;
				} else {
					results[response.publicKey] = {
						balance: response.balance || 0,
						rewards: response.rewards || 0,
						fees: response.fees || 0,
					};
				}
			});
			backwards.forEach(response => {
				if (results[response.publicKey]) {
					results[response.publicKey].balance += response.balance || 0;
					results[response.publicKey].rewards += response.rewards || 0;
					results[response.publicKey].fees += response.fees || 0;
				} else {
					results[response.publicKey] = {
						balance: response.balance || 0,
						rewards: response.rewards || 0,
						fees: response.fees || 0,
					};
				}
			});
			return results;
		}

		beforeEach(async () => {
			insertRoundRewards_stub = storageStubs.Round.createRoundRewards.resolves(
				'insertRoundRewards'
			);
			modules.accounts.mergeAccountAndGet.yields(null, 'mergeAccountAndGet');
		});

		afterEach(async () => {
			modules.accounts.mergeAccountAndGet.reset();
			insertRoundRewards_stub.reset();
		});

		describe('with only one delegate', () => {
			describe('when there are no remaining fees', () => {
				const forwardResults = [];
				const backwardsResults = [];

				beforeEach(done => {
					scope.roundDelegates = [genesisBlock.generatorPublicKey];
					scope.roundFees = ACTIVE_DELEGATES; // 1 LSK fee per delegate, no remaining fees
					done();
				});

				describe('forward', () => {
					let called = 0;

					beforeEach(async () => {
						scope.backwards = false;
						round = new Round(scope, task);
						res = await round.applyRound();
					});

					it('query should be called', async () => {
						// One success for mergeAccountAndGet and one for insertRoundRewards_stub
						expect(res).to.be.eql(['mergeAccountAndGet', 'insertRoundRewards']);
					});

					it('should call mergeAccountAndGet with proper args (apply rewards)', async () => {
						const index = 0; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.be.eql(args);
					});

					it('should not call mergeAccountAndGet another time (for apply remaining fees)', async () =>
						expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called));

					it('should call insertRoundRewards with proper args', async () =>
						expect(insertRoundRewards_stub).to.have.been.calledWith(
							{
								timestamp: scope.block.timestamp,
								fees: forwardResults[0].fees.toString(),
								reward: forwardResults[0].rewards.toString(),
								round: scope.round,
								publicKey: forwardResults[0].publicKey,
							},
							sinonSandbox.match.any
						));
				});

				describe('backwards', () => {
					let called = 0;

					beforeEach(async () => {
						scope.backwards = true;

						round = new Round(scope, task);
						res = await round.applyRound();
					});

					it('query should be called', async () => {
						expect(res).to.be.eql(['mergeAccountAndGet']);
					});

					it('should call mergeAccountAndGet with proper args (apply rewards)', async () => {
						const index = 0; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (for apply remaining fees)', async () =>
						expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called));

					it('should not call insertRoundRewards', async () =>
						expect(insertRoundRewards_stub).to.have.not.been.called);
				});

				describe('consistency checks for each delegate', () => {
					let result;

					before(done => {
						result = sumChanges(forwardResults, backwardsResults);
						done();
					});

					it('balance should sum to 0', async () =>
						_.each(result, response => {
							expect(response.balance).to.equal(0);
						}));

					it('fees should sum to 0', async () =>
						_.each(result, response => {
							expect(response.fees).to.equal(0);
						}));

					it('rewards should sum to 0', async () =>
						_.each(result, response => {
							expect(response.rewards).to.equal(0);
						}));
				});
			});

			describe('when there are remaining fees', () => {
				const forwardResults = [];
				const backwardsResults = [];

				beforeEach(done => {
					scope.roundDelegates = [genesisBlock.generatorPublicKey];
					scope.roundFees = 100; // 0 LSK fee per delegate, 100 remaining fees
					done();
				});

				describe('forward', () => {
					let called = 0;

					beforeEach(async () => {
						scope.backwards = false;

						round = new Round(scope, task);
						res = await round.applyRound();
					});

					it('query should be called', async () => {
						expect(res).to.be.eql([
							'mergeAccountAndGet',
							'mergeAccountAndGet',
							'insertRoundRewards',
						]);
					});

					it('should call mergeAccountAndGet with proper args (apply rewards)', async () => {
						const index = 0; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (fees)', async () => {
						const index = 0; // Delegate index on list
						const feesPerDelegate = new Bignum(scope.roundFees.toPrecision(15))
							.dividedBy(ACTIVE_DELEGATES)
							.integerValue(Bignum.ROUND_FLOOR);
						const remainingFees = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.minus(feesPerDelegate.multipliedBy(ACTIVE_DELEGATES))
								.toFixed()
						);

						const args = {
							publicKey: scope.roundDelegates[index], // Remaining fees are applied to last delegate of round
							balance: remainingFees,
							round: scope.round,
							fees: remainingFees,
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (completed)', async () =>
						expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called));

					it('should call insertRoundRewards with proper args', async () =>
						expect(insertRoundRewards_stub).to.have.been.calledWith(
							{
								timestamp: scope.block.timestamp,
								fees: (
									forwardResults[0].fees + forwardResults[1].fees
								).toString(),
								reward: forwardResults[0].rewards.toString(),
								round: scope.round,
								publicKey: forwardResults[0].publicKey,
							},
							sinonSandbox.match.any
						));
				});

				describe('backwards', () => {
					let called = 0;

					beforeEach(async () => {
						scope.backwards = true;

						round = new Round(scope, task);
						res = await round.applyRound();
					});

					it('query should be called', async () => {
						expect(res).to.be.eql(['mergeAccountAndGet', 'mergeAccountAndGet']);
					});

					it('should call mergeAccountAndGet with proper args (apply rewards)', async () => {
						const index = 0; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (fees)', async () => {
						const index = 0; // Delegate index on list
						const feesPerDelegate = new Bignum(scope.roundFees.toPrecision(15))
							.dividedBy(ACTIVE_DELEGATES)
							.integerValue(Bignum.ROUND_FLOOR);
						const remainingFees = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.minus(feesPerDelegate.multipliedBy(ACTIVE_DELEGATES))
								.toFixed()
						);

						const args = {
							publicKey: scope.roundDelegates[index], // Remaining fees are applied to last delegate of round
							balance: -remainingFees,
							round: scope.round,
							fees: -remainingFees,
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (completed)', async () =>
						expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called));

					it('should not call insertRoundRewards', async () =>
						expect(insertRoundRewards_stub).to.have.not.been.called);
				});

				describe('consistency checks for each delegate', () => {
					let result;

					before(done => {
						result = sumChanges(forwardResults, backwardsResults);
						done();
					});

					it('balance should sum to 0', async () =>
						_.each(result, response => {
							expect(response.balance).to.equal(0);
						}));

					it('fees should sum to 0', async () =>
						_.each(result, response => {
							expect(response.fees).to.equal(0);
						}));

					it('rewards should sum to 0', async () =>
						_.each(result, response => {
							expect(response.rewards).to.equal(0);
						}));
				});
			});
		});

		describe('with 3 delegates', () => {
			describe('when there are no remaining fees', () => {
				const forwardResults = [];
				const backwardsResults = [];

				beforeEach(done => {
					scope.roundDelegates = [
						'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
						'968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b',
						'380b952cd92f11257b71cce73f51df5e0a258e54f60bb82bccd2ba8b4dff2ec9',
					];
					scope.roundRewards = [1, 2, 3];
					scope.roundFees = ACTIVE_DELEGATES; // 1 LSK fee per delegate, no remaining fees
					done();
				});

				describe('forward', () => {
					let called = 0;

					beforeEach(async () => {
						scope.backwards = false;

						round = new Round(scope, task);
						res = await round.applyRound();
					});

					it('query should be called', async () => {
						expect(res).to.be.eql([
							'mergeAccountAndGet',
							'mergeAccountAndGet',
							'mergeAccountAndGet',
							'insertRoundRewards',
							'insertRoundRewards',
							'insertRoundRewards',
						]);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 1st delegate', async () => {
						const index = 0; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 2nd delegate', async () => {
						const index = 1; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 3th delegate', async () => {
						const index = 2; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (for applying remaining fees)', async () =>
						expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called));

					it('should call insertRoundRewards with proper args', async () => {
						expect(insertRoundRewards_stub).to.have.been.calledWith(
							{
								timestamp: scope.block.timestamp,
								fees: forwardResults[0].fees.toString(),
								reward: forwardResults[0].rewards.toString(),
								round: scope.round,
								publicKey: forwardResults[0].publicKey,
							},
							sinonSandbox.match.any
						);
						expect(insertRoundRewards_stub).to.have.been.calledWith(
							{
								timestamp: scope.block.timestamp,
								fees: forwardResults[1].fees.toString(),
								reward: forwardResults[1].rewards.toString(),
								round: scope.round,
								publicKey: forwardResults[1].publicKey,
							},
							sinonSandbox.match.any
						);
						return expect(insertRoundRewards_stub).to.have.been.calledWith(
							{
								timestamp: scope.block.timestamp,
								fees: forwardResults[2].fees.toString(),
								reward: forwardResults[2].rewards.toString(),
								round: scope.round,
								publicKey: forwardResults[2].publicKey,
							},
							sinonSandbox.match.any
						);
					});
				});

				describe('backwards', () => {
					let called = 0;

					beforeEach(async () => {
						scope.backwards = true;

						round = new Round(_.cloneDeep(scope), task);
						res = await round.applyRound();
					});

					it('query should be called', async () => {
						expect(res).to.be.eql([
							'mergeAccountAndGet',
							'mergeAccountAndGet',
							'mergeAccountAndGet',
						]);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 1st delegate', async () => {
						const index = 2; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 2nd delegate', async () => {
						const index = 1; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 3th delegate', async () => {
						const index = 0; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (for applying remaining fees)', async () =>
						expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called));

					it('should not call insertRoundRewards', async () =>
						expect(insertRoundRewards_stub).to.have.not.been.called);
				});

				describe('consistency checks for each delegate', () => {
					let result;

					before(done => {
						result = sumChanges(forwardResults, backwardsResults);
						done();
					});

					it('balance should sum to 0', async () =>
						_.each(result, response => {
							expect(response.balance).to.equal(0);
						}));

					it('fees should sum to 0', async () =>
						_.each(result, response => {
							expect(response.fees).to.equal(0);
						}));

					it('rewards should sum to 0', async () =>
						_.each(result, response => {
							expect(response.rewards).to.equal(0);
						}));
				});
			});

			describe('when there are remaining fees', () => {
				const forwardResults = [];
				const backwardsResults = [];

				beforeEach(done => {
					scope.roundDelegates = [
						'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
						'968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b',
						'380b952cd92f11257b71cce73f51df5e0a258e54f60bb82bccd2ba8b4dff2ec9',
					];
					scope.roundRewards = [1, 2, 3];
					scope.roundFees = 1000; // 9 LSK fee per delegate, 91 remaining fees
					done();
				});

				describe('forward', () => {
					let called = 0;

					beforeEach(async () => {
						scope.backwards = false;

						round = new Round(_.cloneDeep(scope), task);
						res = await round.applyRound();
					});

					it('query should be called', async () => {
						expect(res).to.be.eql([
							'mergeAccountAndGet',
							'mergeAccountAndGet',
							'mergeAccountAndGet',
							'mergeAccountAndGet',
							'insertRoundRewards',
							'insertRoundRewards',
							'insertRoundRewards',
						]);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 1st delegate', async () => {
						const index = 0; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 2nd delegate', async () => {
						const index = 1; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 3th delegate', async () => {
						const index = 2; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: balancePerDelegate,
							round: scope.round,
							fees: feesPerDelegate,
							rewards: scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (fees)', async () => {
						const index = 2; // Delegate index on list
						const feesPerDelegate = new Bignum(scope.roundFees.toPrecision(15))
							.dividedBy(ACTIVE_DELEGATES)
							.integerValue(Bignum.ROUND_FLOOR);
						const remainingFees = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.minus(feesPerDelegate.multipliedBy(ACTIVE_DELEGATES))
								.toFixed()
						);

						const args = {
							publicKey: scope.roundDelegates[index], // Remaining fees are applied to last delegate of round
							balance: remainingFees,
							round: scope.round,
							fees: remainingFees,
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (completed)', async () =>
						expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called));

					it('should call insertRoundRewards with proper args', async () => {
						expect(insertRoundRewards_stub).to.have.been.calledWith(
							{
								timestamp: scope.block.timestamp,
								fees: forwardResults[0].fees.toString(),
								reward: forwardResults[0].rewards.toString(),
								round: scope.round,
								publicKey: forwardResults[0].publicKey,
							},
							sinonSandbox.match.any
						);
						expect(insertRoundRewards_stub).to.have.been.calledWith(
							{
								timestamp: scope.block.timestamp,
								fees: forwardResults[1].fees.toString(),
								reward: forwardResults[1].rewards.toString(),
								round: scope.round,
								publicKey: forwardResults[1].publicKey,
							},
							sinonSandbox.match.any
						);
						expect(insertRoundRewards_stub).to.have.been.calledWith(
							{
								timestamp: scope.block.timestamp,
								fees: (
									forwardResults[2].fees + forwardResults[3].fees
								).toString(),
								reward: forwardResults[2].rewards.toString(),
								round: scope.round,
								publicKey: forwardResults[2].publicKey,
							},
							sinonSandbox.match.any
						);
					});
				});

				describe('backwards', () => {
					let called = 0;

					beforeEach(async () => {
						scope.backwards = true;

						round = new Round(_.cloneDeep(scope), task);
						res = await round.applyRound();
					});

					it('query should be called', async () => {
						expect(res).to.be.eql([
							'mergeAccountAndGet',
							'mergeAccountAndGet',
							'mergeAccountAndGet',
							'mergeAccountAndGet',
						]);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 1st delegate', async () => {
						const index = 2; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 2nd delegate', async () => {
						const index = 1; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (rewards) - 3th delegate', async () => {
						const index = 0; // Delegate index on list
						const balancePerDelegate = Number(
							new Bignum(scope.roundRewards[index].toPrecision(15))
								.plus(
									new Bignum(scope.roundFees.toPrecision(15))
										.dividedBy(ACTIVE_DELEGATES)
										.integerValue(Bignum.ROUND_FLOOR)
								)
								.toFixed()
						);
						const feesPerDelegate = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.dividedBy(ACTIVE_DELEGATES)
								.integerValue(Bignum.ROUND_FLOOR)
								.toFixed()
						);
						const args = {
							publicKey: scope.roundDelegates[index],
							balance: -balancePerDelegate,
							round: scope.round,
							fees: -feesPerDelegate,
							rewards: -scope.roundRewards[index],
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						backwardsResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should call mergeAccountAndGet with proper args (fees)', async () => {
						const index = 2; // Delegate index on list
						const feesPerDelegate = new Bignum(scope.roundFees.toPrecision(15))
							.dividedBy(ACTIVE_DELEGATES)
							.integerValue(Bignum.ROUND_FLOOR);
						const remainingFees = Number(
							new Bignum(scope.roundFees.toPrecision(15))
								.minus(feesPerDelegate.multipliedBy(ACTIVE_DELEGATES))
								.toFixed()
						);

						const args = {
							publicKey: scope.roundDelegates[index], // Remaining fees are applied to last delegate of round
							balance: -remainingFees,
							round: scope.round,
							fees: -remainingFees,
						};
						const result =
							round.scope.modules.accounts.mergeAccountAndGet.args[called][0];
						forwardResults.push(result);
						called++;
						return expect(result).to.deep.equal(args);
					});

					it('should not call mergeAccountAndGet another time (completed)', async () =>
						expect(
							round.scope.modules.accounts.mergeAccountAndGet.callCount
						).to.equal(called));

					it('should not call insertRoundRewards', async () =>
						expect(insertRoundRewards_stub).to.have.not.been.called);
				});

				describe('consistency checks for each delegate', () => {
					let result;

					before(done => {
						result = sumChanges(forwardResults, backwardsResults);
						done();
					});

					it('balance should sum to 0', async () =>
						_.each(result, response => {
							expect(response.balance).to.equal(0);
						}));

					it('fees should sum to 0', async () =>
						_.each(result, response => {
							expect(response.fees).to.equal(0);
						}));

					it('rewards should sum to 0', async () =>
						_.each(result, response => {
							expect(response.rewards).to.equal(0);
						}));
				});
			});
		});
	});

	describe('land', () => {
		let increaseFieldBy_stub;
		let decreaseFieldBy_stub;
		let getVotes_stub;
		let syncDelegatesRanks_stub;
		let flush_stub;
		let res;

		beforeEach(async () => {
			// Init required properties
			scope.roundOutsiders = ['abc'];
			scope.roundDelegates = [
				'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
				'968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b',
				'380b952cd92f11257b71cce73f51df5e0a258e54f60bb82bccd2ba8b4dff2ec9',
			];
			scope.roundRewards = [1, 2, 3];
			scope.roundFees = 1000; // 9 LSK fee per delegate, 91 remaining fees

			scope.modules.accounts.generateAddressByPublicKey = function() {
				return delegate.address;
			};

			const delegate = {
				amount: 10000,
				delegate:
					'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
				address: '16010222169256538112L',
			};
			increaseFieldBy_stub = storageStubs.Account.increaseFieldBy.resolves(
				'increaseFieldBy'
			);
			decreaseFieldBy_stub = storageStubs.Account.decreaseFieldBy.resolves(
				'decreaseFieldBy'
			);
			getVotes_stub = storageStubs.Round.getTotalVotedAmount.resolves([
				delegate,
			]);
			syncDelegatesRanks_stub = storageStubs.Account.syncDelegatesRanks.resolves(
				'syncDelegatesRanks'
			);
			flush_stub = storageStubs.Round.delete;
			scope.modules.accounts.mergeAccountAndGet.yields(
				null,
				'mergeAccountAndGet'
			);

			round = new Round(scope, task);
			res = round.land();
			await res;
		});

		afterEach(async () => {
			flush_stub.reset();
			increaseFieldBy_stub.reset();
			decreaseFieldBy_stub.reset();
			getVotes_stub.reset();
			syncDelegatesRanks_stub.reset();
			round.scope.modules.accounts.mergeAccountAndGet.reset();
		});

		it('should return promise', async () => expect(isPromise(res)).to.be.true);

		it('query getVotes should be called twice', async () =>
			// 2x updateVotes which calls 1x getVotes
			expect(getVotes_stub.callCount).to.be.eql(2));

		it('query increaseFieldBy should be called 3 times', async () =>
			// 2 for updating vote and 1 for updating missedBlocks
			expect(increaseFieldBy_stub.callCount).to.equal(3));

		it('query decreaseFieldBy should be called once', async () =>
			expect(decreaseFieldBy_stub.callCount).to.equal(0));

		it('query flushRound should be called twice', async () =>
			expect(flush_stub.callCount).to.equal(2));

		it('query updateDelegatesRanks should be called once', async () =>
			expect(syncDelegatesRanks_stub.callCount).to.equal(1));

		it('modules.accounts.mergeAccountAndGet should be called 4 times', async () =>
			// 3x delegates + 1x remaining fees
			expect(
				round.scope.modules.accounts.mergeAccountAndGet.callCount
			).to.equal(4));
	});

	describe('backwardLand', () => {
		let increaseFieldBy_stub;
		let decreaseFieldBy_stub;
		let getVotes_stub;
		let restoreRoundSnapshot_stub;
		let restoreVotesSnapshot_stub;
		let checkSnapshotAvailability_stub;
		let syncDelegatesRanks_stub;
		let deleteRoundRewards_stub;
		let flush_stub;
		let res;

		beforeEach(async () => {
			// Init required properties
			scope.roundOutsiders = ['abc'];
			scope.roundDelegates = [
				'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
				'968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b',
				'380b952cd92f11257b71cce73f51df5e0a258e54f60bb82bccd2ba8b4dff2ec9',
			];
			scope.roundRewards = [1, 2, 3];
			scope.roundFees = 1000; // 9 LSK fee per delegate, 91 remaining fees

			scope.modules.accounts.generateAddressByPublicKey = function() {
				return delegate.address;
			};

			const delegate = {
				amount: 10000,
				delegate:
					'6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a',
				address: '16010222169256538112L',
			};

			increaseFieldBy_stub = storageStubs.Account.increaseFieldBy.resolves();
			decreaseFieldBy_stub = storageStubs.Account.decreaseFieldBy.resolves();
			getVotes_stub = storageStubs.Round.getTotalVotedAmount.resolves([
				delegate,
			]);
			syncDelegatesRanks_stub = storageStubs.Account.syncDelegatesRanks.resolves();
			flush_stub = storageStubs.Round.delete;
			checkSnapshotAvailability_stub = storageStubs.Round.checkSnapshotAvailability.resolves(
				1
			);
			restoreRoundSnapshot_stub = storageStubs.Round.restoreRoundSnapshot.resolves();
			restoreVotesSnapshot_stub = storageStubs.Round.restoreVotesSnapshot.resolves();
			deleteRoundRewards_stub = storageStubs.Round.deleteRoundRewards.resolves();
			scope.modules.accounts.mergeAccountAndGet.yields(
				null,
				'mergeAccountAndGet'
			);

			round = new Round(scope, task);
			res = round.backwardLand();
			await res;
		});

		afterEach(async () => {
			increaseFieldBy_stub.reset();
			decreaseFieldBy_stub.reset();
			getVotes_stub.reset();
			restoreRoundSnapshot_stub.reset();
			restoreVotesSnapshot_stub.reset();
			checkSnapshotAvailability_stub.reset();
			syncDelegatesRanks_stub.reset();
			deleteRoundRewards_stub.reset();
			flush_stub.reset();
			round.scope.modules.accounts.mergeAccountAndGet.reset();
		});

		it('should return promise', async () => expect(isPromise(res)).to.be.true);

		it('query getVotes should not be called', async () =>
			expect(getVotes_stub.called).to.be.false);

		it('query increaseFieldBy not be called', async () =>
			expect(increaseFieldBy_stub.called).to.be.false);

		it('query decreaseFieldBy not be called', async () =>
			expect(decreaseFieldBy_stub.called).to.be.false);

		it('query syncDelegatesRanks should be called once', async () =>
			expect(syncDelegatesRanks_stub.callCount).to.equal(1));

		it('query flushRound should be called once', async () =>
			expect(flush_stub.callCount).to.equal(1));

		it('modules.accounts.mergeAccountAndGet should be called 4 times', async () =>
			// 3x delegates + 1x remaining fees
			expect(
				round.scope.modules.accounts.mergeAccountAndGet.callCount
			).to.equal(4));

		it('query checkSnapshotAvailability should be called once', async () =>
			expect(checkSnapshotAvailability_stub.callCount).to.equal(1));

		it('query restoreRoundSnapshot should be called once', async () =>
			expect(restoreRoundSnapshot_stub.callCount).to.equal(1));

		it('query restoreVotesSnapshot should be called once', async () =>
			expect(restoreVotesSnapshot_stub.callCount).to.equal(1));

		it('query deleteRoundRewards should be called once', async () =>
			expect(deleteRoundRewards_stub.callCount).to.equal(1));
	});
});
