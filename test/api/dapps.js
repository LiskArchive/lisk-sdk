'use strict'; /*jslint mocha:true, expr:true */

var node = require('./../node.js');
var path = require('path');

var Dapp = {};
var DappName = '';
var DappToInstall = {};

var account = node.randomTxAccount();
var account2 = node.randomTxAccount();
var account3 = node.randomTxAccount();

function openAccount (account, done) {
	node.api.post('/accounts/open')
		.set('Accept', 'application/json')
		.send({
			secret: account.password
		})
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			// console.log('Opening account with password:', account.password);
			node.expect(res.body).to.have.property('success').to.be.ok;
			if (res.body.success && res.body.account != null) {
				account.address = res.body.account.address;
				account.publicKey = res.body.account.publicKey;
				account.balance = res.body.account.balance;
			} else {
				// console.log('Failed to open account');
				// console.log('Secret:', account.password, ', secondSecret:', account.secondPassword);
				node.expect(false).to.equal(true);
			}
			done(err, res);
		});
}

function sendLISK (params, done) {
	node.api.put('/transactions')
		.set('Accept', 'application/json')
		.send(params)
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.onNewBlock(function (err) {
				done(err, res);
			});
		});
}

before(function (done) {
	openAccount(account, function (err, res) {
		// console.log('Opening account with password:', account.password);
		if (res.body.success && res.body.account != null) {
			 account.address = res.body.account.address;
			 account.publicKey = res.body.account.publicKey;
			 account.balance = res.body.account.balance;
		} else {
			 // console.log('Failed to open account');
			 // console.log('Secret:', account.password, ', secondSecret:', account.secondPassword);
			 node.expect(false).to.equal(true);
		}
		done();
	});
});

before(function (done) {
	openAccount(account2, function (err, res) {
		// console.log('Opening account with password:', account2.password);
		if (res.body.success && res.body.account != null) {
			 account2.address = res.body.account.address;
			 account2.publicKey = res.body.account.publicKey;
			 account2.balance = res.body.account.balance;
		} else {
			 // console.log('Failed to open account');
			 // console.log('Secret:', account2.password, ', secondSecret:', account2.secondPassword);
			 node.expect(false).to.equal(true);
		}
		done();
	});
});

before(function (done) {
	openAccount(account3, function (err, res) {
		// console.log('Opening account with password:', account3.password);
		if (res.body.success && res.body.account != null) {
			 account3.address = res.body.account.address;
			 account3.publicKey = res.body.account.publicKey;
			 account3.balance = res.body.account.balance;
		} else {
			 // console.log('Failed to open account');
			 // console.log('Secret:', account3.password, ', secondSecret:', account3.secondPassword);
			 node.expect(false).to.equal(true);
		}
		done();
	});
});

before(function (done) {
	// Send to LISK to account 1 address
	setTimeout(function () {
		var randomLISK = node.randomLISK();
		var expectedFee = node.expectedFee(randomLISK);

		sendLISK({
			secret: node.Gaccount.password,
			amount: randomLISK,
			recipientId: account.address
		}, function (err, res) {
			if (res.body.success && res.body.transactionId != null) {
				// console.log('Sent to:', account.address, (randomLISK / node.normalizer), 'LISK');
				// console.log('Expected fee (paid by sender):', expectedFee / node.normalizer, 'LISK');
			} else {
				// console.log('Sending LISK to:', account.address, 'failed');
				// console.log('Secret:', node.Gaccount.password, ', amount:', randomLISK);
				node.expect(false).to.equal(true);
			}
			done();
		});
	}, 2000);
});

before(function (done) {
	// Send to LISK to account 2 address
	setTimeout(function () {
		var randomLISK = node.randomLISK();
		var expectedFee = node.expectedFee(randomLISK);

		sendLISK({
			secret: node.Gaccount.password,
			amount: randomLISK,
			recipientId: account2.address
		}, function (err, res) {
			if (res.body.success && res.body.transactionId != null) {
				// console.log('Sent to:', account2.address, (randomLISK / node.normalizer), 'LISK');
				// console.log('Expected fee (paid by sender):', expectedFee / node.normalizer, 'LISK');
			} else {
				// console.log('Sending LISK to:', account2.address, 'failed');
				// console.log('Secret:', node.Gaccount.password, ', amount:', randomLISK);
				node.expect(false).to.equal(true);
			}
			done();
		});
	}, 2000);
});

