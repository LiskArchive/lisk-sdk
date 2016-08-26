'use strict'; /*jslint mocha:true, expr:true */

var node = require('./../node.js');
var path = require('path');

var Dapp = {};
var DappName = '';
var DappToInstall = {};
var transactionCount = 0;
var transactionList = [];

var account = node.randomTxAccount();
var account2 = node.randomTxAccount();
var account3 = node.randomTxAccount();

before(function (done) {
	node.api.post('/accounts/open')
		.set('Accept', 'application/json')
		.send({
			 secret: account.password,
			 secondSecret: account.secondPassword
		})
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			// console.log('Opening account with password:', account.password);
			node.expect(res.body).to.have.property('success').to.be.ok;
			if (res.body.success === true && res.body.account != null) {
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
	node.api.post('/accounts/open')
		.set('Accept', 'application/json')
		.send({
			 secret: account2.password,
			 secondSecret: account2.secondPassword
		})
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			 // console.log(JSON.stringify(res.body));
			 // console.log('Opening account with password:', account2.password);
			 node.expect(res.body).to.have.property('success').to.be.ok;
			 if (res.body.success === true && res.body.account != null) {
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
	node.api.post('/accounts/open')
		.set('Accept', 'application/json')
		.send({
			secret: account3.password,
			secondSecret: account3.secondPassword
		})
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			// console.log('Opening account with password:', account3.password);
			node.expect(res.body).to.have.property('success').to.be.ok;
			if (res.body.success === true && res.body.account != null) {
				account3.address = res.body.account.address;
				account3.publicKey = res.body.account.publicKey;
				account3.balance = res.body.account.balance;
			} else {
				// console.log('Failed to open account');
				// console.log('Secret:', account3.password, ', secondSecret:', account.secondPassword);
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

		node.api.put('/transactions')
			.set('Accept', 'application/json')
			.send({
				secret: node.Gaccount.password,
				amount: randomLISK,
				recipientId: account.address
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				if (res.body.success === true && res.body.transactionId != null) {
					// console.log('Sent to:', account.address, (randomLISK / node.normalizer), 'LISK');
					account.balance += randomLISK;
					transactionCount += 1;
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

		node.api.put('/transactions')
			.set('Accept', 'application/json')
			.send({
				secret: node.Gaccount.password,
				amount: randomLISK,
				recipientId: account2.address
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				if (res.body.success === true && res.body.transactionId != null) {
					// console.log('Sent to:', account2.address, (randomLISK / node.normalizer), 'LISK');
					// console.log('Expected fee (paid by sender):', expectedFee / node.normalizer, 'LISK');
					account2.balance += randomLISK;
					transactionCount += 1;
					transactionList[transactionCount - 1] = {
						'sender': node.Gaccount.address,
						'recipient': account2.address,
						'grossSent': (randomLISK + expectedFee) / node.normalizer,
						'fee': expectedFee / node.normalizer,
						'netSent': randomLISK / node.normalizer,
						'txId': res.body.transactionId,
						'type':node.TxTypes.SEND
					};
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
		// Add 2nd password for Account 2
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

	it('using invalid 2nd passphrase should fail', function (done) {
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

	it('using valid Link should be ok', function (done) {
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

describe('GET /dapps', function () {

	before(function (done) {
		node.onNewBlock(done);
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
				if (res.body.success === true && res.body.dapps != null) {
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
				if (res.body.success === true && res.body.dapps != null) {
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
				if (res.body.success === true && res.body.dapps != null) {
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
				if (res.body.success === true && res.body.dapps != null) {
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
				if (res.body.success === true && res.body.dapps != null) {
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
					if (res.body.success === true && res.body.dapps != null) {
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
				if (res.body.success === true && res.body.dapps != null) {
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
				if (res.body.success === true && res.body.dapps != null) {
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
				if (res.body.success === true && res.body.dapps != null) {
					if (res.body.dapps[1] != null) {
						secondDapp = res.body.dapps[1];
						console.log(offset);
						node.api.get('/dapps?offset=' + offset )
							.expect('Content-Type', /json/)
							.expect(200)
							.end(function (err, res) {
								// console.log(JSON.stringify(res.body));
								node.expect(res.body).to.have.property('success').to.be.ok;
								if (res.body.success === true && res.body.dapps != null) {
									node.expect(res.body.dapps[0]).to.deep.equal(secondDapp);
								}
							});
					} else {
						// console.log(JSON.stringify(res.body));
						console.log('Only 1 dapp or something went wrong. Cannot check offset');
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
				if (res.body.success === true && res.body.dapp != null) {
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
				if (res.body.success === true && res.body.dapps != null) {
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
				if (res.body.success === true && res.body.ids != null) {
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
						if(res.body.success === true && res.body.launched != null) {
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
