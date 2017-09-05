'use strict';

var async = require('async');
var node = require('./../node.js');
var sendLISK = require('../common/complexTransactions.js').sendLISK;
var sendTransaction = require('../common/complexTransactions.js').sendTransaction;

var multisigAccount = node.randomAccount();

before(function (done) {
	sendLISK({
		secret: node.gAccount.password,
		amount: node.randomLISK(),
		address: multisigAccount.address
	}, function (err, res) {
		node.expect(res).to.have.property('success').to.be.ok;
		node.expect(res).to.have.property('transactionId').that.is.not.empty;
		node.onNewBlock(done);
	});
});

describe('POST /api/multisignatures', function () {

	it('using null member in keysgroup should fail', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + node.eAccount.publicKey, null], 1, 2);

		sendTransaction(multiSigTx, function (res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.equal('Invalid member in keysgroup');
			done();
		});
	});

	it('using invalid member in keysgroup should fail', function (done) {
		var memberAccount1 = node.randomAccount();
		var memberAccount2 = node.randomAccount();

		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + node.eAccount.publicKey + 'A', '+' + memberAccount1.publicKey, '+' + memberAccount2.publicKey], 1, 2);

		sendTransaction(multiSigTx, function (res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
 			node.expect(res).to.have.property('message').to.equal('Invalid public key in multisignature keysgroup');
			done();
		});
	});
});
