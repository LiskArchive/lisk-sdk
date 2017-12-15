'use strict';

var test = require('../../functional.js');

var lisk = require('lisk-js');
var chai = require('chai');
var should = chai.should();
var Promise = require('bluebird');

var _ = test._;
var genesisDelegates = require('../../../data/genesisDelegates.json');
var accountFixtures = require('../../../fixtures/accounts');

var constants = require('../../../../helpers/constants');

var randomUtil = require('../../../common/utils/random');
var waitFor = require('../../../common/utils/waitFor');
var onNewRoundPromise = Promise.promisify(waitFor.newRound);
var swaggerEndpoint = require('../../../common/swaggerSpec');
var apiHelpers = require('../../../common/helpers/api');
var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;

describe('GET /delegates', function () {
	var delegatesEndpoint = new swaggerEndpoint('GET /delegates');
	var validDelegate = genesisDelegates.delegates[0];
	var validNotExistingPublicKey = 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca8';

	describe('/', function () {

		it('using no params should return genesis delegates with default limit', function () {
			return delegatesEndpoint.makeRequest({}, 200).then(function (res) {
				res.body.data.should.have.lengthOf(10);
			});
		});

		it('using no params but with higher limit should return at least 101 genesis delegates', function () {
			var data = [];

			return delegatesEndpoint.makeRequest({limit: 100}, 200).then(function (res) {
				data = res.body.data;

				return delegatesEndpoint.makeRequest({offset: 100, limit: 100}, 200);
			}).then(function (res) {
				data.push.apply(data, res.body.data);

				data.should.have.lengthOf.at.least(101);
			});
		});

		describe('publicKey', function () {

			it('using no publicKey should return an empty array', function () {
				return delegatesEndpoint.makeRequest({publicKey: ''}, 200).then(function (res) {
					res.body.data.should.be.empty;
				});
			});

			it('using invalid publicKey should fail', function () {
				return delegatesEndpoint.makeRequest({publicKey: 'invalidPublicKey'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'publicKey');
				});
			});

			it('using valid existing publicKey of genesis delegate should return the result', function () {
				return delegatesEndpoint.makeRequest({publicKey: validDelegate.publicKey}, 200).then(function (res) {
					res.body.data.should.have.length(1);
					res.body.data[0].account.publicKey.should.be.eql(validDelegate.publicKey);
				});
			});

			it('using valid not existing publicKey should return an empty array', function () {
				return delegatesEndpoint.makeRequest({publicKey: validNotExistingPublicKey}, 200).then(function (res) {
					res.body.data.should.be.empty;
				});
			});
		});

		describe('secondPublicKey', function () {

			var secondSecretAccount = randomUtil.account();

			var creditTransaction = lisk.transaction.createTransaction(secondSecretAccount.address, constants.fees.secondSignature + constants.fees.delegate, accountFixtures.genesis.password);
			var signatureTransaction = lisk.signature.createSignature(secondSecretAccount.password, secondSecretAccount.secondPassword);
			var delegateTransaction = lisk.delegate.createDelegate(secondSecretAccount.password, secondSecretAccount.username);

			before(function () {
				return apiHelpers.sendTransactionsPromise([creditTransaction]).then(function (res) {
					res.statusCode.should.be.eql(200);
					return waitFor.confirmations([creditTransaction.id]);
				}).then(function () {
					return apiHelpers.sendTransactionsPromise([signatureTransaction, delegateTransaction]);
				}).then(function (res) {
					res.statusCode.should.be.eql(200);
					return waitFor.confirmations([signatureTransaction.id, delegateTransaction.id]);
				});
			});

			it('using no secondPublicKey should return an empty array', function () {
				return delegatesEndpoint.makeRequest({secondPublicKey: ''}, 200).then(function (res) {
					res.body.data.should.be.empty;
				});
			});

			it('using invalid secondPublicKey should fail', function () {
				return delegatesEndpoint.makeRequest({secondPublicKey: 'invalidAddress'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'secondPublicKey');
				});
			});

			it('using valid existing secondPublicKey of delegate should return the result', function () {
				return delegatesEndpoint.makeRequest({secondPublicKey: secondSecretAccount.secondPublicKey}, 200).then(function (res) {
					res.body.data.should.have.length(1);
					res.body.data[0].account.secondPublicKey.should.be.eql(secondSecretAccount.secondPublicKey);
				});
			});

			it('using valid not existing secondPublicKey should return an empty array', function () {
				return delegatesEndpoint.makeRequest({secondPublicKey: validNotExistingPublicKey}, 200).then(function (res) {
					res.body.data.should.be.empty;
				});
			});
		});

		describe('address', function () {

			it('using no address should return a schema error', function () {
				return delegatesEndpoint.makeRequest({address: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'address');
				});
			});

			it('using invalid address should fail', function () {
				return delegatesEndpoint.makeRequest({address: 'invalidAddress'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'address');
				});
			});

			it('using valid existing address of genesis delegate should return the result', function () {
				return delegatesEndpoint.makeRequest({address: validDelegate.address}, 200).then(function (res) {
					res.body.data[0].account.address.should.eql(validDelegate.address);
				});
			});

			it('using valid not existing address should return an empty array', function () {
				return delegatesEndpoint.makeRequest({address: '1111111111111111111L'}, 200).then(function (res) {
					res.body.data.should.be.empty;
				});
			});
		});

		describe('username', function () {

			it('using no username should return a schema error', function () {
				return delegatesEndpoint.makeRequest({username: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'username');
				});
			});

			it('using invalid username should fail', function () {
				return delegatesEndpoint.makeRequest({username: 1}, 400).then(function (res) {
					expectSwaggerParamError(res, 'username');
				});
			});

			it('using valid existing username of genesis delegate should return the result', function () {
				return delegatesEndpoint.makeRequest({username: validDelegate.username}, 200).then(function (res) {
					res.body.data[0].username.should.eql(validDelegate.username);
				});
			});

			it('using valid not existing username should return an empty array', function () {
				return delegatesEndpoint.makeRequest({username: 'unknownusername'}, 200).then(function (res) {
					res.body.data.should.be.empty;
				});
			});
		});

		describe('search', function () {

			it('using blank search should fail', function () {
				return delegatesEndpoint.makeRequest({search: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'search');
				});
			});

			it('using the special match all character should return all results', function () {
				return delegatesEndpoint.makeRequest({search: '%'}, 200).then(function (res) {
					res.body.data.should.have.length.of.at.least(10);
				});
			});

			it('using valid search with length=1 should be ok', function () {
				return delegatesEndpoint.makeRequest({search: 'g'}, 200);
			});

			it('using search with length=20 should be ok', function () {
				return delegatesEndpoint.makeRequest({search: 'genesis_123456789012'}, 200);
			});

			it('using search with length > 20 should fail', function () {
				return delegatesEndpoint.makeRequest({search: 'genesis_1234567890123'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'search');
				});
			});

			it('using search="genesis_1" should return 13 delegates', function () {
				return delegatesEndpoint.makeRequest({search: 'genesis_1', limit: 20}, 200).then(function (res) {
					res.body.data.should.have.length(13);
					res.body.data.map(function (d) { /^genesis_1.*/.test(d.username).should.be.true; });
				});
			});

			it('using search="genesis_10" should return 3 delegates', function () {
				return delegatesEndpoint.makeRequest({search: 'genesis_10'}, 200).then(function (res) {
					res.body.data.should.have.length(3);
					res.body.data.map(function (d) { /^genesis_10.*/.test(d.username).should.be.true; });
				});
			});

			it('using search="genesis_101" should return 1 delegate', function () {
				return delegatesEndpoint.makeRequest({search: 'genesis_101'}, 200).then(function (res) {
					res.body.data.should.have.length(1);
					res.body.data[0].username.should.eql('genesis_101');
				});
			});

			it('using higher limit should return 101 delegates', function () {
				return delegatesEndpoint.makeRequest({search: 'genesis_', limit: 100}, 200).then(function (res) {
					res.body.data.should.have.length(100);
					res.body.data.map(function (d) { /^genesis_.*/.test(d.username).should.be.true; });
				});
			});
		});

		describe('sort', function () {

			it('using sort="unknown:asc" should not sort results', function () {
				return delegatesEndpoint.makeRequest({sort: ''}, 400).then(function (res) {
					expectSwaggerParamError(res, 'sort');
				});
			});

			it('using sort="rank:asc" should sort results in ascending order', function () {
				return delegatesEndpoint.makeRequest({sort: 'rank:asc'}, 200).then(function (res) {
					_.map(res.data, 'rank').sort().should.eql(_.map(res.data, 'rank'));
				});
			});

			it('using sort="rank:desc" should sort results in descending order', function () {
				return delegatesEndpoint.makeRequest({sort: 'rank:asc'}, 200).then(function (res) {
					_.map(res.data, 'rank').sort().reverse().should.eql(_.map(res.data, 'rank'));
				});
			});

			it('using sort="username:asc" should sort results in ascending order', function () {
				return delegatesEndpoint.makeRequest({sort: 'username:asc'}, 200).then(function (res) {
					_(res.data).map('username').dbSort().should.eql(_.map(res.data, 'username'));
				});
			});

			it('using sort="username:desc" should sort results in descending order', function () {
				return delegatesEndpoint.makeRequest({sort: 'username:desc'}, 200).then(function (res) {
					_(res.data).map('username').dbSort('desc').should.eql(_.map(res.data, 'username'));
				});
			});

			it('using sort="missedBlocks:asc" should sort results in ascending order', function () {
				return delegatesEndpoint.makeRequest({sort: 'missedBlocks:asc'}, 200).then(function (res) {
					_.map(res.data, 'missedBlocks').sort().should.eql(_.map(res.data, 'missedBlocks'));
				});
			});

			it('using sort="missedBlocks:desc" should sort results in descending order', function () {
				return delegatesEndpoint.makeRequest({sort: 'missedBlocks:desc'}, 200).then(function (res) {
					_.map(res.data, 'missedBlocks').sort().reverse().should.eql(_.map(res.data, 'missedBlocks'));
				});
			});

			it('using sort="productivity:asc" should sort results in ascending order', function () {
				return delegatesEndpoint.makeRequest({sort: 'productivity:asc'}, 200).then(function (res) {
					_.map(res.data, 'productivity').sort().should.eql(_.map(res.data, 'productivity'));
				});
			});

			it('using sort="productivity:desc" should sort results in descending order', function () {
				return delegatesEndpoint.makeRequest({sort: 'productivity:desc'}, 200).then(function (res) {
					_.map(res.data, 'productivity').sort().reverse().should.eql(_.map(res.data, 'productivity'));
				});
			});

			it('using sort with any of sort fields should not place NULLs first', function () {
				var delegatesSortFields = ['rank', 'username', 'missedBlocks', 'productivity'];
				return Promise.all(delegatesSortFields.map(function (sortField) {
					return delegatesEndpoint.makeRequest({sort: sortField + ':asc'}, 200).then(function (res) {
						_(_.map(res.data, sortField)).appearsInLast(null);
					});
				}));
			});
		});

		describe('limit', function () {

			it('using string limit should fail', function () {
				return delegatesEndpoint.makeRequest({limit: 'one'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using limit=-1 should fail', function () {
				return delegatesEndpoint.makeRequest({limit: -1}, 400).then(function (res) {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using limit=0 should fail', function () {
				return delegatesEndpoint.makeRequest({limit: 0}, 400).then(function (res) {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using limit=1 should be ok', function () {
				return delegatesEndpoint.makeRequest({limit: 1}, 200).then(function (res) {
					res.body.data.should.have.length(1);
				});
			});

			it('using limit=101 should be ok', function () {
				return delegatesEndpoint.makeRequest({limit: 100}, 200).then(function (res) {
					res.body.data.should.have.length(100);
				});
			});

			it('using limit > 100 should fail', function () {
				return delegatesEndpoint.makeRequest({limit: 101}, 400).then(function (res) {
					expectSwaggerParamError(res, 'limit');
				});
			});
		});

		describe('offset', function () {

			it('using string offset should fail', function () {
				return delegatesEndpoint.makeRequest({offset: 'one'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'offset');
				});
			});

			it('using offset=1 should be ok', function () {
				return delegatesEndpoint.makeRequest({offset: 1, limit: 10}, 200).then(function (res) {
					res.body.data.should.have.lengthOf.at.least(10);
				});
			});

			it('using offset=-1 should fail', function () {
				return delegatesEndpoint.makeRequest({offset: -1}, 400).then(function (res) {
					expectSwaggerParamError(res, 'offset');
				});
			});
		});
	});

	describe('GET /forgers', function () {

		var forgersEndpoint = new swaggerEndpoint('GET /delegates/forgers');

		it('using no params should be ok', function () {
			return forgersEndpoint.makeRequest({}, 200).then(function (res) {
				res.body.data.should.have.length(10);
			});
		});

		it('using limit=1 should be ok', function () {
			return forgersEndpoint.makeRequest({limit: 1}, 200).then(function (res) {
				res.body.data.should.have.length(1);
			});
		});

		it('using offset=1 limit=10 should be ok', function () {
			return forgersEndpoint.makeRequest({limit: 10, offset: 1}, 200).then(function (res) {
				res.body.data.should.have.length(10);
			});
		});

		describe('slot numbers are correct', function () {

			var forgersData;

			before(function () {
				return forgersEndpoint.makeRequest({}, 200).then(function (res) {
					forgersData = res.body;
				});
			});

			it('lastBlockSlot should be less or equal to currentSlot', function () {
				forgersData.meta.lastBlockSlot.should.be.at.most(forgersData.meta.currentSlot);
			});

			it('every forger nextSlot should be greater than currentSlot', function () {
				forgersData.data.forEach(function (forger) {
					forgersData.meta.currentSlot.should.be.at.most(forger.nextSlot);
				});
			});
		});
	});
});
