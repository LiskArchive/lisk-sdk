'use strict';

var async = require('async');
var node = require('./../node.js');

var constants = require('../../helpers/constants.js');

var totalMembers = 15;
var requiredSignatures = 15;
var multisigAccount = node.randomAccount();
var transactions = [];
var validParams;

var accounts = [];
var keysgroup = [];
for (var i = 0; i < totalMembers; i++) {
	accounts[i] = node.randomAccount();
	var member = '+' + accounts[i].publicKey;
	keysgroup.push(member);
}
var passphrases = accounts.map(function (account) {
	return account.password;
});

function sendLISK (account, i, done) {
	var randomLISK = node.randomLISK();

	node.put('/api/transactions/', {
		secret: node.gAccount.password,
		amount: randomLISK,
		recipientId: account.address
	}, function (err, res) {
		node.expect(res.body).to.have.property('success').to.be.ok;
		if (res.body.success && i != null) {
			accounts[i].balance = randomLISK / node.normalizer;
		}
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

before(function (done) {
	validParams = {
		secret: multisigAccount.password,
		lifetime: parseInt(node.randomNumber(1,72)),
		min: requiredSignatures,
		keysgroup: keysgroup
	};

	sendLISK(multisigAccount, 0, function () {
		node.onNewBlock(done);
	});
});

describe('BUG: registering multisig and dapp on the same block', function () {

	it('register multisig and signing the tx inmediately', function (done) {
		node.put('/api/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId').that.is.not.empty;
			transactions.push(res.body.transactionId);
			confirmTransaction(res.body.transactionId, passphrases, done);
		});
	});

	describe('before block confirmation', function () {

		it('TYPE 0 sending funds when sender has funds should be ok', function (done) {
			node.put('/api/transactions/', {
				secret: multisigAccount.password,
				amount: 1,
				recipientId: node.eAccount.address
			}, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				transactions.push(res.body.transactionId);
				done();
			});
		});

		it('TYPE 1 registering second password with valid params should be ok', function (done) {
			validParams = {
				secret: multisigAccount.password,
				secondSecret: multisigAccount.secondPassword
			};

			putSignature(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transaction').that.is.an('object');
				node.expect(res.body.transaction).to.have.property('type').to.equal(node.txTypes.SIGNATURE);
				node.expect(res.body.transaction).to.have.property('senderPublicKey').to.equal(multisigAccount.publicKey);
				node.expect(res.body.transaction).to.have.property('senderId').to.equal(multisigAccount.address);
				node.expect(res.body.transaction).to.have.property('fee').to.equal(node.fees.secondPasswordFee);
				transactions.push(res.body.transaction.id);
				done();
			});
		});

		it('TYPE 2 registering delegate with valid params should be ok', function (done) {
			validParams = {
				secret: multisigAccount.password,
				username: multisigAccount.username
			};

			putDelegates(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transaction').that.is.an('object');
				node.expect(res.body.transaction.fee).to.equal(node.fees.delegateRegistrationFee);
				node.expect(res.body.transaction).to.have.property('asset').that.is.an('object');
				node.expect(res.body.transaction.asset.delegate.username).to.equal(multisigAccount.username.toLowerCase());
				node.expect(res.body.transaction.asset.delegate.publicKey).to.equal(multisigAccount.publicKey);
				node.expect(res.body.transaction.type).to.equal(node.txTypes.DELEGATE);
				node.expect(res.body.transaction.amount).to.equal(0);
				transactions.push(res.body.transaction.id);
				done();
			});
		});

		it('TYPE 3 voting with valid params should be ok', function (done) {
			putAccountsDelegates({
				secret: multisigAccount.password,
				delegates: ['+' + node.eAccount.publicKey]
			}, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transaction').that.is.an('object');
				node.expect(res.body.transaction.type).to.equal(node.txTypes.VOTE);
				node.expect(res.body.transaction.amount).to.equal(0);
				node.expect(res.body.transaction.senderPublicKey).to.equal(multisigAccount.publicKey);
				node.expect(res.body.transaction.fee).to.equal(node.fees.voteFee);
				transactions.push(res.body.transaction.id);
				done();
			});
		});

		it('TYPE 5 registering dapp should be ok', function (done) {
			validParams = {
				secret: multisigAccount.password,
				category: node.randomProperty(node.dappCategories),
				type: node.dappTypes.DAPP,
				name: node.randomApplicationName(),
				description: 'A dapp added via API autotest',
				tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
				link: 'https://github.com/MaxKK/guestbookDapp/archive3/master.zip',
				icon: node.guestbookDapp.icon
			};

			node.put('/api/dapps', validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body.transaction).to.have.property('id');
				transactions.push(res.body.transactionId);
				done();
			});
		});
	});

	describe('after block confirmation', function () {

		it('txs should have been confirmed', function (done) {
			node.onNewBlock( function () {
				async.each(transactions, function(transactionInCheck, eachCb){
					var params = 'id=' + transactionInCheck;

					node.get('/api/transactions/get?' + params, function (err, res) {
						node.expect(res.body).to.have.property('success').to.be.ok;
						node.expect(res.body).to.have.property('transaction').that.is.an('object');
						node.expect(res.body.transaction.id).to.equal(transactionInCheck);
						eachCb();
					});
				}, done);
			});
		});
	});
});
