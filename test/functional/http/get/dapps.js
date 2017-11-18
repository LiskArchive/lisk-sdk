'use strict';

var node = require('../../../node.js');
var apiCodes = require('../../../../helpers/apiCodes');
var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var creditAccountPromise = require('../../../common/apiHelpers').creditAccountPromise;
var getDappsPromise = require('../../../common/apiHelpers').getDappsPromise;
var waitForConfirmations = require('../../../common/apiHelpers').waitForConfirmations;

describe('GET /api/dapps', function () {

	var transactionsToWaitFor = [];

	var account = node.randomAccount();
	var dapp1 = node.randomApplication();
	dapp1.category = 1;
	var dapp2 = node.randomApplication();
	dapp2.category = 2;
	var registeredDappsAmount = 2;

	before(function () {
		var transaction = node.lisk.transaction.createTransaction(account.address, 1000 * node.normalizer, node.gAccount.password);
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
			return getDappsPromise([]).then(function (res) {
				node.expect(res).to.have.property('status').equal(apiCodes.OK);
				node.expect(res).to.have.nested.property('body.dapps').that.is.an('array').and.has.length.at.least(registeredDappsAmount);
			});
		});
	});

	describe('?', function () {

		describe('transactionId=', function () {

			it('using empty string should return all results', function () {
				var params = [
					'transactionId='
				];
				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.BAD_REQUEST);
					node.expect(res).to.have.nested.property('body.message').equal('String is too short (0 chars), minimum 1');
				});
			});

			it('using null should fail', function () {
				var params = [
					'transactionId=' + null
				];
				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.BAD_REQUEST);
					node.expect(res).to.have.nested.property('body.message').equal('Object didn\'t pass validation for format id: null');
				});
			});

			it('using non-numeric id should fail', function () {
				var dappId = 'ABCDEFGHIJKLMNOPQRST';
				var params = [
					'transactionId=' + dappId
				];
				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.BAD_REQUEST);
					node.expect(res).to.have.nested.property('body.message').equal('Object didn\'t pass validation for format id: ' + dappId);
				});
			});

			it('using id with length > 20 should fail', function () {
				var dappId = '012345678901234567890';
				var params = [
					'transactionId=' + dappId
				];
				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.BAD_REQUEST);
					node.expect(res).to.have.nested.property('body.message').equal('String is too long (21 chars), maximum 20');
				});
			});

			it('using unknown id should return an empty array', function () {
				var dappId = '8713095156789756398';
				var params = [
					'transactionId=' + dappId
				];
				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.OK);
					node.expect(res).to.have.nested.property('body.dapps').to.be.an('array').and.to.be.empty;
				});
			});

			it('using known ids should be ok', function () {
				return node.Promise.map(transactionsToWaitFor, function (transaction) {
					var params = [
						'transactionId=' + transaction
					];
					return getDappsPromise(params).then(function (res) {
						node.expect(res).to.have.property('status').equal(apiCodes.OK);
						node.expect(res).to.have.nested.property('body.dapps.0.transactionId').equal(transaction);
					});
				});
			});
		});

		describe('name=', function () {

			it('using string with length < 1 should fail', function () {
				var params = [
					'name='
				];

				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.BAD_REQUEST);
					node.expect(res).to.have.nested.property('body.message').that.is.equal('String is too short (0 chars), minimum 1');
				});
			});

			it('using string with length > 32 should fail', function () {
				var params = [
					'name=' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFG'
				];

				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.BAD_REQUEST);
					node.expect(res).to.have.nested.property('body.message').that.is.equal('String is too long (33 chars), maximum 32');
				});
			});

			it('using string = "Unknown" should be ok', function () {
				var params = [
					'name=' + 'Unknown'
				];

				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.OK);
					node.expect(res).to.have.nested.property('body.dapps').to.be.an('array').and.to.be.empty;
				});
			});

			it('using registered dapp1 name should be ok', function () {
				var params = [
					'name=' + dapp1.name
				];

				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.OK);
					node.expect(res).to.have.nested.property('body.dapps').that.is.an('array').and.has.lengthOf(1);
					node.expect(res.body.dapps[0].name).to.equal(dapp1.name);

				});
			});

			it('using registered dapp2 name should be ok', function () {
				var params = [
					'name=' + dapp2.name
				];

				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.OK);
					node.expect(res).to.have.nested.property('body.dapps').that.is.an('array').and.has.lengthOf(1);
					node.expect(res.body.dapps[0].name).to.equal(dapp2.name);
				});
			});
		});

		describe('limit=', function () {

			it('using 0 should fail', function () {
				var params = [
					'limit=' + 0
				];

				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.BAD_REQUEST);
					node.expect(res).to.have.nested.property('body.message').that.is.equal('Value 0 is less than minimum 1');
				});
			});

			it('using integer > 100 should fail', function () {
				var params = [
					'limit=' + 101
				];

				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.BAD_REQUEST);
					node.expect(res).to.have.nested.property('body.message').that.is.equal('Value 101 is greater than maximum 100');
				});
			});

			it('using 1 should be ok', function () {
				var params = [
					'limit=' + 1
				];

				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.OK);
					node.expect(res).to.have.nested.property('body.dapps').that.is.an('array').and.has.length.at.most(1);
				});
			});

			it('using 100 should be ok', function () {
				var params = [
					'limit=' + 100
				];

				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.OK);
					node.expect(res).to.have.nested.property('body.dapps').that.is.an('array').and.has.length.at.most(100);
				});
			});
		});

		describe('limit=1&', function () {

			it('using offset < 0 should fail', function () {
				var params = [
					'limit=' + 1,
					'offset=' + '-1'
				];

				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.BAD_REQUEST);
					node.expect(res).to.have.nested.property('body.message').that.is.equal('Value -1 is less than minimum 0');
				});
			});

			it('using offset 0 should be ok', function () {
				var params = [
					'limit=' + 1,
					'offset=' + 0
				];

				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.OK);
					node.expect(res).to.have.nested.property('body.dapps').that.is.an('array').and.has.lengthOf(1);
				});
			});

			it('using offset 1 should be ok', function () {
				var params = [
					'limit=' + 1,
					'offset=' + 1
				];

				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.OK);
					node.expect(res).to.have.nested.property('body.dapps').that.is.an('array').and.has.lengthOf(1);
				});
			});
		});

		describe('offset=', function () {

			it('using offset 0 should return different result than offset 1', function () {
				var paramsOffsetZero = [
					'offset=' + 0
				];
				var paramsOffsetOne = [
					'offset=' + 1
				];
				return node.Promise.all([
					getDappsPromise(paramsOffsetZero),
					getDappsPromise(paramsOffsetOne)
				]).then(function (results) {
					node.expect(results).to.have.nested.property('0.body.dapps.0.name');
					node.expect(results).to.have.nested.property('1.body.dapps.0.name');
					node.expect(results[0].body.dapps[0].name).not.to.equal(results[1].body.dapps[0].name);
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
					transaction = node.lisk.dapp.createDapp(account.password, null, node.randomApplication());
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

			it('using "unknown:unknown" should be ok', function () {
				var params = [
					'sort=' + 'unknown:unknown'
				];

				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.INTERNAL_SERVER_ERROR);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid sort field');
				});
			});

			it('using "category:unknown" should return result in ascending order', function () {
				var params = [
					'sort=' + 'name:unknown'
				];

				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.OK);
					node.expect(res).to.have.nested.property('body.dapps').that.is.an('array');

					var expectedArray = node._.map(res.body.dapps, 'name');
					var obtainedArray = node._.clone(expectedArray).sort();

					node.expect(expectedArray).eql(obtainedArray);
				});
			});

			it('using "name:asc" should return result in ascending order', function () {
				var params = [
					'sort=' + 'name:asc'
				];

				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.OK);
					node.expect(res).to.have.nested.property('body.dapps').that.is.an('array');

					var obtainedArray = node._.map(res.body.dapps, 'name');
					var cloneObtainedArray = node._.clone(obtainedArray);
					var expectedArray = cloneObtainedArray.sort();

					node.expect(expectedArray).eql(obtainedArray);
				});
			});

			it('using "category:desc" should return result in descending order', function () {
				var params = [
					'sort=' + 'name:desc'
				];

				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.OK);
					node.expect(res).to.have.nested.property('body.dapps').that.is.an('array');

					var obtainedArray = node._.map(res.body.dapps, 'name');
					var cloneObtainedArray = node._.clone(obtainedArray);
					var expectedArray = cloneObtainedArray.sort().reverse();

					node.expect(expectedArray).eql(obtainedArray);
				});
			});
		});

		describe('unknown=', function () {

			it('using empty string should return all results', function () {
				var params = [
					'unknown='
				];
				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.OK);
					node.expect(res).to.have.nested.property('body.dapps').that.is.an('array').and.has.length.at.least(registeredDappsAmount);
				});
			});

			it('using "unknown" should return all results', function () {
				var params = [
					'unknown=unknown'
				];
				return getDappsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').equal(apiCodes.OK);
					node.expect(res).to.have.nested.property('body.dapps').that.is.an('array').and.has.length.at.least(registeredDappsAmount);
				});
			});
		});
	});
});
