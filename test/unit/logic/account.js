'use strict';/*eslint*/

var node = require('./../../node.js');
var ed = require('../../../helpers/ed');
var bignum = require('../../../helpers/bignum.js');
var crypto = require('crypto');
var async = require('async');
var sinon = require('sinon');

var chai = require('chai');
var expect = require('chai').expect;
var _  = require('lodash');

var AccountLogic = require('../../../logic/account.js');
var modulesLoader = require('../../common/initModule').modulesLoader;

var validAccount = {
	username: 'genesis_100',
	isDelegate: 1,
	u_isDelegate: 1,
	secondSignature: 0,
	u_secondSignature: 0,
	u_username: 'genesis_100',
	address: '10881167371402274308L',
	publicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	secondPublicKey: null,
	balance: '231386135',
	u_balance: '231386135',
	vote: '9820020609280331',
	rate: '0',
	delegates: null,
	u_delegates: null,
	multisignatures: null,
	u_multisignatures: null,
	multimin: 0,
	u_multimin: 0,
	multilifetime: 0,
	u_multilifetime: 0,
	blockId: '10352824351134264746',
	nameexist: 0,
	u_nameexist: 0,
	producedblocks: 27,
	missedblocks: 1,
	fees: '231386135',
	rewards: '0',
	virgin: 1
};