before(function (done) {
	// Wait for new block to ensure all data has been received
	node.onNewBlock(function (err) {
		// Add second password for Account 2
		node.api.put('/signatures')
			.set('Accept', 'application/json')
			.send({
				secret: account2.password,
				secondSecret: account2.secondPassword
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transaction').that.is.an('object');
				done();
			});
	});
	// console.log('ACCOUNT 1: ' + account.address);
	// console.log('ACCOUNT 2: ' + account2.address);
	// console.log('ACCOUNT 3: ' + account3.address);
});

describe('PUT /dapps', function () {

	it('using invalid secret should fail', function (done) {
		node.api.put('/dapps')
			.set('Accept', 'application/json')
			.send({
				secret: 'justAR4nd0m Passw0rd',
				category: node.randomProperty(node.DappCategory),
				type: node.DappType.DAPP,
				name: node.randomDelegateName(),
				description: 'A dapp that should not be added',
				tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
				link: node.guestbookDapp.link,
				icon: node.guestbookDapp.icon
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using invalid category should fail', function (done) {
		node.api.put('/dapps')
			.set('Accept', 'application/json')
			.send({
				secret: account.password,
				category: 'Choo Choo',
				type: node.DappType.DAPP,
				name: node.randomDelegateName(),
				description: 'A dapp that should not be added',
				tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
				link: node.guestbookDapp.link,
				icon: node.guestbookDapp.icon
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using no dapp name should fail', function (done) {
		node.api.put('/dapps')
			.set('Accept', 'application/json')
			.send({
				secret: account.password,
				category: node.randomProperty(node.DappCategory),
				type: node.DappType.DAPP,
				description: 'A dapp that should not be added',
				tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
				link: node.guestbookDapp.link,
				icon: node.guestbookDapp.icon
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using very long description should fail', function (done) {
		node.api.put('/dapps')
			.set('Accept', 'application/json')
			.send({
				secret:account.password,
				category: node.randomProperty(node.DappCategory),
				type: node.DappType.DAPP,
				name: node.randomDelegateName(),
				description: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient c',
				link: node.guestbookDapp.link,
				icon: node.guestbookDapp.icon
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using very long tag should fail', function (done) {
		node.api.put('/dapps')
			.set('Accept', 'application/json')
			.send({
				secret: account.password,
				category: node.randomProperty(node.DappCategory),
				type: node.DappType.DAPP,
				name: node.randomDelegateName(),
				description: 'A dapp that should not be added',
				tags: 'develop,rice,voiceless,zonked,crooked,consist,price,extend,sail,treat,pie,massive,fail,maid,summer,verdant,visitor,bushes,abrupt,beg,black-and-white,flight,twist',
				link: node.guestbookDapp.link,
				icon: node.guestbookDapp.icon
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using very long name should fail', function (done) {
		node.api.put('/dapps')
			.set('Accept', 'application/json')
			.send({
				secret: account.password,
				category: node.randomProperty(node.DappCategory),
				type: node.DappType.DAPP,
				name: 'Lorem ipsum dolor sit amet, conse',
				description: 'A dapp that should not be added',
				tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
				link: node.guestbookDapp.link,
				icon: node.guestbookDapp.icon
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using no link should fail', function (done) {
		node.api.put('/dapps')
			.set('Accept', 'application/json')
			.send({
				secret: account.password,
				category: node.randomProperty(node.DappCategory),
				type: node.DappType.DAPP,
				name: node.randomDelegateName(),
				description: 'A dapp that should not be added',
				tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using invalid parameter types should fail', function (done) {
		node.api.put('/dapps')
			.set('Accept', 'application/json')
			.send({
				secret: account.password,
				category: 'String',
				type: 'Type',
				name: 1234,
				description: 1234,
				tags: 1234,
				link: 1234,
				icon: 1234
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.error;
				done();
			});
	});

	it('using account with 0 LISK account should fail', function (done) {
		node.api.put('/dapps')
			.set('Accept', 'application/json')
			.send({
				secret: account3.password,
				category: node.randomProperty(node.DappCategory),
				type: node.DappType.DAPP,
				name: node.randomDelegateName(),
				description: 'A dapp that should not be added',
				tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
				link: node.guestbookDapp.link,
				icon: node.guestbookDapp.icon
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				done();
			});
	});

	it('using invalid second passphrase should fail', function (done) {
		node.api.put('/dapps')
			.set('Accept', 'application/json')
			.send({
				secret: account2.password,
				secondSecret: null,
				category: node.randomProperty(node.DappCategory),
				type: node.DappType.DAPP,
				name: node.randomDelegateName(),
				description: 'A dapp that should not be added',
				tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
				link: node.guestbookDapp.link,
				icon: node.guestbookDapp.icon
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				done();
			});
	});

	it('using invalid type should fail', function (done) {
		DappName = node.randomDelegateName();

		node.api.put('/dapps')
			.set('Accept', 'application/json')
			.send({
				secret: account.password,
				secondSecret: null,
				category: node.randomProperty(node.DappCategory),
				type: 'INVALIDTYPE',
				name: DappName,
				description: 'A dapp that should not be added',
				tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
				link: node.guestbookDapp.link,
				icon: node.guestbookDapp.icon
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				done();
			});
	});

	it('using valid link should be ok', function (done) {
		DappName = node.randomDelegateName();

		node.api.put('/dapps')
			.set('Accept', 'application/json')
			.send({
				secret: account.password,
				category: node.randomProperty(node.DappCategory),
				type: node.DappType.DAPP,
				name: DappName,
				description: 'A dapp added via API autotest',
				tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
				link: node.guestbookDapp.link,
				icon: node.guestbookDapp.icon
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body.transaction).to.have.property('id');
				DappToInstall.transactionId = res.body.transaction.id;
				done();
			});
	});

	it('using existing dapp name should fail', function (done) {
		node.onNewBlock(function (err) {
			node.api.put('/dapps')
				.set('Accept', 'application/json')
				.send({
					secret: account.password,
					category: node.randomProperty(node.DappCategory),
					type: node.DappType.DAPP,
					name: DappName,
					description: 'A dapp that should not be added',
					tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
					link: node.guestbookDapp.link,
					icon: node.guestbookDapp.icon
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					done();
				});
		});
	});

	it('using existing dapp link should fail', function (done) {
		node.onNewBlock(function (err) {
			node.api.put('/dapps')
				.set('Accept', 'application/json')
				.send({
					secret: account.password,
					category: node.randomProperty(node.DappCategory),
					type: node.DappType.DAPP,
					name: node.randomDelegateName(),
					description: 'A dapp that should not be added',
					tags: 'handy dizzy pear airplane alike wonder nifty curve young probable tart concentrate',
					link: node.guestbookDapp.link,
					icon: node.guestbookDapp.icon
				})
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('error');
					done();
				});
		});
	});
});

describe('PUT /dapps/transaction', function () {

	function putTransaction (params, done) {
		node.api.put('/dapps/transaction')
			.set('Accept', 'application/json')
			.send(params)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				done(err, res);
			});
	}

	before(function (done) {
		node.expect(DappToInstall).to.be.a('object');
		node.expect(DappToInstall).to.have.property('transactionId').to.be.not.null;
		done();
	});

	it('using no secret should fail', function (done) {
		putTransaction({
			dappId: DappToInstall.transactionId,
			amount: 100000000
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: secret');
			done();
		});
	});

	it('using invalid secret should fail', function (done) {
		putTransaction({
			secret: 'invalid',
			dappId: DappToInstall.transactionId,
			amount: 100000000
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Account not found');
			done();
		});
	});

	it('using secret with length > 100 should fail', function (done) {
		putTransaction({
			secret: 'major patient image mom reject theory glide brisk polar source rely inhale major patient image mom re',
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: amount');
			done();
		});
	});

	it('using amount < 0 should fail', function (done) {
		putTransaction({
			secret: account.password,
			dappId: DappToInstall.transactionId,
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
				dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
		node.api.put('/dapps/withdrawal')
			.set('Accept', 'application/json')
			.send(params)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				done(err, res);
			});
	}

	before(function (done) {
		node.expect(DappToInstall).to.be.a('object');
		node.expect(DappToInstall).to.have.property('transactionId').to.be.not.null;
		done();
	});

	var randomAccount = node.randomTxAccount();
	var keys = node.lisk.crypto.getKeys(account.password);
	var recipientId = node.lisk.crypto.getAddress(keys.publicKey);

	it('using no secret should fail', function (done) {
		putWithdrawal({
			amount: 100000000,
			dappId: DappToInstall.transactionId,
			transactionId: '1',
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Missing required property: secret');
			done();
		});
	});

	it('using invalid secret should fail', function (done) {
		putWithdrawal({
			secret: 'invalid',
			amount: 100000000,
			dappId: DappToInstall.transactionId,
			transactionId: '1',
			recipientId: recipientId
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('Account not found');
			done();
		});
	});

	it('using secret with length > 100 should fail', function (done) {
		putWithdrawal({
			secret: 'major patient image mom reject theory glide brisk polar source rely inhale major patient image mom re',
			amount: 100000000,
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
				dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
			dappId: DappToInstall.transactionId,
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
		node.onNewBlock(function (err) {
			done();
		});
	});

	it('using no limit should be ok', function (done) {
		var category = ''; var name = ''; var type = ''; var link = '';
		var icon = ''; var limit = ''; var offset = ''; var orderBy = '';

		node.api.get('/dapps')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('dapps').that.is.an('array');
				if (res.body.success && res.body.dapps != null) {
					if ((res.body.dapps).length > 0) {
						Dapp = res.body.dapps[0];
						DappToInstall = Dapp;
					}
				} else {
					// console.log(JSON.stringify(res.body));
					console.log('Request failed or dapps array is null');
				}
				done();
			});
	});

	it('using invalid parameter type (link) should fail', function (done) {
		var category = 'a category'; var name = 1234; var type = 'type'; var link = 1234; var icon = 1234;

		node.api.get('/dapps?category=' + category + '&name=' + name + '&type=' + type + '&link=' + link + '&icon=' + icon)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('ordered by ascending category should be ok', function (done) {
		var orderBy = 'category:asc';

		node.api.get('/dapps?orderBy=' + orderBy)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('dapps').that.is.an('array');
				if (res.body.success && res.body.dapps != null) {
					if (res.body.dapps[0] != null) {
						for (var i = 0; i < res.body.dapps.length; i++) {
							if (res.body.dapps[i+1] != null) {
								node.expect(res.body.dapps[i].category).to.be.at.most(res.body.dapps[i+1].category);
							}
						}
					}
				} else {
					// console.log(JSON.stringify(res.body));
					console.log('Request failed or dapps array is null');
				}
				done();
			});
	});

	it('ordered by descending category should be ok', function (done) {
		var orderBy = 'category:desc';

		node.api.get('/dapps?orderBy=' + orderBy)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('dapps').that.is.an('array');
				if (res.body.success && res.body.dapps != null) {
					if (res.body.dapps[0] != null) {
						for( var i = 0; i < res.body.dapps.length; i++) {
							if (res.body.dapps[i+1] != null) {
								node.expect(res.body.dapps[i].category).to.be.at.least(res.body.dapps[i+1].category);
							}
						}
					}
				} else {
					// console.log(JSON.stringify(res.body));
					console.log('Request failed or dapps array is null');
				}
				done();
			});
	});

	it('using limit should be ok', function (done) {
		var limit = 3;

		node.api.get('/dapps?limit=' + limit)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('dapps').that.is.an('array');
				if (res.body.success && res.body.dapps != null) {
					node.expect((res.body.dapps).length).to.be.at.most(limit);
				} else {
					// console.log(JSON.stringify(res.body));
					console.log('Request failed or dapps array is null');
				}
				done();
			});
	});

	it('using category should be ok', function (done) {
		var randomCategory = node.randomProperty(node.DappCategory, true);

		node.api.get('/dapps?category=' + randomCategory)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('dapps').that.is.an('array');
				if (res.body.success && res.body.dapps != null) {
					if((res.body.dapps).length > 0) {
						node.expect(res.body.dapps[0].category).to.equal(node.DappCategory[randomCategory]);
					}
				} else {
					// console.log(JSON.stringify(res.body));
					console.log('Request failed or dapps array is null');
				}
				done();
			});
	});

	it('using name should be ok', function (done) {
		var name = '';

		if (Dapp !== {} && Dapp != null) {
			name = Dapp.name;
		} else {
			name = 'test';
		}

		node.api.get('/dapps?name=' + name)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				if (name === 'test') {
					node.expect(res.body).to.have.property('success');
				} else {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('dapps').that.is.an('array');
					node.expect(res.body.dapps.length).to.equal(1);
					if (res.body.success && res.body.dapps != null) {
						node.expect(res.body.dapps[0].name).to.equal(name);
					} else {
						// console.log(JSON.stringify(res.body));
						console.log('Request failed or dapps array is null');
					}
				}
				done();
			});
	});

	it('using type should be ok', function (done) {
		var type = node.randomProperty(node.DappType);

		node.api.get('/dapps?type=' + type)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('dapps').that.is.an('array');
				if (res.body.success && res.body.dapps != null) {
					for( var i = 0; i < res.body.dapps.length; i++) {
						if (res.body.dapps[i] != null) {
							node.expect(res.body.dapps[i].type).to.equal(type);
						}
					}
				} else {
					// console.log(JSON.stringify(res.body));
					console.log('Request failed or dapps array is null');
				}
				done();
			});
	});

	it('using link should be ok', function (done) {
		var link = node.guestbookDapp.link;

		node.api.get('/dapps?link=' + link)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('dapps').that.is.an('array');
				if (res.body.success && res.body.dapps != null) {
					for( var i = 0; i < res.body.dapps.length; i++) {
						if (res.body.dapps[i] != null) {
							node.expect(res.body.dapps[i].link).to.equal(link);
						}
					}
				} else {
					// console.log(JSON.stringify(res.body));
					console.log('Request failed or dapps array is null');
				}
				done();
			});
	});

	it('using offset should be ok', function (done) {
		var offset = 1;
		var secondDapp;

		node.api.get('/dapps')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('dapps').that.is.an('array');
				if (res.body.success && res.body.dapps != null) {
					if (res.body.dapps[1] != null) {
						secondDapp = res.body.dapps[1];
						// console.log(offset);
						node.api.get('/dapps?offset=' + offset )
							.expect('Content-Type', /json/)
							.expect(200)
							.end(function (err, res) {
								// console.log(JSON.stringify(res.body));
								node.expect(res.body).to.have.property('success').to.be.ok;
								if (res.body.success && res.body.dapps != null) {
									node.expect(res.body.dapps[0]).to.deep.equal(secondDapp);
								}
							});
					} else {
						// console.log(JSON.stringify(res.body));
						// console.log('Only 1 dapp or something went wrong. Cannot check offset');
					}
				} else {
					// console.log(JSON.stringify(res.body));
					console.log('Request failed or dapps array is null');
				}
				done();
			});
	});
});

