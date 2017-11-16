'use strict';/*eslint*/

var _  = require('lodash');
var node = require('./../../node.js');
var ed = require('../../../helpers/ed');
var bignum = require('../../../helpers/bignum.js');
var crypto = require('crypto');
var async = require('async');
var sinon = require('sinon');

var chai = require('chai');
var expect = require('chai').expect;
var constants = require('../../../helpers/constants.js');
var AccountModule = require('../../../modules/accounts.js');
var modulesLoader = require('../../common/modulesLoader');
var DBSandbox = require('../../common/globalBefore').DBSandbox;

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

describe('accounts', function () {

	var accounts;
	var accountLogic;
	var dbSandbox;

	before(function (done) {
		dbSandbox = new DBSandbox(modulesLoader.scope.config.db, 'lisk_test_accounts');
		dbSandbox.create(function (err, __db) {
			node.initApplication(function (err, __scope) {
				// For correctly initializing setting blocks module
				__scope.modules.blocks.lastBlock.set({height: 10});
				accounts = __scope.modules.accounts;
				accountLogic = __scope.logic.account;
				done(err);
			}, {db: __db});
		});
	});

	after(function (done) {
		dbSandbox.destroy();
		node.appCleanup(done);
	});

	describe('constructor', function () {

		it('should throw with no params', function () {
			expect(function () {
				new AccountModule();
			}).to.throw();
		});
	});

	describe('generateAddressByPublicKey', function () {

		it('should generate correct address for the publicKey provided', function () {
			expect(accounts.generateAddressByPublicKey(validAccount.publicKey)).to.equal(validAccount.address);
		});

		// TODO: Design a throwable test
		it.skip('should throw error for invalid publicKey', function () {
			var invalidPublicKey = 'invalidPublicKey';

			expect(function () {
				accounts.generateAddressByPublicKey(invalidPublicKey);
			}).to.throw('Invalid public key: ', invalidPublicKey);
		});
	});

	describe('getAccount', function () {

		it('should convert publicKey filter to address and call account.get', function (done) {
			var getAccountStub = sinon.stub(accountLogic, 'get');

			accounts.getAccount({publicKey: validAccount.publicKey});
			expect(getAccountStub.calledOnce).to.be.ok;
			expect(getAccountStub.calledWith({address: validAccount.address})).to.be.ok;
			getAccountStub.restore();
			done();
		});

		it('should get correct account for address', function (done) {
			accounts.getAccount({address: validAccount.address}, function (err, res) {
				expect(err).to.not.exist;
				expect(res.address).to.equal(validAccount.address);
				expect(res.publicKey).to.equal(validAccount.publicKey);
				expect(res.username).to.equal(validAccount.username);
				done();
			});
		});
	});

	describe('getAccounts', function () {

		it('should get accounts for the filter provided', function (done) {
			accounts.getAccounts({secondSignature: 0}, function (err, res) {
				expect(err).to.not.exist;
				expect(res).to.be.an('Array');
				expect(res.filter(function (a) {
					return a.secondSignature != 0;
				}).length).to.equal(0);
				done();
			});
		});

		it('should internally call logic/account.getAll method', function (done) {
			var getAllSpy = sinon.spy(accountLogic, 'getAll');

			accounts.getAccounts({address : validAccount.address}, function (err, res) {
				expect(err).to.not.exist;
				expect(res).to.be.an('Array').to.have.length(1);
				expect(getAllSpy.withArgs({address : validAccount.address})).to.be.ok;
				getAllSpy.restore();
				done();
			});
		});
	});

	describe('onBind', function () {

		it('should throw error with empty params', function () {
			expect(accounts.onBind).to.throw();
		});
	});

	describe('isLoaded', function () {

		it('should return true when modules are loaded', function () {
			expect(accounts.isLoaded).to.be.ok;
		});
	});

	describe('shared', function () {

		describe('getAccounts', function () {

			it('should return empty accounts array when account does not exist', function (done) {
				accounts.shared.getAccounts({
					address: node.randomAccount().address
				}, function (err, res){
					expect(err).to.not.exist;
					expect(res).be.an('array').which.has.length(0);
					done();
				});
			});

			it('should return account using publicKey', function (done) {
				accounts.shared.getAccounts({
					publicKey: validAccount.publicKey
				}, function (err, res){
					expect(err).to.not.exist;
					expect(res).to.be.an('array');
					done();
				});
			});

			it('should return account using address', function (done) {
				accounts.shared.getAccounts({
					address: validAccount.address
				}, function (err, res){
					expect(err).to.not.exist;
					expect(res).to.be.an('array');
					done();
				});
			});

			it('should return top 10 accounts ordered by descending balance', function (done) {
				var limit = 10;
				var sort = 'balance:desc';

				accounts.shared.getAccounts({
					limit: limit,
					sort: sort
				}, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.length(10);
					for (var i = 0; i < limit - 1; i++) {
						expect(new bignum(res[i].balance).gte(new bignum(res[i + 1].balance))).to.equal(true);
					}
					done();
				});
			});

			it('should return accounts in the range 10 to 20 ordered by descending balance', function (done) {
				var limit = 10;
				var offset = 10;
				var sort = 'balance:desc';

				accounts.shared.getAccounts({
					limit: limit,
					offset: offset,
					sort: sort
				}, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.length(10);
					for (var i = 0; i < limit - 1; i++) {
						expect(new bignum(res[i].balance).gte(new bignum(res[i + 1].balance))).to.equal(true);
					}
					done();
				});
			});
		});
	});
});
