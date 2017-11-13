'use strict';

var node      = require('../../node.js');
var _         = node._;
var bignum    = node.bignum;
var expect    = node.expect;
var slots     = require('../../../helpers/slots.js');
var DBSandbox = require('../../common/globalBefore').DBSandbox;
var Promise   = require('bluebird');

describe('SQL triggers related to accounts', function () {
	var dbSandbox, library, deleteLastBlockPromise, processed_txs = [];

	before(function (done) {
		dbSandbox = new DBSandbox(node.config.db, 'lisk_test_sql_accounts');
		dbSandbox.create(function (err, __db) {
			node.initApplication(function (err, scope) {
				library = scope;

				// Set delegates module as loaded to allow manual forging
				library.rewiredModules.delegates.__set__('__private.loaded', true);

				setTimeout(done, 3000);
			}, {db: __db});
		});
	});

	before(function (done) {
		deleteLastBlockPromise = Promise.promisify(library.modules.blocks.chain.deleteLastBlock);
		// Load forging delegates
		var loadDelegates = library.rewiredModules.delegates.__get__('__private.loadDelegates');
		loadDelegates(done);
	});

	after(function (done) {
		dbSandbox.destroy();
		node.appCleanup(done);
	});

	function normalizeAccounts(rows) {
		var accounts = {};
		_.each(rows, function (row) {
			accounts[row.address] = {
				transaction_id: row.transaction_id,
				public_key: row.public_key ? row.public_key.toString('hex') : null,
				public_key_transaction_id: row.public_key_transaction_id,
				second_public_key: row.second_public_key ? row.second_public_key.toString('hex') : null,
				address: row.address,
				balance: row.balance
			};
		});
		return accounts;
	}

	function getAccounts () {
		return library.db.query('SELECT * FROM accounts').then(function (rows) {
			return normalizeAccounts(rows);
		});
	}

	function getAccountByAddress (address) {
		return library.db.query('SELECT * FROM accounts WHERE address = ${address}', {address: address}).then(function (rows) {
			return normalizeAccounts(rows);
		});
	}

	function getSignatureByTxId (id) {
		return library.db.query('SELECT * FROM second_signature WHERE transaction_id = ${id}', {id: id}).then(function (rows) {
			return rows;
		});
	}

    function getTransactionsByIds (ids) {
        return library.db.query('SELECT * FROM transactions WHERE transaction_id IN (${ids:csv})', {ids: ids}).then(function (rows) {
            return rows;
        });
    }

	function getExpectedAccounts(transactions) {
		var expected = {};
		_.each(transactions, function (tx) {
			// Update recipient
			if (tx.recipientId) {
				if (!expected[tx.recipientId]) {
					expected[tx.recipientId] = {
						transaction_id: tx.id,
						public_key: null,
						public_key_transaction_id: null,
						second_public_key: null,
						address: tx.recipientId,
						balance: tx.amount
					}
				} else {
					expected[tx.recipientId].balance = new bignum(expected[tx.recipientId].balance).plus(tx.amount).toString();
				}
			}

			// Update sender
			if (!expected[tx.senderId]) {
				expected[tx.senderId] = {
					transaction_id: tx.id,
					public_key: tx.senderPublicKey,
					public_key_transaction_id: tx.id,
					second_public_key: null,
					address: tx.senderId,
					balance: new bignum(0).minus(tx.amount).minus(tx.fee).toString()
				};
			} else {
				if (!expected[tx.senderId].public_key) {
					expected[tx.senderId].public_key = tx.senderPublicKey;
					expected[tx.senderId].public_key_transaction_id = tx.id;
				}
				expected[tx.senderId].balance = new bignum(expected[tx.senderId].balance).minus(tx.amount).minus(tx.fee).toString();
			}
		});
		return expected;
	}

	function forge (cb) {
		function getNextForger(offset) {
			offset = !offset ? 1 : offset;

			var last_block = library.modules.blocks.lastBlock.get();
			var slot = slots.getSlotNumber(last_block.timestamp);
			return library.rewiredModules.delegates.__get__('__private.delegatesList')[(slot + offset) % slots.delegates];
		}

		var transactionPool = library.logic.transactionPool;
		var keypairs = library.rewiredModules.delegates.__get__('__private.keypairs');

		node.async.series([
			transactionPool.processPool,
			function (seriesCb) {
				var last_block = library.modules.blocks.lastBlock.get();
				var slot = slots.getSlotNumber(last_block.timestamp) + 1;
				var delegate = getNextForger();
				var keypair = keypairs[delegate];
				//node.debug('		Last block height: ' + last_block.height + ' Last block ID: ' + last_block.id + ' Last block timestamp: ' + last_block.timestamp + ' Next slot: ' + slot + ' Next delegate public_key: ' + delegate + ' Next block timestamp: ' + slots.getSlotTime(slot));
				library.modules.blocks.process.generateBlock(keypair, slots.getSlotTime(slot), function (err) {
					if (err) { return seriesCb(err); }
					last_block = library.modules.blocks.lastBlock.get();
					//node.debug('		New last block height: ' + last_block.height + ' New last block ID: ' + last_block.id);
					return seriesCb(err);
				});
			}
		], function (err) {
			cb(err);
		});
	}

	function addTransactionsAndForge (transactions, cb) {
		function addTransaction (transaction, cb) {
			//node.debug('	Add transaction ID: ' + transaction.id);
			// Add transaction to transactions pool - we use shortcut here to bypass transport module, but logic is the same
			// See: modules.transport.__private.receiveTransaction
			transaction = library.logic.transaction.objectNormalize(transaction);
			// Add transaction to processed_txs
			processed_txs.push(transaction);
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

		node.async.waterfall([
			function addTransactions (waterCb) {
				node.async.eachSeries(transactions, function (transaction, eachSeriesCb) {
					addTransaction(transaction, eachSeriesCb);
				}, waterCb);
			},
			function (waterCb) {
				setTimeout(function() {
					forge(waterCb);
				}, 100);
			}
		], function (err) {
			cb(err);
		});
	}

	describe('balances calculations', function () {
		var balance = '9999999807716836';
		var amount = '950525433';
		var fee = '10000000';
		var expected = '9999998847191403';

		it('using JavaScript should fail', function () {
			var result = (Number(balance) - (Number(amount) + Number(fee))).toString();
			expect(result).to.not.equal(expected);
		});

		it('using BigNumber should be ok', function () {
			var result = new bignum(balance).minus(new bignum(amount).plus(fee)).toString();
			expect(result).to.equal(expected);
		});

		it('using PostgreSQL should be ok', function () {
			return library.db.query('SELECT (${balance}::bigint - (${amount}::bigint + ${fee}::bigint)) AS result', {balance: balance, amount: amount, fee: fee}).then(function (rows) {
				expect(rows[0].result).to.equal(expected);
			});
		});
	});

	describe('accounts table', function () {

		it('initial state should match genesis block', function () {
			var genesis_transactions = library.genesisblock.block.transactions;
			var expected = getExpectedAccounts(genesis_transactions);

			return getAccounts().then(function (accounts) {
				expect(accounts).to.deep.equal(expected);
			});
		});

		describe('transactions', function () {
			var last_random_account;

			describe('signle transaction', function () {

				describe('type 0 - TRANSFER', function () {
					var last_tx;

					describe ('non-virgin account to new account', function () {
						var sender_before;
						var transactions = [];

						before(function () {
							last_random_account = node.randomAccount();

							return getAccountByAddress(node.gAccount.address).then(function (accounts) {
								sender_before = accounts[node.gAccount.address];

								var tx = node.lisk.transaction.createTransaction(
									last_random_account.address,
									node.randomNumber(100000000, 1000000000),
									node.gAccount.password
								);
								transactions.push(tx);

								return Promise.promisify(addTransactionsAndForge)(transactions);
							});
						});

						describe('sender', function () {

							it('should substract balance', function () {
								return getAccountByAddress(node.gAccount.address).then(function (accounts) {
									var sender = accounts[node.gAccount.address];
									var tx = transactions[0];
									sender_before.balance = new bignum(sender_before.balance).minus(tx.amount).minus(tx.fee).toString();
									expect(sender_before.balance).to.equal(sender.balance);
								});
							});
						});

						describe('recipient', function () {
							var recipient, tx;

							before(function () {
								tx = transactions[0];
								return getAccountByAddress(tx.recipientId).then(function (accounts) {
									recipient = accounts[tx.recipientId];
								});
							});

							it('should create account', function () {
								expect(recipient.address).to.be.equal(tx.recipientId);
							});

							it('should set transaction_id', function () {
								expect(recipient.transaction_id).to.be.equal(tx.id);
							});

							it('should not set public_key, public_key_transaction_id, second_public_key', function () {
								expect(recipient.public_key).to.be.null;
								expect(recipient.public_key_transaction_id).to.be.null;
								expect(recipient.second_public_key).to.be.null;
							});

							it('should credit balance', function () {
								expect(recipient.balance).to.equal(tx.amount.toString());
							});
						});
					}); // END: non-virgin account to new account

					describe ('non-virgin account to existing virgin account', function () {
						var sender_before;
						var recipient_before;
						var transactions = [];

						before(function () {
							return Promise.join(getAccountByAddress(node.gAccount.address), getAccountByAddress(last_random_account.address), function (sender, recipient) {
								sender_before = sender[node.gAccount.address];
								recipient_before = recipient[last_random_account.address];

								var tx = node.lisk.transaction.createTransaction(
									last_random_account.address,
									node.randomNumber(100000000, 1000000000),
									node.gAccount.password
								);
								transactions.push(tx);

								return Promise.promisify(addTransactionsAndForge)(transactions);
							});
						});

						describe('sender', function () {

							it('should substract balance', function () {
								return getAccountByAddress(node.gAccount.address).then(function (accounts) {
									var sender = accounts[node.gAccount.address];
									var tx = transactions[0];
									sender_before.balance = new bignum(sender_before.balance).minus(tx.amount).minus(tx.fee).toString();
									expect(sender_before.balance).to.equal(sender.balance);
								});
							});
						});

						describe('recipient', function () {
							var recipient, tx;

							before(function () {
								tx = transactions[0];
								return getAccountByAddress(tx.recipientId).then(function (accounts) {
									recipient = accounts[tx.recipientId];
								});
							});

							it('account should exist', function () {
								expect(recipient.address).to.be.equal(tx.recipientId);
							});

							it('should not modify transaction_id', function () {
								expect(recipient.transaction_id).to.not.be.equal(tx.id);
								expect(recipient.transaction_id).to.be.equal(recipient_before.transaction_id);
							});

							it('should not set public_key, public_key_transaction_id, second_public_key', function () {
								expect(recipient.public_key).to.be.null;
								expect(recipient.public_key_transaction_id).to.be.null;
								expect(recipient.second_public_key).to.be.null;
							});

							it('should credit balance', function () {
								var expected = new bignum(recipient_before.balance).plus(tx.amount).toString();
								expect(recipient.balance).to.equal(expected);
							});
						});
					}); // END: non-virgin account to existing virgin account

					describe ('non-virgin account to self', function () {
						var account_before;
						var transactions = [];

						before(function () {
							return getAccountByAddress(node.gAccount.address).then(function (accounts) {
								account_before = accounts[node.gAccount.address];

								var tx = node.lisk.transaction.createTransaction(
									node.gAccount.address,
									node.randomNumber(100000000, 1000000000),
									node.gAccount.password
								);
								transactions.push(tx);

								return Promise.promisify(addTransactionsAndForge)(transactions);
							});
						});

						describe('account', function () {
							var account, tx;

							before(function () {
								tx = transactions[0];
								return getAccountByAddress(node.gAccount.address).then(function (accounts) {
									account = accounts[node.gAccount.address];
								});
							});

							it('should substract only fee', function () {
								account_before.balance = new bignum(account_before.balance).minus(tx.fee).toString();
								expect(account_before.balance).to.equal(account.balance);
							});

							it('should not modify transaction_id', function () {
								expect(account.transaction_id).to.not.be.equal(tx.id);
								expect(account.transaction_id).to.be.equal(account_before.transaction_id);
							});

							it('should not modify public_key_transaction_id', function () {
								expect(account.public_key_transaction_id).to.not.be.equal(tx.id);
								expect(account.public_key_transaction_id).to.be.equal(account_before.public_key_transaction_id);
							});
						});
					}); // END: non-virgin account to self

					describe ('virgin account to new account', function () {
						var sender_before;
						var transactions = [];

						before(function () {
							return getAccountByAddress(last_random_account.address).then(function (accounts) {						
								sender_before = accounts[last_random_account.address];

								var tx = node.lisk.transaction.createTransaction(
									node.randomAccount().address,
									node.randomNumber(1, new bignum(sender_before.balance).minus(10000000).toNumber()),
									last_random_account.password
								);
								transactions.push(tx);

								return Promise.promisify(addTransactionsAndForge)(transactions);
							});
						});

						describe('sender', function () {
							var sender, tx;

							before(function () {
								tx = transactions[0];
								return getAccountByAddress(tx.senderId).then(function (accounts) {
									sender = accounts[tx.senderId];
								});
							});

							it('should not modify transaction_id', function () {
								expect(sender_before.transaction_id).to.equal(sender.transaction_id);
							});

							it('should substract balance', function () {
								sender_before.balance = new bignum(sender_before.balance).minus(tx.amount).minus(tx.fee).toString();
								expect(sender_before.balance).to.equal(sender.balance);
							});

							it('should set public_key, public_key_transaction_id', function () {
								expect(sender.public_key).to.equal(tx.senderPublicKey);
								expect(sender.public_key_transaction_id).to.equal(tx.id);
							});

							it('should not set second_public_key', function () {
								expect(sender.second_public_key).to.be.null;
							});
						});

						describe('recipient', function () {
							var recipient, tx;

							before(function () {
								tx = transactions[0];
								return getAccountByAddress(tx.recipientId).then(function (accounts) {
									recipient = accounts[tx.recipientId];
								});
							});

							it('should create account', function () {
								expect(recipient.address).to.be.equal(tx.recipientId);
							});

							it('should set transaction_id', function () {
								expect(recipient.transaction_id).to.be.equal(tx.id);
							});

							it('should not set public_key, public_key_transaction_id, second_public_key', function () {
								expect(recipient.public_key).to.be.null;
								expect(recipient.public_key_transaction_id).to.be.null;
								expect(recipient.second_public_key).to.be.null;
							});

							it('should credit balance', function () {
								expect(recipient.balance).to.equal(tx.amount.toString());
							});
						});
					}); // END: virgin account to new account

					describe ('virgin account to self', function () {
						var account_before;
						var transactions = [];

						before(function () {
							last_random_account = node.randomAccount();
							var tx = node.lisk.transaction.createTransaction(
								last_random_account.address,
								node.randomNumber(100000000, 1000000000),
								node.gAccount.password
							);
							transactions.push(tx);

							return Promise.promisify(addTransactionsAndForge)(transactions).then(function () {
								return getAccountByAddress(last_random_account.address).then(function (accounts) {
									account_before = accounts[last_random_account.address];

									var tx = node.lisk.transaction.createTransaction(
										account_before.address,
										node.randomNumber(1, new bignum(account_before.balance).minus(10000000).toNumber()),
										last_random_account.password
									);
									transactions.push(tx);

									return Promise.promisify(addTransactionsAndForge)([tx]);
								});
							});
						});

						describe('account', function () {
							var account, tx;

							before(function () {
								tx = last_tx = transactions[1];
								return getAccountByAddress(last_random_account.address).then(function (accounts) {
									account = accounts[last_random_account.address];
								});
							});

							it('should substract only fee', function () {
								account_before.balance = new bignum(account_before.balance).minus(tx.fee).toString();
								expect(account_before.balance).to.equal(account.balance);
								var expected = new bignum(transactions[0].amount).minus(tx.fee).toString();
								expect(account.balance).to.equal(expected);
							});

							it('should not modify transaction_id', function () {
								expect(account.transaction_id).to.not.be.equal(tx.id);
								expect(account.transaction_id).to.be.equal(account_before.transaction_id);
							});

							it('should set public_key, public_key_transaction_id', function () {
								expect(account.public_key).to.be.equal(tx.senderPublicKey);
								expect(account.public_key_transaction_id).to.be.equal(tx.id);
							});
						});
					}); // END: virgin account to self

					describe ('delete block with transaction that issued public_key creation', function () {
						var account_before;

						before(function () {
							return getAccountByAddress(last_random_account.address).then(function (accounts) {
								account_before = accounts[last_random_account.address];
							});
						});

                        describe('after delete last block', function () {
                            var last_block, new_last_block;

                            before(function () {
                                last_block = library.modules.blocks.lastBlock.get();
                                return deleteLastBlockPromise().then(function () {
                                    new_last_block = library.modules.blocks.lastBlock.get();
								})
                            });

                            it('last block ID should be different', function () {
								expect(last_block.id).to.not.equal(new_last_block.id);
                            });

                            it('last block height should be lower by 1', function () {
                                expect(last_block.height).to.equal(new_last_block.height+1);
                            });

                            it('all transactions included in last block should be deleted', function() {
                            	var txs_ids = [];

                                _.each(last_block.transactions, function(tx) {
									txs_ids.push(tx.id);
								});

                                return getTransactionsByIds(txs_ids).then(function (rows) {
                                	expect(rows).to.be.an('array');
                                	expect(rows.length).to.equal(0);
								});
							})
                        });

						describe('account', function () {
							var account;

							before(function () {
								return getAccountByAddress(last_random_account.address).then(function (accounts) {
									account = accounts[last_random_account.address];
								});
							});

							it('should credit fee back', function () {
								account_before.balance = new bignum(account_before.balance).plus(last_tx.fee).toString();
								expect(account_before.balance).to.equal(account.balance);
							});

							it('should set public_key, public_key_transaction_id to NULL', function () {
								expect(account.public_key).to.be.an('null');
								expect(account.public_key_transaction_id).to.be.an('null');
							});

							it('should not modify transaction_id', function () {
								expect(account.transaction_id).to.be.equal(account_before.transaction_id);
							});
						});
					}); // END: delete blocks with transaction that issued public_key creation
				}); // END: type 0 - TRANSFER

				describe('type 1 - SIGNATURE', function () {
					var last_tx;

					describe ('from virgin account', function () {
						var account_before;
						var transactions = [];

						before(function () {
							last_random_account = node.randomAccount();
							var tx = node.lisk.transaction.createTransaction(
								last_random_account.address,
								node.randomNumber(500000000, 1000000000),
								node.gAccount.password
							);
							transactions.push(tx);

							return Promise.promisify(addTransactionsAndForge)(transactions).then(function () {
								return getAccountByAddress(last_random_account.address).then(function (accounts) {
									account_before = accounts[last_random_account.address];

									var tx = node.lisk.signature.createSignature(
										last_random_account.password,
										last_random_account.secondPassword
									);
									transactions.push(tx);

									return Promise.promisify(addTransactionsAndForge)([tx]);
								});
							});
						});

						describe('account', function () {
							var account, tx;

							before(function () {
								tx = last_tx = transactions[1];
								return getAccountByAddress(last_random_account.address).then(function (accounts) {
									account = accounts[last_random_account.address];
								});
							});

							it('should substract only fee', function () {
								account_before.balance = new bignum(account_before.balance).minus(tx.fee).toString();
								expect(account_before.balance).to.equal(account.balance);
								var expected = new bignum(transactions[0].amount).minus(tx.fee).toString();
								expect(account.balance).to.equal(expected);
							});

							it('should not modify transaction_id', function () {
								expect(account.transaction_id).to.not.be.equal(tx.id);
								expect(account.transaction_id).to.be.equal(account_before.transaction_id);
							});

							it('should set public_key, public_key_transaction_id', function () {
								expect(account.public_key).to.be.equal(tx.senderPublicKey);
								expect(account.public_key_transaction_id).to.be.equal(tx.id);
							});

							it('should insert transaction id and signature to signature table', function () {
								return getSignatureByTxId(tx.id).then(function (signatures) {
									expect(signatures.length).to.equal(1);
									var sig = signatures[0];
									expect(sig.transaction_id).to.equal(tx.id);
									expect(sig.second_public_key.toString('hex')).to.equal(last_random_account.secondPublicKey);
								});
							});
						});
					}); // END: from virgin account
				}); // END: type 1 - SIGNATURE

			}); // END: signle transaction
		}); // END: transactions
	});
});
