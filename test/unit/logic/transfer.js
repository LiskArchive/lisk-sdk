'use strict';/*eslint*/

var crypto = require('crypto');
var async = require('async');
var _  = require('lodash');

var chai = require('chai');
var expect = require('chai').expect;

var node = require('./../../node.js');
var ed = require('../../../helpers/ed');
var bignum = require('../../../helpers/bignum.js');
var DBSandbox = require('../../common/globalBefore').DBSandbox;
var transactionTypes = require('../../../helpers/transactionTypes');
var constants = require('../../../helpers/constants.js');

var modulesLoader = require('../../common/modulesLoader');
var Transfer = require('../../../logic/transfer.js');

var validPassword = 'robust weapon course unknown head trial pencil latin acid';
var validKeypair = ed.makeKeypair(crypto.createHash('sha256').update(validPassword, 'utf8').digest());

var senderHash = crypto.createHash('sha256').update(node.gAccount.password, 'utf8').digest();
var senderKeypair = ed.makeKeypair(senderHash);

var validSender = {
	username: null,
	isDelegate: 0,
	secondSignature: 0,
	address: '16313739661670634666L',
	publicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	secondPublicKey: null,
	balance: 9850458911801508,
	u_balance: 9850458911801508,
	vote: 0,
	multisignatures: null,
	multimin: 0,
	multilifetime: 0,
	blockId: '8505659485551877884',
	nameexist: 0,
	producedblocks: 0,
	missedblocks: 0,
	fees: 0,
	rewards: 0,
	virgin: 0
};

var validTransactionData = {
	type: 0,
	amount: 8067474861277,
	sender: validSender,
	senderId: '16313739661670634666L',
	recipientId: '2460251951231579923L',
	fee: 10000000,
	keypair: senderKeypair,
	publicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
};

var validTransaction = {
	id: '16140284222734558289',
	rowId: 133,
	blockId: '1462190441827192029',
	type: 0,
	timestamp: 33363661,
	senderPublicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	senderId: '16313739661670634666L',
	recipientId: '2460251951231579923L',
	amount: 8067474861277,
	fee: 10000000,
	signature: '0c5e9ed74fc64ca5940a45025f7386fc40cc7f495ca48490d2c7e9fb636cbe8046e1a5ce031ff5d84f7bf753f9e4307c6c3dedcc9756844177093dd46ccade06',
	signSignature: null,
	requesterPublicKey: null,
	signatures: null,
	asset: {},
};

var rawValidTransaction = {
	t_id: '16140284222734558289',
	b_height: 981,
	t_blockId: '1462190441827192029',
	t_type: 0,
	t_timestamp: 33363661,
	t_senderPublicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	m_recipientPublicKey: null,
	t_senderId: '16313739661670634666L',
	t_recipientId: '2460251951231579923L',
	t_amount: 8067474861277,
	t_fee: 10000000,
	t_signature: '0c5e9ed74fc64ca5940a45025f7386fc40cc7f495ca48490d2c7e9fb636cbe8046e1a5ce031ff5d84f7bf753f9e4307c6c3dedcc9756844177093dd46ccade06',
	confirmations: 8343
};

