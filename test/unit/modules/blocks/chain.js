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

var rewire = require('rewire');

var BlocksChain = rewire('../../../../modules/blocks/chain.js');

describe('blocks/chain', () => {
	var __private;
	var library;
	var modules;
	var blocksChainModule;
	var dbStub;
	var loggerStub;
	var blockStub;
	var transactionStub;
	var busStub;
	var balancesSequenceStub;
	var genesisblockStub;
	var modulesStub;

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
		genesisblockStub = {
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
			genesisblockStub,
			busStub,
			balancesSequenceStub
		);

		library = BlocksChain.__get__('library');
		__private = BlocksChain.__get__('__private');
		// Module
		const tracker = {
			applyNext: sinonSandbox.stub(),
		};
		var modulesAccountsStub = {
			getAccount: sinonSandbox.stub(),
			setAccountAndGet: sinonSandbox.stub(),
		};
		var modulesBlocksStub = {
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
		var modulesRoundsStub = {
			backwardTick: sinonSandbox.stub(),
			tick: sinonSandbox.stub(),
		};
		var modulesTransactionsStub = {
			applyUnconfirmed: sinonSandbox.stub(),
			apply: sinonSandbox.stub(),
			receiveTransactions: sinonSandbox.stub(),
			undo: sinonSandbox.stub(),
			undoUnconfirmed: sinonSandbox.stub(),
			undoUnconfirmedList: sinonSandbox.stub(),
			removeUnconfirmedTransaction: sinonSandbox.stub(),
		};
		modulesStub = {
			accounts: modulesAccountsStub,
			blocks: modulesBlocksStub,
			rounds: modulesRoundsStub,
			transactions: modulesTransactionsStub,
		};
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
			expect(library.genesisblock).to.eql(genesisblockStub);
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
		var saveBlockTemp;
		describe('library.db.blocks.getGenesisBlockId', () => {
			describe('when fails', () => {
				beforeEach(() => {
					return library.db.blocks.getGenesisBlockId.rejects(
						'getGenesisBlockId-ERR'
					);
				});

				afterEach(() => {
					return expect(loggerStub.error.args[0][0]).to.contains(
						'getGenesisBlockId-ERR'
					);
				});

				it('should call a callback with error', done => {
					blocksChainModule.saveGenesisBlock(err => {
						expect(err).to.equal('Blocks#saveGenesisBlock error');
						done();
					});
				});
			});

			describe('when succeeds', () => {
				describe('if returns empty row (genesis block is not in database)', () => {
					beforeEach(done => {
						library.db.blocks.getGenesisBlockId.resolves([]);
						saveBlockTemp = blocksChainModule.saveBlock;
						done();
					});
					afterEach(done => {
						blocksChainModule.saveBlock = saveBlockTemp;
						done();
					});

					describe('self.saveBlock', () => {
						beforeEach(done => {
							blocksChainModule.saveBlock = sinonSandbox.stub();
							done();
						});

						describe('when fails', () => {
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
						describe('when succeeds', () => {
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
			var txStub;
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
			describe('tx.batch', () => {
				describe('when fails', () => {
					beforeEach(() => {
						return txStub.batch.rejects('txbatch-ERR');
					});

					it('should call a callback with error', done => {
						var block = {
							id: 1,
							transactions: [{ id: 1, type: 0 }, { id: 2, type: 1 }],
						};
						blocksChainModule.saveBlock(
							block,
							err => {
								expect(err).to.equal('Blocks#saveBlock error');
								done();
							},
							txStub
						);
					});
				});

				describe('when succeeds', () => {
					beforeEach(done => {
						txStub.batch.resolves();
						__private.afterSave = sinonSandbox
							.stub()
							.callsArgWith(1, null, true);
						done();
					});

					it('should call __private.afterSave', done => {
						var block = {
							id: 1,
							transactions: [{ id: 1, type: 0 }, { id: 2, type: 1 }],
						};
						blocksChainModule.saveBlock(
							block,
							() => {
								expect(__private.afterSave.calledOnce).to.be.true;
								done();
							},
							txStub
						);
					});
				});
			});
		});

		describe('when tx param is not passed', () => {
			var txStub;
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
			describe('tx.batch', () => {
				describe('when fails', () => {
					beforeEach(() => {
						return txStub.batch.rejects('txbatch-ERR');
					});

					it('should call a callback with error', done => {
						var block = {
							id: 1,
							transactions: [{ id: 1, type: 0 }, { id: 2, type: 1 }],
						};
						blocksChainModule.saveBlock(block, err => {
							expect(err).to.equal('Blocks#saveBlock error');
							done();
						});
					});
				});
				describe('when succeeds', () => {
					beforeEach(done => {
						txStub.batch.resolves();
						__private.afterSave = sinonSandbox
							.stub()
							.callsArgWith(1, null, true);
						done();
					});

					it('should call __private.afterSave', done => {
						var block = {
							id: 1,
							transactions: [{ id: 1, type: 0 }, { id: 2, type: 1 }],
						};
						blocksChainModule.saveBlock(block, () => {
							expect(__private.afterSave.calledOnce).to.be.true;
							done();
						});
					});
				});
			});
		});
	});

	describe('__private.afterSave', () => {
		afterEach(() => {
			expect(library.bus.message.calledOnce).to.be.true;
			expect(library.bus.message.args[0][0]).to.equal('transactionsSaved');
			return expect(library.bus.message.args[0][1]).to.deep.equal([
				{ id: 1, type: 0 },
				{ id: 2, type: 1 },
			]);
		});

		it('should call afterSave for all transactions', done => {
			var block = {
				id: 1,
				transactions: [{ id: 1, type: 0 }, { id: 2, type: 1 }],
			};
			__private.afterSave(block, () => {
				expect(library.logic.transaction.afterSave.callCount).to.equal(2);
				done();
			});
		});
	});

	describe('deleteBlock', () => {
		describe('library.db.blocks.deleteBlock', () => {
			describe('when fails', () => {
				beforeEach(() => {
					return library.db.blocks.deleteBlock.rejects('deleteBlock-ERR');
				});

				afterEach(() => {
					return expect(loggerStub.error.args[0][0]).to.contains(
						'deleteBlock-ERR'
					);
				});

				it('should call a callback with error', done => {
					blocksChainModule.deleteBlock(1, err => {
						expect(err).to.equal('Blocks#deleteBlock error');
						done();
					});
				});
			});

			describe('when succeeds', () => {
				beforeEach(() => {
					return library.db.blocks.deleteBlock.resolves(true);
				});

				it('should call a callback with no error', done => {
					blocksChainModule.deleteBlock(1, () => {
						done();
					});
				});
			});
		});
	});

	describe('deleteAfterBlock', () => {
		describe('library.db.blocks.deleteAfterBlock', () => {
			describe('when fails', () => {
				beforeEach(() => {
					return library.db.blocks.deleteAfterBlock.rejects(
						'deleteAfterBlock-ERR'
					);
				});

				afterEach(() => {
					return expect(loggerStub.error.args[0][0]).to.contains(
						'deleteAfterBlock-ERR'
					);
				});

				it('should call a callback with error', done => {
					blocksChainModule.deleteAfterBlock(1, err => {
						expect(err).to.equal('Blocks#deleteAfterBlock error');
						done();
					});
				});
			});

			describe('when succeeds', () => {
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
			afterEach(() => {
				expect(modules.blocks.utils.getBlockProgressLogger.calledOnce).to.be
					.true;
				expect(modules.blocks.lastBlock.set.calledOnce).to.be.true;
				expect(modules.blocks.lastBlock.set.args[0][0]).to.deep.equal({
					id: 1,
					height: 1,
					transactions: [],
				});
				return expect(modules.rounds.tick.args[0][0]).to.deep.equal({
					id: 1,
					height: 1,
					transactions: [],
				});
			});
			it('modules.rouds.tick should call a callback', done => {
				blocksChainModule.applyGenesisBlock(
					{ id: 1, height: 1, transactions: [] },
					() => {
						done();
					}
				);
			});
		});
		describe('when block.transactions is not empty', () => {
			describe('modules.accounts.setAccountAndGet', () => {
				describe('when fails', () => {
					beforeEach(() => {
						return modules.accounts.setAccountAndGet.callsArgWith(
							1,
							'setAccountAndGet-ERR',
							true
						);
					});
					afterEach(() => {
						return expect(
							modules.blocks.utils.getBlockProgressLogger.calledOnce
						).to.be.true;
					});
					it('should return process.exit(0)', done => {
						process.exit = done;
						blocksChainModule.applyGenesisBlock(
							{
								id: 1,
								height: 1,
								transactions: [
									{ id: 5, type: 3 },
									{ id: 6, type: 2 },
									{ id: 7, type: 1 },
								],
							},
							() => {
								done();
							}
						);
					});
				});
				describe('when succeeds', () => {
					beforeEach(() => {
						return modules.accounts.setAccountAndGet.callsArgWith(
							1,
							null,
							true
						);
					});
					describe('__private.applyTransaction', () => {
						describe('when fails', () => {
							beforeEach(() => {
								return __private.applyTransaction.callsArgWith(
									3,
									'applyTransaction-ERR',
									null
								);
							});
							afterEach(() => {
								expect(modules.blocks.utils.getBlockProgressLogger.calledOnce)
									.to.be.true;
								return expect(__private.applyTransaction.callCount).to.equal(1);
							});
							it('should return process.exit(0)', done => {
								process.exit = done;
								blocksChainModule.applyGenesisBlock(
									{
										id: 1,
										height: 1,
										transactions: [
											{ id: 5, type: 3 },
											{ id: 6, type: 2 },
											{ id: 7, type: 1 },
										],
									},
									err => {
										expect(err).to.equal('applyTransaction-ERR');
										done();
									}
								);
							});
						});
						describe('when succeeds', () => {
							beforeEach(() => {
								return __private.applyTransaction.callsArgWith(3, null, true);
							});
							afterEach(() => {
								expect(modules.blocks.utils.getBlockProgressLogger.calledOnce)
									.to.be.true;
								expect(__private.applyTransaction.callCount).to.equal(3);
								expect(modules.blocks.lastBlock.set.calledOnce).to.be.true;
								expect(modules.blocks.lastBlock.set.args[0][0]).to.deep.equal({
									id: 1,
									height: 1,
									transactions: [
										{ id: 6, type: 2 },
										{ id: 7, type: 1 },
										{ id: 5, type: 3 },
									],
								});
								return expect(modules.rounds.tick.args[0][0]).to.deep.equal({
									id: 1,
									height: 1,
									transactions: [
										{ id: 6, type: 2 },
										{ id: 7, type: 1 },
										{ id: 5, type: 3 },
									],
								});
							});
							it('modules.rouds.tick should call a callback', done => {
								blocksChainModule.applyGenesisBlock(
									{
										id: 1,
										height: 1,
										transactions: [
											{ id: 5, type: 3 },
											{ id: 6, type: 2 },
											{ id: 7, type: 1 },
										],
									},
									() => {
										done();
									}
								);
							});
						});
					});
				});
			});
		});
	});

	describe('__private.applyTransaction', () => {
		describe('modules.transactions.applyUnconfirmed', () => {
			describe('when fails', () => {
				beforeEach(() => {
					return modules.transactions.applyUnconfirmed.callsArgWith(
						2,
						'applyUnconfirmed-ERR',
						null
					);
				});
				it('should call a callback with error', done => {
					var block = {
						id: 1,
						transactions: [{ id: 1, type: 0 }, { id: 2, type: 1 }],
					};
					__private.applyTransaction(block, { id: 1, type: 1 }, 'a1', err => {
						expect(err.message).to.equal('applyUnconfirmed-ERR');
						expect(err.transaction).to.deep.equal({ id: 1, type: 1 });
						expect(err.block).to.deep.equal(block);
						done();
					});
				});
			});

			describe('when succeeds', () => {
				beforeEach(() => {
					return modules.transactions.applyUnconfirmed.callsArgWith(
						2,
						null,
						true
					);
				});

				describe('modules.transactions.apply', () => {
					describe('when fails', () => {
						beforeEach(() => {
							return modules.transactions.apply.callsArgWith(
								3,
								'apply-ERR',
								null
							);
						});

						it('should call a callback with error', done => {
							var block = {
								id: 1,
								transactions: [{ id: 1, type: 0 }, { id: 2, type: 1 }],
							};
							__private.applyTransaction(
								block,
								{ id: 1, type: 1 },
								'a1',
								err => {
									expect(err.message).to.equal(
										'Failed to apply transaction: 1'
									);
									expect(err.transaction).to.deep.equal({ id: 1, type: 1 });
									expect(err.block).to.deep.equal(block);
									done();
								}
							);
						});
					});

					describe('when succeeds', () => {
						beforeEach(() => {
							return modules.transactions.apply.callsArgWith(3, null, true);
						});

						afterEach(() => {
							expect(modules.transactions.applyUnconfirmed.calledOnce).to.be
								.true;
							return expect(modules.transactions.apply.calledOnce).to.be.true;
						});

						it('should call a callback with no error', done => {
							var block = {
								id: 1,
								transactions: [{ id: 1, type: 0 }, { id: 2, type: 1 }],
							};
							__private.applyTransaction(
								block,
								{ id: 1, type: 1 },
								'a1',
								() => {
									done();
								}
							);
						});
					});
				});
			});
		});
	});

	describe('__private.undoUnconfirmedListStep', () => {
		describe('modules.transactions.undoUnconfirmedList', () => {
			describe('when fails', () => {
				beforeEach(() => {
					return modules.transactions.undoUnconfirmedList.callsArgWith(
						0,
						'undoUnconfirmedList-ERR',
						null
					);
				});
				afterEach(() => {
					expect(loggerStub.error.args[0][0]).to.be.equal(
						'Failed to undo unconfirmed list'
					);
					return expect(loggerStub.error.args[0][1]).to.be.equal(
						'undoUnconfirmedList-ERR'
					);
				});
				it('should return rejected promise with error', done => {
					__private.undoUnconfirmedListStep(dbStub.tx).catch(err => {
						expect(err).to.equal('Failed to undo unconfirmed list');
						done();
					});
				});
			});
			describe('when succeeds', () => {
				beforeEach(() => {
					return modules.transactions.undoUnconfirmedList.callsArgWith(
						0,
						null,
						true
					);
				});
				it('should return resolved promise with no error', done => {
					__private.undoUnconfirmedListStep(dbStub.tx).then(resolve => {
						expect(resolve).to.be.undefined;
						done();
					});
				});
			});
		});
	});

	describe('__private.applyUnconfirmedStep', () => {
		let appliedTransactions;
		beforeEach(done => {
			appliedTransactions = [];
			done();
		});
		describe('when block.transactions is undefined', () => {
			it('should return rejected promise with error', done => {
				__private
					.applyUnconfirmedStep(
						{ id: 6, height: 6, transactions: undefined },
						appliedTransactions,
						dbStub.tx
					)
					.catch(err => {
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
						{ id: 6, height: 6, transactions: [] },
						appliedTransactions,
						dbStub.tx
					)
					.then(resolved => {
						expect(resolved).to.be.an('array').that.is.empty;
						done();
					});
			});
		});
		describe('when block.transactions is not empty', () => {
			describe('modules.accounts.setAccountAndGet', () => {
				describe('when fails', () => {
					beforeEach(() => {
						modules.accounts.setAccountAndGet
							.onCall(0)
							.callsArgWith(1, null, true)
							.callsArgWith(1, 'setAccountAndGet-ERR', null);
						return modules.transactions.applyUnconfirmed.callsArgWith(
							2,
							null,
							null
						);
					});
					describe('catch', () => {
						describe('modules.accounts.getAccount', () => {
							describe('when fails', () => {
								beforeEach(() => {
									return modules.accounts.getAccount
										.onCall(0)
										.callsArgWith(1, 'getAccount-ERR', null)
										.callsArgWith(1, null, 'sender1');
								});
								afterEach(() => {
									expect(modules.accounts.setAccountAndGet.callCount).to.equal(
										2
									);
									expect(
										modules.transactions.applyUnconfirmed.callCount
									).to.equal(1);
									return expect(
										Object.keys(appliedTransactions).length
									).to.equal(1);
								});
								it('should return rejected promise with error', done => {
									__private
										.applyUnconfirmedStep(
											{
												id: 5,
												height: 5,
												transactions: [
													{ id: 1, type: 0, senderPublicKey: 'a' },
													{ id: 2, type: 1, senderPublicKey: 'b' },
												],
											},
											appliedTransactions,
											dbStub.tx
										)
										.catch(err => {
											expect(err).to.equal('getAccount-ERR');
											done();
										});
								});
							});
							describe('when succeeds', () => {
								beforeEach(() => {
									return modules.accounts.getAccount.callsArgWith(
										1,
										null,
										'sender1'
									);
								});
								describe('library.logic.transaction.undoUnconfirmed', () => {
									describe('when fails', () => {
										beforeEach(() => {
											return library.logic.transaction.undoUnconfirmed.callsArgWith(
												2,
												'undoUnconfirmed-ERR',
												null
											);
										});
										it('should return rejected promise with error', done => {
											__private
												.applyUnconfirmedStep(
													{
														id: 5,
														height: 5,
														transactions: [
															{ id: 1, type: 0, senderPublicKey: 'a' },
															{ id: 2, type: 1, senderPublicKey: 'b' },
														],
													},
													appliedTransactions,
													dbStub.tx
												)
												.catch(err => {
													expect(err).to.equal('undoUnconfirmed-ERR');
													done();
												});
										});
									});
									describe('when succeeds', () => {
										beforeEach(() => {
											return library.logic.transaction.undoUnconfirmed.callsArgWith(
												2,
												null,
												true
											);
										});
										it('should return resolved promise with no error', done => {
											__private
												.applyUnconfirmedStep(
													{
														id: 5,
														height: 5,
														transactions: [
															{ id: 1, type: 0, senderPublicKey: 'a' },
															{ id: 2, type: 1, senderPublicKey: 'b' },
														],
													},
													appliedTransactions,
													dbStub.tx
												)
												.then(resolve => {
													expect(resolve).to.be.deep.equal([
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
					});
				});
				describe('when succeeds', () => {
					beforeEach(() => {
						return modules.accounts.setAccountAndGet.callsArgWith(
							1,
							null,
							'sender1'
						);
					});
					describe('modules.transactions.applyUnconfirmed', () => {
						describe('when fails', () => {
							describe('if no transaction was applied', () => {
								beforeEach(() => {
									return modules.transactions.applyUnconfirmed.callsArgWith(
										2,
										'applyUnconfirmed-ERR',
										null
									);
								});
								afterEach(() => {
									expect(modules.accounts.setAccountAndGet.callCount).to.equal(
										1
									);
									expect(
										modules.transactions.applyUnconfirmed.callCount
									).to.equal(1);
									expect(Object.keys(appliedTransactions).length).to.equal(0);
									expect(loggerStub.error.args[0][0]).to.equal(
										'Failed to apply transaction: 1 - applyUnconfirmed-ERR'
									);
									expect(loggerStub.error.args[1][0]).to.equal('Transaction');
									return expect(loggerStub.error.args[1][1]).to.deep.equal({
										id: 1,
										type: 0,
										senderPublicKey: 'a',
									});
								});
								describe('catch', () => {
									describe('modules.accounts.getAccount', () => {
										afterEach(() => {
											return expect(
												library.logic.transaction.undoUnconfirmed.callCount
											).to.equal(0);
										});
										describe('when fails', () => {
											beforeEach(() => {
												return modules.accounts.getAccount.callsArgWith(
													1,
													'getAccount-ERR',
													null
												);
											});
											it('should return rejected promise with error', done => {
												__private
													.applyUnconfirmedStep(
														{
															id: 5,
															height: 5,
															transactions: [
																{ id: 1, type: 0, senderPublicKey: 'a' },
																{ id: 2, type: 1, senderPublicKey: 'b' },
															],
														},
														appliedTransactions,
														dbStub.tx
													)
													.catch(err => {
														expect(err).to.equal('getAccount-ERR');
														done();
													});
											});
										});
										describe('when succeeds', () => {
											beforeEach(() => {
												return modules.accounts.getAccount.callsArgWith(
													1,
													null,
													'sender1'
												);
											});
											it('should return resolved promise with no error', done => {
												__private
													.applyUnconfirmedStep(
														{
															id: 5,
															height: 5,
															transactions: [
																{ id: 1, type: 0, senderPublicKey: 'a' },
																{ id: 2, type: 1, senderPublicKey: 'b' },
															],
														},
														appliedTransactions,
														dbStub.tx
													)
													.then(resolve => {
														expect(resolve).to.deep.equal([
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
							describe('if at least one transaction was applied', () => {
								beforeEach(() => {
									return modules.transactions.applyUnconfirmed
										.onCall(0)
										.callsArgWith(2, null, true)
										.callsArgWith(2, 'applyUnconfirmed-ERR', null);
								});
								afterEach(() => {
									expect(loggerStub.error.args[0][0]).to.equal(
										'Failed to apply transaction: 2 - applyUnconfirmed-ERR'
									);
									expect(loggerStub.error.args[1][0]).to.equal('Transaction');
									return expect(loggerStub.error.args[1][1]).to.deep.equal({
										id: 2,
										type: 1,
										senderPublicKey: 'b',
									});
								});
								describe('catch', () => {
									describe('modules.accounts.getAccount', () => {
										describe('when fails', () => {
											beforeEach(() => {
												modules.accounts.getAccount
													.onCall(0)
													.callsArgWith(1, 'getAccount-ERR', null)
													.callsArgWith(1, null, 'sender1');
												return modules.transactions.apply.callsArgWith(
													3,
													null,
													true
												);
											});
											afterEach(() => {
												expect(
													modules.accounts.setAccountAndGet.callCount
												).to.equal(2);
												expect(
													modules.transactions.applyUnconfirmed.callCount
												).to.equal(2);
												return expect(
													Object.keys(appliedTransactions).length
												).to.equal(1);
											});
											it('should return rejected promise with error', done => {
												__private
													.applyUnconfirmedStep(
														{
															id: 5,
															height: 5,
															transactions: [
																{ id: 1, type: 0, senderPublicKey: 'a' },
																{ id: 2, type: 1, senderPublicKey: 'b' },
															],
														},
														appliedTransactions,
														dbStub.tx
													)
													.catch(err => {
														expect(err).to.equal('getAccount-ERR');
														done();
													});
											});
										});
										describe('when succeeds', () => {
											beforeEach(() => {
												return modules.accounts.getAccount.callsArgWith(
													1,
													null,
													'sender1'
												);
											});
											describe('library.logic.transaction.undoUnconfirmed', () => {
												describe('when fails', () => {
													beforeEach(() => {
														return library.logic.transaction.undoUnconfirmed.callsArgWith(
															2,
															'undoUnconfirmed-ERR',
															null
														);
													});
													it('should return rejected promise with error', done => {
														__private
															.applyUnconfirmedStep(
																{
																	id: 5,
																	height: 5,
																	transactions: [
																		{ id: 1, type: 0, senderPublicKey: 'a' },
																		{ id: 2, type: 1, senderPublicKey: 'b' },
																	],
																},
																appliedTransactions,
																dbStub.tx
															)
															.catch(err => {
																expect(err).to.equal('undoUnconfirmed-ERR');
																done();
															});
													});
												});
												describe('when succeeds', () => {
													beforeEach(() => {
														return library.logic.transaction.undoUnconfirmed.callsArgWith(
															2,
															null,
															true
														);
													});
													it('should return resolved promise with no error', done => {
														__private
															.applyUnconfirmedStep(
																{
																	id: 5,
																	height: 5,
																	transactions: [
																		{ id: 1, type: 0, senderPublicKey: 'a' },
																		{ id: 2, type: 1, senderPublicKey: 'b' },
																	],
																},
																appliedTransactions,
																dbStub.tx
															)
															.then(resolve => {
																expect(resolve).to.be.deep.equal([
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
								});
							});
						});
						describe('when succeeds', () => {
							beforeEach(() => {
								return modules.transactions.applyUnconfirmed.callsArgWith(
									2,
									null,
									true
								);
							});
							afterEach(() => {
								expect(modules.accounts.setAccountAndGet.callCount).to.equal(2);
								expect(
									modules.transactions.applyUnconfirmed.callCount
								).to.equal(2);
								expect(modules.accounts.getAccount.callCount).to.equal(0);
								return expect(Object.keys(appliedTransactions).length).to.equal(
									2
								);
							});
							it('should return resolved promise with no error', done => {
								__private
									.applyUnconfirmedStep(
										{
											id: 5,
											height: 5,
											transactions: [
												{ id: 1, type: 0, senderPublicKey: 'a' },
												{ id: 2, type: 1, senderPublicKey: 'b' },
											],
										},
										appliedTransactions,
										dbStub.tx
									)
									.then(resolve => {
										expect(resolve).to.deep.equal([undefined, undefined]);
										done();
									});
							});
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
						{ id: 6, height: 6, transactions: undefined },
						dbStub.tx
					)
					.catch(err => {
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
					.applyConfirmedStep({ id: 6, height: 6, transactions: [] }, dbStub.tx)
					.then(resolved => {
						expect(resolved).to.be.an('array').that.is.empty;
						done();
					});
			});
		});
		describe('when block.transaction is not empty', () => {
			describe('modules.accounts.getAccount', () => {
				describe('when fails', () => {
					beforeEach(() => {
						modules.accounts.getAccount
							.onCall(0)
							.callsArgWith(1, 'getAccount-ERR', null)
							.callsArgWith(1, null, 'sender1');
						return modules.transactions.apply.callsArgWith(3, null, true);
					});
					afterEach(() => {
						expect(modules.accounts.getAccount.callCount).to.equal(1);
						expect(modules.transactions.apply.callCount).to.equal(0);
						expect(loggerStub.error.args[0][0]).to.equal(
							'Failed to apply transaction: 1 - getAccount-ERR'
						);
						expect(loggerStub.error.args[1][0]).to.equal('Transaction');
						return expect(loggerStub.error.args[1][1]).to.deep.equal({
							id: 1,
							type: 0,
							senderPublicKey: 'a',
						});
					});
					it('should return rejected promise with error', done => {
						__private
							.applyConfirmedStep(
								{
									id: 5,
									height: 5,
									transactions: [
										{ id: 1, type: 0, senderPublicKey: 'a' },
										{ id: 2, type: 1, senderPublicKey: 'b' },
									],
								},
								dbStub.tx
							)
							.catch(err => {
								expect(err).to.equal(
									'Failed to apply transaction: 1 - getAccount-ERR'
								);
								done();
							});
					});
				});
				describe('when succeeds', () => {
					beforeEach(() => {
						return modules.accounts.getAccount.callsArgWith(1, null, 'sender1');
					});
					describe('library.logic.transaction.apply', () => {
						describe('when fails', () => {
							beforeEach(() => {
								return modules.transactions.apply.callsArgWith(
									3,
									'apply-ERR',
									null
								);
							});
							afterEach(() => {
								expect(modules.accounts.getAccount.callCount).to.equal(1);
								expect(modules.transactions.apply.callCount).to.equal(1);
								expect(loggerStub.error.args[0][0]).to.equal(
									'Failed to apply transaction: 1 - apply-ERR'
								);
								expect(loggerStub.error.args[1][0]).to.equal('Transaction');
								return expect(loggerStub.error.args[1][1]).to.deep.equal({
									id: 1,
									type: 0,
									senderPublicKey: 'a',
								});
							});
							it('should return rejected promise with error', done => {
								__private
									.applyConfirmedStep(
										{
											id: 5,
											height: 5,
											transactions: [
												{ id: 1, type: 0, senderPublicKey: 'a' },
												{ id: 2, type: 1, senderPublicKey: 'b' },
											],
										},
										dbStub.tx
									)
									.catch(err => {
										expect(err).to.equal(
											'Failed to apply transaction: 1 - apply-ERR'
										);
										done();
									});
							});
						});
						describe('when succeeds', () => {
							beforeEach(() => {
								return modules.transactions.apply.callsArgWith(3, null, true);
							});
							afterEach(() => {
								return expect(
									modules.transactions.removeUnconfirmedTransaction.callCount
								).to.equal(2);
							});
							it('should return resolved promise with no error', done => {
								__private
									.applyConfirmedStep(
										{
											id: 5,
											height: 5,
											transactions: [
												{ id: 1, type: 0, senderPublicKey: 'a' },
												{ id: 2, type: 1, senderPublicKey: 'b' },
											],
										},
										dbStub.tx
									)
									.then(resolve => {
										expect(resolve).to.be.deep.equal([undefined, undefined]);
										done();
									});
							});
						});
					});
				});
			});
		});
	});
	describe('applyBlock', () => {
		var saveBlockTemp;
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
			expect(modules.blocks.isActive.set.calledTwice).to.be.true;
			done();
		});
		describe('undoUnconfirmedListStep', () => {
			beforeEach(() => {
				modules.accounts.setAccountAndGet.callsArgWith(1, null, 'sender1');
				modules.transactions.applyUnconfirmed.callsArgWith(2, null, null);
				return modules.accounts.getAccount.callsArgWith(1, null, 'sender1');
			});
			describe('modules.transactions.undoUnconfirmedList', () => {
				describe('when fails', () => {
					beforeEach(() => {
						return modules.transactions.undoUnconfirmedList.callsArgWith(
							0,
							'undoUnconfirmedList-ERR',
							null
						);
					});
					it('should call a callback with error', done => {
						blocksChainModule.applyBlock({ id: 5, height: 5 }, true, err => {
							expect(err).to.equal('Failed to undo unconfirmed list');
							done();
						});
					});
				});
				describe('when succeeds', () => {
					describe('applyUnconfirmedStep', () => {
						beforeEach(() => {
							return modules.transactions.undoUnconfirmedList.callsArgWith(
								0,
								null,
								true
							);
						});
						describe('when block.transactions is undefined', () => {
							beforeEach(() => {
								modules.accounts.setAccountAndGet.callsArgWith(
									1,
									null,
									'sender1'
								);
								return modules.transactions.applyUnconfirmed.callsArgWith(
									2,
									null,
									true
								);
							});
							it('should call a callback with error', done => {
								blocksChainModule.applyBlock(
									{ id: 6, height: 6, transactions: undefined },
									true,
									err => {
										expect(err.message).to.equal(
											'expecting an array or an iterable object but got [object Null]'
										);
										done();
									}
								);
							});
						});
						describe('when block.transactions is empty', () => {
							beforeEach(() => {
								return modules.accounts.setAccountAndGet.callsArgWith(
									1,
									null,
									'sender1'
								);
							});
							it('should call a callback with no error', done => {
								blocksChainModule.applyBlock(
									{ id: 6, height: 6, transactions: [] },
									true,
									err => {
										expect(err).to.be.null;
										done();
									}
								);
							});
						});
						describe('when block.transactions is not empty', () => {
							describe('modules.accounts.setAccountAndGet', () => {
								describe('when fails', () => {
									beforeEach(() => {
										return modules.accounts.setAccountAndGet
											.onCall(0)
											.callsArgWith(1, null, true)
											.callsArgWith(1, 'setAccountAndGet-ERR', null);
									});
									describe('catch', () => {
										describe('modules.accounts.getAccount', () => {
											describe('when fails', () => {
												beforeEach(() => {
													modules.accounts.getAccount
														.onCall(0)
														.callsArgWith(1, 'getAccount-ERR', null)
														.callsArgWith(1, null, 'sender1');
													return modules.transactions.apply.callsArgWith(
														3,
														null,
														true
													);
												});
												it('should call a callback with error', done => {
													blocksChainModule.applyBlock(
														{
															id: 5,
															height: 5,
															transactions: [
																{ id: 1, type: 0 },
																{ id: 2, type: 1 },
															],
														},
														true,
														err => {
															expect(err).to.equal('getAccount-ERR');
															done();
														}
													);
												});
											});
											describe('when succeeds', () => {
												beforeEach(() => {
													return modules.accounts.getAccount.callsArgWith(
														1,
														null,
														'sender1'
													);
												});
												describe('library.logic.transaction.undoUnconfirmed', () => {
													describe('when fails', () => {
														beforeEach(() => {
															return library.logic.transaction.undoUnconfirmed.callsArgWith(
																2,
																'undoUnconfirmed-ERR',
																null
															);
														});
														it('should call a callback with error', done => {
															blocksChainModule.applyBlock(
																{
																	id: 5,
																	height: 5,
																	transactions: [
																		{ id: 1, type: 0 },
																		{ id: 2, type: 1 },
																	],
																},
																true,
																err => {
																	expect(err).to.equal('undoUnconfirmed-ERR');
																	done();
																}
															);
														});
													});
												});
											});
										});
									});
								});
								describe('when succeeds', () => {
									beforeEach(() => {
										return modules.accounts.setAccountAndGet.callsArgWith(
											1,
											null,
											'sender1'
										);
									});
									describe('modules.transactions.applyUnconfirmed', () => {
										describe('when fails', () => {
											beforeEach(() => {
												modules.transactions.applyUnconfirmed
													.onCall(0)
													.callsArgWith(2, null, true);
												return modules.transactions.applyUnconfirmed
													.onCall(1)
													.callsArgWith(2, 'applyUnconfirmed-ERR', null);
											});
											describe('catch', () => {
												describe('modules.accounts.getAccount', () => {
													describe('when fails', () => {
														beforeEach(() => {
															modules.accounts.getAccount
																.onCall(0)
																.callsArgWith(1, 'getAccount-ERR', null)
																.callsArgWith(1, null, 'sender1');
															return modules.transactions.apply.callsArgWith(
																3,
																null,
																true
															);
														});
														it('should call a callback with error', done => {
															blocksChainModule.applyBlock(
																{
																	id: 5,
																	height: 5,
																	transactions: [
																		{ id: 1, type: 0 },
																		{ id: 2, type: 1 },
																	],
																},
																true,
																err => {
																	expect(err).to.equal('getAccount-ERR');
																	done();
																}
															);
														});
													});
													describe('when succeeds', () => {
														beforeEach(() => {
															return modules.accounts.getAccount.callsArgWith(
																1,
																null,
																'sender1'
															);
														});
														describe('library.logic.transaction.undoUnconfirmed', () => {
															describe('when fails', () => {
																beforeEach(() => {
																	return library.logic.transaction.undoUnconfirmed.callsArgWith(
																		2,
																		'undoUnconfirmed-ERR',
																		null
																	);
																});
																it('should call a callback with error', done => {
																	blocksChainModule.applyBlock(
																		{
																			id: 5,
																			height: 5,
																			transactions: [
																				{ id: 1, type: 0 },
																				{ id: 2, type: 1 },
																			],
																		},
																		true,
																		err => {
																			expect(err).to.equal(
																				'undoUnconfirmed-ERR'
																			);
																			done();
																		}
																	);
																});
															});
															describe('when succeeds', () => {
																describe('applyConfirmedStep', () => {
																	describe('when block.transactions is empty', () => {
																		beforeEach(() => {
																			modules.transactions.undoUnconfirmedList.callsArgWith(
																				0,
																				null,
																				true
																			);
																			return modules.accounts.setAccountAndGet.callsArgWith(
																				1,
																				null,
																				'sender1'
																			);
																		});
																		it('should call a callback with no error', done => {
																			blocksChainModule.applyBlock(
																				{ id: 6, height: 6, transactions: [] },
																				true,
																				err => {
																					expect(err).to.be.null;
																					done();
																				}
																			);
																		});
																	});
																	describe('when block.transactions is not empty', () => {
																		beforeEach(() => {
																			modules.transactions.undoUnconfirmedList.callsArgWith(
																				0,
																				null,
																				true
																			);
																			modules.accounts.setAccountAndGet.callsArgWith(
																				1,
																				null,
																				'sender1'
																			);
																			return modules.transactions.applyUnconfirmed
																				.onCall(1)
																				.callsArgWith(2, null, true);
																		});
																		describe('modules.accounts.getAccount', () => {
																			describe('when fails', () => {
																				beforeEach(() => {
																					return modules.accounts.getAccount.callsArgWith(
																						1,
																						'getAccount-ERR',
																						null
																					);
																				});
																				it('should call a callback with error', done => {
																					blocksChainModule.applyBlock(
																						{
																							id: 5,
																							height: 5,
																							transactions: [
																								{ id: 1, type: 0 },
																								{ id: 2, type: 1 },
																							],
																						},
																						true,
																						err => {
																							expect(err).to.equal(
																								'Failed to apply transaction: 1 - getAccount-ERR'
																							);
																							done();
																						}
																					);
																				});
																			});
																			describe('when succeeds', () => {
																				beforeEach(() => {
																					return modules.accounts.getAccount.callsArgWith(
																						1,
																						null,
																						'sender1'
																					);
																				});
																				describe('modules.transactions.apply', () => {
																					describe('when fails', () => {
																						beforeEach(() => {
																							return modules.transactions.apply.callsArgWith(
																								3,
																								'apply-ERR',
																								null
																							);
																						});
																						it('should call a callback with error', done => {
																							blocksChainModule.applyBlock(
																								{
																									id: 5,
																									height: 5,
																									transactions: [
																										{ id: 1, type: 0 },
																										{ id: 2, type: 1 },
																									],
																								},
																								true,
																								err => {
																									expect(err).to.equal(
																										'Failed to apply transaction: 1 - apply-ERR'
																									);
																									done();
																								}
																							);
																						});
																					});
																					describe('when succeeds', () => {
																						beforeEach(() => {
																							return modules.transactions.apply.callsArgWith(
																								3,
																								null,
																								true
																							);
																						});
																						describe('saveBlockStep', () => {
																							afterEach(() => {
																								expect(
																									modules.blocks.lastBlock.set
																										.calledOnce
																								).to.be.true;
																								return expect(
																									modules.blocks.lastBlock.set
																										.args[0][0]
																								).to.deep.equal({
																									id: 5,
																									height: 5,
																									transactions: [
																										{ id: 1, type: 0 },
																										{ id: 2, type: 1 },
																									],
																								});
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
																									afterEach(() => {
																										expect(
																											loggerStub.error
																												.args[0][0]
																										).to.contains(
																											'Failed to save block...'
																										);
																										expect(
																											loggerStub.error
																												.args[0][1]
																										).to.contains(
																											'saveBlock-ERR'
																										);
																										expect(
																											loggerStub.error
																												.args[1][0]
																										).to.equal('Block');
																										expect(
																											loggerStub.error
																												.args[1][1]
																										).to.deep.equal({
																											id: 5,
																											height: 5,
																											transactions: [
																												{ id: 1, type: 0 },
																												{ id: 2, type: 1 },
																											],
																										});
																										return expect(
																											blocksChainModule
																												.saveBlock.args[0][0]
																										).to.deep.equal({
																											id: 5,
																											height: 5,
																											transactions: [
																												{ id: 1, type: 0 },
																												{ id: 2, type: 1 },
																											],
																										});
																									});
																									it('should call a callback with error', done => {
																										blocksChainModule.applyBlock(
																											{
																												id: 5,
																												height: 5,
																												transactions: [
																													{ id: 1, type: 0 },
																													{ id: 2, type: 1 },
																												],
																											},
																											true,
																											err => {
																												expect(err).to.equal(
																													'saveBlock-ERR'
																												);
																												done();
																											}
																										);
																									});
																								});
																								describe('when self.saveBlock succeeds', () => {
																									beforeEach(() => {
																										return blocksChainModule.saveBlock.callsArgWith(
																											1,
																											null,
																											true
																										);
																									});
																									afterEach(() => {
																										expect(
																											loggerStub.debug
																												.args[0][0]
																										).to.contains(
																											'Block applied correctly with 2 transactions'
																										);
																										expect(
																											blocksChainModule
																												.saveBlock.args[0][0]
																										).to.deep.equal({
																											id: 5,
																											height: 5,
																											transactions: [
																												{ id: 1, type: 0 },
																												{ id: 2, type: 1 },
																											],
																										});
																										expect(
																											library.bus.message
																												.calledOnce
																										).to.be.true;
																										expect(
																											library.bus.message
																												.args[0][0]
																										).to.deep.equal('newBlock');
																										return expect(
																											library.bus.message
																												.args[0][1]
																										).to.deep.equal({
																											id: 5,
																											height: 5,
																											transactions: [
																												{ id: 1, type: 0 },
																												{ id: 2, type: 1 },
																											],
																										});
																									});
																									describe('modules.rounds.tick', () => {
																										describe('when fails', () => {
																											beforeEach(() => {
																												return modules.rounds.tick.callsArgWith(
																													1,
																													'tick-ERR',
																													null
																												);
																											});
																											it('should call a callback with error', done => {
																												blocksChainModule.applyBlock(
																													{
																														id: 5,
																														height: 5,
																														transactions: [
																															{
																																id: 1,
																																type: 0,
																															},
																															{
																																id: 2,
																																type: 1,
																															},
																														],
																													},
																													true,
																													err => {
																														expect(
																															err
																														).to.equal(
																															'tick-ERR'
																														);
																														done();
																													}
																												);
																											});
																										});
																										describe('when Snapshot finished', () => {
																											beforeEach(() => {
																												return modules.rounds.tick.callsArgWith(
																													1,
																													'Snapshot finished',
																													null
																												);
																											});
																											afterEach(() => {
																												expect(
																													loggerStub.info
																														.args[0][0]
																												).to.equal(
																													'Snapshot finished'
																												);
																												return expect(
																													process.emit
																														.calledOnce
																												).to.be.true;
																											});
																											it('should emit SIGTERM and call a callback with error', done => {
																												blocksChainModule.applyBlock(
																													{
																														id: 5,
																														height: 5,
																														transactions: [
																															{
																																id: 1,
																																type: 0,
																															},
																															{
																																id: 2,
																																type: 1,
																															},
																														],
																													},
																													true,
																													err => {
																														expect(
																															err
																														).to.equal(
																															'Snapshot finished'
																														);
																														done();
																													}
																												);
																											});
																										});
																										describe('when succeeds', () => {
																											beforeEach(() => {
																												return modules.rounds.tick.callsArgWith(
																													1,
																													null,
																													true
																												);
																											});
																											it('should call a callback with no error', done => {
																												blocksChainModule.applyBlock(
																													{
																														id: 5,
																														height: 5,
																														transactions: [
																															{
																																id: 1,
																																type: 0,
																															},
																															{
																																id: 2,
																																type: 1,
																															},
																														],
																													},
																													true,
																													err => {
																														expect(err).to.be
																															.null;
																														done();
																													}
																												);
																											});
																										});
																									});
																								});
																							});
																							describe('when saveBlock is false', () => {
																								afterEach(() => {
																									expect(
																										library.bus.message
																											.calledOnce
																									).to.be.true;
																									expect(
																										library.bus.message
																											.args[0][0]
																									).to.deep.equal('newBlock');
																									return expect(
																										library.bus.message
																											.args[0][1]
																									).to.deep.equal({
																										id: 5,
																										height: 5,
																										transactions: [
																											{ id: 1, type: 0 },
																											{ id: 2, type: 1 },
																										],
																									});
																								});
																								describe('modules.rounds.tick', () => {
																									describe('when fails', () => {
																										beforeEach(() => {
																											return modules.rounds.tick.callsArgWith(
																												1,
																												'tick-ERR',
																												null
																											);
																										});
																										it('should call a callback with error', done => {
																											blocksChainModule.applyBlock(
																												{
																													id: 5,
																													height: 5,
																													transactions: [
																														{ id: 1, type: 0 },
																														{ id: 2, type: 1 },
																													],
																												},
																												false,
																												err => {
																													expect(err).to.equal(
																														'tick-ERR'
																													);
																													done();
																												}
																											);
																										});
																									});
																									describe('when Snapshot finished', () => {
																										beforeEach(done => {
																											modules.rounds.tick.callsArgWith(
																												1,
																												'Snapshot finished',
																												null
																											);
																											process.emit = sinonSandbox.stub();
																											done();
																										});
																										afterEach(() => {
																											expect(
																												loggerStub.info
																													.args[0][0]
																											).to.equal(
																												'Snapshot finished'
																											);
																											return expect(
																												process.emit.calledOnce
																											).to.be.true;
																										});
																										it('should emit SIGTERM and call a callback with error', done => {
																											blocksChainModule.applyBlock(
																												{
																													id: 5,
																													height: 5,
																													transactions: [
																														{ id: 1, type: 0 },
																														{ id: 2, type: 1 },
																													],
																												},
																												false,
																												err => {
																													expect(err).to.equal(
																														'Snapshot finished'
																													);
																													done();
																												}
																											);
																										});
																									});
																									describe('when succeeds', () => {
																										beforeEach(() => {
																											return modules.rounds.tick.callsArgWith(
																												1,
																												null,
																												true
																											);
																										});
																										it('should call a callback with no error', done => {
																											blocksChainModule.applyBlock(
																												{
																													id: 5,
																													height: 5,
																													transactions: [
																														{ id: 1, type: 0 },
																														{ id: 2, type: 1 },
																													],
																												},
																												false,
																												err => {
																													expect(err).to.be
																														.null;
																													done();
																												}
																											);
																										});
																									});
																								});
																							});
																						});
																					});
																				});
																			});
																		});
																	});
																});
															});
														});
													});
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});

	describe('broadcastReducedBlock', () => {
		it('should call library.bus.message with reducedBlock and broadcast', () => {
			blocksChainModule.broadcastReducedBlock({ id: 3, height: 3 }, true);
			expect(library.bus.message.calledOnce).to.be.true;
			expect(library.bus.message.args[0][0]).to.equal('broadcastBlock');
			expect(library.bus.message.args[0][1]).to.deep.equal({
				id: 3,
				height: 3,
			});
			return expect(library.bus.message.args[0][2]).to.be.true;
		});
	});

	describe('__private.popLastBlock', () => {
		describe('modules.blocks.utils.loadBlocksPart', () => {
			describe('when fails', () => {
				describe('if returns error', () => {
					beforeEach(() => {
						return modules.blocks.utils.loadBlocksPart.callsArgWith(
							1,
							'loadBlocksPart-ERR',
							null
						);
					});

					it('should call a callback with returned error', done => {
						__private.popLastBlock({ id: 3, height: 3 }, err => {
							expect(err).to.equal('loadBlocksPart-ERR');
							done();
						});
					});
				});

				describe('if returns empty', () => {
					beforeEach(() => {
						return modules.blocks.utils.loadBlocksPart.callsArgWith(
							1,
							null,
							[]
						);
					});

					it('should call a callback with error "previousBlock is null"', done => {
						__private.popLastBlock({ id: 3, height: 3 }, err => {
							expect(err).to.equal('previousBlock is null');
							done();
						});
					});
				});
			});

			describe('when succeeds', () => {
				beforeEach(() => {
					return modules.blocks.utils.loadBlocksPart.callsArgWith(1, null, [
						{ id: 2, height: 2 },
					]);
				});
				describe('when oldLastBlock.transactions is empty', () => {
					describe('modules.rounds.backwardTick', () => {
						describe('when fails', () => {
							beforeEach(() => {
								return modules.rounds.backwardTick.callsArgWith(
									2,
									'backwardTick-ERR',
									null
								);
							});

							afterEach(() => {
								expect(loggerStub.error.args[0][0]).to.equal(
									'Failed to perform backwards tick'
								);
								return expect(loggerStub.error.args[0][1]).to.equal(
									'backwardTick-ERR'
								);
							});

							it('should return process.exit(0)', done => {
								process.exit = done;
								__private.popLastBlock(
									{ id: 3, height: 3, transactions: [] },
									() => {
										done();
									}
								);
							});
						});
						describe('when succeeds', () => {
							var deleteBlockTemp;
							beforeEach(done => {
								modules.rounds.backwardTick.callsArgWith(2, null, true);
								deleteBlockTemp = blocksChainModule.deleteBlock;
								blocksChainModule.deleteBlock = sinonSandbox.stub();
								done();
							});

							afterEach(done => {
								blocksChainModule.deleteBlock = deleteBlockTemp;
								done();
							});

							describe('self.deleteBlock', () => {
								describe('when fails', () => {
									beforeEach(() => {
										return blocksChainModule.deleteBlock.callsArgWith(
											1,
											'deleteBlock-ERR',
											null
										);
									});

									afterEach(() => {
										expect(loggerStub.error.args[0][0]).to.equal(
											'Failed to delete block'
										);
										return expect(loggerStub.error.args[0][1]).to.equal(
											'deleteBlock-ERR'
										);
									});

									it('should call process.exit(0)', done => {
										process.exit = done;
										__private.popLastBlock(
											{
												id: 3,
												height: 3,
												transactions: [],
											},
											() => {
												done();
											}
										);
									});
								});

								describe('when succeeds', () => {
									beforeEach(() => {
										return blocksChainModule.deleteBlock.callsArgWith(
											1,
											null,
											true
										);
									});

									it('should return previousBlock and no error', done => {
										__private.popLastBlock(
											{
												id: 3,
												height: 3,
												transactions: [],
											},
											(err, previousBlock) => {
												expect(err).to.be.null;
												expect(previousBlock).to.deep.equal({
													id: 2,
													height: 2,
												});
												done();
											}
										);
									});
								});
							});
						});
					});
				});
				describe('when oldLastBlock.transactions is not empty', () => {
					describe('modules.accounts.getAccount', () => {
						describe('when fails', () => {
							beforeEach(() => {
								return modules.accounts.getAccount.callsArgWith(
									1,
									'getAccount-ERR',
									null
								);
							});
							afterEach(() => {
								expect(loggerStub.error.args[0][0]).to.equal(
									'Failed to undo transactions'
								);
								return expect(loggerStub.error.args[0][1]).to.equal(
									'getAccount-ERR'
								);
							});
							it('should return process.exit(0)', done => {
								process.exit = done;
								__private.popLastBlock(
									{ id: 3, height: 3, transactions: [{ id: 7, type: 0 }] },
									() => {
										done();
									}
								);
							});
						});
						describe('when succeeds', () => {
							beforeEach(() => {
								modules.accounts.getAccount.callsArgWith(1, null, '12ab');
								modules.transactions.undo.callsArgWith(3, null, true);
								return modules.transactions.undoUnconfirmed.callsArgWith(
									1,
									null,
									true
								);
							});
							afterEach(() => {
								return expect(modules.transactions.undoUnconfirmed.calledOnce)
									.to.be.true;
							});
							describe('modules.rounds.backwardTick', () => {
								describe('when fails', () => {
									beforeEach(() => {
										return modules.rounds.backwardTick.callsArgWith(
											2,
											'backwardTick-ERR',
											null
										);
									});
									afterEach(() => {
										expect(loggerStub.error.args[0][0]).to.equal(
											'Failed to perform backwards tick'
										);
										return expect(loggerStub.error.args[0][1]).to.equal(
											'backwardTick-ERR'
										);
									});
									it('should return process.exit(0)', done => {
										process.exit = done;
										__private.popLastBlock(
											{ id: 3, height: 3, transactions: [{ id: 7, type: 0 }] },
											() => {
												done();
											}
										);
									});
								});
								describe('when succeeds', () => {
									var deleteBlockTemp;
									beforeEach(done => {
										modules.rounds.backwardTick.callsArgWith(2, null, true);
										deleteBlockTemp = blocksChainModule.deleteBlock;
										blocksChainModule.deleteBlock = sinonSandbox.stub();
										done();
									});

									afterEach(done => {
										blocksChainModule.deleteBlock = deleteBlockTemp;
										done();
									});

									describe('self.deleteBlock', () => {
										describe('when fails', () => {
											beforeEach(() => {
												return blocksChainModule.deleteBlock.callsArgWith(
													1,
													'deleteBlock-ERR',
													null
												);
											});

											afterEach(() => {
												expect(loggerStub.error.args[0][0]).to.equal(
													'Failed to delete block'
												);
												return expect(loggerStub.error.args[0][1]).to.equal(
													'deleteBlock-ERR'
												);
											});

											it('should return process.exit(0)', done => {
												process.exit = done;
												__private.popLastBlock(
													{
														id: 3,
														height: 3,
														transactions: [{ id: 7, type: 0 }],
													},
													() => {
														done();
													}
												);
											});
										});

										describe('when succeeds', () => {
											beforeEach(() => {
												return blocksChainModule.deleteBlock.callsArgWith(
													1,
													null,
													true
												);
											});

											it('should call a callback with previousBlock and no error', done => {
												__private.popLastBlock(
													{
														id: 3,
														height: 3,
														transactions: [{ id: 7, type: 0 }],
													},
													(err, previousBlock) => {
														expect(err).to.be.null;
														expect(previousBlock).to.deep.equal({
															id: 2,
															height: 2,
														});
														done();
													}
												);
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});

	describe('deleteLastBlock', () => {
		var popLastBlockTemp;
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
			beforeEach(() => {
				return modules.blocks.lastBlock.get.returns({ id: 1, height: 1 });
			});
			it('should call a callback with error "Cannot delete genesis block', done => {
				blocksChainModule.deleteLastBlock(err => {
					expect(err).to.equal('Cannot delete genesis block');
					expect(loggerStub.warn.args[0][1]).to.deep.equal({
						id: 1,
						height: 1,
					});
					done();
				});
			});
		});
		describe('when lastBlock.height != 1', () => {
			beforeEach(() => {
				return modules.blocks.lastBlock.get.returns({
					id: 3,
					height: 3,
					transactions: [{ id: 7, type: 0 }, { id: 6, type: 0 }],
				});
			});
			describe('__private.popLastBlock', () => {
				describe('when fails', () => {
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
							expect(loggerStub.error.args[0][1]).to.deep.equal({
								id: 3,
								height: 3,
								transactions: [{ id: 7, type: 0 }, { id: 6, type: 0 }],
							});
							done();
						});
					});
				});
				describe('when succeeds', () => {
					beforeEach(() => {
						return __private.popLastBlock.callsArgWith(1, null, {
							id: 2,
							height: 2,
							transactions: [{ id: 5, type: 0 }, { id: 4, type: 0 }],
						});
					});
					describe('modules.transactions.receiveTransactions', () => {
						describe('when fails', () => {
							beforeEach(() => {
								return modules.transactions.receiveTransactions.callsArgWith(
									2,
									'receiveTransactions-ERR',
									true
								);
							});
							afterEach(() => {
								expect(loggerStub.error.args[0][0]).to.equal(
									'Error adding transactions'
								);
								expect(loggerStub.error.args[0][1]).to.deep.equal(
									'receiveTransactions-ERR'
								);
								return expect(modules.blocks.lastBlock.set.calledOnce).to.be
									.true;
							});
							it('should call a callback with no error', done => {
								blocksChainModule.deleteLastBlock((err, newLastBlock) => {
									expect(err).to.be.null;
									expect(newLastBlock).to.deep.equal({
										id: 2,
										height: 2,
										transactions: [{ id: 5, type: 0 }, { id: 4, type: 0 }],
									});
									done();
								});
							});
						});
						describe('when succeeds', () => {
							beforeEach(() => {
								return modules.transactions.receiveTransactions.callsArgWith(
									2,
									null,
									true
								);
							});
							afterEach(() => {
								return expect(modules.blocks.lastBlock.set.calledOnce).to.be
									.true;
							});
							it('should call a callback with no error', done => {
								blocksChainModule.deleteLastBlock((err, newLastBlock) => {
									expect(err).to.be.null;
									expect(newLastBlock).to.deep.equal({
										id: 2,
										height: 2,
										transactions: [{ id: 5, type: 0 }, { id: 4, type: 0 }],
									});
									done();
								});
							});
						});
					});
				});
			});
		});
	});

	describe('recoverChain', () => {
		var deleteLastBlockTemp;
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

		describe('self.deleteLastBlock', () => {
			describe('when fails', () => {
				beforeEach(done => {
					blocksChainModule.deleteLastBlock = sinonSandbox
						.stub()
						.callsArgWith(0, 'deleteLastBlock-ERR', null);
					done();
				});
				afterEach(() => {
					return expect(loggerStub.error.args[0][0]).to.equal(
						'Recovery failed'
					);
				});

				it('should call a callback with error', done => {
					blocksChainModule.recoverChain(err => {
						expect(err).to.equal('deleteLastBlock-ERR');
						done();
					});
				});
			});

			describe('when succeeds', () => {
				beforeEach(done => {
					blocksChainModule.deleteLastBlock = sinonSandbox
						.stub()
						.callsArgWith(0, null, { id: 1 });
					done();
				});
				afterEach(() => {
					expect(loggerStub.info.args[0][0]).to.equal(
						'Recovery complete, new last block'
					);
					return expect(loggerStub.info.args[0][1]).to.equal(1);
				});
				it('should call a callback with error = null', done => {
					blocksChainModule.recoverChain(err => {
						expect(err).to.be.null;
						done();
					});
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
			return expect(modules.transactions).to.equal(modulesStub.transactions);
		});

		it('should set __private.loaded to true', () => {
			return expect(__private.loaded).to.be.true;
		});
	});
});
