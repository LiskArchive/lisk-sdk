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
var Account = require('../../../logic/account.js');

var Vote = require('../../../logic/vote.js');
var Transfer = require('../../../logic/transfer.js');
var Delegate = require('../../../logic/delegate.js');
var Signature = require('../../../logic/signature.js');
var Multisignature = require('../../../logic/multisignature.js');
var Dapp = require('../../../logic/dapp.js');
var InTransfer = require('../../../logic/inTransfer.js');
var OutTransfer = require('../../../logic/outTransfer.js');

var validSender = {
	address: '16313739661670634666L',
	balance: '9998233660728012',
	blockId: '18442541249745759313',
	fees: '0',
	isDelegate: 0,
	missedblocks: 0,
	multilifetime: 0,
	multimin: 0,
	multisignatures: null,
	nameexist: 0,
	producedblocks: 0,
	publicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	rate: '0',
	rewards: '0',
	secondPublicKey: null,
	secondSignature: 0,
	username: null
};

var validTransaction = {
	type: 0,
	amount: 232420792390,
	senderPublicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	requesterPublicKey: null,
	timestamp: 24177404,
	asset: {},
	recipientId: '11483172656590824880L',
	signature: 'faf3081850b92de3fcd46346b883ca0a0096ae5366a5dafce9ace6ddf7970338501ae51ef138ca63aad571c399144d713e5be34a61e6885c8074740c66e3d90b',
	id: '4669815655990175999',
	fee: 10000000,
	senderId: '16313739661670634666L'
};

var rawTransaction = {
	b_height: 11914,
	t_id: '4669815655990175999',
	t_data: 'abcd',
	t_type: 0,
	t_timestamp: 24177404,
	t_senderPublicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	t_senderId: '16313739661670634666L',
	t_recipientId: '11483172656590824880L',
	t_amount: 232420792390,
	t_fee: 10000000,
	t_signature:  'faf3081850b92de3fcd46346b883ca0a0096ae5366a5dafce9ace6ddf7970338501ae51ef138ca63aad571c399144d713e5be34a61e6885c8074740c66e3d90b'
};

function getValidTransactionData () {
	var hash = crypto.createHash('sha256').update(node.gAccount.password, 'utf8').digest();
	var keypair = ed.makeKeypair(hash);

	var trsData = {
		type: 0,
		amount: 232420792390,
		sender: validSender,
		senderId: '16313739661670634666L',
		timestamp: 24177404,
		recipientId: '11483172656590824880L',
		data: '50b92d',
		keypair: keypair,
		senderPublicKey: node.gAccount.publicKey,
		fee: 20000000
	};

	return trsData;
}

var attachAllAssets = function (transaction) {
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
};

