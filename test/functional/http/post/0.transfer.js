'use strict';

var faker = require('faker');

var node = require('../../../node');
var shared = require('../../shared');
var constants = require('../../../../helpers/constants');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;

describe('POST /api/transactions (type 0) transfer funds', function () {

	var badTransactions = [];
	var goodTransactions = [];

	var account = node.randomAccount();
	var goodTransaction = node.randomTransaction();
	// Low-frills deep copy
	var cloneGoodTransaction = JSON.parse(JSON.stringify(goodTransaction));
	var transaction;

	describe('schema validations', function () {

		shared.invalidTransactions();
	});

	describe('transaction processing', function () {

		it('mutating data used to build the transaction id should fail', function () {
			transaction = node.randomTransaction();
			transaction.timestamp += 1;

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction id');
			});
		});

		it('using zero amount should fail', function () {
			transaction = node.lisk.transaction.createTransaction(account.address, 0, node.gAccount.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction amount');
				badTransactions.push(transaction);
			});
		});

		it('when sender has no funds should fail', function () {
			transaction = node.lisk.transaction.createTransaction('1L', 1, account.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Account does not have enough LSK: ' + account.address + ' balance: 0');
				badTransactions.push(transaction);
			});
		});

		it('using entire balance should fail', function () {
			transaction = node.lisk.transaction.createTransaction(account.address, Math.floor(node.gAccount.balance) , node.gAccount.password);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/^Account does not have enough LSK: [0-9]+L balance: /);
				badTransactions.push(transaction);
			});
		});

		it('from the genesis account should fail', function () {
			var signedTransactionFromGenesis = {
				type: 0,
				amount: 1000,
				senderPublicKey: 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
				requesterPublicKey: null,
				timestamp: 24259352,
				asset: {},
				recipientId: node.eAccount.address,
				signature: 'f56a09b2f448f6371ffbe54fd9ac87b1be29fe29f27f001479e044a65e7e42fb1fa48dce6227282ad2a11145691421c4eea5d33ac7f83c6a42e1dcaa44572101',
				id: '15307587316657110485',
				fee: 0.1 * node.normalizer
			};

			return sendTransactionPromise(signedTransactionFromGenesis).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').equals('Invalid sender. Can not send from genesis account');
				badTransactions.push(signedTransactionFromGenesis);
			});
		});

		it('when sender has funds should be ok', function () {
			return sendTransactionPromise(goodTransaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(goodTransaction.id);
				goodTransactions.push(goodTransaction);
			});
		});

		it('sending transaction with same id twice should fail', function () {
			return sendTransactionPromise(goodTransaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Transaction is already processed: ' + goodTransaction.id);
			});
		});

		it('sending transaction with same id twice but newer timestamp should fail', function () {
			cloneGoodTransaction.timestamp += 1;

			return sendTransactionPromise(cloneGoodTransaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Transaction is already processed: ' + cloneGoodTransaction.id);
			});
		});

		it('sending transaction with same id twice but older timestamp should fail', function () {
			cloneGoodTransaction.timestamp -= 1;

			return sendTransactionPromise(cloneGoodTransaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Transaction is already processed: ' + cloneGoodTransaction.id);
			});
		});

		describe('with offset', function () {
			
			it('using 1 should be ok', function () {
				transaction = node.lisk.transaction.createTransaction(account.address, 1, node.gAccount.password, null, null, 1);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
					goodTransactions.push(transaction);
				});
			});
			
			it('using future timestamp should fail', function () {
				transaction = node.lisk.transaction.createTransaction(account.address, 1, node.gAccount.password, null, null, 1000);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction timestamp. Timestamp is in the future');
					badTransactions.push(transaction);
				});
			});
		});

		describe('with additional data field', function () {

			var maximumString = node.randomString.generate(64);
			var maximumStringPlus1 = node.randomString.generate(64 + 1);

			var tests = [
				{ describe: 'null',               args: null,                        result: true },
				{ describe: 'undefined',          args: undefined,                   result: true },
				{ describe: 'NaN',                args: NaN,                         result: true },
				{ describe: 'Infinity',           args: Infinity ,                   result: false },
				{ describe: '0 integer',          args: 0,                           result: true },
				{ describe: 'negative integer',   args: -1,                          result: false },
				{ describe: 'float',              args: 1.2,                         result: false },
				{ describe: 'negative float',     args: -1.2,                        result: false },
				{ describe: 'date',               args: faker.date.recent(),         result: false },
				{ describe: 'true boolean',       args: true,                        result: false },
				{ describe: 'false boolean',      args: false ,                      result: true },
				{ describe: 'empty array',        args: [],                          result: false },
				{ describe: 'empty object',       args: {},                          result: false },
				{ describe: 'empty string',       args: '',                          result: true },
				{ describe: '0 as string',        args: '0',                         result: true },
				{ describe: 'regular string',     args: String('abc'),               result: true },
				{ describe: 'uppercase string',   args: String('ABC'),               result: true },
				{ describe: 'alphanumeric',       args: faker.random.alphaNumeric(), result: true },
				{ describe: 'email',              args: faker.internet.email(),      result: true },
				{ describe: 'URL',                args: faker.internet.url(),        result: true },
				{ describe: 'image',              args: faker.random.image(),        result: true },
				{ describe: 'IP',                 args: faker.internet.ip(),         result: true },
				{ describe: 'MAC',                args: faker.internet.mac(),        result: true },
				{ describe: 'uuid',               args: faker.random.uuid(),         result: true },
				{ describe: 'phone number',       args: faker.phone.phoneNumber(),   result: true },
				{ describe: 'iban',               args: faker.finance.iban(),        result: true },
				{ describe: 'maximum chars',      args: maximumString,               result: true },
				{ describe: 'maximum chars + 1',  args: maximumStringPlus1,          result: false }
			];

			tests.forEach(function (test, i) {
				if (test.result === true ) {
					it('using ' + test.describe + ' should be ok', function () {
						transaction = node.lisk.transaction.createTransaction(account.address, i + 1, node.gAccount.password, null, test.args);

						return sendTransactionPromise(transaction).then(function (res) {
							node.expect(res).to.have.property('success').to.be.ok;
							node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
							goodTransactions.push(transaction);
						});
					});
				} else {
					it('using ' + test.describe + ' should fail', function () {
						transaction = node.lisk.transaction.createTransaction(account.address, i + 1, node.gAccount.password, null, test.args);

						return sendTransactionPromise(transaction).then(function (res) {
							node.expect(res).to.have.property('success').to.be.not.ok;
							node.expect(res).to.have.property('message').not.empty;
							badTransactions.push(transaction);
						});
					});
				}
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});

	describe('validation', function () {

		it('sending already confirmed transaction should fail', function () {
			return sendTransactionPromise(goodTransaction).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Transaction is already confirmed: ' + goodTransaction.id);
			});
		});
	});
});
