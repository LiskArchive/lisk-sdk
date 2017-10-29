'use strict';

var _ = require('lodash');
var node = require('../../../node.js');

var getAccountsPromise = require('../../../common/apiHelpers').getAccountsPromise;
var getBalancePromise = require('../../../common/apiHelpers').getBalancePromise;
var getPublicKeyPromise = require('../../../common/apiHelpers').getPublicKeyPromise;

describe('GET /api/accounts', function () {
	
	var account = node.randomAccount();

	describe('/', function () {

		it('using known address should be ok', function () {
			return getAccountsPromise('address=' + node.gAccount.address).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.accounts').that.is.an('array');
				node.expect(res).to.have.nested.property('body.accounts[0].address').to.equal(node.gAccount.address);
				node.expect(res).to.have.nested.property('body.accounts[0].unconfirmedBalance').that.is.a('string');
				node.expect(res).to.have.nested.property('body.accounts[0].balance').that.is.a('string');
				node.expect(res).to.have.nested.property('body.accounts[0].publicKey').to.equal(node.gAccount.publicKey);
				node.expect(res).to.have.nested.property('body.accounts[0].unconfirmedSignature').to.equal(0);
				node.expect(res).to.have.nested.property('body.accounts[0].secondSignature').to.equal(0);
				node.expect(res).to.have.nested.property('body.accounts[0].secondPublicKey').to.equal(null);
			});
		});

		it('using known address and empty publicKey should return empty result', function () {
			return getAccountsPromise('address=' + node.gAccount.address + '&publicKey=').then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.accounts').that.is.an('array').to.have.length(0);
			});
		});

		it('using known lowercase address should be ok', function () {
			return getAccountsPromise('address=' + node.gAccount.address.toLowerCase()).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.accounts').that.is.an('array');
				node.expect(res).to.have.nested.property('body.accounts[0].address').to.equal(node.gAccount.address);
				node.expect(res).to.have.nested.property('body.accounts[0].unconfirmedBalance').that.is.a('string');
				node.expect(res).to.have.nested.property('body.accounts[0].balance').that.is.a('string');
				node.expect(res).to.have.nested.property('body.accounts[0].publicKey').to.equal(node.gAccount.publicKey);
				node.expect(res).to.have.nested.property('body.accounts[0].unconfirmedSignature').to.equal(0);
				node.expect(res).to.have.nested.property('body.accounts[0].secondSignature').to.equal(0);
				node.expect(res).to.have.nested.property('body.accounts[0].secondPublicKey').to.equal(null);
			});
		});

		it('using unknown address should fail', function () {
			return getAccountsPromise('address=' + account.address).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.accounts').that.is.an('array').to.have.length(0);
			});
		});

		it('using invalid address should fail', function () {
			return getAccountsPromise('address=' + 'invalidAddress').then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.contain('Object didn\'t pass validation for format address: invalidAddress');
			});
		});

		it('using empty address should fail', function () {
			return getAccountsPromise('address=').then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.contain('String is too short (0 chars), minimum 1');
			});
		});

		it('using known publicKey should be ok', function () {
			return getAccountsPromise('publicKey=' + node.gAccount.publicKey).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.accounts').that.is.an('array');
				node.expect(res).to.have.nested.property('body.accounts[0].address').to.equal(node.gAccount.address);
				node.expect(res).to.have.nested.property('body.accounts[0].unconfirmedBalance').that.is.a('string');
				node.expect(res).to.have.nested.property('body.accounts[0].balance').that.is.a('string');
				node.expect(res).to.have.nested.property('body.accounts[0].publicKey').to.equal(node.gAccount.publicKey);
				node.expect(res).to.have.nested.property('body.accounts[0].unconfirmedSignature').to.equal(0);
				node.expect(res).to.have.nested.property('body.accounts[0].secondSignature').to.equal(0);
				node.expect(res).to.have.nested.property('body.accounts[0].secondPublicKey').to.equal(null);
			});
		});

		it('using known publicKey and empty address should fail', function () {
			return getAccountsPromise('publicKey=' + node.gAccount.publicKey + '&address=').then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.contain('String is too short (0 chars), minimum 1');
			});
		});

		it('using unknown publicKey should return empty result', function () {
			return getAccountsPromise('publicKey=' + account.publicKey).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.accounts').that.is.an('array').to.have.length(0);
			});
		});

		it('using invalid publicKey should fail', function () {
			return getAccountsPromise('publicKey=' + 'invalidPublicKey').then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.contain('Object didn\'t pass validation for format publicKey: invalidPublicKey');
			});
		});

		it('using invalid publicKey (integer) should fail', function () {
			return getAccountsPromise('publicKey=' + '123').then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.contain('Expected type string but found type integer');
			});
		});

		it('using empty publicKey should return empty results', function () {
			return getAccountsPromise('publicKey=').then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.accounts').that.is.an('array').to.have.length(0);
			});
		});

		it('using empty publicKey and address should fail', function () {
			return getAccountsPromise('publicKey=&address=').then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.contain('String is too short (0 chars), minimum 1');
			});
		});

		it('using known address and matching publicKey should be ok', function () {
			return getAccountsPromise('address=' + node.gAccount.address + '&publicKey=' + node.gAccount.publicKey).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.accounts').that.is.an('array');
				node.expect(res).to.have.nested.property('body.accounts[0].address').to.equal(node.gAccount.address);
				node.expect(res).to.have.nested.property('body.accounts[0].unconfirmedBalance').that.is.a('string');
				node.expect(res).to.have.nested.property('body.accounts[0].balance').that.is.a('string');
				node.expect(res).to.have.nested.property('body.accounts[0].publicKey').to.equal(node.gAccount.publicKey);
				node.expect(res).to.have.nested.property('body.accounts[0].unconfirmedSignature').to.equal(0);
				node.expect(res).to.have.nested.property('body.accounts[0].secondSignature').to.equal(0);
				node.expect(res).to.have.nested.property('body.accounts[0].secondPublicKey').to.equal(null);
			});
		});

		it('using known address and not matching publicKey should return empty result', function () {
			return getAccountsPromise('address=' + node.gAccount.address + '&publicKey=' + account.publicKey).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.accounts').that.is.an('array').to.have.length(0);
			});
		});

		it('using valid username name should result account', function () {
			return getAccountsPromise('username=' + node.eAccount.delegateName).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.accounts').that.is.an('array').to.have.length(1);
				node.expect(res).to.have.nested.property('body.accounts').that.is.an('array');
				node.expect(res).to.have.nested.property('body.accounts[0].address').to.equal(node.eAccount.address);
				node.expect(res).to.have.nested.property('body.accounts[0].unconfirmedBalance').that.is.a('string');
				node.expect(res).to.have.nested.property('body.accounts[0].balance').that.is.a('string');
				node.expect(res).to.have.nested.property('body.accounts[0].publicKey').to.equal(node.eAccount.publicKey);
				node.expect(res).to.have.nested.property('body.accounts[0].unconfirmedSignature').to.equal(0);
				node.expect(res).to.have.nested.property('body.accounts[0].secondSignature').to.equal(0);
				node.expect(res).to.have.nested.property('body.accounts[0].secondPublicKey').to.equal(null);
			});
		});

		it('using limit = 5 should return return 5 accounts', function () {
			return getAccountsPromise('limit=' + 5).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.accounts').that.is.an('array').to.have.length(5);
			});
		});

		it('using sort = username and limit = 5 should return 5 accounts sorted by username', function () {
			return getAccountsPromise('limit=' + 5 + '&sort=' + 'username').then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.accounts').that.is.an('array').to.have.length(5);
				var accountUsernames = _.map(res.body.accounts, function (account) {
					return account.delegate.username;
				});
				node.expect(accountUsernames).eql([
					'genesis_1',
					'genesis_10',
					'genesis_100',
					'genesis_101',
					'genesis_11']);
			});
		});

		describe('limit', function () {

			it('using limit = 0 should return error', function () {
				return getAccountsPromise('limit=' + 0).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Value 0 is less than minimum 1');
				});
			});

			it('using limit = 102 should return error', function () {
				return getAccountsPromise('limit=' + 102).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Value 102 is greater than maximum 101');
				});
			});

			it('using limit = 5 should return return 5 accounts', function () {
				return getAccountsPromise('limit=' + 5).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.accounts').that.is.an('array').to.have.length(5);
				});
			});
		});
		
		it('should return delegate properties for an delegate account', function () {
			return getAccountsPromise('address=' + node.eAccount.address).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.accounts').that.is.an('array').to.have.length(1);
				node.expect(res).to.have.nested.property('body.accounts').that.is.an('array');
				node.expect(res).to.have.nested.property('body.accounts[0].address').to.equal(node.eAccount.address);
				node.expect(res).to.have.nested.property('body.accounts[0].unconfirmedBalance').that.is.a('string');
				node.expect(res).to.have.nested.property('body.accounts[0].balance').that.is.a('string');
				node.expect(res).to.have.nested.property('body.accounts[0].publicKey').to.equal(node.eAccount.publicKey);
				node.expect(res).to.have.nested.property('body.accounts[0].unconfirmedSignature').to.equal(0);
				node.expect(res).to.have.nested.property('body.accounts[0].secondSignature').to.equal(0);
				node.expect(res).to.have.nested.property('body.accounts[0].delegate').that.is.an('object');
				node.expect(res).to.have.nested.property('body.accounts[0].delegate.username').to.equal(node.eAccount.delegateName);
				node.expect(res).to.have.nested.property('body.accounts[0].delegate.rank').that.is.an('string');
				node.expect(res).to.have.nested.property('body.accounts[0].delegate.productivity').that.is.an('number');
				node.expect(res).to.have.nested.property('body.accounts[0].delegate.missedBlocks').that.is.an('string');
				node.expect(res).to.have.nested.property('body.accounts[0].delegate.producedBlocks').that.is.an('string');
				node.expect(res).to.have.nested.property('body.accounts[0].delegate.rewards').that.is.an('string');
				node.expect(res).to.have.nested.property('body.accounts[0].delegate.vote').that.is.an('string');
				node.expect(res).to.have.nested.property('body.accounts[0].delegate.approval').that.is.an('number');
			});
		});
	});
});
