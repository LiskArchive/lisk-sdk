'use strict'; /*jslint mocha:true, expr:true */

var node = require('./../node.js');

var dapp = {};
var dappName = '';
var installedDapp = {};

var account = node.randomTxAccount();
var account2 = node.randomTxAccount();

function openAccount (account, done) {
	node.post('/accounts/open', {
		secret: account.password
	}, function (err, res) {
		// console.log(JSON.stringify(res.body));
		node.expect(res.body).to.have.property('success').to.be.ok;
		node.expect(res.body).to.have.property('account').that.is.an('object');
		account.address = res.body.account.address;
		account.publicKey = res.body.account.publicKey;
		account.balance = res.body.account.balance;
		done(err, res);
	});
}

function putTransaction (params, done) {
	node.put('/transactions', params, function (err, res) {
		// console.log(JSON.stringify(res.body));
		node.expect(res.body).to.have.property('success').to.be.ok;
		node.onNewBlock(function (err) {
			done(err, res);
		});
	});
}

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

before(function (done) {
	// Add second signature to Account 2
	node.onNewBlock(function (err) {
		node.put('/signatures', {
			secret: account2.password,
			secondSecret: account2.secondPassword
		}, function (err, res) {
			// console.log(JSON.stringify(res.body));
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transaction').that.is.an('object');
			done();
		});
	});
});

