'use strict';

var node = require('./../node.js');
var clearDatabaseTable = require('../common/globalBefore').clearDatabaseTable;
var modulesLoader = require('../common/initModule').modulesLoader;

var dapp = {};
var account = node.randomTxAccount();
var account2 = node.randomTxAccount();

function openAccount (account, done) {
	node.post('/api/accounts/open', {
		secret: account.password
	}, function (err, res) {
		node.expect(res.body).to.have.property('success').to.be.ok;
		node.expect(res.body).to.have.property('account').that.is.an('object');
		account.address = res.body.account.address;
		account.publicKey = res.body.account.publicKey;
		account.balance = res.body.account.balance;
		done(err, res);
	});
}

function putTransaction (params, done) {
	node.put('/api/transactions/', params, function (err, res) {
		node.expect(res.body).to.have.property('success').to.be.ok;
		node.onNewBlock(function (err) {
			done(err, res);
		});
	});
}

before(function (done) {
	modulesLoader.getDbConnection(function (err, db) {
		if (err) {
			return done(err);
		}

		node.async.every(['dapps', 'outtransfer', 'intransfer'], function (table, cb) {
			clearDatabaseTable(db, modulesLoader.logger, table, cb);
		}, done);
	});
});

before(function (done) {
	// Send to LISK to account 1 address
	setTimeout(function () {
		var randomLISK = node.randomLISK();
		var expectedFee = node.expectedFee(randomLISK);

		putTransaction({
			secret: node.gAccount.password,
			amount: randomLISK,
			recipientId: account.address
		}, done);
	}, 2000);
});

before(function (done) {
	// Send to LISK to account 2 address
	setTimeout(function () {
		var randomLISK = node.randomLISK();
		var expectedFee = node.expectedFee(randomLISK);

		putTransaction({
			secret: node.gAccount.password,
			amount: randomLISK,
			recipientId: account2.address
		}, done);
	}, 2000);
});

var validDapp;

beforeEach(function (done) {
	validDapp = {
		secret: account.password,
		category: node.randomProperty(node.dappCategories),
		type: node.dappTypes.DAPP,
		name: node.randomApplicationName(),
		description: 'A dapp added via API autotest',
		tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
		link: node.guestbookDapp.link,
		icon: node.guestbookDapp.icon
	};
	done();
});

