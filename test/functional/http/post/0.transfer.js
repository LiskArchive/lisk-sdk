'use strict';

var test = require('../../functional.js');

var lisk = require('lisk-js');
var expect = require('chai').expect;

var phases = require('../../common/phases');
var accountFixtures = require('../../../fixtures/accounts');
var typesRepresentatives = require('../../../fixtures/typesRepresentatives');

var constants = require('../../../../helpers/constants');

var sendTransactionPromise = require('../../../common/helpers/api').sendTransactionPromise;
var randomUtil = require('../../../common/utils/random');
var normalizer = require('../../../common/utils/normalizer');
var errorCodes = require('../../../../helpers/apiCodes');

describe('POST /api/transactions (type 0) transfer funds', function () {
	
	var transaction;
	var goodTransaction = randomUtil.transaction();
	var badTransactions = [];
	var goodTransactions = [];
	// Low-frills deep copy
	var cloneGoodTransaction = JSON.parse(JSON.stringify(goodTransaction));
	
	var account = randomUtil.account();
	var accountOffset = randomUtil.account();

	describe('schema validations', function () {
		
		typesRepresentatives.allTypes.forEach(function (test) {
			it('using ' + test.description + ' should fail', function () {
				return sendTransactionPromise(test.input, 400).then(function (res) {
					expect(res).to.have.nested.property('body.message').that.is.not.empty;
				});
			});
		});
	});

	describe('transaction processing', function () {

		it('mutating data used to build the transaction id should fail', function () {
			transaction = randomUtil.transaction();
			transaction.timestamp += 1;

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Invalid transaction id');
				badTransactions.push(transaction);
			});
		});

		it('using zero amount should fail', function () {
			transaction = lisk.transaction.createTransaction(account.address, 0, accountFixtures.genesis.password);

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Invalid transaction amount');
				badTransactions.push(transaction);
			});
		});

		it('when sender has no funds should fail', function () {
			transaction = lisk.transaction.createTransaction('1L', 1, account.password);

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Account does not have enough LSK: ' + account.address + ' balance: 0');
				badTransactions.push(transaction);
			});
		});

		it('using entire balance should fail', function () {
			transaction = lisk.transaction.createTransaction(account.address, Math.floor(accountFixtures.genesis.balance) , accountFixtures.genesis.password);

			return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.match(/^Account does not have enough LSK: [0-9]+L balance: /);
				badTransactions.push(transaction);
			});
		});

		it('from the genesis account should fail', function () {
			var signedTransactionFromGenesis = {
				type: 0,
				amount: 1000,
				senderPublicKey: 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
				requesterPublicKey: null,
				timestamp: 24259352,
				asset: {},
				recipientAddress: accountFixtures.existingDelegate.address,
				signature: 'f56a09b2f448f6371ffbe54fd9ac87b1be29fe29f27f001479e044a65e7e42fb1fa48dce6227282ad2a11145691421c4eea5d33ac7f83c6a42e1dcaa44572101',
				id: '15307587316657110485',
				fee: 0.1 * normalizer
			};

			return sendTransactionPromise(signedTransactionFromGenesis, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Invalid sender. Can not send from genesis account');
				badTransactions.push(signedTransactionFromGenesis);
			});
		});

		it('when sender has funds should be ok', function () {
			return sendTransactionPromise(goodTransaction).then(function (res) {
				res.body.data.message.should.be.equal('Transaction(s) accepted');
				goodTransactions.push(goodTransaction);
			});
		});

		it('sending transaction with same id twice should fail', function () {
			return sendTransactionPromise(goodTransaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Transaction is already processed: ' + goodTransaction.id);
			});
		});

		it('sending transaction with same id twice but newer timestamp should fail', function () {
			cloneGoodTransaction.timestamp += 1;

			return sendTransactionPromise(cloneGoodTransaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Transaction is already processed: ' + cloneGoodTransaction.id);
			});
		});

		it('sending transaction with same id twice but older timestamp should fail', function () {
			cloneGoodTransaction.timestamp -= 1;

			return sendTransactionPromise(cloneGoodTransaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Transaction is already processed: ' + cloneGoodTransaction.id);
			});
		});

		describe('with offset', function () {
			
			it('using -1 should be ok', function () {
				transaction = lisk.transaction.createTransaction(accountOffset.address, 1, accountFixtures.genesis.password, null, null, -1);

				return sendTransactionPromise(transaction).then(function (res) {
					res.body.data.message.should.be.equal('Transaction(s) accepted');
					// TODO: Enable when transaction pool order is fixed
					// goodTransactions.push(transaction);
				});
			});
			
			it('using future timestamp should fail', function () {
				transaction = lisk.transaction.createTransaction(accountOffset.address, 1, accountFixtures.genesis.password, null, null, 1000);

				return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.be.equal('Invalid transaction timestamp. Timestamp is in the future');
					// TODO: Enable when transaction pool order is fixed
					// badTransactions.push(transaction);
				});
			});
		});

		describe('with additional data field', function () {

			describe('invalid cases', function () {

				var invalidCases = typesRepresentatives.additionalDataInvalidCases
					.concat(typesRepresentatives.nonStrings);

				invalidCases.forEach(function (test) {
					it('using ' + test.description + ' should fail', function () {
						var accountAdditionalData = randomUtil.account();
						transaction = lisk.transaction.createTransaction(accountAdditionalData.address, 1, accountFixtures.genesis.password);
						transaction.asset.data = test.input;

						return sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
							res.body.message.should.not.be.empty;
							badTransactions.push(transaction);
						});
					});
				});
			});

			describe('valid cases', function () {

				var validCases = typesRepresentatives.additionalDataValidCases
					.concat(typesRepresentatives.strings);
					
				validCases.forEach(function (test) {
					it('using ' + test.description + ' should be ok', function () {
						var accountAdditionalData = randomUtil.account();
						transaction = lisk.transaction.createTransaction(accountAdditionalData.address, 1, accountFixtures.genesis.password, null, test.input);
						
						return sendTransactionPromise(transaction).then(function (res) {
							res.body.data.message.should.be.equal('Transaction(s) accepted');
							goodTransactions.push(transaction);
						});
					});
				});
			});
		});
	});

	describe('confirmation', function () {

		phases.confirmation(goodTransactions, badTransactions);
	});

	describe('validation', function () {

		it('sending already confirmed transaction should fail', function () {
			return sendTransactionPromise(goodTransaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.be.equal('Transaction is already confirmed: ' + goodTransaction.id);
			});
		});
	});
});
