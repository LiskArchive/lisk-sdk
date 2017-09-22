'use strict';

var async = require('async');
var node = require('./../node.js');

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
		node.expect(res.body).to.have.property('success').to.be.ok;
		done();
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
				node.expect(res.body).to.have.property('transactionId').to.equal(transactionId);
				count++;
				return untilCb();
			});
		},
		function (err) {
			done(err);
		}
	);
}

describe('registering and signing multisig transaction and sending different type of transaction should be ok', function () {

	describe('in the same block', function () {

		var totalMembers = 15;
		var requiredSignatures = 15;
		var validParams;

		var multisigAccount;
		var multisigTransactionId;
		var passphrases;

		beforeEach(function () {
			multisigAccount = node.randomAccount();
			var accounts = [];
			var keysgroup = [];

			for (var i = 0; i < totalMembers; i++) {
				accounts[i] = node.randomAccount();
				var member = '+' + accounts[i].publicKey;
				keysgroup.push(member);
			}

			passphrases = accounts.map(function (account) {
				return account.password;
			});

			validParams = {
				secret: multisigAccount.password,
				lifetime: parseInt(node.randomNumber(1,72)),
				min: requiredSignatures,
				keysgroup: keysgroup
			};
		});

		function checkConfirmedTransactions (ids, cb) {
			async.each(ids, function (id, eachCb) {
				getTransactionById(id, function (err, res) {
					node.expect(err).to.not.exist;
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transaction').that.is.an('object');
					node.expect(res.body.transaction.id).to.equal(id);
					eachCb();
				});
			}, function (err) {
				cb(err);
			});
		}

		beforeEach('send lisk to multisig account', function (done) {
			sendLISK(multisigAccount, 0, function () {
				node.onNewBlock(function (err) {
					node.put('/api/multisignatures', validParams, function (err, res) {
						node.expect(res.body).to.have.property('success').to.be.ok;
						node.expect(res.body).to.have.property('transactionId').that.is.not.empty;
						multisigTransactionId = res.body.transactionId;
						confirmTransaction(res.body.transactionId, passphrases, done);
					});
				});
			});
		});

		it('TYPE 0 sending funds when sender has funds should be ok', function (done) {
			node.put('/api/transactions/', {
				secret: multisigAccount.password,
				amount: 1,
				recipientId: node.eAccount.address
			}, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;

				node.onNewBlock(function () {
					var transactionInCheckId = res.body.transactionId;

					checkConfirmedTransactions([transactionInCheckId, multisigTransactionId], done);
				});
			});
		});

		it('TYPE 1 registering second password with valid params should be ok', function (done) {
			validParams = {
				secret: multisigAccount.password,
				secondSecret: multisigAccount.secondPassword
			};

			putSignature(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;

				node.onNewBlock(function () {
					var transactionInCheckId = res.body.transaction.id;

					checkConfirmedTransactions([transactionInCheckId, multisigTransactionId], done);
				});
			});
		});

		it('TYPE 2 registering delegate with valid params should be ok', function (done) {
			validParams = {
				secret: multisigAccount.password,
				username: multisigAccount.username
			};

			putDelegates(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;

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
				node.expect(res.body).to.have.property('success').to.be.ok;

				node.onNewBlock(function () {
					var transactionInCheckId = res.body.transaction.id;

					checkConfirmedTransactions([transactionInCheckId, multisigTransactionId], done);
				});
			});
		});

		it('TYPE 5 registering dapp should be ok', function (done) {
			var applicationName = node.randomApplicationName();
			validParams = {
				secret: multisigAccount.password,
				category: node.randomProperty(node.dappCategories),
				name: applicationName,
				type: node.dappTypes.DAPP,
				description: 'A dapp added via API autotest',
				tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
				link: 'https://github.com/' + applicationName + '/master.zip',
				icon: node.guestbookDapp.icon
			};

			node.put('/api/dapps', validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;

				node.onNewBlock(function () {
					var transactionInCheckId = res.body.transaction.id;

					checkConfirmedTransactions([transactionInCheckId, multisigTransactionId], done);
				});
			});
		});
	});
});
