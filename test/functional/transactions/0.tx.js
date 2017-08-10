'use strict';

var BigNumber = require('../../../helpers/bignum');

var node = require('../../node');
var shared = require('./shared');
var constants = require('../../../helpers/constants');

var sendTransaction = require('../../common/complexTransactions').sendTransaction;

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

			it('using empty string should fail', function (done) {
				sendTransaction('', function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
					done();
				}, true);
			});

			it('using empty array should fail', function (done) {
				sendTransaction([], function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
					done();
				}, true);
			});

			it('using empty object should fail', function (done) {
				sendTransaction({}, function (err, res) {
					node.expect(res).to.have.property('success').not.to.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
					done();
				}, true);
			});
		});

		describe('sending transactions with invalid type values', function () {

			it('using null should fail', function (done) {
				transaction.type = null;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Unknown transaction type null');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('without property should fail', function (done) {
				delete transaction.type;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Unknown transaction type undefined');
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

			it('using empty string should fail', function (done) {
				transaction.type = '';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Unknown transaction type ');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using not empty string should fail', function (done) {
				transaction.type = '1';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type string');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty array should fail', function (done) {
				transaction.type = [];

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Unknown transaction type ');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty object should fail', function (done) {
				transaction.type = {};

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Unknown transaction type [object Object]');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using unsupported type should fail', function (done) {
				transaction.type = 8;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Unknown transaction type '+transaction.type);
					badTransactions.push(transaction);
					done();
				}, true);
			});
		});

		describe('sending transactions with invalid amount values', function () {

			it('using null should fail', function (done) {
				transaction.amount = null;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Failed to get transaction id');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('without property should fail', function (done) {
				delete transaction.amount;

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

			it('using empty string should fail', function (done) {
				transaction.amount = '';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type string');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty array should fail', function (done) {
				transaction.amount = [];

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type array');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty object should fail', function (done) {
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
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Value -1 is less than minimum 0');
					badTransactions.push(transaction);
					done();
				});
			});

			it('using float should fail', function (done) {
				transaction.amount = 1.2;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type number');
					badTransactions.push(transaction);
					done();
				});
			});

			it('using negative float should fail', function (done) {
				transaction.amount = -1.2;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type number');
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

		describe('sending transactions with invalid fee values', function () {

			it('using null should fail', function (done) {
				transaction.fee = null;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction fee');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('without property should fail', function (done) {
				delete transaction.fee;

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

			it('using empty string should fail', function (done) {
				transaction.fee = '';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type string');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty array should fail', function (done) {
				transaction.fee = [];

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type array');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty object should fail', function (done) {
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
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Value -1 is less than minimum 0');
					done();
					badTransactions.push(transaction);
				});
			});

			it('using float should fail', function (done) {
				transaction.fee = 1.2;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type number');
					badTransactions.push(transaction);
					done();
				});
			});

			it('using negative float should fail', function (done) {
				transaction.fee = -1.2;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type number');
					badTransactions.push(transaction);
					done();
				});
			});

			it('using more than maximum should fail', function (done) {
				transaction.fee = Number(new BigNumber(constants.totalAmount) + 1);

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('message').to.have.string('Invalid transaction body - Failed to validate transaction schema: Value '+transaction.fee+' is greater than maximum 10000000000000000');
					badTransactions.push(transaction);
					done();
				});
			});
		});

		describe('sending transactions with invalid recipientId values', function () {

			it('using null should fail', function (done) {
				transaction.recipientId = null;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction id');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('without property should fail', function (done) {
				delete transaction.recipientId;

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

			it('using empty array should fail', function (done) {
				transaction.recipientId = [];

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type array');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty object should fail', function (done) {
				transaction.recipientId = {};

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type object');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using malformed address should fail', function (done) {
				transaction.recipientId = '15738697512051092602.L';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Object didn\'t pass validation for format address: '+transaction.recipientId);
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using address without letter L at the end should fail', function (done) {
				transaction.recipientId = '15738697512051092602';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Object didn\'t pass validation for format address: '+transaction.recipientId);
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using address shorter than expected should fail', function (done) {
				transaction.recipientId = '';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: String is too short (0 chars), minimum 1');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using address with good format but longer than expected should fail', function (done) {
				transaction.recipientId = Array(22).fill('1').join('') + 'L';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: String is too long (23 chars), maximum 22');
					badTransactions.push(transaction);
					done();
				}, true);
			});
		});

		describe('sending transactions with invalid timestamp values', function () {

			it('using null should fail', function (done) {
				transaction.timestamp = null;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Missing required property: timestamp');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('without property should fail', function (done) {
				delete transaction.timestamp;

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

			it('using empty string should fail', function (done) {
				transaction.timestamp = '';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type string');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty array should fail', function (done) {
				transaction.timestamp = [];

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type array');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty object should fail', function (done) {
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

		describe('sending transactions with invalid senderPublicKey values', function () {

			it('using null should fail', function (done) {
				transaction.senderPublicKey = null;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Missing required property: senderPublicKey');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('without property should fail', function (done) {
				delete transaction.senderPublicKey;

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

			it('using empty array should fail', function (done) {
				transaction.senderPublicKey = [];

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type array');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty object should fail', function (done) {
				transaction.senderPublicKey = {};

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type object');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty string should fail', function (done) {
				transaction.senderPublicKey = '';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid public key');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using invalid public key should fail', function (done) {
				transaction.senderPublicKey = '15738697512051092602.L';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Object didn\'t pass validation for format publicKey: '+transaction.senderPublicKey);
					badTransactions.push(transaction);
					done();
				}, true);
			});
		});

		describe('sending transactions with invalid signature values', function () {

			it('using null should fail', function (done) {
				transaction.signature = null;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Missing required property: signature');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('without property should fail', function (done) {
				delete transaction.signature;

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

			it('using empty array should fail', function (done) {
				transaction.signature = [];

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type array');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty object should fail', function (done) {
				transaction.signature = {};

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type object');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using empty string should fail', function (done) {
				transaction.signature = '';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction id');
					badTransactions.push(transaction);
					done();
				}, true);
			});

			it('using invalid signature should fail', function (done) {
				transaction.signature = 'invalid signature';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Object didn\'t pass validation for format signature: '+transaction.signature);
					badTransactions.push(transaction);
					done();
				}, true);
			});
		});

		describe('sending transactions with invalid id values', function () {

			it('using null should be ok', function (done) {
				transaction.id = null;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.not.null;
					transaction.id = res.transactionId;
					goodTransactions.push(transaction);
					done();
				}, true);
			});

			it('without property should be ok', function (done) {
				delete transaction.id;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.not.null;
					transaction.id = res.transactionId;
					goodTransactions.push(transaction);
					done();
				}, true);
			});

			it('using undefined should be ok', function (done) {
				transaction.id = undefined;

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transactionId').to.not.null;
					transaction.id = res.transactionId;
					goodTransactions.push(transaction);
					done();
				}, true);
			});

			it('using NaN should be ok', function (done) {
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

			it('using empty array should fail', function (done) {
				transaction.id = [];

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type array');
					done();
				}, true);
			});

			it('using empty object should fail', function (done) {
				transaction.id = {};

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type string but found type object');
					done();
				}, true);
			});

			it('using not allowed string should fail', function (done) {
				transaction.id = 'a'; // ID should only contains digits

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Object didn\'t pass validation for format id: '+transaction.id);
					done();
				}, true);
			});

			it('using string shorter than expected recipientId should fail', function (done) {
				transaction.id = '';

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: String is too short (0 chars), minimum 1');
					done();
				}, true);
			});

			it('using string longer than expected id should fail', function (done) {
				transaction.id = Array(21).fill('1').join('');

				sendTransaction(transaction, function (err, res) {
					node.expect(res).to.have.property('success').to.not.be.ok;
					node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: String is too long (21 chars), maximum 20');
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
				node.expect(res).to.have.property('message').to.equal('Invalid transaction amount');
				badTransactions.push(transaction);
				done();
			});
		});

		it('when sender has no funds should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction('1L', 1, account.password);

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Account does not have enough LSK: '+account.address+' balance: 0');
				badTransactions.push(transaction);
				done();
			});
		});

		it('using entire balance should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction(account.address, Math.floor(node.gAccount.balance), node.gAccount.password);

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/^Account does not have enough LSK: [0-9]+L balance: /);
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

		it('when sender has funds should be ok', function (done) {
			sendTransaction(goodTransaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(goodTransaction.id);
				goodTransactions.push(goodTransaction);
				done();
			});
		});

		it('sending transaction with same id twice should fail', function (done) {
			sendTransaction(goodTransaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.equal('Transaction is already processed: '+goodTransaction.id);
				done();
			});
		});
	});

	describe('confirmation', function () {

		shared.confirmationPhase(goodTransactions, badTransactions);
	});
});
