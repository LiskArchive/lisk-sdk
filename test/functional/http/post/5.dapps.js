'use strict';

var randomstring = require('randomstring');
var node = require('../../../node');
var utils = require('../../../common/utils');
var shared = require('../../shared');
var constants = require('../../../../helpers/constants');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var waitForConfirmations = require('../../../common/apiHelpers').waitForConfirmations;

describe('POST /api/transactions (type 5) register dapp', function () {

	var transaction;
	var transactionsToWaitFor = [];
	var badTransactions = [];
	var goodTransactions = [];
	var badTransactionsEnforcement = [];
	var goodTransactionsEnforcement = [];

	var account = utils.random.randomAccount();
	var accountNoFunds = utils.random.randomAccount();
	var accountMinimalFunds = utils.random.randomAccount();

	// Variables to check unconfirmed states
	var dappDuplicate = utils.random.randomApplication();
	var dappDuplicateNameSuccess = utils.random.randomApplication();
	var dappDuplicateNameFail = utils.random.randomApplication();
	dappDuplicateNameSuccess.name = dappDuplicateNameFail.name;
	var dappDuplicateLinkSuccess = utils.random.randomApplication();
	var dappDuplicateLinkFail = utils.random.randomApplication();
	dappDuplicateLinkSuccess.link = dappDuplicateLinkFail.link;

	// Crediting accounts
	before(function () {
		var transaction1 = node.lisk.transaction.createTransaction(account.address, 1000 * node.normalizer, node.gAccount.password);
		var transaction2 = node.lisk.transaction.createTransaction(accountMinimalFunds.address, constants.fees.dappRegistration, node.gAccount.password);
		var promises = [];
		promises.push(sendTransactionPromise(transaction1));
		promises.push(sendTransactionPromise(transaction2));

		return node.Promise.all(promises)
			.then(function (results) {
				results.forEach(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').that.is.equal('Transaction(s) accepted');
				});

				transactionsToWaitFor.push(transaction1.id, transaction2.id);
				return waitForConfirmations(transactionsToWaitFor);
			});
	});

	describe('schema validations', function () {

		shared.invalidAssets('dapp', badTransactions);

		describe('category', function () {
			
			it('without should fail', function () {
				transaction = node.lisk.dapp.createDapp(account.password, null, utils.random.randomApplication());
				delete transaction.asset.dapp.category;

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.match(/Missing required property: category$/);
					badTransactions.push(transaction);
				});
			});

			it('with string should fail', function () {
				transaction = node.lisk.dapp.createDapp(account.password, null, utils.random.randomApplication());
				transaction.asset.dapp.category = '0';

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate dapp schema: Expected type integer but found type string');
					badTransactions.push(transaction);
				});
			});

			it('with integer less than minimum should fail', function () {
				transaction = node.lisk.dapp.createDapp(account.password, null, utils.random.randomApplication());
				transaction.asset.dapp.category = -1;

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.match(/Value -1 is less than minimum 0$/);
					badTransactions.push(transaction);
				});
			});

			it('with integer greater than maximum should fail', function () {
				transaction = node.lisk.dapp.createDapp(account.password, null, utils.random.randomApplication());
				transaction.asset.dapp.category = 9;

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.match(/Value 9 is greater than maximum 8$/);
					badTransactions.push(transaction);
				});
			});

			it('with correct integer should be ok', function () {
				transaction = node.lisk.dapp.createDapp(account.password, null, utils.random.randomApplication());

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});
		});

		describe('description', function () {

			it('without should be ok', function () {
				var application = utils.random.randomApplication();
				delete application.description;

				transaction = node.lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with integer should fail', function () {
				transaction = node.lisk.dapp.createDapp(account.password, null, utils.random.randomApplication());
				transaction.asset.dapp.description = 0;

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate dapp schema: Expected type string but found type integer');
					badTransactions.push(transaction);
				});
			});

			it('with empty string should be ok', function () {
				var application = utils.random.randomApplication();
				application.description = '';

				transaction = node.lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with string longer than maximum(160) should fail', function () {
				var application = utils.random.randomApplication();
				application.description = randomstring.generate({
					length: 161
				});
				transaction = node.lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.match(/String is too long \(161 chars\), maximum 160$/);
					badTransactions.push(transaction);
				});
			});
		});

		describe('icon', function () {

			it('without should be ok', function () {
				var application = utils.random.randomApplication();
				delete application.icon;

				transaction = node.lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with integer should fail', function () {
				transaction = node.lisk.dapp.createDapp(account.password, null, utils.random.randomApplication());
				transaction.asset.dapp.icon = 0;

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate dapp schema: Expected type string but found type integer');
					badTransactions.push(transaction);
				});
			});

			it('with invalid url should fail', function () {
				var application = utils.random.randomApplication();
				application.icon = 'invalidUrl';

				transaction = node.lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid application icon link');
					badTransactions.push(transaction);
				});
			});

			it('with invalid file type should fail', function () {
				var application = utils.random.randomApplication();
				application.icon += '.invalid';

				transaction = node.lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid application icon file type');
					badTransactions.push(transaction);
				});
			});
		});

		describe('link', function () {

			it('with empty string should fail', function () {
				var application = utils.random.randomApplication();
				application.link = '';

				transaction = node.lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid application link');
					badTransactions.push(transaction);
				});
			});

			it('with integer should fail', function () {
				transaction = node.lisk.dapp.createDapp(account.password, null, utils.random.randomApplication());
				transaction.asset.dapp.link = 0;

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate dapp schema: Expected type string but found type integer');
					badTransactions.push(transaction);
				});
			});


			it('with invalid extension type should fail', function () {
				var application = utils.random.randomApplication();
				application.link += '.invalid';
				
				transaction = node.lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid application file type');
					badTransactions.push(transaction);
				});
			});
		});

		describe('name', function () {
			
			it('without should fail', function () {
				transaction = node.lisk.dapp.createDapp(account.password, null, utils.random.randomApplication());
				delete transaction.asset.dapp.name;

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.match(/Missing required property: name$/);
					badTransactions.push(transaction);
				});
			});

			it('with integer should fail', function () {
				transaction = node.lisk.dapp.createDapp(account.password, null, utils.random.randomApplication());
				transaction.asset.dapp.name = 0;

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate dapp schema: Expected type string but found type integer');
					badTransactions.push(transaction);
				});
			});

			it('with empty string should fail', function () {
				transaction = node.lisk.dapp.createDapp(account.password, null, utils.random.randomApplication());
				transaction.asset.dapp.name = '';

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.match(/String is too short \(0 chars\), minimum 1$/);
					badTransactions.push(transaction);
				});
			});

			it('with string longer than maximum(32) should fail', function () {
				var application = utils.random.randomApplication();
				application.name = randomstring.generate({
					length: 33
				});
				transaction = node.lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.match(/String is too long \(33 chars\), maximum 32$/);
					badTransactions.push(transaction);
				});
			});
		});

		describe('tags', function () {

			it('without should be ok', function () {
				var application = utils.random.randomApplication();
				delete application.tags;

				transaction = node.lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with integer should fail', function () {
				transaction = node.lisk.dapp.createDapp(account.password, null, utils.random.randomApplication());
				transaction.asset.dapp.tags = 0;

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid transaction body - Failed to validate dapp schema: Expected type string but found type integer');
					badTransactions.push(transaction);
				});
			});

			it('with empty string should be ok', function () {
				var application = utils.random.randomApplication();
				application.tags = '';

				transaction = node.lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with string longer than maximum(160) should fail', function () {
				var application = utils.random.randomApplication();
				application.tags = randomstring.generate({
					length: 161
				});
				transaction = node.lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.match(/String is too long \(161 chars\), maximum 160$/);
					badTransactions.push(transaction);
				});
			});

			it('with several should be ok', function () {
				var application = utils.random.randomApplication();
				application.tags += ',' + utils.random.randomApplicationName();

				transaction = node.lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					goodTransactions.push(transaction);
				});
			});

			it('with duplicate tag should be ok', function () {
				var application = utils.random.randomApplication();
				var tag = application.tags;
				application.tags += ',' + tag;

				transaction = node.lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Encountered duplicate tag: ' + tag + ' in application');
					badTransactions.push(transaction);
				});
			});
		});

		describe('type', function () {
			
			it('without should fail', function () {
				transaction = node.lisk.dapp.createDapp(account.password, null, utils.random.randomApplication());
				delete transaction.asset.dapp.type;

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.match(/Missing required property: type$/);
					badTransactions.push(transaction);
				});
			});

			it('with negative integer should fail', function () {
				transaction = node.lisk.dapp.createDapp(account.password, null, utils.random.randomApplication());
				transaction.asset.dapp.type = -1;

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.match(/Value -1 is less than minimum 0$/);
					badTransactions.push(transaction);
				});
			});

			it('with integer smaller than minimum should fail', function () {
				transaction = node.lisk.dapp.createDapp(account.password, null, utils.random.randomApplication());
				transaction.asset.dapp.type = -1;

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.match(/Value -1 is less than minimum 0$/);
					badTransactions.push(transaction);
				});
			});

			it('with integer greater than maximum should fail', function () {
				var application = utils.random.randomApplication();
				application.type = 2;
				transaction = node.lisk.dapp.createDapp(account.password, null, application);

				return sendTransactionPromise(transaction).then(function (res) {
					node.expect(res).to.have.property('status').to.equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Invalid application type');
					badTransactions.push(transaction);
				});
			});
		});
	});

	describe('transactions processing', function () {

		it('with no funds should fail', function () {
			transaction = node.lisk.dapp.createDapp(accountNoFunds.password, null, utils.random.randomApplication());

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Account does not have enough LSK: ' + accountNoFunds.address + ' balance: 0');
				badTransactions.push(transaction);
			});
		});

		it('with minimal funds should be ok', function () {
			transaction = node.lisk.dapp.createDapp(accountMinimalFunds.password, null, utils.random.randomApplication());

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});

		it('with valid params should be ok', function () {
			transaction = node.lisk.dapp.createDapp(account.password, null, utils.random.randomApplication());

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
				goodTransactions.push(transaction);
			});
		});
	});

	describe('unconfirmed state', function () {

		it('duplicate submission identical app should be ok and only last transaction to arrive should be confirmed', function () {
			transaction = node.lisk.dapp.createDapp(account.password, null, dappDuplicate, -1);

			return sendTransactionPromise(transaction)
				.then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					// TODO: Enable when transaction pool order is fixed
					// badTransactions.push(transaction);
				})
				.then(function (res) {
					// Transaction with same info but different ID (due to timeOffSet parameter)
					transaction = node.lisk.dapp.createDapp(account.password, null, dappDuplicate);

					return sendTransactionPromise(transaction);
				})
				.then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					// TODO: Enable when transaction pool order is fixed
					// goodTransactions.push(transaction);
				});
		});

		it('two different dapps with same name should be ok and only last transaction to arrive should be confirmed', function () {
			transaction = node.lisk.dapp.createDapp(account.password, null, dappDuplicateNameFail);

			return sendTransactionPromise(transaction)
				.then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					// TODO: Enable when transaction pool order is fixed
					// badTransactions.push(transaction);
				})
				.then(function (res) {
					// Transaction with same info but different ID (due to timeOffSet parameter)
					transaction = node.lisk.dapp.createDapp(account.password, null, dappDuplicateNameSuccess);

					return sendTransactionPromise(transaction);
				})
				.then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					// TODO: Enable when transaction pool order is fixed
					// goodTransactions.push(transaction);
				});
		});

		it('two different dapps with same link should be ok and only last transaction to arrive should be confirmed', function () {
			transaction = node.lisk.dapp.createDapp(account.password, null, dappDuplicateLinkFail);

			return sendTransactionPromise(transaction)
				.then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					// TODO: Enable when transaction pool order is fixed
					// badTransactions.push(transaction);
				})
				.then(function (res) {
					// Transaction with same info but different ID (due to timeOffSet parameter)
					transaction = node.lisk.dapp.createDapp(account.password, null, dappDuplicateLinkSuccess);

					return sendTransactionPromise(transaction);
				})
				.then(function (res) {
					node.expect(res).to.have.property('status').to.equal(200);
					node.expect(res).to.have.nested.property('body.status').to.equal('Transaction(s) accepted');
					// TODO: Enable when transaction pool order is fixed
					// goodTransactions.push(transaction);
				});
		});
	});
	
	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});

	describe('validation', function () {

		it('using registered name should fail', function () {
			transaction = node.lisk.dapp.createDapp(account.password, null, dappDuplicateNameFail);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Application name already exists: ' + dappDuplicateNameFail.name);
				badTransactionsEnforcement.push(transaction);
			});
		});

		it('using registered link should fail', function () {
			transaction = node.lisk.dapp.createDapp(account.password, null, dappDuplicateLinkFail);

			return sendTransactionPromise(transaction).then(function (res) {
				node.expect(res).to.have.property('status').to.equal(400);
				node.expect(res).to.have.nested.property('body.message').to.equal('Application link already exists: ' + dappDuplicateLinkFail.link);
				badTransactionsEnforcement.push(transaction);
			});
		});
	});

	describe('confirm validation', function () {

		shared.confirmationPhase(goodTransactionsEnforcement, badTransactionsEnforcement);
	});
});
