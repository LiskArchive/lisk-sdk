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

var slots = require('../../../helpers/slots');

var application = require('../../common/application');
var randomUtil = require('../../common/utils/random');

var accountFixtures = require('../../fixtures/accounts');

function forge(library, cb) {
	function getNextForger(offset, cb) {
		offset = !offset ? 1 : offset;
		var last_block = library.modules.blocks.lastBlock.get();
		var slot = slots.getSlotNumber(last_block.timestamp);
		library.modules.delegates.generateDelegateList(
			last_block.height,
			null,
			(err, delegateList) => {
				if (err) {
					return cb(err);
				}
				var nextForger = delegateList[(slot + offset) % slots.delegates];
				return cb(nextForger);
			}
		);
	}

	var transactionPool = library.rewiredModules.transactions.__get__(
		'__private.transactionPool'
	);
	var keypairs = library.rewiredModules.delegates.__get__('__private.keypairs');

	async.waterfall(
		[
			transactionPool.fillPool,
			function(cb) {
				getNextForger(null, delegatePublicKey => {
					cb(null, delegatePublicKey);
				});
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
				} else {
					return setImmediate(sequenceCb, null, transaction.id);
				}
			}
		);
	}, cb);
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

function beforeBlock(type, cb) {
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
			transaction = lisk.transaction.createTransaction(
				randomUtil.account().address,
				1,
				accountCopy.password,
				accountCopy.secondPassword
			);
			break;
		case 'SIGNATURE':
			transaction = lisk.signature.createSignature(
				account.password,
				account.secondPassword
			);
			break;
		case 'DELEGATE':
			transaction = lisk.delegate.createDelegate(
				accountCopy.password,
				accountCopy.username,
				accountCopy.secondPassword
			);
			break;
		case 'VOTE':
			transaction = lisk.vote.createVote(
				accountCopy.password,
				[`+${accountFixtures.existingDelegate.publicKey}`],
				accountCopy.secondPassword
			);
			break;
		case 'MULTI':
			transaction = lisk.multisignature.createMultisignature(
				accountCopy.password,
				accountCopy.secondPassword,
				[`+${accountFixtures.existingDelegate.publicKey}`],
				1,
				1
			);
			break;
		case 'DAPP':
			transaction = lisk.dapp.createDapp(
				accountCopy.password,
				accountCopy.secondPassword,
				randomUtil.guestbookDapp
			);
			break;
		case 'IN_TRANSFER':
			transaction = lisk.transfer.createInTransfer(
				dapp.id,
				1,
				accountCopy.password,
				accountCopy.secondPassword
			);
			break;
		case 'OUT_TRANSFER':
			transaction = lisk.transfer.createOutTransfer(
				dapp.id,
				randomUtil.transaction().id,
				randomUtil.account().address,
				1,
				accountCopy.password,
				accountCopy.secondPassword
			);
			break;
	}

	cb(transaction);
}

module.exports = {
	forge: forge,
	addTransaction: addTransaction,
	addTransactionsAndForge: addTransactionsAndForge,
	getAccountFromDb: getAccountFromDb,
	getTransactionFromModule: getTransactionFromModule,
	beforeBlock: beforeBlock,
	loadTransactionType: loadTransactionType,
};