describe('GET /dapps?id=', function () {

	it('using unknown id should fail', function (done) {
		var dappId = 'UNKNOWN_ID';

		node.api.get('/dapps/get?id=' + dappId)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using no id should fail', function (done) {
		node.api.get('/dapps/get?id=')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using valid id should be ok', function (done) {
		var dappId = DappToInstall.transactionId;

		node.api.get('/dapps/get?id=' + dappId)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('dapp');
				if (res.body.success && res.body.dapp != null) {
					node.expect(res.body.dapp.transactionId).to.equal(dappId);
				} else {
					// console.log(JSON.stringify(res.body));
					console.log('Request failed or dapps array is null');
				}
				done();
			});
	});
});

describe('POST /dapps/install', function () {

	it('using no id should fail', function (done) {
		var dappId = DappToInstall.transactionId;

		node.api.post('/dapps/install')
			.set('Accept', 'application/json')
			.send({
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using invalid id should fail', function (done) {
		node.api.post('/dapps/install')
			.set('Accept', 'application/json')
			.send({
				id: 'DAPP ID',
				master: node.config.dapp.masterpassword
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using valid id should be ok', function (done) {
		var dappId = DappToInstall.transactionId;

		node.api.post('/dapps/install')
			.set('Accept', 'application/json')
			.send({
				id: dappId,
				master: node.config.dapp.masterpassword
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('path');
				done();
			});
	});
});

describe('GET /dapps/installed', function () {

	it('should be ok', function (done) {
		var flag = 0;

		node.api.get('/dapps/installed')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('dapps').that.is.an('array');
				if (res.body.success && res.body.dapps != null) {
					for (var i = 0; i < res.body.dapps.length; i++) {
						if (res.body.dapps[i] != null) {
							if (res.body.dapps[i].transactionId === DappToInstall.transactionId) {
								flag += 1;
							}
						}
					}
					node.expect(flag).to.equal(1);
				} else {
					// console.log(JSON.stringify(res.body));
					console.log('Request failed or dapps array is null');
				}
				done();
			});
	});
});

describe('GET /dapps/installedIds', function () {

	it('should be ok', function (done) {
		var flag = 0;

		node.api.get('/dapps/installedIds')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('ids').that.is.an('array');
				if (res.body.success && res.body.ids != null) {
					for (var i = 0; i < res.body.ids.length; i++) {
						if (res.body.ids[i] != null) {
							if (res.body.ids[i] === DappToInstall.transactionId) {
								flag += 1;
							}
						}
					}
					node.expect(flag).to.equal(1);
				} else {
					// console.log(JSON.stringify(res.body));
					console.log('Request failed or dapps array is null');
				}
				done();
			});
	});
});

