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
var ws = require('../../common/wsCommunication.js');

var AccountLogic = require('../../../logic/account.js');
var AccountModule = require('../../../modules/accounts.js');
var TransactionLogic = require('../../../logic/transaction.js');
var TransactionModule = require('../../../modules/transactions.js');
var DelegateModule = require('../../../modules/delegates.js');
var BlocksModule = require('../../../modules/blocks.js');
var modulesLoader = require('../../common/initModule').modulesLoader;


var accountSecret = 'actress route auction pudding shiver crater forum liquid blouse imitate seven front';
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

describe('account', function () {

	var account;
	var accountLogic;
	var accountModuleDependencies;

	before(function (done) {
		async.auto({
			accountLogic: function (cb) {
				modulesLoader.initLogicWithDb(AccountLogic, cb);
			},
			blockModule: ['accountLogic', function (result, cb) {
				modulesLoader.initModuleWithDb(BlocksModule, cb, {
					logic : { /* dependencies not included */},
				});
			}],
			transactionLogic: ['accountLogic', function (result, cb) {
				modulesLoader.initLogicWithDb(TransactionLogic, cb, {
					account: result.accountLogic
				});
			}],
			delegateModule: ['transactionLogic', function (result, cb) {
				modulesLoader.initModuleWithDb(DelegateModule, cb, {
					logic: {
						transaction: result.transactionLogic
					}
				});
			}],
			transactionModule: ['transactionLogic', function (result, cb) {
				modulesLoader.initModuleWithDb(TransactionModule, cb, {
					transaction: result.transactionLogic
				});
			}]
		}, function (err, result) {
			modulesLoader.initModuleWithDb(AccountModule, function (err, __accountModule) {
				expect(err).to.not.exist;

				account = __accountModule;
				accountLogic = result.accountLogic;

				// for correctly initializing setting blocks module
				result.blockModule.lastBlock.set({height: 10});

				result.delegateModule.onBind({
					accounts: __accountModule,
					transactions: result.transactionModule,
					blocks: result.blockModule
				});

				result.transactionModule.onBind({
					accounts: __accountModule,
					transactions: result.transactionModule,
				});

				account.onBind({
					delegates: result.delegateModule,
					accounts: account,
					transactions: result.transactionModule
				});

				accountModuleDependencies = result;
				done();
			}, {
				logic: {
					account: result.accountLogic,
					transaction: result.transactionLogic
				}
			});
		});
	});

	describe('Accounts', function () {

		it('should throw with no params', function () {
			expect(function () {
				new AccountModule();
			}).to.throw();
		});
	});

	describe('generateAddressByPublicKey', function () {

		it('should generate correct address for the publicKey provided', function () {
			expect(account.generateAddressByPublicKey(validAccount.publicKey)).to.equal(validAccount.address);
		});

		it.skip('should throw error for invalid publicKey', function () {
			var invalidPublicKey = 'invalidPublicKey';

			expect(function () {
				account.generateAddressByPublicKey(invalidPublicKey);
			}).to.throw('Invalid public key: ', invalidPublicKey);
		});
	});

	describe('getAccount', function () {

		it('should convert publicKey filter to address and call account.get', function (done) {
			var getAccountStub = sinon.stub(accountLogic, 'get');

			account.getAccount({publicKey: validAccount.publicKey});
			expect(getAccountStub.calledOnce).to.be.ok;
			expect(getAccountStub.calledWith({address: validAccount.address})).to.be.ok;
			getAccountStub.restore();
			done();
		});

		it('should get correct account for address', function (done) {
			account.getAccount({address: validAccount.address}, function (err, res) {
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
			account.getAccounts({secondSignature: 0}, function (err, res) {
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

			account.getAccounts({address : validAccount.address}, function (err, res) {
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
			expect(account.onBind).to.throw();
		});
	});

	describe('isLoaded', function () {

		it('should return true when modules are loaded', function () {
			expect(account.isLoaded).to.be.ok;
		});
	});

	describe('shared', function () {

		describe('getBalance', function () {

			it('should throw if parameter doesnt have correct schema', function (done) {
				account.shared.getBalance({
					body: {
						address: 5
					}
				}, function (err, res){
					expect(err).to.equal('Expected type string but found type integer');
					done();
				});
			});

			it('should get 0 balance for new account', function (done) {
				account.shared.getBalance({
					body: {
						address: node.randomAccount().address
					}
				}, function (err, res){
					expect(err).to.not.exist;
					expect(res).to.be.an('object');
					expect(res.balance).equal('0');
					expect(res.unconfirmedBalance).equal('0');
					done();
				});
			});

			it('should return balance for existing account', function (done) {
				account.shared.getBalance({
					body: {
						address: node.gAccount.address
					}
				}, function (err, res){
					expect(err).to.not.exist;
					expect(Number.isInteger(Number(res.balance))).to.be.ok;
					expect(Number.isInteger(Number(res.unconfirmedBalance))).to.be.ok;
					done();
				});
			});
		});

		describe('getPublickey', function () {

			it('should throw if parameter doesnt have correct schema', function (done) {
				account.shared.getPublickey({
					body: {
						address: 5
					}
				}, function (err, res){
					expect(err).to.equal('Expected type string but found type integer');
					done();
				});
			});

			it('should return error if account does not exist', function (done) {
				account.shared.getPublickey({
					body: {
						address: node.randomAccount().address
					}
				}, function (err, res){
					expect(err).to.equal('Account not found');
					done();
				});
			});

			it('should return publicKey for an existing account', function (done) {
				account.shared.getPublickey({
					body: {
						address: validAccount.address
					}
				}, function (err, res){
					expect(err).to.not.exist;
					expect(res.publicKey).to.equal(validAccount.publicKey);
					done();
				});
			});
		});

		describe('getDelegates', function () {

			it('should throw if parameter doesn\'t have correct schema', function (done) {
				account.shared.getPublickey({
					body: {
						address: 5
					}
				}, function (err, res){
					expect(err).to.equal('Expected type string but found type integer');
					done();
				});
			});

			it('should return error if account does not exist', function (done) {
				account.shared.getDelegates({
					body: {
						address: node.randomAccount().address
					}
				}, function (err, res){
					expect(err).to.equal('Account not found');
					done();
				});
			});

			it('should return empty array of an account which dont have any delegate', function (done) {
				account.shared.getDelegates({
					body: {
						address: node.eAccount.address
					}
				}, function (err, res){
					expect(err).to.not.exist;
					expect(res.delegates).to.be.an('array').which.is.eql([]);
					done();
				});
			});

			it('should return delegates of an account', function (done) {
				account.shared.getDelegates({
					body: {
						address: node.gAccount.address
					}
				}, function (err, res){
					expect(err).to.not.exist;
					expect(res.delegates).to.be.an('array');
					done();
				});
			});
		});

		describe('getDelegatesFee', function () {

			it('should return the correct fee for delegate', function (done) {
				account.shared.getDelegatesFee({}, function (err, res) {
					expect(err).to.not.exist;
					expect(res.fee).to.equal(constants.fees.delegate);
					done();
				});
			});
		});

		describe('getAccount', function () {

			it('should throw if parameter doesnt have correct schema', function (done) {
				account.shared.getAccount({
					body: {
						address: 5
					}
				}, function (err, res){
					expect(err).to.equal('Expected type string but found type integer');
					done();
				});
			});

			it('should return error if account does not exist', function (done) {
				account.shared.getAccount({
					body: {
						address: node.randomAccount().address
					}
				}, function (err, res){
					expect(err).to.equal('Account not found');
					done();
				});
			});

			it('should return error if neither publicKey nor address are supplied', function (done) {
				account.shared.getAccount({
					body: {
					}
				}, function (err, res){
					expect(err).to.equal('Missing required property: address or publicKey');
					done();
				});
			});

			it('should return error if publicKey does not match address supplied', function (done) {
				account.shared.getAccount({
					body: {
						publicKey: validAccount.publicKey,
						address: node.randomAccount().address
					}
				}, function (err, res){
					expect(err).to.equal('Account publicKey does not match address');
					done();
				});
			});

			it('should return account using publicKey', function (done) {
				account.shared.getAccount({
					body: {
						publicKey: validAccount.publicKey
					}
				}, function (err, res){
					expect(err).to.not.exist;
					expect(res).to.be.an('object');
					done();
				});
			});

			it('should return account using address', function (done) {
				account.shared.getAccount({
					body: {
						address: validAccount.address
					}
				}, function (err, res){
					expect(err).to.not.exist;
					expect(res).to.be.an('object');
					done();
				});
			});
		});
	});

	describe('internal', function () {

		describe('top', function () {

			var allAccounts;
			before(function (done) {
				account.getAccounts({}, function (err, res) {
					expect(err).to.not.exist;
					allAccounts = res;
					done();
				});
			});

			it('should return top 10 accounts ordered by descending balance', function (done) {
				var limit = 10;

				account.internal.top({
					limit: limit
				}, function (err, res) {
					expect(err).to.not.exist;
					expect(res.accounts).to.have.length(10);
					for (var i = 0; i < limit - 1; i++) {
						expect(new bignum(res.accounts[i].balance).gte(new bignum(res.accounts[i + 1].balance))).to.equal(true);
					}
					done();
				});
			});

			it('should return accounts in the range 10 to 20 ordered by descending balance', function (done) {
				var limit = 10;
				var offset = 10;

				account.internal.top({
					limit: limit,
					offset: offset
				}, function (err, res) {
					expect(err).to.not.exist;
					expect(res.accounts).to.have.length(10);
					for (var i = 0; i < limit - 1; i++) {
						expect(new bignum(res.accounts[i].balance).gte(new bignum(res.accounts[i + 1].balance))).to.equal(true);
					}
					done();
				});
			});
		});
	});
});
