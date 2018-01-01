'use strict';

var test = require('../../functional.js');
var lisk = require('lisk-js');
var apiHelpers = require('../../../common/helpers/api');
var randomUtil = require('../../../common/utils/random');
var swaggerEndpoint = require('../../../common/swaggerSpec');
var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;
var sendTransactionPromise = apiHelpers.sendTransactionPromise;
var sendTransactionsPromise = apiHelpers.sendTransactionsPromise;
var accountFixtures = require('../../../fixtures/accounts');
var Promise = require('bluebird');
var _ = test._;

describe('GET /api/node', function () {

	describe('/transactions', function () {

		describe('/unprocessed @unstable', function () {

			var UnProcessedEndpoint = new swaggerEndpoint('GET /node/transactions/{state}').addParameters({state: 'unprocessed'});

			var account = randomUtil.account();
			var transactionList = [];
			var numOfTransactions = 5;

			before(function () {
				var amountToSend = 1233;
				var data = 'extra information';

				// Create numOfTransactions transactions
				for (var i = 0; i < numOfTransactions; i++) {
					transactionList.push(lisk.transaction.createTransaction(account.address, Math.random() * 1000, accountFixtures.genesis.password, null, data));
				}

				// TODO: Fix transaction posting logic, so multiple transactions posted by API should not bundled
				return Promise.map(transactionList, function (transaction) {
					return sendTransactionPromise(transaction);
				}).then(function (responses) {
					responses.map(function (res) {
						res.body.data.message.should.be.equal('Transaction(s) accepted');
					});
				});
			});

			describe('with wrong input', function () {

				it('using invalid field name should fail', function () {
					return UnProcessedEndpoint.makeRequest({
						whatever: accountFixtures.genesis.address
					}, 400).then(function (res) {
						expectSwaggerParamError(res, 'whatever');
					});
				});

				it('using empty parameter should fail', function () {
					return UnProcessedEndpoint.makeRequest({
						recipientPublicKey: ''
					}, 400).then(function (res) {
						expectSwaggerParamError(res, 'recipientPublicKey');
					});
				});

				it('using completely invalid fields should fail', function () {
					return UnProcessedEndpoint.makeRequest({
						senderAddress: 'invalid',
						recipientAddress: 'invalid',
						limit: 'invalid',
						offset: 'invalid',
						sort: 'invalid'
					}, 400).then(function (res) {
						expectSwaggerParamError(res, 'senderAddress');
						expectSwaggerParamError(res, 'recipientAddress');
						expectSwaggerParamError(res, 'limit');
						expectSwaggerParamError(res, 'offset');
						expectSwaggerParamError(res, 'sort');
					});
				});

				it('using partially invalid fields should fail', function () {
					return UnProcessedEndpoint.makeRequest({
						senderAddress: 'invalid',
						recipientAddress: account.address,
						limit: 'invalid',
						offset: 'invalid',
						sort: 'invalid'
					}, 400).then(function (res) {
						expectSwaggerParamError(res, 'senderAddress');
						expectSwaggerParamError(res, 'limit');
						expectSwaggerParamError(res, 'offset');
						expectSwaggerParamError(res, 'sort');
					});
				});
			});

			it('using no params should be ok', function () {
				return UnProcessedEndpoint.makeRequest({}, 200).then(function (res) {
					res.body.meta.count.should.be.at.least(numOfTransactions);
				});
			});

			describe('id', function () {

				it('using invalid id should fail', function () {
					return UnProcessedEndpoint.makeRequest({id: '79fjdfd'}, 400).then(function (res) {
						expectSwaggerParamError(res, 'id');
					});
				});

				it('using valid id should be ok', function () {
					var transactionInCheck = transactionList[0];

					return UnProcessedEndpoint.makeRequest({id: transactionInCheck.id}, 200).then(function (res) {
						res.body.data.should.not.empty;
						res.body.data.should.has.length(1);
						res.body.data[0].id.should.be.equal(transactionInCheck.id);
					});
				});

				it('using valid but unknown id should be ok', function () {
					return UnProcessedEndpoint.makeRequest({id: '1111111111111111'}, 200).then(function (res) {
						res.body.data.should.be.empty;
					});
				});
			});

			describe('type', function () {

				it('using invalid type should fail', function () {
					return UnProcessedEndpoint.makeRequest({type: 8}, 400).then(function (res) {
						expectSwaggerParamError(res, 'type');
					});
				});

				it('using valid type should be ok', function () {
					var transactionInCheck = transactionList[0];

					return UnProcessedEndpoint.makeRequest({type: transactionInCheck.type}, 200).then(function (res) {
						res.body.data.should.not.empty;
						res.body.data.length.should.be.at.least(numOfTransactions);
						res.body.data.map(function (transaction) {
							transaction.type.should.be.equal(transactionInCheck.type);
						});
					});
				});
			});

			describe('senderAddress', function () {

				it('using invalid senderAddress should fail', function () {
					return UnProcessedEndpoint.makeRequest({senderAddress: '79fjdfd'}, 400).then(function (res) {
						expectSwaggerParamError(res, 'senderAddress');
					});
				});

				it('using valid senderAddress should be ok', function () {
					return UnProcessedEndpoint.makeRequest({senderAddress: accountFixtures.genesis.address}, 200).then(function (res) {
						res.body.data.should.not.empty;
						res.body.data.length.should.be.at.least(numOfTransactions);
						res.body.data.map(function (transaction) {
							transaction.senderAddress.should.be.equal(accountFixtures.genesis.address);
						});
					});
				});

				it('using valid but unknown senderAddress should be ok', function () {
					return UnProcessedEndpoint.makeRequest({senderAddress: '1631373961111634666L'}, 200).then(function (res) {
						res.body.data.should.be.empty;
					});
				});
			});

			describe('senderPublicKey', function () {

				it('using invalid senderPublicKey should fail', function () {
					return UnProcessedEndpoint.makeRequest({senderPublicKey: '79fjdfd'}, 400).then(function (res) {
						expectSwaggerParamError(res, 'senderPublicKey');
					});
				});

				it('using valid senderPublicKey should be ok', function () {
					return UnProcessedEndpoint.makeRequest({senderPublicKey: accountFixtures.genesis.publicKey}, 200).then(function (res) {
						res.body.data.should.not.empty;
						res.body.data.length.should.be.at.least(numOfTransactions);
						res.body.data.map(function (transaction) {
							transaction.senderPublicKey.should.be.equal(accountFixtures.genesis.publicKey);
						});
					});
				});

				it('using valid but unknown senderPublicKey should be ok', function () {
					return UnProcessedEndpoint.makeRequest({senderPublicKey: 'c094ebee7ec0c50ebeeaaaa8655e089f6e1a604b83bcaa760293c61e0f18ab6f'}, 200).then(function (res) {
						res.body.data.should.be.empty;
					});
				});
			});

			describe('recipientAddress', function () {

				it('using invalid recipientAddress should fail', function () {
					return UnProcessedEndpoint.makeRequest({recipientAddress: '79fjdfd'}, 400).then(function (res) {
						expectSwaggerParamError(res, 'recipientAddress');
					});
				});

				it('using valid recipientAddress should be ok', function () {

					return UnProcessedEndpoint.makeRequest({recipientAddress: account.address}, 200).then(function (res) {
						res.body.data.should.not.empty;
						res.body.data.length.should.be.at.least(numOfTransactions);
						res.body.data.map(function (transaction) {
							transaction.recipientAddress.should.be.equal(account.address);
						});
					});
				});

				it('using valid but unknown recipientAddress should be ok', function () {
					return UnProcessedEndpoint.makeRequest({recipientAddress: '1631373961111634666L'}, 200).then(function (res) {
						res.body.data.should.be.empty;
					});
				});
			});

			describe('recipientPublicKey', function () {

				it('using invalid recipientPublicKey should fail', function () {
					return UnProcessedEndpoint.makeRequest({recipientPublicKey: '79fjdfd'}, 400).then(function (res) {
						expectSwaggerParamError(res, 'recipientPublicKey');
					});
				});

				it('using valid recipientPublicKey should be ok', function () {
					return UnProcessedEndpoint.makeRequest({recipientPublicKey: account.publicKey}, 200).then(function (res) {
						res.body.data.should.not.empty;
						res.body.data.length.should.be.at.least(numOfTransactions);
						res.body.data.map(function (transaction) {
							// TODO: Unprocessed transactions don't have recipientPublicKey attribute, so matched address
							transaction.recipientAddress.should.be.equal(account.address);
						});
					});
				});

				it('using valid but unknown recipientPublicKey should be ok', function () {
					return UnProcessedEndpoint.makeRequest({recipientPublicKey: 'c094ebee7ec0c50ebeeaaaa8655e089f6e1a604b83bcaa760293c61e0f18ab6f'}, 200).then(function (res) {
						res.body.data.should.be.empty;
					});
				});
			});

			describe('limit', function () {

				it('using limit < 0 should fail', function () {
					return UnProcessedEndpoint.makeRequest({limit: -1}, 400).then(function (res) {
						expectSwaggerParamError(res, 'limit');
					});
				});

				it('using limit > 100 should fail', function () {
					return UnProcessedEndpoint.makeRequest({limit: 101}, 400).then(function (res) {
						expectSwaggerParamError(res, 'limit');
					});
				});

				it('using limit = 2 should return 2 transactions', function () {
					return UnProcessedEndpoint.makeRequest({limit: 2}, 200).then(function (res) {
						res.body.data.should.not.be.empty;
						res.body.data.length.should.be.at.most(2);
					});
				});
			});

			describe('offset', function () {

				it('using offset="one" should fail', function () {
					return UnProcessedEndpoint.makeRequest({offset: 'one'}, 400).then(function (res) {
						expectSwaggerParamError(res, 'offset');
					});
				});

				it('using offset=1 should be ok', function () {
					var firstTransaction = null;

					return UnProcessedEndpoint.makeRequest({offset: 0, limit: 2}, 200).then(function (res) {
						firstTransaction = res.body.data[0];

						return UnProcessedEndpoint.makeRequest({offset: 1, limit: 2}, 200);
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
						return UnProcessedEndpoint.makeRequest({sort: 'amount:asc'}, 200).then(function (res) {
							res.body.data.should.not.be.empty;

							var values = _.map(res.body.data, 'amount').map(function (value) { return parseInt(value); });

							_(_.clone(values)).sortNumbers('asc').should.be.eql(values);
						});
					});

					it('sorted by amount:desc should be ok', function () {
						return UnProcessedEndpoint.makeRequest({sort: 'amount:desc'}, 200).then(function (res) {
							res.body.data.should.not.be.empty;

							var values = _.map(res.body.data, 'amount').map(function (value) { return parseInt(value); });

							_(_.clone(values)).sortNumbers('desc').should.be.eql(values);
						});
					});
				});

				describe('fee', function () {

					it('sorted by fee:asc should be ok', function () {
						return UnProcessedEndpoint.makeRequest({sort: 'fee:asc'}, 200).then(function (res) {
							res.body.data.should.not.be.empty;

							var values = _.map(res.body.data, 'fee').map(function (value) { return parseInt(value); });

							_(_.clone(values)).sortNumbers('asc').should.be.eql(values);
						});
					});

					it('sorted by fee:desc should be ok', function () {
						return UnProcessedEndpoint.makeRequest({sort: 'fee:desc'}, 200).then(function (res) {
							res.body.data.should.not.be.empty;

							var values = _.map(res.body.data, 'fee').map(function (value) { return parseInt(value); });

							_(_.clone(values)).sortNumbers('desc').should.be.eql(values);
						});
					});
				});

				describe('type', function () {

					it('sorted by fee:asc should be ok', function () {
						return UnProcessedEndpoint.makeRequest({sort: 'type:asc'}, 200).then(function (res) {
							res.body.data.should.not.be.empty;

							_(res.body.data).map('type').sortNumbers('asc').should.be.eql(_.map(res.body.data, 'type'));
						});
					});

					it('sorted by fee:desc should be ok', function () {
						return UnProcessedEndpoint.makeRequest({sort: 'type:desc'}, 200).then(function (res) {
							res.body.data.should.not.be.empty;

							_(res.body.data).map('type').sortNumbers('desc').should.be.eql(_.map(res.body.data, 'type'));
						});
					});
				});

				describe('timestamp', function () {

					it('sorted by timestamp:asc should be ok', function () {
						return UnProcessedEndpoint.makeRequest({sort: 'timestamp:asc'}, 200).then(function (res) {
							res.body.data.should.not.be.empty;

							_(res.body.data).map('timestamp').sortNumbers('asc').should.be.eql(_.map(res.body.data, 'timestamp'));
						});
					});

					it('sorted by timestamp:desc should be ok', function () {
						return UnProcessedEndpoint.makeRequest({sort: 'timestamp:desc'}, 200).then(function (res) {
							res.body.data.should.not.be.empty;

							_(res.body.data).map('timestamp').sortNumbers('desc').should.be.eql(_.map(res.body.data, 'timestamp'));
						});
					});
				});

				it('using any other sort field should fail', function () {
					return UnProcessedEndpoint.makeRequest({sort: 'id:asc'}, 400).then(function (res) {
						expectSwaggerParamError(res, 'sort');
					});
				});
			});
		});
	});
});
