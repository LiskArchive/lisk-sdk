'use strict';/*eslint*/

var crypto = require('crypto');
var async = require('async');
var _  = require('lodash');

var chai = require('chai');
var expect = require('chai').expect;

var node = require('./../../node.js');
var ed = require('../../../helpers/ed');
var bignum = require('../../../helpers/bignum.js');
var transactionTypes = require('../../../helpers/transactionTypes');

var modulesLoader = require('../../common/initModule').modulesLoader;
var TransactionLogic = require('../../../logic/transaction.js');
var Signature = require('../../../logic/signature.js');
var AccountLogic = require('../../../logic/account.js');
var AccountModule = require('../../../modules/accounts.js');
var DelegateModule = require('../../../modules/delegates.js');

var validPassword = 'robust weapon course unknown head trial pencil latin acid';
var validKeypair = ed.makeKeypair(crypto.createHash('sha256').update(validPassword, 'utf8').digest());

var validSender = {
	password: 'yjyhgnu32jmwuii442t9',
	secondPassword: 'kub8gm2w330pvptx1or',
	username: 'mix8',
	publicKey: '5ff3c8f4be105953301e505d23a6e1920da9f72dc8dfd7babe1481b662f2b081',
	address: '4835566122337813671L',
	secondPublicKey: 'ebfb1157f9f9ad223b1c7468b0d643663ec5a34ac7a6d557243834ae604d72b7' 
};

var senderHash = crypto.createHash('sha256').update(validSender.password, 'utf8').digest();
var senderKeypair = ed.makeKeypair(senderHash);

var validTransaction = {
	id: '5197781214824378819',
	height: 6,
	blockId: '341020236706783045',
	type: 1,
	timestamp: 38871652,
	senderPublicKey: '5ff3c8f4be105953301e505d23a6e1920da9f72dc8dfd7babe1481b662f2b081',
	senderId: '4835566122337813671L',
	recipientId: null,
	recipientPublicKey: null,
	amount: 0,
	fee: 500000000,
	signature: '14c49a60016f63d9692821540895e1b126ab27908aefa77f4423ac0e079b6f87c8998db3e0e280aae268366adae9792d9ca279be1a372b6c52cc59b874143c07',
	signatures: [],
	confirmations: 16,
	asset: {
		signature: {
			transactionId: '5197781214824378819',
			publicKey: 'ebfb1157f9f9ad223b1c7468b0d643663ec5a34ac7a6d557243834ae604d72b7'
		}
	}
};

var rawValidTransaction = {
	t_id: '5197781214824378819',
	b_height: 6,
	t_blockId: '341020236706783045',
	t_type: 1,
	t_timestamp: 38871652,
	t_senderPublicKey: '5ff3c8f4be105953301e505d23a6e1920da9f72dc8dfd7babe1481b662f2b081',
	m_recipientPublicKey: null,
	t_senderId: '4835566122337813671L',
	t_recipientId: null,
	t_amount: '0',
	t_fee: '500000000',
	t_signature: '14c49a60016f63d9692821540895e1b126ab27908aefa77f4423ac0e079b6f87c8998db3e0e280aae268366adae9792d9ca279be1a372b6c52cc59b874143c07',
	t_SignSignature: null,
	t_signatures: null,
	confirmations: 4,
	s_publicKey: 'ebfb1157f9f9ad223b1c7468b0d643663ec5a34ac7a6d557243834ae604d72b7' 
};

