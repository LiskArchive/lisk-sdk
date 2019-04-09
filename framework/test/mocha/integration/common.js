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

const async = require('async');
const Promise = require('bluebird');
const {
	transfer,
	registerSecondPassphrase,
	registerDelegate,
	registerMultisignature,
	castVotes,
	createDapp,
} = require('@liskhq/lisk-transactions');
const slots = require('../../../src/modules/chain/helpers/slots');
const application = require('../common/application');
const randomUtil = require('../common/utils/random');
const accountFixtures = require('../fixtures/accounts');
const Bignum = require('../../../src/modules/chain/helpers/bignum');

const { ACTIVE_DELEGATES } = global.constants;

const convertToBigNum = transactions => {
	return transactions.forEach(transaction => {
		transaction.amount = new Bignum(transaction.amount);
		transaction.fee = new Bignum(transaction.fee);
	});
};

function getDelegateForSlot(library, slot, cb) {
	const lastBlock = library.modules.blocks.lastBlock.get();
	const round = slots.calcRound(lastBlock.height + 1);

	library.modules.delegates.generateDelegateList(round, null, (err, list) => {
		const delegatePublicKey = list[slot % ACTIVE_DELEGATES];
		return cb(err, delegatePublicKey);
	});
}

function createBlock(library, transactions, timestamp, keypair, previousBlock) {
	convertToBigNum(transactions);
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

function createValidBlock(library, transactions, cb) {
	const lastBlock = library.modules.blocks.lastBlock.get();
	const slot = slots.getSlotNumber();
	const keypairs = library.modules.delegates.getForgersKeyPairs();
	convertToBigNum(transactions);
	getDelegateForSlot(library, slot, (err, delegateKey) => {
		const block = createBlock(
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
		library.components.storage.adapter.db
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

function getNextForger(library, offset, cb) {
	offset = !offset ? 1 : offset;

	const lastBlock = library.modules.blocks.lastBlock.get();
	const slot = slots.getSlotNumber(lastBlock.timestamp);
	getDelegateForSlot(library, slot + offset, cb);
}

function forge(library, cb) {
	const keypairs = library.modules.delegates.getForgersKeyPairs();

	async.waterfall(
		[
			function(seriesCb) {
				fillPool(library, seriesCb);
			},
			function(seriesCb) {
				getNextForger(library, null, seriesCb);
			},
			function(delegate, seriesCb) {
				let last_block = library.modules.blocks.lastBlock.get();
				const slot = slots.getSlotNumber(last_block.timestamp) + 1;
				const keypair = keypairs[delegate];
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

function deleteLastBlock(library, cb) {
	library.modules.blocks.chain.deleteLastBlock(cb);
}

function fillPool(library, cb) {
	const transactionPool = library.rewiredModules.transactions.__get__(
		'__private.transactionPool'
	);
	transactionPool.fillPool(cb);
}

function addTransaction(library, transaction, cb) {
	// Add transaction to transactions pool - we use shortcut here to bypass transport module, but logic is the same
	// See: modules.transport.__private.receiveTransaction
	__testContext.debug(`	Add transaction ID: ${transaction.id}`);
	convertToBigNum([transaction]);

	transaction = library.logic.transaction.objectNormalize(transaction);
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
	convertToBigNum([transaction]);
	library.modules.transactions.processUnconfirmedTransaction(
		transaction,
		true,
		err => {
			if (err) {
				return setImmediate(cb, err.toString());
			}
			const transactionPool = library.rewiredModules.transactions.__get__(
				'__private.transactionPool'
			);
			return transactionPool.fillPool(cb);
		}
	);
}

function addTransactionsAndForge(library, transactions, forgeDelay, cb) {
	if (typeof forgeDelay === 'function') {
		cb = forgeDelay;
		forgeDelay = 800;
	}
	convertToBigNum(transactions);

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
				if (forgeDelay > 0) {
					setTimeout(() => {
						forge(library, waterCb);
					}, forgeDelay);
				} else {
					setImmediate(forge, library, waterCb);
				}
			},
		],
		err => {
			cb(err);
		}
	);
}

function getAccountFromDb(library, address) {
	return Promise.all([
		library.components.storage.adapter.execute(
			`SELECT * FROM mem_accounts where address = '${address}'`
		),
		library.components.storage.adapter.execute(
			`SELECT * FROM mem_accounts2multisignatures where "accountId" = '${address}'`
		),
		library.components.storage.adapter.db.query(
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
	library.modules.transactions.getTransactions(filter, (err, res) => {
		cb(err, res);
	});
}

function getUnconfirmedTransactionFromModule(library, filter, cb) {
	library.modules.transactions.shared.getTransactionsFromPool(
		'unconfirmed',
		filter,
		(err, res) => {
			cb(err, res);
		}
	);
}

function getMultisignatureTransactions(library, filter, cb) {
	library.modules.transactions.shared.getTransactionsFromPool(
		'unsigned',
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
				{ sandbox: { name: `lisk_test_integration_${type}` } },
				(err, library) => {
					if (err) {
						return done(err);
					}
					cb(library);
					return done();
				}
			);
		}
	);

	// eslint-disable-next-line mocha/no-top-level-hooks
	after('cleanup sandboxed application', done => {
		application.cleanup(done);
	});
}

function loadTransactionType(key, account, dapp, secondPassphrase, cb) {
	let transaction;
	const accountCopy = _.cloneDeep(account);
	if (secondPassphrase === true) {
		accountCopy.secondPassphrase = null;
	} else if (secondPassphrase === false) {
		accountCopy.secondPassphrase = 'invalid_second_passphrase';
	}
	switch (key) {
		case 'SEND':
			transaction = transfer({
				amount: '1',
				passphrase: accountCopy.passphrase,
				secondPassphrase: accountCopy.secondPassphrase,
				recipientId: randomUtil.account().address,
			});
			break;
		case 'SIGNATURE':
			transaction = registerSecondPassphrase({
				passphrase: account.passphrase,
				secondPassphrase: account.secondPassphrase,
			});
			break;
		case 'DELEGATE':
			transaction = registerDelegate({
				passphrase: accountCopy.passphrase,
				secondPassphrase: accountCopy.secondPassphrase,
				username: accountCopy.username,
			});
			break;
		case 'VOTE':
			transaction = castVotes({
				passphrase: accountCopy.passphrase,
				secondPassphrase: accountCopy.secondPassphrase,
				votes: [accountFixtures.existingDelegate.publicKey],
			});
			break;
		case 'MULTI':
			transaction = registerMultisignature({
				passphrase: accountCopy.passphrase,
				secondPassphrase: accountCopy.secondPassphrase,
				keysgroup: [accountFixtures.existingDelegate.publicKey],
				lifetime: 1,
				minimum: 1,
			});
			break;
		case 'DAPP':
			transaction = createDapp({
				passphrase: accountCopy.passphrase,
				secondPassphrase: accountCopy.secondPassphrase,
				options: randomUtil.guestbookDapp,
			});
			break;
		// no default
	}

	cb(transaction);
}

function transactionInPool(library, transactionId) {
	const transactionPool = library.rewiredModules.transactions.__get__(
		'__private.transactionPool'
	);
	return transactionPool.transactionInPool(transactionId);
}

module.exports = {
	getNextForger,
	forge,
	deleteLastBlock,
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
	getMultisignatureTransactions,
	transactionInPool,
};