describe('PUT /dapps', function () {

	var validParams;

	beforeEach(function (done) {
		validParams = validDapp;
		validParams.link = validParams.link.replace(/\.zip/, node.randomApplicationName() + '.zip');
		done();
	});

	it('using account with no funds should fail', function (done) {
		validParams.secret = node.randomPassword();

		node.put('/api/dapps', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.match(/Account does not have enough LSK: [0-9]+L balance: 0/);
			done();
		});
	});

	it('using no name should fail', function (done) {
		delete validParams.name;

		node.put('/api/dapps', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using very long name should fail', function (done) {
		validParams.name = 'Lorem ipsum dolor sit amet, conse';

		node.put('/api/dapps', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using numeric name should fail', function (done) {
		validParams.name = 12345;

		node.put('/api/dapps', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using very long description should fail', function (done) {
		validParams.description = 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient c';

		node.put('/api/dapps', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using numeric description should fail', function (done) {
		validParams.description = 12345;

		node.put('/api/dapps', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using very long tag should fail', function (done) {
		validParams.tags = 'develop,rice,voiceless,zonked,crooked,consist,price,extend,sail,treat,pie,massive,fail,maid,summer,verdant,visitor,bushes,abrupt,beg,black-and-white,flight,twist';

		node.put('/api/dapps', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using numeric tags should fail', function (done) {
		validParams.tags = 12345;

		node.put('/api/dapps', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using numeric link should fail', function (done) {
		validParams.link = 12345;

		node.put('/api/dapps', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using numeric icon should fail', function (done) {
		validParams.icon = 12345;

		node.put('/api/dapps', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	describe('from account with second signature enabled', function (done) {
		before(function (done) {
			node.put('/api/signatures', {
				secret: account2.password,
				secondSecret: account2.secondPassword
			}, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transaction').that.is.an('object');
				node.onNewBlock(done);
			});
		});

		beforeEach(function (done) {
			validParams.secret = account2.password;
			validParams.secondSecret = account2.secondPassword;
			done();
		});

		it('using no second passphrase should fail', function (done) {
			delete validParams.secondSecret;

			node.put('/api/dapps', validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
		});

		it('using invalid second passphrase should fail', function (done) {
			validParams.secondSecret = node.randomPassword();

			node.put('/api/dapps', validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
		});

		it('using valid second passphrase should be ok', function (done) {
			validParams.secondSecret = account2.secondPassword;

			node.put('/api/dapps', validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				done();
			});
		});
	});

	it('using valid params should be ok', function (done) {
		validParams.link = node.guestbookDapp.link;

		node.put('/api/dapps', validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body.transaction).to.have.property('id');
			dapp = validParams;
			dapp.transactionId = res.body.transaction.id;
			done();
		});
	});

	it('using existing dapp name should fail', function (done) {
		validParams.name = dapp.name;

		node.onNewBlock(function (err) {
			node.put('/api/dapps', validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
		});
	});

	it('using existing dapp link should fail', function (done) {
		validParams.link = dapp.link;

		node.onNewBlock(function (err) {
			node.put('/api/dapps', validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
		});
	});
});

describe('PUT /api/dapps/transaction', function () {

	function putTransaction (params, done) {
		node.put('/api/dapps/transaction', params, done);
	}

	before(function (done) {
		node.expect(dapp).to.be.a('object');
		node.expect(dapp).to.have.property('transactionId').to.be.not.null;
		done();
	});

	var validParams;

	beforeEach(function (done) {
		validParams = {
			secret: account.password,
			dappId: dapp.transactionId,
			amount: 100000000
		};
		done();
	});

	it('using no secret should fail', function (done) {
		delete validParams.secret;

		putTransaction(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: secret');
			done();
		});
	});

	it('using random secret should fail', function (done) {
		validParams.secret = node.randomPassword();

		putTransaction(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.match(/Account does not have enough LSK: [0-9]+L balance: 0/);
			done();
		});
	});

	it('using secret with length > 100 should fail', function (done) {
		validParams.secret = 'major patient image mom reject theory glide brisk polar source rely inhale major patient image mom re';

		putTransaction(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too long (101 chars), maximum 100');
			done();
		});
	});

	it('using no amount should fail', function (done) {
		delete validParams.amount;

		putTransaction(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: amount');
			done();
		});
	});

	it('using amount < 0 should fail', function (done) {
		validParams.amount = -1;

		putTransaction(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value -1 is less than minimum 1');
			done();
		});
	});

	it('using amount > balance should fail', function (done) {
		openAccount(account, function (err, res) {
			validParams.amount = new node.bignum(account.balance).plus('1').toNumber();

			putTransaction(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.not.be.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
		});
	});

	it('using amount > 100M should fail', function (done) {
		validParams.amount = 10000000000000002;

		putTransaction(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value 10000000000000002 is greater than maximum 10000000000000000');
			done();
		});
	});

	it('using numeric publicKey should fail', function (done) {
		validParams.publicKey = 1;

		putTransaction(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type string but found type integer');
			done();
		});
	});

	it('using numeric secondSecret should fail', function (done) {
		validParams.secondSecret = 1;

		putTransaction(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type string but found type integer');
			done();
		});
	});

	it('using secondSecret with length > 100 should fail', function (done) {
		validParams.secondSecret = 'major patient image mom reject theory glide brisk polar source rely inhale major patient image mom re';

		putTransaction(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too long (101 chars), maximum 100');
			done();
		});
	});

	it('using no dappId should fail', function (done) {
		delete validParams.dappId;

		putTransaction(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: dappId');
			done();
		});
	});

	it('using numeric dappId should fail', function (done) {
		validParams.dappId = 1;

		putTransaction(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type string but found type integer');
			done();
		});
	});

	it('using dappId with length > 20 should fail', function (done) {
		validParams.dappId = '012345678901234567890';

		putTransaction(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too long (21 chars), maximum 20');
			done();
		});
	});

	it('using unknown dappId', function (done) {
		validParams.dappId = '8713095156789756398';

		putTransaction(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Application not found: ' + validParams.dappId);
			done();
		});
	});

	it('using numeric multisigAccountPublicKey should fail', function (done) {
		validParams.multisigAccountPublicKey = 1;

		putTransaction(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type string but found type integer');
			done();
		});
	});

	it('using valid params should be ok', function (done) {
		putTransaction(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId').to.not.be.empty;
			done();
		});
	});
});

