'use strict';

var async = require('async');
var BlockReward = require('../../logic/blockReward.js');
var constants = require('../../helpers/constants.js');
var crypto = require('crypto');
var slots = require('../../helpers/slots.js');
var sql = require('../../sql/blocks.js');
var exceptions = require('../../helpers/exceptions.js');
var bson = require('../../helpers/bson.js');

var modules, library, self, __private = {};
var forks = [];

__private.blockReward = new BlockReward();

function Verify (logger, block, transaction, db) {
	library = {
		logger: logger,
		db: db,
		logic: {
			block: block,
			transaction: transaction,
		},
	};
	self = this;

	library.logger.trace('Blocks->Verify: Submodule initialized.');
	return self;
}

/**
 * Check transaction - perform transaction validation when processing block
 * //FIXME: Some check can be redundant probably, see: logic.transactionPool
 *
 * @private
 * @async
 * @method checkTransaction
 * @param  {Object}   block Block object
 * @param  {Object}   transaction Transaction object
 * @param  {Function} cb Callback function
 * @return {Function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 */
__private.checkTransaction = function (block, transaction, cb) {
	async.waterfall([
		function (waterCb) {
			try {
				// Calculate transaction ID
				// FIXME: Can have poor performance, because of hash cancluation
				transaction.id = library.logic.transaction.getId(transaction);
			} catch (e) {
				return setImmediate(waterCb, e.toString());
			}
			// Apply block ID to transaction
			transaction.blockId = block.id;
			return setImmediate(waterCb);
		},
		function (waterCb) {
			// Check if transaction is already in database, otherwise fork 2.
			// DATABASE: read only
			library.logic.transaction.checkConfirmed(transaction, function (err) {
				if (err) {
					// Fork: Transaction already confirmed.
					modules.delegates.fork(block, 2);
					modules.blocks.verify.forks.add(block.id);
					
					// Undo the offending transaction.
					// DATABASE: write
					modules.transactions.undoUnconfirmed(transaction, function (err2) {
						modules.transactions.removeUnconfirmedTransaction(transaction.id);
						return setImmediate(waterCb, err2 || err);
					});
				} else {
					return setImmediate(waterCb);
				}
			});
		},
		function (waterCb) {
			// Get account from database if any (otherwise cold wallet).
			// DATABASE: read only
			modules.accounts.getAccount({publicKey: transaction.senderPublicKey}, waterCb);
		},
		function (sender, waterCb) {
			// Check if transaction id valid against database state (mem_* tables).
			// DATABASE: read only
			library.logic.transaction.verify(transaction, sender, waterCb);
		}
	], function (err) {
		return setImmediate(cb, err);
	});
};

/**
 * Adds default properties to block.
 * @param {Object} block Block object reduced
 * @return {Object} Block object completed
 */
Verify.prototype.addBlockProperties = function (block) {
	if (block.version === undefined) {
		block.version = 0;
	}
	if (block.numberOfTransactions === undefined) {
		if (block.transactions === undefined) {
			block.numberOfTransactions = 0;
		} else {
			block.numberOfTransactions = block.transactions.length;
		}
	}
	if (block.totalAmount === undefined) {
		block.totalAmount = 0;
	}
	if (block.totalFee === undefined) {
		block.totalFee = 0;
	}
	if (block.payloadLength === undefined) {
		block.payloadLength = 0;
	}
	if (block.reward === undefined) {
		block.reward = 0;
	}
	if (block.transactions === undefined) {
		block.transactions = [];
	}
	return block;
};

/**
 * Deletes default properties from block.
 * @param {Object} block Block object completed
 * @return {Object} Block object reduced
 */
Verify.prototype.deleteBlockProperties = function (block) {
	var reducedBlock = JSON.parse(JSON.stringify(block));
	if (reducedBlock.version === 0) {
		delete reducedBlock.version;
	}
	// verifyBlock ensures numberOfTransactions is transactions.length
	if (typeof(reducedBlock.numberOfTransactions) === 'number') {
		delete reducedBlock.numberOfTransactions;
	}
	if (reducedBlock.totalAmount === 0) {
		delete reducedBlock.totalAmount;
	}
	if (reducedBlock.totalFee === 0) {
		delete reducedBlock.totalFee;
	}
	if (reducedBlock.payloadLength === 0) {
		delete reducedBlock.payloadLength;
	}
	if (reducedBlock.reward === 0) {
		delete reducedBlock.reward;
	}
	if (reducedBlock.transactions && reducedBlock.transactions.length === 0) {
		delete reducedBlock.transactions;
	}
	return reducedBlock;
};

/**
 * Verify block and return all possible errors related to block
 * @public
 * @method verifyBlock
 * @param  {Object}  block Full block
 * @param  {Function} cb Callback function
 * @return {String}  error string | null
 */
