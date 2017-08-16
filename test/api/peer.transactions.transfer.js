var node = require('./../node.js');
var expect = require('chai').expect;

describe('POST /peer/transactions', function () {

	var account = node.randomAccount();

	function addTransaction (transaction, done) {
		node.post('/peer/transactions', {
			transaction: transaction
		}, function (err, res) {
			done(err, res.body);
		});
	}

	function getTransactionById (id, done) {
		node.get('/api/transactions/get?id=' + id, function (err, res) {
			done(err, res.body);
		});
	}

	before(function (done) {
		// Transfer LSK to all accounts.
		var trs = node.lisk.transaction.createTransaction(account.address, 10000000000000, node.gAccount.password);

		addTransaction(trs, function (err) {
			expect(err).to.not.exist;
			node.onNewBlock(done);
		});
	});

	it('should return error when data field length is greater than 64 characters', function (done) {
		var data = new Array(65).fill('x').join('');
		var trs = node.lisk.transaction.createTransaction(node.randomAccount().address, 1000, account.password, null, data);

		addTransaction(trs, function (err, res) {
			expect(err).to.not.exist;
			expect(res.success).to.equal(false);
			expect(res.message).to.equal('Invalid transaction body - Failed to validate transfer schema: String is too long (65 chars), maximum 64');
			done();
		});
	});

	it('should return error when data field is not a string', function (done) {
		var data = 0;
		var trs = node.lisk.transaction.createTransaction(node.randomAccount().address, 1000, account.password, null, data);
		trs.asset.data = 0;

		addTransaction(trs, function (err, res) {
			expect(err).to.not.exist;
			expect(res.success).to.equal(false);
			expect(res.message).to.equal('Invalid transaction body - Failed to validate transfer schema: Expected type string but found type integer');
			done();
		});
	});

	it('should create transaction with empty asset', function (done) {
		var trs = node.lisk.transaction.createTransaction(node.randomAccount().address, 1000, account.password);

		addTransaction(trs, function (err, res) {
			expect(err).to.not.exist;

			var transactionId = res.transactionId;

			node.onNewBlock(function (err) {
				getTransactionById(transactionId, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transaction').which.is.an('object');
					expect(res.transaction.id).to.equal(trs.id);
					expect(res.transaction.amount).to.equal(trs.amount);
					expect(res.transaction.asset).to.eql({});
					expect(res.transaction.fee).to.equal(trs.fee);
					expect(res.transaction.type).to.equal(trs.type);
					done();
				});
			});
		});
	});

	it('should return error when data field characters length is equal to 0', function (done) {
		var trs = node.lisk.transaction.createTransaction(node.randomAccount().address, 1000, account.password, null);
		trs.asset.data = '';

		addTransaction(trs, function (err, res) {
			expect(err).to.not.exist;
			expect(res.success).to.equal(false);
			expect(res.message).to.equal('Invalid transaction body - Failed to validate transfer schema: String is too short (0 chars), minimum 1');
			done();
		});
	});

	it('should be able to create transaction with 0 value', function (done) {
		var data = '0';
		var trs = node.lisk.transaction.createTransaction(node.randomAccount().address, 1000, account.password, null, data);

		addTransaction(trs, function (err, res) {
			expect(err).to.not.exist;

			var transactionId = res.transactionId;

			node.onNewBlock(function (err) {
				getTransactionById(transactionId, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transaction').which.is.an('object');
					expect(res.transaction.id).to.equal(trs.id);
					expect(res.transaction.amount).to.equal(trs.amount);
					expect(res.transaction.asset.data).to.equal(data);
					expect(res.transaction.fee).to.equal(trs.fee);
					expect(res.transaction.type).to.equal(trs.type);
					done();
				});
			});
		});
	});

	it('should create transaction with utf-8 string', function (done) {
		var data = '綾波レイ';
		var trs = node.lisk.transaction.createTransaction(node.randomAccount().address, 1000, account.password, null, data);

		addTransaction(trs, function (err, res) {
			expect(err).to.not.exist;

			var transactionId = res.transactionId;

			node.onNewBlock(function (err) {
				getTransactionById(transactionId, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transaction').which.is.an('object');
					expect(res.transaction.id).to.equal(trs.id);
					expect(res.transaction.amount).to.equal(trs.amount);
					expect(res.transaction.asset.data).to.equal(data);
					expect(res.transaction.fee).to.equal(trs.fee);
					expect(res.transaction.type).to.equal(trs.type);
					done();
				});
			});
		});
	});

	it('should create transaction with empty asset when data field is set to undefined', function (done) {
		var data = undefined;
		var trs = node.lisk.transaction.createTransaction(node.randomAccount().address, 1000, account.password, null, data);
		trs.asset.data = data;

		addTransaction(trs, function (err, res) { expect(err).to.not.exist;
			var transactionId = res.transactionId;

			node.onNewBlock(function (err) {
				getTransactionById(transactionId, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transaction').which.is.an('object');
					expect(res.transaction.id).to.equal(trs.id);
					expect(res.transaction.amount).to.equal(trs.amount);
					expect(res.transaction.asset).to.eql({});
					expect(res.transaction.fee).to.equal(trs.fee);
					expect(res.transaction.type).to.equal(trs.type);
					done();
				});
			});
		});
	});

	it('should create transaction with empty asset when data field is set to null', function (done) {
		var data = null;
		var trs = node.lisk.transaction.createTransaction(node.randomAccount().address, 1000, account.password, null, data);

		addTransaction(trs, function (err, res) {
			expect(err).to.not.exist;

			var transactionId = res.transactionId;

			node.onNewBlock(function (err) {
				getTransactionById(transactionId, function (err, res) {
					expect(err).to.not.exist;
					expect(res).to.have.property('transaction').which.is.an('object');
					expect(res.transaction.id).to.equal(trs.id);
					expect(res.transaction.amount).to.equal(trs.amount);
					expect(res.transaction.asset).to.eql({});
					expect(res.transaction.fee).to.equal(trs.fee);
					expect(res.transaction.type).to.equal(trs.type);
					done();
				});
			});
		});
	});
});
