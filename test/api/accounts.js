'use strict'; /*jslint mocha:true, expr:true */

var node = require('./../node.js');

var account = node.randomAccount();

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

function generatePublicKey (params, done) {
	node.api.post('/accounts/generatePublicKey')
		.set('Accept', 'application/json')
		.send(params)
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			done(err, res);
		});
}

function getBalance (address, done) {
	node.api.get('/accounts/getBalance?address=' + address)
		.set('Accept', 'application/json')
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			done(err, res);
		});
}

function getPublicKey (address, done) {
	node.api.get('/accounts/getPublicKey?address=' + address)
		.set('Accept', 'application/json')
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			done(err, res);
		});
}

function getAccount (address, done) {
	node.api.get('/accounts?address=' + address)
		.set('Accept', 'application/json')
		.expect('Content-Type', /json/)
		.expect(200)
		.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			done(err, res);
		});
}

describe('POST /accounts/open', function () {

	it('using known passphrase should be ok', function (done) {
		openAccount({
			secret: node.gAccount.password
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('account').that.is.an('object');
			node.expect(res.body.account).to.have.property('address').to.equal(node.gAccount.address);
			node.expect(res.body.account).to.have.property('unconfirmedBalance').that.is.a('string');
			node.expect(res.body.account).to.have.property('balance').that.is.a('string');
			node.expect(res.body.account).to.have.property('publicKey').to.equal(node.gAccount.publicKey);
			node.expect(res.body.account).to.have.property('unconfirmedSignature').to.equal(0);
			node.expect(res.body.account).to.have.property('secondSignature').to.equal(0);
			node.expect(res.body.account).to.have.property('secondPublicKey').to.equal(null);
			node.expect(res.body.account).to.have.property('multisignatures').to.equal(null);
			node.expect(res.body.account).to.have.property('u_multisignatures').to.equal(null);
			done();
		});
	});

	it('using unknown passphrase should be ok', function (done) {
		var account = node.randomAccount();

		openAccount({
			secret: account.password
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('account').that.is.an('object');
			node.expect(res.body.account).to.have.property('address').to.equal(account.address);
			node.expect(res.body.account).to.have.property('unconfirmedBalance').that.is.a('string');
			node.expect(res.body.account).to.have.property('balance').that.is.a('string');
			node.expect(res.body.account).to.have.property('publicKey').to.equal(account.publicKey);
			node.expect(res.body.account).to.have.property('unconfirmedSignature').to.equal(0);
			node.expect(res.body.account).to.have.property('secondSignature').to.equal(0);
			node.expect(res.body.account).to.have.property('secondPublicKey').to.equal(null);
			node.expect(res.body.account).to.have.property('multisignatures').to.equal(null);
			node.expect(res.body.account).to.have.property('u_multisignatures').to.equal(null);
			done();
		});
	});

	it('using empty json should fail', function (done) {
		openAccount({}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.contain('Missing required property: secret');
			done();
		});
	});

	it('using invalid json should fail', function (done) {
		openAccount('{\'invalid\'}', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.contain('Missing required property: secret');
			done();
		});
	});

	it('using empty passphrase should fail', function (done) {
		openAccount({
			secret: ''
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.contain('String is too short (0 chars), minimum 1');
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
			node.expect(res.body.error).to.have.property('message').to.equal('request entity too large');
			node.expect(res.body.error).to.have.property('limit').to.equal(2097152);
			done();
		});
	});
});

describe('GET /accounts/getBalance?address=', function () {

	it('using known address should be ok', function (done) {
		getBalance(node.gAccount.address, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('balance').that.is.a('string');
			node.expect(res.body).to.have.property('unconfirmedBalance').that.is.a('string');
			done();
		});
	});

	it('using unknown address should be ok', function (done) {
		getBalance(account.address, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('balance').that.is.a('string');
			node.expect(res.body).to.have.property('unconfirmedBalance').that.is.a('string');
			done();
		});
	});

	it('using invalid address should fail', function (done) {
		getBalance('thisIsNOTALiskAddress', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('Invalid address');
			done();
		});
	});

	it('using empty address should fail', function (done) {
		getBalance('', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.contain('String is too short (0 chars), minimum 1');
			done();
		});
	});
});

