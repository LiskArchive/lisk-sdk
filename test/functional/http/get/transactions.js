'use strict';

var node = require('../../../node');
var transactionSortFields = require('../../../../sql/transactions').sortFields;
var modulesLoader = require('../../../common/modulesLoader');
var transactionTypes = require('../../../../helpers/transactionTypes');
var genesisblock = require('../../../genesisBlock.json');

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
		promises.push(creditAccountPromise(account.address, maxAmount));
		promises.push(creditAccountPromise(account2.address, minAmount));

		return node.Promise.all(promises)
			.then(function (results) {
				results.forEach(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').that.is.not.empty;
					transactionList.push(res.transactionId);
				});
			})
			.then(function (res) {
				return waitForConfirmations(transactionList);
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
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactions').that.is.an('array');
				return getJsonForKeyPromise(url + params.join('&')).then(function (response) {
					node.expect(response).to.eql(res);
				});
			});
		});

		it('should not cache if response is not a success', function () {
			var params = [
				'whatever:senderId=' + node.gAccount.address
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
				return getJsonForKeyPromise(url + params.join('&')).then(function (response) {
					node.expect(response).to.eql(null);
				});
			});
		});
	});

	describe('?', function () {

		it('using valid parameters should be ok', function () {
			var limit = 10;
			var offset = 0;
			var orderBy = 'amount:asc';

			var params = [
				'blockId=' + '1',
				'senderId=' + node.gAccount.address,
				'recipientId=' + account.address,
				'limit=' + limit,
				'offset=' + offset,
				'orderBy=' + orderBy
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactions').that.is.an('array');
				node.expect(res.transactions).to.have.length.within(transactionList.length, limit);
				for (var i = 0; i < res.transactions.length; i++) {
					if (res.transactions[i + 1]) {
						node.expect(res.transactions[i].amount).to.be.at.most(res.transactions[i + 1].amount);
					}
				}
			});
		});

		it('using valid parameters with and/or should be ok', function () {
			var limit = 10;
			var offset = 0;
			var orderBy = 'amount:asc';

			var params = [
				'and:blockId=' + '1',
				'or:senderId=' + node.gAccount.address,
				'or:recipientId=' + account.address,
				'limit=' + limit,
				'offset=' + offset,
				'orderBy=' + orderBy
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactions').that.is.an('array');
				node.expect(res.transactions).to.have.length.within(transactionList.length, limit);
				for (var i = 0; i < res.transactions.length; i++) {
					if (res.transactions[i + 1]) {
						node.expect(res.transactions[i].amount).to.be.at.most(res.transactions[i + 1].amount);
					}
				}
			});
		});

		it('using minAmount with and:maxAmount ordered by amount and limited should be ok', function () {
			var limit = 10;
			var offset = 0;
			var orderBy = 'amount:asc';

			var params = [
				'minAmount=' + minAmount,
				'and:maxAmount=' + maxAmount,
				'limit=' + limit,
				'offset=' + offset,
				'orderBy=' + orderBy
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactions').that.is.an('array');
				node.expect(res.transactions).to.have.length.within(2, limit);
				for (var i = 0; i < res.transactions.length; i++) {
					if (res.transactions[i + 1]) {
						node.expect(res.transactions[i].amount).to.be.at.most(maxAmount);
						node.expect(res.transactions[i].amount).to.be.at.least(minAmount);
						node.expect(res.transactions[i].amount).to.be.at.most(res.transactions[i + 1].amount);
					}
				}
			});
		});

		it('using valid parameters with/without and/or should be ok', function () {
			var limit = 10;
			var offset = 0;
			var orderBy = 'amount:asc';

			var params = [
				'and:blockId=' + '1',
				'or:senderId=' + node.gAccount.address,
				'or:recipientId=' + account.address,
				'fromHeight=' + 1,
				'toHeight=' + 666,
				'and:fromTimestamp=' + 0,
				'and:minAmount=' + 0,
				'limit=' + limit,
				'offset=' + offset,
				'orderBy=' + orderBy
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactions').that.is.an('array');
				node.expect(res.transactions).to.have.length.within(transactionList.length, limit);
				for (var i = 0; i < res.transactions.length; i++) {
					if (res.transactions[i + 1]) {
						node.expect(res.transactions[i].amount).to.be.at.most(res.transactions[i + 1].amount);
					}
				}
			});
		});

		it('using valid array-like parameters should be ok', function () {
			var limit = 10;
			var offset = 0;
			var orderBy = 'amount:asc';

			var params = [
				'blockId=' + '1',
				'or:senderIds=' + node.gAccount.address + ',' + account.address,
				'or:recipientIds=' + account.address + ',' + account2.address,
				'or:senderPublicKeys=' + node.gAccount.publicKey,
				'or:recipientPublicKeys=' + node.gAccount.publicKey + ',' + account.publicKey,
				'limit=' + limit,
				'offset=' + offset,
				'orderBy=' + orderBy
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactions').that.is.an('array');
				node.expect(res.transactions).to.have.length.within(transactionList.length, limit);
				for (var i = 0; i < res.transactions.length; i++) {
					if (res.transactions[i + 1]) {
						node.expect(res.transactions[i].amount).to.be.at.most(res.transactions[i + 1].amount);
					}
				}
			});
		});

		it('using one invalid field name with and/or should fail', function () {
			var limit = 10;
			var offset = 0;
			var orderBy = 'amount:asc';

			var params = [
				'and:blockId=' + '1',
				'or:senderId=' + node.gAccount.address,
				'or:whatever=' + account.address,
				'limit=' + limit,
				'offset=' + offset,
				'orderBy=' + orderBy
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using invalid condition should fail', function () {
			var params = [
				'whatever:senderId=' + node.gAccount.address
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using invalid field name (x:y:z) should fail', function () {
			var params = [
				'or:whatever:senderId=' + node.gAccount.address
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using empty parameter should fail', function () {
			var params = [
				'and:publicKey='
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using type should be ok', function () {
			var type = node.transactionTypes.SEND;
			var params = [
				'type=' + type
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactions').that.is.an('array');
				for (var i = 0; i < res.transactions.length; i++) {
					if (res.transactions[i]) {
						node.expect(res.transactions[i].type).to.equal(type);
					}
				}
			});
		});

		it('using no params should be ok', function () {
			var params = [];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactions').that.is.an('array').not.empty;
			});
		});

		it('using too small fromUnixTime should fail', function () {
			var params = [
				'fromUnixTime=1464109199'
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using too small toUnixTime should fail', function () {
			var params = [
				'toUnixTime=1464109200'
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using limit > 1000 should fail', function () {
			var limit = 1001;
			var params = [
				'limit=' + limit
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('ordered by ascending timestamp should be ok', function () {
			var orderBy = 'timestamp:asc';
			var params = [
				'orderBy=' + orderBy
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactions').that.is.an('array');

				var flag = 0;
				for (var i = 0; i < res.transactions.length; i++) {
					if (res.transactions[i + 1]) {
						node.expect(res.transactions[i].timestamp).to.be.at.most(res.transactions[i + 1].timestamp);
					}
				}
			});
		});

		it('using offset=1 should be ok', function () {
			return getTransactionsPromise([]).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactions').that.is.an('array');

				var offset = 1;
				var params = [
					'offset=' + offset
				];

				return getTransactionsPromise(params).then(function (result) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactions').that.is.an('array');
					
					result.transactions.forEach(function (transaction){
						node.expect(res.transactions[0].id).not.equal(transaction.id);
					});
				});
			});
		});

		it('using offset="one" should fail', function () {
			var offset = 'one';
			var params = [
				'offset=' + offset
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using completely invalid fields should fail', function () {
			var params = [
				'blockId=invalid',
				'senderId=invalid',
				'recipientId=invalid',
				'limit=invalid',
				'offset=invalid',
				'orderBy=invalid'
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using partially invalid fields should fail', function () {
			var params = [
				'blockId=invalid',
				'senderId=invalid',
				'recipientId=' + account.address,
				'limit=invalid',
				'offset=invalid',
				'orderBy=blockId:asc'
			];

			return getTransactionsPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('using orderBy with any of sort fields should not place NULLs first', function () {
			var params;

			return node.Promise.each(transactionSortFields, function (sortField) {
				params = [
					'orderBy=' + sortField
				];
				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactions').that.is.an('array');

					var dividedIndices = res.transactions.reduce(function (memo, peer, index) {
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

	describe('/get?id=', function () {

		it('using valid id should be ok', function () {
			var transactionInCheck = transactionList[0];

			return getTransactionPromise(transactionInCheck).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transaction').that.is.an('object');
				node.expect(res.transaction.id).to.equal(transactionInCheck);
			});
		});

		it('using invalid id should fail', function () {
			return getTransactionPromise(undefined).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error');
			});
		});

		it('should get transaction with asset for id', function () {
			var transactionInCheck = genesisblock.transactions.find(function (trs) {
				return trs.id === '9314232245035524467';
			});

			return getTransactionPromise(transactionInCheck.id).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transaction').that.is.an('object');
				node.expect(res.transaction.type).to.equal(transactionTypes.VOTE);
				node.expect(res.transaction.type).to.equal(transactionInCheck.type);
				node.expect(res.transaction.id).to.equal(transactionInCheck.id);
				node.expect(res.transaction.amount).to.equal(transactionInCheck.amount);
				node.expect(res.transaction.fee).to.equal(transactionInCheck.fee);
				node.expect(res.transaction.recipientId).to.equal(transactionInCheck.recipientId);
				node.expect(res.transaction.senderId).to.equal(transactionInCheck.senderId);
				node.expect(res.transaction.asset).to.eql(transactionInCheck.asset);
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
				node.expect(res).to.have.property('success').to.be.false;
				node.expect(res).to.have.property('error').that.is.equal('Transaction not found');
			});
		});

		it('using valid transaction with data field should be ok', function () {
			var amountToSend = 123456789;
			var expectedFee = node.expectedFeeForTransactionWithData(amountToSend);
			var data = 'extra information';
			var transaction = node.lisk.transaction.createTransaction(account2.address, amountToSend, account.password, null, data);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(transaction.id);

				return getQueuedTransactionPromise(res.transactionId).then(function (result) {
					node.expect(result).to.have.property('success').to.be.ok;
					node.expect(result).to.have.property('transaction').that.is.an('object');
					node.expect(result.transaction.id).to.equal(res.transactionId);
				});
			});
		});
	});

	describe('/queued', function () {

		it('should be ok', function () {
			return getQueuedTransactionsPromise().then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactions').that.is.an('array');
				node.expect(res).to.have.property('count').that.is.an('number');
			});
		});
	});

	describe('/multisignatures/get?id=', function () {

		it('using unknown id should be ok', function () {
			return getMultisignaturesTransactionPromise('1234').then(function (res) {
				node.expect(res).to.have.property('success').to.be.false;
				node.expect(res).to.have.property('error').that.is.equal('Transaction not found');
			});
		});
	});

	describe('/multisignatures', function () {

		it('should be ok', function () {
			return getMultisignaturesTransactionsPromise().then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactions').that.is.an('array');
				node.expect(res).to.have.property('count').that.is.an('number');
			});
		});
	});

	describe('/unconfirmed/get?id=', function () {

		it('using valid id should be ok', function () {
			var transactionId = transactionList[transactionList.length - 1].txId;

			return getUnconfirmedTransactionPromise(transactionId).then(function (res) {
				node.expect(res).to.have.property('success');
				if (res.success && res.transaction != null) {
					node.expect(res).to.have.property('transaction').that.is.an('object');
					node.expect(res.transaction.id).to.equal(transactionList[transactionList.length - 1].txId);
				} else {
					node.expect(res).to.have.property('error');
				}
			});
		});
	});

	describe('/unconfirmed', function () {

		it('should be ok', function () {
			return getUnconfirmedTransactionsPromise().then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactions').that.is.an('array');
				node.expect(res).to.have.property('count').that.is.an('number');
			});
		});
	});
});
