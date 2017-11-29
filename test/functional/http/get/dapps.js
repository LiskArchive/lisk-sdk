'use strict';

require('../../functional.js');

var node = require('../../../node.js');
var accountFixtures = require('../../../fixtures/accounts');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var waitForConfirmations = require('../../../common/apiHelpers').waitForConfirmations;
var swaggerEndpoint = require('../../../common/swaggerSpec');
var expectSwaggerParamError = require('../../../common/apiHelpers').expectSwaggerParamError;

var randomUtil = require('../../../common/utils/random');

describe('GET /dapps', function () {

	var dappsEndpoint = new swaggerEndpoint('GET /dapps');

	var transactionsToWaitFor = [];

	var account = randomUtil.account();
	var dapp1 = randomUtil.application();
	dapp1.category = 1;
	var dapp2 = randomUtil.application();
	dapp2.category = 2;
	var registeredDappsAmount = 2;

	before(function () {
		var transaction = node.lisk.transaction.createTransaction(account.address, 1000 * node.normalizer, accountFixtures.genesis.password);
		transactionsToWaitFor.push(transaction.id);
		return sendTransactionPromise(transaction)
			.then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				return waitForConfirmations(transactionsToWaitFor);
			}).then(function () {
				transactionsToWaitFor = [];

				var transaction1 = node.lisk.dapp.createDapp(account.password, null, dapp1);
				var transaction2 = node.lisk.dapp.createDapp(account.password, null, dapp2);
				var promises = [];
				promises.push(sendTransactionPromise(transaction1));
				promises.push(sendTransactionPromise(transaction2));

				transactionsToWaitFor.push(transaction1.id, transaction2.id);
				return node.Promise.all(promises);
			}).then(function (results) {
				results.forEach(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
				});
				return waitForConfirmations(transactionsToWaitFor);
			});
	});

	describe('/', function () {

		it('should return all results', function () {
			return dappsEndpoint.makeRequest({}, 200).then(function (res) {
				res.body.data.length.should.be.at.least(registeredDappsAmount);
			});
		});
	});

	describe('?', function () {

		describe('transactionId=', function () {

			it('using empty string should return all results', function () {
				return dappsEndpoint.makeRequest({transactionId: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'transactionId');
				});
			});

			it('using null should fail', function () {
				return dappsEndpoint.makeRequest({transactionId: null}, 400).then(function (res) {
					expectSwaggerParamError(res, 'transactionId');
				});
			});

			it('using non-numeric id should fail', function () {
				return dappsEndpoint.makeRequest({transactionId: 'ABCDEFGHIJKLMNOPQRST'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'transactionId');
				});
			});

			it('using id with length > 20 should fail', function () {
				return dappsEndpoint.makeRequest({transactionId: '012345678901234567890'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'transactionId');
				});
			});

			it('using unknown id should return an empty array', function () {
				return dappsEndpoint.makeRequest({transactionId: '8713095156789756398'}, 200).then(function (res) {
					res.body.data.should.be.empty;
				});
			});

			it('using known ids should be ok', function () {
				return node.Promise.map(transactionsToWaitFor, function (transaction) {
					return dappsEndpoint.makeRequest({transactionId: transaction}, 200).then(function (res) {
						res.body.data[0].transactionId.should.be.eql(transaction);
					});
				});
			});
		});

		describe('name=', function () {

			it('using string with length < 1 should fail', function () {
				return dappsEndpoint.makeRequest({name: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'name');
				});
			});

			it('using string with length > 32 should fail', function () {
				return dappsEndpoint.makeRequest({name: 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFG'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'name');
				});
			});

			it('using string = "Unknown" should be ok', function () {
				return dappsEndpoint.makeRequest({name: 'Unknown'}, 200).then(function (res) {
					res.body.data.should.be.empty;
				});
			});

			it('using registered dapp1 name should be ok', function () {
				return dappsEndpoint.makeRequest({name: dapp1.name}, 200).then(function (res) {
					res.body.data.should.have.length(1);
					res.body.data[0].name.should.be.eql(dapp1.name);
				});
			});

			it('using registered dapp2 name should be ok', function () {
				return dappsEndpoint.makeRequest({name: dapp2.name}, 200).then(function (res) {
					res.body.data.should.have.length(1);
					res.body.data[0].name.should.be.eql(dapp2.name);
				});
			});
		});

		describe('limit=', function () {

			it('using 0 should fail', function () {
				return dappsEndpoint.makeRequest({limit: 0}, 400).then(function (res) {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using integer > 100 should fail', function () {
				return dappsEndpoint.makeRequest({limit: 101}, 400).then(function (res) {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using 1 should be ok', function () {
				return dappsEndpoint.makeRequest({limit: 1}, 200).then(function (res) {
					res.body.data.should.have.length(1);
				});
			});

			it('using 100 should be ok', function () {
				return dappsEndpoint.makeRequest({limit: 100}, 200).then(function (res) {
					res.body.data.should.have.length.at.most(100);
				});
			});
		});

		describe('limit=1&', function () {

			it('using offset < 0 should fail', function () {
				return dappsEndpoint.makeRequest({limit: 1, offset: -1}, 400).then(function (res) {
					expectSwaggerParamError(res, 'offset');
				});
			});

			it('using offset 0 should be ok', function () {
				return dappsEndpoint.makeRequest({limit: 1, offset: 0}, 200).then(function (res) {
					res.body.data.should.have.length(1);
					res.body.meta.limit.should.be.eql(1);
					res.body.meta.offset.should.be.eql(0);
				});
			});

			it('using offset 1 should be ok', function () {
				return dappsEndpoint.makeRequest({limit: 1, offset: 1}, 200).then(function (res) {
					res.body.data.should.have.length(1);
					res.body.meta.limit.should.be.eql(1);
					res.body.meta.offset.should.be.eql(1);
				});
			});
		});

		describe('offset=', function () {

			it('using offset 0 should return different result than offset 1', function () {
				return dappsEndpoint.makeRequests([{offset: 0}, {offset: 1}], 200).then(function (responses) {
					responses.should.have.length(2);
					responses[0].body.data[0].name.should.not.equal(responses[1].body.data[0].name);
				});
			});
		});

		describe('sort=', function () {

			// Create 20 random applications to increase data set
			before(function () {
				var promises = [];
				var transaction;
				var transactionsToWaitFor = [];

				var sum = 0;
				for (var i = 1; i <= 20; i++) {
					transaction = node.lisk.dapp.createDapp(account.password, null, randomUtil.application());
					transactionsToWaitFor.push(transaction.id);
					promises.push(sendTransactionPromise(transaction));
					sum = sum + i;
				}

				return node.Promise.all(promises)
					.then(function (results) {
						results.forEach(function (res) {
							node.expect(res).to.have.property('status').to.equal(200);
						});
						return waitForConfirmations(transactionsToWaitFor);
					});
			});

			it('using "unknown:unknown" should fail', function () {
				return dappsEndpoint.makeRequest({sort: 'unknown:unknown'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'sort');
				});
			});

			it('using "name:unknown" should fail', function () {
				return dappsEndpoint.makeRequest({sort: 'name:unknown'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'sort');
				});
			});

			it('using "name:asc" should return result in descending order', function () {
				return dappsEndpoint.makeRequest({sort: 'name:asc'}, 200).then(function (res) {
					var obtainedArray = node._.map(res.body.dapps, 'name');
					var cloneObtainedArray = node._.clone(obtainedArray);
					var expectedArray = cloneObtainedArray.sort();

					node.expect(expectedArray).eql(obtainedArray);
				});
			});

			it('using "name:desc" should return result in descending order', function () {
				return dappsEndpoint.makeRequest({sort: 'name:desc'}, 200).then(function (res) {
					var obtainedArray = node._.map(res.body.dapps, 'name');
					var cloneObtainedArray = node._.clone(obtainedArray);
					var expectedArray = cloneObtainedArray.sort().reverse();

					node.expect(expectedArray).eql(obtainedArray);
				});
			});
		});

		describe('unknown=', function () {

			it('using empty string should return all results', function () {
				return dappsEndpoint.makeRequest({unknown: ''}, 200).then(function (res) {
					res.body.data.should.have.length.at.least(registeredDappsAmount);
				});
			});

			it('using "unknown" should return all results', function () {
				return dappsEndpoint.makeRequest({unknown: 'unknown'}, 200).then(function (res) {
					res.body.data.should.have.length.at.least(registeredDappsAmount);
				});
			});
		});
	});
});