describe('transaction', function () {

	var transaction;

	before(function (done) {
		async.auto({
			rounds: function (cb) {
				modulesLoader.initModule(Rounds, modulesLoader.scope, cb);
			},
			account: function (cb) {
				modulesLoader.initLogicWithDb(Account, cb);
			},
			transaction: ['account', function (scope, cb) {
				modulesLoader.initLogicWithDb(Transaction, function (err, __transaction) {
					cb(err, __transaction);
				}, {
					ed: require('../../../helpers/ed'),
					account: scope.account
				});
			}]
		}, function (err, result) {
			transaction = result.transaction;
			attachAllAssets(transaction);
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
			var trsData = getValidTransactionData();
			delete trsData.sender;
			expect(transaction.create.bind(transaction, trsData)).to.throw();
		});

		it('should throw an error when keypair is not set', function () {
			var trsData = getValidTransactionData();
			delete trsData.keypair;
			expect(transaction.create.bind(transaction, trsData)).to.throw();
		});

		it('should create a transaction with data property', function () {
			var trsData = getValidTransactionData();
			expect(transaction.create(trsData)).to.be.an('object');
		});

		it('should create a transaction without data property', function () {
			var trsData = getValidTransactionData();
			delete trsData.data;
			expect(transaction.create(trsData)).to.be.an('object');
		});

		it('should return transaction with optional data field', function () {
			var trsData = getValidTransactionData();
			expect(transaction.create(trsData).data).to.be.a('string');
		});

		it('should return transaction fee based on trs type and data field', function () {
			var trsData = getValidTransactionData();
			delete trsData.fee;
			expect(transaction.create(trsData).fee).to.equal(20000000);
		});

		it('should return transaction fee based on trs type', function () {
			var trsData = getValidTransactionData();
			delete trsData.data;
			delete trsData.fee;
			expect(transaction.create(trsData).fee).to.equal(10000000);
		});
	});

	describe('attachAssetType', function () {

		it('should attach all transaction types', function () {
			attachAllAssets(transaction);
		});

		it('should throw an error on invalid asset', function () {
			expect(transaction.attachAssetType.bind(-1, {}).to.throw());
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
			var trs = _.clone(validTransaction);
			var password = 'wagon stock borrow episode laundry kitten salute link globe zero feed marble';
			var hash = crypto.createHash('sha256').update(password, 'utf8').digest();
			var keypair = ed.makeKeypair(hash);
			expect(transaction.sign(keypair, trs)).to.equal(trs.signature);
		});

		it('should update signature when data is changed', function () {
			var trsData = getValidTransactionData();
			var createdTransaction = transaction.create(trsData);
			var trsSignature = transaction.sign(trsData.keypair, createdTransaction);
			createdTransaction.data = 'different data';
			var updatedTrsSignature = transaction.sign(trsData.keypair, createdTransaction);
			expect(trsSignature).to.not.equal(updatedTrsSignature);;
		});
	});

	describe('multisign', function () {

		it('should throw an error with no param', function () {
			expect(transaction.multisign).to.throw();
		});

		it('should multisign the transaction', function () {
			var trs = getValidTransactionData();
			expect(transaction.multisign(trs.keypair, trs)).to.equal('7a503aa419aa7e3aa9aaaf968f8dcba8b50d606403d3e7da6dbe8e510daeafc91a7b2f2824a3e8bea32060fca9d737516e1fc968c7366686cbdf372d6f8ebb0e');
		});
	});

	describe('getId', function () {

		it('should throw an error with no param', function () {
			expect(transaction.getId).to.throw();
		});

		it('should generate the id of the trs', function () {
			var trs = validTransaction;
			expect(transaction.getId(trs)).to.equal(trs.id);
		});

		it('should update id if a field is trs value changes', function () {
			var trs = _.clone(validTransaction);
			var id = transaction.getId(trs);
			trs.amount = 4000;
			expect(transaction.getId(trs)).to.equal(id);
		});
	});

	describe('getHash', function () {

		it('should throw an error with no param', function () {
			expect(transaction.getHash).to.throw();
		});

		it('should return hash has for trs', function () {
			var trs = validTransaction;
			var expectedHash = 'ff28daed9884ce409133b1a41451097345146525773081024936b429907914a4';
			expect(transaction.getHash(trs).toString('hex')).to.equal(expectedHash);
		});

		it('should update hash if a field is trs value changes', function () {
			var trs = _.clone(validTransaction);
			var originalTrsHash = 'ff28daed9884ce409133b1a41451097345146525773081024936b429907914a4';
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
			var transactionWithData = transaction.create(getValidTransactionData());
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
			var trs = transaction.create(getValidTransactionData());
			var trsBytesFromLogic = transaction.getBytes(trs);
			var trsBytesFromLiskJs = node.lisk.crypto.getBytes(trs);
			expect(trsBytesFromLogic.length).to.equal(trsBytesFromLiskJs.length);
			expect(trsBytesFromLogic.equals(trsBytesFromLiskJs)).to.be.ok;
		});

		it('should skip signature, second signature for getting bytes', function () {
			var trs = validTransaction;
			var trsBytes = transaction.getBytes(trs, true);
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
				expect(count).to.equal(0);
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
			transaction.checkConfirmed(validTransaction, function (err, count) {
				expect(err).to.not.exist;
				done();
			});
		});

		it('should throw for transaction from genesis block', function (done) {
			var genesisTrs = {
				'id': '1465651642158264047'
			};
			transaction.checkConfirmed(genesisTrs, function (err, count) {
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
			var amount =  '999823366072900';
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

		it.only('should process the transaction', function (done) {
			var trs = _.clone(validTransaction);
			transaction.process(trs, validSender, function (err, res) {
				expect(err).to.not.be.ok;
				expect(res).to.be.an('object');
				done();
			});
		});
	});

	describe('verify', function () {

		var trs;

		before(function () {
			attachAllAssets(transaction);
		});

		it('should throw error when sender is missing', function (done) {
			var trs = _.clone(validTransaction);

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
			var trs = _.clone(validTransaction);
			var vs = _.clone(validSender);
			vs.secondSignature = '839eba0f811554b9f935e39a68b3078f90bea22c5424d3ad16630f027a48362f78349ddc3948360045d6460404f5bc8e25b662d4fd09e60c89453776962df40d';

			transaction.verify(trs, vs, {}, function (err, res) {
				expect(err).to.include('Missing sender second signature');
				expect(res).to.not.exist;
				done();
			});
		});

		it('should throw error when sender does not have a second signature', function (done) {
			var trs = _.clone(validTransaction);
			trs.secondSignature = '839eba0f811554b9f935e39a68b3078f90bea22c5424d3ad16630f027a48362f78349ddc3948360045d6460404f5bc8e25b662d4fd09e60c89453776962df40d';
			trs.signSignature = ['ebedfe9832b82d6211b6fda7c53ef0d3b857e2cec73fade305def8deb75d28e9a1ea0db45cc3b90361528dc0b27c0faa48fb53592416753bb9f69103727e1200'];

			transaction.verify(trs, validSender, {}, function (err, res) {
				expect(err).to.include('Sender does not have a second signature');
				expect(res).to.not.exist;
				done();
			});
		});

		it('should throw error when sender does not have a second signature', function (done) {
			var trs = _.clone(validTransaction);
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
			var trs = _.clone(validTransaction);
			var invalidPublicKey =  '01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398db746';
			trs.senderPublicKey = invalidPublicKey;

			transaction.verify(trs, validSender, {}, function (err, res) {
				expect(err).to.include(['Invalid sender public key:', invalidPublicKey, 'expected:', validSender.publicKey].join(' '));
				expect(res).to.not.exist;
				done();
			});
		});

		it('should be impossible to send the money from genesis account', function (done) {

			var trs = _.clone(validTransaction);

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
			var trs = _.clone(validTransaction);
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
			var trs = _.clone(validTransaction);
			trs.fee = -100;
			transaction.verify(trs, validSender, {}, function (err, res) {
				expect(err).to.include('Invalid transaction fee');
				done();
			});
		});

		it('should verify transaction with correct fee (with data field)', function (done) {
			var trsData = getValidTransactionData();
			var trsSignature = transaction.sign(trsData.keypair, trsData);
			trsData.signature = trsSignature;
			transaction.verify(trsData, trsData.sender, {}, function (err, res) {
				expect(err).to.be.empty;
				done();
			});
		});

		it('should verify transaction with correct fee (without data field)', function (done) {
			var trsData = getValidTransactionData();
			// remove trs data field and set fee to correct value
			delete trsData.data;
			trsData.fee = 10000000;
			var trsSignature = transaction.sign(trsData.keypair, trsData);
			trsData.signature = trsSignature;
			transaction.verify(trsData, trsData.sender, {}, function (err, res) {
				expect(err).to.be.empty;
				done();
			});
		});

		it('should throw when transaction amount is invalid', function (done) {
			var trs = _.clone(validTransaction);
			trs.amount = node.constants.totalAmount + 10;
			transaction.verify(trs, validSender, {}, function (err, res) {
				expect(err).to.include('Invalid transaction amount');
				done();
			});
		});

		it('should throw when account balance is less than transaction amount', function (done) {
			var trs = _.clone(validTransaction);
			trs.amount = node.constants.totalAmount;
			transaction.sign(trs);
			transaction.verify(trs, validSender, {}, function (err, res) {
				expect(err).to.include('Account does not have enough LSK:');
				done();
			});
		});

		it('should throw on invalid timestamp', function (done) {
			var trs = _.clone(validTransaction);
			trs.timestamp = 24364800;
			transaction.verify(trs, validSender, {}, function (err, res) {
				expect(err).to.include('Invalid transaction timestamp');
				done();
			});
		});

		it('should verify proper transaction with proper sender', function (done) {
			var trs = _.clone(validTransaction);

			transaction.verify(trs, validSender, {}, function (err, res) {
				expect(err).to.not.be.ok;
				expect(res).to.be.empty;
				done();
			});
		});
		
		it('should verify proper SIGNATURE transaction with proper sender', function (done) {
			attachAllAssets(transaction);
			var trsData = getValidTransactionData();
			trsData.type = transactionTypes.SIGNATURE;
			trsData.secondKeypair = {
				publicKey: validSender.publicKey
			};
			var trs = transaction.create(trsData);

			transaction.process(trs, validSender, {}, function (err, tx) {
				expect(err).to.be.a('null');
				transaction.verify(tx, validSender, {}, function (err, res) {
					expect(err).to.be.empty;
					expect(res).to.be.empty;
					done();
				});
			});
		});

		it('should verify proper DELEGATE transaction with proper sender', function (done) {
			var trsData = getValidTransactionData();

			trsData.type = transactionTypes.DELEGATE;
			trsData.username = 'adelegatename';
			trsData.sender= {
				publicKey: validTransaction.senderPublicKey
			};

			var trs = transaction.create(trsData);
			transaction.process(trs, validSender, {}, function (err, tx) {
				expect(err).to.be.a('null');
				transaction.verify(tx, validSender, {}, function (err, res) {
					expect(err).to.be.empty;
					expect(res).to.be.empty;
					done();
				});
			});
		});

		it('should verify proper VOTE transaction with proper sender', function (done) {

			var trsData = getValidTransactionData();
			trsData.type = transactionTypes.VOTE;
			trsData.sender.publicKey = validSender.publicKey;

			var trs = transaction.create(trsData);
			console.log(trs);
			transaction.process(trs, validSender, {}, function (err, tx) {
				transaction.verify(tx, validSender, {}, function (err, res) {
					expect(err).to.be.empty;
					expect(res).to.be.empty;
					done();
				});
			});
		});

		it('should verify proper MULTI transaction with proper sender', function (done) {

			var trsData = getValidTransactionData();
			trsData.type = transactionTypes.MULTI;
			trsData.sender.publicKey = validSender.publicKey;

			var trs = transaction.create(trsData);
			transaction.process(trs, validSender, {}, function (err, tx) {
				transaction.verify(tx, validSender, {}, function (err, res) {
					expect(err).to.be.empty;
					expect(res).to.be.empty;
					done();
				});
			});
		});

		it('should verify proper DAPP transaction with proper sender', function (done) {
			validTransaction.type = transactionTypes.DAPP;
			validTransaction.asset = {
				signature: {
					publicKey: validSender.publicKey
				}
			};
			transaction.verify(validTransaction, validSender, {}, function (err, res) {
				expect(err).to.be.empty;
				expect(res).to.be.empty;
				done();
			});
		});

		it('should verify proper IN_TRANSFER transaction with proper sender', function (done) {
			validTransaction.type = transactionTypes.IN_TRANSFER;
			validTransaction.asset = {
				signature: {
					publicKey: validSender.publicKey
				}
			};
			transaction.verify(validTransaction, validSender, {}, function (err, res) {
				expect(err).to.be.empty;
				expect(res).to.be.empty;
				done();
			});
		});

		it('should verify proper OUT_TRANSFER transaction with proper sender', function (done) {
			validTransaction.type = transactionTypes.OUT_TRANSFER;
			validTransaction.asset = {
				signature: {
					publicKey: validSender.publicKey
				}
			};
			transaction.verify(validTransaction, validSender, {}, function (err, res) {
				expect(err).to.be.empty;
				expect(res).to.be.empty;
				done();
			});
		});

	
		it('should throw an error with no param', function () {
			expect(transaction.verify).to.throw();
		});
	});

	describe('verifySignature', function () {

		it('should throw an error with no param', function () {
			expect(transaction.verifySignature).to.throw();
		});
		
		it('should throw if trs is changed', function () {
			var trs = _.clone(validTransaction);
			// change trs value
			trs.amount = 100;
			expect(function () {
				transaction.verifySignature(trs, validSender.publicKey, trs.signature);
			}).to.throw();
		});

		it('should return false if signature not provided', function () {
			var trs = _.clone(validTransaction);
			expect(transaction.verifySignature(trs, validSender.publicKey, null)).to.equal(false);
		});

		it('should return valid signature for correct trs', function () {
			var trs = _.clone(validTransaction);
			expect(transaction.verifySignature(trs, validSender.publicKey, trs.signature)).to.equal(true);
		});
	});

	describe('verifySecondSignature', function () {

		it('should throw an error with no param', function () {
			expect(transaction.verifySecondSignature).to.throw();
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
		var validBlock = {
			id: '9314232245035524467'
		};

		it('should throw an error with no param', function () {
			var trsData = getValidTransactionData();
			var trs = transaction.create(trsData);
			transaction.apply(trs, validBlock, node.gAccount, function (err) {
				expect(err).to.not.exist;
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
			var trs = transaction.create(getValidTransactionData());
			delete trs.type;
			expect(transaction.create.bind(transaction, trs)).to.throw();
		});

		it.skip('should create comma separated trs signatures', function (done) {
			done();
		});

		it('should return response for valid parameters with data field', function () {
			var trs = transaction.create(getValidTransactionData());
			var trsToSave = transaction.dbSave(trs);
			expect(trsToSave).to.be.an('Array');
			expect(trsToSave).to.have.length(1);
			var trsValues = trsToSave[0].values;
			expect(trsValues).to.have.property('data');
		});

		it('should return response for valid parameters', function () {
			var trs = transaction.create(getValidTransactionData());
			var trsToSave = transaction.dbSave(trs);
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
			expect(trsToSave).to.be.an('Array');
			expect(trsToSave).to.have.length(1);
			expect(trsToSave[0]).to.have.keys(keys);
			expect(trsToSave[0].values).to.have.keys(valuesKeys);
		});
	});

	describe('afterSave', function () {

		it('should throw an error with no param', function () {
			expect(transaction.afterSave).to.throw();
		});

		it('should invoke the passed callback', function (done) {
			var trs = transaction.create(getValidTransactionData());
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
			var trs = transaction.create(getValidTransactionData());
			trs.amount = null;
			expect(_.keys(transaction.objectNormalize(trs))).to.not.include('amount');
		});

		it('should not remove any keys with valid entries', function () {
			var trs = transaction.create(getValidTransactionData());
			expect(_.keys(transaction.objectNormalize(trs))).to.have.length(10);
		});

		it('should not remove data field after normalization', function () {
			var trs = transaction.create(getValidTransactionData());
			expect(_.keys(transaction.objectNormalize(trs))).to.include('data');
		});

		it('should throw error for invalid schema types', function () {
			var trs = transaction.create(getValidTransactionData());
			trs.amount = 'Invalid value';
			trs.data = 124;
			expect(transaction.objectNormalize.bind(transaction, trs)).to.throw();
		});
	});

	describe('dbRead', function () {

		it('should throw an error with no param', function () {
			expect(transaction.dbRead).to.throw();
		});

		it('should return transaction object with data field', function () {
			var rawTrs = _.clone(rawTransaction);
			var trs = transaction.dbRead(rawTrs);
			expect(trs).to.be.an('object');
			expect(trs).to.have.keys('data');
		});

		it('should return null if id field is not present', function () {
			var rawTrs = _.clone(rawTransaction);
			delete rawTrs.id;
			var trs = transaction.dbRead(rawTrs);
			expect(trs).to.be.a('null');
		});

		it('should return transaction object with correct fields', function () {
			var rawTrs = _.clone(rawTransaction);
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
