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
const Rounds = rewire('../../../../../../src/modules/chain/submodules/rounds');
const Round = rewire('../../../../../../src/modules/chain/logic/round'); // eslint-disable-line no-unused-vars
const { TestStorageSandbox } = require('../../../../common/storage_sandbox');
const {
	CACHE_KEYS_DELEGATES,
} = require('../../../../../../src/components/cache');

const sinon = sinonSandbox;

describe('rounds', () => {
	let rounds;
	let scope;
	let components;

	// Init fake logger
	const logger = {
		trace: sinon.spy(),
		debug: sinon.spy(),
		info: sinon.spy(),
		log: sinon.spy(),
		warn: sinon.spy(),
		error: sinon.spy(),
	};

	const storageStubs = {
		Account: { getOne: sinon.stub() },
		Round: {
			delete: sinon.stub(),
			summedRound: sinon.stub(),
			create: sinon.stub(),
			updateVotes: sinon.stub(),
			updateDelegatesRanks: sinon.stub(),
			restoreRoundSnapshot: sinon.stub(),
			restoreVotesSnapshot: sinon.stub(),
			checkSnapshotAvailability: sinon.stub(),
			countRoundSnapshot: sinon.stub(),
			deleteRoundRewards: sinon.stub(),
			insertRoundRewards: sinon.stub(),
			clearRoundSnapshot: sinon.stub(),
			performRoundSnapshot: sinon.stub(),
			clearVotesSnapshot: sinon.stub(),
			performVotesSnapshot: sinon.stub(),
		},
	};

	const storage = new TestStorageSandbox(__testContext.config.db, storageStubs);

	const bindings = {
		components: {
			cache: {
				isReady: sinon.stub(),
				removeByPattern: sinon.stub(),
			},
		},
		modules: {
			delegates: {
				generateDelegateList: sinon.stub(),
				clearDelegateListCache: sinon.stub(),
			},
			accounts: {
				generateAddressByPublicKey: sinon.stub(),
			},
		},
	};

	const validScope = {
		components: { logger, storage },
		bus: { message: sinon.spy() },
		channel: {
			publish: sinonSandbox.stub(),
		},
	};

	function get(variable) {
		return Rounds.__get__(variable);
	}

	function set(variable, value) {
		return Rounds.__set__(variable, value);
	}

	beforeEach(done => {
		scope = _.cloneDeep(validScope);

		bindings.modules.delegates.generateDelegateList.yields(null, [
			'delegate1',
			'delegate2',
			'delegate3',
		]);
		bindings.modules.accounts.generateAddressByPublicKey.returnsArg(0);

		new Rounds((err, __instance) => {
			rounds = __instance;
			rounds.onBind(bindings);
			components = get('components');
			components.cache = {
				isReady: sinon.stub(),
				removeByPattern: sinonSandbox.stub().callsArg(1),
			};
			done();
		}, scope);
	});

	afterEach(done => {
		sinon.restore();
		done();
	});

	describe('constructor', () => {
		it('should return Rounds instance', async () =>
			expect(rounds).to.be.instanceof(Rounds));

		it('should set library to scope', async () => {
			const library = get('library');

			expect(library.logger).to.eql(validScope.components.logger);
			expect(library.storage).to.eql(validScope.components.storage);
			expect(library.bus).to.eql(validScope.bus);
			expect(library.channel).to.eql(validScope.channel);
		});

		it('should set self object', async () => {
			const self = Rounds.__get__('self');
			return expect(self).to.deep.equal(rounds);
		});
	});

	describe('loaded', () => {
		it('should return __private.loaded', async () => {
			const variable = '__private.loaded';
			const backup = get(variable);
			const value = 'abc';
			set(variable, value);
			expect(get(variable)).to.equal(value);
			return set(variable, backup);
		});
	});

	describe('ticking', () => {
		it('should return __private.ticking', async () => {
			const variable = '__private.ticking';
			const backup = get(variable);
			const value = 'abc';
			set(variable, value);
			expect(get(variable)).to.equal(value);
			return set(variable, backup);
		});
	});

	describe('onBind', () => {
		it('should set modules', async () => {
			const variable = 'modules';
			const backup = get(variable);
			const roundBindings = {
				modules: {
					blocks: 'blocks',
					accounts: 'accounts',
					delegates: 'delegates',
				},
			};
			rounds.onBind(roundBindings);
			expect(get(variable)).to.deep.equal(roundBindings.modules);
			return set(variable, backup);
		});

		it('should assign component property', async () => {
			components = get('components');
			return expect(components).to.have.property('cache');
		});
	});

	describe('onBlockchainReady', () => {
		it('should set __private.loaded = true', async () => {
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
		beforeEach(() => {
			components.cache.isReady.returns(true);
			return components.cache.removeByPattern.resetHistory();
		});

		it('should call components.cache.removeByPattern once if cache is enabled', async () => {
			const round = 123;
			const pattern = CACHE_KEYS_DELEGATES;
			rounds.onFinishRound(round);

			expect(components.cache.removeByPattern.called).to.be.true;
			return expect(components.cache.removeByPattern.calledWith(pattern)).to.be
				.true;
		});

		it('should call library.channel.publish once, with proper params', async () => {
			const round = 124;
			rounds.onFinishRound(round);

			expect(validScope.channel.publish).to.be.calledWith(
				'chain:rounds:change',
				{
					number: round,
				}
			);
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

		beforeEach(async () => {
			getOutsiders = get('__private.getOutsiders');
		});

		describe('when scope.block.height = 1', () => {
			beforeEach(async () => {
				scope.block = { height: 1 };
			});

			it('should call a callback', done => {
				getOutsiders(scope, err => {
					expect(err).to.not.exist;
					done();
				});
			});
		});

		describe('when scope.block.height != 1', () => {
			beforeEach(async () => {
				scope.block = { height: 2 };
			});

			describe('when generateDelegateList is successful', () => {
				describe('when all delegates are on list (no outsiders)', () => {
					beforeEach(async () => {
						scope.roundDelegates = ['delegate1', 'delegate2', 'delegate3'];
						scope.roundOutsiders = [];
					});

					it('should call a callback', done => {
						getOutsiders(scope, err => {
							expect(err).to.not.exist;
							done();
						});
					});

					it('should not modify scope.roundOutsiders', done => {
						getOutsiders(scope, async () => {
							expect(scope.roundOutsiders).to.be.eql([]);
							done();
						});
					});
				});

				describe('when 1 delegates is not on list (outsider)', () => {
					beforeEach(async () => {
						scope.roundDelegates = ['delegate2', 'delegate3'];
						scope.roundOutsiders = [];
					});

					it('should call a callback', done => {
						getOutsiders(scope, err => {
							expect(err).to.not.exist;
							done();
						});
					});

					it('should add 1 outsider scope.roundOutsiders', done => {
						getOutsiders(scope, async () => {
							expect(scope.roundOutsiders).to.be.eql(['delegate1']);
							done();
						});
					});
				});

				describe('when 2 delegates are not on list (outsiders)', () => {
					beforeEach(async () => {
						scope.roundDelegates = ['delegate3'];
						scope.roundOutsiders = [];
					});

					it('should call a callback', done => {
						getOutsiders(scope, err => {
							expect(err).to.not.exist;
							done();
						});
					});

					it('should add 2 outsiders to scope.roundOutsiders', done => {
						getOutsiders(scope, async () => {
							expect(scope.roundOutsiders).to.be.eql([
								'delegate1',
								'delegate2',
							]);
							done();
						});
					});
				});
			});

			describe('when generateDelegateList fails', () => {
				beforeEach(async () => {
					scope.block.height = 2;
					bindings.modules.delegates.generateDelegateList.yields('error');
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

		beforeEach(done => {
			sumRound = get('__private.sumRound');
			done();
		});

		describe('when last block is genesis block', () => {
			beforeEach(async () => {
				scope.round = 1;
				scope.block = {
					height: 1,
					totalFee: 123,
					reward: 456,
					generatorPublicKey: 'aaa',
				};
			});

			it('should call a callback', done => {
				sumRound(scope, err => {
					expect(err).to.not.exist;
					done();
				});
			});

			it('should set scope.roundFees to 0', done => {
				sumRound(scope, async () => {
					expect(scope.roundFees).to.equal(0);
					done();
				});
			});

			it('should set scope.roundRewards to 0', done => {
				sumRound(scope, async () => {
					expect(scope.roundRewards).to.deep.equal([0]);
					done();
				});
			});

			it('should set scope.roundDelegates', done => {
				sumRound(scope, async () => {
					expect(scope.roundDelegates).to.deep.equal([
						scope.block.generatorPublicKey,
					]);
					done();
				});
			});
		});

		describe('when last block is not genesis block', () => {
			describe('when summedRound query is successful', () => {
				beforeEach(async () => {
					scope.round = 1;
					scope.block = { height: 2 };

					const rows = [
						{
							rewards: [1.001, 2, 3],
							fees: 100.001,
							delegates: ['delegate1', 'delegate2', 'delegate3'],
						},
					];
					storageStubs.Round.summedRound.resolves(rows);
				});

				it('should call a callback', done => {
					sumRound(scope, err => {
						expect(err).to.not.exist;
						done();
					});
				});

				it('should set scope.roundFees correctly', done => {
					sumRound(scope, async () => {
						expect(scope.roundFees).to.equal(100);
						done();
					});
				});

				it('should set scope.roundRewards correctly', done => {
					sumRound(scope, async () => {
						expect(scope.roundRewards).to.deep.equal([1, 2, 3]);
						done();
					});
				});

				it('should set scope.roundDelegates', done => {
					sumRound(scope, async () => {
						expect(scope.roundDelegates).to.deep.equal([
							'delegate1',
							'delegate2',
							'delegate3',
						]);
						done();
					});
				});
			});

			describe('when summedRound query fails', () => {
				beforeEach(done => {
					// Because for genesis block we don't invoke summedRound
					scope.block = { height: 2 };
					storageStubs.Round.summedRound.rejects('fail');
					done();
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
		let mergeBlockGenerator_stub;
		let land_stub;
		let sumRound_stub;
		let getOutsiders_stub;
		let clearRoundSnapshot_stub;
		let performRoundSnapshot_stub;
		let clearVotesSnapshot_stub;
		let performVotesSnapshot_stub;

		beforeEach(async () => {
			mergeBlockGenerator_stub = sinon.stub().resolves();
			land_stub = sinon.stub().resolves();
			sumRound_stub = sinon.stub().callsArg(1);
			getOutsiders_stub = sinon.stub().callsArg(1);

			// Init fake round logic
			function RoundLogic(__scope) {
				roundScope = __scope;
			}
			RoundLogic.prototype.mergeBlockGenerator = mergeBlockGenerator_stub;
			RoundLogic.prototype.land = land_stub;
			Rounds.__set__('Round', RoundLogic);

			// Set more stubs
			set('__private.sumRound', sumRound_stub);
			set('__private.getOutsiders', getOutsiders_stub);
		});

		describe('testing branches', () => {
			describe('scope properties', () => {
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

			beforeEach(() => {
				bus = get('library.bus.message');
				return bus.resetHistory();
			});

			describe('when true', () => {
				beforeEach(done => {
					scope.finishRound = true;
					block = { height: 1 };
					rounds.tick(block, err => {
						expect(err).to.not.exist;
						expect(roundScope.finishRound).to.be.true;
						done();
					});
				});

				afterEach(() => bus.resetHistory());

				it('scope.mergeBlockGenerator should be called once', async () =>
					expect(mergeBlockGenerator_stub.calledOnce).to.be.true);

				it('scope.land should be called once', async () =>
					expect(land_stub.calledOnce).to.be.true);

				it('scope.sumRound should be called once', async () =>
					expect(sumRound_stub.calledOnce).to.be.true);

				it('scope.getOutsiders should be called once', async () =>
					expect(getOutsiders_stub.calledOnce).to.be.true);

				it('library.bus.message should be called once with proper params', async () => {
					const busMessage = get('library.bus.message');
					expect(busMessage.calledOnce).to.be.true;
					return expect(busMessage.calledWith('finishRound', roundScope.round))
						.to.be.true;
				});
			});

			describe('when false', () => {
				beforeEach(done => {
					block = { height: 203 };
					rounds.tick(block, err => {
						expect(err).to.not.exist;
						expect(roundScope.finishRound).to.be.false;
						done();
					});
				});

				after(() => bus.resetHistory());

				it('scope.mergeBlockGenerator should be called once', async () =>
					expect(mergeBlockGenerator_stub.calledOnce).to.be.true);

				it('scope.land should be not called', async () =>
					expect(land_stub.called).to.be.false);

				it('scope.sumRound should be not called', async () =>
					expect(sumRound_stub.called).to.be.false);

				it('scope.getOutsiders should be not called', async () =>
					expect(getOutsiders_stub.called).to.be.false);

				it('library.bus.message should be not called', async () => {
					const busMessage = get('library.bus.message');
					return expect(busMessage.called).to.be.false;
				});
			});
		});

		describe('performing round snapshot (queries)', () => {
			afterEach(async () => {
				clearRoundSnapshot_stub.reset();
				performRoundSnapshot_stub.reset();
				clearVotesSnapshot_stub.reset();
				performVotesSnapshot_stub.reset();
			});

			describe('when (block.height+1) % ACTIVE_DELEGATES === 0', () => {
				beforeEach(async () => {
					clearRoundSnapshot_stub = storageStubs.Round.clearRoundSnapshot.resolves();
					performRoundSnapshot_stub = storageStubs.Round.performRoundSnapshot.resolves();
					clearVotesSnapshot_stub = storageStubs.Round.clearVotesSnapshot.resolves();
					performVotesSnapshot_stub = storageStubs.Round.performVotesSnapshot.resolves();

					// Init fake round logic
					function RoundLogic(__scope) {
						roundScope = __scope;
					}
					RoundLogic.prototype.mergeBlockGenerator = mergeBlockGenerator_stub;
					RoundLogic.prototype.land = land_stub;
					Rounds.__set__('Round', RoundLogic);
				});

				describe('when queries are successful', () => {
					let res;

					beforeEach(done => {
						block = { height: 100 };
						rounds.tick(block, err => {
							res = err;
							done();
						});
					});

					it('should result with no error', async () =>
						expect(res).to.not.exist);

					it('clearRoundSnapshot query should be called once', async () =>
						expect(clearRoundSnapshot_stub.calledOnce).to.be.true);

					it('performRoundSnapshot query should be called once', async () =>
						expect(performRoundSnapshot_stub.calledOnce).to.be.true);

					it('clearVotesSnapshot query should be called once', async () =>
						expect(clearVotesSnapshot_stub.calledOnce).to.be.true);

					it('performVotesSnapshot query should be called once', async () =>
						expect(performVotesSnapshot_stub.calledOnce).to.be.true);
				});

				describe('when clearRoundSnapshot query fails', () => {
					let res;

					beforeEach(done => {
						clearRoundSnapshot_stub = storageStubs.Round.clearRoundSnapshot.rejects(
							'clearRoundSnapshot'
						);

						block = { height: 100 };
						rounds.tick(block, err => {
							res = err;
							done();
						});
					});

					it('should result with BatchError and first error = fail', async () => {
						expect(res.name).to.equal('BatchError');
						return expect(res.first.name).to.equal('clearRoundSnapshot');
					});

					it('clearRoundSnapshot query should be called once', async () =>
						expect(clearRoundSnapshot_stub.calledOnce).to.be.true);

					it('performRoundSnapshot query should be called once', async () =>
						expect(performRoundSnapshot_stub.calledOnce).to.be.true);

					it('clearVotesSnapshot query should be called once', async () =>
						expect(clearVotesSnapshot_stub.calledOnce).to.be.true);

					it('performVotesSnapshot query should be called once', async () =>
						expect(performVotesSnapshot_stub.calledOnce).to.be.true);
				});

				describe('when performRoundSnapshot query fails', () => {
					let res;

					beforeEach(done => {
						performRoundSnapshot_stub = storageStubs.Round.performRoundSnapshot.rejects(
							'performRoundSnapshot'
						);

						block = { height: 100 };
						rounds.tick(block, err => {
							res = err;
							done();
						});
					});

					it('should result with BatchError and first error = fail', async () => {
						expect(res.name).to.equal('BatchError');
						return expect(res.first.name).to.equal('performRoundSnapshot');
					});

					it('clearRoundSnapshot query should be called once', async () =>
						expect(clearRoundSnapshot_stub.calledOnce).to.be.true);

					it('performRoundSnapshot query should be called once', async () =>
						expect(performRoundSnapshot_stub.calledOnce).to.be.true);

					it('clearVotesSnapshot query should be called once', async () =>
						expect(clearVotesSnapshot_stub.calledOnce).to.be.true);

					it('performVotesSnapshot query should be called once', async () =>
						expect(performVotesSnapshot_stub.calledOnce).to.be.true);
				});

				describe('when clearVotesSnapshot query fails', () => {
					let res;

					beforeEach(done => {
						clearVotesSnapshot_stub = storageStubs.Round.clearVotesSnapshot.rejects(
							'clearVotesSnapshot'
						);

						block = { height: 100 };
						rounds.tick(block, err => {
							res = err;
							done();
						});
					});

					it('should result with BatchError and first error = fail', async () => {
						expect(res.name).to.equal('BatchError');
						return expect(res.first.name).to.equal('clearVotesSnapshot');
					});

					it('clearRoundSnapshot query should be called once', async () =>
						expect(clearRoundSnapshot_stub.calledOnce).to.be.true);

					it('performRoundSnapshot query should be called once', async () =>
						expect(performRoundSnapshot_stub.calledOnce).to.be.true);

					it('clearVotesSnapshot query should be called once', async () =>
						expect(clearVotesSnapshot_stub.calledOnce).to.be.true);

					it('performVotesSnapshot query should be called once', async () =>
						expect(performVotesSnapshot_stub.calledOnce).to.be.true);
				});

				describe('when performVotesSnapshot query fails', () => {
					let res;

					beforeEach(done => {
						performVotesSnapshot_stub = storageStubs.Round.performVotesSnapshot.rejects(
							'performVotesSnapshot'
						);

						block = { height: 100 };
						rounds.tick(block, err => {
							res = err;
							done();
						});
					});

					it('should result with BatchError and first error = fail', async () => {
						expect(res.name).to.equal('BatchError');
						return expect(res.first.name).to.equal('performVotesSnapshot');
					});

					it('clearRoundSnapshot query should be called once', async () =>
						expect(clearRoundSnapshot_stub.calledOnce).to.be.true);

					it('performRoundSnapshot query should be called once', async () =>
						expect(performRoundSnapshot_stub.calledOnce).to.be.true);

					it('clearVotesSnapshot query should be called once', async () =>
						expect(clearVotesSnapshot_stub.calledOnce).to.be.true);

					it('performVotesSnapshot query should be called once', async () =>
						expect(performVotesSnapshot_stub.calledOnce).to.be.true);
				});
			});

			describe('when (block.height+1) % ACTIVE_DELEGATES !== 0', () => {
				beforeEach(done => {
					block = { height: 101 };
					rounds.tick(block, err => {
						expect(err).to.not.exist;
						done();
					});
				});

				it('clearRoundSnapshot query should be not called', async () =>
					expect(clearRoundSnapshot_stub.calledOnce).to.be.false);

				it('performRoundSnapshot query should be not called', async () =>
					expect(performRoundSnapshot_stub.calledOnce).to.be.false);

				it('clearVotesSnapshot query should be not called', async () =>
					expect(clearVotesSnapshot_stub.calledOnce).to.be.false);

				it('performVotesSnapshot query should be not called', async () =>
					expect(performVotesSnapshot_stub.calledOnce).to.be.false);
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

		beforeEach(async () => {
			// Init fake round logic
			function RoundLogic(__scope) {
				roundScope = __scope;
			}
			RoundLogic.prototype.mergeBlockGenerator = mergeBlockGenerator_stub;
			RoundLogic.prototype.backwardLand = backwardLand_stub;
			Rounds.__set__('Round', RoundLogic);

			// Set more stubs
			set('__private.sumRound', sumRound_stub);
			set('__private.getOutsiders', getOutsiders_stub);
		});

		afterEach(async () => {
			mergeBlockGenerator_stub.resetHistory();
			backwardLand_stub.resetHistory();
			sumRound_stub.resetHistory();
			getOutsiders_stub.resetHistory();
		});

		describe('testing branches', () => {
			describe('scope properties', () => {
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
								null
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
								null
							);
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
				beforeEach(done => {
					block = { height: 1 };
					previousBlock = { height: 1 };
					rounds.backwardTick(block, previousBlock, err => {
						expect(err).to.not.exist;
						expect(roundScope.finishRound).to.be.true;
						done();
					});
				});

				it('scope.mergeBlockGenerator should be called once', async () =>
					expect(mergeBlockGenerator_stub.calledOnce).to.be.true);

				it('scope.backwardLand should be called once', async () =>
					expect(backwardLand_stub.calledOnce).to.be.true);

				it('scope.sumRound should be called once', async () =>
					expect(sumRound_stub.calledOnce).to.be.true);

				it('scope.getOutsiders should be called once', async () =>
					expect(getOutsiders_stub.calledOnce).to.be.true);
			});

			describe('when false', () => {
				beforeEach(done => {
					block = { height: 5 };
					previousBlock = { height: 5 };
					rounds.backwardTick(block, previousBlock, err => {
						expect(err).to.not.exist;
						expect(roundScope.finishRound).to.be.false;
						done();
					});
				});

				it('scope.mergeBlockGenerator should be called once', async () =>
					expect(mergeBlockGenerator_stub.calledOnce).to.be.true);

				it('scope.backwardLand should be not called', async () =>
					expect(backwardLand_stub.called).to.be.false);

				it('scope.sumRound should be not called', async () =>
					expect(sumRound_stub.called).to.be.false);

				it('scope.getOutsiders should be not called', async () =>
					expect(getOutsiders_stub.called).to.be.false);
			});
		});
	});

	describe('createRoundInformationWithAmount', () => {
		const params = {
			address: '123L',
			amount: '456',
			round: 1,
		};
		let getOneStub = null;
		let createRoundStub = null;

		beforeEach(async () => {
			getOneStub = storageStubs.Account.getOne.resolves({
				address: params.address,
				votedDelegatesPublicKeys: ['delegate1', 'delegate2'],
			});
			createRoundStub = storageStubs.Round.create.resolves();

			await rounds.createRoundInformationWithAmount(
				params.address,
				params.round,
				params.amount
			);
		});

		it('should should call Account.getOne with correct parameters', async () => {
			expect(getOneStub).to.be.calledWith(
				{ address: params.address },
				{ extended: true },
				sinon.match.any
			);
		});

		it('should call Round.create with correct parameters', async () => {
			expect(createRoundStub).to.be.calledWith(
				[
					{
						address: params.address,
						amount: params.amount,
						round: params.round,
						delegatePublicKey: 'delegate1',
					},
					{
						address: params.address,
						amount: params.amount,
						round: params.round,
						delegatePublicKey: 'delegate2',
					},
				],
				{},
				sinon.match.any
			);
		});
	});

	describe('createRoundInformationWithDelegate', () => {
		const params = {
			address: '123L',
			delegatePublicKey: 'delegate1',
			round: 1,
			mode: null,
		};
		let getOneStub = null;
		let createRoundStub = null;

		beforeEach(async () => {
			getOneStub = storageStubs.Account.getOne.resolves({
				address: params.address,
				balance: '123',
				votedDelegatesPublicKeys: ['delegate1', 'delegate2'],
			});
			createRoundStub = storageStubs.Round.create.resolves();
		});

		afterEach(async () => {
			getOneStub.reset();
			createRoundStub.reset();
		});

		describe('when mode is "+"', () => {
			beforeEach(async () => {
				params.mode = '+';

				await rounds.createRoundInformationWithDelegate(
					params.address,
					params.round,
					params.delegatePublicKey,
					params.mode
				);
			});

			it('should should call Account.getOne with correct parameters', async () => {
				expect(getOneStub).to.be.calledWith(
					{ address: params.address },
					{},
					sinon.match.any
				);
			});

			it('should call Round.create with correct parameters', async () => {
				expect(createRoundStub).to.be.calledWith(
					{
						address: params.address,
						amount: '123',
						round: params.round,
						delegatePublicKey: params.delegatePublicKey,
					},
					{},
					sinon.match.any
				);
			});
		});

		describe('when mode is "-"', () => {
			beforeEach(async () => {
				params.mode = '-';

				await rounds.createRoundInformationWithDelegate(
					params.address,
					params.round,
					params.delegatePublicKey,
					params.mode
				);
			});

			it('should should call Account.getOne with correct parameters', async () => {
				expect(getOneStub).to.be.calledWith(
					{ address: params.address },
					{},
					sinon.match.any
				);
			});

			it('should call Round.create with correct parameters', async () => {
				expect(createRoundStub).to.be.calledWith(
					{
						address: params.address,
						amount: '-123',
						round: params.round,
						delegatePublicKey: params.delegatePublicKey,
					},
					{},
					sinon.match.any
				);
			});
		});
	});
});
