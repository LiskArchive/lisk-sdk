'use strict';/*eslint*/

var node = require('./../../node.js');
var ed = require('../../../helpers/ed');
var crypto = require('crypto');
var async = require('async');

var chai = require('chai');
var sinon = require('sinon');
var expect = require('chai').expect;
var express = require('express');
var ip = require('ip');
var _  = require('lodash');
var sinon = require('sinon');
var transactionTypes = require('../../../helpers/transactionTypes');

var modulesLoader = require('../../common/initModule').modulesLoader;
var Transaction = require('../../../logic/transaction.js');
var Rounds = require('../../../modules/rounds.js');
var AccountLogic = require('../../../logic/account.js');
var AccountModule = require('../../../modules/accounts.js');

var Vote = require('../../../logic/vote.js');
var Transfer = require('../../../logic/transfer.js');
var Delegate = require('../../../logic/delegate.js');
var Signature = require('../../../logic/signature.js');
var Multisignature = require('../../../logic/multisignature.js');
var Dapp = require('../../../logic/dapp.js');
var InTransfer = require('../../../logic/inTransfer.js');
var OutTransfer = require('../../../logic/outTransfer.js');


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
	recipientId: '5649948960790668770L',
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
	recipientId: '5649948960790668770L',
	amount: 8067474861277,
	fee: 10000000,
	signature: '7ff5f0ee2c4d4c83d6980a46efe31befca41f7aa8cda5f7b4c2850e4942d923af058561a6a3312005ddee566244346bdbccf004bc8e2c84e653f9825c20be008',
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
	t_recipientId: '5649948960790668770L',
	t_amount: 8067474861277,
	t_fee: 10000000,
	t_signature: '7ff5f0ee2c4d4c83d6980a46efe31befca41f7aa8cda5f7b4c2850e4942d923af058561a6a3312005ddee566244346bdbccf004bc8e2c84e653f9825c20be008',
	confirmations: 8343
};

var validUnconfirmedTrs = {
	type: 0,
	amount: 8067474861277,
	senderPublicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	senderId: '16313739661670634666L',
	requesterPublicKey: null,
	timestamp: 33641482,
	asset: {},
	data: undefined,
	recipientId: '5649948960790668770L',
	signature: '24c65ac5562a8ae252aa308926b60342829e82f285e704814d0d3c3954078c946d113aa0bd5388b2c863874e63f71e8e0a284a03274e66c719e69d443d91f309',
	fee: 10000000,
	id: '16580139363949197645' 
};

var attachTransferAsset = function (transaction, accountLogic, rounds) {
	async.auto({
		rounds: function (cb) {
			modulesLoader.initModule(Rounds, {}, cb);
		},
		accountLogic: function (cb) {
			modulesLoader.initLogicWithDb(AccountLogic, cb, {});
		}, 
		accountModule: ['accountLogic', function (results, cb) {
			modulesLoader.initModuleWithDb(AccountModule, cb, {
				logic: {
					account: results.accountLogic,
					transaction: transaction
				}
			});
		}]
	}, function (err, result) {
		var transfer = new Transfer();
		transfer.bind({
			modules: {
				accounts: result.accountModule,
				rounds: result.rounds
			}
		});
		transaction.attachAssetType(transactionTypes.SEND, transfer);
	});
};

