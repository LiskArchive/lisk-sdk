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

const {
	registeredTransactions,
} = require('../../../../common/registered_transactions');
const {
	TransactionInterfaceAdapter,
} = require('../../../../../../src/modules/chain/interface_adapters');
const { Transaction } = require('../../../../fixtures/transactions');
const blocksChainModule = require('../../../../../../src/modules/chain/blocks/chain');
const transactionsModule = require('../../../../../../src/modules/chain/transactions');
const { BlockSlots } = require('../../../../../../src/modules/chain/dpos');

const interfaceAdapters = {
	transactions: new TransactionInterfaceAdapter(registeredTransactions),
};

describe('blocks/chain', () => {
	let blocksChain;
	let storageStub;
	let roundsModuleStub;
	let slots;
	let exceptions;

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
		version: 1,
		totalAmount: 0,
		totalFee: '10',
		reward: '100',
		generatorPublicKey:
			'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
		previousBlockId: undefined,
		transactions: transactionsForBlock.map(transaction =>
			interfaceAdapters.transactions.fromJson(transaction),
		),
	};

	const block1 = {
		id: 2,
		height: 2,
		version: 1,
		totalAmount: 0,
		totalFee: '10',
		reward: '100',
		generatorPublicKey:
			'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
		previousBlockId: undefined,
		transactions: [],
	};

	const block2 = {
		id: 3,
		height: 3,
		version: 1,
		totalAmount: 0,
		totalFee: 10,
		reward: 100,
		generatorPublicKey:
			'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a9',
		transactions: [],
	};

	const transactionsForGenesisBlock = [
		new Transaction({ type: 3 }),
		new Transaction({ type: 2 }),
		new Transaction({ type: 1 }),
	];

	const genesisBlockWithTransactions = {
		id: 1,
		height: 1,
		version: 1,
		transactions: transactionsForGenesisBlock.map(transaction =>
			interfaceAdapters.transactions.fromJson(transaction),
		),
	};

	beforeEach(async () => {
		exceptions = __testContext.config.modules.chain.exceptions;
		// Logic
		storageStub = {
			entities: {
				Block: {
					get: sinonSandbox.stub(),
					begin: sinonSandbox.stub().callsArgAsync(1),
					getOne: sinonSandbox.stub(),
					isPersisted: sinonSandbox.stub(),
					create: sinonSandbox.stub(),
					delete: sinonSandbox.stub(),
				},
				TempBlock: {
					create: sinonSandbox.stub(),
				},
				Transaction: {
					create: sinonSandbox.stub(),
					begin: sinonSandbox.stub(),
				},
			},
		};

		roundsModuleStub = {
			backwardTick: sinonSandbox.stub(),
			tick: sinonSandbox.stub(),
		};

		slots = new BlockSlots({
			epochTime: __testContext.config.constants.EPOCH_TIME,
			interval: __testContext.config.constants.BLOCK_TIME,
			blocksPerRound: __testContext.config.constants.ACTIVE_DELEGATES,
		});

		blocksChain = new blocksChainModule.BlocksChain({
			storage: storageStub,
			interfaceAdapters,
			roundsModule: roundsModuleStub,
			slots,
			exceptions,
			genesisBlock: __testContext.config.genesisBlock,
		});
	});

	afterEach(() => sinonSandbox.restore());

	describe('constructor', () => {
		it('should assign params to parameter', async () => {
			expect(blocksChain.storage).to.eql(storageStub);
			expect(blocksChain.interfaceAdapters).to.eql(interfaceAdapters);
			expect(blocksChain.roundsModule).to.eql(roundsModuleStub);
			expect(blocksChain.slots).to.eql(slots);
			expect(blocksChain.exceptions).to.eql(exceptions);
			expect(blocksChain.genesisBlock).to.eql(
				__testContext.config.genesisBlock,
			);
		});
	});

	describe('saveGenesisBlock', () => {
		describe('when storage.entities.Block.isPersisted fails', () => {
			beforeEach(async () =>
				storageStub.entities.Block.isPersisted.rejects(
					new Error('getGenesisBlockId-ERR'),
				),
			);

			it('should throw an error', async () => {
				try {
					await blocksChain.saveGenesisBlock();
				} catch (error) {
					expect(error.message).to.equal('getGenesisBlockId-ERR');
				}
			});
		});

		describe('when storage.entities.Block.isPersisted succeeds', () => {
			describe('if returns false (genesis block is not in database)', () => {
				let txStub;

				beforeEach(async () => {
					txStub = {
						blocks: {
							save: sinonSandbox.stub(),
						},
						transactions: {
							save: sinonSandbox.stub(),
						},
						batch: sinonSandbox.stub(),
					};
					storageStub.entities.Block.isPersisted.resolves(false);
					storageStub.entities.Block.begin.callsArgWith(1, txStub);
				});

				describe('when saveBlock fails', () => {
					beforeEach(async () => {
						storageStub.entities.Block.begin.throws(new Error('saveBlock-ERR'));
					});

					it('should throw an error', async () => {
						try {
							await blocksChain.saveGenesisBlock();
						} catch (error) {
							expect(error.message).to.equal('saveBlock-ERR');
						}
					});
				});

				describe('when saveBlock succeeds', () => {
					it('should call proper storage functions', async () => {
						await blocksChain.saveGenesisBlock();
						expect(storageStub.entities.Block.begin).to.be.calledOnce;
						expect(storageStub.entities.Block.create).to.be.calledOnce;
						expect(storageStub.entities.Transaction.create).to.be.calledOnce;
					});
				});
			});

			describe('if returns true', () => {
				beforeEach(async () => {
					storageStub.entities.Block.isPersisted.resolves(true);
					storageStub.entities.Block.begin.callsArgWith(1);
				});

				it('should not save block', async () => {
					await blocksChain.saveGenesisBlock();
					expect(storageStub.entities.Block.begin).not.to.be.calledOnce;
				});
			});
		});
	});

	describe('saveBlock', () => {
		describe('when tx param is passed', () => {
			let txStub;
			beforeEach(async () => {
				txStub = {
					blocks: {
						save: sinonSandbox.stub(),
					},
					transactions: {
						save: sinonSandbox.stub(),
					},
					batch: sinonSandbox.stub(),
				};
			});

			describe('when tx.batch fails', () => {
				beforeEach(() => txStub.batch.rejects(new Error('txbatch-ERR')));

				it('should throw an error', async () => {
					try {
						await blocksChainModule.saveBlock(
							storageStub,
							blockWithTransactions,
							txStub,
						);
					} catch (err) {
						expect(err.message).to.equal('txbatch-ERR');
					}
				});
			});

			describe('when tx.batch succeeds', () => {
				beforeEach(async () => {
					txStub.batch.resolves();
				});

				it('should call storage functions', async () => {
					await blocksChainModule.saveBlock(
						storageStub,
						blockWithTransactions,
						txStub,
					);

					expect(storageStub.entities.Block.begin).not.to.be.called;
					expect(storageStub.entities.Block.create).to.be.calledOnce;
					expect(storageStub.entities.Transaction.create).to.be.calledOnce;
					expect(txStub.batch).to.be.calledOnce;
				});
			});
		});

		describe('when tx param is not passed', () => {
			let txStub;

			beforeEach(async () => {
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
			});

			describe('when tx.batch fails', () => {
				beforeEach(() => txStub.batch.rejects(new Error('txbatch-ERR')));

				it('should call a callback with error', async () => {
					try {
						await blocksChainModule.saveBlock(
							storageStub,
							blockWithTransactions,
						);
					} catch (err) {
						expect(err.message).to.equal('txbatch-ERR');
					}
				});
			});

			describe('when tx.batch succeeds', () => {
				beforeEach(async () => {
					txStub.batch.resolves();
				});

				it('should call storage functions', async () => {
					await blocksChainModule.saveBlock(storageStub, blockWithTransactions);
					expect(storageStub.entities.Block.begin).to.be.calledOnce;
					expect(storageStub.entities.Block.create).to.be.calledOnce;
					expect(storageStub.entities.Transaction.create).to.be.calledOnce;
					expect(txStub.batch).to.be.calledOnce;
				});
			});
		});
	});

	describe('deleteBlock', () => {
		describe('when storageStub.entities.Block.delete fails', () => {
			beforeEach(() =>
				storageStub.entities.Block.delete.rejects(new Error('deleteBlock-ERR')),
			);

			it('should call a callback with error', async () => {
				try {
					await blocksChainModule.deleteBlock(storageStub, 1);
				} catch (err) {
					expect(err.message).to.equal('deleteBlock-ERR');
				}
			});
		});

		describe('when storageStub.entities.Block.delete succeeds', () => {
			beforeEach(() => storageStub.entities.Block.delete.resolves(true));

			it('should call a callback with no error', async () => {
				await blocksChainModule.deleteBlock(storageStub, 1);
				expect(storageStub.entities.Block.delete).to.be.calledOnce;
			});
		});
	});

	describe('deleteFromBlockId', () => {
		describe('when storageStub.entities.Block.getOne fails', () => {
			beforeEach(async () => {
				storageStub.entities.Block.getOne.rejects(
					new Error('deleteFromBlockId-ERR'),
				);
			});

			it('should throw an error', async () => {
				try {
					await blocksChainModule.deleteFromBlockId(storageStub, 1);
				} catch (err) {
					expect(err.message).to.equal('deleteFromBlockId-ERR');
				}
			});
		});

		describe('when storageStub.entities.Block.delete fails', () => {
			beforeEach(() => {
				storageStub.entities.Block.getOne.resolves({ height: 1 });
				return storageStub.entities.Block.delete.rejects(
					new Error('deleteFromBlockId-ERR'),
				);
			});

			it('should throw an error', async () => {
				try {
					await blocksChainModule.deleteFromBlockId(storageStub, 1);
				} catch (err) {
					expect(err.message).to.equal('deleteFromBlockId-ERR');
				}
			});
		});

		describe('when storageStub.entities.Block.delete succeeds', () => {
			beforeEach(() => {
				storageStub.entities.Block.getOne.resolves({ height: 1 });
				return storageStub.entities.Block.delete.resolves(true);
			});

			it('should call return true', async () => {
				const res = await blocksChainModule.deleteFromBlockId(storageStub, 1);
				expect(res).to.be.true;
			});
		});
	});

	describe('applyGenesisBlock', () => {
		beforeEach(async () => {
			roundsModuleStub.tick.callsArgWith(1, null, true);
		});

		describe('when block.transactions is not empty', () => {
			describe('when applyGenesisTransactions succeeds', () => {
				beforeEach(async () => {
					sinonSandbox
						.stub(transactionsModule, 'applyGenesisTransactions')
						.returns(
							sinonSandbox.stub().returns({
								stateStore: {
									account: {
										finalize: sinonSandbox.stub(),
									},
									round: {
										finalize: sinonSandbox.stub(),
										setRoundForData: sinonSandbox.stub(),
									},
								},
							}),
						);
				});

				it('modules.rouds.tick should call a callback', async () => {
					await blocksChain.applyGenesisBlock(blockWithTransactions);
					expect(roundsModuleStub.tick.args[0][0]).to.deep.equal(
						blockWithTransactions,
					);
				});
			});
		});
	});

	describe('applyConfirmedStep', () => {
		/* eslint-disable mocha/no-pending-tests */
		it('should return when block.transactions includes no transactions');

		it('should call modules.processTransactions.undoTransactions');

		it('should throw error when errors exist in unappliedTransactionResponse');

		it('should call stateStore.account.finalize');

		it('should call stateStore.round.setRoundForData with correct parameters');

		it('should call tateStore.round.finalize');
		/* eslint-enable mocha/no-pending-tests */
	});

	describe('saveBlockStep', () => {
		let txStub;

		beforeEach(async () => {
			roundsModuleStub.tick.callsArgWith(1, null, true);
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
		});

		describe('when saveBlock is true', () => {
			describe('when self.saveBlock fails', () => {
				beforeEach(async () => {
					storageStub.entities.Block.begin.rejects(new Error('saveBlock-ERR'));
				});

				it('should call a callback with error', async () => {
					try {
						await blocksChainModule.saveBlockStep(
							storageStub,
							roundsModuleStub,
							blockWithTransactions,
							true,
						);
					} catch (err) {
						expect(err.message).to.equal('saveBlock-ERR');
					}
				});
			});

			describe('when saveBlock succeeds', () => {
				describe('when rounds.tick fails', () => {
					beforeEach(() =>
						roundsModuleStub.tick.callsArgWith(1, new Error('tick-ERR'), null),
					);

					it('should call a callback with error', async () => {
						try {
							await blocksChainModule.saveBlockStep(
								storageStub,
								roundsModuleStub,
								blockWithTransactions,
								true,
							);
						} catch (err) {
							expect(err.message).to.equal('tick-ERR');
						}
					});
				});

				describe('when modules.rounds.tick succeeds', () => {
					beforeEach(() => roundsModuleStub.tick.callsArgWith(1, null, true));

					it('should not throw', async () => {
						const res = await blocksChainModule.saveBlockStep(
							storageStub,
							roundsModuleStub,
							blockWithTransactions,
							true,
						);
						expect(res).to.be.undefined;
					});
				});
			});
		});

		describe('when saveBlock is false', () => {
			beforeEach(() => roundsModuleStub.tick.callsArgWith(1, null, true));

			it('should not call storage to save', async () => {
				await blocksChainModule.saveBlockStep(
					storageStub,
					roundsModuleStub,
					blockWithTransactions,
					false,
				);
				expect(storageStub.entities.Block.begin).not.to.be.called;
				expect(storageStub.entities.Block.create).not.to.be.called;
				expect(storageStub.entities.Transaction.create).not.to.be.called;
				expect(txStub.batch).not.to.be.called;
			});
		});
	});

	describe('applyBlock', () => {
		let txStub;

		beforeEach(async () => {
			txStub = {
				blocks: {
					save: sinonSandbox.stub(),
				},
				transactions: {
					save: sinonSandbox.stub(),
				},
				batch: sinonSandbox.stub(),
			};
		});

		describe('when storageStub.entities.Block.begin fails', () => {
			beforeEach(async () => {
				storageStub.entities.Block.begin.rejects(
					new Error('Chain:applyBlock-ERR'),
				);
			});

			it('should throw an error', async () => {
				try {
					await blocksChain.applyBlock(blockWithTransactions);
				} catch (err) {
					expect(err.message).to.eql('Chain:applyBlock-ERR');
				}
			});
		});

		describe('when storageStub.entities.Block.begin succeeds', () => {
			let stateStoreStub;
			beforeEach(async () => {
				storageStub.entities.Block.begin.resolves();
				stateStoreStub = {
					account: {
						finalize: sinonSandbox.stub(),
					},
					round: {
						finalize: sinonSandbox.stub(),
						setRoundForData: sinonSandbox.stub(),
					},
				};
				sinonSandbox.stub(transactionsModule, 'applyTransactions').returns(
					sinonSandbox.stub().returns({
						transactionsResponses: [],
						stateStore: stateStoreStub,
					}),
				);
				storageStub.entities.Block.begin.callsArgWith(1, txStub);
			});

			describe('when shouldSave is true', () => {
				it('should call to save the block', async () => {
					await blocksChain.applyBlock(blockWithTransactions);
					expect(storageStub.entities.Block.create).to.be.calledOnce;
				});

				it('should finalize state store', async () => {
					await blocksChain.applyBlock(blockWithTransactions);
					expect(stateStoreStub.account.finalize).to.be.calledOnce;
				});
			});

			describe('when shouldSave is false', () => {
				it('should not call to save the block', async () => {
					await blocksChain.applyBlock(blockWithTransactions, false);
					expect(storageStub.entities.Block.create).not.to.be.called;
				});

				it('should finalize state store', async () => {
					await blocksChain.applyBlock(blockWithTransactions, false);
					expect(stateStoreStub.account.finalize).to.be.calledOnce;
				});
			});
		});
	});

	// TODO: add new tests once improve_transaction_eficiency is done
	describe('undoConfirmedStep', () => {
		/* eslint-disable mocha/no-pending-tests */
		it('should return when block.transactions includes no transactions');

		it('should call modules.processTransactions.undoTransactions');

		it('should throw error when errors exist in unappliedTransactionResponse');

		it('should call stateStore.account.finalize');

		it('should call stateStore.round.setRoundForData with correct parameters');

		it('should call tateStore.round.finalize');
		/* eslint-enable mocha/no-pending-tests */
	});

	describe('backwardTickStep', () => {
		let tx;
		describe('when modules.rounds.backwardTick fails', () => {
			beforeEach(async () => {
				roundsModuleStub.backwardTick.callsArgWith(
					2,
					new Error('backwardTick-ERR'),
					null,
				);
			});

			it('should reject the promise with "backwardTick-ERR"', async () => {
				try {
					await blocksChainModule.backwardTickStep(
						roundsModuleStub,
						blockWithEmptyTransactions,
						blockWithTransactions,
						tx,
					);
				} catch (err) {
					expect(err.message).to.equal('backwardTick-ERR');
				}
			});
		});

		describe('when modules.rounds.backwardTick succeeds', () => {
			beforeEach(async () => {
				roundsModuleStub.backwardTick.callsArgWith(2, null);
			});

			it('should resolve the promise', async () => {
				await blocksChainModule.backwardTickStep(
					roundsModuleStub,
					blockWithEmptyTransactions,
					blockWithTransactions,
					tx,
				);
			});
		});
	});

	describe('popLastBlock', () => {
		describe('when storageStub.entities.Block.begin passes', () => {
			let stateStoreStub;
			let txStub;

			beforeEach(async () => {
				txStub = sinonSandbox.stub();
				stateStoreStub = {
					account: {
						finalize: sinonSandbox.stub(),
					},
					round: {
						finalize: sinonSandbox.stub(),
						setRoundForData: sinonSandbox.stub(),
					},
				};
				sinonSandbox.stub(transactionsModule, 'undoTransactions').returns(
					sinonSandbox.stub().returns({
						transactionsResponses: [],
						stateStore: stateStoreStub,
					}),
				);
				roundsModuleStub.backwardTick.callsArgWith(2, null);
				storageStub.entities.Block.begin.callsArgWith(1, txStub);
				storageStub.entities.Block.get.resolves([block1]);
			});

			it('should not throw', async () => {
				await blocksChainModule.popLastBlock(
					storageStub,
					interfaceAdapters,
					genesisBlockWithTransactions,
					roundsModuleStub,
					slots,
					blockWithTransactions,
					exceptions,
				);
			});
		});
	});

	describe('deleteLastBlockAndStoreInTemp', () => {
		it('should throw with "Cannot delete genesis block"', async () => {
			try {
				await blocksChain.deleteLastBlockAndStoreInTemp(
					genesisBlockWithTransactions,
				);
			} catch (err) {
				expect(err.message).to.equal('Cannot delete genesis block');
			}
		});

		it('should not create entry in the temp_block table in case of error', async () => {
			try {
				await blocksChain.deleteLastBlockAndStoreInTemp(
					genesisBlockWithTransactions,
				);
			} catch (err) {
				expect(storageStub.entities.TempBlock.create).to.not.be.called;
			}
		});

		describe('when storageStub.entities.Block.begin fails', () => {
			beforeEach(async () => {
				storageStub.entities.Block.begin.rejects(new Error('db-tx_ERR'));
			});

			it('should throw with proper error message', async () => {
				try {
					await blocksChain.deleteLastBlockAndStoreInTemp(
						blockWithTransactions,
					);
				} catch (error) {
					expect(error.message).to.eql('db-tx_ERR');
				}
			});
		});

		describe('when storageStub.entities.Block.begin passes', () => {
			let stateStoreStub;
			let txStub;

			beforeEach(async () => {
				txStub = sinonSandbox.stub();
				stateStoreStub = {
					account: {
						finalize: sinonSandbox.stub(),
					},
					round: {
						finalize: sinonSandbox.stub(),
						setRoundForData: sinonSandbox.stub(),
					},
				};
				sinonSandbox.stub(transactionsModule, 'undoTransactions').resolves({
					transactionsResponses: [],
					stateStore: stateStoreStub,
				});
				roundsModuleStub.backwardTick.callsArgWith(2, null);
				storageStub.entities.Block.begin.callsArgWith(1, txStub);
				storageStub.entities.Block.get.resolves([block2]);
			});

			describe('when popLastBlock fails', () => {
				beforeEach(async () => {
					storageStub.entities.Block.get.rejects(new Error('db-get_ERR'));
				});

				it('should call a callback with proper error message', async () => {
					try {
						await blocksChain.deleteLastBlockAndStoreInTemp(
							blockWithTransactions,
						);
					} catch (error) {
						expect(error.message).to.eql('db-get_ERR');
					}
				});
			});

			describe('when popLastBlock succeeds', () => {
				it('call TempBlock with correct params', async () => {
					await blocksChain.deleteLastBlockAndStoreInTemp(block1);
					expect(storageStub.entities.TempBlock.create).to.be.calledWith({
						height: block1.height,
						id: block1.id,
						fullBlock: block1,
					});
				});
			});
		});
	});

	describe('deleteLastBlock', () => {
		describe('when lastBlock.height = 1', () => {
			it('should call a callback with error "Cannot delete genesis block', async () => {
				try {
					await blocksChain.deleteLastBlock(genesisBlockWithTransactions);
				} catch (err) {
					expect(err.message).to.equal('Cannot delete genesis block');
				}
			});
		});

		describe('when lastBlock.height != 1', () => {
			let stateStoreStub;
			beforeEach(async () => {
				stateStoreStub = {
					account: {
						finalize: sinonSandbox.stub(),
					},
					round: {
						finalize: sinonSandbox.stub(),
						setRoundForData: sinonSandbox.stub(),
					},
				};
				sinonSandbox.stub(transactionsModule, 'undoTransactions').returns(
					sinonSandbox.stub().returns({
						transactionsResponses: [],
						stateStore: stateStoreStub,
					}),
				);
				roundsModuleStub.backwardTick.callsArgWith(2, null);
				// storageStub.entities.Block.begin.callsArgWith(1, txStub);
				storageStub.entities.Block.begin.resolves(true);
				storageStub.entities.Block.begin.resolves('savedBlock');
				storageStub.entities.Block.get.resolves([
					{
						id: 2,
						height: 2,
						generatorPublicKey:
							'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
					},
					{
						id: 3,
						height: 3,
						generatorPublicKey:
							'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a9',
					},
				]);
			});

			describe('when popLastBlock fails', () => {
				it('should rejects with the error', async () => {
					try {
						await blocksChain.deleteLastBlock({
							id: 3,
							height: 3,
							generatorPublicKey:
								'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a9',
						});
					} catch (err) {
						expect(err.message).to.equal('popLastBlock-ERR');
					}
				});
			});

			describe('when popLastBlock succeeds', () => {
				/* eslint-disable mocha/no-pending-tests */
				it('should return previousBlock');
				/* eslint-enable mocha/no-pending-tests */
			});
		});
	});
});
