'use strict';

var node = require('../../../node.js');
var shared = require('../../shared');

var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var creditAccountPromise = require('../../../common/apiHelpers').creditAccountPromise;
var sendSignaturePromise = require('../../../common/apiHelpers').sendSignaturePromise;
var getPendingMultisignaturesPromise = require('../../../common/apiHelpers').getPendingMultisignaturesPromise;
var waitForConfirmations = require('../../../common/apiHelpers').waitForConfirmations;

describe('GET /api/multisignatures/', function () {

	var scenario = new shared.MultisigScenario(3);
	var transaction;
	var transactionsToWaitFor = [];

	before(function () {
		// Crediting accounts
		var sendTransaction = node.lisk.transaction.createTransaction(scenario.account.address, 1000 * node.normalizer, node.gAccount.password);
		return sendTransactionPromise(sendTransaction)
			.then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				transactionsToWaitFor.push(sendTransaction.id);
				return waitForConfirmations(transactionsToWaitFor);
			})
			.then(function (res) {
				transaction = node.lisk.multisignature.createMultisignature(scenario.account.password, null, scenario.keysgroup, 1, 2);
				return sendTransactionPromise(transaction);
			})
			.then(function (res) {
				node.expect(res).to.have.property('status').to.equal(200);
				transactionsToWaitFor.push(res.transactionId);
			});
	});

	describe('/pending', function () {

		it('using null public key should fail', function () {
			var params = [];
			
			return getPendingMultisignaturesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.equal('Missing required property: publicKey');
			});
		});

		it('using integer should fail', function () {
			var params = [
				'publicKey=' + 1
			];

			return getPendingMultisignaturesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.equal('Expected type string but found type integer');
			});
		});

		it('using invalid publicKey should fail', function () {
			var invalidPublicKey = '1234a';
			var params = [
				'publicKey=' + invalidPublicKey
			];

			return getPendingMultisignaturesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('error').to.equal('Object didn\'t pass validation for format publicKey: ' + invalidPublicKey);
			});
		});

		it('using valid public key should be ok', function () {
			var params = [
				'publicKey=' + scenario.account.publicKey
			];

			return getPendingMultisignaturesPromise(params).then(function (res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactions').that.is.an('array');
				node.expect(res.transactions.length).to.be.at.least(1);
				res.transactions.forEach(function (element) {
					if (element.transaction.id == transaction.id){
						node.expect(element).to.have.property('max').that.is.equal(0);
						node.expect(element).to.have.property('min').that.is.equal(0);
						node.expect(element).to.have.property('lifetime').that.is.equal(0);
						node.expect(element).to.have.property('signed').that.is.true;
						node.expect(element.transaction).to.have.property('type').that.is.equal(node.transactionTypes.MULTI);
						node.expect(element.transaction).to.have.property('amount').that.is.equal(0);
						node.expect(element.transaction).to.have.property('senderPublicKey').that.is.equal(scenario.account.publicKey);
						node.expect(element.transaction).to.have.property('timestamp').that.is.a('number');
						node.expect(element.transaction).to.have.property('asset').that.is.an('object');
						node.expect(element.transaction.asset).to.have.property('multisignature').that.is.an('object');
						node.expect(element.transaction.asset.multisignature).to.have.property('min').that.is.a('number');
						node.expect(element.transaction.asset.multisignature).to.have.property('keysgroup').that.is.an('array');
						node.expect(element.transaction.asset.multisignature).to.have.property('lifetime').that.is.a('number');
						node.expect(element.transaction).to.have.property('signature').that.is.a('string');
						node.expect(element.transaction).to.have.property('id').that.is.equal(transaction.id);
						node.expect(element.transaction).to.have.property('fee').that.is.equal(node.fees.multisignatureRegistrationFee * (scenario.keysgroup.length + 1));
						node.expect(element.transaction).to.have.property('senderId').that.is.eql(scenario.account.address);
						node.expect(element.transaction).to.have.property('receivedAt').that.is.a('string');
					}
				});
			});
		});
	});
});
