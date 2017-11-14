'use strict';

var _ = require('lodash');
var node = require('../../../node.js');

var getAccountsPromise = require('../../../common/apiHelpers').getAccountsPromise;

describe('GET /api/accounts', function () {
	
	var account = node.randomAccount();

	// TODO: Remove commented pieces, or implement new way to see unconfirmedBalance from pool.
	function validateAccountFields (res, account) {
		node.expect(res).to.have.property('status').to.equal(200);
		node.expect(res).to.have.nested.property('body.accounts').that.is.an('array');
		node.expect(res).to.have.nested.property('body.accounts[0].address').to.equal(account.address);
		//node.expect(res).to.have.nested.property('body.accounts[0].unconfirmedBalance').that.is.a('string');
		node.expect(res).to.have.nested.property('body.accounts[0].balance').that.is.a('string');
		node.expect(res).to.have.nested.property('body.accounts[0].publicKey').to.equal(account.publicKey);
		//node.expect(res).to.have.nested.property('body.accounts[0].unconfirmedSignature').to.equal(0);
		//node.expect(res).to.have.nested.property('body.accounts[0].secondSignature').to.equal(0);
		node.expect(res).to.have.nested.property('body.accounts[0].secondPublicKey').to.equal(null);
	}

	function validateDelegateFields (res, account) {
		node.expect(res).to.have.nested.property('body.accounts[0].delegate').that.is.an('object');
		node.expect(res).to.have.nested.property('body.accounts[0].delegate.username').to.equal(account.delegateName);
		node.expect(res).to.have.nested.property('body.accounts[0].delegate.rank').that.is.an('string');
		node.expect(res).to.have.nested.property('body.accounts[0].delegate.productivity').that.is.an('number');
		node.expect(res).to.have.nested.property('body.accounts[0].delegate.missedBlocks').that.is.an('string');
		node.expect(res).to.have.nested.property('body.accounts[0].delegate.producedBlocks').that.is.an('string');
		node.expect(res).to.have.nested.property('body.accounts[0].delegate.rewards').that.is.an('string');
		node.expect(res).to.have.nested.property('body.accounts[0].delegate.vote').that.is.an('string');
		node.expect(res).to.have.nested.property('body.accounts[0].delegate.approval').that.is.an('number');
	}

	describe('?', function () {

		describe('address', function () {

			it('using known address should be ok', function () {
				return getAccountsPromise('address=' + node.gAccount.address).then(function (res) {
					validateAccountFields(res, node.gAccount);
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
					validateAccountFields(res, node.gAccount);
				});
			});

			it('using unknown address should return empty result', function () {
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
		});

		describe('publicKey', function () {

			it('using known publicKey should be ok', function () {
				return getAccountsPromise('publicKey=' + node.gAccount.publicKey).then(function (res) {
					validateAccountFields(res, node.gAccount);
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
					validateAccountFields(res, node.gAccount);
				});
			});

			it('using known address and not matching publicKey should return empty result', function () {
				return getAccountsPromise('address=' + node.gAccount.address + '&publicKey=' + account.publicKey).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.accounts').that.is.an('array').to.have.length(0);
				});
			});
		});

		describe('username', function () {

			it('using empty username name should fail', function () {
				return getAccountsPromise('username=').then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
				});
			});

			it('using username with string greater than max length should fail', function () {
				return getAccountsPromise('username=' + _.repeat('a', 21)).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
				});
			});

			it('using valid username name should result account', function () {
				return getAccountsPromise('username=' + node.eAccount.delegateName).then(function (res) {
					validateAccountFields(res, node.eAccount);
					validateDelegateFields(res, node.eAccount);
				});
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

		describe('with accounts prefetched', function () {

			var accountAddressesWithoutOffset;
			// Need to add sorting so that accounts returned are always in deterministic order.
			var sortingParam = 'sort=username';
			before(function () {
				return getAccountsPromise(sortingParam).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					accountAddressesWithoutOffset = res.body.accounts.map(function (account) {
						return account.address;
					});
				});
			});

			describe('offset', function () {

				it('using offset = -1 should return result', function () {
					return getAccountsPromise(sortingParam + '&offset=' + '-1').then(function (res) {
						node.expect(res).to.have.property('status').to.equal(400);
						node.expect(res).to.have.nested.property('body.message').to.equal('Value -1 is less than minimum 0');
					});
				});

				it('using offset = 5 should return accounts sorted according to username including top 5', function () {
					return getAccountsPromise(sortingParam + '&offset=' + '5').then(function (res) {
						node.expect(res).to.have.property('status').to.equal(200);
						var responseAccountAddresses = res.body.accounts.map(function (account) {
							return account.address;
						});
						node.expect(res).to.have.nested.property('body.accounts');
						node.expect(responseAccountAddresses).to.be.an('array').to.include.members(accountAddressesWithoutOffset.slice(5));
					});
				});
			});

			describe('sort', function () {

				describe('balance', function () {

					it('using sort = balance should sort accounts by balance in default ascending order', function () {
						return getAccountsPromise('limit=' + 5 + '&sort=balance').then(function (res) {
							node.expect(res).to.have.property('status').to.equal(200);
							node.expect(res).to.have.nested.property('body.accounts').that.is.an('array').to.have.length(5);
							var accountBalances = _.map(res.body.accounts, function (account) {
								return Number(account.balance);
							});
							node.expect(_.map(_.map(res.body.accounts, 'balance'), Number)).eql(_.sortBy(accountBalances));
						});
					});

					it('using sort = balance:desc should sort accounts by balance in descending order', function () {
						return getAccountsPromise('limit=' + 5 + '&sort=balance:desc').then(function (res) {
							node.expect(res).to.have.property('status').to.equal(200);
							node.expect(res).to.have.nested.property('body.accounts').that.is.an('array').to.have.length(5);
							var accountBalances = _.map(res.body.accounts, function (account) {
								return Number(account.balance);
							});
							node.expect(_.map(_.map(res.body.accounts, 'balance'), Number)).eql(_.sortBy(accountBalances).reverse());
						});
					});

					it('using sort = balance:asc should sort accounts by balance in ascending order', function () {
						return getAccountsPromise('limit=' + 5 + '&sort=balance:asc').then(function (res) {
							node.expect(res).to.have.property('status').to.equal(200);
							node.expect(res).to.have.nested.property('body.accounts').that.is.an('array').to.have.length(5);
							var accountBalances = _.map(res.body.accounts, function (account) {
								return Number(account.balance);
							});
							node.expect(_.map(_.map(res.body.accounts, 'balance'), Number)).eql(_.sortBy(accountBalances));
						});
					});
				});

				describe('username', function () {

					it('using sort = username should sort accounts by username in default ascending order', function () {
						return getAccountsPromise('limit=' + 5 + '&sort=username').then(function (res) {
							node.expect(res).to.have.property('status').to.equal(200);
							node.expect(res).to.have.nested.property('body.accounts').that.is.an('array').to.have.length(5);
							node.expect(_.map(res.body.accounts, 'delegate.username')).eql(_.map(_.sortBy(res.body.accounts, 'delegate.username'), 'delegate.username'));
						});
					});

					it('using sort = username:desc should sort accounts by balance in descending order', function () {
						return getAccountsPromise('limit=' + 5 + '&sort=username:desc').then(function (res) {
							node.expect(res).to.have.property('status').to.equal(200);
							node.expect(res).to.have.nested.property('body.accounts').that.is.an('array').to.have.length(5);
							node.expect(_.map(res.body.accounts, 'delegate.username')).eql(_.map(_.sortBy(res.body.accounts, 'delegate.username').reverse(), 'delegate.username'));
						});
					});

					it('using sort = username:asc should sort accounts by balance in ascending order', function () {
						return getAccountsPromise('limit=' + 5 + '&sort=username:asc').then(function (res) {
							node.expect(res).to.have.property('status').to.equal(200);
							node.expect(res).to.have.nested.property('body.accounts').that.is.an('array').to.have.length(5);
							node.expect(_.map(res.body.accounts, 'delegate.username')).eql(_.map(_.sortBy(res.body.accounts, 'username'), 'delegate.username'));
						});
					});
				});
			});

			describe('sort, offset & limit together', function () {

				it('using sort = username and offset = 1 and limit = 5 should return 5 accounts sorted by username', function () {
					return getAccountsPromise('sort=username' + '&limit=' + 5 + '&offset=1').then(function (res) {
						node.expect(res).to.have.property('status').to.equal(200);
						node.expect(res).to.have.nested.property('body.accounts').that.is.an('array').to.have.length(5);
						node.expect(_.map(res.body.accounts, 'delegate.username')).eql(_.map(_.sortBy(res.body.accounts, 'username'), 'delegate.username'));
					});
				});
			});

		});

		it('should return delegate properties for a delegate account', function () {
			return getAccountsPromise('address=' + node.eAccount.address).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				validateAccountFields(res, node.eAccount);
				validateDelegateFields(res, node.eAccount);
			});
		});

		it('should return empty delgate property for a non delegate account', function () {
			return getAccountsPromise('address=' + node.gAccount.address).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				validateAccountFields(res, node.gAccount);
				node.expect(res.body.accounts[0].delegate).to.eql({});
			});
		});
	});
});
