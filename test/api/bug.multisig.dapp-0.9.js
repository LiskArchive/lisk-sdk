'use strict';

var async = require('async');
var node = require('./../node.js');
var expect = node.expect;

var constants = require('../../helpers/constants.js');

function getTransactionById (id, cb) {
	var params = 'id=' + id;
	node.get('/api/transactions/get?' + params, cb);
}

function sendLISK (account, i, done) {
	var randomLISK = node.randomLISK();

	node.put('/api/transactions/', {
		secret: node.gAccount.password,
		amount: randomLISK,
		recipientId: account.address
	}, function (err, res) {
		expect(res.body).to.have.property('success').to.be.ok;
		done();
	});
}

function createAccountWithLisk (account, done) {
	sendLISK(account, 100000, function (err, res) {
		node.onNewBlock(done);
	});
}

function putSignature (params, done) {
	node.put('/api/signatures', params, done);
}

function putDelegates (params, done) {
	node.put('/api/delegates', params, function (err, res) {
		done(err, res);
	});
}

function putAccountsDelegates (params, done) {
	node.put('/api/accounts/delegates', params, function (err, res) {
		done(err, res);
	});
}

function confirmTransaction (transactionId, passphrases, done) {
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
				expect(res.body).to.have.property('transactionId').to.equal(transactionId);
				count++;
				return untilCb();
			});
		},
		function (err) {
			done(err);
		}
	);
}

function createDapp (params, done) {
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

	node.put('/api/dapps', params, done);
}

function createIntransfer (params, done) {
	node.put('/api/dapps/transaction', params, done);
}

function createOutTransfer (params, cb) {
	node.put('/api/dapps/withdrawal', params, cb);
}

function checkConfirmedTransactions (ids, cb) {
	async.each(ids, function (id, eachCb) {
		getTransactionById(id, function (err, res) {
			expect(err).to.not.exist;
			expect(res.body).to.have.property('success').to.be.ok;
			expect(res.body).to.have.property('transaction').that.is.an('object');
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
			expect(res.body).to.have.property('success').to.be.ok;
			expect(res.body).to.have.property('transactionId').that.is.not.empty;
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
				expect(res.body).to.have.property('success').to.be.ok;

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
				expect(res.body).to.have.property('success').to.be.ok;

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
				expect(res.body).to.have.property('success').to.be.ok;

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
				expect(res.body).to.have.property('success').to.be.ok;

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
				expect(res.body).to.have.property('success').to.be.ok;
				expect(res.body).to.have.property('transactionId').that.is.not.empty;
				confirmTransaction(res.body.transactionId, passphrases, function (err) {
					expect(err).to.not.exist;

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

					dappId = res.body.transaction.id;
					node.onNewBlock(done);
				});
			});
		});

		it('TYPE 6 sending IN_TRANSFER transaction should be ok', function (done) {
			async.parallel({
				inTransfer: function (cb) {
					var params = {
						secret: multisigAccount,
						dappId: dappId,
						amount: 10000
					};
					createIntransfer(params, cb);
				},
				multisignature: function (cb) {
					createMultisignatureAndConfirm(multisigAccount, cb);
				}
			}, function (err, res) {
				expect(err).to.not.exist;

				var inTransferTransactionId = res.inTransfer.body.transactionId;

				node.onNewBlock(function () {
					checkConfirmedTransactions([inTransferTransactionId, multisigTransactionId], done);
				});
			});
		});

		it('TYPE 7 sending OUT_TRANSFER transaction should be ok', function (done) {
			var params = {
				secret: multisigAccount,
				dappId: dappId,
				amount: 10000
			};

			createIntransfer(params, function (err, res) {
				expect(err).to.not.exist;

				var inTransferId = res.body.transactionId;

				var outTransferParams = {
					amount: 1000,
					recipientId: '16313739661670634666L',
					dappId: dappId,
					transactionId: inTransferId,
					secret: multisigAccount.password
				};

				createOutTransfer(outTransferParams, function (err, res) {
					expect(err).to.not.exist;

					var transactionInCheckId = res.body.transactionId;
					node.onNewBlock(function () {
						checkConfirmedTransactions([transactionInCheckId, multisigTransactionId], done);
					});
				});
			});
		});
	});
});