Verify.prototype.verifyBlock = function (block, cb) {
	var lastBlock = modules.blocks.lastBlock.get();
	
	// Calculate expected block slot
	var blockSlotNumber = slots.getSlotNumber(block.timestamp);
	var lastBlockSlotNumber = slots.getSlotNumber(lastBlock.timestamp);

	// Set block height
	block.height = lastBlock.height + 1;
	
	async.series([
		function baseValidations (seriesCb) {
			var error = null;

			async.parallel({
				version: function (parallelCb) {
					if (block.version > 0) {
						error = 'Invalid block version';
					}
					return setImmediate(parallelCb, error);
				},
				timestamp: function (parallelCb) {
					if (blockSlotNumber > slots.getSlotNumber() || blockSlotNumber <= lastBlockSlotNumber) {
						error = 'Invalid block timestamp';
					}
					return setImmediate(parallelCb, error);
				},
				previousBlock: function (parallelCb) {
					if (!block.previousBlock && block.height !== 1) {
						error = 'Invalid previous block';
					} else if (block.previousBlock !== lastBlock.id) {
						// Fork: Same height but different previous block id.
						modules.delegates.fork(block, 1);
						error = ['Invalid previous block:', block.previousBlock, 'expected:', lastBlock.id].join(' ');
					}
					return setImmediate(parallelCb, error);
				},
				payloadLength: function (parallelCb) {
					if (block.payloadLength > constants.maxPayloadLength) {
						error = 'Payload length is too long';
					}
					return setImmediate(parallelCb, error);
				},
				numberOfTransactions: function (parallelCb) {
					if (block.transactions.length !== block.numberOfTransactions) {
						error = 'Included transactions do not match block transactions count';
					}
					return setImmediate(parallelCb, error);
				},
				maxTxsPerBlock: function (parallelCb) {
					if (block.transactions.length > constants.maxTxsPerBlock) {
						error = 'Number of transactions exceeds maximum per block';
					}
					return setImmediate(parallelCb, error);
				}
			}, function (err, results) {
				seriesCb(err);
			});
	  },
		function advancedValidations (seriesCb) {
			async.parallel({
				transactions: function (parallelCb) {
					// Check if transactions within block add up to the correct amounts
					var totalAmount = 0,
						totalFee = 0,
						payloadHash = crypto.createHash('sha256'),
						appliedTransactions = {};

					for (var i in block.transactions) {
						var transaction = block.transactions[i];
						var bytes;

						try {
							bytes = library.logic.transaction.getBytes(transaction);
						} catch (e) {
							return setImmediate(parallelCb, e.toString());
						}

						if (appliedTransactions[transaction.id]) {
							return setImmediate(parallelCb, 'Encountered duplicate transaction: ' + transaction.id);
						}

						appliedTransactions[transaction.id] = transaction;
						if (bytes) { payloadHash.update(bytes); }
						totalAmount += transaction.amount;
						totalFee += transaction.fee;
					}

					if (payloadHash.digest().toString('hex') !== block.payloadHash) {
						return setImmediate(parallelCb, 'Invalid payload hash');
					}

					if (totalAmount !== block.totalAmount) {
						return setImmediate(parallelCb, 'Invalid total amount');
					}

					if (totalFee !== block.totalFee) {
						return setImmediate(parallelCb, 'Invalid total fee');
					}

					return setImmediate(parallelCb);
				},
				signature: function (parallelCb) {
					var valid;
					
					try {
						valid = library.logic.block.verifySignature(block);
					} catch (e) {
						return setImmediate(parallelCb, e.toString());
					}
					if (!valid) {
						return setImmediate(parallelCb, 'Failed to verify block signature');
					}

					return setImmediate(parallelCb);
				}
			}, function (err, results) {
				seriesCb(err);
			});
		},
		function setBlockId (seriesCb) {
			try {
				block.id = library.logic.block.getId(block);
			} catch (e) {
				return setImmediate(seriesCb, e.toString());
			}

			return setImmediate(seriesCb);
		},
		function expectedReward (seriesCb) {
			// Calculate expected rewards
			var expectedReward = __private.blockReward.calcReward(block.height);

			if (block.height !== 1 && expectedReward !== block.reward && exceptions.blockRewards.indexOf(block.id) === -1) {
				return setImmediate(seriesCb, ['Invalid block reward:', block.reward, 'expected:', expectedReward].join(' '));
			}

			return setImmediate(seriesCb);
		}
	], function (err, results) {
		return setImmediate(cb, err);
	});
};

