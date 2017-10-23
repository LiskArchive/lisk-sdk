'use strict';

var node = require('../../../node.js');

var getAccountsPromise = require('../../../common/apiHelpers').getAccountsPromise;
var getBalancePromise = require('../../../common/apiHelpers').getBalancePromise;
var getPublicKeyPromise = require('../../../common/apiHelpers').getPublicKeyPromise;

describe('GET /api/accounts', function () {
	
	var account = node.randomAccount();

	describe('/', function () {

		it('using known address should be ok', function () {
			return getAccountsPromise('address=' + node.gAccount.address).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('account').that.is.an('object');
				node.expect(res.account).to.have.property('address').to.equal(node.gAccount.address);
				node.expect(res.account).to.have.property('unconfirmedBalance').that.is.a('string');
				node.expect(res.account).to.have.property('balance').that.is.a('string');
				node.expect(res.account).to.have.property('publicKey').to.equal(node.gAccount.publicKey);
				node.expect(res.account).to.have.property('unconfirmedSignature').to.equal(0);
				node.expect(res.account).to.have.property('secondSignature').to.equal(0);
				node.expect(res.account).to.have.property('secondPublicKey').to.equal(null);
				node.expect(res.account).to.have.property('multisignatures').to.a('array');
				node.expect(res.account).to.have.property('u_multisignatures').to.a('array');
			});
		});

		it('using known address and empty publicKey should be ok', function () {
			return getAccountsPromise('address=' + node.gAccount.address + '&publicKey=').then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('account').that.is.an('object');
				node.expect(res.account).to.have.property('address').to.equal(node.gAccount.address);
				node.expect(res.account).to.have.property('unconfirmedBalance').that.is.a('string');
				node.expect(res.account).to.have.property('balance').that.is.a('string');
				node.expect(res.account).to.have.property('publicKey').to.equal(node.gAccount.publicKey);
				node.expect(res.account).to.have.property('unconfirmedSignature').to.equal(0);
				node.expect(res.account).to.have.property('secondSignature').to.equal(0);
				node.expect(res.account).to.have.property('secondPublicKey').to.equal(null);
				node.expect(res.account).to.have.property('multisignatures').to.a('array');
				node.expect(res.account).to.have.property('u_multisignatures').to.a('array');
			});
		});

		it('using known lowercase address should be ok', function () {
			return getAccountsPromise('address=' + node.gAccount.address.toLowerCase()).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('account').that.is.an('object');
				// Address should still in uppercase
				node.expect(res.account).to.have.property('address').to.equal(node.gAccount.address);
				node.expect(res.account).to.have.property('unconfirmedBalance').that.is.a('string');
				node.expect(res.account).to.have.property('balance').that.is.a('string');
				node.expect(res.account).to.have.property('publicKey').to.equal(node.gAccount.publicKey);
				node.expect(res.account).to.have.property('unconfirmedSignature').to.equal(0);
				node.expect(res.account).to.have.property('secondSignature').to.equal(0);
				node.expect(res.account).to.have.property('secondPublicKey').to.equal(null);
				node.expect(res.account).to.have.property('multisignatures').to.a('array');
				node.expect(res.account).to.have.property('u_multisignatures').to.a('array');
			});
		});

		it('using unknown address should fail', function () {
			return getAccountsPromise('address=' + account.address).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.eql('Account not found');
			});
		});

		it('using invalid address should fail', function () {
			return getAccountsPromise('address=' + 'invalidAddress').then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
				node.expect(res.error).to.contain('Object didn\'t pass validation for format address: invalidAddress');
			});
		});

		it('using empty address should fail', function () {
			return getAccountsPromise('address=').then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
				node.expect(res.error).to.contain('String is too short (0 chars), minimum 1');
			});
		});

		it('using known publicKey should be ok', function () {
			return getAccountsPromise('publicKey=' + node.gAccount.publicKey).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('account').that.is.an('object');
				node.expect(res.account).to.have.property('address').to.equal(node.gAccount.address);
				node.expect(res.account).to.have.property('unconfirmedBalance').that.is.a('string');
				node.expect(res.account).to.have.property('balance').that.is.a('string');
				node.expect(res.account).to.have.property('publicKey').to.equal(node.gAccount.publicKey);
				node.expect(res.account).to.have.property('unconfirmedSignature').to.equal(0);
				node.expect(res.account).to.have.property('secondSignature').to.equal(0);
				node.expect(res.account).to.have.property('secondPublicKey').to.equal(null);
				node.expect(res.account).to.have.property('multisignatures').to.a('array');
				node.expect(res.account).to.have.property('u_multisignatures').to.a('array');
			});
		});

		it('using known publicKey and empty address should fail', function () {
			return getAccountsPromise('publicKey=' + node.gAccount.publicKey + '&address=').then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.eql('String is too short (0 chars), minimum 1');
			});
		});

		it('using unknown publicKey should fail', function () {
			return getAccountsPromise('publicKey=' + account.publicKey).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.eql('Account not found');
			});
		});

		it('using invalid publicKey should fail', function () {
			return getAccountsPromise('publicKey=' + 'invalidPublicKey').then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
				node.expect(res.error).to.contain('Object didn\'t pass validation for format publicKey: invalidPublicKey');
			});
		});

		it('using invalid publicKey (integer) should fail', function () {
			return getAccountsPromise('publicKey=' + '123').then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
				node.expect(res.error).to.contain('Expected type string but found type integer');
			});
		});

		it('using empty publicKey should fail', function () {
			return getAccountsPromise('publicKey=').then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
				node.expect(res.error).to.contain('Missing required property: address or publicKey');
			});
		});

		it('using empty publicKey and address should fail', function () {
			return getAccountsPromise('publicKey=&address=').then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
				node.expect(res.error).to.contain('String is too short (0 chars), minimum 1');
			});
		});

		it('using known address and matching publicKey should be ok', function () {
			return getAccountsPromise('address=' + node.gAccount.address + '&publicKey=' + node.gAccount.publicKey).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('account').that.is.an('object');
				node.expect(res.account).to.have.property('address').to.equal(node.gAccount.address);
				node.expect(res.account).to.have.property('unconfirmedBalance').that.is.a('string');
				node.expect(res.account).to.have.property('balance').that.is.a('string');
				node.expect(res.account).to.have.property('publicKey').to.equal(node.gAccount.publicKey);
				node.expect(res.account).to.have.property('unconfirmedSignature').to.equal(0);
				node.expect(res.account).to.have.property('secondSignature').to.equal(0);
				node.expect(res.account).to.have.property('secondPublicKey').to.equal(null);
				node.expect(res.account).to.have.property('multisignatures').to.a('array');
				node.expect(res.account).to.have.property('u_multisignatures').to.a('array');
			});
		});

		it('using known address and not matching publicKey should fail', function () {
			return getAccountsPromise('address=' + node.gAccount.address + '&publicKey=' + account.publicKey).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
				node.expect(res.error).to.contain('Account publicKey does not match address');
			});
		});

	});

	describe('/getBalance?address=', function () {

		it('using known address should be ok', function () {
			return getBalancePromise(node.gAccount.address).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('balance').that.is.a('string');
				node.expect(res).to.have.property('unconfirmedBalance').that.is.a('string');
			});
		});

		it('using unknown address should be ok', function () {
			return getBalancePromise(account.address).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('balance').that.is.a('string');
				node.expect(res).to.have.property('unconfirmedBalance').that.is.a('string');
			});
		});

		it('using invalid address should fail', function () {
			return getBalancePromise('invalidAddress').then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.eql('Object didn\'t pass validation for format address: invalidAddress');
			});
		});

		it('using empty address should fail', function () {
			return getBalancePromise('').then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
				node.expect(res.error).to.contain('String is too short (0 chars), minimum 1');
			});
		});
	});

	describe('/getPublicKey?address=', function () {

		it('using known address should be ok', function () {
			return getPublicKeyPromise(node.gAccount.address).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('publicKey').to.equal(node.gAccount.publicKey);
			});
		});

		it('using unknown address should be ok', function () {
			return getPublicKeyPromise(account.address).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.contain('Account not found');
			});
		});

		it('using invalid address should fail', function () {
			return getPublicKeyPromise('invalidAddress').then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.contain('Object didn\'t pass validation for format address: invalidAddress');
			});
		});

		it('using empty address should fail', function () {
			return getPublicKeyPromise('').then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
				node.expect(res.error).to.contain('String is too short (0 chars), minimum 1');
			});
		});
	});
});
