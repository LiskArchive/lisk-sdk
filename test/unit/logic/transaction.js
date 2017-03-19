'use strict';/*eslint*/

var node = require('./../../node.js');
var ed = require('../../../helpers/ed');
var crypto = require('crypto');

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
	'type': 0,
	'amount': 232420792390,
	'senderPublicKey': 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	'requesterPublicKey': null,
	'timestamp': 24177404,
	'asset': {},
	'recipientId': '11483172656590824880L',
	'signature': 'faf3081850b92de3fcd46346b883ca0a0096ae5366a5dafce9ace6ddf7970338501ae51ef138ca63aad571c399144d713e5be34a61e6885c8074740c66e3d90b',
	'id': '4669815655990175999',
	'fee': 10000000,
	'senderId': '16313739661670634666L',
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
	t_signature:  'faf3081850b92de3fcd46346b883ca0a0096ae5366a5dafce9ace6ddf7970338501ae51ef138ca63aad571c399144d713e5be34a61e6885c8074740c66e3d90b',
};

function getValidTransactionData () {
	var hash = crypto.createHash('sha256').update(node.gAccount.password, 'utf8').digest();
	var keypair = ed.makeKeypair(hash);

	var trsData = {
		type: 0,
		amount: 232420792390,
		sender: node.gAccount,
		timestamp: 24177404,
		recipientId: '11483172656590824880L',
		data: '50b92d',
		keypair: keypair
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
		modulesLoader.initLogicWithDb(Transaction, function (err, __transaction) {
			transaction = __transaction;
			attachAllAssets(transaction);
			done();
		}, {
			ed: require('../../../helpers/ed')
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

	});

	describe('attachAssetType', function () {

		it('should attach all transaction types', function () {
			attachAllAssets(transaction);
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
			var trsData = getValidTransactionData();
			var createdTransaction = transaction.create(trsData);
			expect(transaction.sign(trsData.keypair, createdTransaction)).to.be.ok;
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
	});

	describe('getId', function () {

		it('should throw an error with no param', function () {
			expect(transaction.getId).to.throw();
		});
	});

	describe('getHash', function () {

		it('should throw an error with no param', function () {
			expect(transaction.getHash).to.throw();
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

		it('should return same result of getBytes using /logic/transaction and list-js package (without data field)', function () {
			var trsBytesFromLogic = transaction.getBytes(validTransaction);
			var trsBytesFromLiskJs = node.lisk.crypto.getBytes(validTransaction);
			expect(trsBytesFromLogic.equals(trsBytesFromLiskJs)).to.be.ok;
		});

		it('should return same result of getBytes using /logic/transaction and list-js package (with data field)', function () {
			var transactionWithData = transaction.create(getValidTransactionData());
			var trsBytesFromLogic = transaction.getBytes(transactionWithData);
			var trsBytesFromLiskJs = node.lisk.crypto.getBytes(transactionWithData);
			expect(trsBytesFromLogic.equals(trsBytesFromLiskJs)).to.be.ok;
		});
	});

	describe('ready', function () {

		it('should throw an error with no param', function () {
			expect(transaction.ready).to.throw();
		});
	});

	describe('countById', function () {

		it('should throw an error with no param', function () {
			expect(transaction.countById).to.throw();
		});
	});

	describe('checkConfirmed', function () {

		it('should throw an error with no param', function () {
			expect(transaction.checkConfirmed).to.throw();
		});
	});

	describe('checkBalance', function () {

		it('should throw an error with no param', function () {
			expect(transaction.checkBalance).to.throw();
		});
	});

	describe('process', function () {

		var randomRequester = {};

		it.skip('should work for signing transaction', function (done) {
			attachAllAssets(transaction);
			transaction.process(validTransaction, validSender, randomRequester, function (err, res) {
				expect(err).to.be.empty;
				expect(res).to.be.empty;
				done();
			});
		});

		it('should throw an error with no param', function () {
			expect(transaction.process).to.throw();
		});
	});

	describe('verify', function () {

		before(function () {
			attachAllAssets(transaction);
		});

		it('should verify proper SEND transaction with proper sender', function (done) {
			validTransaction.type = transactionTypes.SEND;
			transaction.verify(validTransaction, validSender, {}, function (err, res) {
				expect(err).to.be.empty;
				expect(res).to.be.empty;
				done();
			});
		});

		it('should be impossible to send the money from genesis account', function (done) {
			validTransaction.type = transactionTypes.SEND;

			transaction.verify(validTransaction, validSender, {}, function (err, res) {
				expect(err).to.be.empty;
				expect(res).to.be.empty;
				done();
			});
		});

		it.skip('should verify proper SIGNATURE transaction with proper sender', function (done) {
			validTransaction.type = transactionTypes.SIGNATURE;
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

		it.skip('should verify proper DELEGATE transaction with proper sender', function (done) {
			validTransaction.type = transactionTypes.DELEGATE;
			validTransaction.asset = {
				delegate: {
					username: 'proper-delegate-name'
				},
				signature: {
					publicKey: validTransaction.senderPublicKey
				}
			};
			transaction.verify(validTransaction, validSender, {}, function (err, res) {
				expect(err).to.be.empty;
				expect(res).to.be.empty;
				done();
			});
		});

		it.skip('should verify proper VOTE transaction with proper sender', function (done) {
			validTransaction.type = transactionTypes.SIGNATURE;
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

		it.skip('should verify proper MULTI transaction with proper sender', function (done) {
			validTransaction.type = transactionTypes.MULTI;
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

		it.skip('should verify proper DAPP transaction with proper sender', function (done) {
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

		it.skip('should verify proper IN_TRANSFER transaction with proper sender', function (done) {
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

		it.skip('should verify proper OUT_TRANSFER transaction with proper sender', function (done) {
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
	});

	describe('apply', function () {

		it('should throw an error with no param', function () {
			expect(transaction.apply).to.throw();
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
			expect(trsToSave).to.be.an('Array');
			expect(trsToSave).to.have.length(1);
		});

	});

	describe('afterSave', function () {

		it('should throw an error with no param', function () {
			expect(transaction.afterSave).to.throw();
		});

		it('should call the passed callback', function (done) {
			var trs = transaction.create(getValidTransactionData());
			var callbackSpy = sinon.spy();
			transaction.afterSave(trs, callbackSpy);
			setImmediate(function () {
				expect(callbackSpy.calledOnce).to.be.ok;
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
			var trs = transaction.dbRead(rawTransaction);
			expect(trs).to.be.an('object');
			expect(_.keys(trs)).to.be.contain('data');
		});

		it('should return transaction object', function () {
			expect(transaction.dbRead(rawTransaction)).to.be.an('object');
		});
	});
});
