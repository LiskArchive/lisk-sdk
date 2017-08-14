'use strict';

var node = require('../node.js');
var http = require('../common/httpCommunication.js');
var ws = require('../common/wsCommunication');
var sendLiskTrs = require('../common/complexTransactions.js').sendLISK;
var transactionSortFields = require('../../sql/transactions').sortFields;
var modulesLoader = require('../common/initModule').modulesLoader;
var transactionTypes = require('../../helpers/transactionTypes.js');
var genesisblock = require('../genesisBlock.json');

var account = node.randomTxAccount();
var account2 = node.randomTxAccount();

var transactionList = [];
var offsetTimestamp = 0;

function sendLISK (account, amount, done) {
	var expectedFee = node.expectedFee(amount);

	sendLiskTrs({
		secret: node.gAccount.password,
		amount: amount,
		address: account.address
	}, function (err, res) {
		node.expect(res).to.have.property('success').to.be.ok;
		node.expect(res).to.have.property('transactionId').that.is.not.empty;
		transactionList.push({
			'sender': node.gAccount.address,
			'recipient': account.address,
			'grossSent': (amount + expectedFee) / node.normalizer,
			'fee': expectedFee / node.normalizer,
			'netSent': amount / node.normalizer,
			'txId': res.transactionId,
			'type': node.txTypes.SEND
		});
		done(err, res);
	});
}

function postTransaction (transaction, done) {
	ws.call('postTransactions', {
		transaction: transaction
	}, done, true);
}

before(function (done) {
	setTimeout(function () {
		sendLISK(account, node.randomLISK(), done);
	}, 2000);
});

before(function (done) {
	setTimeout(function () {
		sendLISK(account2, node.randomLISK(), done);
	}, 2000);
});

before(function (done) {
	setTimeout(function () {
		// Send 20 LSK
		sendLISK(account2, 20*100000000, done);
	}, 2000);
});

before(function (done) {
	setTimeout(function () {
		// Send 100 LSK
		sendLISK(account2, 100*100000000, done);
	}, 2000);
});

before(function (done) {
	node.onNewBlock(function (err) {
		done();
	});
});

describe('GET /api/transactions (cache)', function () {
	var cache;

	before(function (done) {
		node.config.cacheEnabled = true;
		done();
	});

	before(function (done) {
		modulesLoader.initCache(function (err, __cache) {
			cache = __cache;
			node.expect(err).to.not.exist;
			node.expect(__cache).to.be.an('object');
			return done(err, __cache);
		});
	});

	after(function (done) {
		cache.quit(done);
	});

	afterEach(function (done) {
		cache.flushDb(function (err, status) {
			node.expect(err).to.not.exist;
			node.expect(status).to.equal('OK');
			done(err, status);
		});
	});

	it('cache transactions by the url and parameters when response is a success', function (done) {
		var url, params;

		url = '/api/transactions?';
		params = [
			'blockId=' + '1',
			'senderId=' + node.gAccount.address,
			'recipientId=' + account.address,
		];

		http.get(url + params.join('&'), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			var response = res.body;
			cache.getJsonForKey(url + params.join('&'), function (err, res) {
				node.expect(err).to.not.exist;
				node.expect(res).to.eql(response);
				done(err, res);
			});
		});
	});

	it('should not cache if response is not a success', function (done) {
		var url, params;
		url = '/api/transactions?';
		params = [
			'whatever:senderId=' + node.gAccount.address
		];

		http.get(url + params.join('&'), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			cache.getJsonForKey(url + params, function (err, res) {
				node.expect(err).to.not.exist;
				node.expect(res).to.eql(null);
				done(err, res);
			});
		});
	});
});

