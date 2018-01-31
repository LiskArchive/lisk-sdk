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
var rewire = require('rewire');

// Instantiate test subject
var Rounds = rewire('../../../modules/rounds.js');

var sinon = sinonSandbox;
var Round = rewire('../../../logic/round.js'); // eslint-disable-line no-unused-vars
var DBSandbox = require('../../common/db_sandbox').DBSandbox;

describe('rounds', () => {
	var db;
	var dbSandbox;
	var rounds;
	var validScope;

	// Init fake logger
	var logger = {
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
				logger: logger,
				db: db,
				bus: { message: sinon.spy() },
				network: { io: { sockets: { emit: sinon.spy() } } },
				config: { loading: { snapshot: false } },
			};
			done();
		});
	});

	describe('constructor', () => {
		var scope;

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
			expect(rounds).to.be.instanceof(Rounds);
		});

		it('should set library to scope', () => {
			expect(get('library')).to.deep.equal(validScope);
		});

		it('should set self object', () => {
			var self = Rounds.__get__('self');
			expect(self).to.deep.equal(rounds);
		});
	});

	describe('loaded', () => {
		it('should return __private.loaded', () => {
			var variable = '__private.loaded';
			var backup = get(variable);
			var value = 'abc';
			set(variable, value);
			expect(get(variable)).to.equal(value);
			set(variable, backup);
		});
	});

	describe('ticking', () => {
		it('should return __private.ticking', () => {
			var variable = '__private.ticking';
			var backup = get(variable);
			var value = 'abc';
			set(variable, value);
			expect(get(variable)).to.equal(value);
			set(variable, backup);
		});
	});

	describe('flush', () => {
		var stub;
		var error;

		before(() => {
			stub = sinon.stub(db.rounds, 'flush');
			stub.withArgs(true).resolves('success');
			stub.withArgs(false).rejects('fail');
		});

		after(() => {
			stub.restore();
		});

		describe('when flush query is successful', () => {
			before(done => {
				rounds.flush(true, err => {
					error = err;
					done();
				});
			});

			after(() => {
				stub.resetHistory();
			});

			it('should call a callback when no error', () => {
				expect(error).to.not.exist;
			});

			it('flush query should be called once', () => {
				expect(stub.calledOnce).to.be.true;
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
				stub.resetHistory();
			});

			it('should call a callback with error = Rounds#flush error', () => {
				expect(error).to.equal('Rounds#flush error');
			});

			it('flush query should be called once', () => {
				expect(stub.calledOnce).to.be.true;
			});
		});
	});

	describe('setSnapshotRound', () => {
		it('should set library.config.loading.snapshot', () => {
			var variable = 'library.config.loading.snapshot';
			var backup = get(variable);
			var value = 'abc';
			rounds.setSnapshotRound(value);
			expect(get(variable)).to.equal(value);
			set(variable, backup);
		});
	});

	describe('onBind', () => {
		it('should set modules', () => {
			var variable = 'modules';
			var backup = get(variable);
			var value = {
				blocks: 'blocks',
				accounts: 'accounts',
				delegates: 'delegates',
			};
			rounds.onBind(value);
			expect(get(variable)).to.deep.equal(value);
			set(variable, backup);
		});
	});

	describe('onBlockchainReady', () => {
		it('should set __private.loaded = true', () => {
			var variable = '__private.loaded ';
			var backup = get(variable);
			var value = false;
			set(variable, value);
			rounds.onBlockchainReady();
			expect(get(variable)).to.equal(true);
			set(variable, backup);
		});
	});

	describe('onFinishRound', () => {
		it('should call library.network.io.sockets.emit once, with proper params', () => {
			var round = 123;
			rounds.onFinishRound(round);

			expect(validScope.network.io.sockets.emit.calledOnce).to.be.true;
			expect(
				validScope.network.io.sockets.emit.calledWith('rounds/change', {
					number: round,
				})
			).to.be.true;
			validScope.network.io.sockets.emit.reset();
		});
	});

	describe('cleanup', () => {
		it('should set __private.loaded = false and call a callback', done => {
			var variable = '__private.loaded ';
			var backup = get(variable);
			var value = true;
			set(variable, value);
			rounds.cleanup(() => {
				expect(get(variable)).to.equal(false);
				set(variable, backup);
				done();
			});
		});
	});

	describe('__private.getOutsiders', () => {
		var getOutsiders;

		before(() => {
			getOutsiders = get('__private.getOutsiders');
		});

		describe('when scope.block.height = 1', () => {
			var scope = { block: { height: 1 } };

			it('should call a callback', done => {
				getOutsiders(scope, err => {
					expect(err).to.not.exist;
					done();
				});
			});
		});

		describe('when scope.block.height != 1', () => {
			var scope = { block: { height: 2 } };

			describe('when generateDelegateList is successful', () => {
				var modules;

				before(() => {
					// Bind fake modules
					modules = {
						delegates: {
							generateDelegateList: function(a, b, cb) {
								return cb(null, ['delegate1', 'delegate2', 'delegate3']);
							},
						},
						accounts: {
							generateAddressByPublicKey: function() {
								return 'delegate';
							},
						},
					};
					rounds.onBind(modules);
				});

				describe('when all delegates are on list (no outsiders)', () => {
					var initialScope;

					before(() => {
						scope.roundDelegates = ['delegate1', 'delegate2', 'delegate3'];
						scope.roundOutsiders = [];
						initialScope = _.cloneDeep(scope);
					});

					it('should call a callback', done => {
						getOutsiders(scope, err => {
							expect(err).to.not.exist;
							done();
						});
					});

					it('should not modify scope.roundOutsiders', () => {
						expect(scope.roundOutsiders).to.deep.equal(
							initialScope.roundOutsiders
						);
					});
				});

				describe('when 1 delegates is not on list (outsider)', () => {
					var initialScope;

					before(() => {
						scope.roundDelegates = ['delegate2', 'delegate3'];
						scope.roundOutsiders = [];
						initialScope = _.cloneDeep(scope);
					});

					it('should call a callback', done => {
						getOutsiders(scope, err => {
							expect(err).to.not.exist;
							done();
						});
					});

					it('should add 1 outsider scope.roundOutsiders', () => {
						initialScope.roundOutsiders.push('delegate');
						expect(scope.roundOutsiders).to.deep.equal(
							initialScope.roundOutsiders
						);
					});
				});

				describe('when 2 delegates are not on list (outsiders)', () => {
					var initialScope;

					before(() => {
						scope.roundDelegates = ['delegate3'];
						scope.roundOutsiders = [];
						initialScope = _.cloneDeep(scope);
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
						expect(scope.roundOutsiders).to.deep.equal(
							initialScope.roundOutsiders
						);
					});
				});
			});

			describe('when generateDelegateList fails', () => {
				before(() => {
					// Bind fake modules
					var modules = {
						delegates: {
							generateDelegateList: function(a, b, cb) {
								cb('error');
							},
						},
					};
					rounds.onBind(modules);
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
		var sumRound;
		var stub;
		var scope = { round: 1 };

		before(() => {
			sumRound = get('__private.sumRound');
		});

		describe('when summedRound query is successful', () => {
			before(() => {
				var rows = [
					{
						rewards: [1.001, 2, 3],
						fees: 100.001,
						delegates: ['delegate1', 'delegate2', 'delegate3'],
					},
				];
				stub = sinon.stub(db.rounds, 'summedRound').resolves(rows);
			});

			after(() => {
				stub.restore();
			});

			it('should call a callback', done => {
				sumRound(scope, err => {
					_.cloneDeep(scope);
					expect(err).to.not.exist;
					done();
				});
			});

			it('should set scope.roundFees correctly', () => {
				expect(scope.roundFees).to.equal(100);
			});

			it('should set scope.roundRewards correctly', () => {
				expect(scope.roundRewards).to.deep.equal([1, 2, 3]);
			});

			it('should set scope.roundDelegates', () => {
				expect(scope.roundDelegates).to.deep.equal([
					'delegate1',
					'delegate2',
					'delegate3',
				]);
			});
		});

		describe('when summedRound query fails', () => {
			before(() => {
				stub = sinon.stub(db.rounds, 'summedRound').rejects('fail');
			});

			after(() => {
				stub.restore();
			});

			it('should call a callback with error = fail', done => {
				sumRound(scope, err => {
					expect(err.name).to.equal('fail');
					done();
				});
			});
		});
	});

	describe('tick', () => {
		var block;
		var roundScope;

		// Init stubs
		var mergeBlockGenerator_stub = sinon.stub().resolves();
		var land_stub = sinon.stub().resolves();
		var truncateBlocks_stub = sinon.stub().resolves();
		var sumRound_stub = sinon.stub().callsArg(1);
		var getOutsiders_stub = sinon.stub().callsArg(1);
		var clearRoundSnapshot_stub;
		var performRoundSnapshot_stub;
		var clearVotesSnapshot_stub;
		var performVotesSnapshot_stub;

		function resetStubsHistory() {
			mergeBlockGenerator_stub.resetHistory();
			land_stub.resetHistory();
			truncateBlocks_stub.resetHistory();
			sumRound_stub.resetHistory();
			getOutsiders_stub.resetHistory();
		}

		before(() => {
			// Init fake round logic
			function Round(__scope) {
				roundScope = __scope;
			}
			Round.prototype.mergeBlockGenerator = mergeBlockGenerator_stub;
			Round.prototype.land = land_stub;
			Round.prototype.truncateBlocks = truncateBlocks_stub;
			Rounds.__set__('Round', Round);

			// Set more stubs
			set('__private.sumRound', sumRound_stub);
			set('__private.getOutsiders', getOutsiders_stub);
		});

		describe('testing branches', () => {
			describe('scope properties', () => {
				after(() => {
					resetStubsHistory();
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

				describe('snapshotRound', () => {
					describe('when library.config.loading.snapshot = 0', () => {
						it('should be set to true', done => {
							var variable = 'library.config.loading.snapshot';
							var backup = get(variable);
							var value = 0;
							set(variable, value);
							block = { height: 1 };

							rounds.tick(block, err => {
								expect(err).to.not.exist;
								expect(roundScope.snapshotRound).to.be.false;
								set(variable, backup);
								done();
							});
						});
					});

					describe('when library.config.loading.snapshot > 0', () => {
						describe('when library.config.loading.snapshot === round', () => {
							it('should be set to true', done => {
								var variable = 'library.config.loading.snapshot';
								var backup = get(variable);
								var value = 1;
								set(variable, value);
								block = { height: 1 };

								rounds.tick(block, err => {
									expect(err).to.equal('Snapshot finished');
									expect(roundScope.snapshotRound).to.be.true;
									set(variable, backup);
									done();
								});
							});
						});

						describe('when library.config.loading.snapshot !== round', () => {
							it('should be set to false', done => {
								var variable = 'library.config.loading.snapshot';
								var backup = get(variable);
								var value = 1;
								set(variable, value);
								block = { height: 202 };

								rounds.tick(block, err => {
									expect(err).to.not.exist;
									expect(roundScope.snapshotRound).to.be.false;
									set(variable, backup);
									done();
								});
							});
						});
					});
				});
			});
		});

		describe('scope.finishRound', () => {
			var bus;

			before(() => {
				bus = get('library.bus.message');
				bus.reset();
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
					bus.reset();
				});

				it('scope.mergeBlockGenerator should be called once', () => {
					expect(mergeBlockGenerator_stub.calledOnce).to.be.true;
				});

				it('scope.land should be called once', () => {
					expect(land_stub.calledOnce).to.be.true;
				});

				it('scope.sumRound should be called once', () => {
					expect(sumRound_stub.calledOnce).to.be.true;
				});

				it('scope.getOutsiders should be called once', () => {
					expect(getOutsiders_stub.calledOnce).to.be.true;
				});

				it('library.bus.message should be called once with proper params', () => {
					var bus = get('library.bus.message');
					expect(bus.calledOnce).to.be.true;
					expect(bus.calledWith('finishRound', roundScope.round)).to.be.true;
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
					bus.reset();
				});

				it('scope.mergeBlockGenerator should be called once', () => {
					expect(mergeBlockGenerator_stub.calledOnce).to.be.true;
				});

				it('scope.land should be not called', () => {
					expect(land_stub.called).to.be.false;
				});

				it('scope.sumRound should be not called', () => {
					expect(sumRound_stub.called).to.be.false;
				});

				it('scope.getOutsiders should be not called', () => {
					expect(getOutsiders_stub.called).to.be.false;
				});

				it('library.bus.message should be not called', () => {
					var bus = get('library.bus.message');
					expect(bus.called).to.be.false;
				});
			});
		});

		describe('scope.snapshotRound', () => {
			describe('when true', () => {
				var res;

				before(done => {
					var variable = 'library.config.loading.snapshot';
					var backup = get(variable);
					var value = 1;
					set(variable, value);
					block = { height: 1 };

					rounds.tick(block, err => {
						res = err;
						set(variable, backup);
						done();
					});
				});

				after(() => {
					resetStubsHistory();
				});

				it('should return with error = Snapshot finished', () => {
					expect(res).to.equal('Snapshot finished');
				});

				it('should set scope.finishSnapshot to true', () => {
					expect(roundScope.finishSnapshot).to.be.true;
				});

				it('scope.truncateBlocks should be called once', () => {
					expect(truncateBlocks_stub.calledOnce).to.be.true;
				});
			});

			describe('when false', () => {
				var res;

				before(done => {
					var variable = 'library.config.loading.snapshot';
					var backup = get(variable);
					var value = 0;
					set(variable, value);
					block = { height: 1 };

					rounds.tick(block, err => {
						res = err;
						set(variable, backup);
						done();
					});
				});

				after(() => {
					resetStubsHistory();
				});

				it('should return with no error', () => {
					expect(res).to.not.exist;
				});

				it('should not set scope.finishSnapshot', () => {
					expect(roundScope.finishSnapshot).to.equal(undefined);
				});

				it('scope.truncateBlocks should not be called', () => {
					expect(truncateBlocks_stub.called).to.be.false;
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

			describe('when (block.height+1) % slots.delegates === 0', () => {
				describe('when queries are successful', () => {
					var res;

					before(done => {
						// Init fake round logic
						function Round(__scope, __t) {
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
						Round.prototype.mergeBlockGenerator = mergeBlockGenerator_stub;
						Round.prototype.land = land_stub;
						Round.prototype.truncateBlocks = truncateBlocks_stub;
						Rounds.__set__('Round', Round);

						block = { height: 100 };
						rounds.tick(block, err => {
							res = err;
							done();
						});
					});

					after(() => {
						clearStubs();
					});

					it('should result with no error', () => {
						expect(res).to.not.exist;
					});

					it('clearRoundSnapshot query should be called once', () => {
						expect(clearRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('performRoundSnapshot query should be called once', () => {
						expect(performRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('clearVotesSnapshot query should be called once', () => {
						expect(clearVotesSnapshot_stub.calledOnce).to.be.true;
					});

					it('performVotesSnapshot query should be called once', () => {
						expect(performVotesSnapshot_stub.calledOnce).to.be.true;
					});
				});

				describe('when clearRoundSnapshot query fails', () => {
					var res;

					before(done => {
						// Init fake round logic
						function Round(__scope, __t) {
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
						Round.prototype.mergeBlockGenerator = mergeBlockGenerator_stub;
						Round.prototype.land = land_stub;
						Round.prototype.truncateBlocks = truncateBlocks_stub;
						Rounds.__set__('Round', Round);

						block = { height: 100 };
						rounds.tick(block, err => {
							res = err;
							done();
						});
					});

					after(() => {
						clearStubs();
					});

					it('should result with BatchError and first error = fail', () => {
						expect(res.name).to.equal('BatchError');
						expect(res.first.name).to.equal('clearRoundSnapshot');
					});

					it('clearRoundSnapshot query should be called once', () => {
						expect(clearRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('performRoundSnapshot query should be called once', () => {
						expect(performRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('clearVotesSnapshot query should be called once', () => {
						expect(clearVotesSnapshot_stub.calledOnce).to.be.true;
					});

					it('performVotesSnapshot query should be called once', () => {
						expect(performVotesSnapshot_stub.calledOnce).to.be.true;
					});
				});

				describe('when performRoundSnapshot query fails', () => {
					var res;

					before(done => {
						// Init fake round logic
						function Round(__scope, __t) {
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
						Round.prototype.mergeBlockGenerator = mergeBlockGenerator_stub;
						Round.prototype.land = land_stub;
						Round.prototype.truncateBlocks = truncateBlocks_stub;
						Rounds.__set__('Round', Round);

						block = { height: 100 };
						rounds.tick(block, err => {
							res = err;
							done();
						});
					});

					after(() => {
						clearStubs();
					});

					it('should result with BatchError and first error = fail', () => {
						expect(res.name).to.equal('BatchError');
						expect(res.first.name).to.equal('performRoundSnapshot');
					});

					it('clearRoundSnapshot query should be called once', () => {
						expect(clearRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('performRoundSnapshot query should be called once', () => {
						expect(performRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('clearVotesSnapshot query should be called once', () => {
						expect(clearVotesSnapshot_stub.calledOnce).to.be.true;
					});

					it('performVotesSnapshot query should be called once', () => {
						expect(performVotesSnapshot_stub.calledOnce).to.be.true;
					});
				});

				describe('when clearVotesSnapshot query fails', () => {
					var res;

					before(done => {
						// Init fake round logic
						function Round(__scope, __t) {
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
						Round.prototype.mergeBlockGenerator = mergeBlockGenerator_stub;
						Round.prototype.land = land_stub;
						Round.prototype.truncateBlocks = truncateBlocks_stub;
						Rounds.__set__('Round', Round);

						block = { height: 100 };
						rounds.tick(block, err => {
							res = err;
							done();
						});
					});

					after(() => {
						clearStubs();
					});

					it('should result with BatchError and first error = fail', () => {
						expect(res.name).to.equal('BatchError');
						expect(res.first.name).to.equal('clearVotesSnapshot');
					});

					it('clearRoundSnapshot query should be called once', () => {
						expect(clearRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('performRoundSnapshot query should be called once', () => {
						expect(performRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('clearVotesSnapshot query should be called once', () => {
						expect(clearVotesSnapshot_stub.calledOnce).to.be.true;
					});

					it('performVotesSnapshot query should be called once', () => {
						expect(performVotesSnapshot_stub.calledOnce).to.be.true;
					});
				});

				describe('when performVotesSnapshot query fails', () => {
					var res;

					before(done => {
						// Init fake round logic
						function Round(__scope, __t) {
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
						Round.prototype.mergeBlockGenerator = mergeBlockGenerator_stub;
						Round.prototype.land = land_stub;
						Round.prototype.truncateBlocks = truncateBlocks_stub;
						Rounds.__set__('Round', Round);

						block = { height: 100 };
						rounds.tick(block, err => {
							res = err;
							done();
						});
					});

					after(() => {
						clearStubs();
					});

					it('should result with BatchError and first error = fail', () => {
						expect(res.name).to.equal('BatchError');
						expect(res.first.name).to.equal('performVotesSnapshot');
					});

					it('clearRoundSnapshot query should be called once', () => {
						expect(clearRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('performRoundSnapshot query should be called once', () => {
						expect(performRoundSnapshot_stub.calledOnce).to.be.true;
					});

					it('clearVotesSnapshot query should be called once', () => {
						expect(clearVotesSnapshot_stub.calledOnce).to.be.true;
					});

					it('performVotesSnapshot query should be called once', () => {
						expect(performVotesSnapshot_stub.calledOnce).to.be.true;
					});
				});
			});

			describe('when (block.height+1) % slots.delegates !== 0', () => {
				before(done => {
					block = { height: 101 };
					rounds.tick(block, err => {
						expect(err).to.not.exist;
						done();
					});
				});

				after(() => {
					resetStubsHistory();
				});

				it('clearRoundSnapshot query should be not called', () => {
					expect(clearRoundSnapshot_stub.calledOnce).to.be.false;
				});

				it('performRoundSnapshot query should be not called', () => {
					expect(performRoundSnapshot_stub.calledOnce).to.be.false;
				});

				it('clearVotesSnapshot query should be not called', () => {
					expect(clearVotesSnapshot_stub.calledOnce).to.be.false;
				});

				it('performVotesSnapshot query should be not called', () => {
					expect(performVotesSnapshot_stub.calledOnce).to.be.false;
				});
			});
		});
	});

	describe('backwardTick', () => {
		var block;
		var previousBlock;
		var roundScope;

		// Init stubs
		var mergeBlockGenerator_stub = sinon.stub().resolves();
		var backwardLand_stub = sinon.stub().resolves();
		var markBlockId_stub = sinon.stub().resolves();
		var sumRound_stub = sinon.stub().callsArg(1);
		var getOutsiders_stub = sinon.stub().callsArg(1);

		function resetStubsHistory() {
			mergeBlockGenerator_stub.resetHistory();
			backwardLand_stub.resetHistory();
			markBlockId_stub.resetHistory();
			sumRound_stub.resetHistory();
			getOutsiders_stub.resetHistory();
		}

		before(() => {
			// Init fake round logic
			function Round(__scope) {
				roundScope = __scope;
			}
			Round.prototype.mergeBlockGenerator = mergeBlockGenerator_stub;
			Round.prototype.backwardLand = backwardLand_stub;
			Round.prototype.markBlockId = markBlockId_stub;
			Rounds.__set__('Round', Round);

			// Set more stubs
			set('__private.sumRound', sumRound_stub);
			set('__private.getOutsiders', getOutsiders_stub);
		});

		describe('testing branches', () => {
			describe('scope properties', () => {
				after(() => {
					resetStubsHistory();
				});

				describe('finishRound', () => {
					describe('when block height = 1', () => {
						it('should be set to true', done => {
							block = { height: 1 };
							previousBlock = { height: 1 };
							rounds.backwardTick(block, previousBlock, err => {
								expect(err).to.not.exist;
								expect(roundScope.finishRound).to.be.true;
								done();
							});
						});
					});

					describe('when block height = 101', () => {
						it('should be set to true', done => {
							block = { height: 101 };
							previousBlock = { height: 1 };
							rounds.backwardTick(block, previousBlock, err => {
								expect(err).to.not.exist;
								expect(roundScope.finishRound).to.be.true;
								done();
							});
						});
					});

					describe('prevRound === round && nextRound !== round', () => {
						it('should be set to true', done => {
							block = { height: 202 };
							previousBlock = { height: 202 };
							rounds.backwardTick(block, previousBlock, err => {
								expect(err).to.not.exist;
								expect(roundScope.finishRound).to.be.true;
								done();
							});
						});
					});

					describe('when other height supplied (middle-round)', () => {
						it('should be set to false', done => {
							block = { height: 203 };
							previousBlock = { height: 203 };
							rounds.backwardTick(block, previousBlock, err => {
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
			describe('when true', () => {
				before(done => {
					block = { height: 1 };
					previousBlock = { height: 1 };
					rounds.backwardTick(block, previousBlock, err => {
						expect(err).to.not.exist;
						expect(roundScope.finishRound).to.be.true;
						done();
					});
				});

				after(() => {
					resetStubsHistory();
				});

				it('scope.mergeBlockGenerator should be called once', () => {
					expect(mergeBlockGenerator_stub.calledOnce).to.be.true;
				});

				it('scope.backwardLand should be called once', () => {
					expect(backwardLand_stub.calledOnce).to.be.true;
				});

				it('scope.markBlockId should be called once', () => {
					expect(markBlockId_stub.calledOnce).to.be.true;
				});

				it('scope.sumRound should be called once', () => {
					expect(sumRound_stub.calledOnce).to.be.true;
				});

				it('scope.getOutsiders should be called once', () => {
					expect(getOutsiders_stub.calledOnce).to.be.true;
				});
			});

			describe('when false', () => {
				before(done => {
					block = { height: 5 };
					previousBlock = { height: 5 };
					rounds.backwardTick(block, previousBlock, err => {
						expect(err).to.not.exist;
						expect(roundScope.finishRound).to.be.false;
						done();
					});
				});

				after(() => {
					resetStubsHistory();
				});

				it('scope.mergeBlockGenerator should be called once', () => {
					expect(mergeBlockGenerator_stub.calledOnce).to.be.true;
				});

				it('scope.backwardLand should be not called', () => {
					expect(backwardLand_stub.called).to.be.false;
				});

				it('scope.markBlockId should be called once', () => {
					expect(markBlockId_stub.calledOnce).to.be.true;
				});

				it('scope.sumRound should be not called', () => {
					expect(sumRound_stub.called).to.be.false;
				});

				it('scope.getOutsiders should be not called', () => {
					expect(getOutsiders_stub.called).to.be.false;
				});
			});
		});
	});
});