describe('PUT /api/dapps/withdrawal', function () {

	function putWithdrawal (params, done) {
		node.put('/api/dapps/withdrawal', params, done);
	}

	before(function (done) {
		node.expect(dapp).to.be.a('object');
		node.expect(dapp).to.have.property('transactionId').to.be.not.null;
		done();
	});

	var validParams;

	beforeEach(function (done) {
		var randomAccount = node.randomTxAccount();
		var keys = node.lisk.crypto.getKeys(randomAccount.password);
		var recipientId = node.lisk.crypto.getAddress(keys.publicKey);
		var transaction = node.lisk.transaction.createTransaction(randomAccount.address, 100000000, account.password);

		validParams = {
			secret: account.password,
			amount: 100000000,
			dappId: dapp.transactionId,
			transactionId: transaction.id,
			recipientId: recipientId
		};

		done();
	});

	it('using no secret should fail', function (done) {
		delete validParams.secret;

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: secret');
			done();
		});
	});

	it('using random secret should fail', function (done) {
		validParams.secret = node.randomPassword();

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.match(/Account does not have enough LSK: [0-9]+L balance: 0/);
			done();
		});
	});

	it('using secret with length > 100 should fail', function (done) {
		validParams.secret = 'major patient image mom reject theory glide brisk polar source rely inhale major patient image mom re';

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too long (101 chars), maximum 100');
			done();
		});
	});

	it('using no amount should fail', function (done) {
		delete validParams.amount;

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: amount');
			done();
		});
	});

	it('using amount < 0 should fail', function (done) {
		validParams.amount = -1;

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value -1 is less than minimum 1');
			done();
		});
	});

	it('using amount > balance should fail', function (done) {
		openAccount(account, function (err, res) {
			validParams.amount = new node.bignum(account.balance).plus('1').toNumber();

			putWithdrawal(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.not.be.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
		});
	});

	it('using amount > 100M should fail', function (done) {
		validParams.amount = 10000000000000002;

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value 10000000000000002 is greater than maximum 10000000000000000');
			done();
		});
	});

	it('using numeric secondSecret should fail', function (done) {
		validParams.secondSecret = 1;

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type string but found type integer');
			done();
		});
	});

	it('using secondSecret with length > 100 should fail', function (done) {
		validParams.secondSecret = 'major patient image mom reject theory glide brisk polar source rely inhale major patient image mom re';

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too long (101 chars), maximum 100');
			done();
		});
	});

	it('using no dappId should fail', function (done) {
		delete validParams.dappId;

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: dappId');
			done();
		});
	});

	it('using numeric dappId should fail', function (done) {
		validParams.dappId = 1;

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type string but found type integer');
			done();
		});
	});

	it('using alphanumeric dappId should fail', function (done) {
		validParams.dappId = '1L';

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Object didn\'t pass validation for format id: 1L');
			done();
		});
	});

	it('using blank dappId should fail', function (done) {
		validParams.dappId = '';

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too short (0 chars), minimum 1');
			done();
		});
	});

	it('using dappId with length > 20 should fail', function (done) {
		validParams.dappId = '012345678901234567890';

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too long (21 chars), maximum 20');
			done();
		});
	});

	it('using unknown dappId', function (done) {
		validParams.dappId = '8713095156789756398';

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Application not found: ' + validParams.dappId);
			done();
		});
	});

	it('using no transactionId should fail', function (done) {
		delete validParams.transactionId;

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: transactionId');
			done();
		});
	});

	it('using numeric transactionId should fail', function (done) {
		validParams.transactionId = 1;

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type string but found type integer');
			done();
		});
	});

	it('using alphanumeric transactionId should fail', function (done) {
		validParams.transactionId = '1L';

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Object didn\'t pass validation for format id: 1L');
			done();
		});
	});

	it('using blank transactionId should fail', function (done) {
		validParams.transactionId = '';

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too short (0 chars), minimum 1');
			done();
		});
	});

	it('using transactionId with length > 20 should fail', function (done) {
		validParams.transactionId = '012345678901234567890';

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too long (21 chars), maximum 20');
			done();
		});
	});

	it('using no recipientId should fail', function (done) {
		delete validParams.recipientId;

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: recipientId');
			done();
		});
	});

	it('using numeric recipientId should fail', function (done) {
		validParams.recipientId = 12;

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type string but found type integer');
			done();
		});
	});

	it('using recipientId with length < 2 should fail', function (done) {
		validParams.recipientId = '1';

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Object didn\'t pass validation for format address: 1');
			done();
		});
	});

	it('using recipientId with length > 22 should fail', function (done) {
		validParams.recipientId = '0123456789012345678901L';

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too long (23 chars), maximum 22');
			done();
		});
	});

	it('using recipientId without an "L" should fail', function (done) {
		validParams.recipientId = validParams.recipientId.replace('L', '');

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.match(/Object didn\'t pass validation for format address: [0-9]+/);
			done();
		});
	});

	it('using numeric multisigAccountPublicKey should fail', function (done) {
		validParams.multisigAccountPublicKey = 1;

		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type string but found type integer');
			done();
		});
	});

	it('using valid params should be ok', function (done) {
		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId').to.not.be.empty;
			done();
		});
	});

	it('using same valid params twice should fail', function (done) {
		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId').to.not.be.empty;

			putWithdrawal(validParams, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error').to.contain('Transaction is already processed');
				done();
			});
		});
	});

	it('using already confirmed params after new block should fail', function (done) {
		putWithdrawal(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId').to.not.be.empty;

			node.onNewBlock(function (err) {
				putWithdrawal(validParams, function (err, res) {
					node.expect(res.body).to.have.property('success').to.not.be.ok;
					node.expect(res.body).to.have.property('error').to.equal('Transaction is already confirmed: ' + validParams.transactionId);
					done();
				});
			});
		});
	});
});