describe('GET /api/transactions', function () {

	before(function (done) {
		node.onNewBlock(done);
	});

	it('using valid parameters should be ok', function (done) {
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

		http.get('/api/transactions?' + params.join('&'), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			node.expect(res.body.transactions).to.have.length.within(transactionList.length, limit);
			for (var i = 0; i < res.body.transactions.length; i++) {
				if (res.body.transactions[i + 1]) {
					node.expect(res.body.transactions[i].amount).to.be.at.most(res.body.transactions[i + 1].amount);
				}
			}
			done();
		});
	});

	it('using valid parameters with and/or should be ok', function (done) {
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

		http.get('/api/transactions?' + params.join('&'), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			node.expect(res.body.transactions).to.have.length.within(transactionList.length, limit);
			for (var i = 0; i < res.body.transactions.length; i++) {
				if (res.body.transactions[i + 1]) {
					node.expect(res.body.transactions[i].amount).to.be.at.most(res.body.transactions[i + 1].amount);
				}
			}
			done();
		});
	});

	it('using minAmount with and:maxAmount ordered by amount and limited should be ok', function (done) {
		var limit = 10;
		var offset = 0;
		var orderBy = 'amount:asc';
		var minAmount = 20*100000000; // 20 LSK
		var maxAmount = 100*100000000; // 100 LSK

		var params = [
			'minAmount=' + minAmount,
			'and:maxAmount=' + maxAmount,
			'limit=' + limit,
			'offset=' + offset,
			'orderBy=' + orderBy
		];

		http.get('/api/transactions?' + params.join('&'), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			node.expect(res.body.transactions).to.have.length.within(2, limit);
			node.expect(res.body.transactions[0].amount).to.be.equal(minAmount);
			node.expect(res.body.transactions[res.body.transactions.length-1].amount).to.be.equal(maxAmount);
			for (var i = 0; i < res.body.transactions.length; i++) {
				if (res.body.transactions[i + 1]) {
					node.expect(res.body.transactions[i].amount).to.be.at.most(res.body.transactions[i + 1].amount);
				}
			}
			done();
		});
	});

	it('using valid parameters with/without and/or should be ok', function (done) {
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

		http.get('/api/transactions?' + params.join('&'), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			node.expect(res.body.transactions).to.have.length.within(transactionList.length, limit);
			for (var i = 0; i < res.body.transactions.length; i++) {
				if (res.body.transactions[i + 1]) {
					node.expect(res.body.transactions[i].amount).to.be.at.most(res.body.transactions[i + 1].amount);
				}
			}
			done();
		});
	});

	it('using valid array-like parameters should be ok', function (done) {
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

		http.get('/api/transactions?' + params.join('&'), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			node.expect(res.body.transactions).to.have.length.within(transactionList.length, limit);
			for (var i = 0; i < res.body.transactions.length; i++) {
				if (res.body.transactions[i + 1]) {
					node.expect(res.body.transactions[i].amount).to.be.at.most(res.body.transactions[i + 1].amount);
				}
			}
			done();
		});
	});

	it('using one invalid field name with and/or should fail', function (done) {
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

		http.get('/api/transactions?' + params.join('&'), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using invalid condition should fail', function (done) {
		var params = [
			'whatever:senderId=' + node.gAccount.address
		];

		http.get('/api/transactions?' + params.join('&'), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using invalid field name (x:y:z) should fail', function (done) {
		var params = [
			'or:whatever:senderId=' + node.gAccount.address
		];

		http.get('/api/transactions?' + params.join('&'), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using empty parameter should fail', function (done) {
		var params = [
			'and:publicKey='
		];

		http.get('/api/transactions?' + params.join('&'), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using type should be ok', function (done) {
		var type = node.txTypes.SEND;
		var params = 'type=' + type;

		http.get('/api/transactions?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			for (var i = 0; i < res.body.transactions.length; i++) {
				if (res.body.transactions[i]) {
					node.expect(res.body.transactions[i].type).to.equal(type);
				}
			}
			done();
		});
	});

	it('using no params should be ok', function (done) {
		http.get('/api/transactions', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			for (var i = 0; i < res.body.transactions.length; i++) {
				if (res.body.transactions[i + 1]) {
					node.expect(res.body.transactions[i].amount).to.be.at.least(res.body.transactions[i + 1].amount);
				}
			}
			done();
		});
	});

	it('using too small fromUnixTime should fail', function (done) {
		var params = 'fromUnixTime=1464109199';

		http.get('/api/transactions?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using too small toUnixTime should fail', function (done) {
		var params = 'toUnixTime=1464109200';

		http.get('/api/transactions?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using limit > 1000 should fail', function (done) {
		var limit = 1001;
		var params = 'limit=' + limit;

		http.get('/api/transactions?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('ordered by ascending timestamp should be ok', function (done) {
		var orderBy = 'timestamp:asc';
		var params = 'orderBy=' + orderBy;

		http.get('/api/transactions?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');

			var flag = 0;
			for (var i = 0; i < res.body.transactions.length; i++) {
				if (res.body.transactions[i + 1]) {
					node.expect(res.body.transactions[i].timestamp).to.be.at.most(res.body.transactions[i + 1].timestamp);
					if (flag === 0) {
						offsetTimestamp = res.body.transactions[i + 1].timestamp;
						flag = 1;
					}
				}
			}

			done();
		});
	});

	it('using offset == 1 should be ok', function (done) {
		var offset = 1;
		var params = 'offset=' + offset;

		http.get('/api/transactions?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			if (res.body.transactions.length > 0) {
				node.expect(res.body.transactions[0].timestamp).to.be.equal(offsetTimestamp);
			}
			done();
		});
	});

	it('using offset == "one" should fail', function (done) {
		var offset = 'one';
		var params = 'offset=' + offset;

		http.get('/api/transactions?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using completely invalid fields should fail', function (done) {
		var params = [
			'blockId=invalid',
			'senderId=invalid',
			'recipientId=invalid',
			'limit=invalid',
			'offset=invalid',
			'orderBy=invalid'
		];

		http.get('/api/transactions?' + params.join('&'), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using partially invalid fields should fail', function (done) {
		var params = [
			'blockId=invalid',
			'senderId=invalid',
			'recipientId=' + account.address,
			'limit=invalid',
			'offset=invalid',
			'orderBy=blockId:asc'
		];

		http.get('/api/transactions?' + params.join('&'), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using orderBy with any of sort fields should not place NULLs first', function (done) {
		node.async.each(transactionSortFields, function (sortField, cb) {
			http.get('/api/transactions?orderBy=' + sortField, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('transactions').that.is.an('array');

				var dividedIndices = res.body.transactions.reduce(function (memo, peer, index) {
					memo[peer[sortField] === null ? 'nullIndices' : 'notNullIndices'].push(index);
					return memo;
				}, {notNullIndices: [], nullIndices: []});

				if (dividedIndices.nullIndices.length && dividedIndices.notNullIndices.length) {
					var ascOrder = function (a, b) { return a - b; };
					dividedIndices.notNullIndices.sort(ascOrder);
					dividedIndices.nullIndices.sort(ascOrder);

					node.expect(dividedIndices.notNullIndices[dividedIndices.notNullIndices.length - 1])
						.to.be.at.most(dividedIndices.nullIndices[0]);
				}
				cb();
			});
		}, function () {
			done();
		});
	});
});

describe('GET /api/transactions/get?id=', function () {

	it('using valid id should be ok', function (done) {
		var transactionInCheck = transactionList[0];
		var params = 'id=' + transactionInCheck.txId;

		http.get('/api/transactions/get?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transaction').that.is.an('object');
			node.expect(res.body.transaction.id).to.equal(transactionInCheck.txId);
			node.expect(res.body.transaction.amount / node.normalizer).to.equal(transactionInCheck.netSent);
			node.expect(res.body.transaction.fee / node.normalizer).to.equal(transactionInCheck.fee);
			node.expect(res.body.transaction.recipientId).to.equal(transactionInCheck.recipient);
			node.expect(res.body.transaction.senderId).to.equal(transactionInCheck.sender);
			node.expect(res.body.transaction.type).to.equal(transactionInCheck.type);
			done();
		});
	});

	it('using invalid id should fail', function (done) {
		var params = 'id=invalid';

		http.get('/api/transactions/get?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('should get transaction with asset for id', function (done) {
		var transactionInCheck = genesisblock.transactions.find(function (trs) {
			return trs.id === '9314232245035524467';
		});

		var params = 'id=' + transactionInCheck.id;
		http.get('/api/transactions/get?' + params, function (err, res) {
			node.expect(res.body.transaction.type).to.equal(transactionTypes.VOTE);
			node.expect(res.body.transaction.type).to.equal(transactionInCheck.type);

			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transaction').that.is.an('object');
			node.expect(res.body.transaction.id).to.equal(transactionInCheck.id);
			node.expect(res.body.transaction.amount).to.equal(transactionInCheck.amount);
			node.expect(res.body.transaction.fee).to.equal(transactionInCheck.fee);
			node.expect(res.body.transaction.recipientId).to.equal(transactionInCheck.recipientId);
			node.expect(res.body.transaction.senderId).to.equal(transactionInCheck.senderId);
			node.expect(res.body.transaction.asset).to.eql(transactionInCheck.asset);
			done();
		});
	});
});

describe('GET /api/transactions/count', function () {

	it('should be ok', function (done) {
		http.get('/api/transactions/count', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('confirmed').that.is.an('number');
			node.expect(res.body).to.have.property('queued').that.is.an('number');
			node.expect(res.body).to.have.property('multisignature').that.is.an('number');
			node.expect(res.body).to.have.property('unconfirmed').that.is.an('number');
			done();
		});
	});
});

describe('GET /api/transactions/queued/get?id=', function () {

	it('using unknown id should be ok', function (done) {
		var params = 'id=' + '1234';

		http.get('/api/transactions/queued/get?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.false;
			node.expect(res.body).to.have.property('error').that.is.equal('Transaction not found');
			done();
		});
	});

	describe('for transaction with data field', function () {

		function createTransactionWithData (done) {
			var amountToSend = 123456789;
			var expectedFee = node.expectedFeeForTrsWithData(amountToSend);
			var data = 'extra information';
			var transferTrs = node.lisk.transaction.createTransaction(account2.address, amountToSend, account.password, null, data);

			postTransaction(transferTrs, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').that.is.not.empty;
				var transaction = {
					'sender': account.address,
					'recipient': account2.address,
					'grossSent': (amountToSend + expectedFee) / node.normalizer,
					'fee': expectedFee / node.normalizer,
					'netSent': amountToSend / node.normalizer,
					'txId': res.transactionId,
					'type': node.txTypes.SEND,
					'data': data
				};
				transactionList.push(transaction);
				done(transaction);
			});
		}

		it('using valid id should be ok', function (done) {
			createTransactionWithData(function (transactionInCheck) {
				var trsId = transactionInCheck.txId;
				var params = 'id=' + trsId;

				http.get('/api/transactions/queued/get?' + params, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('transaction').that.is.an('object');
					node.expect(res.body.transaction.id).to.equal(transactionInCheck.txId);
					node.expect(res.body.transaction.amount / node.normalizer).to.equal(transactionInCheck.netSent);
					node.expect(res.body.transaction.fee / node.normalizer).to.equal(transactionInCheck.fee);
					node.expect(res.body.transaction.recipientId).to.equal(transactionInCheck.recipient);
					node.expect(res.body.transaction.senderId).to.equal(transactionInCheck.sender);
					node.expect(res.body.transaction.type).to.equal(transactionInCheck.type);
					node.expect(res.body.transaction.asset.data).to.equal(transactionInCheck.data);
					done();
				});
			});
		});
	});
});

