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
const { BlockSlots } = require('../../../src/modules/chain/blocks');
const application = require('../common/application');
const randomUtil = require('../common/utils/random');
const accountFixtures = require('../fixtures/accounts');
const blocksLogic = require('../../../src/modules/chain/blocks/block');

const slots = new BlockSlots({
	epochTime: __testContext.config.constants.EPOCH_TIME,
	interval: __testContext.config.constants.BLOCK_TIME,
	blocksPerRound: __testContext.config.constants.ACTIVE_DELEGATES,
});

const { ACTIVE_DELEGATES } = global.constants;

function getDelegateForSlot(library, slot, cb) {
	const lastBlock = library.modules.blocks.lastBlock;
	const round = slots.calcRound(lastBlock.height + 1);
	library.modules.forger
		.loadDelegates()
		.then(() => {
			library.modules.rounds
				.generateDelegateList(round)
				.then(list => {
					const delegatePublicKey = list[slot % ACTIVE_DELEGATES];
					return cb(null, delegatePublicKey);
				})
				.catch(err => {
					return cb(err);
				});
		})
		.catch(err => {
			return cb(err);
		});
}

function blockToJSON(block) {
	block.transactions = block.transactions.map(tx => tx.toJSON());
	return block;
}

function createBlock(
	library,
	transactions,
	timestamp,
	keypair,
	previousBlock,
	exceptions
) {
	transactions = transactions.map(transaction =>
		library.modules.interfaceAdapters.transactions.fromJson(transaction)
	);
	const block = blocksLogic.create({
		blockReward: library.modules.blocks.blockReward,
		keypair,
		timestamp,
		previousBlock,
		transactions,
		maxPayloadLength: __testContext.config.constants.MAX_PAYLOAD_LENGTH,
		exceptions,
	});

	block.id = blocksLogic.getId(block);
	block.height = previousBlock.height + 1;
	return block;
}

function createValidBlockWithSlotOffset(
	library,
	transactions,
	slotOffset,
	exceptions,
	cb
) {
	const lastBlock = library.modules.blocks.lastBlock;
	const slot = slots.getSlotNumber() - slotOffset;
	const keypairs = library.modules.forger.getForgersKeyPairs();
	getDelegateForSlot(library, slot, (err, delegateKey) => {
		cb = typeof exceptions === 'object' ? cb : exceptions;
		const block = createBlock(
			library,
			transactions,
			slots.getSlotTime(slot),
			keypairs[delegateKey],
			lastBlock,
			typeof exceptions === 'object' ? exceptions : undefined
		);
		cb(err, block);
	});
}

function createValidBlock(library, transactions, cb) {
	const lastBlock = library.modules.blocks.lastBlock;
	const slot = slots.getSlotNumber();
	const keypairs = library.modules.forger.getForgersKeyPairs();
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
	library.sequence
		.add(async () => {
			const rows = await library.components.storage.adapter.db.query(
				'SELECT "id" FROM blocks ORDER BY "height" DESC LIMIT 10;'
			);
			return rows.map(r => r.id);
		})
		.then(ids => cb(null, ids))
		.catch(err => {
			__testContext.debug(err.stack);
			cb(err);
		});
}

function getNextForger(library, offset, cb) {
	offset = !offset ? 1 : offset;

	const lastBlock = library.modules.blocks.lastBlock;
	const slot = slots.getSlotNumber(lastBlock.timestamp);
	getDelegateForSlot(library, slot + offset, cb);
}