describe('GET /dapps', function () {

	before(function (done) {
		node.onNewBlock(done);
	});

	function getDapps (params, done) {
		node.get('/api/dapps?' + params, done);
	}

	it('user orderBy == "category:asc" should be ok', function (done) {
		getDapps('orderBy=' + 'category:asc', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			if (res.body.dapps[0] != null) {
				for (var i = 0; i < res.body.dapps.length; i++) {
					if (res.body.dapps[i + 1] != null) {
						node.expect(res.body.dapps[i].category).to.be.at.most(res.body.dapps[i + 1].category);
					}
				}
			}
			done();
		});
	});

	it('user orderBy == "category:desc" should be ok', function (done) {
		getDapps('orderBy=' + 'category:desc', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			if (res.body.dapps[0] != null) {
				for (var i = 0; i < res.body.dapps.length; i++) {
					if (res.body.dapps[i + 1] != null) {
						node.expect(res.body.dapps[i].category).to.be.at.least(res.body.dapps[i + 1].category);
					}
				}
			}
			done();
		});
	});

	it('using category should be ok', function (done) {
		var randomCategory = node.randomProperty(node.dappCategories, true);

		getDapps('category=' + randomCategory, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			if (res.body.dapps.length > 0) {
				node.expect(res.body.dapps[0].category).to.equal(node.dappCategories[randomCategory]);
			}
			done();
		});
	});

	it('using name should be ok', function (done) {
		var name = '';

		if (dapp !== {} && dapp != null) {
			name = dapp.name;
		} else {
			name = 'test';
		}

		getDapps('name=' + name, function (err, res) {
			node.expect(res.body).to.have.property('success');
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			if (name !== 'test') {
				node.expect(res.body.dapps).to.have.length.above(0);
				node.expect(res.body.dapps[0].name).to.equal(name);
			}
			done();
		});
	});

	it('using type should be ok', function (done) {
		var type = node.randomProperty(node.dappTypes);

		getDapps('type=' + type, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			for (var i = 0; i < res.body.dapps.length; i++) {
				if (res.body.dapps[i] != null) {
					node.expect(res.body.dapps[i].type).to.equal(type);
				}
			}
			done();
		});
	});

	it('using numeric link should fail', function (done) {
		var link = 12345;

		getDapps('link=' + link, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using string link should be ok', function (done) {
		var link = node.guestbookDapp.link;

		getDapps('link=' + link, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			for (var i = 0; i < res.body.dapps.length; i++) {
				if (res.body.dapps[i] != null) {
					node.expect(res.body.dapps[i].link).to.equal(link);
				}
			}
			done();
		});
	});

	it('using no limit should be ok', function (done) {
		getDapps('', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			if (res.body.dapps.length > 0) {
				dapp = res.body.dapps[0];
				dapp = dapp;
			}
			done();
		});
	});

	it('using limit == 3 should be ok', function (done) {
		var limit = 3;

		getDapps('limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			node.expect(res.body.dapps).to.have.length.at.most(limit);
			done();
		});
	});

	it('using offset should be ok', function (done) {
		var offset = 1;
		var secondDapp;

		getDapps('', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			if (res.body.dapps[1] != null) {
				secondDapp = res.body.dapps[1];

				getDapps('offset=' + 1, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('dapps').that.is.an('array');
					node.expect(res.body.dapps[0]).to.deep.equal(secondDapp);
				});
			}
			done();
		});
	});
});