describe('GET /accounts/getPublicKey?address=', function () {

	it('using known address should be ok', function (done) {
		getPublicKey(node.gAccount.address, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('publicKey').to.equal(node.gAccount.publicKey);
			done();
		});
	});

	it('using unknown address should be ok', function (done) {
		getPublicKey(account.address, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.contain('Account not found');
			done();
		});
	});

	it('using invalid address should fail', function (done) {
		getPublicKey('thisIsNOTALiskAddress', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.contain('Invalid address');
			done();
		});
	});

	it('using empty address should fail', function (done) {
		getPublicKey('', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.contain('String is too short (0 chars), minimum 1');
			done();
		});
	});
});

describe('POST /accounts/generatePublicKey', function () {

	it('using known passphrase should be ok', function (done) {
		generatePublicKey({
			secret: node.gAccount.password
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('publicKey').to.equal(node.gAccount.publicKey);
			done();
		});
	});

	it('using unknown passphrase should be ok', function (done) {
		generatePublicKey({
			secret: account.password
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('publicKey').to.equal(account.publicKey);
			done();
		});
	});

	it('using empty json should fail', function (done) {
		generatePublicKey({}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.contain('Missing required property: secret');
			done();
		});
	});

	it('using invalid json should fail', function (done) {
		generatePublicKey('{\'invalid\'}', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.contain('Missing required property: secret');
			done();
		});
	});

	it('using empty passphrase should fail', function (done) {
		generatePublicKey({
			secret: ''
		}, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.contain('String is too short (0 chars), minimum 1');
			done();
		});
	});
});

describe('GET /accounts?address=', function () {

	it('using known address should be ok', function (done) {
		getAccount(node.gAccount.address, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('account').that.is.an('object');
			node.expect(res.body.account).to.have.property('address').to.equal(node.gAccount.address);
			node.expect(res.body.account).to.have.property('unconfirmedBalance').that.is.a('string');
			node.expect(res.body.account).to.have.property('balance').that.is.a('string');
			node.expect(res.body.account).to.have.property('publicKey').to.equal(node.gAccount.publicKey);
			node.expect(res.body.account).to.have.property('unconfirmedSignature').to.equal(0);
			node.expect(res.body.account).to.have.property('secondSignature').to.equal(0);
			node.expect(res.body.account).to.have.property('secondPublicKey').to.equal(null);
			node.expect(res.body.account).to.have.property('multisignatures').to.a('array');
			node.expect(res.body.account).to.have.property('u_multisignatures').to.a('array');
			done();
		});
	});

	it('using known lowercase address should be ok', function (done) {
		getAccount(node.gAccount.address.toLowerCase(), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('account').that.is.an('object');
			node.expect(res.body.account).to.have.property('address').to.equal(node.gAccount.address);
			node.expect(res.body.account).to.have.property('unconfirmedBalance').that.is.a('string');
			node.expect(res.body.account).to.have.property('balance').that.is.a('string');
			node.expect(res.body.account).to.have.property('publicKey').to.equal(node.gAccount.publicKey);
			node.expect(res.body.account).to.have.property('unconfirmedSignature').to.equal(0);
			node.expect(res.body.account).to.have.property('secondSignature').to.equal(0);
			node.expect(res.body.account).to.have.property('secondPublicKey').to.equal(null);
			node.expect(res.body.account).to.have.property('multisignatures').to.a('array');
			node.expect(res.body.account).to.have.property('u_multisignatures').to.a('array');
			done();
		});
	});

	it('using unknown address should fail', function (done) {
		getAccount(account.address, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('Account not found');
			done();
		});
	});

	it('using invalid address should fail', function (done) {
		getAccount('thisIsNOTAValidLiskAddress', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.contain('Invalid address');
			done();
		});
	});

	it('using empty address should fail', function (done) {
		getAccount('', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.contain('String is too short (0 chars), minimum 1');
			done();
		});
	});
});
