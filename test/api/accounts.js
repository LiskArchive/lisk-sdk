'use strict';

var node = require('../node.js');
var http = require('../common/httpCommunication.js');

var account = node.randomAccount();

describe('GET /api/accounts/getBalance?address=', function () {

	function getBalance (address, done) {
		http.get('/api/accounts/getBalance?address=' + address, done);
	}

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
			node.expect(res.body).to.have.property('error').to.eql('Object didn\'t pass validation for format address: thisIsNOTALiskAddress');
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

describe('GET /api/accounts/getPublicKey?address=', function () {

	function getPublicKey (address, done) {
		http.get('/api/accounts/getPublicKey?address=' + address, done);
	}

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
			node.expect(res.body).to.have.property('error').to.contain('Object didn\'t pass validation for format address: thisIsNOTALiskAddress');
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

describe('GET /accounts', function () {

	function getAccounts (params, done) {
		http.get('/api/accounts?' + params, done);
	}

	it('using known address should be ok', function (done) {
		getAccounts('address=' + node.gAccount.address, function (err, res) {
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

	it('using known address and empty publicKey should be ok', function (done) {
		getAccounts('address=' + node.gAccount.address + '&publicKey=', function (err, res) {
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
		getAccounts('address=' + node.gAccount.address.toLowerCase(), function (err, res) {
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
		getAccounts('address=' + account.address, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('Account not found');
			done();
		});
	});

	it('using invalid address should fail', function (done) {
		getAccounts('address=' + 'thisIsNOTALiskAddress', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.contain('Object didn\'t pass validation for format address: thisIsNOTALiskAddress');
			done();
		});
	});

	it('using empty address should fail', function (done) {
		getAccounts('address=', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.contain('String is too short (0 chars), minimum 1');
			done();
		});
	});

	it('using known publicKey should be ok', function (done) {
		getAccounts('publicKey=' + node.gAccount.publicKey, function (err, res) {
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

	it('using known publicKey and empty address should fail', function (done) {
		getAccounts('publicKey=' + node.gAccount.publicKey + '&address=', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('String is too short (0 chars), minimum 1');
			done();
		});
	});

	it('using unknown publicKey should fail', function (done) {
		getAccounts('publicKey=' + account.publicKey, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.eql('Account not found');
			done();
		});
	});

	it('using invalid publicKey should fail', function (done) {
		getAccounts('publicKey=' + 'thisIsNOTALiskAccountPublicKey', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.contain('Object didn\'t pass validation for format publicKey: thisIsNOTALiskAccountPublicKey');
			done();
		});
	});

	it('using invalid publicKey (integer) should fail', function (done) {
		getAccounts('publicKey=' + '123', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.contain('Expected type string but found type integer');
			done();
		});
	});

	it('using empty publicKey should fail', function (done) {
		getAccounts('publicKey=', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.contain('Missing required property: address or publicKey');
			done();
		});
	});

	it('using empty publicKey and address should fail', function (done) {
		getAccounts('publicKey=&address=', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.contain('String is too short (0 chars), minimum 1');
			done();
		});
	});

	it('using known address and matching publicKey should be ok', function (done) {
		getAccounts('address=' + node.gAccount.address + '&publicKey=' + node.gAccount.publicKey, function (err, res) {
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

	it('using known address and not matching publicKey should fail', function (done) {
		getAccounts('address=' + node.gAccount.address + '&publicKey=' + account.publicKey, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			node.expect(res.body.error).to.contain('Account publicKey does not match address');
			done();
		});
	});

});
