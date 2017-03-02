'use strict';

var crypto = require('crypto');
var node = require('./../node.js');

var modulesLoader = require('../common/initModule').modulesLoader;
var Account = require('../../logic/account');

function postTransaction (transaction, done) {
	node.post('/peer/transactions', {
		transaction: transaction
	}, done);
}

describe('POST /peer/transactions', function () {

	describe('when two passphrases collide into the same address', function () {

		var collision = {
			address: '13555181540209512417L',
			passphrases: [
				'merry field slogan sibling convince gold coffee town fold glad mix page',
				'annual youth lift quote off olive uncle town chief poverty extend series'
			]
		};

		before(function (done) {
			modulesLoader.initLogicWithDb(Account, function (err, account) {
				if (err) {
					return done(err);
				}
				account.remove(collision.address, function (err, res) {
					node.expect(err).to.not.exist;
					done();
				});
			});
		});

		before(function (done) {
			// Send funds to collision account
			var transaction = node.lisk.transaction.createTransaction(collision.address, 220000000, node.gAccount.password);
			postTransaction(transaction, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.onNewBlock(done);
			});
		});

		describe('when transaction is invalid', function () {

			it('should fail for passphrase two', function (done) {
				var transaction = node.lisk.transaction.createTransaction(node.gAccount.address, 100000000, collision.passphrases[1]);
				transaction.signature = crypto.randomBytes(64).toString('hex');
				transaction.id = node.lisk.crypto.getId(transaction);

				postTransaction(transaction, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('message').to.equal('Failed to verify signature');
					done();
				});
			});

			it('should fail for passphrase one', function (done) {
				var transaction = node.lisk.transaction.createTransaction(node.gAccount.address, 100000000, collision.passphrases[0]);
				transaction.signature = crypto.randomBytes(64).toString('hex');
				transaction.id = node.lisk.crypto.getId(transaction);

				postTransaction(transaction, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('message').to.equal('Failed to verify signature');
					done();
				});
			});
		});

		describe('when transaction is valid', function () {

			beforeEach(function (done) {
				node.onNewBlock(done);
			});

			it('should be ok for passphrase one', function (done) {
				var transaction = node.lisk.transaction.createTransaction(node.gAccount.address, 100000000, collision.passphrases[0]);

				postTransaction(transaction, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					done();
				});
			});

			it('should fail for passphrase two', function (done) {
				var transaction = node.lisk.transaction.createTransaction(node.gAccount.address, 100000000, collision.passphrases[1]);

				postTransaction(transaction, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.not.ok;
					node.expect(res.body).to.have.property('message').to.equal('Invalid sender public key: b26dd40ba33e4785e49ddc4f106c0493ed00695817235c778f487aea5866400a expected: ce33db918b059a6e99c402963b42cf51c695068007ef01d8c383bb8a41270263');
					done();
				});
			});
		});
	});
});
