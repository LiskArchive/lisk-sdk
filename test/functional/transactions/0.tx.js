'use strict';

var _ = require('lodash');
var crypto = require('crypto');

var node = require('../../node.js');
var http = require('../../common/httpCommunication.js');
var sendTransaction = require('../../common/complexTransactions.js').sendTransaction;

function getTransaction (transaction, cb) {
	http.get('/api/transactions/get?id='+transaction, function (err, res) {
		if (err) {
			return cb(err);
		}
		node.expect(res.body).to.have.property('success');
		cb(null, res.body);
	});
}

describe('postTransactions type 0', function () {

	var badTransactions = [];
	var goodTransactions = [];

	describe('schema', function () {

		var transaction;

		beforeEach(function () {
			transaction = node.randomTx();
		});

		it('using null transaction should fail', function (done) {
			sendTransaction(null, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
				done();
			}, true);
		});

		it('using empty transaction should fail', function (done) {
			sendTransaction({}, function (err, res) {
				node.expect(res).to.have.property('success').not.to.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Empty trs passed');
				done();
			}, true);
		});

		it('using undefined transaction should fail', function (done) {
			sendTransaction(null, function (err, res) {
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

		it('using NOT defined type should fail', function (done) {
			transaction.type = 100;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Unknown transaction type/);
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using null type should fail', function (done) {
			transaction.type = null;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Unknown transaction type null');
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using undefined type should fail', function (done) {
			transaction.type = undefined;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Unknown transaction type/);
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using NOT integer type should fail', function (done) {
			transaction.type = '1';

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type/);
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using null amount should fail', function (done) {
			transaction.amount = null;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				// TODO
				node.expect(res).to.have.property('message').to.equal('Failed to get transaction id');
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using undefined amount should fail', function (done) {
			transaction.amount = undefined;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				// TODO
				node.expect(res).to.have.property('message').to.equal('Failed to get transaction id');
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using NOT integer amount should fail', function (done) {
			transaction.amount = 'string';

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type string');
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using negative amount should fail', function (done) {
			transaction.amount = -1;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/Invalid transaction body - Failed to validate transaction schema: Value -1 is less than minimum/);
				done();
			});
			badTransactions.push(transaction);
		});

		it('using float amount should fail', function (done) {
			transaction.amount = 1.2;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type number/);
				done();
			});
			badTransactions.push(transaction);
		});

		it('using positive overflown amount should fail', function (done) {
			transaction.amount = 1298231812939123812939123912939123912931823912931823912903182309123912830123981283012931283910231203;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.have.string('Invalid transaction body - Failed to validate transaction schema: Value 1.2982318129391238e+99 is greater than maximum 10000000000000000');
				done();
			});
			badTransactions.push(transaction);
		});

		it('using null fee should fail', function (done) {
			transaction.fee = null;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction fee');
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using undefined fee should fail', function (done) {
			transaction.fee = undefined;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction fee');
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using NOT integer fee should fail', function (done) {
			transaction.fee = 'string';

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				// TODO
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type string');
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using negative fee should fail', function (done) {
			transaction.fee = -1;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/Invalid transaction body - Failed to validate transaction schema: Value -1 is less than minimum/);
				done();
			});
			badTransactions.push(transaction);
		});

		it('using float fee should fail', function (done) {
			transaction.fee = 1.2;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type number/);
				done();
			});
			badTransactions.push(transaction);
		});

		it('using positive overflown fee should fail', function (done) {
			transaction.fee = 1298231812939123812939123912939123912931823912931823912903182309123912830123981283012931283910231203;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.have.string('Invalid transaction body - Failed to validate transaction schema: Value 1.2982318129391238e+99 is greater than maximum 10000000000000000');
				done();
			});
			badTransactions.push(transaction);
		});

		it('using null recipientId should fail', function (done) {
			transaction.recipientId = null;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				// TODO
				node.expect(res).to.have.property('message').to.equal('Invalid transaction id');
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using undefined recipientId should fail', function (done) {
			transaction.recipientId = undefined;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				// TODO
				node.expect(res).to.have.property('message').to.equal('Invalid transaction id');
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using NOT string recipientId should fail', function (done) {
			transaction.recipientId = 1;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: Expected type string but found type /);
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using NOT allowed string recipientId should fail', function (done) {
			transaction.recipientId = '15738697512051092602'; //Address without L invalid

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: Object didn't pass validation for format address: /);
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using string recipientId smaller than expected recipientId should fail', function (done) {
			transaction.recipientId = '';

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: String is too short /);
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using string recipientId bigger than expected recipientId should fail', function (done) {
			transaction.recipientId = '15738697512051091121324260215738697512051092602L'; //more characters than allowed

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: String is too long /);
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using null timestamp should fail', function (done) {
			transaction.timestamp = null;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Missing required property: timestamp');
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using undefined timestamp should fail', function (done) {
			transaction.timestamp = undefined;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Missing required property: timestamp');
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using NOT integer timestamp should fail', function (done) {
			transaction.timestamp = 'string';

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: Expected type integer but found type/);
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using negative timestamp should fail', function (done) {
			transaction.timestamp = -1;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.be.equal('Invalid transaction id');
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using positive overflown timestamp should fail', function (done) {
			transaction.timestamp = 1298231812939123812939123912939123912931823912931823912903182309123912830123981283012931283910231203;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.be.equal('Invalid transaction id');
				done();
			});
			badTransactions.push(transaction);
		});

		it('using null senderPublicKey should fail', function (done) {
			transaction.senderPublicKey = null;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Missing required property: senderPublicKey');
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using undefined senderPublicKey should fail', function (done) {
			transaction.senderPublicKey = undefined;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Missing required property: senderPublicKey');
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using NOT string senderPublicKey should fail', function (done) {
			transaction.senderPublicKey = 1;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: Expected type string but found type /);
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using NOT allowed string senderPublicKey should fail', function (done) {
			transaction.senderPublicKey = '15738697512051092602'; //Address without L

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: Object didn't pass validation for format publicKey: /);
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using null signature should fail', function (done) {
			transaction.signature = null;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Missing required property: signature');
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using undefined signature should fail', function (done) {
			transaction.signature = undefined;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.equal('Invalid transaction body - Failed to validate transaction schema: Missing required property: signature');
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using NOT string signature should fail', function (done) {
			transaction.signature = 1;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: Expected type string but found type /);
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using NOT allowed string senderPublicKey should fail', function (done) {
			transaction.signature = 'wrong signature';

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: Object didn't pass validation for format signature: /);
				done();
			}, true);
			badTransactions.push(transaction);
		});

		it('using null id should be OK', function (done) {
			transaction.id = null;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.not.null;
				transaction.id = res.transactionId;
				done();
			}, true);
			goodTransactions.push(transaction);
		});

		it('using undefined id should be OK', function (done) {
			transaction.id = undefined;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.not.null;
				transaction.id = res.transactionId;
				done();
			}, true);
			goodTransactions.push(transaction);
		});

		it('using NOT string id should fail', function (done) {
			transaction.id = 1;

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: Expected type string but found type /);
				done();
			}, true);
		});

		it('using NOT allowed string id should fail', function (done) {
			transaction.id = 'a'; //The string id should just contain number chars

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: Object didn't pass validation for format id: /);
				done();
			}, true);
		});

		it('using string id smaller than expected recipientId should fail', function (done) {
			transaction.id = '';

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: String is too short /);
				done();
			}, true);
		});

		it('using string id bigger than expected recipientId should fail', function (done) {
			transaction.id = '123546547586796785743212346457568769785746352'; //30 characters

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.not.be.ok;
				node.expect(res).to.have.property('message').to.match(/^Invalid transaction body - Failed to validate transaction schema: String is too long /);
				done();
			}, true);
			badTransactions.push(transaction);
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
				done();
			});
			badTransactions.push(transaction);
		});

		it('when sender has NO funds should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction('1L', 1, account.password);

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/Account does not have enough LSK: [0-9]+L balance: 0/);
				done();
			});
			badTransactions.push(transaction);
		});

		it('using entire balance should fail', function (done) {
			var transaction = node.lisk.transaction.createTransaction(account.address, Math.floor(node.gAccount.balance), node.gAccount.password);

			sendTransaction(transaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/^Account does not have enough LSK:/);
				done();
			});
			badTransactions.push(transaction);
		});

		it('when sending from the genesis account should fail', function (done) {
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
				done();
			});
			badTransactions.push(signedTransactionFromGenesis);
		});

		it('when sender has funds should be OK', function (done) {
			sendTransaction(goodTransaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.ok;
				node.expect(res).to.have.property('transactionId').to.equal(goodTransaction.id);
				done();
			});
			goodTransactions.push(goodTransaction);
		});

		it('using already processed transaction should fail', function (done) {
			sendTransaction(goodTransaction, function (err, res) {
				node.expect(res).to.have.property('success').to.be.not.ok;
				node.expect(res).to.have.property('message').to.match(/Transaction is already processed: [0-9]+/);
				done();
			});
		});

		it('well processed transactions should have NOT been confirmed before new block', function (done) {
			for (var tx in goodTransactions){
				getTransaction(goodTransactions[tx].id, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('error').equal('Transaction not found');
				});
			}
			done();
		});
	});

	describe('confirmation', function () {

		before(function (done) {
			node.onNewBlock(function () {
				done();
			});
		});

		it('bad and malformed transactions should NOT have been confirmed', function (done) {
			for (var tx in badTransactions){
				getTransaction(badTransactions[tx].id, function (err, res) {
					node.expect(res).to.have.property('success').to.be.not.ok;
					node.expect(res).to.have.property('error').equal('Transaction not found');
				});
			}
			done();
		});

		it('well processed transactions should have been confirmed', function (done) {
			for (var tx in goodTransactions){
				getTransaction(goodTransactions[tx].id, function (err, res) {
					node.expect(res).to.have.property('success').to.be.ok;
					node.expect(res).to.have.property('transaction').to.have.property('id').equal(goodTransactions[tx].id);
				});
			}
			done();
		});
	});
});
