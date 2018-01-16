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

var async = require('async');
var Promise = require('bluebird');
var lisk = require('lisk-js');

var test = require('../../test');

var slots = require('../../../helpers/slots');

var application = require('../../common/application');
var normalizer = require('../../common/utils/normalizer');

var accountFixtures = require('../../fixtures/accounts');

function forge (library, cb) {
	function getNextForger (offset, cb) {
		offset = !offset ? 1 : offset;
		var last_block = library.modules.blocks.lastBlock.get();
		var slot = slots.getSlotNumber(last_block.timestamp);
		library.modules.delegates.generateDelegateList(last_block.height, null, function (err, delegateList) {
			if (err) { return cb(err); }
			var nextForger = delegateList[(slot + offset) % slots.delegates];
			return cb(nextForger);
		});
	}

	var transactionPool = library.rewiredModules.transactions.__get__('__private.transactionPool');
	var keypairs = library.rewiredModules.delegates.__get__('__private.keypairs');

	async.waterfall([
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
			test.debug('		Last block height: ' + last_block.height + ' Last block ID: ' + last_block.id + ' Last block timestamp: ' + last_block.timestamp + ' Next slot: ' + slot + ' Next delegate PK: ' + delegate + ' Next block timestamp: ' + slots.getSlotTime(slot));
			library.modules.blocks.process.generateBlock(keypair, slots.getSlotTime(slot), function (err) {
				if (err) { return seriesCb(err); }
				last_block = library.modules.blocks.lastBlock.get();
				test.debug('		New last block height: ' + last_block.height + ' New last block ID: ' + last_block.id);
				return seriesCb(err);
			});
		}
	], function (err) {
		cb(err);
	});
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
	async.waterfall([
		function addTransactions (waterCb) {
			async.eachSeries(transactions, function (transaction, eachSeriesCb) {
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

function getTransactionFromModule (library, filter, cb) {
	library.modules.transactions.shared.getTransactions(filter, function (err, res) {
		cb(err, res);
	});
}

function beforeBlock (type, account, dapp, cb) {
	before('init sandboxed application, credit account and register dapp', function (done) {
		application.init({ sandbox: { name: 'lisk_test_' + type } }, function (err, library) {
			var transaction = lisk.transaction.createTransaction(account.address, 1000 * normalizer, accountFixtures.genesis.password);
			var dappTransaction = lisk.dapp.createDapp(account.password, null, dapp);
			dapp.id = dappTransaction.id;

			addTransactionsAndForge(library, [transaction], function (err, res) {
				addTransactionsAndForge(library, [dappTransaction], function (err, res) {
					library.logic.account.get({ address: account.address }, function (err, sender) {
						cb(library, sender);
						done();
					});
				});
			});
		});
	});

	after('cleanup sandboxed application', function (done) {
		application.cleanup(done);
	});
}

module.exports = {
	forge: forge,
	addTransaction: addTransaction,
	addTransactionsAndForge: addTransactionsAndForge,
	getAccountFromDb: getAccountFromDb,
	getTransactionFromModule: getTransactionFromModule,
	beforeBlock: beforeBlock
};
