'use strict';

var async = require('async');
var node = require('./../node.js');
var expect = node.expect;

var constants = require('../../helpers/constants.js');

function getTransactionById (id, cb) {
	var params = 'id=' + id;
	node.get('/api/transactions/get?' + params, cb);
}

function sendLISK (account, i, cb) {
	var randomLISK = node.randomLISK();

	node.put('/api/transactions/', {
		secret: node.gAccount.password,
		amount: randomLISK,
		recipientId: account.address
	}, function (err, res) {
		expect(res.body.success).to.equal(true);
		cb();
	});
}

function createAccountWithLisk (account, cb) {
	sendLISK(account, 100000, function (err, res) {
		node.onNewBlock(cb);
	});
}

function putSignature (params, cb) {
	node.put('/api/signatures', params, cb);
}

function putDelegates (params, cb) {
	node.put('/api/delegates', params, function (err, res) {
		cb(err, res);
	});
}

function putAccountsDelegates (params, cb) {
	node.put('/api/accounts/delegates', params, function (err, res) {
		cb(err, res);
	});
}

function confirmTransaction (transactionId, passphrases, cb) {
	var count = 0;

	async.until(
		function () {
			return (count >= passphrases.length);
		},
		function (untilCb) {
			var passphrase = passphrases[count];

			node.post('/api/multisignatures/sign', {
				secret: passphrase,
				transactionId: transactionId
			}, function (err, res) {
				if (err || !res.body.success) {
					return untilCb(err || res.body.error);
				}
				expect(res.body.transactionId).to.equal(transactionId);
				count++;
				return untilCb();
			});
		},
		function (err) {
			cb(err);
		}
	);
}

function createDapp (params, cb) {
	var params = {
		secret: params.account.password,
		category: node.randomProperty(node.dappCategories),
		name: params.applicationName,
		type: node.dappTypes.DAPP,
		description: 'A dapp added via API autotest',
		tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
		link: 'https://github.com/' + params.applicationName + '/master.zip',
		icon: node.guestbookDapp.icon
	};

	node.put('/api/dapps', params, cb);
}

function createIntransfer (params, cb) {
	node.put('/api/dapps/transaction', params, cb);
}

function createOutTransfer (params, cb) {
	node.put('/api/dapps/withdrawal', params, cb);
}

function checkConfirmedTransactions (ids, cb) {
	async.each(ids, function (id, eachCb) {
		getTransactionById(id, function (err, res) {
			expect(err).to.not.exist;
			expect(res.body.success).to.equal(true);
			expect(res.body.transaction).to.be.an('object');
			expect(res.body.transaction.id).to.equal(id);
			eachCb(err);
		});
	}, function (err) {
		cb(err);
	});
}