describe('PUT /dapps', function () {

	it('using account with no funds should fail', function (done) {
		node.put('/dapps', {
			secret: node.randomPassword(),
			category: node.randomProperty(node.dappCategories),
			type: node.dappTypes.DAPP,
			name: node.randomDelegateName(),
			description: 'A dapp that should not be added',
			tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
			link: node.guestbookDapp.link,
			icon: node.guestbookDapp.icon
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using unknown category should fail', function (done) {
		node.put('/dapps', {
			secret: account.password,
			category: 'unknown',
			type: node.dappTypes.DAPP,
			name: node.randomDelegateName(),
			description: 'A dapp that should not be added',
			tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
			link: node.guestbookDapp.link,
			icon: node.guestbookDapp.icon
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using no dapp name should fail', function (done) {
		node.put('/dapps', {
			secret: account.password,
			category: node.randomProperty(node.dappCategories),
			type: node.dappTypes.DAPP,
			description: 'A dapp that should not be added',
			tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
			link: node.guestbookDapp.link,
			icon: node.guestbookDapp.icon
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using very long description should fail', function (done) {
		node.put('/dapps', {
			secret:account.password,
			category: node.randomProperty(node.dappCategories),
			type: node.dappTypes.DAPP,
			name: node.randomDelegateName(),
			description: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient c',
			link: node.guestbookDapp.link,
			icon: node.guestbookDapp.icon
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using very long tag should fail', function (done) {
		node.put('/dapps', {
			secret: account.password,
			category: node.randomProperty(node.dappCategories),
			type: node.dappTypes.DAPP,
			name: node.randomDelegateName(),
			description: 'A dapp that should not be added',
			tags: 'develop,rice,voiceless,zonked,crooked,consist,price,extend,sail,treat,pie,massive,fail,maid,summer,verdant,visitor,bushes,abrupt,beg,black-and-white,flight,twist',
			link: node.guestbookDapp.link,
			icon: node.guestbookDapp.icon
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using very long name should fail', function (done) {
		node.put('/dapps', {
			secret: account.password,
			category: node.randomProperty(node.dappCategories),
			type: node.dappTypes.DAPP,
			name: 'Lorem ipsum dolor sit amet, conse',
			description: 'A dapp that should not be added',
			tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
			link: node.guestbookDapp.link,
			icon: node.guestbookDapp.icon
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using no link should fail', function (done) {
		node.put('/dapps', {
			secret: account.password,
			category: node.randomProperty(node.dappCategories),
			type: node.dappTypes.DAPP,
			name: node.randomDelegateName(),
			description: 'A dapp that should not be added',
			tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
			icon: node.guestbookDapp.icon
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using invalid parameter types should fail', function (done) {
		node.put('/dapps', {
			secret: account.password,
			category: 'String',
			type: 'Type',
			name: 1234,
			description: 1234,
			tags: 1234,
			link: 1234,
			icon: 1234
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	describe('from account with second passphase enabled', function (done) {
		it('using no second passphrase should fail', function (done) {
			node.put('/dapps', {
				secret: account2.password,
				secondSecret: null,
				category: node.randomProperty(node.dappCategories),
				type: node.dappTypes.DAPP,
				name: node.randomDelegateName(),
				description: 'A dapp that should not be added',
				tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
				link: node.guestbookDapp.link,
				icon: node.guestbookDapp.icon
			}, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
		});
	});

	it('using unknown type should fail', function (done) {
		dappName = node.randomDelegateName();

		node.put('/dapps', {
			secret: account.password,
			category: node.randomProperty(node.dappCategories),
			type: 'unknown',
			name: dappName,
			description: 'A dapp that should not be added',
			tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
			link: node.guestbookDapp.link,
			icon: node.guestbookDapp.icon
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using valid link should be ok', function (done) {
		dappName = node.randomDelegateName();

		node.put('/dapps', {
			secret: account.password,
			category: node.randomProperty(node.dappCategories),
			type: node.dappTypes.DAPP,
			name: dappName,
			description: 'A dapp added via API autotest',
			tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
			link: node.guestbookDapp.link,
			icon: node.guestbookDapp.icon
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body.transaction).to.have.property('id');
			installedDapp.transactionId = res.body.transaction.id;
			done();
		});
	});

	it('using existing dapp name should fail', function (done) {
		node.onNewBlock(function (err) {
			node.put('/dapps', {
				secret: account.password,
				category: node.randomProperty(node.dappCategories),
				type: node.dappTypes.DAPP,
				name: dappName,
				description: 'A dapp that should not be added',
				tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
				link: node.guestbookDapp.link,
				icon: node.guestbookDapp.icon
			}, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
		});
	});

	it('using existing dapp link should fail', function (done) {
		node.onNewBlock(function (err) {
			node.put('/dapps', {
				secret: account.password,
				category: node.randomProperty(node.dappCategories),
				type: node.dappTypes.DAPP,
				name: node.randomDelegateName(),
				description: 'A dapp that should not be added',
				tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
				link: node.guestbookDapp.link,
				icon: node.guestbookDapp.icon
			}, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
		});
	});
});

describe('PUT /dapps/transaction', function () {

	function putTransaction (params, done) {
		node.put('/dapps/transaction', params, done);
	}

	before(function (done) {
		node.expect(installedDapp).to.be.a('object');
		node.expect(installedDapp).to.have.property('transactionId').to.be.not.null;
		done();
	});

	it('using no secret should fail', function (done) {
		putTransaction({
			dappId: installedDapp.transactionId,
			amount: 100000000
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: secret');
			done();
		});
	});

	it('using random secret should fail', function (done) {
		putTransaction({
			secret: node.randomPassword(),
			dappId: installedDapp.transactionId,
			amount: 100000000
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.match(/Account has no LISK: [0-9]+L balance=0/);
			done();
		});
	});

	it('using secret with length > 100 should fail', function (done) {
		putTransaction({
			secret: 'major patient image mom reject theory glide brisk polar source rely inhale major patient image mom re',
			dappId: installedDapp.transactionId,
			amount: 100000000
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too long (101 chars), maximum 100');
			done();
		});
	});

	it('using no amount should fail', function (done) {
		putTransaction({
			secret: account.password,
			dappId: installedDapp.transactionId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: amount');
			done();
		});
	});

	it('using amount < 0 should fail', function (done) {
		putTransaction({
			secret: account.password,
			dappId: installedDapp.transactionId,
			amount: -1
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value -1 is less than minimum 1');
			done();
		});
	});

	it('using amount > balance should fail', function (done) {
		openAccount(account, function (err, res) {
			var amount = node.bignum(account.balance).plus('1').toNumber();

			putTransaction({
				secret: account.password,
				dappId: installedDapp.transactionId,
				amount: amount
			}, function (err, res) {
				node.expect(res.body).to.have.property('success').to.not.be.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
		});
	});

	it('using amount > 100M should fail', function (done) {
		putTransaction({
			secret: account.password,
			dappId: installedDapp.transactionId,
			amount: 10000000000000002
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value 10000000000000002 is greater than maximum 10000000000000000');
			done();
		});
	});

	it('using numeric publicKey should fail', function (done) {
		putTransaction({
			secret: account.password,
			dappId: installedDapp.transactionId,
			amount: 100000000,
			publicKey: 1
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type string but found type integer');
			done();
		});
	});

	it('using numeric secondSecret should fail', function (done) {
		putTransaction({
			secret: account.password,
			secondSecret: 1,
			dappId: installedDapp.transactionId,
			amount: 100000000
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type string but found type integer');
			done();
		});
	});

	it('using secondSecret with length > 100 should fail', function (done) {
		putTransaction({
			secret: account.password,
			secondSecret: 'major patient image mom reject theory glide brisk polar source rely inhale major patient image mom re',
			dappId: installedDapp.transactionId,
			amount: 100000000
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too long (101 chars), maximum 100');
			done();
		});
	});

	it('using no dappId should fail', function (done) {
		putTransaction({
			secret: account.password,
			amount: 100000000
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: dappId');
			done();
		});
	});

	it('using numeric dappId should fail', function (done) {
		putTransaction({
			secret: account.password,
			dappId: 1,
			amount: 100000000
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type string but found type integer');
			done();
		});
	});

	it('using dappId with length > 20 should fail', function (done) {
		putTransaction({
			secret: account.password,
			dappId: '012345678901234567890',
			amount: 100000000
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too long (21 chars), maximum 20');
			done();
		});
	});

	it('using unknown dappId', function (done) {
		var dappId = '8713095156789756398';

		putTransaction({
			secret: account.password,
			dappId: dappId,
			amount: 100000000
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Application not found: ' + dappId);
			done();
		});
	});

	it('using numeric multisigAccountPublicKey should fail', function (done) {
		putTransaction({
			secret: account.password,
			dappId: installedDapp.transactionId,
			amount: 100000000,
			multisigAccountPublicKey: 1
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type string but found type integer');
			done();
		});
	});

	it('using valid params should be ok', function (done) {
		putTransaction({
			secret: account.password,
			dappId: installedDapp.transactionId,
			amount: 100000000
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId').to.not.be.empty;
			done();
		});
	});
});

describe('PUT /dapps/withdrawal', function () {

	function putWithdrawal (params, done) {
		node.put('/dapps/withdrawal', params, done);
	}

	before(function (done) {
		node.expect(installedDapp).to.be.a('object');
		node.expect(installedDapp).to.have.property('transactionId').to.be.not.null;
		done();
	});

	var randomAccount = node.randomTxAccount();
	var keys = node.lisk.crypto.getKeys(account.password);
	var recipientId = node.lisk.crypto.getAddress(keys.publicKey);

	it('using no secret should fail', function (done) {
		putWithdrawal({
			amount: 100000000,
			dappId: installedDapp.transactionId,
			transactionId: '1',
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: secret');
			done();
		});
	});

	it('using random secret should fail', function (done) {
		putWithdrawal({
			secret: node.randomPassword(),
			amount: 100000000,
			dappId: installedDapp.transactionId,
			transactionId: '1',
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.match(/Account has no LISK: [0-9]+L balance=0/);
			done();
		});
	});

	it('using secret with length > 100 should fail', function (done) {
		putWithdrawal({
			secret: 'major patient image mom reject theory glide brisk polar source rely inhale major patient image mom re',
			amount: 100000000,
			dappId: installedDapp.transactionId,
			transactionId: '1',
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too long (101 chars), maximum 100');
			done();
		});
	});

	it('using no amount should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			dappId: installedDapp.transactionId,
			transactionId: '1',
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: amount');
			done();
		});
	});

	it('using amount < 0 should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			amount: -1,
			dappId: installedDapp.transactionId,
			transactionId: '1',
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value -1 is less than minimum 1');
			done();
		});
	});

	it('using amount > balance should fail', function (done) {
		openAccount(account, function (err, res) {
			var amount = node.bignum(account.balance).plus('1').toNumber();

			putWithdrawal({
				secret: account.password,
				amount: amount,
				dappId: installedDapp.transactionId,
				transactionId: '1',
				recipientId: recipientId
			}, function (err, res) {
				node.expect(res.body).to.have.property('success').to.not.be.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
		});
	});

	it('using amount > 100M should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			amount: 10000000000000002,
			dappId: installedDapp.transactionId,
			transactionId: '1',
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Value 10000000000000002 is greater than maximum 10000000000000000');
			done();
		});
	});

	it('using numeric secondSecret should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			secondSecret: 1,
			amount: 100000000,
			dappId: installedDapp.transactionId,
			transactionId: '1',
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type string but found type integer');
			done();
		});
	});

	it('using secondSecret with length > 100 should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			secondSecret: 'major patient image mom reject theory glide brisk polar source rely inhale major patient image mom re',
			amount: 100000000,
			dappId: installedDapp.transactionId,
			transactionId: '1',
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too long (101 chars), maximum 100');
			done();
		});
	});

	it('using no dappId should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			amount: 100000000,
			transactionId: '1',
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: dappId');
			done();
		});
	});

	it('using numeric dappId should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			amount: 100000000,
			dappId: 1,
			transactionId: 1,
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type string but found type integer');
			done();
		});
	});

	it('using alphanumeric dappId should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			amount: 100000000,
			dappId: '1L',
			transactionId: '1',
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Application not found: 1L');
			done();
		});
	});

	it('using blank dappId should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			amount: 100000000,
			dappId: '',
			transactionId: '1',
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too short (0 chars), minimum 1');
			done();
		});
	});

	it('using dappId with length > 20 should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			amount: 100000000,
			dappId: '012345678901234567890',
			transactionId: '1',
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too long (21 chars), maximum 20');
			done();
		});
	});

	it('using unknown dappId', function (done) {
		var dappId = '8713095156789756398';

		putWithdrawal({
			secret: account.password,
			amount: 100000000,
			dappId: dappId,
			transactionId: '1',
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Application not found: ' + dappId);
			done();
		});
	});

	it('using no transactionId should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			amount: 100000000,
			dappId: installedDapp.transactionId,
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: transactionId');
			done();
		});
	});

	it('using numeric transactionId should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			amount: 100000000,
			dappId: installedDapp.transactionId,
			transactionId: 1,
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type string but found type integer');
			done();
		});
	});

	it('using alphanumeric transactionId should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			amount: 100000000,
			dappId: installedDapp.transactionId,
			transactionId: '1L',
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Invalid outTransfer transactionId');
			done();
		});
	});

	it('using blank transactionId should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			amount: 100000000,
			dappId: installedDapp.transactionId,
			transactionId: '',
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too short (0 chars), minimum 1');
			done();
		});
	});

	it('using transactionId with length > 20 should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			amount: 100000000,
			dappId: installedDapp.transactionId,
			transactionId: '012345678901234567890',
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too long (21 chars), maximum 20');
			done();
		});
	});

	it('using no recipientId should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			amount: 100000000,
			dappId: installedDapp.transactionId,
			transactionId: '1'
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: recipientId');
			done();
		});
	});

	it('using numeric recipientId should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			amount: 100000000,
			dappId: installedDapp.transactionId,
			transactionId: '1',
			recipientId: 12
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type string but found type integer');
			done();
		});
	});

	it('using recipientId with length < 2 should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			amount: 100000000,
			dappId: installedDapp.transactionId,
			transactionId: '1',
			recipientId: '1'
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too short (1 chars), minimum 2');
			done();
		});
	});

	it('using recipientId with length > 22 should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			amount: 100000000,
			dappId: installedDapp.transactionId,
			transactionId: '1',
			recipientId: '0123456789012345678901L'
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too long (23 chars), maximum 22');
			done();
		});
	});

	it('using recipientId without an "L" should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			amount: 100000000,
			dappId: installedDapp.transactionId,
			transactionId: '1',
			recipientId: recipientId.replace('L', '')
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Invalid recipient');
			done();
		});
	});

	it('using numeric multisigAccountPublicKey should fail', function (done) {
		putWithdrawal({
			secret: account.password,
			amount: 100000000,
			dappId: installedDapp.transactionId,
			transactionId: '1',
			recipientId: recipientId,
			multisigAccountPublicKey: 1
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Expected type string but found type integer');
			done();
		});
	});

	it('using valid params should be ok', function (done) {
		putWithdrawal({
			secret: account.password,
			amount: 100000000,
			dappId: installedDapp.transactionId,
			transactionId: '1',
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId').to.not.be.empty;
			done();
		});
	});

	it('using same params twice within current block should fail', function (done) {
		var params = {
			secret: account.password,
			amount: 100000000,
			dappId: installedDapp.transactionId,
			transactionId: '2',
			recipientId: recipientId
		};

		putWithdrawal(params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId').to.not.be.empty;

			setTimeout(function () {
				putWithdrawal(params, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('error').to.equal('Transaction is already processing: 2');
					done();
				});
			}, 2000);
		});
	});

	it('using already confirmed params after new block should fail', function (done) {
		var params = {
			secret: account.password,
			amount: 100000000,
			dappId: installedDapp.transactionId,
			transactionId: '3',
			recipientId: recipientId
		};

		putWithdrawal(params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactionId').to.not.be.empty;

			node.onNewBlock(function (err) {
				putWithdrawal(params, function (err, res) {
					node.expect(res.body).to.have.property('success').to.not.be.ok;
					node.expect(res.body).to.have.property('error').to.equal('Transaction is already confirmed: 3');
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
		node.get('/dapps?' + params, done);
	}

	it('user orderBy == "category:asc" should be ok', function (done) {
		getDapps('orderBy=' + 'category:asc', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			if (res.body.dapps[0] != null) {
				for (var i = 0; i < res.body.dapps.length; i++) {
					if (res.body.dapps[i+1] != null) {
						node.expect(res.body.dapps[i].category).to.be.at.most(res.body.dapps[i+1].category);
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
					if (res.body.dapps[i+1] != null) {
						node.expect(res.body.dapps[i].category).to.be.at.least(res.body.dapps[i+1].category);
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
			if (name === 'test') {
				node.expect(res.body).to.have.property('success');
			} else {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('dapps').that.is.an('array');
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
				installedDapp = dapp;
			}
			done();
		});
	});

	it('using limit == 3 should be ok', function (done) {
		var limit = 3;

		getDapps('limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			if (res.body.success && res.body.dapps != null) {
				node.expect(res.body.dapps).to.have.length.at.most(limit);
			}
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
					if (res.body.success && res.body.dapps != null) {
						node.expect(res.body.dapps[0]).to.deep.equal(secondDapp);
					}
				});
			}
			done();
		});
	});
});

describe('GET /dapps?id=', function () {

	function getDapps (id, done) {
		node.get('/dapps?id=' + id, done);
	}

	it('using no id should fail', function (done) {
		getDapps('', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using unknown id should fail', function (done) {
		getDapps('unknown', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using valid id should be ok', function (done) {
		getDapps(installedDapp.transactionId, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapp');
			node.expect(res.body.dapp.transactionId).to.equal(installedDapp.transactionId);
			done();
		});
	});
});

describe('POST /dapps/install', function () {

	function postInstall (params, done) {
		node.post('/dapps/install', params, done);
	}

	it('using no id should fail', function (done) {
		postInstall({
			id: null,
			master: node.config.dapp.masterpassword
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using unknown id should fail', function (done) {
		postInstall({
			id: 'unknown',
			master: node.config.dapp.masterpassword
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using valid id should be ok', function (done) {
		postInstall({
			id: installedDapp.transactionId,
			master: node.config.dapp.masterpassword
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('path');
			done();
		});
	});
});

describe('GET /dapps/installed', function () {

	it('should be ok', function (done) {
		var flag = 0;

		node.get('/dapps/installed', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			for (var i = 0; i < res.body.dapps.length; i++) {
				if (res.body.dapps[i] != null) {
					if (res.body.dapps[i].transactionId === installedDapp.transactionId) {
						flag += 1;
					}
				}
			}
			node.expect(flag).to.equal(1);
			done();
		});
	});
});

describe('GET /dapps/installedIds', function () {

	it('should be ok', function (done) {
		var flag = 0;

		node.get('/dapps/installedIds', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('ids').that.is.an('array');
			for (var i = 0; i < res.body.ids.length; i++) {
				if (res.body.ids[i] != null) {
					if (res.body.ids[i] === installedDapp.transactionId) {
						flag += 1;
					}
				}
			}
			node.expect(flag).to.equal(1);
			done();
		});
	});
});

describe('GET /dapps/search?q=', function () {

	function getSearch (params, done) {
		node.get('/dapps/search?' + params, done);
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

describe('POST /dapps/launch', function () {

	function postLaunch (params, done) {
		node.post('/dapps/launch', params, done);
	}

	it('using no id should fail', function (done) {
		postLaunch({
			id: null,
			master: node.config.dapp.masterpassword
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using unknown id should fail', function (done) {
		postLaunch({
			id: 'unknown',
			master: node.config.dapp.masterpassword
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using valid id should be ok', function (done) {
		postLaunch({
			id: installedDapp.transactionId,
			master: node.config.dapp.masterpassword
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.get('/dapps/launched', function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('launched').that.is.an('array');
				var flag = 0;

				for (var i = 0; i < res.body.launched.length; i++) {
					if (res.body.launched[i] != null) {
						if (res.body.launched[i] === installedDapp.transactionId) {
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

describe('POST /dapps/stop', function () {

	function postStop (params, done) {
		node.post('/dapps/stop', params, done);
	}

	it('using no id should fail', function (done) {
		postStop({
			id: null,
			master: node.config.dapp.masterpassword
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using unknown id should fail', function (done) {
		postStop({
			id: 'unknown',
			master: node.config.dapp.masterpassword
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using valid id should be ok', function (done) {
		postStop({
			id: installedDapp.transactionId,
			master: node.config.dapp.masterpassword
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done();
		});
	});
});

describe('GET /dapps/categories', function () {

	it('should be ok', function (done) {
		node.get('/dapps/categories', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('categories').that.is.an('object');
			for (var i in node.dappCategories) {
				node.expect(res.body.categories[i]).to.equal(node.dappCategories[i]);
			}
			done();
		});
	});
});

describe('POST /dapps/uninstall', function () {

	function postUninstall (params, done) {
		node.post('/dapps/uninstall', params, done);
	}

	it('using no id should fail', function (done) {
		postUninstall({
			id: null,
			master: node.config.dapp.masterpassword
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using unknown id should fail', function (done) {
		postUninstall({
			id: 'unknown',
			master: node.config.dapp.masterpassword
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using valid id should be ok', function (done) {
		postUninstall({
			id: installedDapp.transactionId,
			master: node.config.dapp.masterpassword
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done();
		});
	});
});