function forge(library, cb) {
	const keypairs = library.modules.forger.getForgersKeyPairs();

	async.waterfall(
		[
			function(seriesCb) {
				fillPool(library, seriesCb);
			},
			function(seriesCb) {
				getNextForger(library, null, seriesCb);
			},
			function(delegate, seriesCb) {
				let last_block = library.modules.blocks.lastBlock;
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
				const transactions =
					library.modules.transactionPool.getUnconfirmedTransactionList(
						false,
						25
					) || [];
				library.modules.blocks
					.generateBlock(keypair, slots.getSlotTime(slot), transactions)
					.then(() => {
						last_block = library.modules.blocks.lastBlock;
						library.modules.transactionPool.resetPool();
						__testContext.debug(
							`		New last block height: ${last_block.height} New last block ID: ${
								last_block.id
							}`
						);
						seriesCb();
					})
					.catch(err => {
						return seriesCb(err);
					});
			},
		],
		err => {
			cb(err);
		}
	);
}

function deleteLastBlock(library, cb) {
	library.modules.blocks.blocksChain
		.deleteLastBlock(library.modules.blocks.lastBlock)
		.then(newLastBlock => {
			library.modules.blocks._lastBlock = newLastBlock;
			cb();
		})
		.catch(err => cb(err));
}

function fillPool(library, cb) {
	library.modules.transactionPool
		.fillPool()
		.then(() => cb())
		.catch(err => cb(err));
}

function addTransaction(library, transaction, cb) {
	// Add transaction to transactions pool - we use shortcut here to bypass transport module, but logic is the same
	// See: modules.transport.__private.receiveTransaction
	__testContext.debug(`	Add transaction ID: ${transaction.id}`);
	transaction = library.modules.interfaceAdapters.transactions.fromJson(
		transaction
	);
	library.modules.transactionPool
		.processUnconfirmedTransaction(transaction)
		.then(() => cb(null, transaction.id))
		.catch(error => cb(error.toString()));
}

function addTransactionToUnconfirmedQueue(library, transaction, cb) {
	// Add transaction to transactions pool - we use shortcut here to bypass transport module, but logic is the same
	// See: modules.transport.__private.receiveTransaction
	transaction = library.modules.interfaceAdapters.transactions.fromJson(
		transaction
	);
	library.modules.transactionPool
		.processUnconfirmedTransaction(transaction)
		.then(() => library.modules.transactionPool.fillPool())
		.then(() => cb())
		.catch(err => setImmediate(cb, err.toString()));
}

function addTransactionsAndForge(library, transactions, forgeDelay, cb) {
	if (typeof forgeDelay === 'function') {
		cb = forgeDelay;
		forgeDelay = 800;
	}

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
	]).then(res => {
		return {
			// Get the first row if resultant array is not empty
			mem_accounts: res[0].length > 0 ? res[0][0] : res[0],
			mem_accounts2multisignatures: res[1],
		};
	});
}

function getTransactionFromModule(library, filter, cb) {
	Promise.all([
		library.components.storage.entities.Transaction.get(filter),
		library.components.storage.entities.Transaction.count(filter),
	])
		.then(([data, count]) => {
			cb(null, {
				transactions: data,
				count,
			});
		})
		.catch(err => cb(err));
}

function getUnconfirmedTransactionFromModule(library, filter, cb) {
	try {
		const res = library.modules.transactionPool.getPooledTransactions(
			'ready',
			filter
		);
		return setImmediate(cb, null, res);
	} catch (err) {
		return setImmediate(cb, null);
	}
}

function getMultisignatureTransactions(library, filter, cb) {
	try {
		const res = library.modules.transactionPool.getPooledTransactions(
			'pending',
			filter
		);
		return setImmediate(cb, null, res);
	} catch (err) {
		return setImmediate(cb, null);
	}
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
	return library.modules.transactionPool.transactionInPool(transactionId);
}

module.exports = {
	blockToJSON,
	getNextForger,
	forge,
	deleteLastBlock,
	fillPool,
	addTransaction,
	addTransactionToUnconfirmedQueue,
	createValidBlock,
	createValidBlockWithSlotOffset,
	addTransactionsAndForge,
	getBlocks,
	getAccountFromDb,
	getTransactionFromModule,
	getDelegateForSlot,
	getUnconfirmedTransactionFromModule,
	beforeBlock,
	loadTransactionType,
	getMultisignatureTransactions,
	transactionInPool,
};
