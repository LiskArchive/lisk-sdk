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
const Promise = require('bluebird');
const Bignum = require('../../../../../../../src/modules/chain/helpers/bignum');

const BlocksProcess = rewire(
	'../../../../../../../src/modules/chain/submodules/blocks/process'
);

describe('blocks/process', () => {
	let __private;
	let library;
	let submodules;
	let blocksProcessModule;
	let storageStub;
	let loggerStub;
	let dummyBlock;
	let dummyCommonBlock;
	let blockStub;
	let transactionStub;
	let peersStub;
	let schemaStub;
	let sequenceStub;
	let genesisBlockStub;
	let bindingsStub;

	beforeEach(done => {
		storageStub = {
			entities: {
				Block: {
					isPersisted: sinonSandbox.stub(),
					get: sinonSandbox.stub(),
				},
			},
		};

		blockStub = {
			objectNormalize: sinonSandbox.stub(),
			create: input => input,
		};

		const peerStub = {
			rpc: {
				blocksCommon: sinonSandbox.stub(),
				blocks: sinonSandbox.stub(),
			},
			applyHeaders: sinonSandbox.stub(),
			string: 'ip:wsPort',
		};

		genesisBlockStub = {
			block: {
				id: '6524861224470851795',
				height: 1,
				previousBlock: null,
			},
		};

		dummyCommonBlock = { id: '3', previousBlock: '2', height: '3' };

		peerStub.rpc.blocksCommon
			.withArgs(sinonSandbox.match({ ids: 'ERR' }))
			.callsArgWith(1, 'rpc.blocksCommon-ERR', null)
			.withArgs(sinonSandbox.match({ ids: 'rpc.blocksCommon-Empty' }))
			.callsArgWith(1, null, { common: undefined })
			.withArgs(sinonSandbox.match({ ids: 'rpc.blocksCommon-Genesis' }))
			.callsArgWith(1, null, { common: genesisBlockStub.block })
			.withArgs(sinonSandbox.match({ ids: 'OK' }))
			.callsArgWith(1, null, {
				common: dummyCommonBlock,
			});

		peerStub.rpc.blocks
			.withArgs(sinonSandbox.match({ lastBlockId: 'ERR', peer: 'me' }))
			.callsArgWith(1, 'rpc.blocks-ERR', null)
			.withArgs(sinonSandbox.match({ lastBlockId: 'cb-ERR', peer: 'me' }))
			.callsArgWith(1, null, { error: 'rpc.blocks-cb-ERR' })
			.withArgs(sinonSandbox.match({ lastBlockId: 'empty', peer: 'me' }))
			.callsArgWith(1, null, {
				blocks: [],
			})
			.withArgs(sinonSandbox.match({ lastBlockId: '3', peer: 'me' }))
			.callsArgWith(1, null, {
				blocks: [dummyCommonBlock],
			});

		peersStub = {
			create: () => peerStub,
			me: () => 'me',
			applyHeaders: peerStub.applyHeaders,
			ban: sinonSandbox.stub(),
			unban: sinonSandbox.stub(),
		};

		transactionStub = {
			ready: sinonSandbox.stub(),
			verify: sinonSandbox.stub(),
		};

		loggerStub = {
			trace: sinonSandbox.spy(),
			info: sinonSandbox.spy(),
			error: sinonSandbox.spy(),
			warn: sinonSandbox.spy(),
			debug: sinonSandbox.spy(),
		};

		schemaStub = {
			validate: sinonSandbox.stub(),
		};

		sequenceStub = {
			add: sinonSandbox.stub(),
		};

		blocksProcessModule = new BlocksProcess(
			loggerStub,
			blockStub,
			peersStub,
			transactionStub,
			schemaStub,
			storageStub,
			sequenceStub,
			genesisBlockStub
		);

		library = BlocksProcess.__get__('library');
		__private = BlocksProcess.__get__('__private');

		// Modules
		dummyBlock = {
			id: '4',
			height: 4,
			timestamp: 41287231,
			reward: new Bignum(100),
		};

		const modulesAccountsStub = {
			getAccount: sinonSandbox.stub(),
		};

		const modulesBlocksStub = {
			lastReceipt: {
				update: sinonSandbox.stub(),
			},
			verify: {
				processBlock: sinonSandbox.stub(),
				verifyReceipt: sinonSandbox.stub(),
				verifyBlock: sinonSandbox.stub(),
			},
			chain: {
				deleteLastBlock: sinonSandbox.stub(),
				recoverChain: sinonSandbox.stub(),
				applyBlock: sinonSandbox.stub(),
				applyGenesisBlock: sinonSandbox.stub(),
			},
			utils: {
				getIdSequence: sinonSandbox.stub(),
				readDbRows: sinonSandbox.stub(),
				readStorageRows: sinonSandbox.stub(),
			},
			isCleaning: {
				get: sinonSandbox.stub(),
			},
			lastBlock: {
				get: sinonSandbox.stub().returns({
					id: '2',
					height: 2,
				}),
			},
		};

		const modulesDelegatesStub = {
			fork: sinonSandbox.stub(),
			validateBlockSlotAgainstPreviousRound: sinonSandbox.stub(),
			validateBlockSlot: sinonSandbox.stub(),
		};

		const modulesLoaderStub = {
			syncing: sinonSandbox.stub(),
		};

		const modulesRoundsStub = {
			ticking: sinonSandbox.stub(),
		};

		const modulesTransactionsStub = {
			getUnconfirmedTransactionList: sinonSandbox.stub(),
		};

		const modulesTransportStub = {
			poorConsensus: sinonSandbox.stub(),
		};

		const modulesPeersStub = {
			remove: sinonSandbox.spy(),
		};

		bindingsStub = {
			submodules: {
				accounts: modulesAccountsStub,
				blocks: modulesBlocksStub,
				delegates: modulesDelegatesStub,
				loader: modulesLoaderStub,
				peers: modulesPeersStub,
				rounds: modulesRoundsStub,
				transactions: modulesTransactionsStub,
				transport: modulesTransportStub,
			},
		};

		blocksProcessModule.onBind(bindingsStub);
		submodules = BlocksProcess.__get__('submodules');
		done();
	});

	afterEach(done => {
		sinonSandbox.restore();
		done();
	});

	describe('constructor', () => {
		it('should assign params to library', async () => {
			expect(library.logger).to.eql(loggerStub);
			expect(library.schema).to.eql(schemaStub);
			expect(library.storage).to.eql(storageStub);
			expect(library.sequence).to.eql(sequenceStub);
			expect(library.genesisBlock).to.eql(genesisBlockStub);
			expect(library.logic.block).to.eql(blockStub);
			expect(library.logic.peers).to.eql(peersStub);
			return expect(library.logic.transaction).to.eql(transactionStub);
		});

		it('should call library.logger.trace with "Blocks->Process: Submodule initialized."', async () =>
			expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Process: Submodule initialized.'
			));

		it('should return self', async () => {
			expect(blocksProcessModule).to.be.an('object');
			expect(blocksProcessModule.getCommonBlock).to.be.a('function');
			expect(blocksProcessModule.loadBlocksOffset).to.be.a('function');
			expect(blocksProcessModule.loadBlocksFromPeer).to.be.a('function');
			expect(blocksProcessModule.generateBlock).to.be.a('function');
			expect(blocksProcessModule.onReceiveBlock).to.be.a('function');
			return expect(blocksProcessModule.onBind).to.be.a('function');
		});
	});

	describe('__private.receiveBlock', () => {
		beforeEach(() =>
			submodules.blocks.verify.processBlock.callsArgWith(3, null, true)
		);

		it('should update lastReceipt and call processBlock', done => {
			__private.receiveBlock(dummyBlock, err => {
				expect(err).to.be.null;
				expect(loggerStub.info.args[0]).to.contains(
					'Received new block id: 4 height: 4 round: 1 slot: 4128723 reward: 100'
				);
				expect(submodules.blocks.lastReceipt.update.calledOnce).to.be.true;
				expect(submodules.blocks.verify.processBlock.calledOnce).to.be.true;
				expect(submodules.blocks.verify.processBlock.args[0][0]).to.deep.equal(
					dummyBlock
				);
				expect(submodules.blocks.verify.processBlock.args[0][1]).to.be.true;
				expect(submodules.blocks.verify.processBlock.args[0][2]).to.be.true;
				done();
			});
		});
	});

	describe('__private.receiveForkOne', () => {
		let tempValidateBlockSlot;
		before(done => {
			tempValidateBlockSlot = __private.validateBlockSlot;
			done();
		});

		after(done => {
			__private.validateBlockSlot = tempValidateBlockSlot;
			done();
		});

		describe('last block stands', () => {
			afterEach(() => {
				expect(
					submodules.delegates.fork.calledWithExactly(
						sinonSandbox.match.object,
						1
					)
				).to.be.true;
				return expect(loggerStub.info.args[0][0]).to.equal('Last block stands');
			});

			it('should return when block.timestamp > lastBlock.timestamp', done => {
				const block = { timestamp: 2 };
				const lastBlock = { timestamp: 1 };
				__private.receiveForkOne(block, lastBlock, err => {
					expect(err).to.be.undefined;
					done();
				});
			});

			it('should return when timestamps are equal and block.id > lastBlock.id', done => {
				const block = { timestamp: 1, id: 2 };
				const lastBlock = { timestamp: 1, id: 1 };
				__private.receiveForkOne(block, lastBlock, err => {
					expect(err).to.be.undefined;
					done();
				});
			});
		});

		describe('last block and parent loses', () => {
			beforeEach(done => {
				__private.validateBlockSlot = sinonSandbox.stub();
				done();
			});

			afterEach(
				async () =>
					expect(
						submodules.delegates.fork.calledWithExactly(
							sinonSandbox.match.object,
							1
						)
					).to.be.true
			);

			describe('library.logic.block.objectNormalize', () => {
				describe('when fails', () => {
					beforeEach(() =>
						library.logic.block.objectNormalize.throws('objectNormalize-ERR')
					);

					it('should call a callback with error', done => {
						const block = { timestamp: 1, id: 2 };
						const lastBlock = { timestamp: 2, id: 1 };
						__private.receiveForkOne(block, lastBlock, err => {
							expect(err.name).to.equal('objectNormalize-ERR');
							expect(loggerStub.error.args[0][0]).to.equal(
								'Fork recovery failed'
							);
							expect(loggerStub.error.args[0][1].name).to.equal(
								'objectNormalize-ERR'
							);
							done();
						});
					});
				});

				describe('when succeeds', () => {
					describe('__private.validateBlockSlot', () => {
						describe('when fails', () => {
							beforeEach(() => {
								library.logic.block.objectNormalize.returns({
									timestamp: 1,
									id: 2,
								});
								return __private.validateBlockSlot.callsArgWith(
									2,
									'validateBlockSlot-ERR',
									null
								);
							});

							it('should call a callback with error', done => {
								const block = { timestamp: 1, id: 2 };
								const lastBlock = { timestamp: 2, id: 1 };
								__private.receiveForkOne(block, lastBlock, err => {
									expect(err).to.equal('validateBlockSlot-ERR');
									expect(loggerStub.error.args[0][0]).to.equal(
										'Fork recovery failed'
									);
									expect(loggerStub.error.args[0][1]).to.equal(
										'validateBlockSlot-ERR'
									);
									done();
								});
							});
						});

						describe('when succeeds', () => {
							describe('submodules.blocks.verify.verifyReceipt', () => {
								describe('when fails', () => {
									beforeEach(() => {
										library.logic.block.objectNormalize.returns({
											timestamp: 1,
											id: 2,
										});
										__private.validateBlockSlot.callsArgWith(2, null, true);
										return submodules.blocks.verify.verifyReceipt.returns({
											verified: false,
											errors: ['verifyReceipt-ERR', 'ERR2'],
										});
									});

									it('should call a callback with error', done => {
										const block = { timestamp: 10, id: 2 };
										const lastBlock = { timestamp: 20, id: 1 };
										__private.receiveForkOne(block, lastBlock, err => {
											expect(err).to.equal('verifyReceipt-ERR');
											expect(loggerStub.error.args[0][0]).to.equal(
												'Block 2 verification failed'
											);
											expect(loggerStub.error.args[0][1]).to.equal(
												'verifyReceipt-ERR, ERR2'
											);
											expect(loggerStub.error.args[1][0]).to.equal(
												'Fork recovery failed'
											);
											expect(loggerStub.error.args[1][1]).to.equal(
												'verifyReceipt-ERR'
											);
											done();
										});
									});
								});

								describe('when succeeds', () => {
									describe('submodules.blocks.chain.deleteLastBlock (first call)', () => {
										afterEach(() =>
											expect(loggerStub.info.args[0][0]).to.equal(
												'Last block and parent loses due to fork 1'
											)
										);
										describe('when fails', () => {
											beforeEach(() => {
												library.logic.block.objectNormalize.returns({
													timestamp: 1,
													id: 2,
												});
												__private.validateBlockSlot.callsArgWith(2, null, true);
												submodules.blocks.verify.verifyReceipt.returns({
													verified: true,
												});
												return submodules.blocks.chain.deleteLastBlock
													.onCall(0)
													.callsArgWith(0, 'deleteLastBlock-ERR-call-1', null)
													.onCall(1)
													.callsArgWith(0, 'deleteLastBlock-ERR-call-2', null);
											});

											it('should call a callback with error', done => {
												const block = { timestamp: 10, id: 2 };
												const lastBlock = { timestamp: 20, id: 1 };
												__private.receiveForkOne(block, lastBlock, err => {
													expect(err).to.equal('deleteLastBlock-ERR-call-1');
													expect(loggerStub.error.args[0][0]).to.equal(
														'Fork recovery failed'
													);
													expect(loggerStub.error.args[0][1]).to.equal(
														'deleteLastBlock-ERR-call-1'
													);
													done();
												});
											});
										});

										describe('when succeeds', () => {
											describe('submodules.blocks.chain.deleteLastBlock (second call)', () => {
												describe('when fails', () => {
													beforeEach(() => {
														library.logic.block.objectNormalize.returns({
															timestamp: 1,
															id: 2,
														});
														__private.validateBlockSlot.callsArgWith(
															2,
															null,
															true
														);
														submodules.blocks.verify.verifyReceipt.returns({
															verified: true,
														});
														return submodules.blocks.chain.deleteLastBlock
															.onCall(0)
															.callsArgWith(0, null, 'delete block 1 ok')
															.onCall(1)
															.callsArgWith(
																0,
																'deleteLastBlock-ERR-call-2',
																null
															);
													});

													it('should call a callback with error', done => {
														const block = { timestamp: 10, id: 2 };
														const lastBlock = { timestamp: 20, id: 1 };
														__private.receiveForkOne(block, lastBlock, err => {
															expect(err).to.equal(
																'deleteLastBlock-ERR-call-2'
															);
															expect(loggerStub.error.args[0][0]).to.equal(
																'Fork recovery failed'
															);
															expect(loggerStub.error.args[0][1]).to.equal(
																'deleteLastBlock-ERR-call-2'
															);
															done();
														});
													});
												});

												describe('when succeeds', () => {
													beforeEach(() => {
														library.logic.block.objectNormalize.returns({
															timestamp: 1,
															id: 2,
														});
														__private.validateBlockSlot.callsArgWith(
															2,
															null,
															true
														);
														submodules.blocks.verify.verifyReceipt.returns({
															verified: true,
														});
														return submodules.blocks.chain.deleteLastBlock
															.onCall(0)
															.callsArgWith(0, null, 'delete block 1 ok')
															.onCall(1)
															.callsArgWith(0, null, 'delete block 2 ok');
													});

													it('should return no error', done => {
														const block = { timestamp: 10, id: 2 };
														const lastBlock = { timestamp: 20, id: 1 };
														__private.receiveForkOne(block, lastBlock, err => {
															expect(err).to.be.null;
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
					});
				});
			});
		});
	});

	describe('__private.receiveForkFive', () => {
		let tempValidateBlockSlot;
		before(done => {
			tempValidateBlockSlot = __private.validateBlockSlot;
			done();
		});

		after(done => {
			__private.validateBlockSlot = tempValidateBlockSlot;
			done();
		});

		describe('delegate forging on multiple nodes', () => {
			it('should log warning when generatorPublicKey is the same for block and lastBlock', done => {
				__private.receiveForkFive(
					{ timestamp: 1, id: 2, generatorPublicKey: '1a' },
					{ timestamp: 1, id: 1, generatorPublicKey: '1a' },
					err => {
						expect(err).to.be.undefined;
						expect(loggerStub.warn.args[0][0]).to.equal(
							'Delegate forging on multiple nodes'
						);
						expect(loggerStub.warn.args[0][1]).to.equal('1a');
						done();
					}
				);
			});

			it('should not log warning when generatorPublicKey is different for block and lastBlock', done => {
				__private.receiveForkFive(
					{ timestamp: 1, id: 2, generatorPublicKey: '2a' },
					{ timestamp: 1, id: 1, generatorPublicKey: '1a' },
					err => {
						expect(err).to.be.undefined;
						expect(loggerStub.warn.args.length).to.equal(0);
						done();
					}
				);
			});
		});

		describe('last block stands', () => {
			afterEach(() => {
				expect(
					submodules.delegates.fork.calledWithExactly(
						sinonSandbox.match.object,
						5
					)
				).to.be.true;
				return expect(loggerStub.info.args[0][0]).to.equal('Last block stands');
			});

			it('should call a callback with no error when block.timestamp > lastBlock.timestamp', done => {
				const block = { timestamp: 2 };
				const lastBlock = { timestamp: 1 };
				__private.receiveForkFive(block, lastBlock, err => {
					expect(err).to.be.undefined;
					done();
				});
			});

			it('should call a callback with no error when timestamps are equal and block.id > lastBlock.id', done => {
				const block = { timestamp: 1, id: 2 };
				const lastBlock = { timestamp: 1, id: 1 };
				__private.receiveForkFive(block, lastBlock, err => {
					expect(err).to.be.undefined;
					done();
				});
			});
		});

		describe('last block loses', () => {
			beforeEach(done => {
				__private.validateBlockSlot = sinonSandbox.stub();
				__private.receiveBlock = sinonSandbox.stub();
				done();
			});

			afterEach(
				async () =>
					expect(
						submodules.delegates.fork.calledWithExactly(
							sinonSandbox.match.object,
							5
						)
					).to.be.true
			);

			describe('library.logic.block.objectNormalize', () => {
				describe('when fails', () => {
					beforeEach(() =>
						library.logic.block.objectNormalize.throws('objectNormalize-ERR')
					);

					it('should call a callback with error', done => {
						const block = { timestamp: 1, id: 2 };
						const lastBlock = { timestamp: 2, id: 1 };
						__private.receiveForkFive(block, lastBlock, err => {
							expect(err.name).to.equal('objectNormalize-ERR');
							expect(loggerStub.error.args[0][0]).to.equal(
								'Fork recovery failed'
							);
							expect(loggerStub.error.args[0][1].name).to.equal(
								'objectNormalize-ERR'
							);
							done();
						});
					});
				});

				describe('when succeeds', () => {
					beforeEach(() =>
						library.logic.block.objectNormalize.returns({
							timestamp: 1,
							id: 2,
						})
					);

					describe('__private.validateBlockSlot', () => {
						describe('when fails', () => {
							beforeEach(() =>
								__private.validateBlockSlot.callsArgWith(
									2,
									'validateBlockSlot-ERR',
									null
								)
							);

							it('should call a callback with error', done => {
								const block = { timestamp: 1, id: 2 };
								const lastBlock = { timestamp: 2, id: 1 };
								__private.receiveForkFive(block, lastBlock, err => {
									expect(err).to.equal('validateBlockSlot-ERR');
									expect(loggerStub.error.args[0][0]).to.equal(
										'Fork recovery failed'
									);
									expect(loggerStub.error.args[0][1]).to.equal(
										'validateBlockSlot-ERR'
									);
									done();
								});
							});
						});

						describe('when succeeds', () => {
							beforeEach(() =>
								__private.validateBlockSlot.callsArgWith(2, null, true)
							);

							describe('submodules.blocks.verify.verifyReceipt', () => {
								describe('when fails', () => {
									beforeEach(() =>
										submodules.blocks.verify.verifyReceipt.returns({
											verified: false,
											errors: ['verifyReceipt-ERR', 'ERR2'],
										})
									);

									it('should call a callback with error', done => {
										const block = { timestamp: 10, id: 2 };
										const lastBlock = { timestamp: 20, id: 1 };
										__private.receiveForkFive(block, lastBlock, err => {
											expect(err).to.equal('verifyReceipt-ERR');
											expect(loggerStub.error.args[0][0]).to.equal(
												'Block 2 verification failed'
											);
											expect(loggerStub.error.args[0][1]).to.equal(
												'verifyReceipt-ERR, ERR2'
											);
											expect(loggerStub.error.args[1][0]).to.equal(
												'Fork recovery failed'
											);
											expect(loggerStub.error.args[1][1]).to.equal(
												'verifyReceipt-ERR'
											);
											done();
										});
									});
								});

								describe('when succeeds', () => {
									beforeEach(() =>
										submodules.blocks.verify.verifyReceipt.returns({
											verified: true,
										})
									);

									afterEach(() =>
										expect(loggerStub.info.args[0][0]).to.equal(
											'Last block loses due to fork 5'
										)
									);

									describe('submodules.blocks.chain.deleteLastBlock', () => {
										describe('when fails', () => {
											beforeEach(() =>
												submodules.blocks.chain.deleteLastBlock.callsArgWith(
													0,
													'deleteLastBlock-ERR',
													null
												)
											);

											it('should call a callback with error', done => {
												const block = { timestamp: 10, id: 2 };
												const lastBlock = { timestamp: 20, id: 1 };
												__private.receiveForkFive(block, lastBlock, err => {
													expect(err).to.equal('deleteLastBlock-ERR');
													expect(loggerStub.error.args[0][0]).to.equal(
														'Fork recovery failed'
													);
													expect(loggerStub.error.args[0][1]).to.equal(
														'deleteLastBlock-ERR'
													);
													done();
												});
											});
										});

										describe('when succeeds', () => {
											beforeEach(() =>
												submodules.blocks.chain.deleteLastBlock.callsArgWith(
													0,
													null,
													'delete block ok'
												)
											);

											describe('__private.receiveBlock', () => {
												describe('when fails', () => {
													beforeEach(() =>
														__private.receiveBlock.callsArgWith(
															1,
															'receiveBlock-ERR',
															null
														)
													);

													it('should call a callback with error', done => {
														const block = { timestamp: 10, id: 2 };
														const lastBlock = { timestamp: 20, id: 1 };
														__private.receiveForkFive(block, lastBlock, err => {
															expect(err).to.equal('receiveBlock-ERR');
															expect(loggerStub.error.args[0][0]).to.equal(
																'Fork recovery failed'
															);
															expect(loggerStub.error.args[0][1]).to.equal(
																'receiveBlock-ERR'
															);
															done();
														});
													});
												});

												describe('when succeeds', () => {
													beforeEach(() =>
														__private.receiveBlock.callsArgWith(
															1,
															null,
															'receiveBlock ok'
														)
													);

													it('should call a callback with no error', done => {
														const block = { timestamp: 10, id: 2 };
														const lastBlock = { timestamp: 20, id: 1 };
														__private.receiveForkFive(block, lastBlock, err => {
															expect(err).to.be.null;
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
					});
				});
			});
		});
	});

	describe('getCommonBlock', () => {
		describe('submodules.blocks.utils.getIdSequence', () => {
			describe('when fails', () => {
				beforeEach(() =>
					submodules.blocks.utils.getIdSequence.callsArgWith(
						1,
						'getIdSequence-ERR',
						undefined
					)
				);

				it('should call a callback with error', done => {
					blocksProcessModule.getCommonBlock(
						{ ip: 1, wsPort: 2 },
						10,
						(err, block) => {
							expect(err).to.equal('getIdSequence-ERR');
							expect(block).to.be.undefined;
							done();
						}
					);
				});
			});

			describe('when succeeds', () => {
				describe('peer.rpc.blocksCommon', () => {
					describe('when fails', () => {
						beforeEach(() =>
							submodules.blocks.utils.getIdSequence.callsArgWith(1, null, {
								ids: 'ERR',
							})
						);

						it('should call a callback with error', done => {
							blocksProcessModule.getCommonBlock(
								{ ip: 1, wsPort: 2 },
								10,
								(err, block) => {
									expect(err).to.equal('rpc.blocksCommon-ERR');
									expect(block).to.be.undefined;
									done();
								}
							);
						});

						it('should call peers.remove', done => {
							blocksProcessModule.getCommonBlock(
								{ ip: 1, wsPort: 2 },
								10,
								async () => {
									expect(submodules.peers.remove).to.have.been.calledOnce;
									done();
								}
							);
						});
					});

					describe('when comparison failed because of receiving genesis block', () => {
						beforeEach(() => {
							submodules.blocks.utils.getIdSequence.callsArgWith(1, null, {
								ids: 'rpc.blocksCommon-Genesis',
							});
							return submodules.blocks.chain.recoverChain.callsArgWith(
								0,
								null,
								true
							);
						});

						describe('when consensus is low', () => {
							beforeEach(() =>
								submodules.transport.poorConsensus.returns(true)
							);

							it('should perform chain recovery', done => {
								blocksProcessModule.getCommonBlock(
									{ ip: 1, wsPort: 2 },
									10,
									(err, block) => {
										expect(library.logic.peers.applyHeaders.calledOnce).to.be
											.false;
										expect(err).to.be.null;
										expect(block).to.be.true;
										expect(submodules.blocks.chain.recoverChain.calledOnce).to
											.be.true;
										done();
									}
								);
							});
						});

						describe('when consensus is high', () => {
							beforeEach(() =>
								submodules.transport.poorConsensus.returns(false)
							);

							it('should call a callback with error ', done => {
								blocksProcessModule.getCommonBlock(
									{ ip: 1, wsPort: 2 },
									10,
									(err, block) => {
										expect(library.logic.peers.applyHeaders.calledOnce).to.be
											.false;
										expect(err).to.equal(
											'Comparison failed - received genesis as common block'
										);
										expect(block).to.be.undefined;
										expect(submodules.blocks.chain.recoverChain.calledOnce).to
											.be.false;
										done();
									}
								);
							});
						});
					});

					describe('when comparison failed', () => {
						beforeEach(() => {
							submodules.blocks.utils.getIdSequence.callsArgWith(1, null, {
								ids: 'rpc.blocksCommon-Empty',
							});
							return submodules.blocks.chain.recoverChain.callsArgWith(
								0,
								null,
								true
							);
						});

						describe('when consensus is low', () => {
							beforeEach(() =>
								submodules.transport.poorConsensus.returns(true)
							);

							it('should perform chain recovery', done => {
								blocksProcessModule.getCommonBlock(
									{ ip: 1, wsPort: 2 },
									10,
									(err, block) => {
										expect(library.logic.peers.applyHeaders.calledOnce).to.be
											.false;
										expect(err).to.be.null;
										expect(block).to.be.true;
										expect(submodules.blocks.chain.recoverChain.calledOnce).to
											.be.true;
										done();
									}
								);
							});
						});

						describe('when consensus is high', () => {
							beforeEach(() =>
								submodules.transport.poorConsensus.returns(false)
							);

							it('should call a callback with error ', done => {
								blocksProcessModule.getCommonBlock(
									{ ip: 1, wsPort: 2 },
									10,
									(err, block) => {
										expect(library.logic.peers.applyHeaders.calledOnce).to.be
											.false;
										expect(err).to.equal(
											'Chain comparison failed with peer: ip:wsPort using ids: rpc.blocksCommon-Empty'
										);
										expect(block).to.be.undefined;
										expect(submodules.blocks.chain.recoverChain.calledOnce).to
											.be.false;
										done();
									}
								);
							});
						});
					});

					describe('when succeeds', () => {
						beforeEach(() =>
							submodules.blocks.utils.getIdSequence.callsArgWith(1, null, {
								ids: 'OK',
							})
						);

						describe('library.schema.validate', () => {
							describe('when fails', () => {
								beforeEach(() =>
									library.schema.validate.callsArgWith(
										2,
										[{ message: 'schema.validate-ERR' }],
										undefined
									)
								);

								it('should call a callback with error', done => {
									blocksProcessModule.getCommonBlock(
										{ ip: 1, wsPort: 2 },
										10,
										(err, block) => {
											expect(err).to.equal('schema.validate-ERR');
											expect(block).to.be.undefined;
											done();
										}
									);
								});
							});

							describe('when succeeds', () => {
								beforeEach(() =>
									library.schema.validate.callsArgWith(2, null, {
										ip: 1,
										wsPort: 2,
									})
								);

								describe('library.storage.entities.Block.isPersisted', () => {
									describe('when fails', () => {
										beforeEach(() =>
											library.storage.entities.Block.isPersisted.rejects(
												new Error('blocks.getCommonBlock-REJECTS')
											)
										);

										it('should call a callback with error', done => {
											blocksProcessModule.getCommonBlock(
												{ ip: 1, wsPort: 2 },
												10,
												(err, block) => {
													expect(err).to.equal('Blocks#getCommonBlock error');
													expect(block).to.be.undefined;
													expect(loggerStub.error.args[0][0]).to.contains(
														'Error: blocks.getCommonBlock-REJECTS'
													);
													done();
												}
											);
										});
									});

									describe('when comparison failed', () => {
										beforeEach(() => {
											library.storage.entities.Block.isPersisted.resolves(
												false
											);
											return submodules.blocks.chain.recoverChain.callsArgWith(
												0,
												null,
												true
											);
										});

										describe('when consensus is low', () => {
											beforeEach(() =>
												submodules.transport.poorConsensus.returns(true)
											);

											it('should perform chain recovery', done => {
												blocksProcessModule.getCommonBlock(
													{ ip: 1, wsPort: 2 },
													10,
													(err, block) => {
														expect(err).to.be.null;
														expect(block).to.be.true;
														expect(
															submodules.blocks.chain.recoverChain.calledOnce
														).to.be.true;
														done();
													}
												);
											});
										});

										describe('when consensus is high', () => {
											beforeEach(() =>
												submodules.transport.poorConsensus.returns(false)
											);

											it('should call a callback with error ', done => {
												blocksProcessModule.getCommonBlock(
													{ ip: 1, wsPort: 2 },
													10,
													(err, block) => {
														expect(err).to.equal(
															`Chain comparison failed with peer: ip:wsPort using block: ${JSON.stringify(
																dummyCommonBlock
															)}`
														);
														expect(block).to.be.undefined;
														done();
													}
												);
											});
										});
									});

									describe('when succeeds', () => {
										beforeEach(() =>
											library.storage.entities.Block.isPersisted.resolves(true)
										);

										it('should return common block', done => {
											blocksProcessModule.getCommonBlock(
												{ ip: 1, wsPort: 2 },
												10,
												(err, block) => {
													expect(err).to.be.null;
													expect(block).to.deep.equal(dummyCommonBlock);
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

	describe('loadBlocksOffset', () => {
		afterEach(() =>
			expect(loggerStub.debug.args[0][0]).to.equal('Loading blocks offset')
		);

		describe('library.storage.entities.Block.get', () => {
			describe('when fails', () => {
				beforeEach(() =>
					library.storage.entities.Block.get.rejects(
						'blocks.loadBlocksOffset-REJECTS'
					)
				);

				it('should call a callback with error', done => {
					blocksProcessModule.loadBlocksOffset(100, 0, (err, lastBlock) => {
						expect(err).to.equal(
							'Blocks#loadBlocksOffset error: blocks.loadBlocksOffset-REJECTS'
						);
						expect(lastBlock).to.be.undefined;
						expect(loggerStub.error.args[0][0].stack).to.contains(
							'blocks.loadBlocksOffset-REJECTS'
						);
						done();
					});
				});
			});

			describe('when succeeds', () => {
				describe('when query returns empty array', () => {
					beforeEach(() => {
						library.storage.entities.Block.get.resolves([]);
						return submodules.blocks.utils.readStorageRows.returns([]);
					});

					afterEach(() => {
						expect(submodules.blocks.utils.readStorageRows.calledOnce).to.be
							.true;
						expect(submodules.blocks.lastBlock.get.calledOnce).to.be.true;
						return expect(submodules.blocks.isCleaning.get.calledOnce).to.be
							.false;
					});

					it('should return without process', done => {
						blocksProcessModule.loadBlocksOffset(100, 0, (err, lastBlock) => {
							expect(err).to.be.null;
							expect(lastBlock).to.deep.equal({
								id: '2',
								height: 2,
							});
							done();
						});
					});
				});

				describe('when query returns rows', () => {
					beforeEach(() =>
						library.storage.entities.Block.get.resolves([dummyBlock])
					);

					afterEach(
						async () =>
							expect(submodules.blocks.lastBlock.get.calledOnce).to.be.true
					);

					describe('submodules.blocks.isCleaning.get', () => {
						describe('when returns true, node shutdown is requested', () => {
							beforeEach(() => submodules.blocks.isCleaning.get.returns(true));
							afterEach(() =>
								expect(loggerStub.debug.args[0][1]).to.deep.equal({
									limit: 100,
									offset: 0,
								})
							);

							it('should break processing and call a callback with no error', done => {
								blocksProcessModule.loadBlocksOffset(
									100,
									0,
									(err, lastBlock) => {
										expect(err).to.be.null;
										expect(lastBlock).to.deep.equal({
											id: '2',
											height: 2,
										});
										expect(loggerStub.debug.args.length).to.equal(1);
										done();
									}
								);
							});
						});

						describe('when returns false', () => {
							beforeEach(() => submodules.blocks.isCleaning.get.returns(false));

							describe('when block id is genesis block', () => {
								beforeEach(() =>
									submodules.blocks.utils.readStorageRows.returns([
										{
											id: '6524861224470851795',
											height: 1,
											timestamp: 0,
											reward: 0,
										},
									])
								);
								afterEach(() =>
									expect(loggerStub.debug.args[0][1]).to.deep.equal({
										limit: 100,
										offset: 0,
									})
								);

								describe('submodules.blocks.chain.applyGenesisBlock', () => {
									describe('when fails', () => {
										beforeEach(() =>
											submodules.blocks.chain.applyGenesisBlock.callsArgWith(
												1,
												'chain.applyGenesisBlock-ERR',
												null
											)
										);

										it('should call a callback with error', done => {
											blocksProcessModule.loadBlocksOffset(
												100,
												0,
												(err, lastBlock) => {
													expect(err).to.equal('chain.applyGenesisBlock-ERR');
													expect(lastBlock).to.deep.equal({
														id: '2',
														height: 2,
													});
													expect(submodules.blocks.lastBlock.get.calledOnce).to
														.be.true;
													done();
												}
											);
										});
									});

									describe('when succeeds', () => {
										beforeEach(() => {
											submodules.blocks.chain.applyGenesisBlock.callsArgWith(
												1,
												null,
												'chain.applyGenesisBlock-OK'
											);
											return submodules.blocks.lastBlock.get.returns(
												dummyBlock
											);
										});

										it('should return lastBlock and no errors', done => {
											blocksProcessModule.loadBlocksOffset(
												100,
												0,
												(err, lastBlock) => {
													expect(err).to.be.null;
													expect(lastBlock).to.deep.equal(dummyBlock);
													done();
												}
											);
										});
									});
								});
							});

							describe('when block id is not genesis block', () => {
								beforeEach(() =>
									submodules.blocks.utils.readStorageRows.returns([dummyBlock])
								);

								afterEach(() => {
									expect(loggerStub.debug.args[1][0]).to.equal(
										'Processing block'
									);
									expect(loggerStub.debug.args[1][1]).to.equal('4');
									return expect(loggerStub.debug.args[0][1]).to.deep.equal({
										limit: 100,
										offset: 0,
									});
								});

								describe('submodules.blocks.verify.processBlock', () => {
									describe('when fails', () => {
										beforeEach(() =>
											submodules.blocks.verify.processBlock.callsArgWith(
												3,
												'verify.processBlock-ERR',
												null
											)
										);

										it('should call a callback with error', done => {
											blocksProcessModule.loadBlocksOffset(100, 0, err => {
												expect(submodules.blocks.verify.processBlock).to.be
													.calledOnce;
												expect(err).to.equal('verify.processBlock-ERR');
												expect(loggerStub.debug).to.be.calledWithExactly(
													'Block processing failed',
													{
														id: dummyBlock.id,
														err: 'verify.processBlock-ERR',
														module: 'blocks',
														block: dummyBlock,
													}
												);
												done();
											});
										});
									});

									describe('when succeeds', () => {
										beforeEach(() => {
											submodules.blocks.verify.processBlock.callsArgWith(
												3,
												null,
												'verify.processBlock-OK'
											);
											return submodules.blocks.lastBlock.get.returns(
												dummyBlock
											);
										});

										it('should return lastBlock and no errors', done => {
											blocksProcessModule.loadBlocksOffset(
												100,
												0,
												(err, lastBlock) => {
													expect(err).to.be.null;
													expect(lastBlock).to.deep.equal(dummyBlock);
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

	describe('loadBlocksFromPeer', () => {
		afterEach(() => {
			expect(submodules.blocks.lastBlock.get.calledOnce).to.be.true;
			return expect(loggerStub.info.args[0][0]).to.equal(
				'Loading blocks from: ip:wsPort'
			);
		});

		describe('getFromPeer', () => {
			describe('peer.rpc.blocks', () => {
				describe('when blocks.lastBlock.get fails', () => {
					describe('err parameter', () => {
						beforeEach(() =>
							submodules.blocks.lastBlock.get.returns({
								id: 'ERR',
								peer: 'me',
							})
						);

						it('should call a callback with error', done => {
							blocksProcessModule.loadBlocksFromPeer(
								{ id: 1, string: 'test' },
								(err, lastBlock) => {
									expect(err).to.equal('Error loading blocks: rpc.blocks-ERR');
									expect(lastBlock).to.deep.equal({ id: 'ERR', peer: 'me' });
									done();
								}
							);
						});

						it('should call submodules.peers.remove', done => {
							blocksProcessModule.loadBlocksFromPeer(
								{ id: 1, string: 'test' },
								async () => {
									expect(submodules.peers.remove).to.have.been.calledOnce;
									done();
								}
							);
						});
					});

					describe('cb parameter', () => {
						beforeEach(() =>
							submodules.blocks.lastBlock.get.returns({
								id: 'cb-ERR',
								peer: 'me',
							})
						);

						it('should call a callback with error', done => {
							blocksProcessModule.loadBlocksFromPeer(
								{ id: 1, string: 'test' },
								(err, lastBlock) => {
									expect(err).to.equal(
										'Error loading blocks: rpc.blocks-cb-ERR'
									);
									expect(lastBlock).to.deep.equal({ id: 'cb-ERR', peer: 'me' });
									done();
								}
							);
						});
					});
				});

				describe('when succeeds', () => {
					beforeEach(() =>
						submodules.blocks.lastBlock.get.returns({
							id: '3',
							peer: 'me',
						})
					);

					describe('validateBlocks', () => {
						describe('library.schema.validate', () => {
							describe('when fails', () => {
								beforeEach(() => library.schema.validate.returns(false));

								it('should call a callback with error', done => {
									blocksProcessModule.loadBlocksFromPeer(
										{ id: 1, string: 'test' },
										(err, lastBlock) => {
											expect(err).to.equal(
												'Error loading blocks: Received invalid blocks data'
											);
											expect(lastBlock).to.deep.equal({ id: '3', peer: 'me' });
											done();
										}
									);
								});
							});

							describe('when succeeds', () => {
								beforeEach(() => library.schema.validate.returns(true));

								describe('processBlocks', () => {
									describe('when receives no block', () => {
										beforeEach(() =>
											submodules.blocks.lastBlock.get.returns({
												id: 'empty',
												peer: 'me',
											})
										);

										it('should break processing and call a callback with no error', done => {
											blocksProcessModule.loadBlocksFromPeer(
												{ id: 1, string: 'test' },
												(err, lastBlock) => {
													expect(err).to.be.null;
													expect(lastBlock).to.deep.equal({
														id: 'empty',
														peer: 'me',
													});
													done();
												}
											);
										});
									});

									describe('when receives blocks', () => {
										describe('submodules.blocks.utils.readDbRows', () => {
											describe('when fails', () => {
												beforeEach(() =>
													submodules.blocks.utils.readDbRows.returns(
														new Error('readDbRows err')
													)
												);

												it('should break processing and call a callback with no error', done => {
													blocksProcessModule.loadBlocksFromPeer(
														{ id: 1, string: 'test' },
														(err, lastBlock) => {
															expect(err).to.be.null;
															expect(lastBlock).to.deep.equal({
																id: '3',
																peer: 'me',
															});
															expect(
																submodules.blocks.isCleaning.get.calledOnce
															).to.be.false;
															done();
														}
													);
												});
											});

											describe('when succeeds', () => {
												beforeEach(() =>
													submodules.blocks.utils.readDbRows.returns([
														dummyBlock,
													])
												);

												describe('submodules.blocks.isCleaning.get', () => {
													afterEach(
														async () =>
															expect(
																submodules.blocks.isCleaning.get.calledOnce
															).to.be.true
													);

													describe('when returns true, node shutdown is requested', () => {
														beforeEach(() =>
															submodules.blocks.isCleaning.get.returns(true)
														);

														it('should return immediate', done => {
															blocksProcessModule.loadBlocksFromPeer(
																{ id: 1, string: 'test' },
																(err, lastBlock) => {
																	expect(err).to.be.null;
																	expect(lastBlock).to.deep.equal({
																		id: '3',
																		peer: 'me',
																	});
																	done();
																}
															);
														});
													});

													describe('when returns false', () => {
														beforeEach(() =>
															submodules.blocks.isCleaning.get.returns(false)
														);

														describe('processBlock', () => {
															describe('submodules.blocks.verify.processBlock', () => {
																describe('when fails', () => {
																	beforeEach(() =>
																		submodules.blocks.verify.processBlock.callsArgWith(
																			3,
																			'verify.processBlock-ERR',
																			null
																		)
																	);

																	it('should call a callback with error', done => {
																		blocksProcessModule.loadBlocksFromPeer(
																			{ id: 1, string: 'test' },
																			(err, lastBlock) => {
																				expect(err).to.equal(
																					'Error loading blocks: verify.processBlock-ERR'
																				);
																				expect(lastBlock).to.deep.equal({
																					id: '3',
																					peer: 'me',
																				});
																				expect(
																					loggerStub.debug.args[0][0]
																				).to.equal('Block processing failed');
																				expect(
																					loggerStub.debug.args[0][1]
																				).to.deep.equal({
																					block: dummyBlock,
																					err: 'verify.processBlock-ERR',
																					id: '4',
																					module: 'blocks',
																				});
																				done();
																			}
																		);
																	});
																});

																describe('when succeeds', () => {
																	beforeEach(() =>
																		submodules.blocks.verify.processBlock.callsArgWith(
																			3,
																			null,
																			true
																		)
																	);

																	it('should return last valid block and no error', done => {
																		blocksProcessModule.loadBlocksFromPeer(
																			{ id: 1, string: 'test' },
																			(err, lastBlock) => {
																				expect(err).to.be.null;
																				expect(lastBlock).to.deep.equal(
																					dummyBlock
																				);
																				expect(
																					loggerStub.info.args[1][0]
																				).to.equal(
																					'Block 4 loaded from: ip:wsPort'
																				);
																				expect(
																					loggerStub.info.args[1][1]
																				).to.equal('height: 4');
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

	describe('generateBlock', () => {
		describe('submodules.transactions.getUnconfirmedTransactionList', () => {
			describe('when query returns empty array', () => {
				beforeEach(() => {
					submodules.transactions.getUnconfirmedTransactionList.returns([]);
					return submodules.blocks.verify.processBlock.callsArgWith(
						3,
						null,
						submodules.blocks.verify.processBlock.args
					);
				});

				it('should generate block without transactions', done => {
					blocksProcessModule.generateBlock(
						{ publicKey: '123abc', privateKey: 'aaa' },
						41287231,
						err => {
							expect(err).to.be.null;
							expect(library.logic.transaction.verify.calledOnce).to.be.false;
							expect(
								submodules.blocks.verify.processBlock.args[0][0].transactions
									.length
							).to.equal(0);
							done();
						}
					);
				});
			});

			describe('when query returns undefined', () => {
				beforeEach(() => {
					submodules.transactions.getUnconfirmedTransactionList.returns(
						undefined
					);
					return submodules.blocks.verify.processBlock.callsArgWith(
						3,
						null,
						submodules.blocks.verify.processBlock.args
					);
				});

				it('should generate block without transactions', done => {
					blocksProcessModule.generateBlock(
						{ publicKey: '123abc', privateKey: 'aaa' },
						41287231,
						err => {
							expect(err).to.be.null;
							expect(library.logic.transaction.verify.calledOnce).to.be.false;
							expect(
								submodules.blocks.verify.processBlock.args[0][0].transactions
									.length
							).to.equal(0);
							done();
						}
					);
				});
			});

			describe('when query returns transactions', () => {
				beforeEach(() => {
					submodules.transactions.getUnconfirmedTransactionList.returns([
						{ id: 1, type: 0 },
						{ id: 2, type: 1 },
					]);
					return submodules.blocks.verify.processBlock.callsArgWith(
						3,
						null,
						submodules.blocks.verify.processBlock.args
					);
				});

				describe('submodules.accounts.getAccount', () => {
					describe('when fails', () => {
						beforeEach(() =>
							submodules.accounts.getAccount.callsArgWith(
								1,
								'accounts.getAccount-ERR',
								null
							)
						);

						it('should call a callback with error', done => {
							blocksProcessModule.generateBlock(
								{ publicKey: '123abc', privateKey: 'aaa' },
								41287231,
								err => {
									expect(err).to.equal('Sender not found');
									done();
								}
							);
						});
					});

					describe('when succeeds', () => {
						beforeEach(() =>
							submodules.accounts.getAccount.callsArgWith(1, null, true)
						);
						afterEach(
							async () =>
								expect(submodules.blocks.verify.processBlock.calledOnce).to.be
									.true
						);

						describe('library.logic.transaction.ready', () => {
							describe('when returns false', () => {
								beforeEach(() =>
									library.logic.transaction.ready.returns(false)
								);

								it('should generate block without transactions', done => {
									blocksProcessModule.generateBlock(
										{ publicKey: '123abc', privateKey: 'aaa' },
										41287231,
										err => {
											expect(err).to.be.null;
											expect(library.logic.transaction.verify.calledOnce).to.be
												.false;
											expect(
												submodules.blocks.verify.processBlock.args[0][0]
													.transactions.length
											).to.equal(0);
											done();
										}
									);
								});
							});

							describe('when returns true', () => {
								beforeEach(() => library.logic.transaction.ready.returns(true));

								describe('library.logic.transaction.verify', () => {
									describe('when fails', () => {
										beforeEach(() =>
											library.logic.transaction.verify.callsArgWith(
												4,
												'transaction.verify-ERR',
												null
											)
										);

										it('should generate block without transactions', done => {
											blocksProcessModule.generateBlock(
												{ publicKey: '123abc', privateKey: 'aaa' },
												41287231,
												err => {
													expect(err).to.be.null;
													expect(
														submodules.blocks.verify.processBlock.args[0][0]
															.transactions.length
													).to.equal(0);
													done();
												}
											);
										});
									});

									describe('when succeeds', () => {
										beforeEach(() =>
											library.logic.transaction.verify.callsArgWith(
												4,
												null,
												true
											)
										);

										it('should generate block with transactions', done => {
											blocksProcessModule.generateBlock(
												{ publicKey: '123abc', privateKey: 'aaa' },
												41287231,
												err => {
													expect(err).to.be.null;
													expect(
														submodules.blocks.verify.processBlock.args[0][0]
															.transactions.length
													).to.equal(2);
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

				describe('library.logic.block.create', () => {
					beforeEach(() => {
						submodules.accounts.getAccount.callsArgWith(1, null, true);
						library.logic.transaction.ready.returns(true);
						return library.logic.transaction.verify.callsArgWith(4, null, true);
					});

					describe('when fails', () => {
						beforeEach(done => {
							library.logic.block.create = sinonSandbox.stub();
							library.logic.block.create.throws('block-create-ERR');
							done();
						});

						it('should call a callback with error', done => {
							blocksProcessModule.generateBlock(
								{ publicKey: '123abc', privateKey: 'aaa' },
								41287231,
								err => {
									expect(err.name).to.equal('block-create-ERR');
									expect(loggerStub.error.args[0][0]).to.contains(
										'block-create-ERR'
									);
									done();
								}
							);
						});
					});

					describe('when succeeds', () => {
						describe('submodules.blocks.verify.processBlock', () => {
							describe('when fails', () => {
								beforeEach(() =>
									submodules.blocks.verify.processBlock.callsArgWith(
										3,
										'verify.processBlock-ERR',
										null
									)
								);

								it('should call a callback with error', done => {
									blocksProcessModule.generateBlock(
										{ publicKey: '123abc', privateKey: 'aaa' },
										41287231,
										err => {
											expect(err).to.equal('verify.processBlock-ERR');
											done();
										}
									);
								});
							});

							describe('when succeeds', () => {
								it('should call submodules.blocks.verify.processBlock with proper args', done => {
									blocksProcessModule.generateBlock(
										{ publicKey: '123abc', privateKey: 'aaa' },
										41287231,
										err => {
											expect(err).to.be.null;
											expect(submodules.blocks.verify.processBlock.calledOnce)
												.to.be.true;
											expect(
												submodules.blocks.verify.processBlock.args[0][0]
													.transactions.length
											).to.equal(2);
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

	describe('__private.validateBlockSlot', () => {
		describe('lastBlock.height % ACTIVE_DELEGATES === 0', () => {
			describe('validateBlockSlotAgainstPreviousRound', () => {
				describe('when fails', () => {
					beforeEach(() =>
						submodules.delegates.validateBlockSlotAgainstPreviousRound.callsArgWith(
							1,
							'round-ERR',
							null
						)
					);

					it('should call a callback with error', done => {
						__private.validateBlockSlot(
							{ height: 10 },
							{ height: 202 },
							err => {
								expect(err).to.equal('round-ERR');
								expect(
									submodules.delegates.validateBlockSlotAgainstPreviousRound
										.calledOnce
								).to.be.true;
								done();
							}
						);
					});
				});

				describe('when succeeds', () => {
					beforeEach(() =>
						submodules.delegates.validateBlockSlotAgainstPreviousRound.callsArgWith(
							1,
							null,
							true
						)
					);

					it('should call a callback with no error', done => {
						__private.validateBlockSlot(
							{ height: 10 },
							{ height: 202 },
							err => {
								expect(err).to.be.null;
								expect(
									submodules.delegates.validateBlockSlotAgainstPreviousRound
										.calledOnce
								).to.be.true;
								done();
							}
						);
					});
				});
			});
		});

		describe('lastBlock.height % ACTIVE_DELEGATES !== 0', () => {
			describe('roundLastBlock < roundNextBlock', () => {
				describe('validateBlockSlotAgainstPreviousRound', () => {
					describe('when fails', () => {
						beforeEach(() =>
							submodules.delegates.validateBlockSlotAgainstPreviousRound.callsArgWith(
								1,
								'round-ERR',
								null
							)
						);

						it('should call a callback with error', done => {
							__private.validateBlockSlot(
								{ height: 400 },
								{ height: 200 },
								err => {
									expect(err).to.equal('round-ERR');
									expect(
										submodules.delegates.validateBlockSlotAgainstPreviousRound
											.calledOnce
									).to.be.true;
									done();
								}
							);
						});
					});

					describe('when succeeds', () => {
						beforeEach(() =>
							submodules.delegates.validateBlockSlotAgainstPreviousRound.callsArgWith(
								1,
								null,
								true
							)
						);

						it('should call a callback with no error', done => {
							__private.validateBlockSlot(
								{ height: 400 },
								{ height: 200 },
								err => {
									expect(err).to.be.null;
									expect(
										submodules.delegates.validateBlockSlotAgainstPreviousRound
											.calledOnce
									).to.be.true;
									done();
								}
							);
						});
					});
				});
			});

			describe('roundLastBlock >= roundNextBlock', () => {
				describe('validateBlockSlot', () => {
					describe('when fails', () => {
						beforeEach(() =>
							submodules.delegates.validateBlockSlot.callsArgWith(
								1,
								'round-ERR',
								null
							)
						);

						it('should call a callback with error', done => {
							__private.validateBlockSlot(
								{ height: 10 },
								{ height: 200 },
								err => {
									expect(err).to.equal('round-ERR');
									expect(submodules.delegates.validateBlockSlot.calledOnce).to
										.be.true;
									done();
								}
							);
						});
					});

					describe('when succeeds', () => {
						beforeEach(() =>
							submodules.delegates.validateBlockSlot.callsArgWith(1, null, true)
						);

						it('should call a callback with no error', done => {
							__private.validateBlockSlot(
								{ height: 10 },
								{ height: 200 },
								err => {
									expect(err).to.be.null;
									expect(submodules.delegates.validateBlockSlot.calledOnce).to
										.be.true;
									done();
								}
							);
						});
					});
				});
			});
		});
	});

	describe('onReceiveBlock', () => {
		let tempReceiveBlock;
		let tempReceiveForkOne;
		let tempReceiveForkFive;

		beforeEach(done => {
			tempReceiveBlock = __private.receiveBlock;
			tempReceiveForkOne = __private.receiveForkOne;
			tempReceiveForkFive = __private.receiveForkFive;
			done();
		});

		afterEach(done => {
			__private.receiveBlock = tempReceiveBlock;
			__private.receiveForkOne = tempReceiveForkOne;
			__private.receiveForkFive = tempReceiveForkFive;
			done();
		});

		describe('Client is syncing and not ready to receive block', () => {
			describe('when __private.loaded is false', () => {
				beforeEach(done => {
					__private.loaded = false;
					done();
				});

				afterEach(done => {
					__private.loaded = true;
					done();
				});

				it('should return without process block', async () => {
					blocksProcessModule.onReceiveBlock({ id: 5 });

					expect(loggerStub.debug.args[0][0]).to.equal(
						'Client is not ready to receive block'
					);
					expect(loggerStub.debug.args[0][1]).to.equal(5);
					return expect(submodules.blocks.lastBlock.get.calledOnce).to.be.false;
				});
			});

			describe('when submodules.loader.syncing is true', () => {
				beforeEach(() => submodules.loader.syncing.returns(true));

				afterEach(() => submodules.loader.syncing.returns(false));

				it('should return without process block', async () => {
					blocksProcessModule.onReceiveBlock({ id: 5 });

					expect(loggerStub.debug.args[0][0]).to.equal(
						"Client is syncing. Can't receive block at the moment."
					);
					expect(loggerStub.debug.args[0][1]).to.equal(5);
					return expect(submodules.blocks.lastBlock.get.calledOnce).to.be.false;
				});
			});
		});

		describe('client ready to receive block', () => {
			afterEach(
				async () =>
					expect(submodules.blocks.lastBlock.get.calledOnce).to.be.true
			);

			describe('when block.previousBlock === lastBlock.id && lastBlock.height + 1 === block.height', () => {
				beforeEach(done => {
					__private.receiveBlock = sinonSandbox
						.stub()
						.callsArgWith(1, null, true);
					done();
				});

				afterEach(
					async () => expect(__private.receiveBlock.calledOnce).to.be.true
				);

				it('should call __private.receiveBlock', done => {
					library.sequence.add = function(cb) {
						const fn = Promise.promisify(cb);
						fn().then(() => {
							done();
						});
					};
					blocksProcessModule.onReceiveBlock({
						id: 5,
						previousBlock: '2',
						height: 3,
					});
				});
			});

			describe('when block.previousBlock !== lastBlock.id && lastBlock.height + 1 === block.height', () => {
				beforeEach(done => {
					__private.receiveForkOne = sinonSandbox
						.stub()
						.callsArgWith(2, null, true);
					done();
				});

				afterEach(() => {
					expect(__private.receiveForkOne.calledOnce).to.be.true;
					expect(__private.receiveForkOne.args[0][0]).to.deep.equal({
						id: 5,
						previousBlock: '3',
						height: 3,
					});
					expect(__private.receiveForkOne.args[0][1]).to.deep.equal({
						id: '2',
						height: 2,
					});
					return expect(__private.receiveForkOne.args[0][2]).to.be.an(
						'function'
					);
				});

				it('should call __private.receiveForkOne', done => {
					library.sequence.add = function(cb) {
						const fn = Promise.promisify(cb);
						fn().then(() => {
							done();
						});
					};
					blocksProcessModule.onReceiveBlock({
						id: 5,
						previousBlock: '3',
						height: 3,
					});
				});
			});

			describe('when block.previousBlock === lastBlock.previousBlock && block.height === lastBlock.height && block.id !== lastBlock.id', () => {
				beforeEach(() => {
					__private.receiveForkFive = sinonSandbox
						.stub()
						.callsArgWith(2, null, true);
					return submodules.blocks.lastBlock.get.returns({
						id: '2',
						height: 2,
						previousBlock: '1',
					});
				});

				afterEach(() => {
					expect(__private.receiveForkFive.calledOnce).to.be.true;
					expect(__private.receiveForkFive.args[0][0]).to.deep.equal({
						id: 5,
						previousBlock: '1',
						height: 2,
					});
					expect(__private.receiveForkFive.args[0][1]).to.deep.equal({
						id: '2',
						previousBlock: '1',
						height: 2,
					});
					return expect(__private.receiveForkFive.args[0][2]).to.be.an(
						'function'
					);
				});

				it('should call __private.receiveForkFive', done => {
					library.sequence.add = function(cb) {
						const fn = Promise.promisify(cb);
						fn().then(() => {
							done();
						});
					};
					blocksProcessModule.onReceiveBlock({
						id: 5,
						previousBlock: '1',
						height: 2,
					});
				});
			});

			describe('when block.id === lastBlock.id', () => {
				afterEach(done => {
					expect(loggerStub.debug.args[0][0]).to.equal(
						'Block already processed'
					);
					expect(loggerStub.debug.args[0][1]).to.equal('2');
					done();
				});

				it('should log debug message and call a callback', done => {
					library.sequence.add = function(cb) {
						const fn = Promise.promisify(cb);
						fn().then(() => {
							done();
						});
					};
					blocksProcessModule.onReceiveBlock({
						id: '2',
						previousBlock: '1',
						height: 2,
					});
				});
			});

			describe('when block.id !== lastBlock.id', () => {
				afterEach(() =>
					expect(loggerStub.warn.args[0][0]).to.equal(
						'Discarded block that does not match with current chain: 7 height: 11 round: 1 slot: 544076 generator: a1'
					)
				);

				it('should discard block, when it does not match with current chain', done => {
					library.sequence.add = function(cb) {
						const fn = Promise.promisify(cb);
						fn().then(() => {
							done();
						});
					};
					blocksProcessModule.onReceiveBlock({
						id: '7',
						previousBlock: '6',
						height: 11,
						timestamp: 5440768,
						generatorPublicKey: 'a1',
					});
				});
			});
		});
	});

	describe('onBind', () => {
		beforeEach(done => {
			loggerStub.trace.resetHistory();
			__private.loaded = false;
			blocksProcessModule.onBind(bindingsStub);
			done();
		});

		it('should call library.logger.trace with "Blocks->Process: Shared submodules bind."', async () =>
			expect(loggerStub.trace.args[0][0]).to.equal(
				'Blocks->Process: Shared submodules bind.'
			));

		it('should assign params to submodules', done => {
			expect(submodules.accounts).to.equal(bindingsStub.submodules.accounts);
			expect(submodules.blocks).to.equal(bindingsStub.submodules.blocks);
			expect(submodules.delegates).to.equal(bindingsStub.submodules.delegates);
			expect(submodules.loader).to.equal(bindingsStub.submodules.loader);
			expect(submodules.rounds).to.equal(bindingsStub.submodules.rounds);
			expect(submodules.transactions).to.equal(
				bindingsStub.submodules.transactions
			);
			expect(submodules.transport).to.equal(bindingsStub.submodules.transport);
			done();
		});

		it('should set __private.loaded to true', async () =>
			expect(__private.loaded).to.be.true);
	});
});
