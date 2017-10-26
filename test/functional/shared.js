'use strict';

var node = require('../node');

var sendTransactionPromise = require('../common/apiHelpers').sendTransactionPromise;
var getTransactionsPromise = require('../common/apiHelpers').getTransactionsPromise;
var getUnconfirmedTransactionPromise = require('../common/apiHelpers').getUnconfirmedTransactionPromise;
var getPendingMultisignaturePromise = require('../common/apiHelpers').getPendingMultisignaturePromise;
var getBlocksToWaitPromise = require('../common/apiHelpers').getBlocksToWaitPromise;
var waitForBlocksPromise = node.Promise.promisify(node.waitForBlocks);

var tests = [
	{describe: 'null',              args: null},
	{describe: 'undefined',         args: undefined},
	{describe: 'NaN',               args: NaN},
	{describe: 'Infinity',          args: Infinity},
	{describe: '0 integer',         args: 0},
	{describe: 'negative integer',  args: -1},
	{describe: 'float',             args: 1.2},
	{describe: 'negative float',    args: -1.2},
	{describe: 'empty string',      args: ''},
	{describe: '0 as string',       args: '0'},
	{describe: 'regular string',    args: String('abc')},
	{describe: 'uppercase string',  args: String('ABC')},
	{describe: 'invalid chars',     args: String('/')},
	{describe: 'date',              args: new Date()},
	{describe: 'true boolean',      args: true},
	{describe: 'false boolean',     args: false},
	{describe: 'empty array',       args: []},
	{describe: 'empty object',      args: {}}
];

function confirmationPhase (goodTransactions, badTransactions, pendingMultisignatures) {

	describe('after transactions get confirmed', function () {

		before(function () {
			return getBlocksToWaitPromise().then(waitForBlocksPromise);
		});

		it('bad transactions should not be confirmed', function () {
			return node.Promise.map(badTransactions, function (transaction) {
				var params = [
					'id=' + transaction.id
				];
				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').to.be.an('array').to.have.lengthOf(0);
				});
			});
		});

		it.skip('good transactions should not be unconfirmed', function () {
			return node.Promise.map(goodTransactions, function (transaction) {
				return getUnconfirmedTransactionPromise(transaction.id).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').to.be.an('array').to.have.lengthOf(0);
				});
			});
		});

		it('good transactions should be confirmed', function () {
			return node.Promise.map(goodTransactions, function (transaction) {
				var params = [
					'id=' + transaction.id
				];
				return getTransactionsPromise(params).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.transactions').to.be.an('array').to.have.lengthOf(1);
				});
			});
		});

		if (pendingMultisignatures) {
			it.skip('pendingMultisignatures should remain in the pending queue', function () {
				return node.Promise.map(pendingMultisignatures, function (transaction) {
					return getPendingMultisignaturePromise(transaction).then(function (res) {
						node.expect(res).to.have.property('status').to.equal(200);
						node.expect(res).to.have.nested.property('body.transactions').to.be.an('array').to.have.lengthOf(1);
					});
				});
			});

			it.skip('pendingMultisignatures should not be confirmed', function () {
				return node.Promise.map(pendingMultisignatures, function (transaction) {
					var params = [
						'id=' + transaction.id
					];
					return getTransactionsPromise(params).then(function (res) {
						node.expect(res).to.have.property('status').to.equal(200);
						node.expect(res).to.have.nested.property('body.transactions').to.be.an('array').to.have.lengthOf(0);
					});
				});
			});
		};
	});
};

function invalidTxs () {

	tests.forEach(function (test) {
		it('using ' + test.describe + ' should fail', function () {
			return sendTransactionPromise(test.args).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').that.is.not.empty;
			});
		});
	});
};

function invalidAssets (account, option, badTransactions) {

	var transaction;

	beforeEach(function () {
		switch(option) {
			case 'signature':
				transaction = node.lisk.signature.createSignature(account.password, node.randomPassword());
				break;
			case 'delegate':
				transaction = node.lisk.delegate.createDelegate(account.password, node.randomDelegateName());
				break;
			case 'votes':
				transaction = node.lisk.vote.createVote(account.password, []);
				break;
			case 'multisignature':
				transaction = node.lisk.multisignature.createMultisignature(account.password, null, ['+' + node.eAccount.publicKey], 1, 2);
				break;
			case 'dapp':
				transaction = node.lisk.dapp.createDapp(account.password, null, node.guestbookDapp);
				break;
		};
	});

	describe('using invalid asset values', function () {

		tests.forEach(function (test) {
			it('using ' + test.describe + ' should fail', function () {
				transaction.asset = test.args;

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').that.is.not.empty;
					badTransactions.push(transaction);
				});
			});
		});

		it('deleting object should fail', function () {
			delete transaction.asset;

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').that.is.not.empty;
				badTransactions.push(transaction);
			});
		});
	});

	describe('using invalid asset.' + option + ' values', function () {

		tests.forEach(function (test) {
			it('using ' + test.describe + ' should fail', function () {
				transaction.asset[option] = test.args;

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').that.is.not.empty;
					badTransactions.push(transaction);
				});
			});
		});

		it('deleting object should fail', function () {
			delete transaction.asset[option];

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').that.is.not.empty;
				badTransactions.push(transaction);
			});
		});
	});
}

module.exports = {
	tests: tests,
	confirmationPhase: confirmationPhase,
	invalidTxs: invalidTxs,
	invalidAssets: invalidAssets
};
