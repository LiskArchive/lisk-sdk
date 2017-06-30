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

var TransactionLogic = require('../../../logic/transaction.js');
var Rounds = require('../../../modules/rounds.js');
var AccountLogic = require('../../../logic/account.js');
var AccountModule = require('../../../modules/accounts.js');
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

describe('account', function () {

	var account; 

	before(function (done) {
		async.auto({
			rounds: function (cb) {
				modulesLoader.initModule(Rounds, modulesLoader.scope,cb);
			},
			accountLogic: function (cb) {
				modulesLoader.initLogicWithDb(AccountLogic, cb);
			},
			transactionLogic: ['accountLogic', function (result, cb) {
				modulesLoader.initLogicWithDb(TransactionLogic, cb, {
					ed: require('../../../helpers/ed'),
					account: result.accountLogic
				});
			}]
		}, function (err, result) {
			modulesLoader.initModuleWithDb(AccountModule, function (err, __accountModule) {
				account = __accountModule;
				done();
			},{
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

	describe('__private.openAccount', function () {
	});

	describe('generateAddressByPublicKey', function () {
		it('should generate correct address for the public key provided', function () {
			expect(account.generateAddressByPublicKey(validAccount.publicKey)).to.equal(validAccount.address);
		});

		it.only('should throw error for invalid publicKey', function () {
			var invalidPublicKey = 'invalidPublicKey';
			expect(function () {
				account.generateAddressByPublicKey(invalidPublicKey);
			}).to.throw('Invalid public key: ', invalidPublicKey);
		});
	});

	describe('Accounts.prototype.getAccount', function () {
	});
	describe('Accounts.prototype.getAccounts', function () {
	});
	describe('Accounts.prototype.sandboxApi', function () {
	});
	describe('Accounts.prototype.onBind', function () {
	});
	describe('Accounts.prototype.isLoaded', function () {
	});
	describe('Accounts.prototype.shared', function () {
		describe('open ', function () {
		});
		describe('getBalance', function () {
		});
		describe('getPublickey', function () {
		});
		describe('generatePublicKey', function () {
		});
		describe('getDelegates', function () {
		});
		describe('getDelegatesFee', function () {
		});
		describe('addDelegates', function () {
		});
		describe('getAccount', function () {
		});
	});

	describe('Accounts.prototype.internal', function () {
		describe('count', function () {
		});
		describe('top', function () {
		});
		describe('getAllAccounts', function () {
		});
	});
});
