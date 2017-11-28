'use strict';

var _ = require('lodash');
var node = require('../../../node');
var lisk = node.lisk;
var transactionSortFields = require('../../../../sql/transactions').sortFields;
var modulesLoader = require('../../../common/modulesLoader');
var transactionTypes = require('../../../../helpers/transactionTypes');
var genesisblock = require('../../../data/genesisBlock.json');
var constants = require('../../../../helpers/constants');

var creditAccountPromise = require('../../../common/apiHelpers').creditAccountPromise;
var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var getTransactionsPromise = require('../../../common/apiHelpers').getTransactionsPromise;
var getTransactionPromise = require('../../../common/apiHelpers').getTransactionPromise;
var getQueuedTransactionPromise = require('../../../common/apiHelpers').getQueuedTransactionPromise;
var getQueuedTransactionsPromise = require('../../../common/apiHelpers').getQueuedTransactionsPromise;
var getUnconfirmedTransactionPromise = require('../../../common/apiHelpers').getUnconfirmedTransactionPromise;
var getUnconfirmedTransactionsPromise = require('../../../common/apiHelpers').getUnconfirmedTransactionsPromise;
var getMultisignaturesTransactionPromise = require('../../../common/apiHelpers').getMultisignaturesTransactionPromise;
var getMultisignaturesTransactionsPromise = require('../../../common/apiHelpers').getMultisignaturesTransactionsPromise;
var getCountPromise = require('../../../common/apiHelpers').getCountPromise;
var waitForConfirmations = require('../../../common/apiHelpers').waitForConfirmations;

