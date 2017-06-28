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
		it('should be okay for a valid account object', function () {
			console.log(account.objectNormalize(validAccount));
		});
	});
	describe('verifyPublicKey', function () {
		it('should throw error for empty params', function () {
			expect(account.verifyPublicKey).to.throw();
		});

		it('should throw if parameter is not a string', function () {
			expect(function () {
				account.verifyPublicKey(1);
			}).to.throw('Invalid public key, must be a string');
		});

		it('should throw if parameter is of wrong size', function () {
			expect(function () {
				account.verifyPublicKey('231312312321');
			}).to.throw('Invalid public key, must be 64 characters long');
		});

		it('should throw if parameter is not a hex string', function () {
			expect(function () {
				account.verifyPublicKey('c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2az');
			}).to.throw('Invalid public key, must be a hex string');
		});
	});

	describe('get', function () {

		it('should only get requested fields for account', function (done) {
			var requestedFields = ['username', 'isDelegate', 'address', 'publicKey'];
			account.get({address: validAccount.address}, requestedFields, function (err, res) {
				expect(err).to.not.exist;
				expect(res).to.be.an.object;
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
				expect(res).to.eql(null);
			});
		});

		it.only('should get the correct account against address', function (done) {
			account.get({address: validAccount.address}, function (err, res) {
				console.log(res);

				expect(err).to.not.exist;
				expect(res).to.be.an.object;
				expect(res.username).to.equal(validAccount.username);
				expect(res.isDelegate).to.equal(validAccount.isDelegate);
				expect(res.address).to.equal(validAccount.address);
				expect(res.publicKey).to.equal(validAccount.publicKey);
				expect(res.delegates).to.equal(validAccount.delegates);
				expect(res.blockId).to.equal(validAccount.blockId);
				done();
			});
		});
	});

	describe('getAll', function () {
		it('should fetch correct result using address as filter', function (done) {
			account.getAll({address: validAccount.address }, function (err, res) {
				expect(err).to.not.exist;
				expect(res.length).to.equal(1);
				expect(res[0].username).to.equal(validAccount.username);
				expect(res[0].isDelegate).to.equal(validAccount.isDelegate);
				expect(res[0].address).to.equal(validAccount.address);
				expect(res[0].publicKey).to.equal(validAccount.publicKey);
				expect(res[0].delegates).to.equal(validAccount.delegates);
				expect(res[0].blockId).to.equal(validAccount.blockId);
				done();
			});
		});
		
		it.only('should fetch correct result using publicKey as filter', function (done) {
			account.getAll({publicKey: validAccount.publicKey }, function (err, res) {
				expect(err).to.not.exist;
				expect(res.length).to.equal(1);
				expect(res[0].username).to.equal(validAccount.username);
				expect(res[0].isDelegate).to.equal(validAccount.isDelegate);
				expect(res[0].address).to.equal(validAccount.address);
				expect(res[0].publicKey).to.equal(validAccount.publicKey);
				expect(res[0].delegates).to.equal(validAccount.delegates);
				expect(res[0].blockId).to.equal(validAccount.blockId);
				done();
			});
		});
	});
});
