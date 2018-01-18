/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';/*eslint*/

var ed = require('../../../helpers/ed');
var bignum = require('../../../helpers/bignum.js');
var crypto = require('crypto');
var async = require('async');

var constants = require('../../../helpers/constants.js');
var application = require('../../common/application.js');
var AccountModule = require('../../../modules/accounts.js');
var modulesLoader = require('../../common/modulesLoader');
var application = require('../../common/application');
var randomUtil = require('../../common/utils/random');

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

	before(function (done) {
		application.init({sandbox: {name: 'lisk_test_accounts'}}, function (err, scope) {
			// For correctly initializing setting blocks module
			scope.modules.blocks.lastBlock.set({height: 10});
			accounts = scope.modules.accounts;
			accountLogic = scope.logic.account;
			done(err);
		});
	});

	after(function (done) {
		application.cleanup(done);
	});

	describe('constructor', function () {

		it('should throw with no params', function () {
			(function () {
				new AccountModule();
			}).should.throw();
		});
	});

	describe('generateAddressByPublicKey', function () {

		it('should generate correct address for the publicKey provided', function () {
			accounts.generateAddressByPublicKey(validAccount.publicKey).should.equal(validAccount.address);
		});

		// TODO: Design a throwable test
		it.skip('should throw error for invalid publicKey', function () {
			var invalidPublicKey = 'invalidPublicKey';

			(function () {
				accounts.generateAddressByPublicKey(invalidPublicKey);
			}).should.throw('Invalid public key: ', invalidPublicKey);
		});
	});

	describe('getAccount', function () {

		it('should convert publicKey filter to address and call account.get', function (done) {
			var getAccountStub = sinonSandbox.stub(accountLogic, 'get');

			accounts.getAccount({publicKey: validAccount.publicKey});
			getAccountStub.calledOnce.should.be.ok;
			getAccountStub.calledWith({address: validAccount.address}).should.be.ok;
			getAccountStub.restore();
			done();
		});

		it('should get correct account for address', function (done) {
			accounts.getAccount({address: validAccount.address}, function (err, res) {
				should.not.exist(err);
				res.address.should.equal(validAccount.address);
				res.publicKey.should.equal(validAccount.publicKey);
				res.username.should.equal(validAccount.username);
				done();
			});
		});
	});

	describe('getAccounts', function () {

		it('should get accounts for the filter provided', function (done) {
			accounts.getAccounts({secondSignature: 0}, function (err, res) {
				should.not.exist(err);
				res.should.be.an('Array');
				res.filter(function (a) {
					return a.secondSignature != 0;
				}).length.should.equal(0);
				done();
			});
		});

		it('should internally call logic/account.getAll method', function (done) {
			var getAllSpy = sinonSandbox.spy(accountLogic, 'getAll');

			accounts.getAccounts({address : validAccount.address}, function (err, res) {
				should.not.exist(err);
				res.should.be.an('Array').to.have.length(1);
				getAllSpy.withArgs({address : validAccount.address}).should.be.ok;
				getAllSpy.restore();
				done();
			});
		});
	});

	describe('onBind', function () {

		it('should throw error with empty params', function () {
			accounts.onBind.should.throw();
		});
	});

	describe('isLoaded', function () {

		it('should return true when modules are loaded', function () {
			accounts.isLoaded.should.be.ok;
		});
	});

	describe('shared', function () {

		describe('getAccounts', function () {

			it('should return empty accounts array when account does not exist', function (done) {
				accounts.shared.getAccounts({
					address: randomUtil.account().address
				}, function (err, res){
					should.not.exist(err);
					res.should.be.an('array').which.has.length(0);
					done();
				});
			});

			it('should return account using publicKey', function (done) {
				accounts.shared.getAccounts({
					publicKey: validAccount.publicKey
				}, function (err, res){
					should.not.exist(err);
					res.should.be.an('array');
					done();
				});
			});

			it('should return account using address', function (done) {
				accounts.shared.getAccounts({
					address: validAccount.address
				}, function (err, res){
					should.not.exist(err);
					res.should.be.an('array');
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
					should.not.exist(err);
					res.should.have.length(10);
					for (var i = 0; i < limit - 1; i++) {
						new bignum(res[i].balance).gte(new bignum(res[i + 1].balance)).should.equal(true);
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
					should.not.exist(err);
					res.should.have.length(10);
					for (var i = 0; i < limit - 1; i++) {
						new bignum(res[i].balance).gte(new bignum(res[i + 1].balance)).should.equal(true);
					}
					done();
				});
			});
		});
	});
});
