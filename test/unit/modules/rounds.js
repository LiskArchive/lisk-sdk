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
var Promise = require('bluebird');

// Instantiate test subject
var Rounds = rewire('../../../modules/rounds.js');

var sinon = sinonSandbox;
var Round = rewire('../../../logic/round.js');
var DBSandbox = require('../../common/DBSandbox').DBSandbox;

describe('rounds', function () {
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
		error: sinon.spy()
	};

	function get (variable) {
		return Rounds.__get__(variable);
	};

	function set (variable, value) {
		return Rounds.__set__(variable, value);
	};

	before(function (done) {
		dbSandbox = new DBSandbox(__testContext.config.db, 'rounds_module');
		dbSandbox.create(function (err, __db) {
			db = __db;

			validScope = {
				logger: logger,
				db: db,
				bus: {message: sinon.spy()},
				network: {io: {sockets: {emit: sinon.spy()}}},
				config: {loading: {snapshot: false}}
			};
			done();
		});
	});

	describe('constructor', function () {
		var scope;

		before(function (done) {
			scope = _.cloneDeep(validScope);
			new Rounds(function (err, __instance) {
				rounds = __instance;
				// Overwrite database with reference from rounds module,
				// needed for redefine properties without getting that every time
				db = get('library.db');
				done();
			}, _.cloneDeep(scope));
		});

		it('should return Rounds instance', function () {
			expect(rounds).to.be.instanceof(Rounds);
		});

		it('should set library to scope', function () {
			expect(get('library')).to.deep.equal(validScope);
		});

		it('should set self object', function () {
			var self = Rounds.__get__('self');
			expect(self).to.deep.equal(rounds);
		});
	});

	describe('loaded', function () {

		it('should return __private.loaded', function () {
			var variable = '__private.loaded';
			var backup = get(variable);
			var value = 'abc';
			set(variable, value);
			expect(get(variable)).to.equal(value);
			set(variable, backup);
		});
	});

	describe('ticking', function () {

		it('should return __private.ticking', function () {
			var variable = '__private.ticking';
			var backup = get(variable);
			var value = 'abc';
			set(variable, value);
			expect(get(variable)).to.equal(value);
			set(variable, backup);
		});
	});

	describe('flush', function () {
		var stub;
		var error;

		before(function () {
			stub = sinon.stub(db.rounds, 'flush');
			stub.withArgs(true).resolves('success');
			stub.withArgs(false).rejects('fail');
		});

		after(function () {
			stub.restore();
		});

		describe('when flush query succeed', function () {

			before(function (done) {
				rounds.flush(true, function (err) {
					error = err;
					done();
				});
			});

			after(function () {
				stub.resetHistory();
			});

			it('should call a callback when no error', function () {
				expect(error).to.not.exist;
			});

			it('flush query should be called once', function () {
				expect(stub.calledOnce).to.be.true;
			});
		});

		describe('when flush query fails', function () {

			before(function (done) {
				rounds.flush(false, function (err) {
					error = err;
					done();
				});
			});

			after(function () {
				stub.resetHistory();
			});

			it('should call a callback with error = Rounds#flush error', function () {
				expect(error).to.equal('Rounds#flush error');
			});

			it('flush query should be called once', function () {
				expect(stub.calledOnce).to.be.true;
			});
		});
	});

	describe('setSnapshotRound', function () {

		it('should set library.config.loading.snapshot', function () {
			var variable = 'library.config.loading.snapshot';
			var backup = get(variable);
			var value = 'abc';
			rounds.setSnapshotRound(value);
			expect(get(variable)).to.equal(value);
			set(variable, backup);
		});
	});

	describe('onBind', function () {

		it('should set modules', function () {
			var variable = 'modules';
			var backup = get(variable);
			var value = {
				blocks: 'blocks',
				accounts: 'accounts',
				delegates: 'delegates'
			};
			rounds.onBind(value);
			expect(get(variable)).to.deep.equal(value);
			set(variable, backup);
		});
	});

	describe('onBlockchainReady', function () {

		it('should set __private.loaded = true', function () {
			var variable = '__private.loaded ';
			var backup = get(variable);
			var value = false;
			set(variable, value);
			rounds.onBlockchainReady();
			expect(get(variable)).to.equal(true);
			set(variable, backup);
		});
	});

	describe('onFinishRound', function () {

		it('should call library.network.io.sockets.emit once, with proper params', function () {
			var round = 123;
			rounds.onFinishRound(round);

			expect(validScope.network.io.sockets.emit.calledOnce).to.be.true;
			expect(validScope.network.io.sockets.emit.calledWith('rounds/change', {number: round})).to.be.true;
			validScope.network.io.sockets.emit.reset();
		});
	});

	describe('cleanup', function () {

		it('should set __private.loaded = false and call a callback', function (done) {
			var variable = '__private.loaded ';
			var backup = get(variable);
			var value = true;
			set(variable, value);
			rounds.cleanup(function () {
				expect(get(variable)).to.equal(false);
				set(variable, backup);
				done();
			});
		});
	});

	describe('__private.getOutsiders', function () {
		var getOutsiders;

		before(function () {
			getOutsiders = get('__private.getOutsiders');
		});

		describe('when scope.block.height = 1', function () {
			var scope = {block: {height: 1}};

			it('should call a callback', function (done) {
				getOutsiders(scope, function (err) {
					expect(err).to.not.exist;
					done();
				});
			});
		});

		describe('when scope.block.height != 1', function () {
			var scope = {block: {height: 2}};

			describe('when generateDelegateList succeed', function () {
				var modules;

				before(function () {
					// Bind fake modules
					modules = {
						delegates: {generateDelegateList: function (a, b, cb) { return cb(null, ['delegate1', 'delegate2', 'delegate3']); }},
						accounts: {generateAddressByPublicKey: function () { return 'delegate'; }}
					};
					rounds.onBind(modules);
				});

				describe('when all delegates are on list (no outsiders)', function () {
					var initialScope;

					before(function () {
						scope.roundDelegates = ['delegate1', 'delegate2', 'delegate3'];
						scope.roundOutsiders = [];
						initialScope = _.cloneDeep(scope);
					});

					it('should call a callback', function (done) {
						getOutsiders(scope, function (err) {
							expect(err).to.not.exist;
							done();
						});
					});

					it('should not modify scope.roundOutsiders', function () {
						expect(scope.roundOutsiders).to.deep.equal(initialScope.roundOutsiders);
					});
				});

				describe('when 1 delegates is not on list (outsider)', function () {
					var initialScope;

					before(function () {
						scope.roundDelegates = ['delegate2', 'delegate3'];
						scope.roundOutsiders = [];
						initialScope = _.cloneDeep(scope);
					});

					it('should call a callback', function (done) {
						getOutsiders(scope, function (err) {
							expect(err).to.not.exist;
							done();
						});
					});

					it('should add 1 outsider scope.roundOutsiders', function () {
						initialScope.roundOutsiders.push('delegate');
						expect(scope.roundOutsiders).to.deep.equal(initialScope.roundOutsiders);
					});
				});

				describe('when 2 delegates are not on list (outsiders)', function () {
					var initialScope;

					before(function () {
						scope.roundDelegates = ['delegate3'];
						scope.roundOutsiders = [];
						initialScope = _.cloneDeep(scope);
					});

					it('should call a callback', function (done) {
						getOutsiders(scope, function (err) {
							expect(err).to.not.exist;
							done();
						});
					});

					it('should add 2 outsiders to scope.roundOutsiders', function () {
						initialScope.roundOutsiders.push('delegate');
						initialScope.roundOutsiders.push('delegate');
						expect(scope.roundOutsiders).to.deep.equal(initialScope.roundOutsiders);
					});
				});

			});

			describe('when generateDelegateList fails', function () {

				before(function () {
					// Bind fake modules
					var modules = {
						delegates: {
							generateDelegateList: function (a, b, cb) {
								cb('error');
							}
						}
					};
					rounds.onBind(modules);
				});

				it('should call a callback with error', function (done) {
					getOutsiders(scope, function (err) {
						expect(err).to.equal('error');
						done();
					});
				});
			});
		});
	});

	describe('__private.sumRound', function () {
		var sumRound;
		var stub;
		var scope = {round: 1};

		before(function () {
			sumRound = get('__private.sumRound');
		});

		describe('when summedRound query succeed', function () {
			var initialScope;

			before(function () {
				var rows = [{
					rewards: [1.001, 2, 3],
					fees: 100.001,
					delegates: ['delegate1', 'delegate2', 'delegate3']
				}];
				stub = sinon.stub(db.rounds, 'summedRound').resolves(rows);
			});

			after(function () {
				stub.restore();
			});

			it('should call a callback', function (done) {
				sumRound(scope, function (err) {
					initialScope = _.cloneDeep(scope);
					expect(err).to.not.exist;
					done();
				});
			});

			it('should set scope.roundFees correctly', function () {
				expect(scope.roundFees).to.equal(100);
			});

			it('should set scope.roundRewards correctly', function () {
				expect(scope.roundRewards).to.deep.equal([1, 2, 3]);
			});

			it('should set scope.roundDelegates', function () {
				expect(scope.roundDelegates).to.deep.equal(['delegate1', 'delegate2', 'delegate3']);
			});
		});

		describe('when summedRound query fails', function () {

			before(function () {
				stub = sinon.stub(db.rounds, 'summedRound').rejects('fail');
			});

			after(function () {
				stub.restore();
			});

			it('should call a callback with error = fail', function (done) {
				sumRound(scope, function (err) {
					expect(err.name).to.equal('fail');
					done();
				});
			});
		});
	});

	describe('tick', function () {
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

		function resetStubsHistory () {
			mergeBlockGenerator_stub.resetHistory();
			land_stub.resetHistory();
			truncateBlocks_stub.resetHistory();
			sumRound_stub.resetHistory();
			getOutsiders_stub.resetHistory();
			clearRoundSnapshot_stub.resetHistory();
			performRoundSnapshot_stub.resetHistory();
			clearVotesSnapshot_stub.resetHistory();
			performVotesSnapshot_stub.resetHistory();
		};

		before(function () {
			// Init fake round logic
			function Round (__scope, __t) {
				roundScope = __scope;
			}
			Round.prototype.mergeBlockGenerator = mergeBlockGenerator_stub;
			Round.prototype.land = land_stub;
			Round.prototype.truncateBlocks = truncateBlocks_stub;
			Rounds.__set__('Round', Round);

			// Set more stubs
			set('__private.sumRound', sumRound_stub);
			set('__private.getOutsiders', getOutsiders_stub);
			clearRoundSnapshot_stub = sinon.stub(db.rounds, 'clearRoundSnapshot').resolves();
			performRoundSnapshot_stub = sinon.stub(db.rounds, 'performRoundSnapshot').resolves();
			clearVotesSnapshot_stub = sinon.stub(db.rounds, 'clearVotesSnapshot').resolves();
			performVotesSnapshot_stub = sinon.stub(db.rounds, 'performVotesSnapshot').resolves();
		});

		after(function () {
			// Clear stubs
			clearRoundSnapshot_stub.restore();
			performRoundSnapshot_stub.restore();
			clearVotesSnapshot_stub.restore();
			performVotesSnapshot_stub.restore();
		});

		describe('testing branches', function () {

			describe('scope properties', function () {

				after(function () {
					resetStubsHistory();
				});

				describe('finishRound', function () {

					describe('when block height = 1', function () {

						it('should be set to true', function (done) {
							block = {height: 1};
							rounds.tick(block, function (err) {
								expect(err).to.not.exist;
								expect(roundScope.finishRound).to.be.true;
								done();
							});
						});
					});

					describe('when block height = 101', function () {

						it('should be set to true', function (done) {
							block = {height: 101};
							rounds.tick(block, function (err) {
								expect(err).to.not.exist;
								expect(roundScope.finishRound).to.be.true;
								done();
							});
						});
					});

					describe('when round !== nextRound', function () {

						it('should be set to true', function (done) {
							block = {height: 202};
							rounds.tick(block, function (err) {
								expect(err).to.not.exist;
								expect(roundScope.finishRound).to.be.true;
								done();
							});
						});
					});

					describe('when other height supplied (middle-round)', function () {

						it('should be set to false', function (done) {
							block = {height: 203};
							rounds.tick(block, function (err) {
								expect(err).to.not.exist;
								expect(roundScope.finishRound).to.be.false;
								done();
							});
						});
					});
				});

				describe('snapshotRound', function () {

					describe('when library.config.loading.snapshot = 0', function () {

						it('should be set to true', function (done) {
							var variable = 'library.config.loading.snapshot';
							var backup = get(variable);
							var value = 0;
							set(variable, value);
							block = {height: 1};

							rounds.tick(block, function (err) {
								expect(err).to.not.exist;
								expect(roundScope.snapshotRound).to.be.false;
								set(variable, backup);
								done();
							});
						});
					});

					describe('when library.config.loading.snapshot > 0', function () {

						describe('when library.config.loading.snapshot === round', function () {

							it('should be set to true', function (done) {
								var variable = 'library.config.loading.snapshot';
								var backup = get(variable);
								var value = 1;
								set(variable, value);
								block = {height: 1};

								rounds.tick(block, function (err) {
									expect(err).to.equal('Snapshot finished');
									expect(roundScope.snapshotRound).to.be.true;
									set(variable, backup);
									done();
								});
							});
						});

						describe('when library.config.loading.snapshot !== round', function () {

							it('should be set to false', function (done) {
								var variable = 'library.config.loading.snapshot';
								var backup = get(variable);
								var value = 1;
								set(variable, value);
								block = {height: 202};

								rounds.tick(block, function (err) {
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

		describe('scope.finishRound', function () {
			var bus;

			before(function () {
				bus = get('library.bus.message');
				bus.reset();
			});

			describe('when true', function () {

				before(function (done) {
					block = {height: 1};
					rounds.tick(block, function (err) {
						expect(err).to.not.exist;
						expect(roundScope.finishRound).to.be.true;
						done();
					});
				});

				after(function () {
					resetStubsHistory();
					bus.reset();
				});

				it('scope.mergeBlockGenerator should be called once', function () {
					expect(mergeBlockGenerator_stub.calledOnce).to.be.true;
				});

				it('scope.land should be called once', function () {
					expect(land_stub.calledOnce).to.be.true;
				});

				it('scope.sumRound should be called once', function () {
					expect(sumRound_stub.calledOnce).to.be.true;
				});

				it('scope.getOutsiders should be called once', function () {
					expect(getOutsiders_stub.calledOnce).to.be.true;
				});

				it('library.bus.message should be called once with proper params', function () {
					var bus = get('library.bus.message');
					expect(bus.calledOnce).to.be.true;
					expect(bus.calledWith('finishRound', roundScope.round)).to.be.true;
				});
			});

			describe('when false', function () {

				before(function (done) {
					block = {height: 203};
					rounds.tick(block, function (err) {
						expect(err).to.not.exist;
						expect(roundScope.finishRound).to.be.false;
						done();
					});
				});

				after(function () {
					resetStubsHistory();
					bus.reset();
				});

				it('scope.mergeBlockGenerator should be called once', function () {
					expect(mergeBlockGenerator_stub.calledOnce).to.be.true;
				});

				it('scope.land should be not called', function () {
					expect(land_stub.called).to.be.false;
				});

				it('scope.sumRound should be not called', function () {
					expect(sumRound_stub.called).to.be.false;
				});

				it('scope.getOutsiders should be not called', function () {
					expect(getOutsiders_stub.called).to.be.false;
				});

				it('library.bus.message should be not called', function () {
					var bus = get('library.bus.message');
					expect(bus.called).to.be.false;
				});
			});
		});

		describe('scope.snapshotRound', function () {

			describe('when true', function () {
				var res;

				before(function (done) {
					var variable = 'library.config.loading.snapshot';
					var backup = get(variable);
					var value = 1;
					set(variable, value);
					block = {height: 1};

					rounds.tick(block, function (err) {
						res = err;
						set(variable, backup);
						done();
					});
				});

				after(function () {
					resetStubsHistory();
				});

				it('should return with error = Snapshot finished', function () {
					expect(res).to.equal('Snapshot finished');
				});

				it('should set scope.finishSnapshot to true', function () {
					expect(roundScope.finishSnapshot).to.be.true;
				});

				it('scope.truncateBlocks should be called once', function () {
					expect(truncateBlocks_stub.calledOnce).to.be.true;
				});

			});

			describe('when false', function () {
				var res;

				before(function (done) {
					var variable = 'library.config.loading.snapshot';
					var backup = get(variable);
					var value = 0;
					set(variable, value);
					block = {height: 1};

					rounds.tick(block, function (err) {
						res = err;
						set(variable, backup);
						done();
					});
				});

				after(function () {
					resetStubsHistory();
				});

				it('should return with no error', function () {
					expect(res).to.not.exist;
				});

				it('should not set scope.finishSnapshot', function () {
					expect(roundScope.finishSnapshot).to.equal(undefined);
				});

				it('scope.truncateBlocks should not be called', function () {
					expect(truncateBlocks_stub.called).to.be.false;
				});
			});
		});

		describe('performing round snapshot (queries)', function () {
			var bus;

			before(function () {
				bus = get('library.bus.message');
				bus.reset();
			});

			describe('when (block.height+1) % slots.delegates === 0', function () {

				before(function (done) {
					block = {height: 100};
					rounds.tick(block, function (err) {
						expect(err).to.not.exist;
						done();
					});
				});

				after(function () {
					resetStubsHistory();
					bus.reset();
				});

				it('clearRoundSnapshot query should be called once', function () {
					expect(clearRoundSnapshot_stub.calledOnce).to.be.true;
				});

				it('performRoundSnapshot query should be called once', function () {
					expect(performRoundSnapshot_stub.calledOnce).to.be.true;
				});

				it('clearVotesSnapshot query should be called once', function () {
					expect(clearVotesSnapshot_stub.calledOnce).to.be.true;
				});

				it('performVotesSnapshot query should be called once', function () {
					expect(performVotesSnapshot_stub.calledOnce).to.be.true;
				});
			});

			describe('when (block.height+1) % slots.delegates !== 0', function () {

				before(function (done) {
					block = {height: 101};
					rounds.tick(block, function (err) {
						expect(err).to.not.exist;
						done();
					});
				});

				after(function () {
					resetStubsHistory();
					bus.reset();
				});

				it('clearRoundSnapshot query should be called once', function () {
					expect(clearRoundSnapshot_stub.calledOnce).to.be.false;
				});

				it('performRoundSnapshot query should be called once', function () {
					expect(performRoundSnapshot_stub.calledOnce).to.be.false;
				});

				it('clearVotesSnapshot query should be called once', function () {
					expect(clearVotesSnapshot_stub.calledOnce).to.be.false;
				});

				it('performVotesSnapshot query should be called once', function () {
					expect(performVotesSnapshot_stub.calledOnce).to.be.false;
				});
			});
		});
	});

	describe('backwardTick', function () {
		var block;
		var previousBlock;
		var roundScope;

		// Init stubs
		var mergeBlockGenerator_stub = sinon.stub().resolves();
		var backwardLand_stub = sinon.stub().resolves();
		var markBlockId_stub = sinon.stub().resolves();
		var sumRound_stub = sinon.stub().callsArg(1);
		var getOutsiders_stub = sinon.stub().callsArg(1);

		function resetStubsHistory () {
			mergeBlockGenerator_stub.resetHistory();
			backwardLand_stub.resetHistory();
			markBlockId_stub.resetHistory();
			sumRound_stub.resetHistory();
			getOutsiders_stub.resetHistory();
		};

		before(function () {
			// Init fake round logic
			function Round (__scope, __t) {
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

		describe('testing branches', function () {

			describe('scope properties', function () {

				after(function () {
					resetStubsHistory();
				});

				describe('finishRound', function () {

					describe('when block height = 1', function () {

						it('should be set to true', function (done) {
							block = {height: 1};
							previousBlock = {height: 1};
							rounds.backwardTick(block, previousBlock, function (err) {
								expect(err).to.not.exist;
								expect(roundScope.finishRound).to.be.true;
								done();
							});
						});
					});

					describe('when block height = 101', function () {

						it('should be set to true', function (done) {
							block = {height: 101};
							previousBlock = {height: 1};
							rounds.backwardTick(block, previousBlock, function (err) {
								expect(err).to.not.exist;
								expect(roundScope.finishRound).to.be.true;
								done();
							});
						});
					});

					describe('prevRound === round && nextRound !== round', function () {

						it('should be set to true', function (done) {
							block = {height: 202};
							previousBlock = {height: 202};
							rounds.backwardTick(block, previousBlock, function (err) {
								expect(err).to.not.exist;
								expect(roundScope.finishRound).to.be.true;
								done();
							});
						});
					});

					describe('when other height supplied (middle-round)', function () {

						it('should be set to false', function (done) {
							block = {height: 203};
							previousBlock = {height: 203};
							rounds.backwardTick(block, previousBlock, function (err) {
								expect(err).to.not.exist;
								expect(roundScope.finishRound).to.be.false;
								done();
							});
						});
					});
				});
			});
		});

		describe('scope.finishRound', function () {

			describe('when true', function () {

				before(function (done) {
					block = {height: 1};
					previousBlock = {height: 1};
					rounds.backwardTick(block, previousBlock, function (err) {
						expect(err).to.not.exist;
						expect(roundScope.finishRound).to.be.true;
						done();
					});
				});

				after(function () {
					resetStubsHistory();
				});

				it('scope.mergeBlockGenerator should be called once', function () {
					expect(mergeBlockGenerator_stub.calledOnce).to.be.true;
				});

				it('scope.backwardLand should be called once', function () {
					expect(backwardLand_stub.calledOnce).to.be.true;
				});

				it('scope.markBlockId should be called once', function () {
					expect(markBlockId_stub.calledOnce).to.be.true;
				});

				it('scope.sumRound should be called once', function () {
					expect(sumRound_stub.calledOnce).to.be.true;
				});

				it('scope.getOutsiders should be called once', function () {
					expect(getOutsiders_stub.calledOnce).to.be.true;
				});
			});

			describe('when false', function () {

				before(function (done) {
					block = {height: 5};
					previousBlock = {height: 5};
					rounds.backwardTick(block, previousBlock, function (err) {
						expect(err).to.not.exist;
						expect(roundScope.finishRound).to.be.false;
						done();
					});
				});

				after(function () {
					resetStubsHistory();
				});

				it('scope.mergeBlockGenerator should be called once', function () {
					expect(mergeBlockGenerator_stub.calledOnce).to.be.true;
				});

				it('scope.backwardLand should be not called', function () {
					expect(backwardLand_stub.called).to.be.false;
				});

				it('scope.markBlockId should be called once', function () {
					expect(markBlockId_stub.calledOnce).to.be.true;
				});

				it('scope.sumRound should be not called', function () {
					expect(sumRound_stub.called).to.be.false;
				});

				it('scope.getOutsiders should be not called', function () {
					expect(getOutsiders_stub.called).to.be.false;
				});
			});
		});
	});
});