// TODO:
// - Add test cases for Accounts constructor
// - Add test cases for removeTables function
// - Add test cases for createTables function
describe('account', function () {

	var account;

	before(function (done) {
		modulesLoader.initLogicWithDb(AccountLogic, function (err, __account) {
			expect(err).to.not.exist;
			account = __account;
			done();
		}, {});
	});

	describe('Account', function () {

	});

	describe('createTables', function () {

	});

	describe('removeTables', function () {

	});

	describe('objectNormalize', function () {

		it.skip('should be okay for a valid account object', function () {
			expect(account.objectNormalize(validAccount)).to.be.an('object');
		});
	});

	describe('verifyPublicKey', function () {

		it('should be okay for empty params', function () {
			expect(account.verifyPublicKey()).to.be.undefined;
		});

		it('should throw error if parameter is not a string', function () {
			expect(function () {
				account.verifyPublicKey(1);
			}).to.throw('Invalid public key, must be a string');
		});

		it('should throw error if parameter is of invalid length', function () {
			expect(function () {
				account.verifyPublicKey('231312312321');
			}).to.throw('Invalid public key, must be 64 characters long');
		});

		it('should throw error if parameter is not a hex string', function () {
			expect(function () {
				account.verifyPublicKey('c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2az');
			}).to.throw('Invalid public key, must be a hex string');
		});

		it('should be okay if parameter is in correct format', function () {
			expect(function () {
				account.verifyPublicKey('c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a2');
			}).to.not.throw();
		});
	});

	describe('get', function () {

		it('should only get requested fields for account', function (done) {
			var requestedFields = ['username', 'isDelegate', 'address', 'publicKey'];
			account.get({address: validAccount.address}, requestedFields, function (err, res) {
				expect(err).to.not.exist;
				expect(res).to.be.an('object');
				expect(Object.keys(res)).to.eql(requestedFields);
				done();
			});
		});

		it('should get all fields if fields parameters is not set', function (done) {
			account.get({address: validAccount.address}, function (err, res) {
				expect(err).to.not.exist;
				expect(Object.keys(res)).to.eql(Object.keys(validAccount));
				done();
			});
		});

		it('should return null for non-existent account', function (done) {
			account.get({address: 'invalid address'}, function (err, res) {
				expect(err).to.not.exist;
				expect(res).to.equal(null);
				done();
			});
		});

		it('should get the correct account against address', function (done) {
			account.get({address: validAccount.address}, function (err, res) {
				expect(err).to.not.exist;
				expect(res).to.be.an('object');
				expect(res.username).to.equal(validAccount.username);
				expect(res.isDelegate).to.equal(validAccount.isDelegate);
				expect(res.address).to.equal(validAccount.address);
				expect(res.publicKey).to.equal(validAccount.publicKey);
				expect(res.delegates).to.equal(validAccount.delegates);
				done();
			});
		});
	});

	describe('getAll', function () {

		var allAccounts;
		before(function (done) {
			account.getAll({}, function (err, res) {
				allAccounts = res;
				done();
			});
		});

		it('should remove any non-existent fields and return result', function (done) {
			var fields = [
				'address',
				'username',
				'non-existent-field'
			];
			account.getAll({address: validAccount.address }, fields, function (err, res) {
				expect(err).to.not.exist;
				expect(res.length).to.equal(1);
				expect(res[0].username).to.equal(validAccount.username);
				expect(res[0].address).to.equal(validAccount.address);
				expect(Object.keys(res[0])).to.include('address', 'username');
				done();
			});
		});

		it('should ignore limit when below 1', function (done) {
			var sortedUsernames = _.sortBy(allAccounts, 'username').map(function (v) {
				return {username: v.username};
			});

			account.getAll({
				limit: 0,
				sort: {username: 1}
			}, ['username'], function (err, res) {
				expect(err).to.not.exist;
				expect(res).to.eql(sortedUsernames);
				done();
			});
		});

		it('should ignore offset when below 1', function (done) {
			var sortedUsernames = _.sortBy(allAccounts, 'username').map(function (v) {
				return {username: v.username};
			});

			account.getAll({
				offset: 0,
				sort: {username: 1}
			}, ['username'], function (err, res) {
				expect(err).to.not.exist;
				expect(res).to.eql(sortedUsernames);
				done();
			});
		});

		it('should fetch correct result using address as filter', function (done) {
			account.getAll({address: validAccount.address }, function (err, res) {
				expect(err).to.not.exist;
				expect(res.length).to.equal(1);
				expect(res[0].username).to.equal(validAccount.username);
				expect(res[0].isDelegate).to.equal(validAccount.isDelegate);
				expect(res[0].address).to.equal(validAccount.address);
				expect(res[0].publicKey).to.equal(validAccount.publicKey);
				expect(res[0].delegates).to.equal(validAccount.delegates);
				done();
			});
		});

		it('should fetch correct result using address as filter when its in lower case', function (done) {
			account.getAll({address: validAccount.address.toLowerCase() }, function (err, res) {
				expect(err).to.not.exist;
				expect(res.length).to.equal(1);
				expect(res[0].username).to.equal(validAccount.username);
				expect(res[0].isDelegate).to.equal(validAccount.isDelegate);
				expect(res[0].address).to.equal(validAccount.address);
				expect(res[0].publicKey).to.equal(validAccount.publicKey);
				expect(res[0].delegates).to.equal(validAccount.delegates);
				done();
			});
		});

		it('should fetch correct result using username as filter', function (done) {
			account.getAll({username: validAccount.username}, function (err, res) {
				expect(err).to.not.exist;
				expect(res.length).to.equal(1);
				expect(res[0].username).to.equal(validAccount.username);
				expect(res[0].isDelegate).to.equal(validAccount.isDelegate);
				expect(res[0].address).to.equal(validAccount.address);
				expect(res[0].publicKey).to.equal(validAccount.publicKey);
				expect(res[0].delegates).to.equal(validAccount.delegates);
				done();
			});
		});

		it('should fetch all delegates using isDelegate filter', function (done) {
			account.getAll({isDelegate: 1}, function (err, res) {
				expect(err).to.not.exist;
				expect(res.filter(function (a) {
					return a.isDelegate === 1;
				}).length).to.equal(res.length);
				done();
			});
		});

		it('should throw error if unrelated filters are provided', function (done) {
			account.getAll({publicKey: validAccount.publicKey, unrelatedfield: 'random value'}, function (err, res) {
				expect(err).to.equal('Account#getAll error');
				done();
			});
		});

		it('should fetch results with limit of 50', function (done) {
			var sortedUsernames = _.sortBy(allAccounts, 'username').map(function (v) {
				return {username: v.username};
			}).slice(0, 50);

			account.getAll({
				limit: 50,
				offset: 0,
				sort: {username: 1}
			}, ['username'], function (err, res) {
				expect(err).to.not.exist;
				expect(res).to.eql(sortedUsernames);
				done();
			});
		});

		it('should ignore negative limit', function (done) {
			var sortedUsernames = _.sortBy(allAccounts, 'username').map(function (v) {
				return {username: v.username};
			});

			account.getAll({
				limit: -50,
				sort: {username: 1}
			}, ['username'], function (err, res) {
				expect(err).to.not.exist;
				expect(res).to.eql(sortedUsernames);
				done();
			});
		});

		it('should sort the result according to field type in ascending order', function (done) {
			var sortedUsernames = _.sortBy(allAccounts, 'username').map(function (v) {
				return {username: v.username};
			});
			account.getAll({sort: {username: 1}}, ['username'], function (err, res) {
				expect(err).to.not.exist;
				expect(res).to.eql(sortedUsernames);
				done();
			});
		});

		it('should sort the result according to field type in descending order', function (done) {
			var sortedUsernames = _.sortBy(allAccounts, 'username').reverse().map(function (v) {
				return {username: v.username};
			});
			account.getAll({sort: {username: -1}}, ['username'], function (err, res) {
				expect(err).to.not.exist;
				expect(res).to.eql(sortedUsernames);
				done();
			});
		});
	});
});
