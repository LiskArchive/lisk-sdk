var node = require('../node.js');
var Promise = require('bluebird');
var slots = require('../../helpers/slots.js');
var _ = require('lodash');

function forge (library, cb) {
	function getNextForger (offset, cb) {
		offset = !offset ? 1 : offset;
		var last_block = library.modules.blocks.lastBlock.get();
		var slot = slots.getSlotNumber(last_block.timestamp);
		library.modules.delegates.generateDelegateList(last_block.height, null, function (err, delegateList) {
			if (err) { return cb (err); }
			var nextForger = delegateList[(slot + offset) % slots.delegates];
			return cb(nextForger);
		});
	}

	var transactionPool = library.rewiredModules.transactions.__get__('__private.transactionPool');
	var keypairs = library.rewiredModules.delegates.__get__('__private.keypairs');

	node.async.waterfall([ 
		transactionPool.fillPool,
		function (cb) {
			getNextForger(null, function (delegatePublicKey) {
				cb(null, delegatePublicKey);
			});
		},
		function (delegate, seriesCb) {
			var last_block = library.modules.blocks.lastBlock.get();
			var slot = slots.getSlotNumber(last_block.timestamp) + 1;
			var keypair = keypairs[delegate];
			node.debug('		Last block height: ' + last_block.height + ' Last block ID: ' + last_block.id + ' Last block timestamp: ' + last_block.timestamp + ' Next slot: ' + slot + ' Next delegate PK: ' + delegate + ' Next block timestamp: ' + slots.getSlotTime(slot));
			library.modules.blocks.process.generateBlock(keypair, slots.getSlotTime(slot), function (err) {
				if (err) { return seriesCb(err); }
				last_block = library.modules.blocks.lastBlock.get();
				node.debug('		New last block height: ' + last_block.height + ' New last block ID: ' + last_block.id);
				return seriesCb(err);
			});
		}
	], function (err) {
		cb(err);
	});
}

function addTransactionToUnconfirmedQueue (library, transaction, cb) {
	// Add transaction to transactions pool - we use shortcut here to bypass transport module, but logic is the same
	// See: modules.transport.__private.receiveTransaction
	library.balancesSequence.add(function (sequenceCb) {
		library.modules.transactions.processUnconfirmedTransaction(transaction, true, function (err) {
			if (err) {
				return setImmediate(sequenceCb, err.toString());
			} else {
				var transactionPool = library.rewiredModules.transactions.__get__('__private.transactionPool');
				transactionPool.fillPool(sequenceCb);
			}
		});
	}, cb);
}

function addTransaction (library, transaction, cb) {
	// Add transaction to transactions pool - we use shortcut here to bypass transport module, but logic is the same
	// See: modules.transport.__private.receiveTransaction
	library.balancesSequence.add(function (sequenceCb) {
		library.modules.transactions.processUnconfirmedTransaction(transaction, true, function (err) {
			if (err) {
				return setImmediate(sequenceCb, err.toString());
			} else {
				return setImmediate(sequenceCb, null, transaction.id);
			}
		});
	}, cb);
}

function addTransactionsAndForge (library, transactions, cb) {
	node.async.waterfall([
		function addTransactions (waterCb) {
			node.async.eachSeries(transactions, function (transaction, eachSeriesCb) {
				addTransaction(library, transaction, eachSeriesCb);
			}, waterCb);
		},
		function (waterCb) {
			setTimeout(function () {
				forge(library, waterCb);
			}, 800);
		}
	], function (err) {
		cb(err);
	});
}

function getAccountFromDb (library, address) {
	return Promise.all([
		library.db.query('SELECT * FROM mem_accounts where address = \'' + address + '\''),
		library.db.query('SELECT * FROM mem_accounts2multisignatures where "accountId" = \'' + address + '\''),
		library.db.query('SELECT * FROM mem_accounts2u_multisignatures where "accountId" = \'' + address + '\'')
	]).then(function (res) {
		// Get the first row if resultant array is not empty
		return {
			mem_accounts: res[0].length > 0 ? res[0][0] : res[0],
			mem_accounts2multisignatures: res[1],
			mem_accounts2u_multisignatures: res[2]
		};
	});
}

function getBlocks (library, cb) {
	library.sequence.add(function (sequenceCb) {
		library.db.query('SELECT "id" FROM blocks ORDER BY "height" DESC LIMIT 10;').then(function (rows) {
			sequenceCb();
			cb(null, _.map(rows, 'id'));
		}).catch(function (err) {
			node.debug(err.stack);
			cb(err);
		});
	});
}

function createBlock (library, transactions, timestamp, keypair, previousBlock) {
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

function getDelegateForSlot (library, slot, cb) {
	var lastBlock = library.modules.blocks.lastBlock.get();

	library.modules.delegates.generateDelegateList(lastBlock.height, null, function (err, list) {
		var delegatePublicKey = list[slot % slots.delegates];
		return cb(err, delegatePublicKey);
	});
}

function createValidBlock (library, transactions, cb) {
	var lastBlock = library.modules.blocks.lastBlock.get();
	var slot = slots.getSlotNumber();
	var keypairs = library.rewiredModules.delegates.__get__('__private.keypairs');
	getDelegateForSlot(library, slot, function (err, delegateKey) {
		var block = createBlock(library, transactions, slots.getSlotTime(slot), keypairs[delegateKey], lastBlock);
		cb(err, block);
	});
}

module.exports = {
	getAccountFromDb: getAccountFromDb,
	addTransactionsAndForge: addTransactionsAndForge,
	addTransaction: addTransaction,
	forge: forge,
	createBlock: createBlock,
	getDelegateForSlot: getDelegateForSlot,
	createValidBlock: createValidBlock,
	addTransactionToUnconfirmedQueue: addTransactionToUnconfirmedQueue,
	getBlocks: getBlocks
};
