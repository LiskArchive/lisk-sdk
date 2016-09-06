'use strict'; /*jslint mocha:true, expr:true */

var async = require('async');
var node = require('./../node.js');

var totalMembers = node.randomNumber(2, 16);
var requiredSignatures = node.randomNumber(2, totalMembers + 1);

var noLISKAccount = node.randomAccount();
var multisigAccount = node.randomAccount();

var accounts = [];
for (var i = 0; i < totalMembers; i++) {
	accounts[i] = node.randomAccount();
}

var multiSigTx = {
	lifetime: 0,
	min: 0,
	members: [],
	txId: ''
};

function sendLISK (account, i, done) {
	var randomLISK = node.randomLISK();

	node.put('/transactions', {
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

function sendLISKFromMultisigAccount (amount, recipient, done) {
	node.put('/transactions', {
		secret: multisigAccount.password,
		amount: amount,
		recipientId: recipient
	}, function (err, res) {
		node.expect(res.body).to.have.property('success').to.be.ok;
		node.expect(res.body).to.have.property('transactionId');
		done(err, res.body.transactionId);
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

			node.post('/multisignatures/sign', {
				secret: passphrase,
				transactionId: transactionId
			}, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
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

// Used for KeysGroup
var Keys;

function makeKeysGroup () {
	var keysgroup = [];
	for (var i = 0; i < totalMembers; i++) {
		var member = '+' + accounts[i].publicKey;
		keysgroup.push(member);
	}
	return keysgroup;
}

before(function (done) {
	var i = 0;
	async.eachSeries(accounts, function (account, eachCb) {
		sendLISK(account, i, function () {
			i++;
			return eachCb();
		});
	}, function (err) {
		return done(err);
	});
});

before(function (done) {
	sendLISK(multisigAccount, null, done);
});

before(function (done) {
	node.onNewBlock(function (err) {
		done(err);
	});
});

describe('PUT /multisignatures', function () {

	before(function (done) {
		Keys = makeKeysGroup();
		done();
	});

	var validParams;

	beforeEach(function (done) {
		validParams = {
			secret: multisigAccount.password,
			lifetime: parseInt(node.randomNumber(1,72)),
			min: requiredSignatures,
			keysgroup: Keys
		};
		done();
	});

	it('when account has 0 LISK should fail', function (done) {
		validParams.secret = noLISKAccount.password;

		node.put('/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using owner\'s public key in keysgroup should fail', function (done) {
		validParams.secret = accounts[accounts.length - 1].password;

		node.put('/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using empty keysgroup should fail', function (done) {
		validParams.keysgroup = [];

		node.put('/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using no keysgroup should fail', function (done) {
		delete validParams.keysgroup;

		node.put('/multisignatures', validParams, function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using string keysgroup should fail', function (done) {
		validParams.keysgroup = 'invalid';

		node.put('/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using no passphase should fail', function (done) {
		delete validParams.secret;

		node.put('/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using invalid passphrase should fail', function (done) {
		validParams.secret = multisigAccount.password + 'inv4lid';

		node.put('/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using no lifetime', function (done) {
		delete validParams.lifetime;

		node.put('/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using string lifetime should fail', function (done) {
		validParams.lifetime = 'invalid';

		node.put('/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using lifetime greater than maximum allowed should fail', function (done) {
		validParams.lifetime = 73;

		node.put('/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using lifetime == 0 should fail', function (done) {
		validParams.lifetime = 0;

		node.put('/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using negative lifetime should fail', function (done) {
		validParams.lifetime = -1;

		node.put('/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using no min should fail', function (done) {
		delete validParams.min;

		node.put('/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using string min should fail', function (done) {
		validParams.min = 'invalid';

		node.put('/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using min greater than the total members should fail', function (done) {
		validParams.min = totalMembers + 5;

		node.put('/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using min == 0 should fail', function (done) {
		validParams.min = 0;

		node.put('/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using negative min should fail', function (done) {
		validParams.min = -1;

		node.put('/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using valid params should be ok', function (done) {
		node.put('/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId');
			if (res.body.success && res.body.transactionId) {
				multiSigTx.txId = res.body.transactionId;
				multiSigTx.lifetime = validParams.lifetime;
				multiSigTx.members = Keys;
				multiSigTx.min = requiredSignatures;
			}
			done();
		});
	});
});

describe('GET /multisignatures/pending', function () {

	it('using invalid public key should fail', function (done) {
		var publicKey = 1234;

		node.get('/multisignatures/pending?publicKey=' + publicKey, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using no public key should be ok', function (done) {
		node.get('/multisignatures/pending?publicKey=', function (err, res) {
			node.expect(res.body).to.have.property('success');
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			node.expect(res.body.transactions.length).to.equal(0);
			done();
		});
	});

	it('using valid public key should be ok', function (done) {
		node.onNewBlock(function (err) {
			node.get('/multisignatures/pending?publicKey=' + multisigAccount.publicKey, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transactions').that.is.an('array');
				node.expect(res.body.transactions.length).to.be.at.least(1);
				var flag = 0;
				for (var i = 0; i < res.body.transactions.length; i++) {
					if (res.body.transactions[i].transaction.senderPublicKey === multisigAccount.publicKey) {
						flag += 1;
						node.expect(res.body.transactions[i].transaction).to.have.property('type').to.equal(node.txTypes.MULTI);
						node.expect(res.body.transactions[i].transaction).to.have.property('amount').to.equal(0);
						node.expect(res.body.transactions[i].transaction).to.have.property('asset').that.is.an('object');
						node.expect(res.body.transactions[i].transaction).to.have.property('fee').to.equal(node.fees.multisignatureRegistrationFee * (Keys.length + 1));
						node.expect(res.body.transactions[i].transaction).to.have.property('id').to.equal(multiSigTx.txId);
						node.expect(res.body.transactions[i].transaction).to.have.property('senderPublicKey').to.equal(multisigAccount.publicKey);
						node.expect(res.body.transactions[i]).to.have.property('lifetime').to.equal(multiSigTx.lifetime);
						node.expect(res.body.transactions[i]).to.have.property('min').to.equal(multiSigTx.min);
					}
				}
				node.expect(flag).to.equal(1);
				node.onNewBlock(function (err) {
					done();
				});
			});
		});
	});
});

describe('PUT /api/transactions', function () {

	it('when group transaction is pending should be ok', function (done) {
		sendLISKFromMultisigAccount(100000000, node.gAccount.address, function (err, transactionId) {
			node.onNewBlock(function (err) {
				node.get('/transactions/get?id=' + transactionId, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transaction');
					node.expect(res.body.transaction).to.have.property('id').to.equal(transactionId);
					done();
				});
			});
		});
	});
});

describe('POST /multisignatures/sign (group)', function () {

	it('using random passphrase should fail', function (done) {
		var account = node.randomAccount();

		node.post('/multisignatures/sign', {
			secret: account.password,
			transactionId: multiSigTx.txId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			done();
		});
	});

	it('using null passphrase should fail', function (done) {
		node.post('/multisignatures/sign', {
			secret: null,
			transactionId: multiSigTx.txId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			done();
		});
	});

	it('using undefined passphrase should fail', function (done) {
		node.post('/multisignatures/sign', {
			secret: undefined,
			transactionId: multiSigTx.txId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			done();
		});
	});

	it('using one less than total signatures should not confirm transaction', function (done) {
		var passphrases = accounts.map(function (account) {
			return account.password;
		});

		confirmTransaction(multiSigTx.txId, passphrases.slice(0, (passphrases.length - 1)), function () {
			node.onNewBlock(function (err) {
				node.get('/transactions/get?id=' + multiSigTx.txId, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
			});
		});
	});

	it('using one more signature should confirm transaction', function (done) {
		var passphrases = accounts.map(function (account) {
			return account.password;
		});

		confirmTransaction(multiSigTx.txId, passphrases.slice(-1), function () {
			node.onNewBlock(function (err) {
				node.get('/transactions/get?id=' + multiSigTx.txId, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transaction');
					node.expect(res.body.transaction).to.have.property('id').to.equal(multiSigTx.txId);
					done();
				});
			});
		});
	});
});

describe('POST /multisignatures/sign (transaction)', function () {

	before(function (done) {
		sendLISKFromMultisigAccount(100000000, node.gAccount.address, function (err, transactionId) {
			multiSigTx.txId = transactionId;
			done();
		});
	});

	it('using one less than minimum signatures should not confirm transaction', function (done) {
		var passphrases = accounts.map(function (account) {
			return account.password;
		});

		confirmTransaction(multiSigTx.txId, passphrases.slice(0, (multiSigTx.min - 1)), function () {
			node.onNewBlock(function (err) {
				node.get('/transactions/get?id=' + multiSigTx.txId, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
			});
		});
	});

	it('using one more signature should confirm transaction', function (done) {
		var passphrases = accounts.map(function (account) {
			return account.password;
		});

		confirmTransaction(multiSigTx.txId, passphrases.slice(-1), function () {
			node.onNewBlock(function (err) {
				node.get('/transactions/get?id=' + multiSigTx.txId, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transaction');
					node.expect(res.body.transaction).to.have.property('id').to.equal(multiSigTx.txId);
					done();
				});
			});
		});
	});
});