describe('GET /dapps?id=', function () {

	function getDapps (id, done) {
		node.get('/api/dapps?id=' + id, done);
	}

	it('using no id should fail', function (done) {
		getDapps('', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too short (0 chars), minimum 1: #/id');
			done();
		});
	});

	it('using id with length > 20 should fail', function (done) {
		getDapps('012345678901234567890', function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too long (21 chars), maximum 20: #/id');
			done();
		});
	});

	it('using unknown id should be ok', function (done) {
		var dappId = '8713095156789756398';

		getDapps(dappId, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			done();
		});
	});

	it('using valid id should be ok', function (done) {
		getDapps(dapp.transactionId, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			node.expect(res.body.dapps[0].transactionId).to.equal(dapp.transactionId);
			done();
		});
	});
});

describe('POST /api/dapps/install', function () {

	function postInstall (params, done) {
		node.post('/api/dapps/install', params, done);
	}

	before(function (done) {
		node.expect(dapp).to.be.a('object');
		node.expect(dapp).to.have.property('transactionId').to.be.not.null;
		done();
	});

	var validParams;

	beforeEach(function (done) {
		validParams = {
			id: dapp.transactionId,
			master: node.config.dapp.masterpassword
		};
		done();
	});

	it('using no id should fail', function (done) {
		delete validParams.id;

		postInstall(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using unknown id should fail', function (done) {
		validParams.id = 'unknown';

		postInstall(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using valid params should be ok', function (done) {
		postInstall(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('path');
			dapp = dapp;
			done();
		});
	});

	describe('when link is 404 not found', function () {
		var toBeNotFound;

		beforeEach(function (done) {
			toBeNotFound = validDapp;
			toBeNotFound.link = toBeNotFound.link.replace(/\.zip/, node.randomApplicationName() + '.zip');
			done();
		});

		it('should fail', function (done) {
			node.put('/api/dapps', toBeNotFound, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body.transaction).to.have.property('id').that.is.not.empty;
				validParams.id = res.body.transaction.id;

				node.onNewBlock(function (err) {
					postInstall(validParams, function (err, res) {
						node.expect(res.body).to.have.property('success').to.be.not.ok;
						node.expect(res.body).to.have.property('error').to.match(/[0-9]+ Installation failed: Received bad response code 404/);
						done();
					});
				});
			});
		});
	});
});

describe('GET /api/dapps/installed', function () {

	it('should be ok', function (done) {
		var flag = 0;

		node.get('/api/dapps/installed', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			for (var i = 0; i < res.body.dapps.length; i++) {
				if (res.body.dapps[i] != null) {
					if (res.body.dapps[i].transactionId === dapp.transactionId) {
						flag += 1;
					}
				}
			}
			node.expect(flag).to.equal(1);
			done();
		});
	});
});

