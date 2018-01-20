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
'use strict';

var lisk = require('lisk-js');
var apiHelpers = require('../../../common/helpers/api');
var randomUtil = require('../../../common/utils/random');
var swaggerEndpoint = require('../../../common/swaggerSpec');
var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;
var sendTransactionPromise = apiHelpers.sendTransactionPromise;
var accountFixtures = require('../../../fixtures/accounts');
var Promise = require('bluebird');
var normalizer = require('../../../common/utils/normalizer');
var waitFor = require('../../../common/utils/waitFor');

describe('GET /api/node', function () {

	describe('/transactions', function () {

		describe('/unprocessed @unstable', function () {

			var UnsignedEndpoint = new swaggerEndpoint('GET /node/transactions/{state}').addParameters({state: 'unsigned'});
			var signatureEndpoint = new swaggerEndpoint('POST /signatures');

			var senderAccount = randomUtil.account();
			var recipientAccount = randomUtil.account();

			var transactionList = [];
			var numOfTransactions = 5;
			var transaction = null;

			before(function () {
				// Credit account with some funds
				transaction = lisk.transaction.createTransaction(senderAccount.address, 1000 * normalizer, accountFixtures.genesis.password);

				return sendTransactionPromise(transaction).then(function (res) {
					res.body.data.message.should.be.equal('Transaction(s) accepted');

					return waitFor.confirmations([transaction.id]);
				}).then(function () {
					// Create Second Signature for sender account
					transaction = lisk.signature.createSignature(senderAccount.password, senderAccount.secondPassword);

					return sendTransactionPromise(transaction);
				}).then(function (res) {
					res.body.data.message.should.be.equal('Transaction(s) accepted');

					return waitFor.confirmations([transaction.id]);
				}).then(function () {
					// Convert account to multisig account
					transaction = lisk.multisignature.createMultisignature(senderAccount.password, senderAccount.secondPassword, ['+' + accountFixtures.existingDelegate.publicKey], 1, 1);

					return sendTransactionPromise(transaction);
				}).then(function (res) {
					res.body.data.message.should.be.equal('Transaction(s) accepted');

					var signature = apiHelpers.createSignatureObject(transaction, accountFixtures.existingDelegate);

					return signatureEndpoint.makeRequest({signatures: [signature]}, 200);
				}).then(function (res) {
					res.body.data.message.should.be.equal('Signature Accepted');

					return waitFor.confirmations([transaction.id]);
				}).then(function () {
					// Create numOfTransactions transactions
					for (var i = 0; i < numOfTransactions; i++) {
						transactionList.push(lisk.transaction.createTransaction(recipientAccount.address, Math.random() * 5 * normalizer, senderAccount.password, senderAccount.secondPassword));
					}

					return Promise.map(transactionList, function (transaction) {
						return sendTransactionPromise(transaction);
					});
				}).then(function (responses) {
					responses.map(function (res) {
						res.body.data.message.should.be.equal('Transaction(s) accepted');
					});
				});
			});

			describe('with wrong input', function () {

				it('using invalid field name should fail', function () {
					return UnsignedEndpoint.makeRequest({
						whatever: accountFixtures.genesis.address
					}, 400).then(function (res) {
						expectSwaggerParamError(res, 'whatever');
					});
				});

				it('using empty parameter should fail', function () {
					return UnsignedEndpoint.makeRequest({
						recipientPublicKey: ''
					}, 400).then(function (res) {
						expectSwaggerParamError(res, 'recipientPublicKey');
					});
				});

				it('using completely invalid fields should fail', function () {
					return UnsignedEndpoint.makeRequest({
						senderId: 'invalid',
						recipientId: 'invalid',
						limit: 'invalid',
						offset: 'invalid',
						sort: 'invalid'
					}, 400).then(function (res) {
						expectSwaggerParamError(res, 'senderId');
						expectSwaggerParamError(res, 'recipientId');
						expectSwaggerParamError(res, 'limit');
						expectSwaggerParamError(res, 'offset');
						expectSwaggerParamError(res, 'sort');
					});
				});

				it('using partially invalid fields should fail', function () {
					return UnsignedEndpoint.makeRequest({
						senderId: 'invalid',
						recipientId: senderAccount.address,
						limit: 'invalid',
						offset: 'invalid',
						sort: 'invalid'
					}, 400).then(function (res) {
						expectSwaggerParamError(res, 'senderId');
						expectSwaggerParamError(res, 'limit');
						expectSwaggerParamError(res, 'offset');
						expectSwaggerParamError(res, 'sort');
					});
				});
			});

			it('using no params should be ok', function () {
				return UnsignedEndpoint.makeRequest({}, 200).then(function (res) {
					res.body.meta.count.should.be.at.least(numOfTransactions);
				});
			});

			describe('id', function () {

				it('using invalid id should fail', function () {
					return UnsignedEndpoint.makeRequest({id: '79fjdfd'}, 400).then(function (res) {
						expectSwaggerParamError(res, 'id');
					});
				});

				it('using valid id should be ok', function () {
					var transactionInCheck = transactionList[0];

					return UnsignedEndpoint.makeRequest({id: transactionInCheck.id}, 200).then(function (res) {
						res.body.data.should.not.empty;
						res.body.data.should.has.length(1);
						res.body.data[0].id.should.be.equal(transactionInCheck.id);
					});
				});

				it('using valid but unknown id should be ok', function () {
					return UnsignedEndpoint.makeRequest({id: '1111111111111111'}, 200).then(function (res) {
						res.body.data.should.be.empty;
					});
				});
			});

			describe('type', function () {

				it('using invalid type should fail', function () {
					return UnsignedEndpoint.makeRequest({type: 8}, 400).then(function (res) {
						expectSwaggerParamError(res, 'type');
					});
				});

				it('using valid type should be ok', function () {
					var transactionInCheck = transactionList[0];

					return UnsignedEndpoint.makeRequest({type: transactionInCheck.type}, 200).then(function (res) {
						res.body.data.should.not.empty;
						res.body.data.length.should.be.at.least(numOfTransactions);
						res.body.data.map(function (transaction) {
							transaction.type.should.be.equal(transactionInCheck.type);
						});
					});
				});
			});

			describe('senderId', function () {

				it('using invalid senderId should fail', function () {
					return UnsignedEndpoint.makeRequest({ senderId: '79fjdfd'}, 400).then(function (res) {
						expectSwaggerParamError(res, 'senderId');
					});
				});

				it('using valid senderId should be ok', function () {

					return UnsignedEndpoint.makeRequest({ senderId: senderAccount.address}, 200).then(function (res) {
						res.body.data.should.not.empty;
						res.body.data.length.should.be.at.least(numOfTransactions);
						res.body.data.map(function (transaction) {
							transaction.senderId.should.be.equal(senderAccount.address);
						});
					});
				});

				it('using valid but unknown senderId should be ok', function () {
					return UnsignedEndpoint.makeRequest({ senderId: '1631373961111634666L'}, 200).then(function (res) {
						res.body.data.should.be.empty;
					});
				});
			});

			describe('senderPublicKey', function () {

				it('using invalid senderPublicKey should fail', function () {
					return UnsignedEndpoint.makeRequest({senderPublicKey: '79fjdfd'}, 400).then(function (res) {
						expectSwaggerParamError(res, 'senderPublicKey');
					});
				});

				it('using valid senderPublicKey should be ok', function () {
					return UnsignedEndpoint.makeRequest({senderPublicKey: senderAccount.publicKey}, 200).then(function (res) {
						res.body.data.should.not.empty;
						res.body.data.length.should.be.at.least(numOfTransactions);
						res.body.data.map(function (transaction) {
							transaction.senderPublicKey.should.be.equal(senderAccount.publicKey);
						});
					});
				});

				it('using valid but unknown senderPublicKey should be ok', function () {
					return UnsignedEndpoint.makeRequest({senderPublicKey: 'c094ebee7ec0c50ebeeaaaa8655e089f6e1a604b83bcaa760293c61e0f18ab6f'}, 200).then(function (res) {
						res.body.data.should.be.empty;
					});
				});
			});

			describe('recipientId', function () {

				it('using invalid recipientId should fail', function () {
					return UnsignedEndpoint.makeRequest({recipientId: '79fjdfd'}, 400).then(function (res) {
						expectSwaggerParamError(res, 'recipientId');
					});
				});

				it('using valid recipientId should be ok', function () {
					return UnsignedEndpoint.makeRequest({recipientId: recipientAccount.address}, 200).then(function (res) {
						res.body.data.should.not.empty;
						res.body.data.length.should.be.at.least(numOfTransactions);
						res.body.data.map(function (transaction) {
							transaction.recipientId.should.be.equal(recipientAccount.address);
						});
					});
				});

				it('using valid but unknown recipientId should be ok', function () {
					return UnsignedEndpoint.makeRequest({recipientId: '1631373961111634666L'}, 200).then(function (res) {
						res.body.data.should.be.empty;
					});
				});
			});

			describe('recipientPublicKey', function () {

				it('using invalid recipientPublicKey should fail', function () {
					return UnsignedEndpoint.makeRequest({recipientPublicKey: '79fjdfd'}, 400).then(function (res) {
						expectSwaggerParamError(res, 'recipientPublicKey');
					});
				});

				it('using valid recipientPublicKey should be ok', function () {
					return UnsignedEndpoint.makeRequest({recipientPublicKey: recipientAccount.publicKey}, 200).then(function (res) {
						res.body.data.should.not.empty;
						res.body.data.length.should.be.at.least(numOfTransactions);
						res.body.data.map(function (transaction) {
							// TODO: Unprocessed transactions don't have recipientPublicKey attribute, so matched address
							transaction.recipientId.should.be.equal(recipientAccount.address);
						});
					});
				});

				it('using valid but unknown recipientPublicKey should be ok', function () {
					return UnsignedEndpoint.makeRequest({recipientPublicKey: 'c094ebee7ec0c50ebeeaaaa8655e089f6e1a604b83bcaa760293c61e0f18ab6f'}, 200).then(function (res) {
						res.body.data.should.be.empty;
					});
				});
			});

			describe('limit', function () {

				it('using limit < 0 should fail', function () {
					return UnsignedEndpoint.makeRequest({limit: -1}, 400).then(function (res) {
						expectSwaggerParamError(res, 'limit');
					});
				});

				it('using limit > 100 should fail', function () {
					return UnsignedEndpoint.makeRequest({limit: 101}, 400).then(function (res) {
						expectSwaggerParamError(res, 'limit');
					});
				});

				it('using limit = 2 should return 2 transactions', function () {
					return UnsignedEndpoint.makeRequest({limit: 2}, 200).then(function (res) {
						res.body.data.should.not.be.empty;
						res.body.data.length.should.be.at.most(2);
					});
				});
			});

			describe('offset', function () {

				it('using offset="one" should fail', function () {
					return UnsignedEndpoint.makeRequest({offset: 'one'}, 400).then(function (res) {
						expectSwaggerParamError(res, 'offset');
					});
				});

				it('using offset=1 should be ok', function () {
					var firstTransaction = null;

					return UnsignedEndpoint.makeRequest({offset: 0, limit: 2}, 200).then(function (res) {
						firstTransaction = res.body.data[0];

						return UnsignedEndpoint.makeRequest({offset: 1, limit: 2}, 200);
					}).then(function (res) {
						res.body.data.forEach(function (transaction) {
							transaction.id.should.not.equal(firstTransaction.id);
						});
					});
				});
			});

			describe('sort', function () {

				describe('amount', function () {

					it('sorted by amount:asc should be ok', function () {
						return UnsignedEndpoint.makeRequest({sort: 'amount:asc'}, 200).then(function (res) {
							res.body.data.should.not.be.empty;

							var values = _.map(res.body.data, 'amount').map(function (value) { return parseInt(value); });

							_(_.clone(values)).sortNumbers('asc').should.be.eql(values);
						});
					});

					it('sorted by amount:desc should be ok', function () {
						return UnsignedEndpoint.makeRequest({sort: 'amount:desc'}, 200).then(function (res) {
							res.body.data.should.not.be.empty;

							var values = _.map(res.body.data, 'amount').map(function (value) { return parseInt(value); });

							_(_.clone(values)).sortNumbers('desc').should.be.eql(values);
						});
					});
				});

				describe('fee', function () {

					it('sorted by fee:asc should be ok', function () {
						return UnsignedEndpoint.makeRequest({sort: 'fee:asc'}, 200).then(function (res) {
							res.body.data.should.not.be.empty;

							var values = _.map(res.body.data, 'fee').map(function (value) { return parseInt(value); });

							_(_.clone(values)).sortNumbers('asc').should.be.eql(values);
						});
					});

					it('sorted by fee:desc should be ok', function () {
						return UnsignedEndpoint.makeRequest({sort: 'fee:desc'}, 200).then(function (res) {
							res.body.data.should.not.be.empty;

							var values = _.map(res.body.data, 'fee').map(function (value) { return parseInt(value); });

							_(_.clone(values)).sortNumbers('desc').should.be.eql(values);
						});
					});
				});

				describe('type', function () {

					it('sorted by fee:asc should be ok', function () {
						return UnsignedEndpoint.makeRequest({sort: 'type:asc'}, 200).then(function (res) {
							res.body.data.should.not.be.empty;

							_(res.body.data).map('type').sortNumbers('asc').should.be.eql(_.map(res.body.data, 'type'));
						});
					});

					it('sorted by fee:desc should be ok', function () {
						return UnsignedEndpoint.makeRequest({sort: 'type:desc'}, 200).then(function (res) {
							res.body.data.should.not.be.empty;

							_(res.body.data).map('type').sortNumbers('desc').should.be.eql(_.map(res.body.data, 'type'));
						});
					});
				});

				describe('timestamp', function () {

					it('sorted by timestamp:asc should be ok', function () {
						return UnsignedEndpoint.makeRequest({sort: 'timestamp:asc'}, 200).then(function (res) {
							res.body.data.should.not.be.empty;

							_(res.body.data).map('timestamp').sortNumbers('asc').should.be.eql(_.map(res.body.data, 'timestamp'));
						});
					});

					it('sorted by timestamp:desc should be ok', function () {
						return UnsignedEndpoint.makeRequest({sort: 'timestamp:desc'}, 200).then(function (res) {
							res.body.data.should.not.be.empty;

							_(res.body.data).map('timestamp').sortNumbers('desc').should.be.eql(_.map(res.body.data, 'timestamp'));
						});
					});
				});

				it('using any other sort field should fail', function () {
					return UnsignedEndpoint.makeRequest({sort: 'id:asc'}, 400).then(function (res) {
						expectSwaggerParamError(res, 'sort');
					});
				});
			});
		});
	});
});