describe('registering and signing multisig transaction and another trasaction from same account', function () {

	var totalMembers = 15;
	var requiredSignatures = 15;

	var multisigAccount;
	var multisigTransactionId;
	var passphrases;
	var accounts = [];
	var keysgroup = [];

	function createMultisignatureAndConfirm (account, cb) {
		keysgroup = [];
		accounts = [];

		for (var i = 0; i < totalMembers; i++) {
			accounts[i] = node.randomAccount();
			var member = '+' + accounts[i].publicKey;
			keysgroup.push(member);
		}

		passphrases = accounts.map(function (account) {
			return account.password;
		});

		var params = {
			secret: account.password,
			lifetime: parseInt(node.randomNumber(1,72)),
			min: requiredSignatures,
			keysgroup: keysgroup
		};

		node.put('/api/multisignatures', params, function (err, res) {
			expect(res.body.success).to.equal(true);
			expect(res.body.transactionId).to.exist;

			multisigTransactionId = res.body.transactionId;
			confirmTransaction(res.body.transactionId, passphrases, function (err, result) {
				expect(err).to.not.exist;
				cb(err, res);
			});
		});
	}

	describe('in the same block for transactions 0 to 5', function () {

		beforeEach(function (done) {
			multisigAccount = node.randomAccount();
			createAccountWithLisk(multisigAccount, function (err, res) {
				expect(err).to.not.exist;
				createMultisignatureAndConfirm(multisigAccount, done);
			});
		});

		it('TYPE 0 sending funds when sender has funds should be ok', function (done) {
			node.put('/api/transactions/', {
				secret: multisigAccount.password,
				amount: 1,
				recipientId: node.eAccount.address
			}, function (err, res) {
				expect(res.body.success).to.equal(true);

				node.onNewBlock(function () {
					var transactionInCheckId = res.body.transactionId;

					checkConfirmedTransactions([transactionInCheckId, multisigTransactionId], done);
				});
			});
		});

		it('TYPE 1 registering second password with valid params should be ok', function (done) {
			var params = {
				secret: multisigAccount.password,
				secondSecret: multisigAccount.secondPassword
			};

			putSignature(params, function (err, res) {
				expect(res.body.success).to.equal(true);

				node.onNewBlock(function () {
					var transactionInCheckId = res.body.transaction.id;

					checkConfirmedTransactions([transactionInCheckId, multisigTransactionId], done);
				});
			});
		});

		it('TYPE 2 registering delegate with valid params should be ok', function (done) {
			var params = {
				secret: multisigAccount.password,
				username: multisigAccount.username
			};

			putDelegates(params, function (err, res) {
				expect(res.body.success).to.equal(true);

				node.onNewBlock(function () {
					var transactionInCheckId = res.body.transaction.id;

					checkConfirmedTransactions([transactionInCheckId, multisigTransactionId], done);
				});
			});
		});

		it('TYPE 3 voting with valid params should be ok', function (done) {
			putAccountsDelegates({
				secret: multisigAccount.password,
				delegates: ['+' + node.eAccount.publicKey]
			}, function (err, res) {
				expect(res.body.success).to.equal(true);

				node.onNewBlock(function () {
					var transactionInCheckId = res.body.transaction.id;

					checkConfirmedTransactions([transactionInCheckId, multisigTransactionId], done);
				});
			});
		});

		it('TYPE 4 creating second multisignature should fail', function (done) {
			var params = {
				secret: multisigAccount.password,
				lifetime: parseInt(node.randomNumber(1,72)),
				min: requiredSignatures,
				keysgroup: keysgroup
			};

			node.put('/api/multisignatures', params, function (err, res) {
				expect(res.body.success).to.equal(true);
				expect(res.body.transactionId).to.exist;

				confirmTransaction(res.body.transactionId, passphrases, function (err) {
					expect(err).to.not.exist;
					expect(res.body.success).to.equal(true);


					var transactionInCheckId = res.body.transactionId;
					node.onNewBlock(function () {
						async.parallel([
							function (cb) {
								checkConfirmedTransactions([transactionInCheckId], cb);
							},
							function (cb) {
								getTransactionById(multisigTransactionId, function (err, res) {
									expect(res.body.success).to.equal(false);
									expect(res.body.error).to.equal('Transaction not found');
									cb(err, res);
								});
							}
						],done);
					});
				});
			});
		});

		it('TYPE 5 registering dapp should be ok', function (done) {
			var applicationName = node.randomApplicationName();
			createDapp({
				account: multisigAccount,
				applicationName: applicationName,
			}, function (err, res) {
				expect(err).to.not.exist;
				expect(res.body.success).to.equal(true);

				var transactionInCheckId = res.body.transaction.id;

				node.onNewBlock(function () {
					checkConfirmedTransactions([transactionInCheckId, multisigTransactionId], done);
				});
			});
		});
	});

	describe('In the same block for transaction types 6 and 7', function () {

		var dappId;

		beforeEach(function (done) {
			multisigAccount = node.randomAccount();
			createAccountWithLisk(multisigAccount, function (err, res) {
				var applicationName = node.randomApplicationName();

				createDapp({
					account: multisigAccount,
					applicationName: applicationName,
				}, function (err, res) {
					expect(err).to.not.exist;
					expect(res.body.success).to.equal(true);

					dappId = res.body.transaction.id;
					node.onNewBlock(done);
				});
			});
		});

		it('TYPE 6 sending IN_TRANSFER transaction should be ok', function (done) {
			async.parallel({
				inTransfer: function (cb) {
					var params = {
						secret: multisigAccount.password,
						dappId: dappId,
						amount: 10000
					};

					createIntransfer(params, function (err, res) {
						expect(err).to.not.exist;
						expect(res.body.success).to.equal(true);
						cb(err, res);
					});
				},
				multisignature: function (cb) {
					createMultisignatureAndConfirm(multisigAccount, function (err, res) {
						expect(err).to.not.exist;
						cb(err, res);
					});
				}
			}, function (err, res) {
				var inTransferTransactionId = res.inTransfer.body.transactionId;

				node.onNewBlock(function () {
					checkConfirmedTransactions([inTransferTransactionId, multisigTransactionId], done);
				});
			});
		});

		it('TYPE 7 sending OUT_TRANSFER transaction should be ok', function (done) {
			var params = {
				secret: multisigAccount.password,
				dappId: dappId,
				amount: 10000
			};

			createIntransfer(params, function (err, res) {
				expect(err).to.not.exist;
				expect(res.body.success).to.equal(true);

				var inTransferId = res.body.transactionId;

				async.parallel({
					outTransfer: function (cb) {
						var outTransferParams = {
							amount: 1000,
							recipientId: '16313739661670634666L',
							dappId: dappId,
							transactionId: inTransferId,
							secret: multisigAccount.password
						};

						createOutTransfer(outTransferParams, function (err, res) {
							expect(err).to.not.exist;
							expect(res.body.success).to.equal(true);
							cb(err, res);
						});
					},
					multisignature: function (cb) {
						createMultisignatureAndConfirm(multisigAccount, cb);
					}
				}, function (err, res) {
					var transactionInCheckId = res.outTransfer.body.transactionId;
					node.onNewBlock(function () {
						checkConfirmedTransactions([transactionInCheckId, multisigTransactionId], done);
					});
				});
			});
		});
	});
});