describe('GET /dapps/search?q=', function () {

	it('using invalid parameters should fail', function (done) {
		var q = 1234; var category = 'good'; var installed = 'true';

		node.api.get('/dapps/search?q=' + q + '&category=' + category + '&installed=' + installed)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using valid parameters should be ok', function (done) {
		var q = 'a';
		var category = node.randomProperty(node.DappCategory, true);
		var installed = 1;

		node.api.get('/dapps/search?q=' + q + '&installed='+ installed + '&category=' + node.DappCategory[category])
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('dapps').that.is.an('array');
				done();
			});
	});

	it('using installed = 0 should be ok', function (done) {
		var q = 's';
		var category = node.randomProperty(node.DappCategory);
		var installed = 0;

		node.api.get('/dapps/search?q=' + q + '&installed='+ installed + '&category=' + category)
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('dapps').that.is.an('array');
				done();
			});
	});
});

describe('POST /dapps/launch', function () {

	it('using no id should fail', function (done) {
		var dappId = DappToInstall.transactionId;

		node.api.post('/dapps/launch')
			.set('Accept', 'application/json')
			.send({
				master: node.config.dapp.masterpassword
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using unknown id should fail', function (done) {
		var dappId = 'UNKNOWN_ID';

		node.api.post('/dapps/launch')
			.set('Accept', 'application/json')
			.send({
				id: dappId,
				master: node.config.dapp.masterpassword
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using valid id should be ok', function (done) {
		var dappId = DappToInstall.transactionId;

		node.api.post('/dapps/launch')
			.set('Accept', 'application/json')
			.send({
				id: dappId,
				master: node.config.dapp.masterpassword
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.api.get('/dapps/launched')
					.expect('Content-Type', /json/)
					.expect(200)
					.end(function (err, res) {
						// console.log(JSON.stringify(res.body));
						node.expect(res.body).to.have.property('success').to.be.ok;
						node.expect(res.body).to.have.property('launched').that.is.an('array');
						if(res.body.success && res.body.launched != null) {
							var flag = 0;
							for (var i = 0; i < res.body.launched.length; i++) {
								if (res.body.launched[i] != null) {
									if (res.body.launched[i] === dappId) {
										flag += 1;
									}
								}
							}
							node.expect(flag).to.equal(1);
						} else {
							// console.log(JSON.stringify(res.body));
							console.log('Request failed or launched array is null');
						}
					});
				done();
			});
	});
});

describe('POST /dapps/stop', function () {

	it('using no id should fail', function (done) {
		node.api.post('/dapps/stop')
			.set('Accept', 'application/json')
			.send({})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using unknown id should fail', function (done) {
		var dappId = 'UNKNOWN_ID';

		node.api.post('/dapps/stop')
			.set('Accept', 'application/json')
			.send({
				id: dappId,
				master: node.config.dapp.masterpassword
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using valid id should be ok', function (done) {
		var dappId = DappToInstall.transactionId;

		node.api.post('/dapps/stop')
			.set('Accept', 'application/json')
			.send({
				id: dappId,
				master: node.config.dapp.masterpassword
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				done();
			});
	});
});

describe('GET /dapps/categories', function () {

	it('should be ok', function (done) {
		node.api.get('/dapps/categories')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('categories').that.is.an('object');
				for (var i in node.DappCategory) {
					node.expect(res.body.categories[i]).to.equal(node.DappCategory[i]);
				}
				done();
			});
	});
});

describe('POST /dapps/uninstall', function () {

	it('using no id should fail', function (done) {
		node.api.post('/dapps/uninstall')
			.set('Accept', 'application/json')
			.send({
				id: null,
				master: node.config.dapp.masterpassword
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using unknown id should fail', function (done) {
		var dappId = 'UNKNOWN_ID';

		node.api.post('/dapps/uninstall')
			.set('Accept', 'application/json')
			.send({
				id: dappId,
				master: node.config.dapp.masterpassword
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				done();
			});
	});

	it('using valid id should be ok', function (done) {
		var dappId = DappToInstall.transactionId;

		node.api.post('/dapps/uninstall')
			.set('Accept', 'application/json')
			.send({
				id: dappId,
				master: node.config.dapp.masterpassword
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				done();
			});
	});
});
