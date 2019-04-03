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

const crypto = require('crypto');
const expect = require('chai').expect;
const async = require('async');
const _ = require('lodash');
const Promise = require('bluebird');
const PQ = require('pg-promise').ParameterizedQuery;
const accountFixtures = require('../../../fixtures/accounts');
const slots = require('../../../../../src/modules/chain/helpers/slots');
const genesisDelegates = require('../../../data/genesis_delegates.json')
	.delegates;
const application = require('../../../common/application');

const { ACTIVE_DELEGATES, BLOCK_SLOT_WINDOW } = global.constants;

describe('integration test (blocks) - process onReceiveBlock()', () => {
	let library;
	let storage;

	before(done => {
		application.init(
			{
				sandbox: {
					name: 'blocks_process_on_receive_block',
				},
			},
			(err, scope) => {
				library = scope;
				storage = scope.components.storage;
				setTimeout(done, 5000);
			}
		);
	});

	after(application.cleanup);

	afterEach(done => {
		storage.entities.Block.begin(t => {
			return t.batch([
				storage.adapter.db.none('DELETE FROM blocks WHERE "height" > 1;'),
				storage.adapter.db.none('DELETE FROM forks_stat;'),
			]);
		})
			.then(() => {
				library.modules.blocks.lastBlock.set(__testContext.config.genesisBlock);
				done();
			})
			.catch(err => {
				__testContext.debug(err.stack);
				done();
			});
	});

	function createBlock(transactions, timestamp, keypair, previousBlock) {
		const block = library.logic.block.create({
			keypair,
			timestamp,
			previousBlock,
			transactions,
		});

		block.id = library.logic.block.getId(block);
		block.height = previousBlock.height + 1;
		return block;
	}

	function forge(forgingSlot, cb) {
		let last_block = library.modules.blocks.lastBlock.get();
		const slot = forgingSlot || slots.getSlotNumber(last_block.timestamp) + 1;
		let delegate;

		function getNextForger(offset, seriesCb) {
			offset = !offset ? 0 : offset;
			const keys = library.rewiredModules.delegates.__get__(
				'__private.getKeysSortByVote'
			);
			const round = slots.calcRound(last_block.height + 1);
			library.modules.delegates.generateDelegateList(
				round,
				keys,
				(err, delegateList) => {
					const nextForger = delegateList[(slot + offset) % ACTIVE_DELEGATES];
					return seriesCb(nextForger);
				}
			);
		}

		const transactionPool = library.rewiredModules.transactions.__get__(
			'__private.transactionPool'
		);

		async.waterfall(
			[
				transactionPool.fillPool,
				function(waterFallCb) {
					getNextForger(null, delegatePublicKey => {
						waterFallCb(null, delegatePublicKey);
					});
				},
				function(delegatePublicKey, waterFallCb) {
					delegate = _.find(genesisDelegates, foundDelegate => {
						return foundDelegate.publicKey === delegatePublicKey;
					});
					const keypair = getKeypair(delegate.passphrase);

					__testContext.debug(
						`Last block height: ${last_block.height}
						Last block ID: ${last_block.id}
						Last block timestamp: ${last_block.timestamp}
						Next slot: ${slot}
						Next delegate public key: ${delegatePublicKey}
						Next block timestamp: ${slots.getSlotTime(slot)}`
					);

					library.modules.blocks.process.generateBlock(
						keypair,
						slots.getSlotTime(slot) + 5,
						err => {
							if (err) {
								return waterFallCb(err);
							}
							last_block = library.modules.blocks.lastBlock.get();
							__testContext.debug(
								`New last block height: ${
									last_block.height
								} New last block ID: ${last_block.id}`
							);
							return waterFallCb(err);
						}
					);
				},
			],
			err => {
				cb(err, last_block);
			}
		);
	}

	function forgeMultipleBlocks(numberOfBlocksToForge, cb) {
		const forgedBlocks = [];
		// Setting the initialSlot based on the numberOfBlocksToForge. Because:
		// a) We don't want to forge blocks with timestamp too far in the past
		// b) We don't want to forge blocks with timestamp in the future
		// This allows us to play with onReceiveBlock function and different fork scenarios
		const initialSlot = slots.getSlotNumber() - numberOfBlocksToForge + 1;

		async.mapSeries(
			_.range(0, numberOfBlocksToForge),
			(offset, seriesCb) => {
				forge(initialSlot + offset, (err, forgedBlock) => {
					forgedBlocks.push(forgedBlock);
					seriesCb(err);
				});
			},
			err => {
				cb(err, forgedBlocks);
			}
		);
	}

	function getKeypair(passphrase) {
		return library.ed.makeKeypair(
			crypto
				.createHash('sha256')
				.update(passphrase, 'utf8')
				.digest()
		);
	}

	function getValidKeypairForSlot(slot) {
		const generateDelegateListPromisified = Promise.promisify(
			library.modules.delegates.generateDelegateList
		);
		const lastBlock = library.modules.blocks.lastBlock.get();
		const round = slots.calcRound(lastBlock.height);

		return generateDelegateListPromisified(round, null)
			.then(list => {
				const delegatePublicKey = list[slot % ACTIVE_DELEGATES];
				return getKeypair(
					_.find(genesisDelegates, delegate => {
						return delegate.publicKey === delegatePublicKey;
					}).passphrase
				);
			})
			.catch(err => {
				throw err;
			});
	}

	function getBlocks(cb) {
		library.sequence.add(
			sequenceCb => {
				storage.adapter.db
					.query(
						new PQ('SELECT "id" FROM blocks ORDER BY "height" DESC LIMIT 10;')
					)
					.then(rows => sequenceCb(null, rows))
					.catch(err => sequenceCb(err, []));
			},
			(err, rows) => {
				if (err) {
					__testContext.debug(err.stack);
				}
				cb(err, _.map(rows, 'id'));
			}
		);
	}

	function verifyForkStat(blockId, cause) {
		return storage.adapter.db
			.one(
				'SELECT * FROM forks_stat WHERE "blockId" = ${blockId} AND "cause" = ${cause}',
				{ blockId, cause }
			)
			.then(res => {
				expect(res.blockId).to.equal(blockId);
			})
			.catch(err => {
				__testContext.debug(err.stack);
			});
	}

	describe('onReceiveBlock (empty transactions)', () => {
		describe('for valid block', () => {
			let lastBlock;
			let block;

			before(() => {
				lastBlock = library.modules.blocks.lastBlock.get();
				const slot = slots.getSlotNumber();
				return getValidKeypairForSlot(slot).then(keypair => {
					block = createBlock([], slots.getSlotTime(slot), keypair, lastBlock);
				});
			});

			it('should add block to blockchain', done => {
				library.modules.blocks.process.onReceiveBlock(block);
				getBlocks((err, blockIds) => {
					expect(err).to.not.exist;
					expect(blockIds).to.have.length(2);
					expect(blockIds).to.include.members([block.id, lastBlock.id]);
					done();
				});
			});
		});

		describe('forkThree', () => {
			describe('validate block slot', () => {
				describe('when generator is not a delegate', () => {
					let lastBlock;
					let block;

					beforeEach(done => {
						lastBlock = library.modules.blocks.lastBlock.get();
						const slot = slots.getSlotNumber();
						const nonDelegateKeypair = getKeypair(
							accountFixtures.genesis.passphrase
						);
						block = createBlock(
							[],
							slots.getSlotTime(slot),
							nonDelegateKeypair,
							lastBlock
						);
						done();
					});

					it('should not add block to blockchain', done => {
						library.modules.blocks.process.onReceiveBlock(block);
						getBlocks((err, blockIds) => {
							expect(err).to.not.exist;
							expect(blockIds).to.have.length(1);
							expect(blockIds).to.include.members([lastBlock.id]);
							done();
						});
					});
				});

				describe('when block generator has incorrect slot', () => {
					let lastBlock;
					let block;

					beforeEach(() => {
						lastBlock = library.modules.blocks.lastBlock.get();
						// Using last block's slot
						const slot = slots.getSlotNumber() - 1;
						return getValidKeypairForSlot(slot - 1).then(keypair => {
							block = createBlock([], slots.getTime(slot), keypair, lastBlock);
						});
					});

					it('should not add block to blockchain', done => {
						library.modules.blocks.process.onReceiveBlock(block);
						getBlocks((err, blockIds) => {
							expect(err).to.not.exist;
							expect(blockIds).to.have.length(1);
							expect(blockIds).to.include.members([lastBlock.id]);
							done();
						});
					});
				});
			});
		});

		describe('forkOne', () => {
			let forgedBlocks = [];
			let secondLastBlock;
			let lastBlock;

			beforeEach('forge 300 blocks', done => {
				forgeMultipleBlocks(300, (err, blocks) => {
					expect(err).to.not.exist;
					forgedBlocks = blocks;
					secondLastBlock = forgedBlocks[forgedBlocks.length - 2];
					lastBlock = forgedBlocks[forgedBlocks.length - 1];
					done();
				});
			});

			describe('when received block timestamp is greater than previous block', () => {
				let blockWithGreaterTimestamp;
				let slot;
				let keypair;

				beforeEach(() => {
					slot = slots.getSlotNumber(lastBlock.timestamp) + 1;
					return getValidKeypairForSlot(slot).then(kp => {
						keypair = kp;
						const dummyBlock = {
							id: '0',
							height: lastBlock.height,
						};
						// Using forge() function, a new block is always created with timestamp = currentSlotTime + 5
						// So, if we want to create a block in the current slot, but with greater timestamp,
						// we can add any value from 6 to 9 to the currentSlotTimestamp
						blockWithGreaterTimestamp = createBlock(
							[],
							slots.getSlotTime(slot) + 7,
							keypair,
							dummyBlock
						);
						library.modules.blocks.process.onReceiveBlock(
							blockWithGreaterTimestamp
						);
					});
				});

				it('should reject received block', done => {
					getBlocks((err, blockIds) => {
						expect(err).to.not.exist;
						expect(blockIds).to.have.length(10);
						expect(blockIds).to.not.include(blockWithGreaterTimestamp.id);
						expect(blockIds).to.include.members([
							lastBlock.id,
							secondLastBlock.id,
						]);
						return verifyForkStat(blockWithGreaterTimestamp.id, 1).then(done);
					});
				});
			});

			describe('when received block timestamp is lower than previous block', () => {
				let blockWithLowerTimestamp;
				let slot;
				let keypair;

				beforeEach(() => {
					slot = slots.getSlotNumber(lastBlock.timestamp);
					return getValidKeypairForSlot(slot).then(kp => {
						keypair = kp;
						const dummyBlock = {
							id: '0',
							height: lastBlock.height,
						};
						blockWithLowerTimestamp = createBlock(
							[],
							slots.getSlotTime(slot),
							keypair,
							dummyBlock
						);
						library.modules.blocks.process.onReceiveBlock(
							blockWithLowerTimestamp
						);
					});
				});

				it('should reject received block and delete last two blocks', done => {
					getBlocks((err, blockIds) => {
						expect(err).to.not.exist;
						expect(blockIds).to.not.include.members([
							lastBlock.id,
							secondLastBlock.id,
							blockWithLowerTimestamp.id,
						]);
						return verifyForkStat(blockWithLowerTimestamp.id, 1).then(done);
					});
				});
			});

			describe('when block height is mutated', () => {
				let mutatedHeight;

				beforeEach(done => {
					mutatedHeight = lastBlock.height + 1;
					done();
				});

				describe('when received block is from previous round (101 blocks back)', () => {
					let blockFromPreviousRound;

					beforeEach(() => {
						blockFromPreviousRound =
							forgedBlocks[forgedBlocks.length - ACTIVE_DELEGATES];
						blockFromPreviousRound.height = mutatedHeight;
						return library.modules.blocks.process.onReceiveBlock(
							blockFromPreviousRound
						);
					});

					it('should reject received block', done => {
						getBlocks((err, blockIds) => {
							expect(err).to.not.exist;
							expect(blockIds).to.not.include(blockFromPreviousRound.id);
							expect(blockIds).to.include.members([
								lastBlock.id,
								secondLastBlock.id,
							]);
							return verifyForkStat(blockFromPreviousRound.id, 1).then(done);
						});
					});
				});

				describe(`when received block is from same round and ${BLOCK_SLOT_WINDOW -
					1} slots in the past`, () => {
					let inSlotsWindowBlock;

					beforeEach(() => {
						inSlotsWindowBlock =
							forgedBlocks[forgedBlocks.length - (BLOCK_SLOT_WINDOW - 1)];
						inSlotsWindowBlock.height = mutatedHeight;
						return library.modules.blocks.process.onReceiveBlock(
							inSlotsWindowBlock
						);
					});

					it('should reject received block', done => {
						getBlocks((err, blockIds) => {
							expect(err).to.not.exist;
							// expect(blockIds).to.not.include(inSlotsWindowBlock.id);
							expect(blockIds).to.include.members([
								lastBlock.id,
								secondLastBlock.id,
							]);
							return verifyForkStat(inSlotsWindowBlock.id, 1).then(done);
						});
					});
				});

				describe(`when received block is from same round and greater than ${BLOCK_SLOT_WINDOW} slots in the past`, () => {
					let outOfSlotWindowBlock;

					beforeEach(() => {
						outOfSlotWindowBlock =
							forgedBlocks[forgedBlocks.length - (BLOCK_SLOT_WINDOW + 2)];
						outOfSlotWindowBlock.height = mutatedHeight;
						return library.modules.blocks.process.onReceiveBlock(
							outOfSlotWindowBlock
						);
					});

					it('should reject received block', done => {
						getBlocks((err, blockIds) => {
							expect(err).to.not.exist;
							// expect(blockIds).to.not.include(outOfSlotWindowBlock.id);
							expect(blockIds).to.include.members([
								lastBlock.id,
								secondLastBlock.id,
							]);
							return verifyForkStat(outOfSlotWindowBlock.id, 1).then(done);
						});
					});
				});

				describe('when received block is from a future slot', () => {
					let blockFromFutureSlot;

					beforeEach(() => {
						const slot = slots.getSlotNumber() + 1;
						return getValidKeypairForSlot(slot).then(keypair => {
							const dummyBlock = {
								id: '0',
								height: mutatedHeight - 1,
							};
							blockFromFutureSlot = createBlock(
								[],
								slots.getSlotTime(slot),
								keypair,
								dummyBlock
							);
							library.modules.blocks.process.onReceiveBlock(
								blockFromFutureSlot
							);
						});
					});

					it('should reject received block', done => {
						getBlocks((err, blockIds) => {
							expect(err).to.not.exist;
							expect(blockIds).to.not.include(blockFromFutureSlot.id);
							expect(blockIds).to.include.members([
								lastBlock.id,
								secondLastBlock.id,
							]);
							return verifyForkStat(blockFromFutureSlot.id, 1).then(done);
						});
					});
				});
			});
		});

		describe('forkFive', () => {
			describe('with 5 blocks forged', () => {
				let secondLastBlock;
				let lastBlock;
				let slot;
				let keypair;

				beforeEach(done => {
					forgeMultipleBlocks(5, (err, forgedBlocks) => {
						expect(err).to.not.exist;

						secondLastBlock = forgedBlocks[forgedBlocks.length - 2];
						lastBlock = forgedBlocks[forgedBlocks.length - 1];

						slot = slots.getSlotNumber(lastBlock.timestamp);
						return getValidKeypairForSlot(slot).then(kp => {
							keypair = kp;
							done();
						});
					});
				});

				describe('when timestamp is greater than last block', () => {
					let timestamp;

					beforeEach(done => {
						timestamp = lastBlock.timestamp + 1;
						done();
					});

					it('should reject received block', done => {
						const blockWithGreaterTimestamp = createBlock(
							[],
							timestamp,
							keypair,
							secondLastBlock
						);
						library.modules.blocks.process.onReceiveBlock(
							blockWithGreaterTimestamp
						);
						getBlocks((err, blockIds) => {
							expect(err).to.not.exist;
							expect(blockIds).to.have.length(6);
							expect(blockIds).to.not.include(blockWithGreaterTimestamp.id);
							expect(blockIds).to.include.members([
								lastBlock.id,
								secondLastBlock.id,
							]);
							return verifyForkStat(blockWithGreaterTimestamp.id, 5).then(done);
						});
					});

					describe('when delegate slot is invalid', () => {
						beforeEach(done => {
							keypair = getKeypair(
								_.find(genesisDelegates, value => {
									return value.publicKey !== lastBlock.generatorPublicKey;
								}).publicKey
							);
							done();
						});

						it('should reject received block', done => {
							const blockWithGreaterTimestamp = createBlock(
								[],
								timestamp,
								keypair,
								secondLastBlock
							);
							library.modules.blocks.process.onReceiveBlock(
								blockWithGreaterTimestamp
							);
							getBlocks((err, blockIds) => {
								expect(err).to.not.exist;
								expect(blockIds).to.not.include(blockWithGreaterTimestamp.id);
								expect(blockIds).to.include.members([
									lastBlock.id,
									secondLastBlock.id,
								]);
								return verifyForkStat(blockWithGreaterTimestamp.id, 5).then(
									done
								);
							});
						});
					});
				});

				describe('when timestamp is lower than last block', () => {
					let timestamp;

					beforeEach(done => {
						timestamp = lastBlock.timestamp - 1;
						done();
					});

					describe('when block slot is invalid', () => {
						beforeEach(() => {
							slot = slots.getSlotNumber(lastBlock.timestamp) + 1;
							return getValidKeypairForSlot(slot).then(kp => {
								keypair = kp;
							});
						});

						it('should reject received block when blockslot is invalid', done => {
							const blockWithInvalidSlot = createBlock(
								[],
								timestamp,
								keypair,
								secondLastBlock
							);
							library.modules.blocks.process.onReceiveBlock(
								blockWithInvalidSlot
							);
							getBlocks((err, blockIds) => {
								expect(err).to.not.exist;
								expect(blockIds).to.have.length(6);
								expect(blockIds).to.not.include(blockWithInvalidSlot.id);
								expect(blockIds).to.include.members([
									secondLastBlock.id,
									lastBlock.id,
								]);
								return verifyForkStat(blockWithInvalidSlot.id, 5).then(done);
							});
						});
					});

					describe('when blockslot and generator publicKey is valid', () => {
						it('should replace last block with received block', done => {
							const blockWithLowerTimestamp = createBlock(
								[],
								timestamp,
								keypair,
								secondLastBlock
							);
							library.modules.blocks.process.onReceiveBlock(
								blockWithLowerTimestamp
							);
							getBlocks((err, blockIds) => {
								expect(err).to.not.exist;
								expect(blockIds).to.have.length(6);
								expect(blockIds).to.not.include(lastBlock.id);
								expect(blockIds).to.include.members([
									blockWithLowerTimestamp.id,
									secondLastBlock.id,
								]);
								return verifyForkStat(blockWithLowerTimestamp.id, 5).then(done);
							});
						});
					});

					describe('when generator publicKey and timestamp is different', () => {
						describe('when timestamp is inside slot window', () => {
							beforeEach(done => {
								// Slot and generatorPublicKey belongs to delegate who forged second last block
								slot = slots.getSlotNumber(secondLastBlock.timestamp);
								timestamp = slots.getSlotTime(slot);
								keypair = getKeypair(
									_.find(genesisDelegates, delegate => {
										return (
											delegate.publicKey === secondLastBlock.generatorPublicKey
										);
									}).passphrase
								);
								done();
							});

							it('should reject received block and delete last block', done => {
								const blockWithDifferentKeyAndTimestamp = createBlock(
									[],
									timestamp,
									keypair,
									secondLastBlock
								);
								library.modules.blocks.process.onReceiveBlock(
									blockWithDifferentKeyAndTimestamp
								);
								getBlocks((err, blockIds) => {
									expect(err).to.not.exist;
									expect(blockIds).to.have.length(5);
									expect(blockIds).to.include.members([secondLastBlock.id]);
									expect(blockIds).to.not.include.members([
										blockWithDifferentKeyAndTimestamp.id,
										lastBlock.id,
									]);
									return verifyForkStat(
										blockWithDifferentKeyAndTimestamp.id,
										5
									).then(done);
								});
							});
						});

						describe('when timestamp is outside slot window', () => {
							let auxTimestamp;

							beforeEach(() => {
								// Slot and generatorPublicKey belongs to delegate who is 6 slots behind current slot
								slot = slots.getSlotNumber() - (BLOCK_SLOT_WINDOW + 1);
								auxTimestamp = slots.getSlotTime(slot);
								return getValidKeypairForSlot(slot).then(kp => {
									keypair = kp;
								});
							});

							it('should reject received block when blockslot outside window', done => {
								const blockWithDifferentKeyAndTimestamp = createBlock(
									[],
									auxTimestamp,
									keypair,
									secondLastBlock
								);
								library.modules.blocks.process.onReceiveBlock(
									blockWithDifferentKeyAndTimestamp
								);
								getBlocks((err, blockIds) => {
									expect(err).to.not.exist;
									expect(blockIds).to.have.length(6);
									expect(blockIds).to.not.include(
										blockWithDifferentKeyAndTimestamp.id
									);
									expect(blockIds).to.include.members([
										secondLastBlock.id,
										lastBlock.id,
									]);
									return verifyForkStat(
										blockWithDifferentKeyAndTimestamp.id,
										5
									).then(done);
								});
							});
						});
					});
				});

				describe('when last block skipped a slot', () => {
					let nextSlotBlock;
					let nextSlotKeypair;

					beforeEach(done => {
						Promise.all([
							getValidKeypairForSlot(slot + 1),
							getValidKeypairForSlot(slot + 2),
						]).then(keypairs => {
							keypair = keypairs[0];
							nextSlotKeypair = keypairs[1];
							nextSlotBlock = createBlock(
								[],
								slots.getSlotTime(slot + 2),
								nextSlotKeypair,
								lastBlock
							);

							function sendSkippedSlotBlock() {
								library.modules.blocks.process.onReceiveBlock(nextSlotBlock);
								done();
							}

							(function waitUntilSkippedSlotBlockIsValid() {
								if (slots.getSlotNumber() < slot + 2) {
									__testContext.debug(
										`Waiting for slot: ${slot +
											2}, current slot: ${slots.getSlotNumber()}`
									);
									setTimeout(waitUntilSkippedSlotBlockIsValid, 1000);
								} else {
									sendSkippedSlotBlock();
								}
							})();
						});
					});

					it('should delete skipped block and save received block (with lower slot)', done => {
						const blockWithUnskippedSlot = createBlock(
							[],
							slots.getSlotTime(slot + 1),
							keypair,
							lastBlock
						);
						library.modules.blocks.process.onReceiveBlock(
							blockWithUnskippedSlot
						);
						getBlocks((err, blockIds) => {
							expect(err).to.not.exist;
							expect(blockIds).to.have.length(7);
							expect(blockIds).to.not.include(nextSlotBlock.id);
							expect(blockIds).to.include.members([
								blockWithUnskippedSlot.id,
								lastBlock.id,
								secondLastBlock.id,
							]);
							return verifyForkStat(blockWithUnskippedSlot.id, 5).then(done);
						});
					});
				});
			});

			describe('with 100 blocks forged', () => {
				let secondLastBlock;
				let lastBlock;
				let keypair;
				let slot;

				beforeEach(done => {
					forgeMultipleBlocks(100, (err, forgedBlocks) => {
						secondLastBlock = forgedBlocks[forgedBlocks.length - 2];
						lastBlock = forgedBlocks[forgedBlocks.length - 1];
						slot = slots.getSlotNumber(lastBlock.timestamp);
						keypair = getKeypair(
							_.find(genesisDelegates, delegate => {
								return lastBlock.generatorPublicKey === delegate.publicKey;
							}).passphrase
						);
						done();
					});
				});

				describe('after new round', () => {
					let blockFromPreviousRound;

					beforeEach(done => {
						blockFromPreviousRound = createBlock(
							[],
							slots.getSlotTime(slot),
							keypair,
							secondLastBlock
						);
						done();
					});

					it('should delete last block and save received block (from previous round)', done => {
						library.modules.blocks.process.onReceiveBlock(
							blockFromPreviousRound
						);
						getBlocks((err, blockIds) => {
							expect(err).to.not.exist;
							expect(blockIds).to.have.length(10);
							expect(blockIds).to.not.include(lastBlock.id);
							expect(blockIds).to.include.members([
								secondLastBlock.id,
								blockFromPreviousRound.id,
							]);
							return verifyForkStat(blockFromPreviousRound.id, 5).then(done);
						});
					});
				});
			});
		});

		describe('discard blocks', () => {
			describe('when block is already processed', () => {
				let lastBlock;
				let block;

				beforeEach(done => {
					lastBlock = library.modules.blocks.lastBlock.get();
					forge(null, (err, forgedBlock) => {
						block = forgedBlock;
						done();
					});
				});

				it('should reject received block', done => {
					library.modules.blocks.process.onReceiveBlock(block);
					getBlocks((err, blockIds) => {
						expect(err).to.not.exist;
						expect(blockIds).to.have.length(2);
						expect(blockIds).to.include.members([block.id, lastBlock.id]);
						done();
					});
				});
			});

			describe('when block does not match blockchain', () => {
				let differentChainBlock;

				beforeEach(done => {
					const dummyLastBlock = {
						height: 11,
						id: '14723131253653198332',
					};

					const keypair = getKeypair(genesisDelegates[0].passphrase);
					differentChainBlock = createBlock(
						[],
						slots.getSlotTime(10),
						keypair,
						dummyLastBlock
					);
					done();
				});

				it('should reject received block', done => {
					library.modules.blocks.process.onReceiveBlock(differentChainBlock);
					getBlocks((err, blockIds) => {
						expect(err).to.not.exist;
						expect(blockIds).to.have.length(1);
						expect(blockIds).to.not.include(differentChainBlock.id);
						expect(blockIds).to.include.members([
							__testContext.config.genesisBlock.id,
						]);
						done();
					});
				});
			});
		});
	});
});
