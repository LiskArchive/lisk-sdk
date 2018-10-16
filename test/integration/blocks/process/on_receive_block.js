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

var crypto = require('crypto');
var expect = require('chai').expect;
var async = require('async');
var _ = require('lodash');
var Promise = require('bluebird');
var PQ = require('pg-promise').ParameterizedQuery;
var accountFixtures = require('../../../fixtures/accounts');
var slots = require('../../../../helpers/slots');
var genesisDelegates = require('../../../data/genesis_delegates.json')
	.delegates;
var application = require('../../../common/application.js');

const { ACTIVE_DELEGATES, BLOCK_SLOT_WINDOW } = global.constants;

describe('system test (blocks) - process onReceiveBlock()', () => {
	var library;
	var db;

	before(done => {
		application.init(
			{ sandbox: { name: 'system_blocks_process_on_receive_block' } },
			(err, scope) => {
				library = scope;
				db = scope.db;
				setTimeout(done, 5000);
			}
		);
	});

	after(application.cleanup);

	afterEach(done => {
		db
			.task(t => {
				return t.batch([
					db.none('DELETE FROM blocks WHERE "height" > 1;'),
					db.none('DELETE FROM forks_stat;'),
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
		var block = library.logic.block.create({
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
		var last_block = library.modules.blocks.lastBlock.get();
		var slot = forgingSlot || slots.getSlotNumber(last_block.timestamp) + 1;
		var delegate;

		function getNextForger(offset, seriesCb) {
			offset = !offset ? 0 : offset;
			var keys = library.rewiredModules.delegates.__get__(
				'__private.getKeysSortByVote'
			);
			const round = slots.calcRound(last_block.height + 1);
			library.modules.delegates.generateDelegateList(
				round,
				keys,
				(err, delegateList) => {
					var nextForger = delegateList[(slot + offset) % ACTIVE_DELEGATES];
					return seriesCb(nextForger);
				}
			);
		}

		var transactionPool = library.rewiredModules.transactions.__get__(
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
					delegate = _.find(genesisDelegates, delegate => {
						return delegate.publicKey === delegatePublicKey;
					});
					var keypair = getKeypair(delegate.passphrase);

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
		var forgedBlocks = [];
		// Setting the initialSlot based on the numberOfBlocksToForge. Because:
		// a) We don't want to forge blocks with timestamp too far in the past
		// b) We don't want to forge blocks with timestamp in the future
		// This allows us to play with onReceiveBlock function and different fork scenarios
		var initialSlot = slots.getSlotNumber() - numberOfBlocksToForge + 1;

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
		var generateDelegateListPromisified = Promise.promisify(
			library.modules.delegates.generateDelegateList
		);
		var lastBlock = library.modules.blocks.lastBlock.get();
		const round = slots.calcRound(lastBlock.height);

		return generateDelegateListPromisified(round, null)
			.then(list => {
				var delegatePublicKey = list[slot % ACTIVE_DELEGATES];
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
				db
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
		return db
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
			var lastBlock;
			var block;

			before(() => {
				lastBlock = library.modules.blocks.lastBlock.get();
				var slot = slots.getSlotNumber();
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
					var lastBlock;
					var block;

					beforeEach(done => {
						lastBlock = library.modules.blocks.lastBlock.get();
						var slot = slots.getSlotNumber();
						var nonDelegateKeypair = getKeypair(
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
					var lastBlock;
					var block;

					beforeEach(() => {
						lastBlock = library.modules.blocks.lastBlock.get();
						// Using last block's slot
						var slot = slots.getSlotNumber() - 1;
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
			var forgedBlocks = [];
			var secondLastBlock;
			var lastBlock;

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
				var blockWithGreaterTimestamp;
				var slot;
				var keypair;

				beforeEach(() => {
					slot = slots.getSlotNumber(lastBlock.timestamp) + 1;
					return getValidKeypairForSlot(slot).then(kp => {
						keypair = kp;
						var dummyBlock = {
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
				var blockWithLowerTimestamp;
				var slot;
				var keypair;

				beforeEach(() => {
					slot = slots.getSlotNumber(lastBlock.timestamp);
					return getValidKeypairForSlot(slot).then(kp => {
						keypair = kp;
						var dummyBlock = {
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
				var mutatedHeight;

				beforeEach(done => {
					mutatedHeight = lastBlock.height + 1;
					done();
				});

				describe('when received block is from previous round (101 blocks back)', () => {
					var blockFromPreviousRound;

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
					var inSlotsWindowBlock;

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
					var outOfSlotWindowBlock;

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
					var blockFromFutureSlot;

					beforeEach(() => {
						var slot = slots.getSlotNumber() + 1;
						return getValidKeypairForSlot(slot).then(keypair => {
							var dummyBlock = {
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
				var secondLastBlock;
				var lastBlock;
				var slot;
				var keypair;

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
					var timestamp;

					beforeEach(done => {
						timestamp = lastBlock.timestamp + 1;
						done();
					});

					it('should reject received block', done => {
						var blockWithGreaterTimestamp = createBlock(
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
									return value.publicKey != lastBlock.generatorPublicKey;
								}).publicKey
							);
							done();
						});

						it('should reject received block', done => {
							var blockWithGreaterTimestamp = createBlock(
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
					var timestamp;

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
							var blockWithInvalidSlot = createBlock(
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
							var blockWithLowerTimestamp = createBlock(
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
								var blockWithDifferentKeyAndTimestamp = createBlock(
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
							var timestamp;

							beforeEach(() => {
								// Slot and generatorPublicKey belongs to delegate who is 6 slots behind current slot
								slot = slots.getSlotNumber() - (BLOCK_SLOT_WINDOW + 1);
								timestamp = slots.getSlotTime(slot);
								return getValidKeypairForSlot(slot).then(kp => {
									keypair = kp;
								});
							});

							it('should reject received block when blockslot outside window', done => {
								var blockWithDifferentKeyAndTimestamp = createBlock(
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
					var nextSlotBlock;
					var nextSlotKeypair;

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
						var blockWithUnskippedSlot = createBlock(
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
				var secondLastBlock;
				var lastBlock;
				var keypair;
				var slot;

				beforeEach(done => {
					forgeMultipleBlocks(100, (err, forgedBlocks) => {
						secondLastBlock = forgedBlocks[forgedBlocks.length - 2];
						lastBlock = forgedBlocks[forgedBlocks.length - 1];
						slot = slots.getSlotNumber(lastBlock.timestamp);
						keypair = getKeypair(
							_.find(genesisDelegates, delegate => {
								return lastBlock.generatorPublicKey == delegate.publicKey;
							}).passphrase
						);
						done();
					});
				});

				describe('after new round', () => {
					var blockFromPreviousRound;

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
				var lastBlock;
				var block;

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
				var differentChainBlock;

				beforeEach(done => {
					var dummyLastBlock = {
						height: 11,
						id: '14723131253653198332',
					};

					var keypair = getKeypair(genesisDelegates[0].passphrase);
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
