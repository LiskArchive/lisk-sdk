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
var lisk = require('lisk-js').default;
var slots = require('../../../helpers/slots');
var application = require('../../common/application');
var randomUtil = require('../../common/utils/random');
var accountFixtures = require('../../fixtures/accounts');

function getDelegateForSlot(library, slot, cb) {
	var lastBlock = library.modules.blocks.lastBlock.get();

	library.modules.delegates.generateDelegateList(
		lastBlock.height + 1,
		null,
		(err, list) => {
			var delegatePublicKey = list[slot % slots.delegates];
			return cb(err, delegatePublicKey);
		}
	);
}

function createBlock(library, transactions, timestamp, keypair, previousBlock) {
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

function createValidBlock(library, transactions, cb) {
	var lastBlock = library.modules.blocks.lastBlock.get();
	var slot = slots.getSlotNumber();
	var keypairs = library.rewiredModules.delegates.__get__('__private.keypairs');
	getDelegateForSlot(library, slot, (err, delegateKey) => {
		var block = createBlock(
			library,
			transactions,
			slots.getSlotTime(slot),
			keypairs[delegateKey],
			lastBlock
		);
		cb(err, block);
	});
}

function getBlocks(library, cb) {
	library.sequence.add(sequenceCb => {
		library.db
			.query('SELECT "id" FROM blocks ORDER BY "height" DESC LIMIT 10;')
			.then(rows => {
				sequenceCb();
				cb(null, _.map(rows, 'id'));
			})
			.catch(err => {
				__testContext.debug(err.stack);
				cb(err);
			});
	});
}

function forge(library, cb) {
	function getNextForger(offset, cb) {
		offset = !offset ? 1 : offset;

		var lastBlock = library.modules.blocks.lastBlock.get();
		var slot = slots.getSlotNumber(lastBlock.timestamp);
		getDelegateForSlot(library, slot + offset, cb);
	}

	var keypairs = library.rewiredModules.delegates.__get__('__private.keypairs');

	async.waterfall(
		[
			function(seriesCb) {
				fillPool(library, seriesCb);
			},
			function(seriesCb) {
				getNextForger(null, seriesCb);
			},
			function(delegate, seriesCb) {
				var last_block = library.modules.blocks.lastBlock.get();
				var slot = slots.getSlotNumber(last_block.timestamp) + 1;
				var keypair = keypairs[delegate];
				__testContext.debug(
					`		Last block height: ${last_block.height} Last block ID: ${
						last_block.id
					} Last block timestamp: ${
						last_block.timestamp
					} Next slot: ${slot} Next delegate PK: ${delegate} Next block timestamp: ${slots.getSlotTime(
						slot
					)}`
				);
				library.modules.blocks.process.generateBlock(
					keypair,
					slots.getSlotTime(slot),
					err => {
						if (err) {
							return seriesCb(err);
						}
						last_block = library.modules.blocks.lastBlock.get();
						__testContext.debug(
							`		New last block height: ${last_block.height} New last block ID: ${
								last_block.id
							}`
						);
						return seriesCb(err);
					}
				);
			},
		],
		err => {
			cb(err);
		}
	);
}

function fillPool(library, cb) {
	var transactionPool = library.rewiredModules.transactions.__get__(
		'__private.transactionPool'
	);
	transactionPool.fillPool(cb);
}

function addTransaction(library, transaction, cb) {
	// Add transaction to transactions pool - we use shortcut here to bypass transport module, but logic is the same
	// See: modules.transport.__private.receiveTransaction
	library.balancesSequence.add(sequenceCb => {
		library.modules.transactions.processUnconfirmedTransaction(
			transaction,
			true,
			err => {
				if (err) {
					return setImmediate(sequenceCb, err.toString());
				}
				return setImmediate(sequenceCb, null, transaction.id);
			}
		);
	}, cb);
}

function addTransactionToUnconfirmedQueue(library, transaction, cb) {
	// Add transaction to transactions pool - we use shortcut here to bypass transport module, but logic is the same
	// See: modules.transport.__private.receiveTransaction
	library.modules.transactions.processUnconfirmedTransaction(
		transaction,
		true,
		err => {
			if (err) {
				return setImmediate(cb, err.toString());
			}
			var transactionPool = library.rewiredModules.transactions.__get__(
				'__private.transactionPool'
			);
			transactionPool.fillPool(cb);
		}
	);
}

function addTransactionsAndForge(library, transactions, cb) {
	async.waterfall(
		[
			function addTransactions(waterCb) {
				async.eachSeries(
					transactions,
					(transaction, eachSeriesCb) => {
						addTransaction(library, transaction, eachSeriesCb);
					},
					waterCb
				);
			},
			function(waterCb) {
				setTimeout(() => {
					forge(library, waterCb);
				}, 800);
			},
		],
		err => {
			cb(err);
		}
	);
}

function getAccountFromDb(library, address) {
	return Promise.all([
		library.db.query(`SELECT * FROM mem_accounts where address = '${address}'`),
		library.db.query(
			`SELECT * FROM mem_accounts2multisignatures where "accountId" = '${address}'`
		),
		library.db.query(
			`SELECT * FROM mem_accounts2u_multisignatures where "accountId" = '${address}'`
		),
	]).then(res => {
		return {
			// Get the first row if resultant array is not empty
			mem_accounts: res[0].length > 0 ? res[0][0] : res[0],
			mem_accounts2multisignatures: res[1],
			mem_accounts2u_multisignatures: res[2],
		};
	});
}

function getTransactionFromModule(library, filter, cb) {
	library.modules.transactions.shared.getTransactions(filter, (err, res) => {
		cb(err, res);
	});
}

function getUnconfirmedTransactionFromModule(library, filter, cb) {
	library.modules.transactions.shared.getUnconfirmedTransactions(
		filter,
		(err, res) => {
			cb(err, res);
		}
	);
}

function beforeBlock(type, cb) {
	// eslint-disable-next-line mocha/no-top-level-hooks
	before(
		'init sandboxed application, credit account and register dapp',
		done => {
			application.init(
				{ sandbox: { name: `lisk_test_${type}` } },
				(err, library) => {
					cb(library);
					done();
				}
			);
		}
	);

	// eslint-disable-next-line mocha/no-top-level-hooks
	after('cleanup sandboxed application', done => {
		application.cleanup(done);
	});
}

function loadTransactionType(key, account, dapp, secondPassword, cb) {
	var transaction;
	var accountCopy = _.cloneDeep(account);
	if (secondPassword == true) {
		accountCopy.secondPassword = null;
	} else if (secondPassword == false) {
		accountCopy.secondPassword = 'invalid_second_passphrase';
	}
	switch (key) {
		case 'SEND':
			transaction = lisk.transaction.transfer({
				amount: 1,
				passphrase: accountCopy.password,
				secondPassphrase: accountCopy.secondPassword,
				recipientId: randomUtil.account().address,
			});
			break;
		case 'SIGNATURE':
			transaction = lisk.transaction.registerSecondPassphrase({
				passphrase: account.password,
				secondPassphrase: account.secondPassword,
			});
			break;
		case 'DELEGATE':
			transaction = lisk.transaction.registerDelegate({
				passphrase: accountCopy.password,
				secondPassphrase: accountCopy.secondPassword,
				username: accountCopy.username,
			});
			break;
		case 'VOTE':
			transaction = lisk.transaction.castVotes({
				passphrase: accountCopy.password,
				secondPassphrase: accountCopy.secondPassword,
				votes: [accountFixtures.existingDelegate.publicKey],
			});
			break;
		case 'MULTI':
			transaction = lisk.transaction.registerMultisignature({
				passphrase: accountCopy.password,
				secondPassphrase: accountCopy.secondPassword,
				keysgroup: [accountFixtures.existingDelegate.publicKey],
				lifetime: 1,
				minimum: 1,
			});
			break;
		case 'DAPP':
			transaction = lisk.transaction.createDapp({
				passphrase: accountCopy.password,
				secondPassphrase: accountCopy.secondPassword,
				options: randomUtil.guestbookDapp,
			});
			break;
		case 'IN_TRANSFER':
			transaction = lisk.transaction.transferIntoDapp({
				passphrase: accountCopy.password,
				secondPassphrase: accountCopy.secondPassword,
				amount: 1,
				dappId: dapp.id,
			});
			break;
		case 'OUT_TRANSFER':
			transaction = lisk.transaction.transferOutOfDapp({
				passphrase: accountCopy.password,
				secondPassphrase: accountCopy.secondPassword,
				amount: 1,
				dappId: dapp.id,
				transactionId: randomUtil.transaction().id,
				recipientId: randomUtil.account().address,
			});
			break;
		// no default
	}

	cb(transaction);
}

module.exports = {
	forge,
	fillPool,
	addTransaction,
	addTransactionToUnconfirmedQueue,
	createValidBlock,
	addTransactionsAndForge,
	getBlocks,
	getAccountFromDb,
	getTransactionFromModule,
	getUnconfirmedTransactionFromModule,
	beforeBlock,
	loadTransactionType,
};