describe('GET /api/transactions/queued', function () {

	it('should be ok', function (done) {
		http.get('/api/transactions/queued', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			node.expect(res.body).to.have.property('count').that.is.an('number');
			done();
		});
	});
});

describe('GET /api/transactions/multisignatures/get?id=', function () {

	it('using unknown id should be ok', function (done) {
		var params = 'id=' + '1234';

		http.get('/api/transactions/multisignatures/get?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.false;
			node.expect(res.body).to.have.property('error').that.is.equal('Transaction not found');
			done();
		});
	});
});

describe('GET /api/transactions/multisignatures', function () {

	it('should be ok', function (done) {
		http.get('/api/transactions/multisignatures', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			node.expect(res.body).to.have.property('count').that.is.an('number');
			done();
		});
	});
});

describe('GET /api/transactions/unconfirmed/get?id=', function () {

	it('using valid id should be ok', function (done) {
		var params = 'id=' + transactionList[transactionList.length - 1].txId;

		http.get('/api/transactions/unconfirmed/get?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success');
			if (res.body.success && res.body.transaction != null) {
				node.expect(res.body).to.have.property('transaction').that.is.an('object');
				node.expect(res.body.transaction.id).to.equal(transactionList[transactionList.length - 1].txId);
			} else {
				node.expect(res.body).to.have.property('error');
			}
			done();
		});
	});
});

describe('GET /api/transactions/unconfirmed', function () {

	it('should be ok', function (done) {
		http.get('/api/transactions/unconfirmed', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('transactions').that.is.an('array');
			node.expect(res.body).to.have.property('count').that.is.an('number');
			done();
		});
	});
});
