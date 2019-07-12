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

const rewire = require('rewire');
const { Status: TransactionStatus } = require('@liskhq/lisk-transactions');
const {
	registeredTransactions,
} = require('../../../../../common/registered_transactions');
const InitTransaction = require('../../../../../../../src/modules/chain/logic/init_transaction');
const { Transaction } = require('../../../../../fixtures/transactions');
const slots = require('../../../../../../../src/modules/chain/helpers/slots');

const BlocksChain = rewire(
	'../../../../../../../src/modules/chain/submodules/blocks/chain'
);
const initTransaction = new InitTransaction({ registeredTransactions });

describe('blocks/chain', () => {
	let __private;
	let library;
	let modules;
	let blocksChainModule;
	let storageStub;
	let loggerStub;
	let blockStub;
	let initTransactionStub;
	let busStub;
	let balancesSequenceStub;
	let genesisBlockStub;
	let bindingsStub;

	const blockWithEmptyTransactions = {
		id: 1,
		height: 1,
		transactions: [],
	};

	const transactionsForBlock = [
		new Transaction({ type: 3 }),
		new Transaction({ type: 2 }),
		new Transaction({ type: 1 }),
	];

	const blockWithTransactions = {
		id: 3,
		height: 3,
		transactions: transactionsForBlock.map(transaction =>
			initTransaction.fromJson(transaction)
		),
	};

	const transactionsForGenesisBlock = [
		new Transaction({ type: 3 }),
		new Transaction({ type: 2 }),
		new Transaction({ type: 1 }),
	];

	const genesisBlockWithTransactions = {
		id: 1,
		height: 1,
		transactions: transactionsForGenesisBlock.map(transaction =>
			initTransaction.fromJson(transaction)
		),
	};

	const blockReduced = { id: 3, height: 3 };
	let channelMock;
	let processTransactionMethodResponse;

	beforeEach(done => {
		// Logic
		storageStub = {
			entities: {
				Block: {
					get: sinonSandbox.stub(),
					begin: sinonSandbox.stub(),
					getOne: sinonSandbox.stub(),
					isPersisted: sinonSandbox.stub(),
					create: sinonSandbox.stub(),
					delete: sinonSandbox.stub(),
				},
				Transaction: {
					create: sinonSandbox.stub(),
					begin: sinonSandbox.stub(),
				},
			},
		};

		blockStub = sinonSandbox.stub();

		loggerStub = {
			trace: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
			debug: sinonSandbox.spy(),
		};

		busStub = {
			message: sinonSandbox.stub(),
		};

		initTransactionStub = {
			fromJson: sinonSandbox.stub(),
		};

		balancesSequenceStub = {
			add: (cb, cbp) => {
				cb(cbp);
			},
		};

		genesisBlockStub = {
			block: {
				id: '6524861224470851795',
				height: 1,
			},
		};

		channelMock = {
			invoke: sinonSandbox
				.stub()
				.withArgs('app:updateApplicationState')
				.returns(true),
			once: sinonSandbox
				.stub()
				.withArgs('app:state:updated')
				.callsArg(1),
		};

		blocksChainModule = new BlocksChain(
			loggerStub,
			blockStub,
			initTransactionStub,
			storageStub,
			genesisBlockStub,
			busStub,
			balancesSequenceStub,
			channelMock
		);

		library = BlocksChain.__get__('library');
		__private = BlocksChain.__get__('__private');

		// Module
		const tracker = {
			applyNext: sinonSandbox.stub(),
		};

		const modulesAccountsStub = {
			getAccount: sinonSandbox.stub(),
			setAccountAndGet: sinonSandbox.stub(),
		};

		const modulesBlocksStub = {
			lastBlock: {
				get: sinonSandbox.stub(),
				set: sinonSandbox.stub(),
			},
			utils: {
				loadBlocksPart: sinonSandbox.stub(),
				getBlockProgressLogger: sinonSandbox.stub().returns(tracker),
			},
			isActive: {
				set: sinonSandbox.stub(),
			},
			calculateNewBroadhash: sinonSandbox.stub().resolves({}),
		};

		const modulesRoundsStub = {
			backwardTick: sinonSandbox.stub(),
			tick: sinonSandbox.stub(),
		};

		const modulesTransactionsStub = {
			applyUnconfirmed: sinonSandbox.stub(),
			applyConfirmed: sinonSandbox.stub(),
			receiveTransactions: sinonSandbox.stub(),
			undoConfirmed: sinonSandbox.stub(),
			undoUnconfirmed: sinonSandbox.stub(),
			undoUnconfirmedList: sinonSandbox.stub(),
			removeUnconfirmedTransaction: sinonSandbox.stub(),
			onConfirmedTransactions: sinonSandbox.stub(),
			onDeletedTransactions: sinonSandbox.stub(),
		};

		processTransactionMethodResponse = {
			stateStore: {
				account: {
					finalize: sinonSandbox.stub().resolves(),
				},
				round: {
					setRoundForData: sinonSandbox.stub().resolves(),
					finalize: sinonSandbox.stub().resolves(),
				},
			},
			transactionsResponses: [
				{ status: TransactionStatus.OK },
				{ status: TransactionStatus.OK },
			],
		};

		bindingsStub = {
			modules: {
				accounts: modulesAccountsStub,
				blocks: modulesBlocksStub,
				rounds: modulesRoundsStub,
				transactions: modulesTransactionsStub,
				processTransactions: {
					applyTransactions: sinonSandbox
						.stub()
						.resolves(processTransactionMethodResponse),
					undoTransactions: sinonSandbox
						.stub()
						.resolves(processTransactionMethodResponse),
					applyGenesisTransactions: sinonSandbox
						.stub()
						.resolves(processTransactionMethodResponse),
				},
			},
		};

		// process.exit = sinonSandbox.stub().returns(0);

		blocksChainModule.onBind(bindingsStub);
		modules = BlocksChain.__get__('modules');
		done();
	});

	afterEach(() => sinonSandbox.restore());

	describe('constructor', () => {
		it('should assign params to library', async () => {
			expect(library.logger).to.eql(loggerStub);
			expect(library.storage).to.eql(storageStub);
			expect(library.genesisBlock).to.eql(genesisBlockStub);
			expect(library.bus).to.eql(busStub);
			expect(library.balancesSequence).to.eql(balancesSequenceStub);
			expect(library.logic.block).to.eql(blockStub);
			return expect(library.logic.initTransaction).to.eql(initTransactionStub);
		});

		it('should call library.logger.trace with "Blocks->Chain: Submodule initialized."', async () =>
			expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Chain: Submodule initialized.'
			));

		it('should return self', async () => {
			expect(blocksChainModule).to.be.an('object');
			expect(blocksChainModule.saveGenesisBlock).to.be.a('function');
			expect(blocksChainModule.saveBlock).to.be.a('function');
			expect(blocksChainModule.deleteBlock).to.be.a('function');
			expect(blocksChainModule.deleteFromBlockId).to.be.a('function');
			expect(blocksChainModule.applyGenesisBlock).to.be.a('function');
			expect(blocksChainModule.applyBlock).to.be.a('function');
			expect(blocksChainModule.broadcastReducedBlock).to.be.a('function');
			expect(blocksChainModule.deleteLastBlock).to.be.a('function');
			expect(blocksChainModule.recoverChain).to.be.a('function');
			return expect(blocksChainModule.onBind).to.be.a('function');
		});
	});

	describe('saveGenesisBlock', () => {
		let saveBlockTemp;
		describe('when library.storage.entities.Block.isPersisted fails', () => {
			beforeEach(() =>
				library.storage.entities.Block.isPersisted.rejects(
					'getGenesisBlockId-ERR'
				)
			);

			it('should call a callback with error', done => {
				blocksChainModule.saveGenesisBlock(err => {
					expect(err).to.equal('Blocks#saveGenesisBlock error');
					expect(loggerStub.error.args[0][0]).to.contains(
						'getGenesisBlockId-ERR'
					);
					done();
				});
			});
		});

		describe('when library.storage.entities.Block.isPersisted succeeds', () => {
			describe('if returns false (genesis block is not in database)', () => {
				beforeEach(done => {
					library.storage.entities.Block.isPersisted.resolves(false);
					saveBlockTemp = blocksChainModule.saveBlock;
					blocksChainModule.saveBlock = sinonSandbox.stub();
					done();
				});

				afterEach(done => {
					blocksChainModule.saveBlock = saveBlockTemp;
					done();
				});

				describe('when self.saveBlock fails', () => {
					beforeEach(() =>
						blocksChainModule.saveBlock.callsArgWith(1, 'saveBlock-ERR', null)
					);

					it('should call a callback with error', done => {
						blocksChainModule.saveGenesisBlock(err => {
							expect(err).to.equal('Blocks#saveGenesisBlock error');
							done();
						});
					});
				});

				describe('when self.saveBlock succeeds', () => {
					beforeEach(() =>
						blocksChainModule.saveBlock.callsArgWith(1, null, true)
					);

					it('should call a callback with  error', done => {
						blocksChainModule.saveGenesisBlock(cb => {
							expect(cb).to.equal('Blocks#saveGenesisBlock error');
							done();
						});
					});
				});
			});

			describe('if returns true', () => {
				beforeEach(() =>
					library.storage.entities.Block.isPersisted.resolves(true)
				);

				it('should call a callback with no error', done => {
					blocksChainModule.saveGenesisBlock(err => {
						expect(err).to.be.undefined;
						done();
					});
				});
			});
		});
	});

	describe('saveBlock', () => {
		let afterSaveTemp;

		beforeEach(done => {
			afterSaveTemp = __private.afterSave;
			done();
		});

		afterEach(done => {
			__private.afterSave = afterSaveTemp;
			done();
		});

		describe('when tx param is passed', () => {
			let txStub;
			beforeEach(done => {
				txStub = {
					blocks: {
						save: sinonSandbox.stub(),
					},
					transactions: {
						save: sinonSandbox.stub(),
					},
					batch: sinonSandbox.stub(),
				};
				done();
			});

			describe('when tx.batch fails', () => {
				beforeEach(() => txStub.batch.rejects('txbatch-ERR'));

				it('should call a callback with error', done => {
					blocksChainModule.saveBlock(
						blockWithTransactions,
						err => {
							expect(err).to.equal('Blocks#saveBlock error');
							done();
						},
						txStub
					);
				});
			});

			describe('when tx.batch succeeds', () => {
				beforeEach(done => {
					txStub.batch.resolves();
					__private.afterSave = sinonSandbox.stub().callsArgWith(1, null, true);
					done();
				});

				it('should call __private.afterSave', done => {
					blocksChainModule.saveBlock(
						blockWithTransactions,
						async () => {
							expect(__private.afterSave.calledOnce).to.be.true;
							done();
						},
						txStub
					);
				});
			});
		});

		describe('when tx param is not passed', () => {
			let txStub;

			beforeEach(done => {
				txStub = {
					blocks: {
						save: sinonSandbox.stub(),
					},
					transactions: {
						save: sinonSandbox.stub(),
					},
					batch: sinonSandbox.stub(),
				};
				storageStub.entities.Block.begin.callsArgWith(1, txStub);
				done();
			});

			describe('when tx.batch fails', () => {
				beforeEach(() => txStub.batch.rejects('txbatch-ERR'));

				it('should call a callback with error', done => {
					blocksChainModule.saveBlock(blockWithTransactions, err => {
						expect(err).to.equal('Blocks#saveBlock error');
						done();
					});
				});
			});

			describe('when tx.batch succeeds', () => {
				beforeEach(done => {
					txStub.batch.resolves();
					__private.afterSave = sinonSandbox.stub().callsArgWith(1, null, true);
					done();
				});

				it('should call __private.afterSave', done => {
					blocksChainModule.saveBlock(blockWithTransactions, async () => {
						expect(__private.afterSave.calledOnce).to.be.true;
						done();
					});
				});
			});
		});
	});

	describe('__private.afterSave', () => {
		it('should call afterSave for all transactions', done => {
			const spy = sinonSandbox.spy();
			__private.afterSave(blockWithTransactions, spy);
			expect(spy.calledOnce).to.be.true;
			done();
		});
	});

	describe('deleteBlock', () => {
		describe('when library.storage.entities.Block.delete fails', () => {
			beforeEach(() =>
				library.storage.entities.Block.delete.rejects('deleteBlock-ERR')
			);

			it('should call a callback with error', done => {
				blocksChainModule.deleteBlock(
					1,
					err => {
						expect(err).to.equal('Blocks#deleteBlock error');
						expect(loggerStub.error.args[0][0]).to.contains('deleteBlock-ERR');
						done();
					},
					storageStub.entities.Block.begin
				);
			});
		});

		describe('when library.storage.entities.Block.delete succeeds', () => {
			beforeEach(() => library.storage.entities.Block.delete.resolves(true));

			it('should call a callback with no error', done => {
				blocksChainModule.deleteBlock(
					1,
					async () => {
						done();
					},
					storageStub.entities.Block.begin
				);
			});
		});
	});

	describe('deleteFromBlockId', () => {
		describe('when library.storage.entities.Block.getOne fails', () => {
			beforeEach(() =>
				library.storage.entities.Block.getOne.rejects('deleteFromBlockId-ERR')
			);

			it('should call a callback with error', done => {
				blocksChainModule.deleteFromBlockId(1, err => {
					expect(err).to.equal('Blocks#deleteFromBlockId error');
					expect(loggerStub.error.args[0][0]).to.contains(
						'deleteFromBlockId-ERR'
					);
					done();
				});
			});
		});

		describe('when library.storage.entities.Block.delete fails', () => {
			beforeEach(() => {
				library.storage.entities.Block.getOne.resolves({ height: 1 });
				return library.storage.entities.Block.delete.rejects(
					'deleteFromBlockId-ERR'
				);
			});

			it('should call a callback with error', done => {
				blocksChainModule.deleteFromBlockId(1, err => {
					expect(err).to.equal('Blocks#deleteFromBlockId error');
					expect(loggerStub.error.args[0][0]).to.contains(
						'deleteFromBlockId-ERR'
					);
					done();
				});
			});
		});

		describe('when library.storage.entities.Block.delete succeeds', () => {
			beforeEach(() => {
				library.storage.entities.Block.getOne.resolves({ height: 1 });
				return library.storage.entities.Block.delete.resolves(true);
			});

			it('should call a callback with no error and res data', done => {
				blocksChainModule.deleteFromBlockId(1, (err, res) => {
					expect(err).to.be.null;
					expect(res).to.be.true;
					done();
				});
			});
		});
	});

	describe('applyGenesisBlock', () => {
		let applyTransactionTemp;

		beforeEach(done => {
			modules.rounds.tick.callsArgWith(1, null, true);
			applyTransactionTemp = __private.applyGenesisTransactions;
			__private.applyGenesisTransactions = sinonSandbox.stub();
			done();
		});

		afterEach(done => {
			__private.applyGenesisTransactions = applyTransactionTemp;
			done();
		});

		describe('when block.transactions is not empty', () => {
			describe('when modules.accounts.setAccountAndGet succeeds', () => {
				describe('when __private.applyTransactions succeeds', () => {
					beforeEach(() =>
						__private.applyGenesisTransactions.callsArgWith(1, null, true)
					);

					it('modules.rouds.tick should call a callback', done => {
						blocksChainModule.applyGenesisBlock(
							blockWithTransactions,
							async () => {
								expect(__private.applyGenesisTransactions.callCount).to.equal(
									1
								);
								expect(modules.blocks.lastBlock.set.calledOnce).to.be.true;
								expect(modules.blocks.lastBlock.set.args[0][0]).to.deep.equal(
									blockWithTransactions
								);
								expect(modules.rounds.tick.args[0][0]).to.deep.equal(
									blockWithTransactions
								);
								done();
							}
						);
					});
				});
			});
		});
	});

	describe('__private.applyConfirmedStep', () => {
		// Arrange
		const filledBlock = {
			id: 1,
			height: 1,
			transactions: [{ id: 21 }, { id: 22 }],
		};

		it('should return when block.transactions includes no transactions', async () => {
			// Arrange
			const emptyBlock = {
				id: 1,
				height: 1,
				transactions: [],
			};
			// Act && Assert
			return expect(__private.applyConfirmedStep(emptyBlock)).to.eventually.be
				.undefined;
		});

		it('should call modules.processTransactions.applyConfirmedStep', async () => {
			// Arrange
			const originalInertTransactions = global.exceptions.inertTransactions;
			global.exceptions.inertTransactions = [filledBlock.transactions[0].id];
			const dummyTx = {};

			// Act
			await __private.applyConfirmedStep(filledBlock, dummyTx);

			// Cleanup
			global.exceptions.inertTransactions = originalInertTransactions;

			// Assert
			return expect(
				modules.processTransactions.applyTransactions
			).to.have.been.calledWith([filledBlock.transactions[1]], dummyTx);
		});

		it('should throw error when errors exist in unappliedTransactionResponse', async () => {
			// Arrange
			const errors = [new Error('#Test Error')];
			modules.processTransactions.applyTransactions.resolves({
				...processTransactionMethodResponse,
				transactionsResponses: [
					{ status: TransactionStatus.OK },
					{ status: TransactionStatus.FAIL, errors },
				],
			});

			try {
				// Act
				await __private.applyConfirmedStep(filledBlock);
			} catch (err) {
				// Assert
				expect(err).to.be.equal(errors);
			}
		});

		it('should call stateStore.account.finalize', async () => {
			// Act
			await __private.applyConfirmedStep(filledBlock);

			// Assert
			return expect(
				processTransactionMethodResponse.stateStore.account.finalize.calledOnce
			).to.be.true;
		});

		it('should call stateStore.round.setRoundForData with correct parameters', async () => {
			// Arrange
			const round = slots.calcRound(filledBlock.height);
			// Act
			await __private.applyConfirmedStep(filledBlock);

			// Assert
			return expect(
				processTransactionMethodResponse.stateStore.round.setRoundForData
			).to.have.been.calledWith(round);
		});

		it('should call stateStore.round.finalize', async () => {
			// Act
			await __private.applyConfirmedStep(filledBlock);

			// Assert
			return expect(
				processTransactionMethodResponse.stateStore.round.finalize.calledOnce
			).to.be.true;
		});
	});

	describe('__private.saveBlockStep', () => {
		let saveBlockTemp;

		beforeEach(done => {
			saveBlockTemp = blocksChainModule.saveBlock;
			blocksChainModule.saveBlock = sinonSandbox
				.stub()
				.callsArgWith(1, null, true);
			modules.rounds.tick.callsArgWith(1, null, true);
			process.emit = sinonSandbox.stub();
			storageStub.entities.Block.begin = (desc, tx) => tx();
			done();
		});

		afterEach(done => {
			blocksChainModule.saveBlock = saveBlockTemp;
			done();
		});

		describe('when saveBlock is true', () => {
			describe('when self.saveBlock fails', () => {
				beforeEach(() =>
					blocksChainModule.saveBlock.callsArgWith(1, 'saveBlock-ERR', null)
				);

				it('should call a callback with error', done => {
					__private
						.saveBlockStep(
							blockWithTransactions,
							true,
							storageStub.entities.Block.begin
						)
						.catch(err => {
							expect(err).instanceOf(Error);
							expect(err.message).to.equal('Failed to save block');
							expect(loggerStub.error.args[0][0]).to.contains(
								'Failed to save block'
							);
							expect(loggerStub.error.args[0][1]).to.contains('saveBlock-ERR');
							expect(loggerStub.error.args[1][0]).to.equal('Block');
							expect(loggerStub.error.args[1][1]).to.deep.equal(
								blockWithTransactions
							);
							expect(blocksChainModule.saveBlock.args[0][0]).to.deep.equal(
								blockWithTransactions
							);
							expect(modules.blocks.lastBlock.set.calledOnce).to.be.false;
							done();
						});
				});
			});

			describe('when self.saveBlock succeeds', () => {
				beforeEach(() =>
					blocksChainModule.saveBlock.callsArgWith(1, null, true)
				);

				afterEach(() => {
					expect(loggerStub.debug.args[0][0]).to.contains(
						'Block applied correctly with 3 transactions'
					);
					return expect(blocksChainModule.saveBlock.args[0][0]).to.deep.equal(
						blockWithTransactions
					);
				});

				describe('when modules.rounds.tick fails', () => {
					beforeEach(() =>
						modules.rounds.tick.callsArgWith(1, 'tick-ERR', null)
					);

					it('should call a callback with error', done => {
						__private
							.saveBlockStep(
								blockWithTransactions,
								true,
								storageStub.entities.Block.begin
							)
							.catch(err => {
								expect(err).to.equal('tick-ERR');
								expect(library.bus.message.calledOnce).to.be.false;
								done();
							});
					});
				});

				describe('when modules.rounds.tick succeeds', () => {
					beforeEach(() => modules.rounds.tick.callsArgWith(1, null, true));

					it('should call a callback with no error', done => {
						__private
							.saveBlockStep(
								blockWithTransactions,
								true,
								storageStub.entities.Block.begin
							)
							.then(resolve => {
								expect(resolve).to.be.undefined;
								expect(library.bus.message.calledOnce).to.be.true;
								expect(library.bus.message.args[0][0]).to.deep.equal(
									'newBlock'
								);
								expect(library.bus.message.args[0][1]).to.deep.equal(
									blockWithTransactions
								);
								done();
							});
					});
				});
			});
		});

		describe('when saveBlock is false', () => {
			describe('when modules.rounds.tick fails', () => {
				beforeEach(() => modules.rounds.tick.callsArgWith(1, 'tick-ERR', null));

				it('should call a callback with error', done => {
					__private
						.saveBlockStep(
							blockWithTransactions,
							true,
							storageStub.entities.Block.begin
						)
						.catch(err => {
							expect(err).to.equal('tick-ERR');
							expect(library.bus.message.calledOnce).to.be.false;
							done();
						});
				});
			});

			describe('when modules.rounds.tick succeeds', () => {
				beforeEach(() => modules.rounds.tick.callsArgWith(1, null, true));

				it('should call a callback with no error', done => {
					__private
						.saveBlockStep(
							blockWithTransactions,
							true,
							storageStub.entities.Block.begin
						)
						.then(resolve => {
							expect(resolve).to.be.undefined;
							expect(library.bus.message.calledOnce).to.be.true;
							expect(library.bus.message.args[0][0]).to.deep.equal('newBlock');
							expect(library.bus.message.args[0][1]).to.deep.equal(
								blockWithTransactions
							);
							done();
						});
				});
			});
		});
	});

	describe('applyBlock', () => {
		let privateTemp;
		let txTemp;

		beforeEach(done => {
			txTemp = storageStub.entities.Block.begin;
			privateTemp = __private;
			process.emit = sinonSandbox.stub();
			modules.transactions.undoUnconfirmedList.callsArgWith(0, null, true);
			__private.applyConfirmedStep = sinonSandbox
				.stub()
				.resolves(blockWithTransactions);
			__private.saveBlockStep = sinonSandbox
				.stub()
				.resolves(blockWithTransactions);
			done();
		});

		afterEach(done => {
			expect(__private.applyConfirmedStep).calledWith(
				blockWithTransactions,
				txTemp
			);
			expect(__private.saveBlockStep).calledWith(
				blockWithTransactions,
				true,
				txTemp
			);
			expect(modules.blocks.isActive.set.calledTwice).to.be.true;
			__private = privateTemp;
			storageStub.entities.Block.begin = txTemp;
			done();
		});

		describe('when storageStub.entities.Block.begin fails', () => {
			afterEach(() => {
				expect(modules.blocks.isActive.set.args[0][0]).to.be.true;
				return expect(modules.blocks.isActive.set.args[1][0]).to.be.false;
			});

			describe('when reason !== Snapshot finished', () => {
				beforeEach(done => {
					storageStub.entities.Block.begin = (desc, tx) => tx(txTemp.rejects());
					__private.saveBlockStep.rejects('Chain:applyBlock-ERR');
					done();
				});

				it('should call a callback with error', done => {
					blocksChainModule.applyBlock(blockWithTransactions, true, err => {
						expect(err.name).to.equal('Chain:applyBlock-ERR');
						expect(process.emit.callCount).to.equal(0);
						done();
					});
				});
			});
		});

		describe('when storageStub.entities.Block.begin succeeds', () => {
			beforeEach(done => {
				storageStub.entities.Block.begin = (desc, tx) => tx(txTemp.resolves());
				done();
			});
			it('should call a callback with no error', done => {
				blocksChainModule.applyBlock(blockWithTransactions, true, err => {
					expect(err).to.be.null;
					expect(modules.blocks.isActive.set.callCount).to.equal(2);
					done();
				});
			});
		});
	});

	describe('broadcastReducedBlock', () => {
		it('should call library.bus.message with reducedBlock and broadcast', async () => {
			blocksChainModule.broadcastReducedBlock(blockReduced, true);
			expect(library.bus.message.calledOnce).to.be.true;
			expect(library.bus.message.args[0][0]).to.equal('broadcastBlock');
			expect(library.bus.message.args[0][1]).to.deep.equal(blockReduced);
			return expect(library.bus.message.args[0][2]).to.be.true;
		});
	});

	describe('__private.loadSecondLastBlockStep', () => {
		let tx;
		beforeEach(() => {
			tx = sinonSandbox.stub();
			return modules.blocks.utils.loadBlocksPart.callsArgWith(
				1,
				'loadBlocksPart-ERR',
				null
			);
		});

		describe('when modules.blocks.utils.loadBlocksPart fails', () => {
			describe('if returns error', () => {
				it('should call a callback with returned error', done => {
					__private.loadSecondLastBlockStep(blockReduced.id, tx).catch(err => {
						expect(err).to.equal('loadBlocksPart-ERR');
						done();
					});
				});
			});

			describe('if returns empty', () => {
				beforeEach(() =>
					modules.blocks.utils.loadBlocksPart.callsArgWith(1, null, [])
				);

				it('should call a callback with error "previousBlock is null"', done => {
					__private.loadSecondLastBlockStep(blockReduced.id, tx).catch(err => {
						expect(err.message).to.equal('previousBlock is null');
						done();
					});
				});
			});
		});

		describe('when modules.blocks.utils.loadBlocksPart succeeds', () => {
			beforeEach(() =>
				modules.blocks.utils.loadBlocksPart.callsArgWith(1, null, [
					{ id: 2, height: 2 },
				])
			);
		});
	});

	// TODO: add new tests once improve_transaction_eficiency is done
	describe('__private.undoConfirmedStep', () => {
		// Arrange
		const filledBlock = {
			id: 1,
			height: 1,
			transactions: [{ id: 21 }, { id: 22 }],
		};

		it('should return when block.transactions includes no transactions', async () => {
			// Arrange
			const emptyBlock = {
				id: 1,
				height: 1,
				transactions: [],
			};
			// Act && Assert
			return expect(__private.undoConfirmedStep(emptyBlock)).to.eventually.be
				.undefined;
		});

		it('should call modules.processTransactions.undoTransactions', async () => {
			// Arrange
			const originalInertTransactions = global.exceptions.inertTransactions;
			global.exceptions.inertTransactions = [filledBlock.transactions[0].id];
			const dummyTx = {};

			// Act
			await __private.undoConfirmedStep(filledBlock, dummyTx);

			// Cleanup
			global.exceptions.inertTransactions = originalInertTransactions;

			// Assert
			return expect(
				modules.processTransactions.undoTransactions
			).to.have.been.calledWith([filledBlock.transactions[1]], dummyTx);
		});

		it('should throw error when errors exist in unappliedTransactionResponse', async () => {
			// Arrange
			const errors = [new Error('#Test Error')];
			modules.processTransactions.undoTransactions.resolves({
				...processTransactionMethodResponse,
				transactionsResponses: [
					{ status: TransactionStatus.OK },
					{ status: TransactionStatus.FAIL, errors },
				],
			});

			try {
				// Act
				await __private.undoConfirmedStep(filledBlock);
			} catch (err) {
				// Assert
				expect(err).to.be.equal(errors);
			}
		});

		it('should call stateStore.account.finalize', async () => {
			// Act
			await __private.undoConfirmedStep(filledBlock);

			// Assert
			return expect(
				processTransactionMethodResponse.stateStore.account.finalize.calledOnce
			).to.be.true;
		});

		it('should call stateStore.round.setRoundForData with correct parameters', async () => {
			// Arrange
			const round = slots.calcRound(filledBlock.height);
			// Act
			await __private.undoConfirmedStep(filledBlock);

			// Assert
			return expect(
				processTransactionMethodResponse.stateStore.round.setRoundForData
			).to.have.been.calledWith(round);
		});

		it('should call stateStore.round.finalize', async () => {
			// Act
			await __private.undoConfirmedStep(filledBlock);

			// Assert
			return expect(
				processTransactionMethodResponse.stateStore.round.finalize.calledOnce
			).to.be.true;
		});
	});

	describe('__private.backwardTickStep', () => {
		let tx;
		describe('when modules.rounds.backwardTick fails', () => {
			beforeEach(() =>
				modules.rounds.backwardTick.callsArgWith(2, 'backwardTick-ERR', null)
			);

			it('should reject the promise with "backwardTick-ERR"', done => {
				__private
					.backwardTickStep(
						blockWithEmptyTransactions,
						blockWithTransactions,
						tx
					)
					.catch(err => {
						expect(err).to.equal('backwardTick-ERR');
						done();
					});
			});
		});

		describe('when modules.rounds.backwardTick succeeds', () => {
			beforeEach(done => {
				modules.rounds.backwardTick.callsArgWith(2, null);
				done();
			});

			it('should resolve the promise', async () =>
				__private.backwardTickStep(
					blockWithTransactions,
					blockWithTransactions,
					tx
				));
		});
	});

	describe('__private.deleteBlockStep', () => {
		let deleteBlockTemp;
		let tx;
		beforeEach(done => {
			deleteBlockTemp = blocksChainModule.deleteBlock;
			blocksChainModule.deleteBlock = sinonSandbox.stub();
			done();
		});

		afterEach(done => {
			blocksChainModule.deleteBlock = deleteBlockTemp;
			done();
		});

		describe('when self.deleteBlock fails', () => {
			beforeEach(() =>
				blocksChainModule.deleteBlock.callsArgWith(1, 'deleteBlock-ERR', null)
			);

			it('should reject promise with "deleteBlock-ERR"', done => {
				__private.deleteBlockStep(blockWithEmptyTransactions, tx).catch(err => {
					expect(err).to.equal('deleteBlock-ERR');
					done();
				});
			});
		});

		describe('when self.deleteBlock succeeds', () => {
			beforeEach(() =>
				blocksChainModule.deleteBlock.callsArgWith(1, null, true)
			);

			it('should resolve promise', done => {
				__private.deleteBlockStep(blockWithEmptyTransactions, tx).then(done);
			});
		});
	});

	describe('__private.popLastBlock', () => {
		describe('when storageStub.entities.Block.begin fails', () => {
			beforeEach(done => {
				storageStub.entities.Block.begin.rejects('db-tx_ERR');
				done();
			});

			it('should call a callback with proper error message', done => {
				__private.popLastBlock(blockWithTransactions, err => {
					expect(err.name).to.eql('db-tx_ERR');
					done();
				});
			});
		});

		describe('when storageStub.entities.Block.begin passes', () => {
			beforeEach(done => {
				storageStub.entities.Block.begin.resolves('savedBlock');
				done();
			});

			it('should call a callback', done => {
				__private.popLastBlock(blockWithTransactions, err => {
					expect(err).to.be.null;
					done();
				});
			});
		});
	});

	describe('deleteLastBlock', () => {
		let popLastBlockTemp;

		beforeEach(done => {
			popLastBlockTemp = __private.popLastBlock;
			__private.popLastBlock = sinonSandbox.stub();
			done();
		});

		afterEach(done => {
			__private.popLastBlock = popLastBlockTemp;
			expect(modules.blocks.lastBlock.get.calledOnce).to.be.true;
			expect(loggerStub.warn.args[0][0]).to.equal('Deleting last block');
			done();
		});

		describe('when lastBlock.height = 1', () => {
			beforeEach(() =>
				modules.blocks.lastBlock.get.returns(genesisBlockWithTransactions)
			);

			it('should call a callback with error "Cannot delete genesis block', done => {
				blocksChainModule.deleteLastBlock(err => {
					expect(err).to.equal('Cannot delete genesis block');
					expect(loggerStub.warn.args[0][1]).to.deep.equal(
						genesisBlockWithTransactions
					);
					done();
				});
			});
		});

		describe('when lastBlock.height != 1', () => {
			beforeEach(() => {
				modules.blocks.lastBlock.set.returns(blockWithTransactions);
				return modules.blocks.lastBlock.get.returns(blockWithTransactions);
			});

			describe('when __private.popLastBlock fails', () => {
				beforeEach(() =>
					__private.popLastBlock.callsArgWith(1, 'popLastBlock-ERR', true)
				);

				it('should call a callback with error', done => {
					blocksChainModule.deleteLastBlock(err => {
						expect(err).to.equal('popLastBlock-ERR');
						expect(loggerStub.error.args[0][0]).to.equal(
							'Error deleting last block'
						);
						expect(loggerStub.error.args[0][1]).to.deep.equal(
							blockWithTransactions
						);
						done();
					});
				});
			});

			describe('when __private.popLastBlock succeeds', () => {
				it('should return previousBlock', done => {
					// Arrange
					const previousBlock = { id: 5, height: 5 };
					__private.popLastBlock.callsArgWith(1, null, previousBlock);
					modules.blocks.lastBlock.set.returns(previousBlock);

					// Act
					blocksChainModule.deleteLastBlock((err, block) => {
						expect(err).to.equal(null);
						expect(modules.blocks.lastBlock.set).to.be.calledWith(
							previousBlock
						);
						expect(block).to.equal(previousBlock);
						done();
					});
				});
			});
		});
	});

	describe('recoverChain', () => {
		let deleteLastBlockTemp;

		beforeEach(done => {
			deleteLastBlockTemp = blocksChainModule.deleteLastBlock;
			done();
		});

		afterEach(done => {
			expect(loggerStub.warn.args[0][0]).to.equal(
				'Chain comparison failed, starting recovery'
			);
			blocksChainModule.deleteLastBlock = deleteLastBlockTemp;
			done();
		});

		describe('when self.deleteLastBlock fails', () => {
			beforeEach(done => {
				blocksChainModule.deleteLastBlock = sinonSandbox
					.stub()
					.callsArgWith(0, 'deleteLastBlock-ERR', null);
				done();
			});

			it('should call a callback with error', done => {
				blocksChainModule.recoverChain(err => {
					expect(err).to.equal('deleteLastBlock-ERR');
					expect(loggerStub.error.args[0][0]).to.equal('Recovery failed');
					done();
				});
			});
		});

		describe('when self.deleteLastBlock succeeds', () => {
			beforeEach(done => {
				blocksChainModule.deleteLastBlock = sinonSandbox
					.stub()
					.callsArgWith(0, null, { id: 1 });
				done();
			});

			it('should call a callback with error = null', done => {
				blocksChainModule.recoverChain(err => {
					expect(err).to.be.null;
					expect(loggerStub.info.args[0][0]).to.equal(
						'Recovery complete, new last block'
					);
					expect(loggerStub.info.args[0][1]).to.equal(1);
					done();
				});
			});
		});
	});

	describe('onBind', () => {
		beforeEach(async () => {
			loggerStub.trace.resetHistory();
			__private.loaded = false;
			blocksChainModule.onBind(bindingsStub);
		});

		it('should call library.logger.trace with "Blocks->Chain: Shared modules bind."', async () =>
			expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Chain: Shared modules bind.'
			));

		it('should assign params to modules', async () => {
			expect(modules.accounts).to.equal(bindingsStub.modules.accounts);
			expect(modules.blocks).to.equal(bindingsStub.modules.blocks);
			expect(modules.rounds).to.equal(bindingsStub.modules.rounds);
			return expect(modules.transactions).to.equal(
				bindingsStub.modules.transactions
			);
		});

		it('should set __private.loaded to true', async () =>
			expect(__private.loaded).to.be.true);
	});
});
