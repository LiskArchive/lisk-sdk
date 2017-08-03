'use strict';

var _ = require('lodash');
var crypto = require('crypto');
var Promise = require('bluebird');
var BigNumber = require('../../../helpers/bignum.js');

var node = require('../../node.js');
var sendTransaction = require('../../common/complexTransactions.js').sendTransaction;
var getTransaction = require('../../common/complexTransactions.js').getTransaction;
var getUnconfirmedTransaction = require('../../common/complexTransactions.js').getUnconfirmedTransaction;

var getTransactionPromise = Promise.promisify(getTransaction);
var getUnconfirmedTransactionPromise = Promise.promisify(getUnconfirmedTransaction);
var onNewBlockPromise = Promise.promisify(node.onNewBlock);

var constants = require('../../../helpers/constants');

describe('POST /api/transactions (type 0)', function () {

	var badTransactions = [];
	var goodTransactions = [];

	describe('schema', function () {

		var transaction;

		beforeEach(function () {
			transaction = node.randomTx();
		});

		describe('sending transactions without proper format', function () {

			it('using null should fail', function (done) {
				sendTransaction(null, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
					done();
				}, true);
			});

			it('using undefined should fail', function (done) {
				sendTransaction(undefined, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
					done();
				}, true);
			});

			it('using NaN should fail', function (done) {
				sendTransaction(NaN, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
					done();
				}, true);
			});

			it('using integer should fail', function (done) {
				sendTransaction(0, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
					done();
				}, true);
			});

			it('using string should fail', function (done) {
				sendTransaction('', function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
					done();
				}, true);
			});

			it('using array should fail', function (done) {
				sendTransaction([], function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
					done();
				}, true);
			});

			it('using empty dict should fail', function (done) {
				sendTransaction({}, function (err, res) {
					node.expect(res).to.have.property('success').not.to.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
					done();
				}, true);
			});
		});

		describe('sending transactions with wrong TYPE values', function () {

			it('using null should fail', function (done) {
				transaction.type = null;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Unknown transaction type null');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using undefined should fail', function (done) {
				transaction.type = undefined;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Unknown transaction type undefined');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using NaN should fail', function (done) {
				transaction.type = NaN;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Unknown transaction type null');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using string should fail', function (done) {
				transaction.type = '1';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type string');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using array should fail', function (done) {
				transaction.type = [];

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Unknown transaction type ');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using object should fail', function (done) {
				transaction.type = {};

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Unknown transaction type [object Object]');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using unknown type type should fail', function (done) {
				transaction.type = Number.MAX_SAFE_INTEGER;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Unknown transaction type '+transaction.type);
					badTransactions.push(transaction);
					done();
				}, true);
			});
		});

		describe('sending transactions with wrong AMOUNT values', function () {

			it('using null should fail', function (done) {
				transaction.amount = null;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Failed to get transaction id');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using undefined should fail', function (done) {
				transaction.amount = undefined;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Failed to get transaction id');
					done();
					badTransactions.push(transaction);
				}, true);
			});

			it('using NaN should fail', function (done) {
				transaction.amount = NaN;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Failed to get transaction id');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using string should fail', function (done) {
				transaction.amount = '';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type string');
		  		badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using array should fail', function (done) {
				transaction.amount = [];

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type array');
		  		badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using object should fail', function (done) {
				transaction.amount = {};

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type object');
		  		badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using negative integer should fail', function (done) {
				transaction.amount = -1;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.match(/Invalid transaction body - Failed to validate transaction schema: Value -1 is less than minimum/);
					badTransactions.push(transaction);
					done();
				});
			});

			it('using float should fail', function (done) {
				transaction.amount = 1.2;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.match(/Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type number/);
					badTransactions.push(transaction);
					done();
				});
			});

			it('using negative float should fail', function (done) {
				transaction.amount = -1.2;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.match(/Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type number/);
					badTransactions.push(transaction);
					done();
				});
			});

			it('using more than maximum should fail', function (done) {
				transaction.amount = Number(new BigNumber(constants.totalAmount) + 1);

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.have.string('Invalid transaction body - Failed to validate transaction schema: Value '+transaction.amount+' is greater than maximum 10000000000000000');
					badTransactions.push(transaction);
					done();
				});
			});
		});

		describe('sending transactions with wrong FEE values', function () {

			it('using null should fail', function (done) {
				transaction.fee = null;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction fee');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using undefined should fail', function (done) {
				transaction.fee = undefined;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction fee');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using NaN should fail', function (done) {
				transaction.fee = NaN;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction fee');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using string should fail', function (done) {
				transaction.fee = '';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					// TODO
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type string');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using array should fail', function (done) {
				transaction.fee = [];

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					// TODO
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type array');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using object should fail', function (done) {
				transaction.fee = {};

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type object');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using negative integer should fail', function (done) {
				transaction.fee = -1;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.match(/Invalid transaction body - Failed to validate transaction schema: Value -1 is less than minimum/);
					done();
					badTransactions.push(transaction);
				});
			});

			it('using float should fail', function (done) {
				transaction.fee = 1.2;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.match(/Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type number/);
					badTransactions.push(transaction);
					done();
				});
			});

			it('using negative float should fail', function (done) {
				transaction.fee = -1.2;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.match(/Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type number/);
					badTransactions.push(transaction);
					done();
				});
			});

			it('using more than maximum should fail', function (done) {
				transaction.fee = Number(new BigNumber(constants.totalAmount)+ 1);
				console.log(transaction.fee);
				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.have.string('Invalid transaction body - Failed to validate transaction schema: Value '+transaction.fee+' is greater than maximum 10000000000000000');
					badTransactions.push(transaction);
					done();
				});
			});
		});

		describe('sending transactions with wrong RECIPIENTID values', function () {

			it('using null should fail', function (done) {
				transaction.recipientId = null;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction id');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using undefined should fail', function (done) {
				transaction.recipientId = undefined;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction id');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using NaN should fail', function (done) {
				transaction.recipientId = NaN;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction id');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using integer should fail', function (done) {
				transaction.recipientId = 1;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type integer');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using float should fail', function (done) {
				transaction.recipientId = 1.2;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type number');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using array should fail', function (done) {
				transaction.recipientId = [];

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type array');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using object should fail', function (done) {
				transaction.recipientId = {};

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type object');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using string with bad format should fail', function (done) {
				transaction.recipientId = '15738697512051092602'; //Address without L invalid

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: Object didn't pass validation for format address: /);
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using string smaller than expected should fail', function (done) {
				transaction.recipientId = '';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: String is too short /);
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using string with well format but bigger than expected should fail', function (done) {
				transaction.recipientId = Array(22+1).join('1')+'L'; //more characters than allowed

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: String is too long /);
					badTransactions.push(transaction);
					done();
				}, true);
			});
		});

		describe('sending transactions with wrong TIMESTAMP values', function () {

			it('using null should fail', function (done) {
				transaction.timestamp = null;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Missing required property: timestamp');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using undefined should fail', function (done) {
				transaction.timestamp = undefined;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Missing required property: timestamp');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using NaN should fail', function (done) {
				transaction.timestamp = NaN;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Missing required property: timestamp');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using string should fail', function (done) {
				transaction.timestamp = '';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type string');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using array should fail', function (done) {
				transaction.timestamp = [];

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type array');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using object should fail', function (done) {
				transaction.timestamp = {};

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type object');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using negative integer should fail', function (done) {
				transaction.timestamp = -1;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.be.equal('Invalid transaction id');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using float should fail', function (done) {
				transaction.timestamp = 1.2;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type number');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using negative float should fail', function (done) {
				transaction.timestamp = -1.2;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type number');
					badTransactions.push(transaction);
					done();
				}, true);
			});
		});

		describe('sending transactions with wrong SENDERPUBLICKEY values', function () {

			it('using null should fail', function (done) {
				transaction.senderPublicKey = null;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Missing required property: senderPublicKey');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using undefined should fail', function (done) {
				transaction.senderPublicKey = undefined;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Missing required property: senderPublicKey');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using NaN should fail', function (done) {
				transaction.senderPublicKey = NaN;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Missing required property: senderPublicKey');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using integer should fail', function (done) {
				transaction.senderPublicKey = 1;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type integer');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using float should fail', function (done) {
				transaction.senderPublicKey = 1.2;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type number');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using array should fail', function (done) {
				transaction.senderPublicKey = [];

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type array');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using object should fail', function (done) {
				transaction.senderPublicKey = {};

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type object');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using string with bad format should fail', function (done) {
				transaction.senderPublicKey = '15738697512051092602'; //Address without L

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: Object didn't pass validation for format publicKey: /);
					badTransactions.push(transaction);
					done();
				}, true);
			});
		});

		describe('sending transactions with wrong SIGNATURE values', function () {

			it('using null should fail', function (done) {
				transaction.signature = null;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Missing required property: signature');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using undefined should fail', function (done) {
				transaction.signature = undefined;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Missing required property: signature');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using NaN should fail', function (done) {
				transaction.signature = NaN;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Missing required property: signature');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using integer should fail', function (done) {
				transaction.signature = 1;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type integer');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using float should fail', function (done) {
				transaction.signature = 1.2;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type number');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using array should fail', function (done) {
				transaction.signature = [];

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type array');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using object should fail', function (done) {
				transaction.signature = {};

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type object');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using string with bad format should fail', function (done) {
				transaction.signature = 'wrong signature';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: Object didn't pass validation for format signature: /);
					badTransactions.push(transaction);
					done();
				}, true);
			});
		});

		describe('sending transactions with wrong ID values', function () {

			it('using null should be OK', function (done) {
				transaction.id = null;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.not.null;
					transaction.id = res.transactionId;
					goodTransactions.push(transaction);
					done();
				}, true);
			});

			it('using undefined should be OK', function (done) {
				transaction.id = undefined;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.not.null;
					transaction.id = res.transactionId;
					goodTransactions.push(transaction);
					done();
				}, true);
			});

			it('using NaN should be OK', function (done) {
				transaction.id = NaN;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.not.null;
					transaction.id = res.transactionId;
					goodTransactions.push(transaction);
					done();
				}, true);
			});

			it('using integer should fail', function (done) {
				transaction.id = 1;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type integer');
					done();
				}, true);
			});

			it('using float should fail', function (done) {
				transaction.id = 1.2;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type number');
					done();
				}, true);
			});

			it('using array should fail', function (done) {
				transaction.id = [];

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type array');
					done();
				}, true);
			});

			it('using object should fail', function (done) {
				transaction.id = {};

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type object');
					done();
				}, true);
			});

			it('using NOT allowed string should fail', function (done) {
				transaction.id = 'a'; //The string id should just contain number chars

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: Object didn't pass validation for format id: /);
					done();
				}, true);
			});

			it('using string smaller than expected recipientId should fail', function (done) {
				transaction.id = '';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: String is too short /);
					done();
				}, true);
			});

			it('using string bigger than expected recipientId should fail', function (done) {
				transaction.recipientId = Array(22+1).join('1')+'L'; //more characters than allowed

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: String is too long /);
					done();
				}, true);
			});
		});
	});

	describe('processing', function () {

		var account = node.randomAccount();
		var goodTransaction = node.randomTx();

		it('using zero amount should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction(account.address, 0, node.gAccount.password);

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/Invalid transaction amount/);
				badTransactions.push(transaction);
				done();
			});
		});

		it('when sender has NO funds should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction('1L', 1, account.password);

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/Account does not have enough LSK: [0-9]+L balance: 0/);
				badTransactions.push(transaction);
				done();
			});
		});

		it('using entire balance should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction(account.address, Math.floor(node.gAccount.balance), node.gAccount.password);

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/^Account does not have enough LSK:/);
				badTransactions.push(transaction);
				done();
			});
		});

		it('sending funds from the genesis account should fail', function (done) {
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
				fee: 10000000
			};

			sendTransaction(signedTransactionFromGenesis, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').equals('Invalid sender. Can not send from genesis account');
				badTransactions.push(signedTransactionFromGenesis);
				done();
			});
		});

		it('when sender has funds should be OK', function (done) {
			sendTransaction(goodTransaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(goodTransaction.id);
				goodTransactions.push(goodTransaction);
				done();
			});
		});

		it('sending transaction with same ID twice should fail', function (done) {
			sendTransaction(goodTransaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/Transaction is already processed: [0-9]+/);
				done();
			});
		});

		it('good transactions should NOT be confirmed before new block', function () {
			return Promise.map(goodTransactions, function (tx){
				return getTransactionPromise(tx.id).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('error').equal('Transaction not found');
				});
			});
		});
	});

	describe('confirmation', function () {

		before(function (done) {
			node.onNewBlock(done);
		});

		it('bad transactions should NOT be confirmed', function () {
			return Promise.map(badTransactions, function (tx){
				return getTransactionPromise(tx.id).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('error').equal('Transaction not found');
				});
			});
		});

		it('good transactions should NOT be UNconfirmed', function () {
			return Promise.map(goodTransactions, function (tx){
				return getUnconfirmedTransactionPromise(tx.id).then(function (res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('error').equal('Transaction not found');
				});
			});
		});

		it('good transactions should be confirmed', function () {
			return Promise.map(goodTransactions, function (tx){
				return getTransactionPromise(tx.id).then(function (res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transaction').to.have.property('id').equal(tx.id);
				});
			});
		});
	});
});