describe('GET /api/transactions', function () {

	var transactionList = [];

	var account = node.randomAccount();
	var account2 = node.randomAccount();
	var minAmount = 20 * node.normalizer; // 20 LSK
	var maxAmount = 100 * node.normalizer; // 100 LSK

	// Crediting accounts
	before(function () {

		var promises = [];

		var transaction1 = lisk.transaction.createTransaction(account.address, maxAmount, node.gAccount.password);
		var transaction2 = lisk.transaction.createTransaction(account2.address, minAmount, node.gAccount.password);
		promises.push(sendTransactionPromise(transaction1));
		promises.push(sendTransactionPromise(transaction2));
		return node.Promise.all(promises).then(function (results) {
			results.forEach(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
			});
		}).then(function (res) {
			transactionList.push(transaction1);
			transactionList.push(transaction2);
			return waitForConfirmations(_.map(transactionList, 'id'));
		});
	});

	describe('from cache', function () {

		var cache;
		var getJsonForKeyPromise;
		var url = '/api/transactions?';

		before(function (done) {
			node.config.cacheEnabled = true;
			modulesLoader.initCache(function (err, __cache) {
				cache = __cache;
				getJsonForKeyPromise = node.Promise.promisify(cache.getJsonForKey);
				node.expect(err).to.not.exist;
				node.expect(__cache).to.be.an('object');
				return done(err);
			});
		});

		afterEach(function (done) {
			cache.flushDb(function (err, status) {
				node.expect(err).to.not.exist;
				node.expect(status).to.equal('OK');
				done(err);
			});
		});

		after(function (done) {
			cache.quit(done);
		});

		it('cache transactions by the url and parameters when response is a success', function () {
			var params = [
				'blockId=' + '1',
				'senderId=' + node.gAccount.address,
				'recipientId=' + account.address,
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');
				// Check key in cache after, 0, 10, 100 ms, and if value exists in any of this time period we respond with success
				return node.Promise.all([0, 10, 100].map(function (delay) {
					return node.Promise.delay(delay).then(function () {
						return getJsonForKeyPromise(url + params.join('&'));
					});
				})).then(function (responses) {
					node.expect(responses).to.deep.include(res.body);
				});
			});
		});

		it('should not cache if response is not a success', function () {
			var params = [
				'whatever:senderId=' + node.gAccount.address
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message');
				return getJsonForKeyPromise(url + params.join('&')).then(function (response) {
					node.expect(response).to.eql(null);
				});
			});
		});
	});

	describe('?', function () {

		describe('with wrong input', function () {

			it('using valid array-like parameters should fail', function () {
				var limit = 10;
				var offset = 0;
				var sort = 'amount:asc';

				var params = [
					'blockId=' + '1',
					'senderId=' + node.gAccount.address + ',' + account.address,
					'recipientId=' + account.address + ',' + account2.address,
					'senderPublicKey=' + node.gAccount.publicKey,
					'recipientPublicKey=' + node.gAccount.publicKey + ',' + account.publicKey,
					'limit=' + limit,
					'offset=' + offset,
					'sort=' + sort
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message');
				});
			});

			it('using invalid field name should fail', function () {
				var limit = 10;
				var offset = 0;
				var sort = 'amount:asc';

				var params = [
					'blockId=' + '1',
					'and:senderId=' + node.gAccount.address,
					'whatever=' + account.address,
					'limit=' + limit,
					'offset=' + offset,
					'sort=' + sort
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message');
				});
			});

			it('using invalid condition should fail', function () {
				var params = [
					'whatever:senderId=' + node.gAccount.address
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message');
				});
			});

			it('using invalid field name (x:z) should fail', function () {
				var params = [
					'and:senderId=' + node.gAccount.address
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message');
				});
			});

			it('using empty parameter should fail', function () {
				var params = [
					'publicKey='
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message');
				});
			});

			it('using completely invalid fields should fail', function () {
				var params = [
					'blockId=invalid',
					'senderId=invalid',
					'recipientId=invalid',
					'limit=invalid',
					'offset=invalid',
					'sort=invalid'
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message');
				});
			});

			it('using partially invalid fields should fail', function () {
				var params = [
					'blockId=invalid',
					'senderId=invalid',
					'recipientId=' + account.address,
					'limit=invalid',
					'offset=invalid',
					'sort=blockId:asc'
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message');
				});
			});

		});

		it('using no params should be ok', function () {
			var params = [];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.transactions').that.is.an('array').not.empty;
			});
		});

		describe('id', function () {

			it('using valid id should be ok', function () {
				var transactionInCheck = transactionList[0];
				var params = [
					'id=' + transactionInCheck.id
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').that.is.an('array').which.has.length(1);
					node.expect(res.body.transactions[0].id).to.equal(transactionInCheck.id);
				});
			});

			it('using invalid id should fail', function () {
				var params = [
					'id=' + undefined
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message');
				});
			});

			it('should get transaction with asset for id', function () {
				var transactionInCheck = genesisblock.transactions.find(function (trs) {
					// Vote type transaction from genesisBlock
					return trs.id === '9314232245035524467';
				});

				var params = [
					'id=' + transactionInCheck.id
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');
					node.expect(res).to.have.nested.property('body.transactions[0].type').to.equal(transactionTypes.VOTE);
					node.expect(res).to.have.nested.property('body.transactions[0].type').to.equal(transactionInCheck.type);
					node.expect(res).to.have.nested.property('body.transactions[0].id').to.equal(transactionInCheck.id);
					node.expect(res).to.have.nested.property('body.transactions[0].amount').to.equal(transactionInCheck.amount);
					node.expect(res).to.have.nested.property('body.transactions[0].fee').to.equal(transactionInCheck.fee);
					node.expect(res).to.have.nested.property('body.transactions[0].recipientId').to.equal(transactionInCheck.recipientId);
					node.expect(res).to.have.nested.property('body.transactions[0].senderId').to.equal(transactionInCheck.senderId);
					node.expect(res).to.have.nested.property('body.transactions[0].asset').to.eql(transactionInCheck.asset);
				});
			});
		});

		describe('type', function () {

			it('using invalid type should fail', function () {
				var type = 8;
				var params = [
					'type=' + type
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message');
				});
			});

			it('using type should be ok', function () {
				var type = node.transactionTypes.SEND;
				var params = [
					'type=' + type
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');
					for (var i = 0; i < res.body.transactions.length; i++) {
						if (res.body.transactions[i]) {
							node.expect(res.body.transactions[i].type).to.equal(type);
						}
					}
				});
			});
		});

		describe('senderId', function () {

			it('using invalid senderId should fail', function () {
				var params = [
					'senderId=' + undefined
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message');
				});
			});

			it('using one senderId should return transactions', function () {
				var params = [
					'senderId=' + node.gAccount.address,
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');
					for (var i = 0; i < res.body.transactions.length; i++) {
						if (res.body.transactions[i + 1]) {
							node.expect(res.body.transactions[i].senderId).to.equal(node.gAccount.address);
						}
					}
				});
			});

			it('using multiple senderId should return transactions', function () {
				var params = [
					'senderId=' + node.gAccount.address,
					'senderId=' + node.eAccount.address
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');
					for (var i = 0; i < res.body.transactions.length; i++) {
						if (res.body.transactions[i + 1]) {
							node.expect([node.gAccount.address, node.eAccount.address]).to.include(res.body.transactions[i].senderId);
						}
					}
				});
			});
		});

		describe('recipientId', function () {

			it('using invalid recipiendId should fail', function () {
				var params = [
					'recipientId=' + undefined
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message');
				});
			});

			it('using one recipientId should return transactions', function () {
				var params = [
					'recipientId=' + node.gAccount.address,
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');
					for (var i = 0; i < res.body.transactions.length; i++) {
						if (res.body.transactions[i + 1]) {
							node.expect(res.body.transactions[i].recipientId).to.equal(node.gAccount.address);
						}
					}
				});
			});

			it('using multiple recipientId should return transactions', function () {
				var params = [
					'recipientId=' + node.gAccount.address,
					'recipientId=' + node.eAccount.address
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');
					for (var i = 0; i < res.body.transactions.length; i++) {
						if (res.body.transactions[i + 1]) {
							node.expect([node.gAccount.address, node.eAccount.address]).to.include(res.body.transactions[i].recipientId);
						}
					}
				});
			});
		});

		describe('fromUnixTime', function () {

			it('using too small fromUnixTime should fail', function () {
				var params = [
					'fromUnixTime=1464109199'
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message');
				});
			});

			it('using valid fromUnixTime should return transactions', function () {
				var params = [
					'fromUnixTime=' + (constants.epochTime.getTime() / 1000 + 10).toString()
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');
				});
			});
		});

		describe('toUnixtime', function () {

			it('using too small toUnixTime should fail', function () {
				var params = [
					'toUnixTime=1464109200'
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message');
				});
			});

			it('should return transactions', function () {
				var params = [
					'toUnixTime=' + Math.floor(new Date().getTime() / 1000)
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');
				});
			});
		});

		describe('limit', function () {

			it('using limit < 0 should fail', function () {
				var limit = -1;
				var params = [
					'limit=' + limit
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message');
				});
			});

			it('using limit > 1000 should fail', function () {
				var limit = 1001;
				var params = [
					'limit=' + limit
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message');
				});
			});

			it('using limit = 10 should return 10 transactions', function () {
				var limit = 10;
				var params = [
					'limit=' + limit
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').that.is.an('array').to.have.length(10);
				});
			});
		});

		describe('sort', function () {

			describe('amount', function () {

				it('sorted by descending amount should be ok', function () {
					var sort = 'amount:asc';
					var params = [
						'sort=' + sort
					];

					return getTransactionsPromise(params).then(function (res) {
						node.expect(res).to.have.property('status').to.equal(200);
						node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');
						node.expect(_(res.body.transactions).map('amount').sort().reverse().value()).to.eql(_(res.body.transactions).map('amount').value());
					});
				});

				it('sorted by ascending timestamp should be ok', function () {
					var sort = 'amount:asc';
					var params = [
						'sort=' + sort
					];

					return getTransactionsPromise(params).then(function (res) {
						node.expect(res).to.have.property('status').to.equal(200);
						node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');
						node.expect(_(res.body.transactions).map('amount').sort().value()).to.eql(_(res.body.transactions).map('amount').value());
					});
				});
			});

			describe('timestamp', function () {

				it('sorted by descending timestamp should be ok', function () {
					var sort = 'timestamp:asc';
					var params = [
						'sort=' + sort
					];

					return getTransactionsPromise(params).then(function (res) {
						node.expect(res).to.have.property('status').to.equal(200);
						node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');
						node.expect(_(res.body.transactions).map('timestamp').sort().reverse().value()).to.eql(_(res.body.transactions).map('timestamp').value());
					});
				});

				it('sorted by ascending timestamp should be ok', function () {
					var sort = 'timestamp:asc';
					var params = [
						'sort=' + sort
					];

					return getTransactionsPromise(params).then(function (res) {
						node.expect(res).to.have.property('status').to.equal(200);
						node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');
						node.expect(_(res.body.transactions).map('timestamp').sort().value()).to.eql(_(res.body.transactions).map('timestamp').value());
					});
				});
			});

			it('using sort with any of sort fields should not place NULLs first', function () {
				var params;

				return node.Promise.each(transactionSortFields, function (sortField) {
					params = [
						'sort=' + sortField
					];

					return getTransactionsPromise(params).then(function (res) {
						node.expect(res).to.have.property('status').to.equal(200);
						node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');

						var dividedIndices = res.body.transactions.reduce(function (memo, peer, index) {
							memo[peer[sortField] === null ? 'nullIndices' : 'notNullIndices'].push(index);
							return memo;
						}, { notNullIndices: [], nullIndices: [] });

						if (dividedIndices.nullIndices.length && dividedIndices.notNullIndices.length) {
							var ascOrder = function (a, b) { return a - b; };
							dividedIndices.notNullIndices.sort(ascOrder);
							dividedIndices.nullIndices.sort(ascOrder);

							node.expect(dividedIndices.notNullIndices[dividedIndices.notNullIndices.length - 1])
								.to.be.at.most(dividedIndices.nullIndices[0]);
						}
					});
				});
			});
		});

		describe('offset', function () {

			it('using offset="one" should fail', function () {
				var offset = 'one';
				var params = [
					'offset=' + offset
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message');
				});
			});

			it('using offset=1 should be ok', function () {
				return getTransactionsPromise([]).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');

					var offset = 1;
					var params = [
						'offset=' + offset
					];

					return getTransactionsPromise(params).then(function (result) {
						node.expect(res).to.have.property('status').to.equal(200);
						node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');

						result.body.transactions.forEach(function (transaction){
							node.expect(res.body.transactions[0].id).not.equal(transaction.id);
						});
					});
				});
			});
		});

		describe('minAmount', function () {

			it('should get transactions with amount more than minAmount', function () {
				var params = [
					'minAmount=' + minAmount,
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');
					for (var i = 0; i < res.body.transactions.length; i++) {
						node.expect(res.body.transactions[i].amount).to.be.at.least(minAmount);
					}
				});
			});
		});

		describe('maxAmount', function () {

			it('using minAmount with maxAmount sorted by amount and limited should be ok', function () {
				var params = [
					'maxAmount=' + maxAmount,
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');
					for (var i = 0; i < res.body.transactions.length; i++) {
						node.expect(res.body.transactions[i].amount).to.be.at.most(maxAmount);
					}
				});
			});
		});

		describe('minAmount & maxAmount & sort', function () {

			it('using minAmount, maxAmount sorted by amount should return sorted transactions', function () {
				var sort = 'amount:asc';

				var params = [
					'minAmount=' + minAmount,
					'maxAmount=' + maxAmount,
					'sort=' + sort
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');
					for (var i = 0; i < res.body.transactions.length; i++) {
						if (res.body.transactions[i + 1]) {
							node.expect(res.body.transactions[i].amount).to.be.at.most(maxAmount);
							node.expect(res.body.transactions[i].amount).to.be.at.least(minAmount);
							node.expect(res.body.transactions[i].amount).to.be.at.most(res.body.transactions[i + 1].amount);
						}
					}
				});
			});
		});

		describe('combination of query parameters', function () {

			it('using valid parameters should be ok', function () {
				var limit = 10;
				var offset = 0;
				var sort = 'amount:asc';

				var params = [
					'senderId=' + node.gAccount.address,
					'recipientId=' + account.address,
					'recipientId=' + account2.address,
					'limit=' + limit,
					'offset=' + offset,
					'sort=' + sort
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');
					node.expect(res).to.have.nested.property('body.transactions').that.have.length.within(transactionList.length, limit);
					for (var i = 0; i < res.body.transactions.length; i++) {
						if (res.body.transactions[i + 1]) {
							node.expect(res.body.transactions[i].amount).to.be.at.most(res.body.transactions[i + 1].amount);
						}
					}
				});
			});

			it('using many valid parameters should be ok', function () {
				var limit = 10;
				var offset = 0;
				var sort = 'amount:asc';

				var params = [
					'blockId=' + '1',
					'senderId=' + node.gAccount.address,
					'recipientId=' + account.address,
					'fromHeight=' + 1,
					'toHeight=' + 666,
					'fromTimestamp=' + 0,
					'minAmount=' + 0,
					'limit=' + limit,
					'offset=' + offset,
					'sort=' + sort
				];

				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions');
				});
			});
		});

		describe('count', function () {

			it('should return count of the transactions with response', function () {
				return getTransactionsPromise({}).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').that.is.an('array');
					node.expect(res).to.have.nested.property('body.count').that.is.a('string');
				});
			});
		});
	});

	describe('/count', function () {

		it('should be ok', function () {
			return getCountPromise('transactions').then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('confirmed').that.is.an('number');
				node.expect(res).to.have.property('unconfirmed').that.is.an('number');
				node.expect(res).to.have.property('unprocessed').that.is.an('number');
				node.expect(res).to.have.property('unsigned').that.is.an('number');
				node.expect(res).to.have.property('total').that.is.an('number');
			});
		});
	});

	describe('/queued/get?id=', function () {

		it('using unknown id should be ok', function () {
			return getQueuedTransactionPromise('1234').then(function (res) {
				node.expect(res).to.have.property('success').to.equal(false);
				node.expect(res).to.have.property('error').that.is.equal('Transaction not found');
			});
		});

		it('using valid transaction with data field should be ok', function () {
			var amountToSend = 123456789;
			var expectedFee = node.expectedFeeForTransactionWithData(amountToSend);
			var data = 'extra information';
			var transaction = node.lisk.transaction.createTransaction(account2.address, amountToSend, account.password, null, data);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');

				return getQueuedTransactionPromise(transaction.id).then(function (result) {
					node.expect(result).to.have.property('success').to.equal(true);
					node.expect(result).to.have.property('transaction').that.is.an('object');
					node.expect(result.transaction.id).to.equal(transaction.id);
				});
			});
		});
	});

	describe('/queued', function () {

		it('should be ok', function () {
			return getQueuedTransactionsPromise().then(function (res) {
				node.expect(res).to.have.property('success').to.equal(true);
				node.expect(res).to.have.property('transactions').that.is.an('array');
				node.expect(res).to.have.property('count').that.is.an('number');
			});
		});
	});

	describe('/multisignatures/get?id=', function () {

		it('using unknown id should be ok', function () {
			return getMultisignaturesTransactionPromise('1234').then(function (res) {
				node.expect(res).to.have.property('success').to.equal(false);
				node.expect(res).to.have.property('error').that.is.equal('Transaction not found');
			});
		});
	});

	describe('/multisignatures', function () {

		it('should be ok', function () {
			return getMultisignaturesTransactionsPromise().then(function (res) {
				node.expect(res).to.have.property('success').to.equal(true);
				node.expect(res).to.have.property('transactions').that.is.an('array');
				node.expect(res).to.have.property('count').that.is.an('number');
			});
		});
	});

	describe('/unconfirmed/get?id=', function () {

		var unconfirmedTransaction;

		before(function () {
			unconfirmedTransaction = lisk.transaction.createTransaction(account.address, maxAmount, node.gAccount.password);
			return sendTransactionPromise(unconfirmedTransaction);
		});

		it('using valid id should be ok', function () {
			var transactionId = unconfirmedTransaction.id;
			return getUnconfirmedTransactionPromise(transactionId).then(function (res) {
				node.expect(res).to.have.property('success');
			});
		});
	});

	describe('/unconfirmed', function () {

		it('should be ok', function () {
			return getUnconfirmedTransactionsPromise().then(function (res) {
				node.expect(res).to.have.property('success').to.equal(true);
				node.expect(res).to.have.property('transactions').that.is.an('array');
				node.expect(res).to.have.property('count').that.is.an('number');
			});
		});
	});
});
