'use strict';

var lisk = require('lisk-js');
var expect = require('chai').expect;

var typesRepresentatives = require('../../../fixtures/typesRepresentatives');
var accountFixtures = require('../../../fixtures/accounts');

var apiHelpers = require('../../../common/helpers/api');
var randomUtil = require('../../../common/utils/random');
var errorCodes = require('../../../../helpers/apiCodes');

function invalidAssets (option, badTransactions) {

	var transaction;

	beforeEach(function () {
		switch (option) {
			case 'signature':
				transaction = lisk.signature.createSignature(accountFixtures.genesis.password, randomUtil.password());
				break;
			case 'delegate':
				transaction = lisk.delegate.createDelegate(accountFixtures.genesis.password, randomUtil.delegateName());
				break;
			case 'votes':
				transaction = lisk.vote.createVote(accountFixtures.genesis.password, []);
				break;
			case 'multisignature':
				transaction = lisk.multisignature.createMultisignature(accountFixtures.genesis.password, null, ['+' + accountFixtures.existingDelegate.publicKey], 1, 2);
				break;
			case 'dapp':
				transaction = lisk.dapp.createDapp(accountFixtures.genesis.password, null, randomUtil.guestbookDapp);
				break;
			case 'inTransfer':
				transaction = lisk.transfer.createInTransfer(randomUtil.guestbookDapp.id, Date.now(), accountFixtures.genesis.password);
				break;
			case 'outTransfer':
				transaction = lisk.transfer.createOutTransfer(randomUtil.guestbookDapp.id, randomUtil.transaction().id, accountFixtures.genesis.address, Date.now(), accountFixtures.genesis.password);
				break;
		};
	});

	describe('using invalid asset values', function () {

		typesRepresentatives.allTypes.forEach(function (test) {
			it('using ' + test.description + ' should fail', function () {
				transaction.asset = test.input;

				var expectedResponse = (test.expectation === 'object' && test.description !== 'date' ? errorCodes.PROCESSING_ERROR : errorCodes.BAD_REQUEST);

				return apiHelpers.sendTransactionPromise(transaction, expectedResponse).then(function (res) {
					res.body.message.should.not.be.empty;
					badTransactions.push(transaction);
				});
			});
		});

		it('deleting object should fail', function () {
			delete transaction.asset;

			return apiHelpers.sendTransactionPromise(transaction, errorCodes.BAD_REQUEST).then(function (res) {
				res.body.message.should.not.be.empty;
				badTransactions.push(transaction);
			});
		});
	});

	describe('using invalid asset.' + option + ' values', function () {

		typesRepresentatives.allTypes.forEach(function (test) {
			it('using ' + test.description + ' should fail', function () {
				transaction.asset[option] = test.input;

				return apiHelpers.sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
					res.body.message.should.not.be.empty;
					badTransactions.push(transaction);
				});
			});
		});

		it('deleting object should fail', function () {
			delete transaction.asset[option];

			return apiHelpers.sendTransactionPromise(transaction, errorCodes.PROCESSING_ERROR).then(function (res) {
				res.body.message.should.not.be.empty;
				badTransactions.push(transaction);
			});
		});
	});
}

module.exports = {
	invalidAssets: invalidAssets
};