describe('transfer', function () {

	var transfer;
	var transactionLogic;
	var transferBindings;
	var accountModule;

	var dbSandbox;

	before(function (done) {
		dbSandbox = new DBSandbox(node.config.db, 'lisk_test_logic_transfer');
		dbSandbox.create(function (err, __db) {
			node.initApplication(function (err, scope) {
				accountModule = scope.modules.accounts;
				transfer = new Transfer(modulesLoader.scope.logger, modulesLoader.scope.schema);
				transferBindings = {
					account: accountModule
				};
				transfer.bind(accountModule);
				transactionLogic = scope.logic.transaction;
				transactionLogic.attachAssetType(transactionTypes.SEND, transfer);
				done();
			}, {db: __db});
		});
	});

	after(function (done) {
		dbSandbox.destroy();
		node.appCleanup(done);
	});

	describe('bind', function () {

		it('should be okay with correct params', function () {
			expect(function () {
				transfer.bind(transferBindings.account);
			}).to.not.throw();
		});

		after(function () {
			transfer.bind(transferBindings.account);
		});
	});

	describe('calculateFee', function () {

		it('should throw error if given no params', function () {
			expect(transfer.calculateFee).to.throw();
		});

		it('should return the correct fee when data field is not set', function () {
			expect(transfer.calculateFee.call(transactionLogic, validTransaction)).to.equal(node.constants.fees.send);
		});

		it('should return the correct fee when data field is set', function () {
			var transaction = _.clone(validTransaction);
			transaction.asset = {
				data: '0'
			};

			expect(transfer.calculateFee.call(transactionLogic, transaction)).to.equal(node.constants.fees.send + node.constants.fees.data);
		});
	});

	describe('verify', function () {

		it('should return error if recipientId is not set', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			delete transaction.recipientId;

			transfer.verify(transaction, validSender, function (err) {
				expect(err).to.equal('Missing recipient');
				done();
			});
		});

		it('should return error if amount is less than 0', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			transaction.amount = -10;

			transfer.verify(transaction, validSender, function (err) {
				expect(err).to.equal('Invalid transaction amount');
				done();
			});
		});

		it('should verify okay for valid transaction', function (done) {
			transfer.verify(validTransaction, validSender, done);
		});
	});

	describe('process', function () {

		it('should be okay', function (done) {
			transfer.process(validTransaction, validSender, done);
		});
	});

	describe('getBytes', function () {

		it('should return null for empty asset', function () {
			expect(transfer.getBytes(validTransaction)).to.eql(null);
		});

		it('should return bytes of data asset', function () {
			var transaction = _.cloneDeep(validTransaction);
			var data = '1\'';
			transaction.asset = {
				data: data
			};

			expect(transfer.getBytes(transaction)).to.eql(Buffer.from(data, 'utf8'));
		});

		it('should be okay for utf-8 data value', function () {
			var transaction = _.cloneDeep(validTransaction);
			var data = 'Zażółć gęślą jaźń';
			transaction.asset = {
				data: data
			};

			expect(transfer.getBytes(transaction)).to.eql(Buffer.from(data, 'utf8'));
		});
	});

	describe('apply', function () {

		var dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};

		function undoTransaction (transaction, sender, done) {
			transfer.undo.call(transactionLogic, transaction, dummyBlock, sender, done);
		}

		it('should return error if recipientid is not set', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			delete transaction.recipientId;
			transfer.apply.call(transactionLogic, transaction, dummyBlock, validSender, function (err) {
				expect(err).to.equal('Invalid public key');
				done();
			});
		});

		it('should be okay for a valid transaction', function (done) {
			accountModule.getAccount({address: validTransaction.recipientId}, function (err, accountBefore) {
				expect(err).to.not.exist;
				expect(accountBefore).to.exist;

				var amount = new bignum(validTransaction.amount.toString());
				var balanceBefore = new bignum(accountBefore.balance.toString());

				transfer.apply.call(transactionLogic, validTransaction, dummyBlock, validSender, function (err) {
					expect(err).to.not.exist;

					accountModule.getAccount({address: validTransaction.recipientId}, function (err, accountAfter) {
						expect(err).to.not.exist;
						expect(accountAfter).to.exist;

						var balanceAfter = new bignum(accountAfter.balance.toString());
						expect(balanceBefore.plus(amount).toString()).to.equal(balanceAfter.toString());
						undoTransaction(validTransaction, validSender, done);
					});
				});
			});
		});
	});

	describe('undo', function () {

		var dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};

		function applyTransaction (transaction, sender, done) {
			transfer.apply.call(transactionLogic, transaction, dummyBlock, sender, done);
		}

		it('should return error if recipientid is not set', function (done) {
			var transaction = _.cloneDeep(validTransaction);
			delete transaction.recipientId;

			transfer.undo.call(transactionLogic, transaction, dummyBlock, validSender, function (err) {
				expect(err).to.equal('Invalid public key');
				done();
			});
		});

		it('should be okay for a valid transaction', function (done) {
			accountModule.getAccount({address: validTransaction.recipientId}, function (err, accountBefore) {
				expect(err).to.not.exist;

				var amount = new bignum(validTransaction.amount.toString());
				var balanceBefore = new bignum(accountBefore.balance.toString());

				transfer.undo.call(transactionLogic, validTransaction, dummyBlock, validSender, function (err) {
					expect(err).to.not.exist;

					accountModule.getAccount({address: validTransaction.recipientId}, function (err, accountAfter) {
						var balanceAfter = new bignum(accountAfter.balance.toString());

						expect(err).to.not.exist;
						expect(balanceAfter.plus(amount).toString()).to.equal(balanceBefore.toString());
						applyTransaction(validTransaction, validSender, done);
					});
				});
			});
		});
	});

	describe('applyUnconfirmed', function () {

		it('should be okay with valid params', function (done) {
			transfer.applyUnconfirmed.call(transactionLogic, validTransaction, validSender, done);
		});
	});

	describe('undoUnconfirmed', function () {

		it('should be okay with valid params', function (done) {
			transfer.undoUnconfirmed.call(transactionLogic, validTransaction, validSender, done);
		});
	});

	describe('objectNormalize', function () {

		it('should remove blockId from transaction', function () {
			var transaction = _.cloneDeep(validTransaction);
			transaction.blockId = '9314232245035524467';

			expect(transfer.objectNormalize(transaction)).to.not.have.key('blockId');
		});

		it('should not remove data field', function () {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset = {
				data: '123'
			};

			expect(transfer.objectNormalize(transaction).asset).to.eql(transaction.asset);
		});

		it('should throw error if value is null', function () {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset = {
				data: null 
			};

			expect(function () {
				transfer.objectNormalize(transaction);
			}).to.throw('Failed to validate transfer schema: Expected type string but found type null');
		});

		it('should throw error if value is undefined', function () {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset = {
				data: undefined
			};

			expect(function () {
				transfer.objectNormalize(transaction);
			}).to.throw('Failed to validate transfer schema: Expected type string but found type undefined');
		});

		it('should throw error if data field length is greater than ' + constants.additionalData.maxLength +  ' characters', function () {
			var invalidString = node.randomString.generate(constants.additionalData.maxLength + 1);
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset = {
				data: invalidString
			};

			expect(function () {
				transfer.objectNormalize(transaction);
			}).to.throw('Failed to validate transfer schema: Object didn\'t pass validation for format additionalData: ' + invalidString);
		});

		it('should throw error if data field length is greater than ' + constants.additionalData.maxLength + ' bytes', function () {
			var invalidString = node.randomString.generate(constants.additionalData.maxLength - 1) + '现';
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset = {
				data: invalidString
			};

			expect(function () {
				transfer.objectNormalize(transaction);
			}).to.throw('Failed to validate transfer schema: Object didn\'t pass validation for format additionalData: ' + invalidString);
		});
	});

	describe('dbRead', function () {

		it('should return null when data field is not set', function () {
			expect(transfer.dbRead(rawValidTransaction)).to.eql(null);
		});

		it('should be okay when data field is set', function () {
			var rawTransaction = _.cloneDeep(rawValidTransaction);
			var data = '123';
			rawTransaction.tf_data = data;

			expect(transfer.dbRead(rawTransaction)).to.eql({
				data: data
			});
		});
	});

	describe('dbSave', function () {

		it('should return null when transaction does not contain asset', function () {
			expect(transfer.dbSave(validTransaction)).to.eql(null);
		});

		it('should return transfer promise when transaction contains asset', function () {
			var transaction = _.cloneDeep(validTransaction);
			var data = '123';
			transaction.asset = {
				data: data
			};
			var transferPromise = transfer.dbSave(transaction);

			expect(transferPromise.table).to.equal('transfer');
			expect(transferPromise.fields).to.eql([
				'data',
				'transactionId'
			]);
			expect(transferPromise.values).to.eql({
				data: Buffer.from(data, 'utf8'),
				transactionId: transaction.id
			});
		});

		it('should not return promise when data field is undefined', function () {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset = {
				data: undefined
			};

			expect(transfer.dbSave(transaction)).to.eql(null);
		});

		it('should not return promise when data field is null', function () {
			var transaction = _.cloneDeep(validTransaction);
			transaction.asset = {
				data: null
			};

			expect(transfer.dbSave(transaction)).to.eql(null);
		});
	});

	describe('ready', function () {

		it('should return true for single signature transaction', function () {
			expect(transfer.ready(validTransaction, validSender)).to.equal(true);
		});

		it('should return false for multi signature transaction with less signatures', function () {
			var transaction = _.cloneDeep(validTransaction);
			var vs = _.cloneDeep(validSender);
			vs.multisignatures = [validKeypair.publicKey.toString('hex')];

			expect(transactionLogic.ready(transaction, vs)).to.equal(false);
		});

		it('should return true for multi signature transaction with alteast min signatures', function () {
			var transaction = _.cloneDeep(validTransaction);
			var vs = _.cloneDeep(validSender);
			vs.multisignatures = [validKeypair.publicKey.toString('hex')];
			vs.multimin = 1;

			delete transaction.signature;
			transaction.signature = transactionLogic.sign(senderKeypair, transaction);
			transaction.signatures = [transactionLogic.multisign(validKeypair, transaction)];

			expect(transactionLogic.ready(transaction, vs)).to.equal(true);
		});
	});
});
