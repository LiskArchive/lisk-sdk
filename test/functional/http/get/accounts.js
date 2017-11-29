'use strict';

require('../../functional.js');

var _ = require('lodash');
var node = require('../../../node');
var accountFixtures = require('../../../fixtures/accounts');

var constants = require('../../../../helpers/constants');

var apiHelpers = require('../../../common/apiHelpers');
var creditAccountPromise = require('../../../common/apiHelpers').creditAccountPromise;
var sendTransactionPromise = apiHelpers.sendTransactionPromise;
var waitForConfirmations = require('../../../common/apiHelpers').waitForConfirmations;
var swaggerEndpoint = require('../../../common/swaggerSpec');
var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

var randomUtil = require('../../../common/utils/random');

describe('GET /accounts', function () {

	var account = randomUtil.account();
	var accountsEndpoint = new swaggerEndpoint('GET /accounts');

	describe('?', function () {

		describe('address', function () {

			it('using known address should be ok', function () {
				return accountsEndpoint.makeRequest({address: accountFixtures.genesis.address}, 200);
			});

			it('using known address and empty publicKey should return empty result', function () {
				return accountsEndpoint.makeRequest({address: accountFixtures.genesis.address, publicKey: ''}, 200).then(function (res) {
					res.body.data.should.have.length(0);
				});
			});

			it('using known lowercase address should be ok', function () {
				return accountsEndpoint.makeRequest({address: accountFixtures.genesis.address.toLowerCase()}, 200);
			});

			it('using unknown address should return empty result', function () {
				return accountsEndpoint.makeRequest({address: account.address}, 200).then(function (res) {
					res.body.data.should.have.length(0);
				});
			});

			it('using invalid address should fail', function () {
				return accountsEndpoint.makeRequest({address: 'InvalidAddress'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'address');
				});
			});

			it('using empty address should fail', function () {
				return accountsEndpoint.makeRequest({address: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'address');
				});
			});
		});

		describe('publicKey', function () {

			it('using known publicKey should be ok', function () {
				return accountsEndpoint.makeRequest({publicKey: accountFixtures.genesis.publicKey}, 200);
			});

			it('using known publicKey and empty address should fail', function () {
				return accountsEndpoint.makeRequest({publicKey: accountFixtures.genesis.publicKey, address: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'address');
				});
			});

			it('using unknown publicKey should return empty result', function () {
				return accountsEndpoint.makeRequest({publicKey: account.publicKey}, 200).then(function (res) {
					res.body.data.should.have.length(0);
				});
			});

			it('using invalid publicKey should fail', function () {
				return accountsEndpoint.makeRequest({publicKey: 'invalidPublicKey'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'publicKey');
				});
			});

			it('using invalid publicKey (integer) should fail', function () {
				return accountsEndpoint.makeRequest({publicKey: '123'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'publicKey');
				});
			});

			it('using empty publicKey should return empty results', function () {
				return accountsEndpoint.makeRequest({publicKey: ''}, 200).then(function (res) {
					res.body.data.should.have.length(0);
				});
			});

			it('using empty publicKey and address should fail', function () {
				return accountsEndpoint.makeRequest({publicKey: '', address: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'address');
				});
			});

			it('using known address and matching publicKey should be ok', function () {
				return accountsEndpoint.makeRequest({publicKey: accountFixtures.genesis.publicKey, address: accountFixtures.genesis.address}, 200).then(function (res) {
					res.body.data.should.have.length(1);
					res.body.data[0].address.should.be.eql(accountFixtures.genesis.address);
					res.body.data[0].publicKey.should.be.eql(accountFixtures.genesis.publicKey);
				});
			});

			it('using known address and not matching publicKey should return empty result', function () {
				return accountsEndpoint.makeRequest({publicKey: account.publicKey, address: accountFixtures.genesis.address}, 200).then(function (res) {
					res.body.data.should.have.length(0);
				});
			});
		});

		describe('secondPublicKey', function () {

			var secondPublicKeyAccount = randomUtil.account();
			var creditTransaction = node.lisk.transaction.createTransaction(secondPublicKeyAccount.address, constants.fees.secondSignature, accountFixtures.genesis.password);
			var signatureTransaction = node.lisk.signature.createSignature(secondPublicKeyAccount.password, secondPublicKeyAccount.secondPassword);

			before(function () {
				return sendTransactionPromise(creditTransaction).then(function (res) {
					res.statusCode.should.be.eql(200);
					return waitForConfirmations([creditTransaction.id]);
				}).then(function () {
					return sendTransactionPromise(signatureTransaction);
				}).then(function (res) {
					res.statusCode.should.be.eql(200);
					return waitForConfirmations([signatureTransaction.id]);
				});
			});

			it('using known secondPublicKey should be ok', function () {
				return accountsEndpoint.makeRequest({secondPublicKey: secondPublicKeyAccount.secondPublicKey}, 200).then(function (res) {
					res.body.data[0].secondPublicKey.should.be.eql(secondPublicKeyAccount.secondPublicKey);
				});
			});

			it('using unknown secondPublicKey should return empty result', function () {
				return accountsEndpoint.makeRequest({secondPublicKey: account.secondPublicKey}, 200).then(function (res) {
					res.body.data.should.have.length(0);
				});
			});

			it('using invalid secondPublicKey should fail', function () {
				return accountsEndpoint.makeRequest({secondPublicKey: 'invalidPublicKey'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'secondPublicKey');
				});
			});
		});

		describe('username', function () {

			it('using empty username name should fail', function () {
				return accountsEndpoint.makeRequest({username: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'username');
				});
			});

			it('using username with string greater than max length should fail', function () {
				return accountsEndpoint.makeRequest({username: _.repeat('a', 21)}, 400).then(function (res) {
					expectSwaggerParamError(res, 'username');
				});
			});

			it('using valid username name should result account', function () {
				return accountsEndpoint.makeRequest({username: accountFixtures.existingDelegate.delegateName}, 200).then(function (res) {
					res.body.data.should.have.length(1);
					res.body.data[0].address.should.be.eql(accountFixtures.existingDelegate.address);
					res.body.data[0].publicKey.should.be.eql(accountFixtures.existingDelegate.publicKey);
					res.body.data[0].delegate.username.should.to.eql(accountFixtures.existingDelegate.delegateName);
				});
			});
		});

		describe('limit', function () {

			it('using limit = 0 should return error', function () {
				return accountsEndpoint.makeRequest({limit: 0}, 400).then(function (res) {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using limit = 102 should return error', function () {
				return accountsEndpoint.makeRequest({limit: 102}, 400).then(function (res) {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using limit = 5 should return return 5 accounts', function () {
				return accountsEndpoint.makeRequest({limit: 5}, 200).then(function (res) {
					res.body.data.should.have.length(5);
				});
			});
		});

		describe.skip('sort', function () {
			it('using sort = invalid should return error', function () {
				return accountsEndpoint.makeRequest({sort: 'invalid'}, 400);
			});

			it('using no sort return accounts sorted by balance in asending order as default behavior', function () {
				return accountsEndpoint.makeRequest({sort: 'balance:asc'}, 200).then(function (res) {
					var balances = _(res.body.data).map('balance').value();
					_.clone(balances).sort().should.be.eql(balances);
				});
			});

			it('using sort = balance:asc should return accounts in ascending order by balance', function () {
				return accountsEndpoint.makeRequest({sort: 'balance:asc'}, 200).then(function (res) {
					var balances = _(res.body.data).map('balance').value();
					_.clone(balances).sort().should.be.eql(balances);
				});
			});

			it('using sort = balance:desc should return accounts in descending order by balance', function () {
				return accountsEndpoint.makeRequest({sort: 'balance:desc'}, 200).then(function (res) {
					var balances = _(res.body.data).map('balance').value();
					_.clone(balances).sort().reverse().should.be.eql(balances);
				});
			});
		});

		describe('offset', function () {

			it('using offset = -1 should return error', function () {
				return accountsEndpoint.makeRequest({offset: -1}, 400).then(function (res) {
					expectSwaggerParamError(res, 'offset');
				});
			});

			it('using offset = 5 should return accounts including top 5', function () {
				var res1;

				return accountsEndpoint.makeRequest({offset: 0}, 200).then(function (res) {
					res1 = res;
					return accountsEndpoint.makeRequest({offset: 5}, 200);
				}).then(function (res2) {
					res2.body.data.should.include.deep.members(res1.body.data.slice(-5));
				});
			});
		});

		describe('sort, offset & limit together', function () {

			it('using sort = balance:asc and offset = 1 and limit = 5 should return 5 accounts sorted by balance', function () {
				return accountsEndpoint.makeRequest({sort: 'balance:asc', offset: 1, limit: 5}, 200).then(function (res) {
					var balances = _(res.body.data).map('balance').value();

					res.body.data.should.have.length(5);
					_.clone(balances).sort().reverse().should.be.eql(balances);
				});
			});
		});

		it('should return delegate properties for a delegate account', function () {
			return accountsEndpoint.makeRequest({address: accountFixtures.existingDelegate.address}, 200).then(function (res) {
				res.body.data[0].address.should.be.eql(accountFixtures.existingDelegate.address);
				res.body.data[0].publicKey.should.be.eql(accountFixtures.existingDelegate.publicKey);
				res.body.data[0].delegate.username.should.be.eql(accountFixtures.existingDelegate.delegateName);
			});
		});

		it('should return empty delegate property for a non delegate account', function () {
			return accountsEndpoint.makeRequest({address: accountFixtures.genesis.address}, 200).then(function (res) {
				res.body.data[0].address.should.be.eql(accountFixtures.genesis.address);
				res.body.data[0].publicKey.should.be.eql(accountFixtures.genesis.publicKey);
				res.body.data[0].should.not.have.property('delegate');
			});
		});
	});
});