describe('signature', function () {

	var transaction;
	var accountModule;
	var signature;
	var signatureBindings;

	var trs;
	var rawTrs; 
	var sender;

	before(function (done) {
		async.auto({
			accountLogic: function (cb) {
				modulesLoader.initLogicWithDb(AccountLogic, cb, {});
			},
			transactionLogic: ['accountLogic', function (result, cb) {
				modulesLoader.initLogicWithDb(TransactionLogic, function (err, __transaction) {
					cb(err, __transaction);
				}, {
					ed: require('../../../helpers/ed'),
					account: result.account
				});
			}],
			accountModule: ['accountLogic', 'transactionLogic', function (result, cb) {
				modulesLoader.initModuleWithDb(AccountModule, cb, {
					logic: {
						account: result.accountLogic,
						transaction: result.transactionLogic
					}
				});
			}]
		}, function (err, result) {
			expect(err).to.not.exist;
			signature = new Signature(modulesLoader.scope.logger, modulesLoader.scope.schema);
			signatureBindings = {
				account: result.accountModule
			};
			signature.bind(result.accountModule);
			transaction = result.transactionLogic;
			transaction.attachAssetType(transactionTypes.SIGNATURE, signature);
			accountModule = result.accountModule;

			done();
		});
	});

	beforeEach(function () {
		trs = _.cloneDeep(validTransaction);
		rawTrs = _.cloneDeep(rawValidTransaction);
		sender = _.cloneDeep(validSender);
	});

	describe('bind', function () {

		it('should be okay with correct params', function () {
			expect(function () {
				signature.bind(signatureBindings.account);
			}).to.not.throw();
		});

		after(function () {
			signature.bind(signatureBindings.account);
		});
	});

	describe('calculateFee', function () {

		it('should return the correct fee when data field is not set', function () {
			expect(signature.calculateFee.call(transaction, trs)).to.equal(node.constants.fees.secondsignature);
		});
	});

	describe('verify', function () {

		it('should return error if signature is undefined', function (done) {
			delete trs.asset.signature;

			signature.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid transaction asset');
				done();
			});
		});

		it('should return error if amount is not equal to 0', function (done) {
			trs.amount = 1;

			signature.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid transaction amount');
				done();
			});
		});

		it('should return error if publicKey is undefined', function (done) {
			delete trs.asset.signature.publicKey;

			signature.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid public key');
				done();
			});
		});

		it('should return error if publicKey is invalid', function (done) {
			trs.asset.signature.publicKey = 'invalid-public-key';

			signature.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid public key');
				done();
			});
		});

		it('should verify okay for valid transaction', function (done) {
			signature.verify(trs, sender, done);
		});
	});

	describe('process', function () {

		it('should be okay', function (done) {
			signature.process(trs, sender, done);
		});
	});

	describe('getBytes', function () {

		it('should throw for empty asset', function () {
			delete trs.asset;
			expect(function () {
				signature.getBytes(trs);
			}).to.throw();
		});

		it('should throw error for invalid publicKey', function () {
			trs.asset.signature.publicKey = 'invalid-public-key';
			expect(function () {
				signature.getBytes(trs);
			}).to.throw();
		});

		it('should return bytes for signature asset', function () {
			var signatureBytes = signature.getBytes(trs);
			expect(signatureBytes).to.eql(Buffer.from(trs.asset.signature.publicKey, 'hex'));
			expect(signatureBytes.length).to.equal(32);
		});
	});

	describe('apply', function () {

		var dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};

		it('should return error if address is undefined', function (done) {
			delete sender.address;

			signature.apply.call(transaction, trs, dummyBlock, sender, function (err) {
				expect(err).to.equal('Invalid public key');
				done();
			});
		});

		it.skip('should return error if publicKey is undefined', function (done) {
			delete trs.asset.signature.publicKey;

			signature.apply.call(transaction, trs, dummyBlock, sender, function (err) {
				expect(err).to.equal('Invalid public key');
				done();
			});
		});

		it('should be okay for a valid transaction', function (done) {
			signature.apply.call(transaction, trs, dummyBlock, sender, function (err) {
				expect(err).to.not.exist;

				accountModule.getAccount({address: trs.senderId}, function (err, accountAfter) {
					expect(err).to.not.exist;
					expect(accountAfter).to.exist;
					console.log('accountAfter');
					console.log(accountAfter);

					expect(accountAfter).to.have.property('secondSignature').which.is.equal(1);
					expect(accountAfter).to.have.property('u_secondSignature').which.is.equal(0);
					expect(accountAfter).to.have.property('secondPublicKey').which.is.equal(trs.asset.signature.publicKey);
					done();
				});
			});
		});
	});

	describe('undo', function () {

		var dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};

		it('should return error if address is undefined', function (done) {
			delete sender.address;

			signature.undo.call(transaction, trs, dummyBlock, sender, function (err) {
				expect(err).to.equal('Invalid public key');
				done();
			});
		});

		it.skip('should return error if publicKey is undefined', function (done) {
			delete trs.asset.signature.publicKey;

			signature.undo.call(transaction, trs, dummyBlock, sender, function (err) {
				expect(err).to.equal('Invalid public key');
				done();
			});
		});

		it('should be okay for a valid transaction', function (done) {
			signature.undo.call(transaction, trs, dummyBlock, sender, function (err) {
				expect(err).to.not.exist;

				accountModule.getAccount({address: trs.senderId}, function (err, accountAfter) {
					expect(err).to.not.exist;
					expect(accountAfter).to.exist;

					expect(accountAfter).to.have.property('secondSignature').which.is.eql(0);
					expect(accountAfter).to.have.property('secondPublicKey').which.is.equal(null);
					done();
				});
			});
		});
	});

	describe('applyUnconfirmed', function () {

		it('should be okay with valid params', function (done) {
			signature.applyUnconfirmed.call(transaction, trs, sender, done);
		});
	});

	describe('undoUnconfirmed', function () {

		it('should be okay with valid params', function (done) {
			signature.undoUnconfirmed.call(transaction, trs, sender, done);
		});
	});

	describe('objectNormalize', function () {
		//TODO: write tests for objectNormalization
	});

	describe('dbRead', function () {

		it('should return null when data field is not set', function () {
			delete rawTrs.s_publicKey;
			delete rawTrs.t_id;
			expect(signature.dbRead(rawTrs)).to.eql(null);
		});

		it('should be okay when with valid input', function () {
			expect(signature.dbRead(rawTrs)).to.eql({
				signature: {
					publicKey: 'ebfb1157f9f9ad223b1c7468b0d643663ec5a34ac7a6d557243834ae604d72b7',
					transactionId: '5197781214824378819'
				}
			});
		});
	});

	describe('dbSave', function () {
		// TODO: Update stuff here
	});

	describe('ready', function () {

		it('should return true for single signature trs', function () {
			expect(signature.ready(trs, sender)).to.equal(true);
		});

		it('should return false for multi signature transaction with less signatures', function () {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];

			expect(signature.ready(trs, sender)).to.equal(false);
		});

		it('should return true for multi signature transaction with alteast min signatures', function () {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];
			sender.multimin = 1;

			delete trs.signature;
			trs.signature = transaction.sign(senderKeypair, trs);
			trs.signatures = [transaction.multisign(validKeypair, trs)];

			expect(signature.ready(trs, sender)).to.equal(true);
		});
	});
});
