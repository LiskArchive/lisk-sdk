var expect = require('chai').expect;
var async = require('async');
var sinon = require('sinon');
var crypto = require('crypto');
var _ = require('lodash');
var Promise = require('bluebird');

var node = require('../../../node');
var slots = require('../../../../helpers/slots');
var constants = require('../../../../helpers/constants');
var config = require('../../../config.json');
var modulesLoader = require('../../../common/initModule.js').modulesLoader;
var genesisBlock = require('../../../../genesisBlock.json');
var clearDatabaseTable = require('../../../common/globalBefore').clearDatabaseTable;
var genesisDelegates = require('../../../genesisDelegates.json').delegates;
var application = require('../../../common/application.js');


var encryptedSecrets = config.forging.secret;

describe('onReceiveBlock()', function () {

	var blocksProcess;
	var library;
	var originalBlockRewardsOffset;
	var db;
	var blocks;

	before(function (done) {
		application.init({sandbox: {name: 'lisk_test_blocks_process'}}, function (scope) {
			library = scope;
			db = scope.db;
			done();
		});
	});

	after(function (done) {
		node.constants.rewards.offset = originalBlockRewardsOffset;
		application.cleanup(done);
	});

	beforeEach(function (done) {
		async.every([
			'blocks where height > 1;',
			'forks_stat;',
		], function (table, cb) {
			clearDatabaseTable(db, modulesLoader.logger, table, cb);
		}, function () {
			library.modules.blocks.lastBlock.set(genesisBlock);
			done();
		});
	});

	// Helper function to handle promises for sequences in test, 
	function handle (promise, done, cb) {
		return promise.then(function (result) {
			cb();
			done();
		}).catch(function (err) {
			cb(err);
			done(err);
		});
	}

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
				// Cannot use getSlotNumber since if i use it, I will not be able to create valid blocks without delay of 10 seconds b/w them.

				var delegate = _.find(genesisDelegates, function (delegate) {
					return delegate.publicKey === delegatePublicKey;
				});

				if (!delegate) {
					debugger;
				}

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
			var delegateDetails = _.find(encryptedSecrets, function (secrets) {
				return secrets.publicKey === delegatePublicKey;
			});
			return getKeypair(_.find(genesisDelegates, function (delegate) {
				return delegate.publicKey === delegatePublicKey;
			}).secret);
		});
	}

	function getBlocks (limit) {
		limit = limit ? limit : 10;
		var query = {
			body: {
				limit: limit
			}
		};

		var getBlocksPromisified = Promise.promisify(library.modules.blocks.submodules.api.getBlocks);
		return getBlocksPromisified(query).then(function (res) {
			return res.blocks;
		});
	}

	function receiveBlock (block) {
		library.modules.blocks.process.onReceiveBlock(block);
	}

	function verifyForkStat (blockId, cause) {
		return db.one('SELECT * FROM forks_stat where "blockId" = ${blockId} AND "cause" = ${cause};', {blockId: blockId, cause: cause});
	}

	describe('onReceiveBlock (empty transactions)', function () {

		describe('for valid block', function () {

			var lastBlock;
			var block;

			beforeEach(function () {
				lastBlock = library.modules.blocks.lastBlock.get();
				var slot = slots.getSlotNumber();
				return getValidKeypairForSlot(slot).then(function (keypair) {
					block = createBlock([], slots.getSlotTime(slot), keypair, lastBlock);
				});
			});

			it('should save block in blockchain', function (done) {
				library.modules.blocks.process.onReceiveBlock(block);
				library.sequence.add(function (cb) {
					return handle(getBlocks().then(function (blocks) {
						var blockIds = _.map(blocks, 'id');
						expect(blockIds).to.have.length(2);
						expect(blockIds).to.include.members([block.id, lastBlock.id ]);
					}), done, cb);
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
						return getValidKeypairForSlot(slot).then(function () {
							var nonDelegateKeypair = getKeypair(node.gAccount.password);
							block = createBlock([], slots.getSlotTime(slot), nonDelegateKeypair, lastBlock);
						});
					});

					it('should not add block in blockchain', function (done) {
						library.modules.blocks.process.onReceiveBlock(block);
						library.sequence.add(function (cb) {
							return handle(getBlocks().then(function (blocks) {
								var blockIds = _.map(blocks, 'id');
								expect(blockIds).to.have.length(1);
								expect(blockIds).to.include.members([lastBlock.id ]);
							}), done, cb);
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
						return getValidKeypairForSlot(slot).then(function () {
							var nonDelegateKeypair = getKeypair(node.gAccount.password);
							block = createBlock([], slots.getSlotTime(slot), nonDelegateKeypair, lastBlock);
						});
					});

					it('should not add block in blockchain', function (done) {
						library.modules.blocks.process.onReceiveBlock(block);
						library.sequence.add(function (cb) {
							return handle(getBlocks().then(function (blocks) {
								var blockIds = _.map(blocks, 'id');
								expect(blockIds).to.have.length(1);
								expect(blockIds).to.include.members([lastBlock.id ]);
							}), done, cb);
						});
					});
				});
			});
		});

		describe('forkOne', function () {
			var forgedBlocks = [];
			var lastBlock;
			var block;

			beforeEach('forge 300 blocks', function (done) {
				forgeMultipleBlocks(300, function (err, blocks) {
					expect(err).to.not.exist;
					forgedBlocks = blocks;
					lastBlock = forgedBlocks[forgedBlocks.length - 2];
					block = forgedBlocks[forgedBlocks.length - 1];
					done();
				});
			});

			describe('when received block timestamp is greater than previous block', function () {

				var blockWithGreaterTimestamp;
				var slot;
				var keypair;

				beforeEach(function () {
					slot = slots.getSlotNumber(block.timestamp) + 1;
					return getValidKeypairForSlot(slot).then(function (kp) {
						keypair = kp;
						var dummyBlock = {
							id: '0',
							height: block.height
						};
						blockWithGreaterTimestamp = createBlock([], slots.getSlotTime(slot) + 7, keypair, dummyBlock);
						library.modules.blocks.process.onReceiveBlock(blockWithGreaterTimestamp);
					});
				});

				it('should reject the block with greater timestamp', function (done) {
					library.sequence.add(function (cb) {
						return handle(getBlocks().then(function (blocks) {
							var blockIds = _.map(blocks, 'id');
							expect(blockIds).to.have.length(10);
							expect(blockIds).to.include.members([block.id, lastBlock.id]);
							expect(blockIds).to.not.include(blockWithGreaterTimestamp.id);
							return verifyForkStat(blockWithGreaterTimestamp.id, 1);
						}), done, cb);
					});
				});
			});

			describe('when received block timestamp is lower than previous block', function () {

				var blockWithLowerTimestamp;
				var slot;
				var keypair;

				beforeEach(function () {
					slot = slots.getSlotNumber(block.timestamp);
					return getValidKeypairForSlot(slot).then(function (kp) {
						keypair = kp;
						var dummyBlock = {
							id: '0',
							height: block.height
						};
						blockWithLowerTimestamp = createBlock([], slots.getSlotTime(slot), keypair, dummyBlock);
						library.modules.blocks.process.onReceiveBlock(blockWithLowerTimestamp);
					});
				});

				it('should delete two blocks', function (done) {
					library.sequence.add(function (cb) {
						return handle(getBlocks().then(function (blocks) {
							var blockIds = _.map(blocks, 'id');
							expect(blockIds).to.not.include.members([block.id, lastBlock.id, blockWithLowerTimestamp.id]);
							return verifyForkStat(blockWithLowerTimestamp.id, 1);
						}), done, cb);
					});
				});
			});

			describe('with block height mutated', function () {

				var mutatedHeight;

				beforeEach(function () {
					mutatedHeight = block.height + 1;
				});

				describe('when received block is from previous round (101 blocks back)', function () {

					var blockFromPreviousRound;

					beforeEach(function () {
						blockFromPreviousRound = forgedBlocks[forgedBlocks.length - constants.activeDelegates];
						blockFromPreviousRound.height = mutatedHeight;
						library.modules.blocks.process.onReceiveBlock(blockFromPreviousRound);
					});

					it('should reject the received block', function (done) {
						library.sequence.add(function (cb) {
							return handle(getBlocks().then(function (blocks) {
								var blockIds = _.map(blocks, 'id');
								expect(blockIds).to.include.members([block.id, lastBlock.id]);
								return verifyForkStat(blockFromPreviousRound.id, 1);
							}), done, cb);
						});
					});
				});

				describe('when received block is from the same round and 3 slots in the past', function () {
					var threeSlotsOldBlock;

					beforeEach(function () {
						threeSlotsOldBlock = forgedBlocks[forgedBlocks.length - 2];
						threeSlotsOldBlock.height = mutatedHeight;
						library.modules.blocks.process.onReceiveBlock(threeSlotsOldBlock);
					});

					it('should reject the received block', function (done) {
						library.sequence.add(function (cb) {
							return handle(getBlocks().then(function (blocks) {
								var blockIds = _.map(blocks, 'id');
								expect(blockIds).to.include.members([block.id, lastBlock.id]);
								return verifyForkStat(threeSlotsOldBlock.id, 1);
							}), done, cb);
						});
					});
				});

				describe('when received block is from the same round but more than 5 slots in the past', function () {

					var sixSlotsOldBlock;

					beforeEach(function () {
						sixSlotsOldBlock = forgedBlocks[forgedBlocks.length - 6];
						sixSlotsOldBlock.height = mutatedHeight;
						library.modules.blocks.process.onReceiveBlock(sixSlotsOldBlock);
					});

					it('should reject the received block', function (done) {
						library.sequence.add(function (cb) {
							return handle(getBlocks().then(function (blocks) {
								var blockIds = _.map(blocks, 'id');
								expect(blockIds).to.include.members([block.id, lastBlock.id]);
								return verifyForkStat(sixSlotsOldBlock.id, 1);
							}), done, cb);
						});
					});
				});

				describe('when receivedBlock is from the future slot', function () {

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

					it('should reject the received block', function (done) {
						library.sequence.add(function (cb) {
							return handle(getBlocks().then(function (blocks) {
								var blockIds = _.map(blocks, 'id');
								expect(blockIds).to.include.members([block.id, lastBlock.id]);
								return verifyForkStat(blockFromFutureSlot.id, 1);
							}), done, cb);
						});
					});
				});
			});
		});

		describe('forkFive', function () {

			describe('with 5 blocks forged', function () {

				var lastBlock;
				var block;
				var slot;
				var keypair;

				beforeEach(function (done) {
					forgeMultipleBlocks(5, function (err, forgedBlocks) {
						expect(err).to.not.exist;

						lastBlock = forgedBlocks[forgedBlocks.length - 2];
						block = forgedBlocks[forgedBlocks.length - 1];

						slot = slots.getSlotNumber(block.timestamp);
						return getValidKeypairForSlot(slot).then(function (kp) {
							keypair = kp;
							done();
						});
					});
				});

				describe('when timestamp is greater than saved block', function () {

					var timestamp;

					beforeEach(function () {
						timestamp = block.timestamp + 1;
					});

					it('should reject the block', function (done) {
						var blockWithGreaterTimestamp = createBlock([], timestamp, keypair, lastBlock);
						library.modules.blocks.process.onReceiveBlock(blockWithGreaterTimestamp);
						library.sequence.add(function (cb) {
							return handle(getBlocks().then(function (blocks) {
								var blockIds = _.map(blocks, 'id');
								expect(blockIds).to.have.length(6);
								expect(blockIds).to.include.members([block.id, lastBlock.id ]);
								expect(blockIds).to.not.include(blockWithGreaterTimestamp.id);
								return verifyForkStat(blockWithGreaterTimestamp.id, 5);
							}), done, cb);
						});
					});

					describe('and when delegate slot is invalid', function () {

						beforeEach(function () {
							keypair = getKeypair(_.find(genesisDelegates, function (value) {
								return value.publicKey != block.generatorPublicKey;
							}).publicKey);
						});

						it('should reject the block', function (done) {
							var blockWithGreaterTimestamp = createBlock([], timestamp, keypair, lastBlock);
							library.modules.blocks.process.onReceiveBlock(blockWithGreaterTimestamp);
							library.sequence.add(function (cb) {
								handle(getBlocks().then(function (blocks) {
									var blockIds = _.map(blocks, 'id');
									expect(blockIds).to.include.members([block.id, lastBlock.id]);
									expect(blockIds).to.not.include(blockWithGreaterTimestamp.id);
									return verifyForkStat(blockWithGreaterTimestamp.id, 5);
								}), done, cb);
							});
						});
					});
				});

				describe('when timestamp is lower than saved block', function () {

					var timestamp;

					beforeEach(function () {
						timestamp = block.timestamp - 1;
					});

					describe('and when block slot is invalid', function () {

						beforeEach(function () {
							slot = slots.getSlotNumber(block.timestamp) + 1;
							return getValidKeypairForSlot(slot).then(function (kp) {
								keypair = kp;
							});
						});

						it('should reject block when blockslot is not valid', function (done) {
							var blockWithInvalidSlot = createBlock([], timestamp, keypair, lastBlock);
							library.modules.blocks.process.onReceiveBlock(blockWithInvalidSlot);
							library.sequence.add(function (cb) {
								handle(getBlocks().then(function (blocks) {
									var blockIds = _.map(blocks, 'id');
									expect(blockIds).to.have.length(6);
									expect(blockIds).to.include.members([lastBlock.id, block.id ]);
									expect(blockIds).to.not.include(blockWithInvalidSlot.id);
									return verifyForkStat(blockWithInvalidSlot.id, 5);
								}), done, cb);
							});
						});
					});

					describe('when blockslot and generator publicKey is valid', function () {

						it('should replace existing block in chain with current block', function (done) {
							var blockWithLowerTimestamp = createBlock([], timestamp, keypair, lastBlock);
							library.modules.blocks.process.onReceiveBlock(blockWithLowerTimestamp);
							library.sequence.add(function (cb) {
								handle(getBlocks().then(function (blocks) {
									var blockIds = _.map(blocks, 'id');
									expect(blockIds).to.have.length(6);
									expect(blockIds).to.include.members([blockWithLowerTimestamp.id, lastBlock.id ]);
									expect(blockIds).to.not.include(block.id);
									return verifyForkStat(blockWithLowerTimestamp.id, 5);
								}), done, cb);
							});
						});
					});

					describe('when generator publicKey and timestamp is different', function () {

						describe('when timestamp is inside the slot window', function () {

							beforeEach(function () {
								// slot and generatorKey is the equal to the delegate who forged the second last block
								slot = slots.getSlotNumber(lastBlock.timestamp);
								timestamp = slots.getSlotTime(slot);
								keypair = getKeypair(_.find(genesisDelegates, function (delegate) {
									return delegate.publicKey === lastBlock.generatorPublicKey;
								}).secret);
							});

							it('should delete the block', function (done) {
								var blockWithDifferentKeyAndTimestamp = createBlock([], timestamp, keypair, lastBlock);
								library.modules.blocks.process.onReceiveBlock(blockWithDifferentKeyAndTimestamp);
								library.sequence.add(function (cb) {
									handle(getBlocks().then(function (blocks) {
										var blockIds = _.map(blocks, 'id');
										expect(blockIds).to.have.length(5);
										expect(blockIds).to.include.members([lastBlock.id]);
										expect(blockIds).to.not.include.members([blockWithDifferentKeyAndTimestamp.id, block.id]);
										return verifyForkStat(blockWithDifferentKeyAndTimestamp.id, 5);
									}), done, cb);
								});
							});
						});

						describe('when timestamp is outside the slot window', function () {

							var timestamp;
							beforeEach(function () {
								// slot and generatorKey is of the delegate who was 6 slots behind current slot
								slot = slots.getSlotNumber() - 6;
								timestamp = slots.getSlotTime(slot);
								return getValidKeypairForSlot(slot).then(function (kp) {
									keypair = kp;
								});
							});

							it('should reject block when blockslot outside the window', function (done) {
								var blockWithDifferentKeyAndTimestamp = createBlock([], timestamp, keypair, lastBlock);
								library.modules.blocks.process.onReceiveBlock(blockWithDifferentKeyAndTimestamp);
								library.sequence.add(function (cb) {
									handle(getBlocks().then(function (blocks) {
										var blockIds = _.map(blocks, 'id');
										expect(blockIds).to.have.length(6);
										expect(blockIds).to.include.members([lastBlock.id, block.id]);
										expect(blockIds).to.not.include(blockWithDifferentKeyAndTimestamp.id);
										return verifyForkStat(blockWithDifferentKeyAndTimestamp.id, 5);
									}), done, cb);
								});
							});
						});
					});
				});

				describe('when block in chain skipped a slot', function () {

					var nextSlotBlock;
					var nextSlotKeypair;

					beforeEach(function (done) {
						Promise.all([getValidKeypairForSlot(slot + 1), getValidKeypairForSlot(slot + 2)]).then(function (keypairs) {
							keypair = keypairs[0];
							nextSlotKeypair = keypairs[1];
							nextSlotBlock = createBlock([], slots.getSlotTime(slot + 2), nextSlotKeypair, block);

							function sendSkippedSlotBlock () {
								library.modules.blocks.process.onReceiveBlock(nextSlotBlock);
								done();
							}

							(function waitUntilSkippedSlotBlockIsValid () {
								if (slots.getSlotNumber() < slot + 2) {
									console.log('waiting for the slot: ' + (slot + 2) + ', current slot: ' + slots.getSlotNumber());
									setTimeout(waitUntilSkippedSlotBlockIsValid, 1000);
								} else {
									sendSkippedSlotBlock();
								}
							})();
						});
					});

					it('should delete last block and save received block (with lower slot)', function (done) {
						var blockWithUnskippedSlot = createBlock([], slots.getSlotTime(slot + 1), keypair, block);
						library.modules.blocks.process.onReceiveBlock(blockWithUnskippedSlot);
						library.sequence.add(function (cb) {
							handle(getBlocks().then(function (blocks) {
								var blockIds = _.map(blocks, 'id');
								expect(blockIds).to.have.length(7);
								expect(blockIds).to.include.members([blockWithUnskippedSlot.id, block.id, lastBlock.id]);
								expect(blockIds).to.not.include(nextSlotBlock.id);
								return verifyForkStat(blockWithUnskippedSlot.id, 5);
							}), done, cb);
						});
					});
				});
			});

			describe('with 100 blocks forged', function () {

				var lastBlock;
				var block;
				var keypair;
				var slot;

				beforeEach(function (done) {
					forgeMultipleBlocks(100, function (err, forgedBlocks) {
						lastBlock = forgedBlocks[forgedBlocks.length - 2];
						block = forgedBlocks[forgedBlocks.length - 1];
						slot = slots.getSlotNumber(block.timestamp);
						keypair = getKeypair(_.find(genesisDelegates, function (delegate) {
							return block.generatorPublicKey == delegate.publicKey;
						}).secret);
						done();
					});
				});

				describe('after new round', function () {

					var blockFromPreviousRound;

					beforeEach(function () {
						blockFromPreviousRound = createBlock([], slots.getSlotTime(slot), keypair, lastBlock);
					});

					it('should verify received block against last round delegate list and save', function (done) {
						library.modules.blocks.process.onReceiveBlock(blockFromPreviousRound);
						library.sequence.add(function (cb) {
							handle(getBlocks().then(function (blocks) {
								var blockIds = _.map(blocks, 'id');
								expect(blockIds).to.have.length(10);
								expect(blockIds).to.include.members([lastBlock.id, blockFromPreviousRound.id]);
								expect(blockIds).to.not.include(block.id);
								return verifyForkStat(blockFromPreviousRound.id, 5);
							}), done, cb);
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

				it('should reject the incoming block', function (done) {
					library.modules.blocks.process.onReceiveBlock(block);
					library.sequence.add(function (cb) {
						return handle(getBlocks().then(function (blocks) {
							var blockIds = _.map(blocks, 'id');
							expect(blockIds).to.have.length(2);
							expect(blockIds).to.include.members([block.id, lastBlock.id]);
						}), done, cb);
					});
				});
			});

			describe('when block does not match current chain', function (done) {

				var differentChainBlock;

				beforeEach(function () {
					var dummyLastBlock = {
						height: 11,
						id: '14723131253653198332'
					};

					var keypair = getKeypair(genesisDelegates[0].secret);
					differentChainBlock = createBlock([], slots.getSlotTime(10), keypair, dummyLastBlock);
				});

				it('should reject the incoming block', function (done) {
					library.modules.blocks.process.onReceiveBlock(differentChainBlock);
					library.sequence.add(function (cb) {

						return handle(getBlocks().then(function (blocks) {
							var blockIds = _.map(blocks, 'id');
							expect(blockIds).to.have.length(1);
							expect(blockIds).to.include.members([genesisBlock.id]);
							expect(blockIds).to.not.include(differentChainBlock.id);
						}), done, cb);
					});
				});
			});
		});
	});
});
