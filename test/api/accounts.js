'use strict'; /*jslint mocha:true, expr:true */

var node = require('./../node.js');
var path = require('path');
var spawn = require('child_process').spawn;

var account = {
	'address': '12099044743111170367L',
	'publicKey': 'fbd20d4975e53916488791477dd38274c1b4ec23ad322a65adb171ec2ab6a0dc',
	'password': 'sebastian',
	'name': 'sebastian',
	'balance': 0
};

function openAccount (params, done) {
	node.api.post('/accounts/open')
		.set('Accept', 'application/json')
		.send(params)
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			done(err, res);
		});
}

describe('POST /accounts/open', function () {

	it('using valid passphrase: '+account.password+' should be ok', function (done) {
		openAccount({
			secret: account.password
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('account').that.is.an('object');
			node.expect(res.body.account.address).to.equal(account.address);
			node.expect(res.body.account.publicKey).to.equal(account.publicKey);
			account.balance = res.body.account.balance;
			done();
		});
	});

	it('using empty json should fail', function (done) {
		openAccount({}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			// node.expect(res.body.error).to.contain('Provide secret key of account');
			done();
		});
	});

	it('using empty passphrase should fail', function (done) {
		openAccount({
			secret: ''
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			// node.expect(res.body.error).to.contain('Provide secret key of account');
			done();
		});
	});

	it('using invalid json should fail', function (done) {
		openAccount('{\'invalid\'}', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			// node.expect(res.body.error).to.contain('Provide secret key of account');
			done();
		});
	});

	it('when payload is over 2Mb should fail', function (done) {
		var data = 'qs';
		for (var i = 0; i < 20; i++) {
			data += data;
		}
		openAccount({
			secret: data
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').that.is.an('object');
			node.expect(res.body.error).to.have.property('limit').to.equal(2097152);
			done();
		});
	});
});

describe('GET /accounts/getBalance', function () {

	it('using valid params should be ok', function (done) {
		node.api.get('/accounts/getBalance?address=' + account.address)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('balance');
				node.expect(res.body.balance).to.equal(account.balance);
				done();
			});
	});

	it('using invalid address should fail', function (done) {
		node.api.get('/accounts/getBalance?address=thisIsNOTALiskAddress')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				// expect(res.body.error).to.contain('Provide valid Lisk address');
				done();
			});
	});

	it('using no address should fail', function (done) {
		node.api.get('/accounts/getBalance')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				// node.expect(res.body.error).to.contain('Provide address in url');
				done();
			});
	});
});

describe('GET /accounts/getPublicKey', function () {

	it('using valid address should be ok', function (done) {
		node.api.get('/accounts/getPublicKey?address=' + account.address)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('publicKey');
				node.expect(res.body.publicKey).to.equal(account.publicKey);
				done();
			});
	});

	it('using invalid address should fail', function (done) {
		node.api.get('/accounts/getPublicKey?address=thisIsNOTALiskAddress')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				// expect(res.body.error).to.contain('Provide valid Lisk address');
				done();
			});
	});

	it('using no address should fail', function (done) {
		node.api.get('/accounts/getPublicKey?address=')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				// expect(res.body.error).to.contain('Provide valid Lisk address');
				done();
			});
	});

	it('using valid params should be ok', function (done) {
		node.api.post('/accounts/generatePublicKey')
			.set('Accept', 'application/json')
			.send({
				secret: account.password
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('publicKey');
				node.expect(res.body.publicKey).to.equal(account.publicKey);
				done();
			});
	});
});

describe('POST /accounts/generatePublicKey', function () {

	it('using empty passphrase should fail', function (done) {
		node.api.post('/accounts/generatePublicKey')
			.set('Accept', 'application/json')
			.send({
				secret: ''
			})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				// node.expect(res.body.error).to.contain('Provide secret key');
				done();
			});
	});

	it('using no params should fail', function (done) {
		node.api.post('/accounts/generatePublicKey')
			.set('Accept', 'application/json')
			.send({})
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				// node.expect(res.body.error).to.contain('Provide secret key');
				done();
			});
	});

	it('using invalid json should fail', function (done) {
		node.api.post('/accounts/generatePublicKey')
			.set('Accept', 'application/json')
			.send('{\'invalid\'}')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				// node.expect(res.body.error).to.contain('Provide secret key');
				done();
			});
	});
});

describe('GET /accounts?address=', function () {

	it('using valid address should be ok', function (done) {
		node.api.get('/accounts?address=' + account.address)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('account').that.is.an('object');
				node.expect(res.body.account.address).to.equal(account.address);
				node.expect(res.body.account.publicKey).to.equal(account.publicKey);
				node.expect(res.body.account.balance).to.equal(account.balance);
				done();
			});
	});

	it('using lowercase address should be ok', function (done) {
		node.api.get('/accounts?address=' + account.address.toLowerCase())
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('account').that.is.an('object');
				node.expect(res.body.account.address).to.equal(account.address);
				node.expect(res.body.account.publicKey).to.equal(account.publicKey);
				node.expect(res.body.account.balance).to.equal(account.balance);
				done();
			});
	});

	it('using invalid address should fail', function (done) {
		node.api.get('/accounts?address=thisIsNOTAValidLiskAddress')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				// expect(res.body.error).to.contain('Provide valid Lisk address');
				done();
			});
	});

	it('using empty address should fail', function (done) {
		node.api.get('/accounts?address=')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error');
				// node.expect(res.body.error).to.contain('Provide address in url');
				done();
			});
	});
});
