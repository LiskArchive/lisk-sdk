'use strict';

var async = require('async');
var node = require('./../node.js');

var totalMembers = node.randomNumber(2, 16);
var requiredSignatures = node.randomNumber(2, totalMembers + 1);
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

function sendLISKFromMultisigAccount (amount, recipient, done) {
	node.put('/api/transactions/', {
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

describe('PUT /api/multisignatures', function () {

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

	it('using random passphase should fail', function (done) {
		validParams.secret = node.randomPassword();

		node.put('/api/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.match(/Account does not have enough LSK: [0-9]+L balance: 0/);
			done();
		});
	});

	it('using owner\'s public key in keysgroup should fail', function (done) {
		validParams.secret = accounts[accounts.length - 1].password;

		node.put('/api/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using empty keysgroup should fail', function (done) {
		validParams.keysgroup = [];

		node.put('/api/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using no keysgroup should fail', function (done) {
		delete validParams.keysgroup;

		node.put('/api/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using string keysgroup should fail', function (done) {
		validParams.keysgroup = 'invalid';

		node.put('/api/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using no passphase should fail', function (done) {
		delete validParams.secret;

		node.put('/api/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using invalid passphrase should fail', function (done) {
		validParams.secret = multisigAccount.password + 'inv4lid';

		node.put('/api/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using no lifetime', function (done) {
		delete validParams.lifetime;

		node.put('/api/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using string lifetime should fail', function (done) {
		validParams.lifetime = 'invalid';

		node.put('/api/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using lifetime greater than maximum allowed should fail', function (done) {
		validParams.lifetime = 73;

		node.put('/api/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using lifetime == 0 should fail', function (done) {
		validParams.lifetime = 0;

		node.put('/api/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using negative lifetime should fail', function (done) {
		validParams.lifetime = -1;

		node.put('/api/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using no min should fail', function (done) {
		delete validParams.min;

		node.put('/api/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using string min should fail', function (done) {
		validParams.min = 'invalid';

		node.put('/api/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using min greater than the total members should fail', function (done) {
		validParams.min = totalMembers + 5;

		node.put('/api/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using min == 0 should fail', function (done) {
		validParams.min = 0;

		node.put('/api/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using negative min should fail', function (done) {
		validParams.min = -1;

		node.put('/api/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using valid params should be ok', function (done) {
		node.put('/api/multisignatures', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId').that.is.not.empty;
			multiSigTx.txId = res.body.transactionId;
			multiSigTx.lifetime = validParams.lifetime;
			multiSigTx.members = Keys;
			multiSigTx.min = requiredSignatures;
			done();
		});
	});
});

describe('GET /api/multisignatures/pending', function () {

	before(function (done) {
		node.onNewBlock(done);
	});

	it('using invalid public key should fail', function (done) {
		var publicKey = 1234;

		node.get('/api/multisignatures/pending?publicKey=' + publicKey, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using no public key should be ok', function (done) {
		node.get('/api/multisignatures/pending?publicKey=', function (err, res) {
			node.expect(res.body).to.have.property('success');
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			node.expect(res.body.transactions.length).to.equal(0);
			done();
		});
	});

	it('using valid public key should be ok', function (done) {
		node.get('/api/multisignatures/pending?publicKey=' + multisigAccount.publicKey, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			node.expect(res.body.transactions.length).to.be.at.least(1);

			var flag = 0;
			for (var i = 0; i < res.body.transactions.length; i++) {
				flag += 1;

				var pending = res.body.transactions[i];

				node.expect(pending).to.have.property('max').that.is.equal(0);
				node.expect(pending).to.have.property('min').that.is.equal(0);
				node.expect(pending).to.have.property('lifetime').that.is.equal(0);
				node.expect(pending).to.have.property('signed').that.is.true;

				node.expect(pending.transaction).to.have.property('type').that.is.equal(node.txTypes.MULTI);
				node.expect(pending.transaction).to.have.property('amount').that.is.equal(0);
				node.expect(pending.transaction).to.have.property('senderPublicKey').that.is.equal(multisigAccount.publicKey);
				node.expect(pending.transaction).to.have.property('requesterPublicKey').that.is.null;
				node.expect(pending.transaction).to.have.property('timestamp').that.is.a('number');
				node.expect(pending.transaction).to.have.property('asset').that.is.an('object');
				node.expect(pending.transaction.asset).to.have.property('multisignature').that.is.an('object');
				node.expect(pending.transaction.asset.multisignature).to.have.property('min').that.is.a('number');
				node.expect(pending.transaction.asset.multisignature).to.have.property('keysgroup').that.is.an('array');
				node.expect(pending.transaction.asset.multisignature).to.have.property('lifetime').that.is.a('number');
				node.expect(pending.transaction).to.have.property('recipientId').that.is.null;
				node.expect(pending.transaction).to.have.property('signature').that.is.a('string');
				node.expect(pending.transaction).to.have.property('id').that.is.equal(multiSigTx.txId);
				node.expect(pending.transaction).to.have.property('fee').that.is.equal(node.fees.multisignatureRegistrationFee * (Keys.length + 1));
				node.expect(pending.transaction).to.have.property('senderId').that.is.eql(multisigAccount.address);
				node.expect(pending.transaction).to.have.property('receivedAt').that.is.a('string');
			}

			node.expect(flag).to.equal(1);
			done();
		});
	});
});

describe('PUT /api/transactions', function () {

	it('when group transaction is pending should be ok', function (done) {
		sendLISKFromMultisigAccount(100000000, node.gAccount.address, function (err, transactionId) {
			node.onNewBlock(function (err) {
				node.get('/api/transactions/get?id=' + transactionId, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transaction');
					node.expect(res.body.transaction).to.have.property('id').to.equal(transactionId);
					done();
				});
			});
		});
	});
});

describe('POST /api/multisignatures/sign (group)', function () {

	var validParams;

	var passphrases = accounts.map(function (account) {
		return account.password;
	});

	beforeEach(function (done) {
		validParams = {
			secret: accounts[0].password,
			transactionId: multiSigTx.txId
		};
		done();
	});

	it('using random passphrase should fail', function (done) {
		validParams.secret = node.randomPassword();

		node.post('/api/multisignatures/sign', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			done();
		});
	});

	it('using null passphrase should fail', function (done) {
		validParams.secret = null;

		node.post('/api/multisignatures/sign', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			done();
		});
	});

	it('using undefined passphrase should fail', function (done) {
		validParams.secret = undefined;

		node.post('/api/multisignatures/sign', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			done();
		});
	});

	it('using one less than total signatures should not confirm transaction', function (done) {
		confirmTransaction(multiSigTx.txId, passphrases.slice(0, (passphrases.length - 1)), function () {
			node.onNewBlock(function (err) {
				node.get('/api/transactions/get?id=' + multiSigTx.txId, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
			});
		});
	});

	it('using same signature again should fail', function (done) {
		node.post('/api/multisignatures/sign', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Transaction already signed');
			done();
		});
	});

	it('using same signature again should not confirm transaction', function (done) {
		node.post('/api/multisignatures/sign', validParams, function (err, res) {
			node.onNewBlock(function (err) {
				node.get('/api/transactions/get?id=' + multiSigTx.txId, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
			});
		});
	});

	it('using one more signature should confirm transaction', function (done) {
		confirmTransaction(multiSigTx.txId, passphrases.slice(-1), function () {
			node.onNewBlock(function (err) {
				node.get('/api/transactions/get?id=' + multiSigTx.txId, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transaction');
					node.expect(res.body.transaction).to.have.property('id').to.equal(multiSigTx.txId);
					done();
				});
			});
		});
	});
});

describe('POST /api/multisignatures/sign (transaction)', function () {

	var validParams;

	var passphrases = accounts.map(function (account) {
		return account.password;
	});

	before(function (done) {
		sendLISKFromMultisigAccount(100000000, node.gAccount.address, function (err, transactionId) {
			multiSigTx.txId = transactionId;
			node.onNewBlock(function (err) {
				done();
			});
		});
	});

	beforeEach(function (done) {
		validParams = {
			secret: accounts[0].password,
			transactionId: multiSigTx.txId
		};
		done();
	});

	it('using one less than minimum signatures should not confirm transaction', function (done) {
		confirmTransaction(multiSigTx.txId, passphrases.slice(0, (multiSigTx.min - 1)), function () {
			node.onNewBlock(function (err) {
				node.get('/api/transactions/get?id=' + multiSigTx.txId, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
			});
		});
	});

	it('using same signature again should fail', function (done) {
		node.post('/api/multisignatures/sign', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('Transaction already signed');
			done();
		});
	});

	it('using same signature again should not confirm transaction', function (done) {
		node.post('/api/multisignatures/sign', validParams, function (err, res) {
			node.onNewBlock(function (err) {
				node.get('/api/transactions/get?id=' + multiSigTx.txId, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
			});
		});
	});

	it('using one more signature should confirm transaction', function (done) {
		confirmTransaction(multiSigTx.txId, passphrases.slice(-1), function () {
			node.onNewBlock(function (err) {
				node.get('/api/transactions/get?id=' + multiSigTx.txId, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transaction');
					node.expect(res.body.transaction).to.have.property('id').to.equal(multiSigTx.txId);
					done();
				});
			});
		});
	});
});

describe('POST /api/multisignatures/sign (regular account)', function () {

	var transactionId;

	before(function (done) {
		node.put('/api/transactions/', {
			secret: node.gAccount.password ,
			amount: 1,
			recipientId: accounts[0].address
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId').that.is.not.empty;
			transactionId = res.body.transactionId;
			done();
		});
	});

	it('should be impossible to sign the transaction', function (done) {
		node.onNewBlock(function (err) {
			node.get('/api/transactions/get?id=' + transactionId, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transaction');
				node.expect(res.body.transaction).to.have.property('id').to.equal(transactionId);
				confirmTransaction(transactionId, [multisigAccount.password], function (err, res) {
					node.expect(err).not.to.be.empty;
					done();
				});
			});
		});
	});

	it('should have no pending multisignatures', function (done) {
		node.get('/api/multisignatures/pending?publicKey=' + accounts[0].publicKey, function (err, res) {
			node.expect(res.body).to.have.property('success');
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			node.expect(res.body.transactions.length).to.equal(0);
			done();
		});
	});
});
