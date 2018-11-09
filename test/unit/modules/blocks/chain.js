/* eslint-disable mocha/no-pending-tests, mocha/no-skipped-tests */
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

const BlocksChain = rewire('../../../../modules/blocks/chain.js');

describe('blocks/chain', () => {
	let __private;
	let library;
	let modules;
	let blocksChainModule;
	let dbStub;
	let loggerStub;
	let blockStub;
	let transactionStub;
	let busStub;
	let balancesSequenceStub;
	let genesisBlockStub;
	let modulesStub;

	const blockWithEmptyTransactions = {
		id: 1,
		height: 1,
		transactions: [],
	};
	const blockWithUndefinedTransactions = {
		id: 1,
		height: 1,
		transactions: undefined,
	};
	const blockWithTransactions = {
		id: 3,
		height: 3,
		transactions: [
			{ id: 5, type: 3, senderPublicKey: 'a', amount: '1000000', fee: '10000' },
			{ id: 6, type: 2, senderPublicKey: 'b', amount: '1000000', fee: '10000' },
			{ id: 7, type: 1, senderPublicKey: 'c', amount: '1000000', fee: '10000' },
		],
	};
	const genesisBlockWithTransactions = {
		id: 1,
		height: 1,
		transactions: [
			{ id: 5, type: 3, senderPublicKey: 'a', amount: '1000000', fee: '10000' },
			{ id: 6, type: 2, senderPublicKey: 'b', amount: '1000000', fee: '10000' },
			{ id: 7, type: 1, senderPublicKey: 'c', amount: '1000000', fee: '10000' },
		],
	};
	const blockReduced = { id: 3, height: 3 };

	beforeEach(done => {
		// Logic
		dbStub = {
			blocks: {
				getGenesisBlockId: sinonSandbox.stub(),
				deleteBlock: sinonSandbox.stub(),
				deleteAfterBlock: sinonSandbox.stub(),
			},
			tx: sinonSandbox.stub(),
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

		transactionStub = {
			afterSave: sinonSandbox.stub().callsArgWith(1, null, true),
			undoUnconfirmed: sinonSandbox.stub(),
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

		blocksChainModule = new BlocksChain(
			loggerStub,
			blockStub,
			transactionStub,
			dbStub,
			genesisBlockStub,
			busStub,
			balancesSequenceStub
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
		};

		const modulesRoundsStub = {
			backwardTick: sinonSandbox.stub(),
			tick: sinonSandbox.stub(),
		};

		const modulesSystemStub = {
			update: sinonSandbox.stub(),
		};

		const modulesTransportStub = {
			broadcastHeaders: sinonSandbox.stub(),
		};

		const modulesTransactionsStub = {
			applyUnconfirmed: sinonSandbox.stub(),
			applyConfirmed: sinonSandbox.stub(),
			receiveTransactions: sinonSandbox.stub(),
			undoConfirmed: sinonSandbox.stub(),
			undoUnconfirmed: sinonSandbox.stub(),
			undoUnconfirmedList: sinonSandbox.stub(),
			removeUnconfirmedTransaction: sinonSandbox.stub(),
		};

		modulesStub = {
			accounts: modulesAccountsStub,
			blocks: modulesBlocksStub,
			rounds: modulesRoundsStub,
			transactions: modulesTransactionsStub,
			system: modulesSystemStub,
			transport: modulesTransportStub,
		};

		process.exit = sinonSandbox.stub().returns(0);

		blocksChainModule.onBind(modulesStub);
		modules = BlocksChain.__get__('modules');
		done();
	});

	afterEach(() => {
		return sinonSandbox.restore();
	});

	describe('constructor', () => {
		it('should assign params to library', () => {
			expect(library.logger).to.eql(loggerStub);
			expect(library.db).to.eql(dbStub);
			expect(library.genesisBlock).to.eql(genesisBlockStub);
			expect(library.bus).to.eql(busStub);
			expect(library.balancesSequence).to.eql(balancesSequenceStub);
			expect(library.logic.block).to.eql(blockStub);
			return expect(library.logic.transaction).to.eql(transactionStub);
		});

		it('should call library.logger.trace with "Blocks->Chain: Submodule initialized."', () => {
			return expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Chain: Submodule initialized.'
			);
		});

		it('should return self', () => {
			expect(blocksChainModule).to.be.an('object');
			expect(blocksChainModule.saveGenesisBlock).to.be.a('function');
			expect(blocksChainModule.saveBlock).to.be.a('function');
			expect(blocksChainModule.deleteBlock).to.be.a('function');
			expect(blocksChainModule.deleteAfterBlock).to.be.a('function');
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
		describe('when library.db.blocks.getGenesisBlockId fails', () => {
			beforeEach(() => {
				return library.db.blocks.getGenesisBlockId.rejects(
					'getGenesisBlockId-ERR'
				);
			});

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

		describe('when library.db.blocks.getGenesisBlockId succeeds', () => {
			describe('if returns empty row (genesis block is not in database)', () => {
				beforeEach(done => {
					library.db.blocks.getGenesisBlockId.resolves([]);
					saveBlockTemp = blocksChainModule.saveBlock;
					blocksChainModule.saveBlock = sinonSandbox.stub();
					done();
				});

				afterEach(done => {
					blocksChainModule.saveBlock = saveBlockTemp;
					done();
				});

				describe('when self.saveBlock fails', () => {
					beforeEach(() => {
						return blocksChainModule.saveBlock.callsArgWith(
							1,
							'saveBlock-ERR',
							null
						);
					});

					it('should call a callback with error', done => {
						blocksChainModule.saveGenesisBlock(err => {
							expect(err).to.equal('saveBlock-ERR');
							done();
						});
					});
				});

				describe('when self.saveBlock succeeds', () => {
					beforeEach(() => {
						return blocksChainModule.saveBlock.callsArgWith(1, null, true);
					});

					it('should call a callback with no error', done => {
						blocksChainModule.saveGenesisBlock(cb => {
							expect(cb).to.be.null;
							done();
						});
					});
				});
			});

			describe('if returns row', () => {
				beforeEach(() => {
					return library.db.blocks.getGenesisBlockId.resolves([{ id: 1 }]);
				});

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
				beforeEach(() => {
					return txStub.batch.rejects('txbatch-ERR');
				});

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
						() => {
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
				library.db.tx.callsArgWith(1, txStub);
				done();
			});

			describe('when tx.batch fails', () => {
				beforeEach(() => {
					return txStub.batch.rejects('txbatch-ERR');
				});

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
					blocksChainModule.saveBlock(blockWithTransactions, () => {
						expect(__private.afterSave.calledOnce).to.be.true;
						done();
					});
				});
			});
		});
	});

	describe('__private.afterSave', () => {
		it('should call afterSave for all transactions', done => {
			__private.afterSave(blockWithTransactions, () => {
				expect(library.logic.transaction.afterSave.callCount).to.equal(3);
				expect(library.bus.message.calledOnce).to.be.true;
				expect(library.bus.message.args[0][0]).to.equal('transactionsSaved');
				expect(library.bus.message.args[0][1]).to.deep.equal(
					blockWithTransactions.transactions
				);
				done();
			});
		});
	});

	describe('deleteBlock', () => {
		describe('when library.db.blocks.deleteBlock fails', () => {
			beforeEach(() => {
				return library.db.blocks.deleteBlock.rejects('deleteBlock-ERR');
			});

			it('should call a callback with error', done => {
				blocksChainModule.deleteBlock(
					1,
					err => {
						expect(err).to.equal('Blocks#deleteBlock error');
						expect(loggerStub.error.args[0][0]).to.contains('deleteBlock-ERR');
						done();
					},
					library.db
				);
			});
		});

		describe('when library.db.blocks.deleteBlock succeeds', () => {
			beforeEach(() => {
				return library.db.blocks.deleteBlock.resolves(true);
			});

			it('should call a callback with no error', done => {
				blocksChainModule.deleteBlock(
					1,
					() => {
						done();
					},
					library.db
				);
			});
		});
	});

	describe('deleteAfterBlock', () => {
		describe('when library.db.blocks.deleteAfterBlock fails', () => {
			beforeEach(() => {
				return library.db.blocks.deleteAfterBlock.rejects(
					'deleteAfterBlock-ERR'
				);
			});

			it('should call a callback with error', done => {
				blocksChainModule.deleteAfterBlock(1, err => {
					expect(err).to.equal('Blocks#deleteAfterBlock error');
					expect(loggerStub.error.args[0][0]).to.contains(
						'deleteAfterBlock-ERR'
					);
					done();
				});
			});
		});

		describe('when library.db.blocks.deleteAfterBlock succeeds', () => {
			beforeEach(() => {
				return library.db.blocks.deleteAfterBlock.resolves(true);
			});

			it('should call a callback with no error and res data', done => {
				blocksChainModule.deleteAfterBlock(1, (err, res) => {
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
			applyTransactionTemp = __private.applyTransaction;
			__private.applyTransaction = sinonSandbox.stub();
			done();
		});

		afterEach(done => {
			__private.applyTransaction = applyTransactionTemp;
			done();
		});

		describe('when block.transactions is empty', () => {
			it('modules.rouds.tick should call a callback', done => {
				blocksChainModule.applyGenesisBlock(blockWithEmptyTransactions, () => {
					expect(modules.blocks.utils.getBlockProgressLogger.calledOnce).to.be
						.true;
					expect(modules.blocks.lastBlock.set.calledOnce).to.be.true;
					expect(modules.blocks.lastBlock.set.args[0][0]).to.deep.equal(
						blockWithEmptyTransactions
					);
					expect(modules.rounds.tick.args[0][0]).to.deep.equal(
						blockWithEmptyTransactions
					);
					done();
				});
			});
		});

		describe('when block.transactions is not empty', () => {
			describe('when modules.accounts.setAccountAndGet fails', () => {
				beforeEach(() => {
					process.emit = sinonSandbox.stub();
					return modules.accounts.setAccountAndGet.callsArgWith(
						1,
						'setAccountAndGet-ERR',
						true
					);
				});

				it('should call process.exit with 0', done => {
					blocksChainModule.applyGenesisBlock(blockWithTransactions, result => {
						expect(modules.blocks.utils.getBlockProgressLogger.calledOnce).to.be
							.true;
						expect(process.emit).to.have.been.calledOnce;
						expect(process.emit).to.have.been.calledWith(
							'cleanup',
							'setAccountAndGet-ERR'
						);
						expect(result.message).to.equal('setAccountAndGet-ERR');
						done();
					});
				});
			});

			describe('when modules.accounts.setAccountAndGet succeeds', () => {
				beforeEach(() => {
					return modules.accounts.setAccountAndGet.callsArgWith(1, null, true);
				});

				describe('when __private.applyTransaction fails', () => {
					beforeEach(() => {
						return __private.applyTransaction.callsArgWith(
							3,
							'applyTransaction-ERR',
							null
						);
					});

					it('should call a callback with proper error message', done => {
						blocksChainModule.applyGenesisBlock(
							blockWithTransactions,
							result => {
								expect(
									modules.blocks.utils.getBlockProgressLogger.callCount
								).to.equal(1);
								expect(result).to.equal('applyTransaction-ERR');
								done();
							}
						);
					});
				});

				describe('when __private.applyTransaction succeeds', () => {
					beforeEach(() => {
						return __private.applyTransaction.callsArgWith(3, null, true);
					});

					it('modules.rouds.tick should call a callback', done => {
						blocksChainModule.applyGenesisBlock(blockWithTransactions, () => {
							expect(modules.blocks.utils.getBlockProgressLogger.calledOnce).to
								.be.true;
							expect(__private.applyTransaction.callCount).to.equal(3);
							expect(modules.blocks.lastBlock.set.calledOnce).to.be.true;
							expect(modules.blocks.lastBlock.set.args[0][0]).to.deep.equal(
								blockWithTransactions
							);
							expect(modules.rounds.tick.args[0][0]).to.deep.equal(
								blockWithTransactions
							);
							done();
						});
					});
				});
			});
		});
	});

	describe('__private.applyTransaction', () => {
		describe('when modules.transactions.applyUnconfirmed fails', () => {
			beforeEach(() => {
				return modules.transactions.applyUnconfirmed.callsArgWith(
					2,
					'applyUnconfirmed-ERR',
					null
				);
			});

			it('should call a callback with error', done => {
				__private.applyTransaction(
					blockWithTransactions,
					{ id: 1, type: 1 },
					'a1',
					err => {
						expect(err.message).to.equal('applyUnconfirmed-ERR');
						expect(err.transaction).to.deep.equal({ id: 1, type: 1 });
						expect(err.block).to.deep.equal(blockWithTransactions);
						done();
					}
				);
			});
		});

		describe('when modules.transactions.applyUnconfirmed succeeds', () => {
			beforeEach(() => {
				return modules.transactions.applyUnconfirmed.callsArgWith(
					2,
					null,
					true
				);
			});

			describe('when modules.transactions.applyConfirmed fails', () => {
				beforeEach(() => {
					return modules.transactions.applyConfirmed.callsArgWith(
						3,
						'apply-ERR',
						null
					);
				});

				it('should call a callback with error', done => {
					__private.applyTransaction(
						blockWithTransactions,
						{ id: 1, type: 1 },
						'a1',
						err => {
							expect(err.message).to.equal(
								'Failed to apply transaction: 1 to confirmed state of account:'
							);
							expect(err.transaction).to.deep.equal({ id: 1, type: 1 });
							expect(err.block).to.deep.equal(blockWithTransactions);
							done();
						}
					);
				});
			});

			describe('when modules.transactions.applyConfirmed succeeds', () => {
				beforeEach(() => {
					return modules.transactions.applyConfirmed.callsArgWith(
						3,
						null,
						true
					);
				});

				it('should call a callback with no error', done => {
					__private.applyTransaction(
						blockWithTransactions,
						{ id: 1, type: 1 },
						'a1',
						() => {
							expect(modules.transactions.applyUnconfirmed.calledOnce).to.be
								.true;
							expect(modules.transactions.applyConfirmed.calledOnce).to.be.true;
							done();
						}
					);
				});
			});
		});
	});

	describe('__private.undoUnconfirmedListStep', () => {
		describe('when modules.transactions.undoUnconfirmedList fails', () => {
			beforeEach(() => {
				return modules.transactions.undoUnconfirmedList.callsArgWith(
					0,
					'undoUnconfirmedList-ERR',
					null
				);
			});

			it('should call a callback with error', done => {
				__private.undoUnconfirmedListStep(err => {
					expect(err).to.equal('Failed to undo unconfirmed list');
					expect(loggerStub.error.args[0][0]).to.be.equal(
						'Failed to undo unconfirmed list'
					);
					expect(loggerStub.error.args[0][1]).to.be.equal(
						'undoUnconfirmedList-ERR'
					);
					done();
				});
			});
		});

		describe('when modules.transactions.undoUnconfirmedList succeeds', () => {
			beforeEach(() => {
				return modules.transactions.undoUnconfirmedList.callsArgWith(
					0,
					null,
					true
				);
			});
			it('should call a callback with no error', done => {
				__private.undoUnconfirmedListStep(err => {
					expect(err).to.be.undefined;
					done();
				});
			});
		});
	});

	describe('__private.applyUnconfirmedStep', () => {
		describe('when block.transactions is undefined', () => {
			it('should return rejected promise with error', done => {
				__private
					.applyUnconfirmedStep(blockWithUndefinedTransactions, dbStub.tx)
					.catch(err => {
						expect(err).instanceOf(Error);
						expect(err.message).to.equal(
							'expecting an array or an iterable object but got [object Null]'
						);
						done();
					});
			});
		});

		describe('when block.transactions is empty', () => {
			it('should return resolved promise with no error', done => {
				__private
					.applyUnconfirmedStep(blockWithEmptyTransactions, dbStub.tx)
					.then(resolved => {
						expect(resolved).to.be.an('array').that.is.empty;
						done();
					});
			});
		});

		describe('when block.transactions is not empty', () => {
			describe('when modules.accounts.setAccountAndGet fails', () => {
				beforeEach(() => {
					return modules.accounts.setAccountAndGet.callsArgWith(
						1,
						'setAccountAndGet-ERR',
						null
					);
				});
				it('should return rejected promise with error', done => {
					__private
						.applyUnconfirmedStep(blockWithTransactions, dbStub.tx)
						.catch(err => {
							expect(err).instanceOf(Error);
							expect(err.message).to.equal(
								'Failed to get account to apply unconfirmed transaction: 6 - setAccountAndGet-ERR'
							);
							expect(loggerStub.error.args[0][0]).to.equal(
								'Failed to get account to apply unconfirmed transaction: 6 - setAccountAndGet-ERR'
							);
							expect(loggerStub.error.args[1][0]).to.equal('Transaction');
							expect(loggerStub.error.args[1][1]).to.deep.equal(
								blockWithTransactions.transactions[0]
							);
							done();
						});
				});
			});

			describe('when modules.accounts.setAccountAndGet succeeds', () => {
				beforeEach(() => {
					return modules.accounts.setAccountAndGet.callsArgWith(
						1,
						null,
						'sender1'
					);
				});

				describe('when modules.transactions.applyUnconfirmed fails', () => {
					beforeEach(() => {
						return modules.transactions.applyUnconfirmed.callsArgWith(
							2,
							'applyUnconfirmed-ERR',
							null
						);
					});
					it('should return rejected promise with error', done => {
						__private
							.applyUnconfirmedStep(blockWithTransactions, dbStub.tx)
							.catch(err => {
								expect(err).instanceOf(Error);
								expect(err.message).to.equal(
									'Failed to apply transaction: 6 to unconfirmed state of account - applyUnconfirmed-ERR'
								);
								expect(loggerStub.error.args[0][0]).to.equal(
									'Failed to apply transaction: 6 to unconfirmed state of account - applyUnconfirmed-ERR'
								);
								expect(loggerStub.error.args[1][0]).to.equal('Transaction');
								expect(loggerStub.error.args[1][1]).to.deep.equal(
									blockWithTransactions.transactions[0]
								);
								done();
							});
					});
				});

				describe('when modules.transactions.applyUnconfirmed succeeds', () => {
					beforeEach(() => {
						return modules.transactions.applyUnconfirmed.callsArgWith(
							2,
							null,
							true
						);
					});

					it('should return resolved promise with no error', done => {
						__private
							.applyUnconfirmedStep(blockWithTransactions, dbStub.tx)
							.then(resolve => {
								expect(resolve).to.deep.equal([
									undefined,
									undefined,
									undefined,
								]);
								expect(modules.accounts.setAccountAndGet.callCount).to.equal(3);
								expect(
									modules.transactions.applyUnconfirmed.callCount
								).to.equal(3);
								done();
							});
					});
				});
			});
		});
	});

	describe('__private.applyConfirmedStep', () => {
		describe('when block transaction is undefined', () => {
			it('should return rejected promise with error', done => {
				__private
					.applyConfirmedStep(blockWithUndefinedTransactions, dbStub.tx)
					.catch(err => {
						expect(err).instanceOf(Error);
						expect(err.message).to.equal(
							'expecting an array or an iterable object but got [object Null]'
						);
						done();
					});
			});
		});

		describe('when block transaction is empty', () => {
			it('should return resolved promise with no error', done => {
				__private
					.applyConfirmedStep(blockWithEmptyTransactions, dbStub.tx)
					.then(resolved => {
						expect(resolved).to.be.an('array').that.is.empty;
						done();
					});
			});
		});

		describe('when block.transaction is not empty', () => {
			describe('when modules.accounts.getAccount fails', () => {
				beforeEach(() => {
					return modules.accounts.getAccount.callsArgWith(
						1,
						'getAccount-ERR',
						null
					);
				});

				it('should return rejected promise with error', done => {
					__private
						.applyConfirmedStep(blockWithTransactions, dbStub.tx)
						.catch(err => {
							expect(err).instanceOf(Error);
							expect(err.message).to.equal(
								'Failed to get account for applying transaction to confirmed state: 6 - getAccount-ERR'
							);
							expect(modules.accounts.getAccount.callCount).to.equal(1);
							expect(modules.transactions.applyConfirmed.callCount).to.equal(0);
							expect(loggerStub.error.args[0][0]).to.equal(
								'Failed to get account for applying transaction to confirmed state: 6 - getAccount-ERR'
							);
							expect(loggerStub.error.args[1][0]).to.equal('Transaction');
							expect(loggerStub.error.args[1][1]).to.deep.equal(
								blockWithTransactions.transactions[0]
							);
							done();
						});
				});
			});

			describe('when modules.accounts.getAccount succeeds', () => {
				beforeEach(() => {
					return modules.accounts.getAccount.callsArgWith(1, null, 'sender1');
				});

				describe('when library.logic.transaction.apply fails', () => {
					beforeEach(() => {
						return modules.transactions.applyConfirmed.callsArgWith(
							3,
							'apply-ERR',
							null
						);
					});

					it('should return rejected promise with error', done => {
						__private
							.applyConfirmedStep(blockWithTransactions, dbStub.tx)
							.catch(err => {
								expect(err).instanceOf(Error);
								expect(err.message).to.equal(
									'Failed to apply transaction: 6 to confirmed state of account - apply-ERR'
								);
								expect(modules.accounts.getAccount.callCount).to.equal(1);
								expect(modules.transactions.applyConfirmed.callCount).to.equal(
									1
								);
								expect(loggerStub.error.args[0][0]).to.equal(
									'Failed to apply transaction: 6 to confirmed state of account - apply-ERR'
								);
								expect(loggerStub.error.args[1][0]).to.equal('Transaction');
								expect(loggerStub.error.args[1][1]).to.deep.equal(
									blockWithTransactions.transactions[0]
								);
								done();
							});
					});
				});

				describe('when library.logic.transaction.applyConfirmed succeeds', () => {
					beforeEach(() => {
						return modules.transactions.applyConfirmed.callsArgWith(
							3,
							null,
							true
						);
					});
					it('should return resolved promise with no error', done => {
						__private
							.applyConfirmedStep(blockWithTransactions, dbStub.tx)
							.then(resolve => {
								expect(resolve).to.be.deep.equal([
									undefined,
									undefined,
									undefined,
								]);
								done();
							});
					});
				});
			});
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
			library.db.tx = (desc, tx) => {
				return tx();
			};
			done();
		});

		afterEach(done => {
			blocksChainModule.saveBlock = saveBlockTemp;
			done();
		});

		describe('when saveBlock is true', () => {
			describe('when self.saveBlock fails', () => {
				beforeEach(() => {
					return blocksChainModule.saveBlock.callsArgWith(
						1,
						'saveBlock-ERR',
						null
					);
				});

				it('should call a callback with error', done => {
					__private
						.saveBlockStep(blockWithTransactions, true, dbStub.tx)
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
				beforeEach(() => {
					return blocksChainModule.saveBlock.callsArgWith(1, null, true);
				});

				afterEach(() => {
					expect(loggerStub.debug.args[0][0]).to.contains(
						'Block applied correctly with 3 transactions'
					);
					return expect(blocksChainModule.saveBlock.args[0][0]).to.deep.equal(
						blockWithTransactions
					);
				});

				describe('when modules.rounds.tick fails', () => {
					beforeEach(() => {
						return modules.rounds.tick.callsArgWith(1, 'tick-ERR', null);
					});

					it('should call a callback with error', done => {
						__private
							.saveBlockStep(blockWithTransactions, true, dbStub.tx)
							.catch(err => {
								expect(err).to.equal('tick-ERR');
								expect(library.bus.message.calledOnce).to.be.false;
								done();
							});
					});
				});

				describe('when modules.rounds.tick succeeds', () => {
					beforeEach(() => {
						return modules.rounds.tick.callsArgWith(1, null, true);
					});

					it('should call a callback with no error', done => {
						__private
							.saveBlockStep(blockWithTransactions, true, dbStub.tx)
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
				beforeEach(() => {
					return modules.rounds.tick.callsArgWith(1, 'tick-ERR', null);
				});

				it('should call a callback with error', done => {
					__private
						.saveBlockStep(blockWithTransactions, true, dbStub.tx)
						.catch(err => {
							expect(err).to.equal('tick-ERR');
							expect(library.bus.message.calledOnce).to.be.false;
							done();
						});
				});
			});

			describe('when modules.rounds.tick succeeds', () => {
				beforeEach(() => {
					return modules.rounds.tick.callsArgWith(1, null, true);
				});

				it('should call a callback with no error', done => {
					__private
						.saveBlockStep(blockWithTransactions, true, dbStub.tx)
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
			txTemp = library.db.tx;
			privateTemp = __private;
			process.emit = sinonSandbox.stub();
			modules.transactions.undoUnconfirmedList.callsArgWith(0, null, true);
			__private.applyUnconfirmedStep = sinonSandbox
				.stub()
				.resolves(blockWithTransactions);
			__private.applyConfirmedStep = sinonSandbox
				.stub()
				.resolves(blockWithTransactions);
			__private.saveBlockStep = sinonSandbox
				.stub()
				.resolves(blockWithTransactions);
			done();
		});

		afterEach(done => {
			expect(__private.applyUnconfirmedStep).calledWith(
				blockWithTransactions,
				txTemp
			);
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
			library.db.tx = txTemp;
			done();
		});

		describe('when library.db.tx fails', () => {
			afterEach(() => {
				expect(modules.blocks.isActive.set.args[0][0]).to.be.true;
				return expect(modules.blocks.isActive.set.args[1][0]).to.be.false;
			});

			describe('when reason === Snapshot finished', () => {
				beforeEach(done => {
					library.db.tx = (desc, tx) => {
						return tx(txTemp.rejects());
					};
					__private.saveBlockStep.rejects('Snapshot finished');
					done();
				});

				it('should call a callback with error', done => {
					blocksChainModule.applyBlock(blockWithTransactions, true, err => {
						expect(err.name).to.equal('Snapshot finished');
						expect(loggerStub.info.args[0][0].name).to.equal(
							'Snapshot finished'
						);
						expect(process.emit).to.have.been.calledWith('SIGTERM');
						done();
					});
				});
			});

			describe('when reason !== Snapshot finished', () => {
				beforeEach(done => {
					library.db.tx = (desc, tx) => {
						return tx(txTemp.rejects());
					};
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

		describe('when library.db.tx succeeds', () => {
			beforeEach(done => {
				library.db.tx = (desc, tx) => {
					return tx(txTemp.resolves());
				};
				modules.transactions.removeUnconfirmedTransaction.returns(true);
				done();
			});
			it('should call a callback with no error', done => {
				blocksChainModule.applyBlock(blockWithTransactions, true, err => {
					expect(err).to.be.null;
					expect(
						modules.transactions.removeUnconfirmedTransaction.callCount
					).to.equal(3);
					expect(modules.blocks.isActive.set.callCount).to.equal(2);
					done();
				});
			});
		});
	});

	describe('broadcastReducedBlock', () => {
		it('should call library.bus.message with reducedBlock and broadcast', () => {
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
				beforeEach(() => {
					return modules.blocks.utils.loadBlocksPart.callsArgWith(1, null, []);
				});

				it('should call a callback with error "previousBlock is null"', done => {
					__private.loadSecondLastBlockStep(blockReduced.id, tx).catch(err => {
						expect(err).to.equal('previousBlock is null');
						done();
					});
				});
			});
		});

		describe('when modules.blocks.utils.loadBlocksPart succeeds', () => {
			beforeEach(() => {
				return modules.blocks.utils.loadBlocksPart.callsArgWith(1, null, [
					{ id: 2, height: 2 },
				]);
			});
		});
	});

	describe('__private.undoConfirmedStep', () => {
		let tx;
		describe('when oldLastBlock.transactions is not empty', () => {
			describe('when modules.accounts.getAccount fails', () => {
				beforeEach(() => {
					return modules.accounts.getAccount.callsArgWith(
						1,
						'getAccount-ERR',
						null
					);
				});

				it('should reject promise with "getAccount-ERR"', done => {
					__private
						.undoConfirmedStep(
							blockWithTransactions.transactions[0],
							blockWithTransactions,
							tx
						)
						.catch(err => {
							expect(err).to.equal('getAccount-ERR');
							done();
						});
				});
			});

			describe('when modules.accounts.getAccount succeeds', () => {
				beforeEach(done => {
					modules.accounts.getAccount.callsArgWith(1, null, '12ab');
					modules.transactions.undoConfirmed.callsArgWith(3, null, true);
					done();
				});

				it('should call modules.accounts.getAccount', done => {
					__private
						.undoConfirmedStep(
							blockWithTransactions.transactions[0],
							blockWithTransactions,
							tx
						)
						.then(() => {
							expect(modules.accounts.getAccount.callCount).to.equal(1);
							done();
						});
				});

				it('should call modules.transactions.undoConfirmed', done => {
					__private
						.undoConfirmedStep(
							blockWithTransactions.transactions[0],
							blockWithTransactions,
							tx
						)
						.then(() => {
							expect(modules.transactions.undoConfirmed.callCount).to.equal(1);
							done();
						});
				});

				it('should resolve the promise', done => {
					__private
						.undoConfirmedStep(
							blockWithTransactions.transactions[0],
							blockWithTransactions,
							tx
						)
						.then(res => {
							expect(res).to.not.exist;
							done();
						});
				});
			});
		});
	});

	describe('__private.undoUnconfirmStep', () => {
		let tx;
		describe('when oldLastBlock.transactions is not empty', () => {
			describe('when modules.transactions.undoUnconfirmed fails', () => {
				beforeEach(done => {
					modules.transactions.undoUnconfirmed.callsArgWith(
						1,
						'undoUnconfirmed-ERR',
						null
					);
					done();
				});

				it('should reject promise with "undoUnconfirmed-ERR"', done => {
					__private
						.undoUnconfirmStep(
							blockWithTransactions.transactions[0],
							blockWithTransactions,
							tx
						)
						.catch(err => {
							expect(err).to.equal('undoUnconfirmed-ERR');
							done();
						});
				});
			});

			describe('when modules.transactions.undoUnconfirmed succeeds', () => {
				beforeEach(done => {
					modules.transactions.undoUnconfirmed.callsArgWith(1, null, true);
					done();
				});

				it('should call modules.transactions.undoUnconfirmed', done => {
					__private
						.undoUnconfirmStep(
							blockWithTransactions.transactions[0],
							blockWithTransactions,
							tx
						)
						.then(() => {
							expect(modules.transactions.undoUnconfirmed.callCount).to.equal(
								1
							);
							done();
						});
				});

				it('should resolve the promise', done => {
					__private
						.undoUnconfirmStep(
							blockWithTransactions.transactions[0],
							blockWithTransactions,
							tx
						)
						.then(res => {
							expect(res).to.not.exist;
							done();
						});
				});
			});
		});
	});

	describe('__private.backwardTickStep', () => {
		let tx;
		describe('when modules.rounds.backwardTick fails', () => {
			beforeEach(() => {
				return modules.rounds.backwardTick.callsArgWith(
					2,
					'backwardTick-ERR',
					null
				);
			});

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

			it('should resolve the promise', () => {
				return __private.backwardTickStep(
					blockWithTransactions,
					blockWithTransactions,
					tx
				);
			});
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
			beforeEach(() => {
				return blocksChainModule.deleteBlock.callsArgWith(
					1,
					'deleteBlock-ERR',
					null
				);
			});

			it('should reject promise with "deleteBlock-ERR"', done => {
				__private.deleteBlockStep(blockWithEmptyTransactions, tx).catch(err => {
					expect(err).to.equal('deleteBlock-ERR');
					done();
				});
			});
		});

		describe('when self.deleteBlock succeeds', () => {
			beforeEach(() => {
				return blocksChainModule.deleteBlock.callsArgWith(1, null, true);
			});

			it('should resolve promise', done => {
				__private.deleteBlockStep(blockWithEmptyTransactions, tx).then(done);
			});
		});
	});

	describe('__private.popLastBlock', () => {
		describe('when library.db.tx fails', () => {
			beforeEach(done => {
				library.db.tx.rejects('db-tx_ERR');
				done();
			});

			it('should call a callback with proper error message', done => {
				__private.popLastBlock(blockWithTransactions, err => {
					expect(err.name).to.eql('db-tx_ERR');
					done();
				});
			});
		});

		describe('when library.db.tx passes', () => {
			beforeEach(done => {
				library.db.tx.resolves('savedBlock');
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
			modules.system.update.callsArgWith(0, null, true);
			modules.transport.broadcastHeaders.callsArgWith(0, null, true);
			done();
		});

		afterEach(done => {
			__private.popLastBlock = popLastBlockTemp;
			expect(modules.blocks.lastBlock.get.calledOnce).to.be.true;
			expect(loggerStub.warn.args[0][0]).to.equal('Deleting last block');
			done();
		});

		describe('when lastBlock.height = 1', () => {
			beforeEach(() => {
				return modules.blocks.lastBlock.get.returns(
					genesisBlockWithTransactions
				);
			});

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
				beforeEach(() => {
					return __private.popLastBlock.callsArgWith(
						1,
						'popLastBlock-ERR',
						true
					);
				});

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
				beforeEach(() => {
					return __private.popLastBlock.callsArgWith(
						1,
						null,
						blockWithTransactions
					);
				});

				describe('when modules.transactions.receiveTransactions fails', () => {
					beforeEach(() => {
						return modules.transactions.receiveTransactions.callsArgWith(
							2,
							'receiveTransactions-ERR',
							true
						);
					});

					it('should call a callback with no error', done => {
						blocksChainModule.deleteLastBlock((err, newLastBlock) => {
							expect(err).to.be.null;
							expect(newLastBlock).to.deep.equal(blockWithTransactions);
							expect(loggerStub.error.args[0][0]).to.equal(
								'Error adding transactions'
							);
							expect(loggerStub.error.args[0][1]).to.deep.equal(
								'receiveTransactions-ERR'
							);
							expect(modules.blocks.lastBlock.set.calledOnce).to.be.true;
							expect(modules.system.update.calledOnce).to.be.true;
							expect(modules.transport.broadcastHeaders.calledOnce).to.be.true;
							done();
						});
					});
				});

				describe('when modules.transactions.receiveTransactions succeeds', () => {
					beforeEach(() => {
						return modules.transactions.receiveTransactions.callsArgWith(
							2,
							null,
							true
						);
					});

					it('should call a callback with no error', done => {
						blocksChainModule.deleteLastBlock((err, newLastBlock) => {
							expect(err).to.be.null;
							expect(newLastBlock).to.deep.equal(blockWithTransactions);
							expect(modules.blocks.lastBlock.set.calledOnce).to.be.true;
							expect(modules.system.update.calledOnce).to.be.true;
							expect(modules.transport.broadcastHeaders.calledOnce).to.be.true;
							done();
						});
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
		beforeEach(done => {
			loggerStub.trace.reset();
			__private.loaded = false;
			blocksChainModule.onBind(modulesStub);
			done();
		});

		it('should call library.logger.trace with "Blocks->Chain: Shared modules bind."', () => {
			return expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Chain: Shared modules bind.'
			);
		});

		it('should assign params to modules', () => {
			expect(modules.accounts).to.equal(modulesStub.accounts);
			expect(modules.blocks).to.equal(modulesStub.blocks);
			expect(modules.rounds).to.equal(modulesStub.rounds);
			expect(modules.system).to.equal(modulesStub.system);
			expect(modules.transport).to.equal(modulesStub.transport);
			return expect(modules.transactions).to.equal(modulesStub.transactions);
		});

		it('should set __private.loaded to true', () => {
			return expect(__private.loaded).to.be.true;
		});
	});
});
