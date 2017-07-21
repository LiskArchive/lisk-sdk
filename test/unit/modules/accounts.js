'use strict';/*eslint*/

var node = require('./../../node.js');
var ed = require('../../../helpers/ed');
var bignum = require('../../../helpers/bignum.js');
var crypto = require('crypto');
var async = require('async');
var sinon = require('sinon');

var chai = require('chai');
var expect = require('chai').expect;
var constants = require('../../../helpers/constants.js');
var _  = require('lodash');

var Rounds = require('../../../modules/rounds.js');
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
			rounds: function (cb) {
				modulesLoader.initModule(Rounds, modulesLoader.scope,cb);
			},
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
					//loader: 
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

		it('should throw error for invalid publicKey', function () {
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
		describe('open ', function () {
			it('should throw if parameter doesn\'t have correct schema', function (done) {
				account.shared.open({
					body: {
						secret: 5
					}
				}, function (err, res){
					expect(err).to.equal('Expected type string but found type integer');
					done();
				});
			});

			it('should create account for new secret', function (done) {
				account.shared.open({
					body: {
						secret: node.randomPassword()
					}
				}, function (err, res){
					expect(err).to.not.exist;
					expect(res).to.be.an('object');
					done();
				});
			});

			it('should return existing account for the secret', function (done) {
				account.shared.open({
					body: {
						secret: node.gAccount.password
					}
				}, function (err, res){
					expect(err).to.not.exist;
					expect(res).to.be.an('object');
					expect(res.account.address).to.equal(node.gAccount.address);
					expect(res.account.publicKey).to.equal(node.gAccount.publicKey);
					done();
				});
			});
		});
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

		describe('generatePublicKey', function () {

			it('should throw if parameter doesnt have correct schema', function (done) {
				account.shared.generatePublicKey({
					body: {
						secret: 5
					}
				}, function (err, res){
					expect(err).to.equal('Expected type string but found type integer');
					done();
				});
			});

			it('should generate publicKey for new account', function (done) {
				var randomAccount = node.randomAccount();
				account.shared.generatePublicKey({
					body: {
						secret: randomAccount.password
					}
				}, function (err, res){
					expect(err).to.not.exist;
					expect(res).to.be.an('object');
					expect(res.publicKey).to.equal(randomAccount.publicKey);
					done();
				});
			});

			it('should return publicKey of an existing account', function (done) {
				account.shared.generatePublicKey({
					body: {
						secret: accountSecret
					}
				}, function (err, res){
					expect(err).to.not.exist;
					expect(res).to.be.an('object');
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

		describe('addDelegates (non-multisignature account)', function () {

			// Votes for genesis_2, genesis_3, genesis_4
			var votes = [
				'-141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
				'-3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
				'-5d28e992b80172f38d3a2f9592cad740fd18d3c2e187745cd5f7badf285ed819'
			];

			it('should return error if invalid passphrase', function (done) {
				account.shared.addDelegates({
					body: {
						publicKey: node.gAccount.publicKey,
						secret: node.eAccount.password,
						delegates: votes,
					}
				}, function (err, res){
					expect(err).to.equal('Invalid passphrase');
					done();
				});
			});

			it('should throw if parameter doesnt have correct schema', function (done) {
				account.shared.addDelegates({
					body: {
						secret: 5
					}
				}, function (err, res){
					expect(err).to.equal('Expected type string but found type integer');
					done();
				});
			});

			it('should add delegate votes for an account', function (done) {
				account.shared.addDelegates({
					body: {
						publicKey: node.gAccount.publicKey,
						secret: node.gAccount.password,
						delegates: votes
					}
				}, function (err, res){
					expect(err).to.not.exist;
					expect(res).to.be.an('object');
					expect(res.transaction.asset.votes).to.eql(votes);
					done();
				});
			});
		});

		describe('addDelegates (multisignature account)', function () {

			function postSignature (transaction, signature, done) {
				node.post('/peer/signatures', {
					signature: {
						transaction: transaction.id,
						signature: signature
					}
				}, done);
			}

			function addTransaction (transaction, done) {
				node.post('/peer/transactions', {
					transaction: transaction
				}, function (err, res) {
					done(err, res.body);
				});
			}

			var multiAccount = node.randomAccount();
			var multiAccount2 = node.randomAccount();
			var multiAccount3 = node.randomAccount();

			before(function (done) {
				var transferTrs = node.lisk.transaction.createTransaction(multiAccount.address, 100000000000, node.gAccount.password);
				addTransaction(transferTrs, node.onNewBlock.bind(node, function (err) {
					expect(err).to.not.exist;
					var lifetime = 1;
					var min = 2;
					var keysgroup = [
						'+' + multiAccount2.publicKey,
						'+' + multiAccount3.publicKey
					];

					var multiTrs = node.lisk.multisignature.createMultisignature(multiAccount.password, null, keysgroup, lifetime, min);
					addTransaction(multiTrs, function (err, res) {
						expect(err).to.not.exist;
						var signature1 = node.lisk.multisignature.signTransaction(multiTrs, multiAccount2.password);
						var signature2 = node.lisk.multisignature.signTransaction(multiTrs, multiAccount3.password);
						async.each([signature1, signature2], function (signature, eachCb) {
							postSignature(multiTrs, signature, eachCb);
						}, function (err) {
							expect(err).to.not.exist;
							node.onNewBlock(done);
						});
					});
				}));
			});
			// Votes for genesis_2, genesis_3, genesis_4
			var votes = [
				'+141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
				'+3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
				'+5d28e992b80172f38d3a2f9592cad740fd18d3c2e187745cd5f7badf285ed819'
			];

			it('should throw if parameter doesnt have correct schema', function (done) {
				account.shared.addDelegates({
					body: {
						secret: 5
					}
				}, function (err, res){
					expect(err).to.equal('Expected type string but found type integer');
					done();
				});
			});

			it('should return error if multisignature account not found', function (done) {
				var randomAccount = node.randomAccount();
				account.shared.addDelegates({
					body: {
						publicKey: randomAccount.publicKey,
						secret: randomAccount.password,
						delegates: votes,
						multisigAccountPublicKey: node.randomAccount().publicKey
					}
				}, function (err, res){
					expect(err).to.equal('Multisignature account not found');
					done();
				});
			});

			it('should return error if its not a multisignature account', function (done) {
				var randomAccount = node.randomAccount();
				account.shared.addDelegates({
					body: {
						publicKey: randomAccount.publicKey,
						secret: randomAccount.password,
						delegates: votes,
						multisigAccountPublicKey: node.gAccount.publicKey
					}
				}, function (err, res){
					expect(err).to.equal('Account does not have multisignatures enabled');
					done();
				});
			});

			it('should add delegate votes for an account', function (done) {
				account.shared.addDelegates({
					body: {
						publicKey: multiAccount2.publicKey,
						secret: multiAccount2.password,
						delegates: votes,
						multisigAccountPublicKey: multiAccount.publicKey
					}
				}, function (err, res){
					expect(err).to.not.exist;
					expect(res).to.be.an('object');
					expect(res.transaction.asset.votes).to.eql(votes);
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

			it('should return top 10 accounts with respect to highest balance', function (done) {
				var topAccountsBalance = _.orderBy(allAccounts, 'balance').map(function (a) {
					return a.balance;
				}).reverse();

				account.internal.top({
					limit: 10
				}, function (err, res) {
					expect(err).to.not.exist;
					expect(res.accounts).to.have.length(10);
					expect(res.accounts.map(function (v) { return v.balance; })).to.eql(topAccountsBalance.slice(0, 10));
					done();
				});
			});

			it('should get accounts with highest balance in the range 10-20', function (done) {
				var topAccountsBalance = _.orderBy(allAccounts, 'balance').map(function (a) {
					return a.balance;
				}).reverse();

				account.internal.top({
					limit: 10,
					offset: 10
				}, function (err, res) {
					expect(err).to.not.exist;
					expect(res.accounts).to.have.length(10);
					expect(res.accounts.map(function (v) { return v.balance; })).to.eql(topAccountsBalance.slice(10, 20));
					done();
				});
			});
		});
	});
});
