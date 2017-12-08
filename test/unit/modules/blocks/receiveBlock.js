var expect = require('chai').expect;
var async = require('async');
var crypto = require('crypto');
var _ = require('lodash');
var Promise = require('bluebird');

var node = require('../../../node');
var slots = require('../../../../helpers/slots');
var constants = require('../../../../helpers/constants');
var genesisBlock = require('../../../../genesisBlock.json');
var genesisDelegates = require('../../../genesisDelegates.json').delegates;
var application = require('../../../common/application.js');

describe('onReceiveBlock()', function () {

	var library;
	var db;

	before(function (done) {
		application.init({sandbox: {name: 'lisk_test_blocks_process'}}, function (scope) {
			library = scope;
			db = scope.db;
			done();
		});
	});

	after(application.cleanup);

	afterEach(function (done) {
		db.task(function (t) {
			return t.batch([
				db.none('DELETE FROM blocks WHERE "height" > 1;'),
				db.none('DELETE FROM forks_stat;')
			]);
		}).then(function () {
			library.modules.blocks.lastBlock.set(genesisBlock);
			done();
		});
	});

	function createBlock (transactions, timestamp, keypair, previousBlock) {
		var block = library.logic.block.create({
			keypair: keypair,
			timestamp: timestamp,
			previousBlock: previousBlock,
			transactions: transactions
		});

		block.id = library.logic.block.getId(block);
		block.height = previousBlock.height + 1;
		return block;
	}

	function forgeMultipleBlocks (numberOfBlocksToForge, cb) {
		var forgedBlocks = [];
		// Setting the initialSlot based on the numberOfBlocksToForge. Because:
		// a) We don't want to forge blocks with timestamp too far in the past
		// b) We don't want to forge blocks with timestamp in the future
		// This allows us to play with onReceiveBlock function and different fork scenarios
		var initialSlot = slots.getSlotNumber() - numberOfBlocksToForge + 1;

		async.mapSeries(_.range(0, numberOfBlocksToForge), function (offset, seriesCb) {
			forge(initialSlot + offset, function (err, forgedBlock) {
				forgedBlocks.push(forgedBlock);
				seriesCb(err);
			});
		}, function (err) {
			cb(err, forgedBlocks);
		});
	}

	function forge (forgingSlot, cb) {
		var last_block = library.modules.blocks.lastBlock.get();
		var slot = forgingSlot || slots.getSlotNumber(last_block.timestamp) + 1;

		function getNextForger (offset, cb) {
			offset = !offset ? 0 : offset;
			library.modules.delegates.generateDelegateList(last_block.height + 1, null, function (err, delegateList) {
				if (err) { return cb (err); }
				var nextForger = delegateList[(slot + offset) % slots.delegates];
				return cb(nextForger);
			});
		}

		var transactionPool = library.rewiredModules.transactions.__get__('__private.transactionPool');

		node.async.waterfall([
			transactionPool.fillPool,
			function (cb) {
				getNextForger(null, function (delegatePublicKey) {
					cb(null, delegatePublicKey);
				});
			},
			function (delegatePublicKey, seriesCb) {
				var delegate = _.find(genesisDelegates, function (delegate) {
					return delegate.publicKey === delegatePublicKey;
				});
				var keypair = getKeypair(delegate.secret);

				node.debug('		Last block height: ' + last_block.height + ' Last block ID: ' + last_block.id + ' Last block timestamp: ' + last_block.timestamp + ' Next slot: ' + slot + ' Next delegate PK: ' + delegatePublicKey + ' Next block timestamp: ' + slots.getSlotTime(slot));
				library.modules.blocks.process.generateBlock(keypair, slots.getSlotTime(slot) + 5, function (err) {
					if (err) { return seriesCb(err); }
					last_block = library.modules.blocks.lastBlock.get();
					node.debug('		New last block height: ' + last_block.height + ' New last block ID: ' + last_block.id);
					return seriesCb(err);
				});
			}
		], function (err) {
			cb(err, last_block);
		});
	}

	function getKeypair (secret) {
		return library.ed.makeKeypair(crypto.createHash('sha256').update(secret, 'utf8').digest());
	}

	function getValidKeypairForSlot (slot) {
		var generateDelegateListPromisified = Promise.promisify(library.modules.delegates.generateDelegateList);
		var lastBlock = library.modules.blocks.lastBlock.get();

		return generateDelegateListPromisified(lastBlock.height, null).then(function (list) {
			var delegatePublicKey = list[slot % slots.delegates];
			return getKeypair(_.find(genesisDelegates, function (delegate) {
				return delegate.publicKey === delegatePublicKey;
			}).secret);
		});
	}

	function getBlocks (cb) {
		library.sequence.add(function (sequenceCb) {
			db.query('SELECT "id" FROM blocks ORDER BY "height" DESC LIMIT 10;').then(function (rows) {
				sequenceCb();
				cb(null, _.map(rows, 'id'));
			}).catch(function (err) {
				node.debug(err.stack);
				cb(err);
			});
		});
	}

	function verifyForkStat (blockId, cause) {
		return db.one('SELECT * FROM forks_stat WHERE "blockId" = ${blockId} AND "cause" = ${cause}', {blockId: blockId, cause: cause}).then(function (res) {
			expect(res.blockId).to.equal(blockId);
		});
	}

	describe('onReceiveBlock (empty transactions)', function () {

		describe('for valid block', function () {

			var lastBlock;
			var block;

			before(function () {
				lastBlock = library.modules.blocks.lastBlock.get();
				var slot = slots.getSlotNumber();
				return getValidKeypairForSlot(slot).then(function (keypair) {
					block = createBlock([], slots.getSlotTime(slot), keypair, lastBlock);
				});
			});

			it('should add block to blockchain', function (done) {
				library.modules.blocks.process.onReceiveBlock(block);
				getBlocks(function (err, blockIds) {
					expect(err).to.not.exist;
					expect(blockIds).to.have.length(2);
					expect(blockIds).to.include.members([block.id, lastBlock.id]);
					done();
				});
			});
		});

		describe('forkThree', function () {

			describe('validate block slot', function () {

				describe('when generator is not a delegate', function () {

					var lastBlock;
					var block;

					beforeEach(function () {
						lastBlock = library.modules.blocks.lastBlock.get();
						var slot = slots.getSlotNumber();
						var nonDelegateKeypair = getKeypair(node.gAccount.password);
						block = createBlock([], slots.getSlotTime(slot), nonDelegateKeypair, lastBlock);
					});

					it('should not add block to blockchain', function (done) {
						library.modules.blocks.process.onReceiveBlock(block);
						getBlocks(function (err, blockIds) {
							expect(err).to.not.exist;
							expect(blockIds).to.have.length(1);
							expect(blockIds).to.include.members([lastBlock.id]);
							done();
						});
					});
				});

				describe('when block generator has incorrect slot', function () {

					var lastBlock;
					var block;

					beforeEach(function () {
						lastBlock = library.modules.blocks.lastBlock.get();
						// Using last block's slot
						var slot = slots.getSlotNumber() - 1;
						return getValidKeypairForSlot(slot - 1).then(function (keypair) {
							block = createBlock([], slots.getTime(slot), keypair, lastBlock);
						});
					});

					it('should not add block to blockchain', function (done) {
						library.modules.blocks.process.onReceiveBlock(block);
						getBlocks(function (err, blockIds) {
							expect(err).to.not.exist;
							expect(blockIds).to.have.length(1);
							expect(blockIds).to.include.members([lastBlock.id]);
							done();
						});
					});
				});
			});
		});

		describe('forkOne', function () {

			var forgedBlocks = [];
			var secondLastBlock;
			var lastBlock;

			beforeEach('forge 300 blocks', function (done) {
				forgeMultipleBlocks(300, function (err, blocks) {
					expect(err).to.not.exist;
					forgedBlocks = blocks;
					secondLastBlock = forgedBlocks[forgedBlocks.length - 2];
					lastBlock = forgedBlocks[forgedBlocks.length - 1];
					done();
				});
			});

			describe('when received block timestamp is greater than previous block', function () {

				var blockWithGreaterTimestamp;
				var slot;
				var keypair;

				beforeEach(function () {
					slot = slots.getSlotNumber(lastBlock.timestamp) + 1;
					return getValidKeypairForSlot(slot).then(function (kp) {
						keypair = kp;
						var dummyBlock = {
							id: '0',
							height: lastBlock.height
						};
						// Using forge() function, a new block is always created with timestamp = currentSlotTime + 5
						// So, if we want to create a block in the current slot, but with greater timestamp,
						// we can add any value from 6 to 9 to the currentSlotTimestamp
						blockWithGreaterTimestamp = createBlock([], slots.getSlotTime(slot) + 7, keypair, dummyBlock);
						library.modules.blocks.process.onReceiveBlock(blockWithGreaterTimestamp);
					});
				});

				it('should reject received block', function (done) {
					getBlocks(function (err, blockIds) {
						expect(err).to.not.exist;
						expect(blockIds).to.have.length(10);
						expect(blockIds).to.not.include(blockWithGreaterTimestamp.id);
						expect(blockIds).to.include.members([lastBlock.id, secondLastBlock.id]);
						return verifyForkStat(blockWithGreaterTimestamp.id, 1).then(done);
					});
				});
			});

			describe('when received block timestamp is lower than previous block', function () {

				var blockWithLowerTimestamp;
				var slot;
				var keypair;

				beforeEach(function () {
					slot = slots.getSlotNumber(lastBlock.timestamp);
					return getValidKeypairForSlot(slot).then(function (kp) {
						keypair = kp;
						var dummyBlock = {
							id: '0',
							height: lastBlock.height
						};
						blockWithLowerTimestamp = createBlock([], slots.getSlotTime(slot), keypair, dummyBlock);
						library.modules.blocks.process.onReceiveBlock(blockWithLowerTimestamp);
					});
				});

				it('should reject received block and delete last two blocks', function (done) {
					getBlocks(function (err, blockIds) {
						expect(err).to.not.exist;
						expect(blockIds).to.not.include.members([lastBlock.id, secondLastBlock.id, blockWithLowerTimestamp.id]);
						return verifyForkStat(blockWithLowerTimestamp.id, 1).then(done);
					});
				});
			});

			describe('when block height is mutated', function () {

				var mutatedHeight;

				beforeEach(function () {
					mutatedHeight = lastBlock.height + 1;
				});

				describe('when received block is from previous round (101 blocks back)', function () {

					var blockFromPreviousRound;

					beforeEach(function () {
						blockFromPreviousRound = forgedBlocks[forgedBlocks.length - constants.activeDelegates];
						blockFromPreviousRound.height = mutatedHeight;
						library.modules.blocks.process.onReceiveBlock(blockFromPreviousRound);
					});

					it('should reject received block', function (done) {
						getBlocks(function (err, blockIds) {
							expect(err).to.not.exist;
							expect(blockIds).to.not.include(blockFromPreviousRound.id);
							expect(blockIds).to.include.members([lastBlock.id, secondLastBlock.id]);
							return verifyForkStat(blockFromPreviousRound.id, 1).then(done);
						});
					});
				});

				describe('when received block is from same round and ' + (constants.blockSlotWindow - 1) + ' slots in the past', function () {

					var inSlotsWindowBlock;

					beforeEach(function () {
						inSlotsWindowBlock = forgedBlocks[forgedBlocks.length - (constants.blockSlotWindow - 1)];
						inSlotsWindowBlock.height = mutatedHeight;
						library.modules.blocks.process.onReceiveBlock(inSlotsWindowBlock);
					});

					it('should reject received block', function (done) {
						getBlocks(function (err, blockIds) {
							expect(err).to.not.exist;
							// expect(blockIds).to.not.include(inSlotsWindowBlock.id);
							expect(blockIds).to.include.members([lastBlock.id, secondLastBlock.id]);
							return verifyForkStat(inSlotsWindowBlock.id, 1).then(done);
						});
					});
				});

				describe('when received block is from same round and greater than ' + constants.blockSlotWindow + ' slots in the past', function () {

					var outOfSlotWindowBlock;

					beforeEach(function () {
						outOfSlotWindowBlock = forgedBlocks[forgedBlocks.length - (constants.blockSlotWindow + 2)];
						outOfSlotWindowBlock.height = mutatedHeight;
						library.modules.blocks.process.onReceiveBlock(outOfSlotWindowBlock);
					});

					it('should reject received block', function (done) {
						getBlocks(function (err, blockIds) {
							expect(err).to.not.exist;
							// expect(blockIds).to.not.include(outOfSlotWindowBlock.id);
							expect(blockIds).to.include.members([lastBlock.id, secondLastBlock.id]);
							return verifyForkStat(outOfSlotWindowBlock.id, 1).then(done);
						});
					});
				});

				describe('when received block is from a future slot', function () {

					var blockFromFutureSlot;

					beforeEach(function () {
						var slot = slots.getSlotNumber() + 1;
						return getValidKeypairForSlot(slot).then(function (keypair) {
							var dummyBlock = {
								id: '0',
								height: mutatedHeight - 1
							};
							blockFromFutureSlot = createBlock([], slots.getSlotTime(slot), keypair, dummyBlock);
							library.modules.blocks.process.onReceiveBlock(blockFromFutureSlot);
						});
					});

					it('should reject received block', function (done) {
						getBlocks(function (err, blockIds) {
							expect(err).to.not.exist;
							expect(blockIds).to.not.include(blockFromFutureSlot.id);
							expect(blockIds).to.include.members([lastBlock.id, secondLastBlock.id]);
							return verifyForkStat(blockFromFutureSlot.id, 1).then(done);
						});
					});
				});
			});
		});

		describe('forkFive', function () {

			describe('with 5 blocks forged', function () {

				var secondLastBlock;
				var lastBlock;
				var slot;
				var keypair;

				beforeEach(function (done) {
					forgeMultipleBlocks(5, function (err, forgedBlocks) {
						expect(err).to.not.exist;

						secondLastBlock = forgedBlocks[forgedBlocks.length - 2];
						lastBlock = forgedBlocks[forgedBlocks.length - 1];

						slot = slots.getSlotNumber(lastBlock.timestamp);
						return getValidKeypairForSlot(slot).then(function (kp) {
							keypair = kp;
							done();
						});
					});
				});

				describe('when timestamp is greater than last block', function () {

					var timestamp;

					beforeEach(function () {
						timestamp = lastBlock.timestamp + 1;
					});

					it('should reject received block', function (done) {
						var blockWithGreaterTimestamp = createBlock([], timestamp, keypair, secondLastBlock);
						library.modules.blocks.process.onReceiveBlock(blockWithGreaterTimestamp);
						getBlocks(function (err, blockIds) {
							expect(err).to.not.exist;
							expect(blockIds).to.have.length(6);
							expect(blockIds).to.not.include(blockWithGreaterTimestamp.id);
							expect(blockIds).to.include.members([lastBlock.id, secondLastBlock.id]);
							return verifyForkStat(blockWithGreaterTimestamp.id, 5).then(done);
						});
					});

					describe('when delegate slot is invalid', function () {

						beforeEach(function () {
							keypair = getKeypair(_.find(genesisDelegates, function (value) {
								return value.publicKey != lastBlock.generatorPublicKey;
							}).publicKey);
						});

						it('should reject received block', function (done) {
							var blockWithGreaterTimestamp = createBlock([], timestamp, keypair, secondLastBlock);
							library.modules.blocks.process.onReceiveBlock(blockWithGreaterTimestamp);
							getBlocks(function (err, blockIds) {
								expect(err).to.not.exist;
								expect(blockIds).to.not.include(blockWithGreaterTimestamp.id);
								expect(blockIds).to.include.members([lastBlock.id, secondLastBlock.id]);
								return verifyForkStat(blockWithGreaterTimestamp.id, 5).then(done);
							});
						});
					});
				});

				describe('when timestamp is lower than last block', function () {

					var timestamp;

					beforeEach(function () {
						timestamp = lastBlock.timestamp - 1;
					});

					describe('when block slot is invalid', function () {

						beforeEach(function () {
							slot = slots.getSlotNumber(lastBlock.timestamp) + 1;
							return getValidKeypairForSlot(slot).then(function (kp) {
								keypair = kp;
							});
						});

						it('should reject received block when blockslot is invalid', function (done) {
							var blockWithInvalidSlot = createBlock([], timestamp, keypair, secondLastBlock);
							library.modules.blocks.process.onReceiveBlock(blockWithInvalidSlot);
							getBlocks(function (err, blockIds) {
								expect(err).to.not.exist;
								expect(blockIds).to.have.length(6);
								expect(blockIds).to.not.include(blockWithInvalidSlot.id);
								expect(blockIds).to.include.members([secondLastBlock.id, lastBlock.id]);
								return verifyForkStat(blockWithInvalidSlot.id, 5).then(done);
							});
						});
					});

					describe('when blockslot and generator publicKey is valid', function () {

						it('should replace last block with received block', function (done) {
							var blockWithLowerTimestamp = createBlock([], timestamp, keypair, secondLastBlock);
							library.modules.blocks.process.onReceiveBlock(blockWithLowerTimestamp);
							getBlocks(function (err, blockIds) {
								expect(err).to.not.exist;
								expect(blockIds).to.have.length(6);
								expect(blockIds).to.not.include(lastBlock.id);
								expect(blockIds).to.include.members([blockWithLowerTimestamp.id, secondLastBlock.id]);
								return verifyForkStat(blockWithLowerTimestamp.id, 5).then(done);
							});
						});
					});

					describe('when generator publicKey and timestamp is different', function () {

						describe('when timestamp is inside slot window', function () {

							beforeEach(function () {
								// Slot and generatorPublicKey belongs to delegate who forged second last block
								slot = slots.getSlotNumber(secondLastBlock.timestamp);
								timestamp = slots.getSlotTime(slot);
								keypair = getKeypair(_.find(genesisDelegates, function (delegate) {
									return delegate.publicKey === secondLastBlock.generatorPublicKey;
								}).secret);
							});

							it('should reject received block and delete last block', function (done) {
								var blockWithDifferentKeyAndTimestamp = createBlock([], timestamp, keypair, secondLastBlock);
								library.modules.blocks.process.onReceiveBlock(blockWithDifferentKeyAndTimestamp);
								getBlocks(function (err, blockIds) {
									expect(err).to.not.exist;
									expect(blockIds).to.have.length(5);
									expect(blockIds).to.include.members([secondLastBlock.id]);
									expect(blockIds).to.not.include.members([blockWithDifferentKeyAndTimestamp.id, lastBlock.id]);
									return verifyForkStat(blockWithDifferentKeyAndTimestamp.id, 5).then(done);
								});
							});
						});

						describe('when timestamp is outside slot window', function () {

							var timestamp;

							beforeEach(function () {
								// Slot and generatorPublicKey belongs to delegate who is 6 slots behind current slot
								slot = slots.getSlotNumber() - (constants.blockSlotWindow + 1);
								timestamp = slots.getSlotTime(slot);
								return getValidKeypairForSlot(slot).then(function (kp) {
									keypair = kp;
								});
							});

							it('should reject received block when blockslot outside window', function (done) {
								var blockWithDifferentKeyAndTimestamp = createBlock([], timestamp, keypair, secondLastBlock);
								library.modules.blocks.process.onReceiveBlock(blockWithDifferentKeyAndTimestamp);
								getBlocks(function (err, blockIds) {
									expect(err).to.not.exist;
									expect(blockIds).to.have.length(6);
									expect(blockIds).to.not.include(blockWithDifferentKeyAndTimestamp.id);
									expect(blockIds).to.include.members([secondLastBlock.id, lastBlock.id]);
									return verifyForkStat(blockWithDifferentKeyAndTimestamp.id, 5).then(done);
								});
							});
						});
					});
				});

				describe('when last block skipped a slot', function () {

					var nextSlotBlock;
					var nextSlotKeypair;

					beforeEach(function (done) {
						Promise.all([getValidKeypairForSlot(slot + 1), getValidKeypairForSlot(slot + 2)]).then(function (keypairs) {
							keypair = keypairs[0];
							nextSlotKeypair = keypairs[1];
							nextSlotBlock = createBlock([], slots.getSlotTime(slot + 2), nextSlotKeypair, lastBlock);

							function sendSkippedSlotBlock () {
								library.modules.blocks.process.onReceiveBlock(nextSlotBlock);
								done();
							}

							(function waitUntilSkippedSlotBlockIsValid () {
								if (slots.getSlotNumber() < slot + 2) {
									node.debug('Waiting for slot: ' + (slot + 2) + ', current slot: ' + slots.getSlotNumber());
									setTimeout(waitUntilSkippedSlotBlockIsValid, 1000);
								} else {
									sendSkippedSlotBlock();
								}
							})();
						});
					});

					it('should delete skipped block and save received block (with lower slot)', function (done) {
						var blockWithUnskippedSlot = createBlock([], slots.getSlotTime(slot + 1), keypair, lastBlock);
						library.modules.blocks.process.onReceiveBlock(blockWithUnskippedSlot);
						getBlocks(function (err, blockIds) {
							expect(err).to.not.exist;
							expect(blockIds).to.have.length(7);
							expect(blockIds).to.not.include(nextSlotBlock.id);
							expect(blockIds).to.include.members([blockWithUnskippedSlot.id, lastBlock.id, secondLastBlock.id]);
							return verifyForkStat(blockWithUnskippedSlot.id, 5).then(done);
						});
					});
				});
			});

			describe('with 100 blocks forged', function () {

				var secondLastBlock;
				var lastBlock;
				var keypair;
				var slot;

				beforeEach(function (done) {
					forgeMultipleBlocks(100, function (err, forgedBlocks) {
						secondLastBlock = forgedBlocks[forgedBlocks.length - 2];
						lastBlock = forgedBlocks[forgedBlocks.length - 1];
						slot = slots.getSlotNumber(lastBlock.timestamp);
						keypair = getKeypair(_.find(genesisDelegates, function (delegate) {
							return lastBlock.generatorPublicKey == delegate.publicKey;
						}).secret);
						done();
					});
				});

				describe('after new round', function () {

					var blockFromPreviousRound;

					beforeEach(function () {
						blockFromPreviousRound = createBlock([], slots.getSlotTime(slot), keypair, secondLastBlock);
					});

					it('should delete last block and save received block (from previous round)', function (done) {
						library.modules.blocks.process.onReceiveBlock(blockFromPreviousRound);
						getBlocks(function (err, blockIds) {
							expect(err).to.not.exist;
							expect(blockIds).to.have.length(10);
							expect(blockIds).to.not.include(lastBlock.id);
							expect(blockIds).to.include.members([secondLastBlock.id, blockFromPreviousRound.id]);
							return verifyForkStat(blockFromPreviousRound.id, 5).then(done);
						});
					});
				});
			});
		});

		describe('discard blocks', function () {

			describe('when block is already processed', function () {

				var lastBlock;
				var block;

				beforeEach(function (done) {
					lastBlock = library.modules.blocks.lastBlock.get();
					forge(null, function (err, forgedBlock) {
						block = forgedBlock;
						done();
					});
				});

				it('should reject received block', function (done) {
					library.modules.blocks.process.onReceiveBlock(block);
					getBlocks(function (err, blockIds) {
						expect(err).to.not.exist;
						expect(blockIds).to.have.length(2);
						expect(blockIds).to.include.members([block.id, lastBlock.id]);
						done();
					});
				});
			});

			describe('when block does not match blockchain', function () {

				var differentChainBlock;

				beforeEach(function () {
					var dummyLastBlock = {
						height: 11,
						id: '14723131253653198332'
					};

					var keypair = getKeypair(genesisDelegates[0].secret);
					differentChainBlock = createBlock([], slots.getSlotTime(10), keypair, dummyLastBlock);
				});

				it('should reject received block', function (done) {
					library.modules.blocks.process.onReceiveBlock(differentChainBlock);
					getBlocks(function (err, blockIds) {
						expect(err).to.not.exist;
						expect(blockIds).to.have.length(1);
						expect(blockIds).to.not.include(differentChainBlock.id);
						expect(blockIds).to.include.members([genesisBlock.id]);
						done();
					});
				});
			});
		});
	});
});
