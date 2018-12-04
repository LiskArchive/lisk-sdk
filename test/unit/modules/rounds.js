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

// Init tests dependencies
const rewire = require('rewire');
// Instantiate test subject
const Rounds = rewire('../../../modules/rounds.js');
const Round = rewire('../../../logic/round.js'); // eslint-disable-line no-unused-vars
const DBSandbox = require('../../common/db_sandbox').DBSandbox;

const sinon = sinonSandbox;

describe('rounds', () => {
	let db;
	let dbSandbox;
	let rounds;
	let validScope;

	// Init fake logger
	const logger = {
		trace: sinon.spy(),
		debug: sinon.spy(),
		info: sinon.spy(),
		log: sinon.spy(),
		warn: sinon.spy(),
		error: sinon.spy(),
	};

	function get(variable) {
		return Rounds.__get__(variable);
	}

	function set(variable, value) {
		return Rounds.__set__(variable, value);
	}

	before(done => {
		dbSandbox = new DBSandbox(__testContext.config.db, 'rounds_module');
		dbSandbox.create((err, __db) => {
			db = __db;

			validScope = {
				logger,
				db,
				bus: { message: sinon.spy() },
				network: { io: { sockets: { emit: sinon.spy() } } },
			};
			done();
		});
	});

	describe('constructor', () => {
		let scope;

		before(done => {
			scope = _.cloneDeep(validScope);
			new Rounds((err, __instance) => {
				rounds = __instance;
				// Overwrite database with reference from rounds module,
				// needed for redefine properties without getting that every time
				db = get('library.db');
				done();
			}, _.cloneDeep(scope));
		});

		it('should return Rounds instance', () => {
			return expect(rounds).to.be.instanceof(Rounds);
		});

		it('should set library to scope', () => {
			return expect(get('library')).to.deep.equal(validScope);
		});

		it('should set self object', () => {
			const self = Rounds.__get__('self');
			return expect(self).to.deep.equal(rounds);
		});
	});

	describe('loaded', () => {
		it('should return __private.loaded', () => {
			const variable = '__private.loaded';
			const backup = get(variable);
			const value = 'abc';
			set(variable, value);
			expect(get(variable)).to.equal(value);
			return set(variable, backup);
		});
	});

	describe('ticking', () => {
		it('should return __private.ticking', () => {
			const variable = '__private.ticking';
			const backup = get(variable);
			const value = 'abc';
			set(variable, value);
			expect(get(variable)).to.equal(value);
			return set(variable, backup);
		});
	});

	describe('flush', () => {
		let stub;
		let error;

		before(() => {
			stub = sinon.stub(db.rounds, 'flush');
			stub.withArgs(true).resolves('success');
			return stub.withArgs(false).rejects('fail');
		});

		after(() => {
			return stub.restore();
		});

		describe('when flush query is successful', () => {
			before(done => {
				rounds.flush(true, err => {
					error = err;
					done();
				});
			});

			after(() => {
				return stub.resetHistory();
			});

			it('should call a callback when no error', () => {
				return expect(error).to.not.exist;
			});

			it('flush query should be called once', () => {
				return expect(stub.calledOnce).to.be.true;
			});
		});

		describe('when flush query fails', () => {
			before(done => {
				rounds.flush(false, err => {
					error = err;
					done();
				});
			});

			after(() => {
				return stub.resetHistory();
			});

			it('should call a callback with error = Rounds#flush error', () => {
				return expect(error).to.equal('Rounds#flush error');
			});

			it('flush query should be called once', () => {
				return expect(stub.calledOnce).to.be.true;
			});
		});
	});

	describe('onBind', () => {
		it('should set modules', () => {
			const variable = 'modules';
			const backup = get(variable);
			const value = {
				blocks: 'blocks',
				accounts: 'accounts',
				delegates: 'delegates',
			};
			rounds.onBind(value);
			expect(get(variable)).to.deep.equal(value);
			return set(variable, backup);
		});
	});

	describe('onBlockchainReady', () => {
		it('should set __private.loaded = true', () => {
			const variable = '__private.loaded ';
			const backup = get(variable);
			const value = false;
			set(variable, value);
			rounds.onBlockchainReady();
			expect(get(variable)).to.equal(true);
			return set(variable, backup);
		});
	});

	describe('onFinishRound', () => {
		it('should call library.network.io.sockets.emit once, with proper params', () => {
			const round = 123;
			rounds.onFinishRound(round);

			expect(validScope.network.io.sockets.emit.calledOnce).to.be.true;
			expect(
				validScope.network.io.sockets.emit.calledWith('rounds/change', {
					number: round,
				})
			).to.be.true;
			return validScope.network.io.sockets.emit.reset();
		});
	});

	describe('cleanup', () => {
		it('should set __private.loaded = false and call a callback', done => {
			const variable = '__private.loaded ';
			const backup = get(variable);
			const value = true;
			set(variable, value);
			rounds.cleanup(() => {
				expect(get(variable)).to.equal(false);
				set(variable, backup);
				done();
			});
		});
	});

	describe('__private.getOutsiders', () => {
		let getOutsiders;

		before(done => {
			getOutsiders = get('__private.getOutsiders');
			done();
		});

		describe('when scope.block.height = 1', () => {
			const scope = { block: { height: 1 } };

			it('should call a callback', done => {
				getOutsiders(scope, err => {
					expect(err).to.not.exist;
					done();
				});
			});
		});

		describe('when scope.block.height != 1', () => {
			const scope = { block: { height: 2 } };

			describe('when generateDelegateList is successful', () => {
				let modules;

				before(() => {
					// Bind fake modules
					modules = {
						delegates: {
							generateDelegateList(a, b, cb) {
								return cb(null, ['delegate1', 'delegate2', 'delegate3']);
							},
						},
						accounts: {
							generateAddressByPublicKey() {
								return 'delegate';
							},
						},
					};
					return rounds.onBind(modules);
				});

				describe('when all delegates are on list (no outsiders)', () => {
					let initialScope;

					before(done => {
						scope.roundDelegates = ['delegate1', 'delegate2', 'delegate3'];
						scope.roundOutsiders = [];
						initialScope = _.cloneDeep(scope);
						done();
					});

					it('should call a callback', done => {
						getOutsiders(scope, err => {
							expect(err).to.not.exist;
							done();
						});
					});

					it('should not modify scope.roundOutsiders', () => {
						return expect(scope.roundOutsiders).to.deep.equal(
							initialScope.roundOutsiders
						);
					});
				});

				describe('when 1 delegates is not on list (outsider)', () => {
					let initialScope;

					before(done => {
						scope.roundDelegates = ['delegate2', 'delegate3'];
						scope.roundOutsiders = [];
						initialScope = _.cloneDeep(scope);
						done();
					});

					it('should call a callback', done => {
						getOutsiders(scope, err => {
							expect(err).to.not.exist;
							done();
						});
					});

					it('should add 1 outsider scope.roundOutsiders', () => {
						initialScope.roundOutsiders.push('delegate');
						return expect(scope.roundOutsiders).to.deep.equal(
							initialScope.roundOutsiders
						);
					});
				});

				describe('when 2 delegates are not on list (outsiders)', () => {
					let initialScope;

					before(done => {
						scope.roundDelegates = ['delegate3'];
						scope.roundOutsiders = [];
						initialScope = _.cloneDeep(scope);
						done();
					});

					it('should call a callback', done => {
						getOutsiders(scope, err => {
							expect(err).to.not.exist;
							done();
						});
					});

					it('should add 2 outsiders to scope.roundOutsiders', () => {
						initialScope.roundOutsiders.push('delegate');
						initialScope.roundOutsiders.push('delegate');
						return expect(scope.roundOutsiders).to.deep.equal(
							initialScope.roundOutsiders
						);
					});
				});
			});

			describe('when generateDelegateList fails', () => {
				before(() => {
					// Bind fake modules
					const modules = {
						delegates: {
							generateDelegateList(a, b, cb) {
								cb('error');
							},
							clearLastDelegateListCache() {},
						},
					};
					return rounds.onBind(modules);
				});

				it('should call a callback with error', done => {
					getOutsiders(scope, err => {
						expect(err).to.equal('error');
						done();
					});
				});
			});
		});
	});

	describe('__private.sumRound', () => {
		let sumRound;
		let stub;

		beforeEach(done => {
			sumRound = get('__private.sumRound');
			done();
		});

		describe('when last block is genesis block', () => {
			const scope = {
				round: 1,
				block: {
					height: 1,
					totalFee: 123,
					reward: 456,
					generatorPublicKey: 'aaa',
				},
			};

			it('should call a callback', done => {
				sumRound(scope, err => {
					_.cloneDeep(scope);
					expect(err).to.not.exist;
					done();
				});
			});

			it('should set scope.roundFees to 0', () => {
				return expect(scope.roundFees).to.equal(0);
			});

			it('should set scope.roundRewards to 0', () => {
				return expect(scope.roundRewards).to.deep.equal([0]);
			});

			it('should set scope.roundDelegates', () => {
				return expect(scope.roundDelegates).to.deep.equal([
					scope.block.generatorPublicKey,
				]);
			});
		});

		describe('when last block is not genesis block', () => {
			const scope = { round: 1, block: { height: 2 } };

			describe('when summedRound query is successful', () => {
				beforeEach(done => {
					const rows = [
						{
							rewards: [1.001, 2, 3],
							fees: 100.001,
							delegates: ['delegate1', 'delegate2', 'delegate3'],
						},
					];
					stub = sinon.stub(db.rounds, 'summedRound').resolves(rows);
					done();
				});

				afterEach(() => {
					return stub.restore();
				});

				it('should call a callback', done => {
					sumRound(scope, err => {
						_.cloneDeep(scope);
						expect(err).to.not.exist;
						done();
					});
				});

				it('should set scope.roundFees correctly', () => {
					return expect(scope.roundFees).to.equal(100);
				});

				it('should set scope.roundRewards correctly', () => {
					return expect(scope.roundRewards).to.deep.equal([1, 2, 3]);
				});

				it('should set scope.roundDelegates', () => {
					return expect(scope.roundDelegates).to.deep.equal([
						'delegate1',
						'delegate2',
						'delegate3',
					]);
				});
			});

			describe('when summedRound query fails', () => {
				before(done => {
					stub = sinon.stub(db.rounds, 'summedRound').rejects('fail');
					done();
				});

				after(() => {
					return stub.restore();
				});

				it('should call a callback with error = fail', done => {
					sumRound(scope, err => {
						expect(err.name).to.equal('fail');
						done();
					});
				});
			});
		});
	});

	describe('tick', () => {
		let block;
		let roundScope;

		// Init stubs
		const mergeBlockGenerator_stub = sinon.stub().resolves();
		const land_stub = sinon.stub().resolves();
		const sumRound_stub = sinon.stub().callsArg(1);
		const getOutsiders_stub = sinon.stub().callsArg(1);
		let clearRoundSnapshot_stub;
		let performRoundSnapshot_stub;
		let clearVotesSnapshot_stub;
		let performVotesSnapshot_stub;

		function resetStubsHistory() {
			mergeBlockGenerator_stub.resetHistory();
			land_stub.resetHistory();
			sumRound_stub.resetHistory();
			getOutsiders_stub.resetHistory();
		}

		before(() => {
			// Init fake round logic
			function round(__scope) {
				roundScope = __scope;
			}
			round.prototype.mergeBlockGenerator = mergeBlockGenerator_stub;
			round.prototype.land = land_stub;
			Rounds.__set__('Round', round);

			// Set more stubs
			set('__private.sumRound', sumRound_stub);
			return set('__private.getOutsiders', getOutsiders_stub);
		});

		describe('testing branches', () => {
			describe('scope properties', () => {
				after(() => {
					return resetStubsHistory();
				});

				describe('finishRound', () => {
					describe('when block height = 1', () => {
						it('should be set to true', done => {
							block = { height: 1 };
							rounds.tick(block, err => {
								expect(err).to.not.exist;
								expect(roundScope.finishRound).to.be.true;
								done();
							});
						});
					});

					describe('when block height = 101', () => {
						it('should be set to true', done => {
							block = { height: 101 };
							rounds.tick(block, err => {
								expect(err).to.not.exist;
								expect(roundScope.finishRound).to.be.true;
								done();
							});
						});
					});

					describe('when round !== nextRound', () => {
						it('should be set to true', done => {
							block = { height: 202 };
							rounds.tick(block, err => {
								expect(err).to.not.exist;
								expect(roundScope.finishRound).to.be.true;
								done();
							});
						});
					});

					describe('when other height supplied (middle-round)', () => {
						it('should be set to false', done => {
							block = { height: 203 };
							rounds.tick(block, err => {
								expect(err).to.not.exist;
								expect(roundScope.finishRound).to.be.false;
								done();
							});
						});
					});
				});
			});
		});

		describe('scope.finishRound', () => {
			let bus;

			before(() => {
				bus = get('library.bus.message');
				return bus.reset();
			});

			describe('when true', () => {
				before(done => {
					block = { height: 1 };
					rounds.tick(block, err => {
						expect(err).to.not.exist;
						expect(roundScope.finishRound).to.be.true;
						done();
					});
				});

				after(() => {
					resetStubsHistory();
					return bus.reset();
				});

				it('scope.mergeBlockGenerator should be called once', () => {
					return expect(mergeBlockGenerator_stub.calledOnce).to.be.true;
				});

				it('scope.land should be called once', () => {
					return expect(land_stub.calledOnce).to.be.true;
				});

				it('scope.sumRound should be called once', () => {
					return expect(sumRound_stub.calledOnce).to.be.true;
				});

				it('scope.getOutsiders should be called once', () => {
					return expect(getOutsiders_stub.calledOnce).to.be.true;
				});

				it('library.bus.message should be called once with proper params', () => {
					const busMessage = get('library.bus.message');
					expect(busMessage.calledOnce).to.be.true;
					return expect(busMessage.calledWith('finishRound', roundScope.round))
						.to.be.true;
				});
			});

			describe('when false', () => {
				before(done => {
					block = { height: 203 };
					rounds.tick(block, err => {
						expect(err).to.not.exist;
						expect(roundScope.finishRound).to.be.false;
						done();
					});
				});

				after(() => {
					resetStubsHistory();
					return bus.reset();
				});

				it('scope.mergeBlockGenerator should be called once', () => {
					return expect(mergeBlockGenerator_stub.calledOnce).to.be.true;
				});

				it('scope.land should be not called', () => {
					return expect(land_stub.called).to.be.false;
				});

				it('scope.sumRound should be not called', () => {
					return expect(sumRound_stub.called).to.be.false;
				});

				it('scope.getOutsiders should be not called', () => {
					return expect(getOutsiders_stub.called).to.be.false;
				});

				it('library.bus.message should be not called', () => {
					const busMessage = get('library.bus.message');
					return expect(busMessage.called).to.be.false;
				});
			});
		});

		describe('performing round snapshot (queries)', () => {
			function clearStubs() {
				clearRoundSnapshot_stub.restore();
				performRoundSnapshot_stub.restore();
				clearVotesSnapshot_stub.restore();
				performVotesSnapshot_stub.restore();
			}

			describe('when (block.height+1) % ACTIVE_DELEGATES === 0', () => {
				describe('when queries are successful', () => {
					let res;

					before(done => {
						// Init fake round logic
						function round(__scope, __t) {
							roundScope = __scope;

							clearRoundSnapshot_stub = sinon
								.stub(__t.rounds, 'clearRoundSnapshot')
								.resolves();
							performRoundSnapshot_stub = sinon
								.stub(__t.rounds, 'performRoundSnapshot')
								.resolves();
							clearVotesSnapshot_stub = sinon
								.stub(__t.rounds, 'clearVotesSnapshot')
								.resolves();
							performVotesSnapshot_stub = sinon
								.stub(__t.rounds, 'performVotesSnapshot')
								.resolves();
						}
						round.prototype.mergeBlockGenerator = mergeBlockGenerator_stub;
						round.prototype.land = land_stub;
						Rounds.__set__('Round', round);

						block = { height: 100 };
						rounds.tick(block, err => {
							res = err;
							done();
						});
					});

					after(() => {
						return clearStubs();
					});

					it('should result with no error', () => {
						return expect(res).to.not.exist;
					});

					it('clearRoundSnapshot query should be called once', () => {
						return expect(clearRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('performRoundSnapshot query should be called once', () => {
						return expect(performRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('clearVotesSnapshot query should be called once', () => {
						return expect(clearVotesSnapshot_stub.calledOnce).to.be.true;
					});

					it('performVotesSnapshot query should be called once', () => {
						return expect(performVotesSnapshot_stub.calledOnce).to.be.true;
					});
				});

				describe('when clearRoundSnapshot query fails', () => {
					let res;

					before(done => {
						// Init fake round logic
						function round(__scope, __t) {
							roundScope = __scope;

							clearRoundSnapshot_stub = sinon
								.stub(__t.rounds, 'clearRoundSnapshot')
								.rejects('clearRoundSnapshot');
							performRoundSnapshot_stub = sinon
								.stub(__t.rounds, 'performRoundSnapshot')
								.resolves();
							clearVotesSnapshot_stub = sinon
								.stub(__t.rounds, 'clearVotesSnapshot')
								.resolves();
							performVotesSnapshot_stub = sinon
								.stub(__t.rounds, 'performVotesSnapshot')
								.resolves();
						}
						round.prototype.mergeBlockGenerator = mergeBlockGenerator_stub;
						round.prototype.land = land_stub;
						Rounds.__set__('Round', round);

						block = { height: 100 };
						rounds.tick(block, err => {
							res = err;
							done();
						});
					});

					after(() => {
						return clearStubs();
					});

					it('should result with BatchError and first error = fail', () => {
						expect(res.name).to.equal('BatchError');
						return expect(res.first.name).to.equal('clearRoundSnapshot');
					});

					it('clearRoundSnapshot query should be called once', () => {
						return expect(clearRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('performRoundSnapshot query should be called once', () => {
						return expect(performRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('clearVotesSnapshot query should be called once', () => {
						return expect(clearVotesSnapshot_stub.calledOnce).to.be.true;
					});

					it('performVotesSnapshot query should be called once', () => {
						return expect(performVotesSnapshot_stub.calledOnce).to.be.true;
					});
				});

				describe('when performRoundSnapshot query fails', () => {
					let res;

					before(done => {
						// Init fake round logic
						function round(__scope, __t) {
							roundScope = __scope;

							clearRoundSnapshot_stub = sinon
								.stub(__t.rounds, 'clearRoundSnapshot')
								.resolves();
							performRoundSnapshot_stub = sinon
								.stub(__t.rounds, 'performRoundSnapshot')
								.rejects('performRoundSnapshot');
							clearVotesSnapshot_stub = sinon
								.stub(__t.rounds, 'clearVotesSnapshot')
								.resolves();
							performVotesSnapshot_stub = sinon
								.stub(__t.rounds, 'performVotesSnapshot')
								.resolves();
						}
						round.prototype.mergeBlockGenerator = mergeBlockGenerator_stub;
						round.prototype.land = land_stub;
						Rounds.__set__('Round', round);

						block = { height: 100 };
						rounds.tick(block, err => {
							res = err;
							done();
						});
					});

					after(() => {
						return clearStubs();
					});

					it('should result with BatchError and first error = fail', () => {
						expect(res.name).to.equal('BatchError');
						return expect(res.first.name).to.equal('performRoundSnapshot');
					});

					it('clearRoundSnapshot query should be called once', () => {
						return expect(clearRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('performRoundSnapshot query should be called once', () => {
						return expect(performRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('clearVotesSnapshot query should be called once', () => {
						return expect(clearVotesSnapshot_stub.calledOnce).to.be.true;
					});

					it('performVotesSnapshot query should be called once', () => {
						return expect(performVotesSnapshot_stub.calledOnce).to.be.true;
					});
				});

				describe('when clearVotesSnapshot query fails', () => {
					let res;

					before(done => {
						// Init fake round logic
						function round(__scope, __t) {
							roundScope = __scope;

							clearRoundSnapshot_stub = sinon
								.stub(__t.rounds, 'clearRoundSnapshot')
								.resolves();
							performRoundSnapshot_stub = sinon
								.stub(__t.rounds, 'performRoundSnapshot')
								.resolves();
							clearVotesSnapshot_stub = sinon
								.stub(__t.rounds, 'clearVotesSnapshot')
								.rejects('clearVotesSnapshot');
							performVotesSnapshot_stub = sinon
								.stub(__t.rounds, 'performVotesSnapshot')
								.resolves();
						}
						round.prototype.mergeBlockGenerator = mergeBlockGenerator_stub;
						round.prototype.land = land_stub;
						Rounds.__set__('Round', round);

						block = { height: 100 };
						rounds.tick(block, err => {
							res = err;
							done();
						});
					});

					after(() => {
						return clearStubs();
					});

					it('should result with BatchError and first error = fail', () => {
						expect(res.name).to.equal('BatchError');
						return expect(res.first.name).to.equal('clearVotesSnapshot');
					});

					it('clearRoundSnapshot query should be called once', () => {
						return expect(clearRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('performRoundSnapshot query should be called once', () => {
						return expect(performRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('clearVotesSnapshot query should be called once', () => {
						return expect(clearVotesSnapshot_stub.calledOnce).to.be.true;
					});

					it('performVotesSnapshot query should be called once', () => {
						return expect(performVotesSnapshot_stub.calledOnce).to.be.true;
					});
				});

				describe('when performVotesSnapshot query fails', () => {
					let res;

					before(done => {
						// Init fake round logic
						function round(__scope, __t) {
							roundScope = __scope;

							clearRoundSnapshot_stub = sinon
								.stub(__t.rounds, 'clearRoundSnapshot')
								.resolves();
							performRoundSnapshot_stub = sinon
								.stub(__t.rounds, 'performRoundSnapshot')
								.resolves();
							clearVotesSnapshot_stub = sinon
								.stub(__t.rounds, 'clearVotesSnapshot')
								.resolves();
							performVotesSnapshot_stub = sinon
								.stub(__t.rounds, 'performVotesSnapshot')
								.rejects('performVotesSnapshot');
						}
						round.prototype.mergeBlockGenerator = mergeBlockGenerator_stub;
						round.prototype.land = land_stub;
						Rounds.__set__('Round', round);

						block = { height: 100 };
						rounds.tick(block, err => {
							res = err;
							done();
						});
					});

					after(() => {
						return clearStubs();
					});

					it('should result with BatchError and first error = fail', () => {
						expect(res.name).to.equal('BatchError');
						return expect(res.first.name).to.equal('performVotesSnapshot');
					});

					it('clearRoundSnapshot query should be called once', () => {
						return expect(clearRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('performRoundSnapshot query should be called once', () => {
						return expect(performRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('clearVotesSnapshot query should be called once', () => {
						return expect(clearVotesSnapshot_stub.calledOnce).to.be.true;
					});

					it('performVotesSnapshot query should be called once', () => {
						return expect(performVotesSnapshot_stub.calledOnce).to.be.true;
					});
				});
			});

			describe('when (block.height+1) % ACTIVE_DELEGATES !== 0', () => {
				before(done => {
					block = { height: 101 };
					rounds.tick(block, err => {
						expect(err).to.not.exist;
						done();
					});
				});

				after(() => {
					return resetStubsHistory();
				});

				it('clearRoundSnapshot query should be not called', () => {
					return expect(clearRoundSnapshot_stub.calledOnce).to.be.false;
				});

				it('performRoundSnapshot query should be not called', () => {
					return expect(performRoundSnapshot_stub.calledOnce).to.be.false;
				});

				it('clearVotesSnapshot query should be not called', () => {
					return expect(clearVotesSnapshot_stub.calledOnce).to.be.false;
				});

				it('performVotesSnapshot query should be not called', () => {
					return expect(performVotesSnapshot_stub.calledOnce).to.be.false;
				});
			});
		});
	});

	describe('backwardTick', () => {
		let block;
		let previousBlock;
		let roundScope;

		// Init stubs
		const mergeBlockGenerator_stub = sinon.stub().resolves();
		const backwardLand_stub = sinon.stub().resolves();
		const sumRound_stub = sinon.stub().callsArg(1);
		const getOutsiders_stub = sinon.stub().callsArg(1);

		function resetStubsHistory() {
			mergeBlockGenerator_stub.resetHistory();
			backwardLand_stub.resetHistory();
			sumRound_stub.resetHistory();
			getOutsiders_stub.resetHistory();
		}

		before(() => {
			// Init fake round logic
			function round(__scope) {
				roundScope = __scope;
			}
			round.prototype.mergeBlockGenerator = mergeBlockGenerator_stub;
			round.prototype.backwardLand = backwardLand_stub;
			Rounds.__set__('Round', round);

			// Set more stubs
			set('__private.sumRound', sumRound_stub);
			return set('__private.getOutsiders', getOutsiders_stub);
		});

		describe('testing branches', () => {
			describe('scope properties', () => {
				after(() => {
					return resetStubsHistory();
				});

				describe('finishRound', () => {
					describe('when block height = 1', () => {
						it('should be set to true', done => {
							block = { height: 1 };
							previousBlock = { height: 1 };
							rounds.backwardTick(
								block,
								previousBlock,
								err => {
									expect(err).to.not.exist;
									expect(roundScope.finishRound).to.be.true;
									done();
								},
								db
							);
						});
					});

					describe('when block height = 101', () => {
						it('should be set to true', done => {
							block = { height: 101 };
							previousBlock = { height: 1 };
							rounds.backwardTick(
								block,
								previousBlock,
								err => {
									expect(err).to.not.exist;
									expect(roundScope.finishRound).to.be.true;
									done();
								},
								db
							);
						});
					});

					describe('prevRound === round && nextRound !== round', () => {
						it('should be set to true', done => {
							block = { height: 202 };
							previousBlock = { height: 202 };
							rounds.backwardTick(
								block,
								previousBlock,
								err => {
									expect(err).to.not.exist;
									expect(roundScope.finishRound).to.be.true;
									done();
								},
								db
							);
						});
					});

					describe('when other height supplied (middle-round)', () => {
						it('should be set to false', done => {
							block = { height: 203 };
							previousBlock = { height: 203 };
							rounds.backwardTick(
								block,
								previousBlock,
								err => {
									expect(err).to.not.exist;
									expect(roundScope.finishRound).to.be.false;
									done();
								},
								db
							);
						});
					});
				});
			});
		});

		describe('scope.finishRound', () => {
			describe('when true', () => {
				before(done => {
					block = { height: 1 };
					previousBlock = { height: 1 };
					rounds.backwardTick(
						block,
						previousBlock,
						err => {
							expect(err).to.not.exist;
							expect(roundScope.finishRound).to.be.true;
							done();
						},
						db
					);
				});

				after(() => {
					return resetStubsHistory();
				});

				it('scope.mergeBlockGenerator should be called once', () => {
					return expect(mergeBlockGenerator_stub.calledOnce).to.be.true;
				});

				it('scope.backwardLand should be called once', () => {
					return expect(backwardLand_stub.calledOnce).to.be.true;
				});

				it('scope.sumRound should be called once', () => {
					return expect(sumRound_stub.calledOnce).to.be.true;
				});

				it('scope.getOutsiders should be called once', () => {
					return expect(getOutsiders_stub.calledOnce).to.be.true;
				});
			});

			describe('when false', () => {
				before(done => {
					block = { height: 5 };
					previousBlock = { height: 5 };
					rounds.backwardTick(
						block,
						previousBlock,
						err => {
							expect(err).to.not.exist;
							expect(roundScope.finishRound).to.be.false;
							done();
						},
						db
					);
				});

				after(() => {
					return resetStubsHistory();
				});

				it('scope.mergeBlockGenerator should be called once', () => {
					return expect(mergeBlockGenerator_stub.calledOnce).to.be.true;
				});

				it('scope.backwardLand should be not called', () => {
					return expect(backwardLand_stub.called).to.be.false;
				});

				it('scope.sumRound should be not called', () => {
					return expect(sumRound_stub.called).to.be.false;
				});

				it('scope.getOutsiders should be not called', () => {
					return expect(getOutsiders_stub.called).to.be.false;
				});
			});
		});
	});
});