describe('transaction', function () {

	var transaction;

	before(function (done) {
		async.auto({
			rounds: function (cb) {
				modulesLoader.initModule(Rounds, modulesLoader.scope, cb);
			},
			accountLogic: function (cb) {
				modulesLoader.initLogicWithDb(AccountLogic, cb);
			},
			transaction: ['accountLogic', function (result, cb) {
				modulesLoader.initLogicWithDb(Transaction, cb, {
					ed: require('../../../helpers/ed'),
					account: result.accountLogic
				});
			}]
		}, function (err, result) {
			transaction = result.transaction;
			attachTransferAsset(transaction, result.accountLogic, result.rounds);
			transaction.bindModules({
				rounds: result.rounds
			});
			done(err, result);
		});
	});

	describe('create', function () {

		it('should throw an error with no param', function () {
			expect(transaction.create).to.throw();
		});

		it('should throw an error when sender is not set', function () {
			var trsData = _.clone(validTransactionData);
			delete trsData.sender;
			expect(function () {
				transaction.create(transaction, trsData);
			}).to.throw();
		});

		it('should throw an error when keypair is not set', function () {
			var trsData = _.clone(validTransactionData);
			delete trsData.keypair;
			expect(function () {
				transaction.create(transaction, trsData);
			}).to.throw();
		});

		it('should create a transaction with data property', function () {
			var trsData = _.clone(validTransactionData);
			trsData.data = 'abc';
			expect(transaction.create(trsData)).to.be.an('object');
		});

		it('should create a transaction without data property', function () {
			var trsData = _.clone(validTransactionData);
			expect(transaction.create(trsData)).to.be.an('object');
		});

		it('should return transaction with optional data field', function () {
			var trsData = _.clone(validTransactionData);
			trsData.data = 'abc';
			expect(transaction.create(trsData).data).to.be.a('string');
		});

		it('should return transaction fee based on trs type and data field', function () {
			var trsData = _.clone(validTransactionData);
			trsData.data = 'abc';
			expect(transaction.create(trsData).fee).to.equal(20000000);
		});

		it('should return transaction fee based on trs type', function () {
			var trsData = _.clone(validTransactionData);
			expect(transaction.create(trsData).fee).to.equal(10000000);
		});
	});

	describe('attachAssetType', function () {

		it('should attach all transaction types', function () {
			var appliedLogic;
			appliedLogic = transaction.attachAssetType(transactionTypes.VOTE, new Vote());
			expect(appliedLogic).to.be.an.instanceof(Vote);
			appliedLogic = transaction.attachAssetType(transactionTypes.SEND, new Transfer());
			expect(appliedLogic).to.be.an.instanceof(Transfer);
			appliedLogic = transaction.attachAssetType(transactionTypes.DELEGATE, new Delegate());
			expect(appliedLogic).to.be.an.instanceof(Delegate);
			appliedLogic = transaction.attachAssetType(transactionTypes.SIGNATURE, new Signature());
			expect(appliedLogic).to.be.an.instanceof(Signature);
			appliedLogic = transaction.attachAssetType(transactionTypes.MULTI, new Multisignature());
			expect(appliedLogic).to.be.an.instanceof(Multisignature);
			appliedLogic = transaction.attachAssetType(transactionTypes.DAPP, new Dapp());
			expect(appliedLogic).to.be.an.instanceof(Dapp);
			appliedLogic = transaction.attachAssetType(transactionTypes.IN_TRANSFER, new InTransfer());
			expect(appliedLogic).to.be.an.instanceof(InTransfer);
			appliedLogic = transaction.attachAssetType(transactionTypes.OUT_TRANSFER, new OutTransfer());
			expect(appliedLogic).to.be.an.instanceof(OutTransfer);
			return transaction;
		});

		it('should throw an error on invalid asset', function () {
			expect(function () {
				var invalidAsset = {};
				transaction.attachAssetType(-1, invalidAsset);
			}).to.throw('Invalid instance interface');
		});

		it('should throw an error with no param', function () {
			expect(transaction.attachAssetType).to.throw();
		});
	});

	describe('sign', function () {
		it('should throw an error with no param', function () {
			expect(transaction.sign).to.throw();
		});

		it('should sign transaction', function () {
			expect(transaction.sign(senderKeypair, validTransaction)).to.be.a('string').which.is.equal('8f9c4242dc562599f95f5481469d22567987536112663156761e4b2b3f1142c4f5355a2a7c7b254f40d370bef7e76b4a11c8a1836e0c9b0bcab3e834ca1e7502');
		});

		it('should update signature when data is changed', function () {
			var originalSignature = transaction.sign(senderKeypair, validTransaction);
			var trs = _.clone(validTransaction);
			trs.data = '123';
			expect(transaction.sign(senderKeypair, trs)).to.be.a('string').which.is.not.equal(originalSignature);
		});
	});

	describe('multisign', function () {

		it('should throw an error with no param', function () {
			expect(transaction.multisign).to.throw();
		});

		it('should multisign the transaction', function () {
			expect(transaction.multisign(senderKeypair, validTransaction)).to.equal(validTransaction.signature);
		});
	});

	describe('getId', function () {

		it('should throw an error with no param', function () {
			expect(transaction.getId).to.throw();
		});

		it('should generate the id of the trs', function () {
			expect(transaction.getId(validTransaction)).to.be.a('string').which.is.equal(validTransaction.id);
		});

		it('should update id if a field is trs value changes', function () {
			var id = validTransaction.id;
			var trs = _.clone(validTransaction);
			trs.amount = 4000;
			expect(transaction.getId(trs)).to.not.equal(id);
		});
	});

	describe('getHash', function () {

		it('should throw an error with no param', function () {
			expect(transaction.getHash).to.throw();
		});

		it('should return hash for trs', function () {
			var trs = validTransaction;
			var expectedHash = '5164ef55fccefddf72360ea6e05f19eed7c8d2653c5069df4db899c47246dd2f';
			expect(transaction.getHash(trs).toString('hex')).to.be.a('string').which.is.equal(expectedHash);
		});

		it('should update hash if a field is trs value changes', function () {
			var originalTrsHash = '5164ef55fccefddf72360ea6e05f19eed7c8d2653c5069df4db899c47246dd2f';
			var trs = _.clone(validTransaction);
			trs.amount = 4000;
			expect(transaction.getHash(trs).toString('hex')).to.not.equal(originalTrsHash);
		});
	});

	describe('getBytes', function () {

		it('should throw an error with no param', function () {
			expect(transaction.getBytes).to.throw();
		});

		it('should return same result when called multiple times (without data field)', function () {
			var firstCalculation = transaction.getBytes(validTransaction);
			var secondCalculation = transaction.getBytes(validTransaction);
			expect(firstCalculation.equals(secondCalculation)).to.be.ok;
		});

		it('should return same result when called multiple times (with data field)', function () {
			var trsData = _.clone(validTransactionData);
			trsData.data = '123';
			var transactionWithData = transaction.create(trsData);
			var firstCalculation = transaction.getBytes(transactionWithData);
			var secondCalculation = transaction.getBytes(transactionWithData);
			expect(firstCalculation.equals(secondCalculation)).to.be.ok;
		});

		it('should return same result of getBytes using /logic/transaction and lisk-js package (without data field)', function () {
			var trsBytesFromLogic = transaction.getBytes(validTransaction);
			var trsBytesFromLiskJs = node.lisk.crypto.getBytes(validTransaction);
			expect(trsBytesFromLogic.equals(trsBytesFromLiskJs)).to.be.ok;
		});

		it('should return same result of getBytes using /logic/transaction and lisk-js package (with data field)', function () {
			var trsData = _.clone(validTransactionData);
			trsData.data = '123';
			var trs = transaction.create(trsData);
			var trsBytesFromLogic = transaction.getBytes(trs);
			var trsBytesFromLiskJs = node.lisk.crypto.getBytes(trs);
			expect(trsBytesFromLogic.length).to.equal(trsBytesFromLiskJs.length);
			expect(trsBytesFromLogic.equals(trsBytesFromLiskJs)).to.be.ok;
		});

		it('should skip signature, second signature for getting bytes', function () {
			var trsBytes = transaction.getBytes(validTransaction, true);
			expect(trsBytes.length).to.equal(53);
		});
	});

	describe('ready', function () {

		it('should throw an error with no param', function () {
			expect(transaction.ready).to.throw();
		});

		it('should return false when sender not provided', function () {
			var trs = validTransaction;
			expect(transaction.ready(trs)).to.equal(false);
		});

		it('should return true for valid trs and sender', function () {
			var trs = validTransaction;
			expect(transaction.ready(trs, validSender)).to.equal(true);
		});
	});

	describe('countById', function () {

		it('should throw an error with no param', function () {
			expect(transaction.countById).to.throw();
		});

		it('should return count of trs in db with trs id', function (done) {
			transaction.countById(validTransaction, function (err, count) {
				expect(err).to.not.exist;
				expect(count).to.be.equal(1);
				done();
			});
		});

		it('should return 1 for transaction from genesis block', function (done) {
			var genesisTrs = {
				'id': '1465651642158264047'
			};
			transaction.countById(genesisTrs, function (err, count) {
				expect(err).to.not.exist;
				expect(count).to.equal(1);
				done();
			});
		});
	});

	describe('checkConfirmed', function () {

		it('should throw an error with no param', function () {
			expect(transaction.checkConfirmed).to.throw();
		});

		it('should check that trs is not confirmed', function (done) {
			var trs = transaction.create(validTransactionData);
			transaction.checkConfirmed(trs, function (err, count) {
				expect(err).to.not.exist;
				done();
			});
		});

		it('should throw for transaction which is already confirmed', function (done) {
			transaction.checkConfirmed(validTransaction, function (err, count) {
				expect(err).to.include('Transaction is already confirmed');
				done();
			});
		});
	});

	describe('checkBalance', function () {

		it('should throw an error with no param', function () {
			expect(transaction.checkBalance).to.throw();
		});

		it('should return exceeded when sender has insufficiant balance', function () {
			var amount =  '9850458911801509';
			var balanceKey = 'balance';
			var res = transaction.checkBalance(amount, balanceKey, validTransaction, validSender);
			expect(res.exceeded).to.equal(true);
			expect(res.error).to.include('Account does not have enough LSK:');
		});

		it('should be okay if insufficient balance from genesis account', function () {
			var trs = _.clone(validTransaction);
			var amount =  '999823366072900';
			var balanceKey = 'balance';
			// adding genesis block id for testing
			trs.blockId = '9314232245035524467';
			var res = transaction.checkBalance(amount, balanceKey, trs, validSender);
			expect(res.exceeded).to.equal(false);
			expect(res.error).to.not.exist;
		});

		it('should be okay if sender has sufficient balance', function () {
			var balanceKey = 'balance';
			var res = transaction.checkBalance(validTransaction.amount, balanceKey, validTransaction, validSender);
			expect(res.exceeded).to.equal(false);
			expect(res.error).to.not.exist;
		});
	});

	describe('process', function () {

		it('should throw an error with no param', function () {
			expect(transaction.process).to.throw();
		});

		it('should process the transaction', function (done) {
			var trs = _.clone(validTransaction);
			transaction.process(trs, validSender, function (err, res) {
				expect(err).to.not.be.ok;
				expect(res).to.be.an('object');
				done();
			});
		});
	});

	describe('verify', function () {

		function createAndProcess (trsData, sender, cb) {
			var trs = transaction.create(trsData);
			transaction.process(trs, sender, function (err, __trs) {
				expect(err).to.not.exist;
				expect(__trs).to.be.an('object');
				cb(__trs);
			});
		}

		it('should throw error when sender is missing', function (done) {
			var trs = _.clone(validUnconfirmedTrs);
			transaction.verify(trs, null, {}, function (err, res) {
				expect(err).to.equal('Missing sender');
				expect(res).to.not.exist;
				done();
			});
		});

		it('should throw error with invalid trs type', function (done) {
			var trs = _.clone(validTransaction);
			trs.type = -1;

			transaction.verify(trs, validSender, {}, function (err, res) {
				expect(err).to.include('Unknown transaction type');
				expect(res).to.not.exist;
				done();
			});
		});

		it('should throw error when missing sender second signature', function (done) {
			var trs = _.clone(validUnconfirmedTrs);
			var vs = _.clone(validSender);
			vs.secondSignature = '839eba0f811554b9f935e39a68b3078f90bea22c5424d3ad16630f027a48362f78349ddc3948360045d6460404f5bc8e25b662d4fd09e60c89453776962df40d';

			transaction.verify(trs, vs, {}, function (err, res) {
				expect(err).to.include('Missing sender second signature');
				expect(res).to.not.exist;
				done();
			});
		});

		it('should throw error when sender does not have a second signature', function (done) {
			var trs = _.clone(validUnconfirmedTrs);
			trs.secondSignature = '839eba0f811554b9f935e39a68b3078f90bea22c5424d3ad16630f027a48362f78349ddc3948360045d6460404f5bc8e25b662d4fd09e60c89453776962df40d';
			trs.signSignature = ['ebedfe9832b82d6211b6fda7c53ef0d3b857e2cec73fade305def8deb75d28e9a1ea0db45cc3b90361528dc0b27c0faa48fb53592416753bb9f69103727e1200'];

			transaction.verify(trs, validSender, {}, function (err, res) {
				expect(err).to.include('Sender does not have a second signature');
				expect(res).to.not.exist;
				done();
			});
		});

		it('should throw error when sender does not have a second signature', function (done) {
			var trs = _.clone(validUnconfirmedTrs);
			var requester = {
				secondSignature : 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f'
			};
			trs.requesterPublicKey = '839eba0f811554b9f935e39a68b3078f90bea22c5424d3ad16630f027a48362f78349ddc3948360045d6460404f5bc8e25b662d4fd09e60c89453776962df40d';

			transaction.verify(trs, validSender, requester, function (err, res) {
				expect(err).to.include('Missing requester second signature');
				expect(res).to.not.exist;
				done();
			});
		});

		it('should throw error when publicKey is invalid', function (done) {
			var trs = _.clone(validUnconfirmedTrs);
			var invalidPublicKey =  '01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398db746';
			trs.senderPublicKey = invalidPublicKey;

			transaction.verify(trs, validSender, {}, function (err, res) {
				expect(err).to.include(['Invalid sender public key:', invalidPublicKey, 'expected:', validSender.publicKey].join(' '));
				expect(res).to.not.exist;
				done();
			});
		});

		it('should be impossible to send the money from genesis account', function (done) {

			var trs = _.clone(validUnconfirmedTrs);

			//genesis account info
			trs.senderPublicKey = node.gAccount.publicKey;
			trs.senderId = node.gAccount.address;
			trs.id = '6377354815333756139';
			var vs = _.clone(validSender);
			vs.publicKey = 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8';

			transaction.verify(trs, vs, {}, function (err, res) {
				expect(err).to.include('Invalid sender. Can not send from genesis account');
				expect(res).to.be.empty;
				done();
			});
		});

		it('should throw on different sender address in trs and sender', function (done) {
			var trs = _.clone(validUnconfirmedTrs);
			trs.senderId = '2581762640681118072L';

			transaction.verify(trs, validSender, {}, function (err, res) {
				expect(err).to.include('Invalid sender address');
				expect(res).to.be.empty;
				done();
			});
		});

		it.skip('should throw when Account does not belong to multisignature group', function (done) {
		});

		it.skip('should throw when failed to verify signature', function (done) {
		});

		it.skip('should throw when failed to verify second signature', function (done) {
		});

		it.skip('should throw when encountered duplicate signature in transaction', function (done) {
		});

		it.skip('should throw when failed to verify multisignature', function (done) {

		});

		it('should throw when transaction fee is incorrect', function (done) {
			var trs = _.clone(validUnconfirmedTrs);
			trs.fee = -100;
			transaction.verify(trs, validSender, {}, function (err, res) {
				expect(err).to.include('Invalid transaction fee');
				done();
			});
		});

		it('should verify transaction with correct fee (with data field)', function (done) {
			var trs = _.clone(validUnconfirmedTrs);
			trs.data = '123';
			trs.fee += 10000000;
			delete trs.signature;
			trs.signature = transaction.sign(senderKeypair, trs);
			transaction.verify(trs, validSender, {}, function (err, res) {
				expect(err).to.be.empty;
				done();
			});
		});

		it('should verify transaction with correct fee (without data field)', function (done) {
			transaction.verify(validUnconfirmedTrs, validSender, {}, function (err, res) {
				expect(err).to.be.empty;
				done();
			});
		});

		it('should throw when transaction amount is invalid', function (done) {
			var trsData = _.clone(validTransactionData);
			trsData.amount = node.constants.totalAmount + 10;
			createAndProcess(trsData, validSender, function (trs) {
				transaction.verify(trs, validSender, {}, function (err, res) {
					expect(err).to.include('Invalid transaction amount');
					done();
				});
			});
		});

		it('should throw when account balance is less than transaction amount', function (done) {
			var trsData = _.clone(validTransactionData);
			trsData.amount = node.constants.totalAmount;
			createAndProcess(trsData, validSender, function (trs) {
				transaction.verify(trs, validSender, {}, function (err, res) {
					expect(err).to.include('Account does not have enough LSK:');
					done();
				});
			});
		});

		it('should throw on future timestamp', function (done) {
			var trs = _.clone(validUnconfirmedTrs);
			console.log(trs);
			trs.timestamp = trs.timestamp + 115000;
			delete trs.signature;
			trs.signature = transaction.sign(senderKeypair, trs);
			transaction.verify(trs, validSender, {}, function (err, res) {
				expect(err).to.include('Invalid transaction timestamp');
				done();
			});
		});

		it('should verify proper transaction with proper sender', function (done) {
			var trs = _.clone(validUnconfirmedTrs);
			transaction.verify(trs, validSender, {}, function (err, res) {
				expect(err).to.not.be.ok;
				expect(res).to.be.empty;
				done();
			});
		});

//	it('should verify proper SIGNATURE transaction with proper sender', function (done) {
//		attachAllAssets(transaction);
//		var trsData = getValidTransactionData();
//		trsData.type = transactionTypes.SIGNATURE;
//		trsData.secondKeypair = {
//			publicKey: validSender.publicKey
//		};
//		var trs = transaction.create(trsData);

//		transaction.process(trs, validSender, {}, function (err, tx) {
//			expect(err).to.be.a('null');
//			transaction.verify(tx, validSender, {}, function (err, res) {
//				expect(err).to.be.empty;
//				expect(res).to.be.empty;
//				done();
//			});
//		});
//	});

//	it('should verify proper DELEGATE transaction with proper sender', function (done) {
//		var trsData = getValidTransactionData();

//		trsData.type = transactionTypes.DELEGATE;
//		trsData.username = 'adelegatename';
//		trsData.sender= {
//			publicKey: validTransaction.senderPublicKey
//		};

//		var trs = transaction.create(trsData);
//		transaction.process(trs, validSender, {}, function (err, tx) {
//			expect(err).to.be.a('null');
//			transaction.verify(tx, validSender, {}, function (err, res) {
//				expect(err).to.be.empty;
//				expect(res).to.be.empty;
//				done();
//			});
//		});
//	});

//	it('should verify proper VOTE transaction with proper sender', function (done) {

//		var trsData = getValidTransactionData();
//		trsData.type = transactionTypes.VOTE;
//		trsData.sender.publicKey = validSender.publicKey;

//		var trs = transaction.create(trsData);
//		transaction.process(trs, validSender, {}, function (err, tx) {
//			transaction.verify(tx, validSender, {}, function (err, res) {
//				expect(err).to.be.empty;
//				expect(res).to.be.empty;
//				done();
//			});
//		});
//	});

//	it('should verify proper MULTI transaction with proper sender', function (done) {

//		var trsData = getValidTransactionData();
//		trsData.type = transactionTypes.MULTI;
//		trsData.sender.publicKey = validSender.publicKey;

//		var trs = transaction.create(trsData);
//		transaction.process(trs, validSender, {}, function (err, tx) {
//			transaction.verify(tx, validSender, {}, function (err, res) {
//				expect(err).to.be.empty;
//				expect(res).to.be.empty;
//				done();
//			});
//		});
//	});

//	it('should verify proper DAPP transaction with proper sender', function (done) {
//		validTransaction.type = transactionTypes.DAPP;
//		validTransaction.asset = {
//			signature: {
//				publicKey: validSender.publicKey
//			}
//		};
//		transaction.verify(validTransaction, validSender, {}, function (err, res) {
//			expect(err).to.be.empty;
//			expect(res).to.be.empty;
//			done();
//		});
//	});

//	it('should verify proper IN_TRANSFER transaction with proper sender', function (done) {
//		validTransaction.type = transactionTypes.IN_TRANSFER;
//		validTransaction.asset = {
//			signature: {
//				publicKey: validSender.publicKey
//			}
//		};
//		transaction.verify(validTransaction, validSender, {}, function (err, res) {
//			expect(err).to.be.empty;
//			expect(res).to.be.empty;
//			done();
//		});
//	});

//	it('should verify proper OUT_TRANSFER transaction with proper sender', function (done) {
//		validTransaction.type = transactionTypes.OUT_TRANSFER;
//		validTransaction.asset = {
//			signature: {
//				publicKey: validSender.publicKey
//			}
//		};
//		transaction.verify(validTransaction, validSender, {}, function (err, res) {
//			expect(err).to.be.empty;
//			expect(res).to.be.empty;
//			done();
//		});
//	});


		it('should throw an error with no param', function () {
			expect(transaction.verify).to.throw();
		});
	});

	describe('verifySignature', function () {

		it('should throw an error with no param', function () {
			expect(transaction.verifySignature).to.throw();
		});

		it('should return false if trs is changed', function () {
			var trs = _.clone(validTransaction);
			// change trs value
			trs.amount = 1001;
			expect(transaction.verifySignature(trs, validSender.publicKey, trs.signature)).to.equal(false);
		});

		it('should return false if signature not provided', function () {
			var trs = validTransaction;
			expect(transaction.verifySignature(trs, validSender.publicKey, null)).to.equal(false);
		});

		it('should return valid signature for correct trs', function () {
			var trs = validTransaction;
			expect(transaction.verifySignature(trs, validSender.publicKey, trs.signature)).to.equal(true);
		});

		it('should throw if public key is invalid', function () {
			var trs = validTransaction;
			var invalidPublicKey = '123123123';
			expect(function () {
				transaction.verifySignature(trs, invalidPublicKey, trs.signature);
			}).to.throw();
		});
	});

	describe('verifySecondSignature', function () {

		it('should throw an error with no param', function () {
			expect(transaction.verifySecondSignature).to.throw();
		});

		it('should verify the second signature correctly', function () {
			var hash = crypto.createHash('sha256').update(node.eAccount.password, 'utf8').digest();
			var keypair = ed.makeKeypair(hash);
			var signature = transaction.sign(keypair, validTransaction);

			expect(transaction.verifySecondSignature(validTransaction, keypair.publicKey, signature)).to.equal(true);
		});
	});

	describe('verifyBytes', function () {

		it('should throw an error with no param', function () {
			expect(transaction.verifyBytes).to.throw();
		});

		it('should return when sender public publicKey is different', function () {
			var trsBytes = transaction.getBytes(validTransaction);
			var invalidPublicKey = 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9';
			expect(transaction.verifyBytes(trsBytes, invalidPublicKey, validTransaction.signature)).to.equal(false);
		});

		it('should throw when publickey is not in the right format', function () {
			var trsBytes = transaction.getBytes(validTransaction);
			var invalidPublicKey = 'iddb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9';
			expect(function () {
				transaction.verifyBytes(trsBytes, invalidPublicKey, validTransaction.signature);
			}).to.throw();
		});

		it('should be okay for valid bytes', function () {
			var trsBytes = transaction.getBytes(validTransaction, true, true);
			var res = transaction.verifyBytes(trsBytes, validTransaction.senderPublicKey, validTransaction.signature);
			expect(res).to.equal(true);
		});
	});

	describe('apply', function () {
		var dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};

		before(function () {

		});

		it('should throw an error with no param', function () {
			expect(function () { transaction.apply(); }).to.throw();
		});

		it('should be okay with valid params', function (done) {
			var trs = validUnconfirmedTrs;
			transaction.apply(trs, dummyBlock, validSender, function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		it('should throw on if balance is low', function (done) {
			var trs = _.clone(validTransaction);
			trs.amount = '9850458911801908';

			transaction.apply(trs, dummyBlock, validSender, function (err) {
				expect(err).to.include('Account does not have enough ');
				done();
			});
		});

		it.skip('should throw with a different sender', function (done) {
			var trs = validTransaction;
			trs.amount = 10;
			var randomAccount = {
				address: '239269356711361894L',
				publicKey: '15fd9f3e23f725e402a00789bd9548d3d732ed9754b9c6125c5267601c2d8b84',
				balance: 8067374861277
			};
			// this test fails, while it shouldn't.
			transaction.apply(trs, dummyBlock, randomAccount, function (err) {
				console.log(err);
				expect(err).to.exist;
				done();
			});
		});

	});

	describe('undo', function () {

		it('should throw an error with no param', function () {
			expect(transaction.undo).to.throw();
		});
	});

	describe('applyUnconfirmed', function () {

		it('should throw an error with no param', function () {
			expect(transaction.applyUnconfirmed).to.throw();
		});
	});

	describe('undoUnconfirmed', function () {

		it('should throw an error with no param', function () {
			expect(transaction.undoUnconfirmed).to.throw();
		});
	});

	describe('dbSave', function () {

		it('should throw an error with no param', function () {
			expect(transaction.dbSave).to.throw();
		});

		it('should throw an error when type is not specified', function () {
			var trs = _.clone(validTransaction);
			delete trs.type;
			expect(function () {
				transaction.dbSave(trs);
			}).to.throw();
		});

		it.skip('should create comma separated trs signatures', function (done) {
			done();
		});

		it('should return response for valid parameters with data field', function () {
			var trs = _.clone(validTransaction);
			trs.data = '123';
			var savePromise = transaction.dbSave(trs);
			expect(savePromise).to.be.an('Array');
			expect(savePromise).to.have.length(1);
			var trsValues = savePromise[0].values;
			expect(trsValues).to.have.property('data').to.eql(new Buffer('123'));
		});

		it('should return response for valid parameters', function () {
			var savePromise = transaction.dbSave(validTransaction);
			var keys = [
				'table',
				'fields',
				'values'
			];
			var valuesKeys = [
				'id',
				'blockId',
				'type',
				'timestamp',
				'senderPublicKey',
				'requesterPublicKey',
				'senderId',
				'recipientId',
				'amount',
				'fee',
				'signature',
				'signSignature',
				'signatures',
				'data'
			];
			expect(savePromise).to.be.an('Array');
			expect(savePromise).to.have.length(1);
			expect(savePromise[0]).to.have.keys(keys);
			expect(savePromise[0].values).to.have.keys(valuesKeys);
		});
	});

	describe('afterSave', function () {

		it('should throw an error with no param', function () {
			expect(transaction.afterSave).to.throw();
		});

		it('should invoke the passed callback', function (done) {
			var trs = validTransaction;
			transaction.afterSave(trs, function () {
				done();
			});
		});
	});

	describe('objectNormalize', function () {

		it('should throw an error with no param', function () {
			expect(transaction.objectNormalize).to.throw();
		});

		it('should remove keys with null or undefined attribute', function () {
			var trs = _.clone(validTransaction);
			trs.amount = null;
			expect(_.keys(transaction.objectNormalize(trs))).to.not.include('amount');
		});

		it('should not remove any keys with valid entries', function () {
			expect(_.keys(transaction.objectNormalize(validTransaction))).to.have.length(11);
		});

		it('should not remove data field after normalization', function () {
			var trs = _.clone(validTransaction);
			trs.data = '123';
			expect(_.keys(transaction.objectNormalize(trs))).to.include('data');
		});

		it('should throw error for invalid schema types', function () {
			var trs = _.clone(validTransaction);
			trs.amount = 'Invalid value';
			trs.data = 124;
			expect(function () {
				transaction.objectNormalize(trs);
			}).to.throw();
		});
	});

	describe('dbRead', function () {

		it('should throw an error with no param', function () {
			expect(transaction.dbRead).to.throw();
		});

		it('should return transaction object with data field', function () {
			var rawTrs = _.clone(rawValidTransaction);
			rawTrs.t_data = '123';
			var trs = transaction.dbRead(rawTrs);
			expect(trs).to.be.an('object');
			expect(trs).to.have.property('data');
		});

		it('should return null if id field is not present', function () {
			var rawTrs = _.clone(rawValidTransaction);
			delete rawTrs.t_id;
			var trs = transaction.dbRead(rawTrs);
			expect(trs).to.be.a('null');
		});

		it('should return transaction object with correct fields', function () {
			var rawTrs = _.clone(rawValidTransaction);
			var trs = transaction.dbRead(rawTrs);
			var expectedKeys = [
				'id',
				'height',
				'blockId',
				'type',
				'timestamp',
				'senderPublicKey',
				'requesterPublicKey',
				'senderId',
				'recipientId',
				'recipientPublicKey',
				'amount',
				'fee',
				'signature',
				'signSignature',
				'signatures',
				'confirmations',
				'asset',
				'data'
			];
			expect(trs).to.be.an('object');
			expect((trs)).to.have.keys(expectedKeys);
		});
	});
});