/**
 * Main function to process a block
 * - Verify the block looks ok
 * - Verify the block is compatible with database state (DATABASE readonly)
 * - Apply the block to database if both verifications are ok
 * 
 * @async
 * @public
 * @method processBlock
 * @param  {Object}   block Full block
 * @param  {boolean}  broadcast Indicator that block needs to be broadcasted
 * @param  {Function} cb Callback function
 * @param  {boolean}  saveBlock Indicator that block needs to be saved to database
 * @return {Function} cb Callback function from params (through setImmediate)
 * @return {Object}   cb.err Error if occurred
 */
Verify.prototype.processBlock = function (block, broadcast, cb, saveBlock) {
	if (modules.blocks.isCleaning.get()) {
		// Break processing if node shutdown reqested
		return setImmediate(cb, 'Cleaning up');
	} else if (!__private.loaded) {
		// Break processing if blockchain is not loaded
		return setImmediate(cb, 'Blockchain is loading');
	}

	async.series({
		addBlockProperties: function (seriesCb) {
			if (!broadcast) {
				try {
					// set default properties
					block = self.addBlockProperties(block);
				} catch (err) {
					return setImmediate(seriesCb, err);
				}
			}

			return setImmediate(seriesCb);
		},
		normalizeBlock: function (seriesCb) {
			try {
				block = library.logic.block.objectNormalize(block);
			} catch (err) {
				return setImmediate(seriesCb, err);
			}

			return setImmediate(seriesCb);
		},
		verifyBlock: function (seriesCb) {
			// Sanity check of the block, if values are coherent.
			// No access to database
			self.verifyBlock(block, function (err) {
				if (err) {
					library.logger.error(['Block', block.id, 'verification failed'].join(' '), err);
					return setImmediate(seriesCb, err);
				}

				return setImmediate(seriesCb);
			});
		},
		deleteBlockProperties: function (seriesCb) {
			if (broadcast) {
				try {
					// delete default properties
					var blockReduced = self.deleteBlockProperties(block);
					var serializedBlockReduced = bson.serialize(blockReduced);
					modules.blocks.chain.broadcastReducedBlock(serializedBlockReduced, block.id, broadcast);
				} catch (err) {
					return setImmediate(seriesCb, err);
				}
			}

			return setImmediate(seriesCb);
		},
		checkExists: function (seriesCb) {
			// Check if block id is already in the database (very low probability of hash collision).
			// TODO: In case of hash-collision, to me it would be a special autofork...
			// DATABASE: read only
			library.db.query(sql.getBlockId, { id: block.id }).then(function (rows) {
				if (rows.length > 0) {
					return setImmediate(seriesCb, ['Block', block.id, 'already exists'].join(' '));
				} else {
					return setImmediate(seriesCb);
				}
			});
		},
		validateBlockSlot: function (seriesCb) {
			// Check if block was generated by the right active delagate. Otherwise, fork 3.
			// DATABASE: Read only to mem_accounts to extract active delegate list
			modules.delegates.validateBlockSlot(block, function (err) {
				if (err) {
					// Fork: Delegate does not match calculated slot.
					modules.delegates.fork(block, 3);
					return setImmediate(seriesCb, err);
				} else {
					return setImmediate(seriesCb);
				}
			});
		},
		checkTransactions: function (seriesCb) {
			// Check against the mem_* tables that we can perform the transactions included in the block.
			async.eachSeries(block.transactions, function (transaction, eachSeriesCb) {
				__private.checkTransaction(block, transaction, eachSeriesCb);
			}, function (err) {
				return setImmediate(seriesCb, err);
			});
		}
	}, function (err) {
		if (err) {
			return setImmediate(cb, err);
		} else {
			// The block and the transactions are OK i.e:
			// * Block and transactions have valid values (signatures, block slots, etc...)
			// * The check against database state passed (for instance sender has enough LSK, votes are under 101, etc...)
			// We thus update the database with the transactions values, save the block and tick it.
			modules.blocks.chain.applyBlock(block, saveBlock, cb);
		}
	});
};

/**
 * In memory fork list functions: get, add
 * @property {function} get Returns blockId index
 * @property {function} add Adds new blockId to fork list and returns index
 */
Verify.prototype.forks = {
	get: function (blockId) {
		return forks.indexOf(blockId);
	},
	add: function (blockId) {
		if (forks.length > 100){
			forks.shift();
		}
		forks.push(blockId);
	}
};

/**
 * Handle modules initialization
 * - accounts
 * - blocks
 * - delegates
 * - transactions
 * @param {modules} scope Exposed modules
 */
Verify.prototype.onBind = function (scope) {
	library.logger.trace('Blocks->Verify: Shared modules bind.');
	modules = {
		accounts: scope.accounts,
		blocks: scope.blocks,
		delegates: scope.delegates,
		transactions: scope.transactions,
	};


	// Set module as loaded
	__private.loaded = true;
};

module.exports = Verify;
