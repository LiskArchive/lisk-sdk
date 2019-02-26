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

const liskTransactions = require('@liskhq/lisk-transactions');
// Init tests dependencies
const rewire = require('rewire');
const random = require('../../../../../common/utils/random.js');
const accountFixtures = require('../../../../../fixtures/accounts');
const { TestStorageSandbox } = require('../../../../../common/storage_sandbox');

// Instantiate test subject
const Rounds = rewire('../../../../../../src/modules/chain/modules/rounds.js');
const Round = rewire('../../../../../../src/modules/chain/logic/round.js'); // eslint-disable-line no-unused-vars
const transactionTypes = require('../../../../../../src/modules/chain/helpers/transaction_types.js');
const {
	CACHE_KEYS_DELEGATES,
} = require('../../../../../../src/components/cache');

const sinon = sinonSandbox;
const { NORMALIZER } = global.constants;

describe('rounds', async () => {
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
		Transaction: {
			getOne: sinon.stub(),
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
		logger,
		storage,
		bus: { message: sinon.spy() },
		network: { io: { sockets: { emit: sinon.spy() } } },
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

	describe('constructor', async () => {
		it('should return Rounds instance', async () =>
			expect(rounds).to.be.instanceof(Rounds));

		it('should set library to scope', async () =>
			expect(get('library')).to.deep.equal(validScope));

		it('should set self object', async () => {
			const self = Rounds.__get__('self');
			return expect(self).to.deep.equal(rounds);
		});
	});

	describe('loaded', async () => {
		it('should return __private.loaded', async () => {
			const variable = '__private.loaded';
			const backup = get(variable);
			const value = 'abc';
			set(variable, value);
			expect(get(variable)).to.equal(value);
			return set(variable, backup);
		});
	});

	describe('ticking', async () => {
		it('should return __private.ticking', async () => {
			const variable = '__private.ticking';
			const backup = get(variable);
			const value = 'abc';
			set(variable, value);
			expect(get(variable)).to.equal(value);
			return set(variable, backup);
		});
	});

	describe('onBind', async () => {
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

	describe('onBlockchainReady', async () => {
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

	describe('onFinishRound', async () => {
		beforeEach(() => {
			components.cache.isReady.returns(true);
			validScope.network.io.sockets.emit.resetHistory();
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

		it('should call library.network.io.sockets.emit once, with proper params', async () => {
			const round = 124;
			rounds.onFinishRound(round);

			expect(validScope.network.io.sockets.emit.calledOnce).to.be.true;
			return expect(
				validScope.network.io.sockets.emit.calledWith('rounds/change', {
					number: round,
				})
			).to.be.true;
		});
	});

	describe('cleanup', async () => {
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

	describe('__private.updateRecipientsRoundInformationWithAmountForTransactions', () => {
		let updateRecipientsRoundInformationWithAmountForTransactions;
		let createRoundInformationWithAmountStub;

		const account = random.account();
		const transactionAmount = (NORMALIZER * 1000).toString();
		const transferTransaction = liskTransactions.transfer({
			amount: transactionAmount,
			recipientId: account.address,
			passphrase: accountFixtures.genesis.passphrase,
		});
		const dappAuthorId = random.account().address;
		// In transfer and out transfer transactions cannot be generated by lisk-elements. So, creating dummy objects with only required properites.
		const dummyInTransferTransaction = {
			amount: transactionAmount,
			type: transactionTypes.IN_TRANSFER,
			asset: {
				inTransfer: {
					dappId: '123',
				},
			},
		};

		const dummyOutTransferTransaction = {
			type: transactionTypes.OUT_TRANSFER,
			amount: transactionAmount,
			recipientId: random.account().address,
		};

		beforeEach(async () => {
			updateRecipientsRoundInformationWithAmountForTransactions = get(
				'__private.updateRecipientsRoundInformationWithAmountForTransactions'
			);
			createRoundInformationWithAmountStub = sinon.stub(
				Rounds.prototype,
				'createRoundInformationWithAmount'
			);
			storageStubs.Transaction.getOne.resolves({ senderId: dappAuthorId });
		});

		it('should call createRoundInformationWithAmount with negative value when forwardTick is set to true for in transfer transaction', async () => {
			await updateRecipientsRoundInformationWithAmountForTransactions(
				1,
				[dummyInTransferTransaction],
				true,
				null
			);
			expect(createRoundInformationWithAmountStub).to.be.calledWithExactly(
				dappAuthorId,
				1,
				`${transactionAmount}`,
				null
			);
		});

		it('should call createRoundInformationWithAmount with negative value when forwardTick is set to true for out transfer transaction', async () => {
			await updateRecipientsRoundInformationWithAmountForTransactions(
				1,
				[dummyOutTransferTransaction],
				true,
				null
			);
			expect(createRoundInformationWithAmountStub).to.be.calledWithExactly(
				dummyOutTransferTransaction.recipientId,
				1,
				`${transactionAmount}`,
				null
			);
		});

		it('should call createRoundInformationWithAmount with negative value when forwardTick is set to true for transfer transaction', async () => {
			await updateRecipientsRoundInformationWithAmountForTransactions(
				1,
				[transferTransaction],
				true,
				null
			);
			expect(createRoundInformationWithAmountStub).to.be.calledWithExactly(
				transferTransaction.recipientId,
				1,
				`${transactionAmount}`,
				null
			);
		});

		it('should call createRoundInformationWithAmount with negative value when forwardTick is set to true for in transfer, out transfer and transfer transactions', async () => {
			await updateRecipientsRoundInformationWithAmountForTransactions(
				1,
				[
					dummyInTransferTransaction,
					dummyOutTransferTransaction,
					transferTransaction,
				],
				true,
				null
			);
			expect(createRoundInformationWithAmountStub).to.be.calledWith(
				dappAuthorId,
				1,
				`${transactionAmount}`,
				null
			);
			expect(createRoundInformationWithAmountStub).to.be.calledWith(
				dummyOutTransferTransaction.recipientId,
				1,
				`${transactionAmount}`,
				null
			);
			expect(createRoundInformationWithAmountStub).to.be.calledWith(
				transferTransaction.recipientId,
				1,
				`${transactionAmount}`,
				null
			);
		});

		it('should call createRoundInformationWithAmount with positive value when forwardTick is set to false for in transfer, out transfer and transfer transactions', async () => {
			await updateRecipientsRoundInformationWithAmountForTransactions(
				1,
				[
					dummyInTransferTransaction,
					dummyOutTransferTransaction,
					transferTransaction,
				],
				false,
				null
			);
			expect(createRoundInformationWithAmountStub).to.be.calledWith(
				dappAuthorId,
				1,
				`-${transactionAmount}`,
				null
			);
			expect(createRoundInformationWithAmountStub).to.be.calledWith(
				dummyOutTransferTransaction.recipientId,
				1,
				`-${transactionAmount}`,
				null
			);
			expect(createRoundInformationWithAmountStub).to.be.calledWith(
				transferTransaction.recipientId,
				1,
				`-${transactionAmount}`,
				null
			);
		});
	});

	describe('__private.updateSendersRoundInformationWithAmountForTransactions', () => {
		let updateSendersRoundInformationWithAmountForTransactions;
		let createRoundInformationWithAmountStub;

		const account = random.account();
		const transactionAmount = (NORMALIZER * 1000).toString();
		const transaction = liskTransactions.transfer({
			amount: transactionAmount,
			recipientId: account.address,
			passphrase: accountFixtures.genesis.passphrase,
		});
		const amountDeductedFromSenderAccount = (
			NORMALIZER * 1000 +
			NORMALIZER * 0.1
		).toString();

		beforeEach(async () => {
			updateSendersRoundInformationWithAmountForTransactions = get(
				'__private.updateSendersRoundInformationWithAmountForTransactions'
			);
			createRoundInformationWithAmountStub = sinon.stub(
				Rounds.prototype,
				'createRoundInformationWithAmount'
			);
		});

		it('should call createRoundInformationWithAmount with negative value when forwardTick is set to true', async () => {
			await updateSendersRoundInformationWithAmountForTransactions(
				1,
				[transaction],
				true,
				null
			);
			expect(createRoundInformationWithAmountStub).to.be.calledWithExactly(
				transaction.senderId,
				1,
				`-${amountDeductedFromSenderAccount}`,
				null
			);
		});

		it('should call createRoundInformationWithAmount with positive value when forwardTick is set to false', async () => {
			await updateSendersRoundInformationWithAmountForTransactions(
				1,
				[transaction],
				false,
				null
			);
			expect(createRoundInformationWithAmountStub).to.be.calledWithExactly(
				transaction.senderId,
				1,
				`${amountDeductedFromSenderAccount}`,
				null
			);
		});
	});

	describe('__private.updateRoundInformationWithDelegatesForTransactions', () => {
		let updateRoundInformationWithDelegatesForTransactions;
		let createRoundInformationWithDelegateStub;

		const account = random.account();
		const unvote = `${accountFixtures.existingDelegate.publicKey}`;
		const vote = `${account.publicKey}`;

		const transaction = liskTransactions.castVotes({
			passphrase: account.passphrase,
			votes: [vote],
			unvotes: [unvote],
		});

		beforeEach(async () => {
			updateRoundInformationWithDelegatesForTransactions = get(
				'__private.updateRoundInformationWithDelegatesForTransactions'
			);
			createRoundInformationWithDelegateStub = sinon.stub(
				Rounds.prototype,
				'createRoundInformationWithDelegate'
			);
		});

		it('should call createRoundInformationWithAmount with casted votes when forwardTick is set to true', async () => {
			await updateRoundInformationWithDelegatesForTransactions(
				1,
				[transaction],
				true,
				null
			);
			expect(createRoundInformationWithDelegateStub).to.be.calledWith(
				transaction.senderId,
				1,
				vote,
				'+',
				null
			);
			expect(createRoundInformationWithDelegateStub).to.be.calledWith(
				transaction.senderId,
				1,
				unvote,
				'-',
				null
			);
		});

		it('should call createRoundInformationWithAmount with opposite votes when forwardTick is set to false', async () => {
			await updateRoundInformationWithDelegatesForTransactions(
				1,
				[transaction],
				false,
				null
			);
			expect(createRoundInformationWithDelegateStub).to.be.calledWith(
				transaction.senderId,
				1,
				vote,
				'-',
				null
			);
			expect(createRoundInformationWithDelegateStub).to.be.calledWith(
				transaction.senderId,
				1,
				unvote,
				'+',
				null
			);
		});
	});

	describe('__private.getOutsiders', async () => {
		let getOutsiders;

		beforeEach(async () => {
			getOutsiders = get('__private.getOutsiders');
		});

		describe('when scope.block.height = 1', async () => {
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

		describe('when scope.block.height != 1', async () => {
			beforeEach(async () => {
				scope.block = { height: 2 };
			});

			describe('when generateDelegateList is successful', async () => {
				describe('when all delegates are on list (no outsiders)', async () => {
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

				describe('when 1 delegates is not on list (outsider)', async () => {
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

				describe('when 2 delegates are not on list (outsiders)', async () => {
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

			describe('when generateDelegateList fails', async () => {
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

	describe('__private.sumRound', async () => {
		let sumRound;

		beforeEach(done => {
			sumRound = get('__private.sumRound');
			done();
		});

		describe('when last block is genesis block', async () => {
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

		describe('when last block is not genesis block', async () => {
			describe('when summedRound query is successful', async () => {
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

			describe('when summedRound query fails', async () => {
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

	describe('tick', async () => {
		let block;
		let roundScope;

		// Init stubs
		const updateRoundInformationForTransactionsStub = sinon.stub().callsArg(4);
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
			set(
				'__private.updateRoundInformationForTransactions',
				updateRoundInformationForTransactionsStub
			);
		});

		describe('RoundInfomrationForTransactions', () => {
			block = { height: 1, transactions: [] };

			it('should call round information update functions with correct params', done => {
				rounds.tick(
					block,
					() => {
						expect(updateRoundInformationForTransactionsStub).to.be.calledWith(
							1,
							block.transactions,
							true,
							null
						);
						done();
					},
					null
				);
			});
		});

		describe('testing branches', async () => {
			describe('scope properties', async () => {
				describe('finishRound', async () => {
					describe('when block height = 1', async () => {
						it('should be set to true', done => {
							block = { height: 1 };
							rounds.tick(block, err => {
								expect(err).to.not.exist;
								expect(roundScope.finishRound).to.be.true;
								done();
							});
						});
					});

					describe('when block height = 101', async () => {
						it('should be set to true', done => {
							block = { height: 101 };
							rounds.tick(block, err => {
								expect(err).to.not.exist;
								expect(roundScope.finishRound).to.be.true;
								done();
							});
						});
					});

					describe('when round !== nextRound', async () => {
						it('should be set to true', done => {
							block = { height: 202 };
							rounds.tick(block, err => {
								expect(err).to.not.exist;
								expect(roundScope.finishRound).to.be.true;
								done();
							});
						});
					});

					describe('when other height supplied (middle-round)', async () => {
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

		describe('scope.finishRound', async () => {
			let bus;

			beforeEach(() => {
				bus = get('library.bus.message');
				return bus.resetHistory();
			});

			describe('when true', async () => {
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

			describe('when false', async () => {
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

		describe('performing round snapshot (queries)', async () => {
			afterEach(async () => {
				clearRoundSnapshot_stub.reset();
				performRoundSnapshot_stub.reset();
				clearVotesSnapshot_stub.reset();
				performVotesSnapshot_stub.reset();
			});

			describe('when (block.height+1) % ACTIVE_DELEGATES === 0', async () => {
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

				describe('when queries are successful', async () => {
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

				describe('when clearRoundSnapshot query fails', async () => {
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

				describe('when performRoundSnapshot query fails', async () => {
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

				describe('when clearVotesSnapshot query fails', async () => {
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

				describe('when performVotesSnapshot query fails', async () => {
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

			describe('when (block.height+1) % ACTIVE_DELEGATES !== 0', async () => {
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

	describe('backwardTick', async () => {
		let block;
		let previousBlock;
		let roundScope;

		// Init stubs
		const mergeBlockGenerator_stub = sinon.stub().resolves();
		const backwardLand_stub = sinon.stub().resolves();
		const sumRound_stub = sinon.stub().callsArg(1);
		const getOutsiders_stub = sinon.stub().callsArg(1);
		const updateRoundInformationForTransactionsStub = sinon.stub().callsArg(4);

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
			set(
				'__private.updateRoundInformationForTransactions',
				updateRoundInformationForTransactionsStub
			);
		});

		afterEach(async () => {
			mergeBlockGenerator_stub.resetHistory();
			backwardLand_stub.resetHistory();
			sumRound_stub.resetHistory();
			getOutsiders_stub.resetHistory();
		});

		describe('RoundInfomrationForTransactions', () => {
			block = { height: 1, transactions: [] };
			previousBlock = { height: 2, transactions: [] };

			it('should call round information update functions with correct params', done => {
				rounds.backwardTick(
					block,
					previousBlock,
					() => {
						expect(updateRoundInformationForTransactionsStub).to.be.calledWith(
							1,
							block.transactions,
							false,
							null
						);
						done();
					},
					null
				);
			});
		});

		describe('testing branches', async () => {
			describe('scope properties', async () => {
				describe('finishRound', async () => {
					describe('when block height = 1', async () => {
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

					describe('when block height = 101', async () => {
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

					describe('prevRound === round && nextRound !== round', async () => {
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

					describe('when other height supplied (middle-round)', async () => {
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

		describe('scope.finishRound', async () => {
			describe('when true', async () => {
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

			describe('when false', async () => {
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

	describe('createRoundInformationWithAmount', async () => {
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

	describe('createRoundInformationWithDelegate', async () => {
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

		describe('when mode is "+"', async () => {
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

		describe('when mode is "-"', async () => {
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