describe('GET /api/dapps/installedIds', function () {

	it('should be ok', function (done) {
		var flag = 0;

		node.get('/api/dapps/installedIds', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('ids').that.is.an('array');
			for (var i = 0; i < res.body.ids.length; i++) {
				if (res.body.ids[i] != null) {
					if (res.body.ids[i] === dapp.transactionId) {
						flag += 1;
					}
				}
			}
			node.expect(flag).to.equal(1);
			done();
		});
	});
});

describe('GET /api/dapps/search?q=', function () {

	function getSearch (params, done) {
		node.get('/api/dapps/search?' + params, done);
	}

	it('using invalid params should fail', function (done) {
		var q = 1234;
		var category = 'good';
		var installed = 'true';

		var params = 'q=' + q + '&category=' + category + '&installed=' + installed;

		getSearch(params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using valid parameters should be ok', function (done) {
		var q = 'a';
		var category = node.randomProperty(node.dappCategories, true);
		var installed = 1;

		var params = 'q=' + q + '&installed='+ installed + '&category=' + node.dappCategories[category];

		getSearch(params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			done();
		});
	});

	it('using installed = 0 should be ok', function (done) {
		var q = 's';
		var category = node.randomProperty(node.dappCategories);
		var installed = 0;

		var params = 'q=' + q + '&installed='+ installed + '&category=' + category;

		getSearch(params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			done();
		});
	});
});

describe('POST /api/dapps/launch', function () {

	function postLaunch (params, done) {
		node.post('/api/dapps/launch', params, done);
	}

	before(function (done) {
		node.expect(dapp).to.be.a('object');
		node.expect(dapp).to.have.property('transactionId').to.be.not.null;
		done();
	});

	var validParams;

	beforeEach(function (done) {
		validParams = {
			id: dapp.transactionId,
			master: node.config.dapp.masterpassword
		};
		done();
	});

	it('using no id should fail', function (done) {
		delete validParams.id;

		postLaunch(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using unknown id should fail', function (done) {
		validParams.id = 'unknown';

		postLaunch(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using valid params should be ok', function (done) {
		postLaunch(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.get('/api/dapps/launched', function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('launched').that.is.an('array');
				var flag = 0;

				for (var i = 0; i < res.body.launched.length; i++) {
					if (res.body.launched[i] != null) {
						if (res.body.launched[i] === dapp.transactionId) {
							flag += 1;
						}
					}
				}
				node.expect(flag).to.equal(1);
			});
			done();
		});
	});
});

describe('POST /api/dapps/stop', function () {

	function postStop (params, done) {
		node.post('/api/dapps/stop', params, done);
	}

	before(function (done) {
		node.expect(dapp).to.be.a('object');
		node.expect(dapp).to.have.property('transactionId').to.be.not.null;
		done();
	});

	var validParams;

	beforeEach(function (done) {
		validParams = {
			id: dapp.transactionId,
			master: node.config.dapp.masterpassword
		};
		done();
	});

	it('using no id should fail', function (done) {
		delete validParams.id;

		postStop(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using unknown id should fail', function (done) {
		validParams.id = 'unknown';

		postStop(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using valid params should be ok', function (done) {
		postStop(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done();
		});
	});
});

describe('GET /api/dapps/categories', function () {

	it('should be ok', function (done) {
		node.get('/api/dapps/categories', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('categories').that.is.an('object');
			for (var i in node.dappCategories) {
				node.expect(res.body.categories[i]).to.equal(node.dappCategories[i]);
			}
			done();
		});
	});
});

describe('POST /api/dapps/uninstall', function () {

	function postUninstall (params, done) {
		node.post('/api/dapps/uninstall', params, done);
	}

	before(function (done) {
		node.expect(dapp).to.be.a('object');
		node.expect(dapp).to.have.property('transactionId').to.be.not.null;
		done();
	});

	var validParams;

	beforeEach(function (done) {
		validParams = {
			id: dapp.transactionId,
			master: node.config.dapp.masterpassword
		};
		done();
	});

	it('using no id should fail', function (done) {
		delete validParams.id;

		postUninstall(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using unknown id should fail', function (done) {
		validParams.id = 'unknown';

		postUninstall(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using valid params should be ok', function (done) {
		postUninstall(validParams, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done();
		});
	});
});
