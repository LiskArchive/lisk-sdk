'use strict';

var async = require('async');
var BlockReward = require('../../logic/blockReward.js');
var constants = require('../../helpers/constants.js');
var crypto = require('crypto');
var slots = require('../../helpers/slots.js');
var sql = require('../../sql/blocks.js');

var modules, library, self, __private = {};

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
 * @private
 * @param {Object} block Block object reduced
 * @return {Object} Block object completed
 */
__private.addBlockProperties = function (block) {
	if (!block.version) {
		block.version = 0;
	}
	if (!block.numberOfTransactions) {
		block.numberOfTransactions = block.length;
	}
	
	return block;
}

/**
 * Deletes default properties from block.
 * @private
 * @param {Object} block Block object completed
 * @return {Object} Block object reduced
 */
__private.deleteBlockProperties = function (block) {
	var reducedBlock = JSON.parse(JSON.stringify(block));
	if (reducedBlock.version === 0) {
		delete reducedBlock.version;
	}
	if (reducedBlock.numberOfTransactions) {
		delete reducedBlock.numberOfTransactions;
	}
	return reducedBlock;
}

/**
 * Verify block and return all possible errors related to block
 * @public
 * @method verifyBlock
 * @param  {Object}  block Full block
 * @return {String}  error string | verified
 */
Verify.prototype.verifyBlock = function (block) {
	var lastBlock = modules.blocks.lastBlock.get();

	if (block.version > 0) {
		return 'Invalid block version';
	}

	// Calculate expected block slot
	var blockSlotNumber = slots.getSlotNumber(block.timestamp);
	var lastBlockSlotNumber = slots.getSlotNumber(lastBlock.timestamp);

	if (blockSlotNumber > slots.getSlotNumber() || blockSlotNumber <= lastBlockSlotNumber) {
		return 'Invalid block timestamp';
	}

	// Set block height
	block.height = lastBlock.height + 1;

	if (!block.previousBlock && block.height !== 1) {
		return 'Invalid previous block';
	} else if (block.previousBlock !== lastBlock.id) {
		// Fork: Same height but different previous block id.
		modules.delegates.fork(block, 1);
		return ['Invalid previous block:', block.previousBlock, 'expected:', lastBlock.id].join(' ');
	}

	if (block.payloadLength > constants.maxPayloadLength) {
		return 'Payload length is too high';
	}

	if (block.transactions.length !== block.numberOfTransactions) {
		return 'Invalid number of transactions';
	}

	if (block.transactions.length > constants.maxTxsPerBlock) {
		return 'Transactions length is too high';
	}

	// Checking if transactions of the block adds up to block values.
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
			return e.toString();
		}

		if (appliedTransactions[transaction.id]) {
			return 'Encountered duplicate transaction: ' + transaction.id;
		}

		appliedTransactions[transaction.id] = transaction;
		if (bytes) { payloadHash.update(bytes); }
		totalAmount += transaction.amount;
		totalFee += transaction.fee;
	}
	
	if (payloadHash.digest().toString('hex') !== block.payloadHash) {
		return 'Invalid payload hash';
	}

	if (totalAmount !== block.totalAmount) {
		return 'Invalid total amount';
	}

	if (totalFee !== block.totalFee) {
		return 'Invalid total fee';
	}
	
	// Calculate expected rewards
	var expectedReward = __private.blockReward.calcReward(block.height);

	if (block.height !== 1 && expectedReward !== block.reward) {
		return ['Invalid block reward:', block.reward, 'expected:', expectedReward].join(' ');
	}

	var valid;
	try {
		valid = library.logic.block.verifySignature(block);
	} catch (e) {
		return e.toString();
	}
	if (!valid) {
		return 'Failed to verify block signature';
	}

	try {
		// Get block ID
		// FIXME: Why we don't have it?
		block.id = library.logic.block.getId(block);
	} catch (e) {
		return e.toString();
	}

	return 'verified';
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
					block = __private.addBlockProperties(block);
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
		deleteBlockProperties: function (seriesCb) {
			if (broadcast) {
				try {
					// delete default properties
					var blockReduced = __private.deleteBlockProperties(block);
					modules.blocks.chain.broadcastReducedBlock(blockReduced, broadcast);
				} catch (err) {
					return setImmediate(seriesCb, err);
				}
			}

			return setImmediate(seriesCb);
		},
		verifyBlock: function (seriesCb) {
			// Sanity check of the block, if values are coherent.
			// No access to database
			var check = self.verifyBlock(block);

			if (check !== 'verified') {
				library.logger.error(['Block', block.id, 'verification failed'].join(' '), check);
				return setImmediate(seriesCb, check);
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
