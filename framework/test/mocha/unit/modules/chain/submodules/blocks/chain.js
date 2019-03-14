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

const BlocksChain = rewire(
	'../../../../../../../src/modules/chain/submodules/blocks/chain'
);

describe('blocks/chain', () => {
	let __private;
	let library;
	let submodules;
	let components;
	let blocksChainModule;
	let storageStub;
	let loggerStub;
	let blockStub;
	let transactionStub;
	let busStub;
	let balancesSequenceStub;
	let genesisBlockStub;
	let bindingsStub;

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
		storageStub = {
			entities: {
				Block: {
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
			storageStub,
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

		const submodulesAccountsStub = {
			getAccount: sinonSandbox.stub(),
			setAccountAndGet: sinonSandbox.stub(),
		};

		const submodulesBlocksStub = {
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

		const submodulesRoundsStub = {
			backwardTick: sinonSandbox.stub(),
			tick: sinonSandbox.stub(),
		};

		const submodulesTransportStub = {
			broadcastHeaders: sinonSandbox.stub(),
		};

		const submodulesTransactionsStub = {
			applyUnconfirmed: sinonSandbox.stub(),
			applyConfirmed: sinonSandbox.stub(),
			receiveTransactions: sinonSandbox.stub(),
			undoConfirmed: sinonSandbox.stub(),
			undoUnconfirmed: sinonSandbox.stub(),
			undoUnconfirmedList: sinonSandbox.stub(),
			removeUnconfirmedTransaction: sinonSandbox.stub(),
		};

		const componentsSystemStub = {
			update: sinonSandbox.stub(),
		};

		bindingsStub = {
			components: {
				system: componentsSystemStub,
			},

			submodules: {
				accounts: submodulesAccountsStub,
				blocks: submodulesBlocksStub,
				rounds: submodulesRoundsStub,
				transactions: submodulesTransactionsStub,
				transport: submodulesTransportStub,
			},
		};

		process.exit = sinonSandbox.stub().returns(0);

		blocksChainModule.onBind(bindingsStub);
		components = BlocksChain.__get__('components');
		submodules = BlocksChain.__get__('submodules');
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
			return expect(library.logic.transaction).to.eql(transactionStub);
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
							expect(err).to.equal('saveBlock-ERR');
							done();
						});
					});
				});

				describe('when self.saveBlock succeeds', () => {
					beforeEach(() =>
						blocksChainModule.saveBlock.callsArgWith(1, null, true)
					);

					it('should call a callback with no error', done => {
						blocksChainModule.saveGenesisBlock(cb => {
							expect(cb).to.be.null;
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
			__private.afterSave(blockWithTransactions, async () => {
				expect(library.logic.transaction.afterSave.callCount).to.equal(3);
				done();
			});
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
			submodules.rounds.tick.callsArgWith(1, null, true);
			applyTransactionTemp = __private.applyTransaction;
			__private.applyTransaction = sinonSandbox.stub();
			done();
		});

		afterEach(done => {
			__private.applyTransaction = applyTransactionTemp;
			done();
		});

		describe('when block.transactions is empty', () => {
			it('submodules.rouds.tick should call a callback', done => {
				blocksChainModule.applyGenesisBlock(
					blockWithEmptyTransactions,
					async () => {
						expect(submodules.blocks.utils.getBlockProgressLogger.calledOnce).to
							.be.true;
						expect(submodules.blocks.lastBlock.set.calledOnce).to.be.true;
						expect(submodules.blocks.lastBlock.set.args[0][0]).to.deep.equal(
							blockWithEmptyTransactions
						);
						expect(submodules.rounds.tick.args[0][0]).to.deep.equal(
							blockWithEmptyTransactions
						);
						done();
					}
				);
			});
		});

		describe('when block.transactions is not empty', () => {
			describe('when submodules.accounts.setAccountAndGet fails', () => {
				beforeEach(() => {
					process.emit = sinonSandbox.stub();
					return submodules.accounts.setAccountAndGet.callsArgWith(
						1,
						'setAccountAndGet-ERR',
						true
					);
				});

				it('should call process.exit with 0', done => {
					blocksChainModule.applyGenesisBlock(blockWithTransactions, result => {
						expect(submodules.blocks.utils.getBlockProgressLogger.calledOnce).to
							.be.true;
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

			describe('when submodules.accounts.setAccountAndGet succeeds', () => {
				beforeEach(() =>
					submodules.accounts.setAccountAndGet.callsArgWith(1, null, true)
				);

				describe('when __private.applyTransaction fails', () => {
					beforeEach(() =>
						__private.applyTransaction.callsArgWith(
							3,
							'applyTransaction-ERR',
							null
						)
					);

					it('should call a callback with proper error message', done => {
						blocksChainModule.applyGenesisBlock(
							blockWithTransactions,
							result => {
								expect(
									submodules.blocks.utils.getBlockProgressLogger.callCount
								).to.equal(1);
								expect(result).to.equal('applyTransaction-ERR');
								done();
							}
						);
					});
				});

				describe('when __private.applyTransaction succeeds', () => {
					beforeEach(() =>
						__private.applyTransaction.callsArgWith(3, null, true)
					);

					it('submodules.rouds.tick should call a callback', done => {
						blocksChainModule.applyGenesisBlock(
							blockWithTransactions,
							async () => {
								expect(
									submodules.blocks.utils.getBlockProgressLogger.calledOnce
								).to.be.true;
								expect(__private.applyTransaction.callCount).to.equal(3);
								expect(submodules.blocks.lastBlock.set.calledOnce).to.be.true;
								expect(
									submodules.blocks.lastBlock.set.args[0][0]
								).to.deep.equal(blockWithTransactions);
								expect(submodules.rounds.tick.args[0][0]).to.deep.equal(
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

	describe('__private.applyTransaction', () => {
		describe('when submodules.transactions.applyUnconfirmed fails', () => {
			beforeEach(() =>
				submodules.transactions.applyUnconfirmed.callsArgWith(
					2,
					'applyUnconfirmed-ERR',
					null
				)
			);

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

		describe('when submodules.transactions.applyUnconfirmed succeeds', () => {
			beforeEach(() =>
				submodules.transactions.applyUnconfirmed.callsArgWith(2, null, true)
			);

			describe('when submodules.transactions.applyConfirmed fails', () => {
				beforeEach(() =>
					submodules.transactions.applyConfirmed.callsArgWith(
						3,
						'apply-ERR',
						null
					)
				);

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

			describe('when submodules.transactions.applyConfirmed succeeds', () => {
				beforeEach(() =>
					submodules.transactions.applyConfirmed.callsArgWith(3, null, true)
				);

				it('should call a callback with no error', done => {
					__private.applyTransaction(
						blockWithTransactions,
						{ id: 1, type: 1 },
						'a1',
						async () => {
							expect(submodules.transactions.applyUnconfirmed.calledOnce).to.be
								.true;
							expect(submodules.transactions.applyConfirmed.calledOnce).to.be
								.true;
							done();
						}
					);
				});
			});
		});
	});

	describe('__private.undoUnconfirmedListStep', () => {
		describe('when submodules.transactions.undoUnconfirmedList fails', () => {
			beforeEach(() =>
				submodules.transactions.undoUnconfirmedList.callsArgWith(
					0,
					'undoUnconfirmedList-ERR',
					null
				)
			);

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

		describe('when submodules.transactions.undoUnconfirmedList succeeds', () => {
			beforeEach(() =>
				submodules.transactions.undoUnconfirmedList.callsArgWith(0, null, true)
			);
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
					.applyUnconfirmedStep(
						blockWithUndefinedTransactions,
						storageStub.entities.Block.begin
					)
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
					.applyUnconfirmedStep(
						blockWithEmptyTransactions,
						storageStub.entities.Block.begin
					)
					.then(resolved => {
						expect(resolved).to.be.an('array').that.is.empty;
						done();
					});
			});
		});

		describe('when block.transactions is not empty', () => {
			describe('when submodules.accounts.setAccountAndGet fails', () => {
				beforeEach(() =>
					submodules.accounts.setAccountAndGet.callsArgWith(
						1,
						'setAccountAndGet-ERR',
						null
					)
				);
				it('should return rejected promise with error', done => {
					__private
						.applyUnconfirmedStep(
							blockWithTransactions,
							storageStub.entities.Block.begin
						)
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

			describe('when submodules.accounts.setAccountAndGet succeeds', () => {
				beforeEach(() =>
					submodules.accounts.setAccountAndGet.callsArgWith(1, null, 'sender1')
				);

				describe('when submodules.transactions.applyUnconfirmed fails', () => {
					beforeEach(() =>
						submodules.transactions.applyUnconfirmed.callsArgWith(
							2,
							'applyUnconfirmed-ERR',
							null
						)
					);
					it('should return rejected promise with error', done => {
						__private
							.applyUnconfirmedStep(
								blockWithTransactions,
								storageStub.entities.Block.begin
							)
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

				describe('when submodules.transactions.applyUnconfirmed succeeds', () => {
					beforeEach(() =>
						submodules.transactions.applyUnconfirmed.callsArgWith(2, null, true)
					);

					it('should return resolved promise with no error', done => {
						__private
							.applyUnconfirmedStep(
								blockWithTransactions,
								storageStub.entities.Block.begin
							)
							.then(resolve => {
								expect(resolve).to.deep.equal([
									undefined,
									undefined,
									undefined,
								]);
								expect(submodules.accounts.setAccountAndGet.callCount).to.equal(
									3
								);
								expect(
									submodules.transactions.applyUnconfirmed.callCount
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
					.applyConfirmedStep(
						blockWithUndefinedTransactions,
						storageStub.entities.Block.begin
					)
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
					.applyConfirmedStep(
						blockWithEmptyTransactions,
						storageStub.entities.Block.begin
					)
					.then(resolved => {
						expect(resolved).to.be.an('array').that.is.empty;
						done();
					});
			});
		});

		describe('when block.transaction is not empty', () => {
			describe('when submodules.accounts.getAccount fails', () => {
				beforeEach(() =>
					submodules.accounts.getAccount.callsArgWith(1, 'getAccount-ERR', null)
				);

				it('should return rejected promise with error', done => {
					__private
						.applyConfirmedStep(
							blockWithTransactions,
							storageStub.entities.Block.begin
						)
						.catch(err => {
							expect(err).instanceOf(Error);
							expect(err.message).to.equal(
								'Failed to get account for applying transaction to confirmed state: 6 - getAccount-ERR'
							);
							expect(submodules.accounts.getAccount.callCount).to.equal(1);
							expect(submodules.transactions.applyConfirmed.callCount).to.equal(
								0
							);
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

			describe('when submodules.accounts.getAccount succeeds', () => {
				beforeEach(() =>
					submodules.accounts.getAccount.callsArgWith(1, null, 'sender1')
				);

				describe('when library.logic.transaction.apply fails', () => {
					beforeEach(() =>
						submodules.transactions.applyConfirmed.callsArgWith(
							3,
							'apply-ERR',
							null
						)
					);

					it('should return rejected promise with error', done => {
						__private
							.applyConfirmedStep(
								blockWithTransactions,
								storageStub.entities.Block.begin
							)
							.catch(err => {
								expect(err).instanceOf(Error);
								expect(err.message).to.equal(
									'Failed to apply transaction: 6 to confirmed state of account - apply-ERR'
								);
								expect(submodules.accounts.getAccount.callCount).to.equal(1);
								expect(
									submodules.transactions.applyConfirmed.callCount
								).to.equal(1);
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
					beforeEach(() =>
						submodules.transactions.applyConfirmed.callsArgWith(3, null, true)
					);
					it('should return resolved promise with no error', done => {
						__private
							.applyConfirmedStep(
								blockWithTransactions,
								storageStub.entities.Block.begin
							)
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
			submodules.rounds.tick.callsArgWith(1, null, true);
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
							expect(submodules.blocks.lastBlock.set.calledOnce).to.be.false;
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

				describe('when submodules.rounds.tick fails', () => {
					beforeEach(() =>
						submodules.rounds.tick.callsArgWith(1, 'tick-ERR', null)
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

				describe('when submodules.rounds.tick succeeds', () => {
					beforeEach(() => submodules.rounds.tick.callsArgWith(1, null, true));

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
			describe('when submodules.rounds.tick fails', () => {
				beforeEach(() =>
					submodules.rounds.tick.callsArgWith(1, 'tick-ERR', null)
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

			describe('when submodules.rounds.tick succeeds', () => {
				beforeEach(() => submodules.rounds.tick.callsArgWith(1, null, true));

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
			submodules.transactions.undoUnconfirmedList.callsArgWith(0, null, true);
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
			expect(submodules.blocks.isActive.set.calledTwice).to.be.true;
			__private = privateTemp;
			storageStub.entities.Block.begin = txTemp;
			done();
		});

		describe('when storageStub.entities.Block.begin fails', () => {
			afterEach(() => {
				expect(submodules.blocks.isActive.set.args[0][0]).to.be.true;
				return expect(submodules.blocks.isActive.set.args[1][0]).to.be.false;
			});

			describe('when reason === Snapshot finished', () => {
				beforeEach(done => {
					storageStub.entities.Block.begin = (desc, tx) => tx(txTemp.rejects());
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
				submodules.transactions.removeUnconfirmedTransaction.returns(true);
				done();
			});
			it('should call a callback with no error', done => {
				blocksChainModule.applyBlock(blockWithTransactions, true, err => {
					expect(err).to.be.null;
					expect(
						submodules.transactions.removeUnconfirmedTransaction.callCount
					).to.equal(3);
					expect(submodules.blocks.isActive.set.callCount).to.equal(2);
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
			return submodules.blocks.utils.loadBlocksPart.callsArgWith(
				1,
				'loadBlocksPart-ERR',
				null
			);
		});

		describe('when submodules.blocks.utils.loadBlocksPart fails', () => {
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
					submodules.blocks.utils.loadBlocksPart.callsArgWith(1, null, [])
				);

				it('should call a callback with error "previousBlock is null"', done => {
					__private.loadSecondLastBlockStep(blockReduced.id, tx).catch(err => {
						expect(err).to.equal('previousBlock is null');
						done();
					});
				});
			});
		});

		describe('when submodules.blocks.utils.loadBlocksPart succeeds', () => {
			beforeEach(() =>
				submodules.blocks.utils.loadBlocksPart.callsArgWith(1, null, [
					{ id: 2, height: 2 },
				])
			);
		});
	});

	describe('__private.undoConfirmedStep', () => {
		let tx;
		describe('when oldLastBlock.transactions is not empty', () => {
			describe('when submodules.accounts.getAccount fails', () => {
				beforeEach(() =>
					submodules.accounts.getAccount.callsArgWith(1, 'getAccount-ERR', null)
				);

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

			describe('when submodules.accounts.getAccount succeeds', () => {
				beforeEach(done => {
					submodules.accounts.getAccount.callsArgWith(1, null, '12ab');
					submodules.transactions.undoConfirmed.callsArgWith(3, null, true);
					done();
				});

				it('should call submodules.accounts.getAccount', done => {
					__private
						.undoConfirmedStep(
							blockWithTransactions.transactions[0],
							blockWithTransactions,
							tx
						)
						.then(() => {
							expect(submodules.accounts.getAccount.callCount).to.equal(1);
							done();
						});
				});

				it('should call submodules.transactions.undoConfirmed', done => {
					__private
						.undoConfirmedStep(
							blockWithTransactions.transactions[0],
							blockWithTransactions,
							tx
						)
						.then(() => {
							expect(submodules.transactions.undoConfirmed.callCount).to.equal(
								1
							);
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
			describe('when submodules.transactions.undoUnconfirmed fails', () => {
				beforeEach(done => {
					submodules.transactions.undoUnconfirmed.callsArgWith(
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

			describe('when submodules.transactions.undoUnconfirmed succeeds', () => {
				beforeEach(done => {
					submodules.transactions.undoUnconfirmed.callsArgWith(1, null, true);
					done();
				});

				it('should call submodules.transactions.undoUnconfirmed', done => {
					__private
						.undoUnconfirmStep(
							blockWithTransactions.transactions[0],
							blockWithTransactions,
							tx
						)
						.then(() => {
							expect(
								submodules.transactions.undoUnconfirmed.callCount
							).to.equal(1);
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
		describe('when submodules.rounds.backwardTick fails', () => {
			beforeEach(() =>
				submodules.rounds.backwardTick.callsArgWith(2, 'backwardTick-ERR', null)
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

		describe('when submodules.rounds.backwardTick succeeds', () => {
			beforeEach(done => {
				submodules.rounds.backwardTick.callsArgWith(2, null);
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
			components.system.update.resolves();
			submodules.transport.broadcastHeaders.callsArgWith(0, null, true);
			done();
		});

		afterEach(done => {
			__private.popLastBlock = popLastBlockTemp;
			expect(submodules.blocks.lastBlock.get.calledOnce).to.be.true;
			expect(loggerStub.warn.args[0][0]).to.equal('Deleting last block');
			done();
		});

		describe('when lastBlock.height = 1', () => {
			beforeEach(() =>
				submodules.blocks.lastBlock.get.returns(genesisBlockWithTransactions)
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
				submodules.blocks.lastBlock.set.returns(blockWithTransactions);
				return submodules.blocks.lastBlock.get.returns(blockWithTransactions);
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
				beforeEach(() =>
					__private.popLastBlock.callsArgWith(1, null, blockWithTransactions)
				);

				describe('when submodules.transactions.receiveTransactions fails', () => {
					beforeEach(() =>
						submodules.transactions.receiveTransactions.callsArgWith(
							2,
							'receiveTransactions-ERR',
							true
						)
					);

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
							expect(submodules.blocks.lastBlock.set.calledOnce).to.be.true;
							expect(components.system.update.calledOnce).to.be.true;
							expect(submodules.transport.broadcastHeaders.calledOnce).to.be
								.true;
							done();
						});
					});
				});

				describe('when submodules.transactions.receiveTransactions succeeds', () => {
					beforeEach(() =>
						submodules.transactions.receiveTransactions.callsArgWith(
							2,
							null,
							true
						)
					);

					it('should call a callback with no error', done => {
						blocksChainModule.deleteLastBlock((err, newLastBlock) => {
							expect(err).to.be.null;
							expect(newLastBlock).to.deep.equal(blockWithTransactions);
							expect(submodules.blocks.lastBlock.set.calledOnce).to.be.true;
							expect(components.system.update.calledOnce).to.be.true;
							expect(submodules.transport.broadcastHeaders.calledOnce).to.be
								.true;
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
			loggerStub.trace.resetHistory();
			__private.loaded = false;
			blocksChainModule.onBind(bindingsStub);
			done();
		});

		it('should call library.logger.trace with "Blocks->Chain: Shared submodules bind."', async () =>
			expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Chain: Shared submodules bind.'
			));

		it('should assign params to submodules', async () => {
			expect(submodules.accounts).to.equal(bindingsStub.submodules.accounts);
			expect(submodules.blocks).to.equal(bindingsStub.submodules.blocks);
			expect(submodules.rounds).to.equal(bindingsStub.submodules.rounds);
			expect(components.system).to.equal(bindingsStub.components.system);
			expect(submodules.transport).to.equal(bindingsStub.submodules.transport);
			return expect(submodules.transactions).to.equal(
				bindingsStub.submodules.transactions
			);
		});

		it('should set __private.loaded to true', async () =>
			expect(__private.loaded).to.be.true);
	});
});
