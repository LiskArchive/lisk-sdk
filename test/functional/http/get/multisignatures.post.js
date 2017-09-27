'use strict';

var async = require('async');

var constants = require('../../../../helpers/constants');
var node = require('../../../node.js');
var sendLISK = require('../../../common/complexTransactions.js').sendLISK;
var sendTransaction = require('../../../common/complexTransactions.js').sendTransaction;

var multisigAccount = node.randomAccount();
var memberAccount1 = node.randomAccount();
var memberAccount2 = node.randomAccount();

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

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.equal('Invalid member in keysgroup');
			done();
		}, true);
	});

	it('using invalid member in keysgroup should fail', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + node.eAccount.publicKey + 'A', '+' + memberAccount1.publicKey, '+' + memberAccount2.publicKey], 1, 2);

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
 			node.expect(res).to.have.property('message').to.equal('Invalid public key in multisignature keysgroup');
			done();
		}, true);
	});

	it('using empty keysgroup should fail', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, [], 1, 2);

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
 			node.expect(res).to.have.property('message').to.match(/Array is too short \(0\), minimum 1$/);
			done();
		}, true);
	});

	it('using no keysgroup should fail', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + node.eAccount.publicKey, '+' + memberAccount1.publicKey, '+' + memberAccount2.publicKey], 1, 2);

		delete multiSigTx.asset.multisignature.keysgroup;

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
 			node.expect(res).to.have.property('message').to.match(/Missing required property: keysgroup$/);
			done();
		}, true);
	});

	it('using sender in the keysgroup should fail', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + multisigAccount.publicKey, '+' + memberAccount1.publicKey, '+' + memberAccount2.publicKey], 1, 2);

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
 			node.expect(res).to.have.property('message').to.equal('Invalid multisignature keysgroup. Can not contain sender');
			done();
		}, true);
	});

	it('using no math operator in keysgroup should fail', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, [node.eAccount.publicKey], 1, 1);

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.equal('Invalid math operator in multisignature keysgroup');
			done();
		}, true);
	});

	it('using invalid math operator in keysgroup should fail', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['-' + node.eAccount.publicKey], 1, 1);

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.equal('Invalid math operator in multisignature keysgroup');
			done();
		}, true);
	});

	it('using same member twice should fail', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + memberAccount1.publicKey, '+' + memberAccount1.publicKey, '+' + memberAccount2.publicKey], 1, 2);

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.equal('Encountered duplicate public key in multisignature keysgroup');
			done();
		}, true);
	});

	it('using keysgroup length greater than maximum acceptable length should fail', function (done) {
		var keysgroup = Array.apply(null, new Array(constants.multisigConstraints.keysgroup.maxItems + 1)).map(function () {
			return '+' + node.lisk.crypto.getKeys(node.randomPassword()).publicKey;
		});

		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, keysgroup, 1, 2);

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.match(/Array is too long \(16\), maximum 15$/);
			done();
		}, true);
	});

	it('using string keysgroup should fail', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + node.eAccount.publicKey, '+' + memberAccount1.publicKey, '+' + memberAccount2.publicKey], 1, 2);

		multiSigTx.asset.multisignature.keysgroup = 'invalid';

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.match(/Expected type array but found type string$/);
			done();
		}, true);
	});

	it('using no lifetime', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + node.eAccount.publicKey, '+' + memberAccount1.publicKey, '+' + memberAccount2.publicKey], 1, 2);

		delete multiSigTx.asset.multisignature.lifetime;

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.match(/Missing required property: lifetime$/);
			done();
		}, true);
	});

	it('using string lifetime should fail', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + node.eAccount.publicKey, '+' + memberAccount1.publicKey, '+' + memberAccount2.publicKey], 1, 2);

		multiSigTx.asset.multisignature.lifetime = 'inv4lid';

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.match(/Expected type integer but found type string$/);
			done();
		}, true);
	});

	it('using lifetime greater than maximum allowed should fail', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + node.eAccount.publicKey, '+' + memberAccount1.publicKey, '+' + memberAccount2.publicKey], constants.multisigConstraints.lifetime.maximum + 1, 2);

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.match(/Value 73 is greater than maximum 72$/);
			done();
		}, true);
	});

	it('using lifetime == 0 should fail', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + node.eAccount.publicKey, '+' + memberAccount1.publicKey, '+' + memberAccount2.publicKey], 0, 2);

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.match(/Value 0 is less than minimum 1$/);
			done();
		}, true);
	});

	it('using negative lifetime should fail', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + node.eAccount.publicKey, '+' + memberAccount1.publicKey, '+' + memberAccount2.publicKey], -1, 2);

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.match(/Value -1 is less than minimum 1$/);
			done();
		}, true);
	});

	it('using no min should fail', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + node.eAccount.publicKey, '+' + memberAccount1.publicKey, '+' + memberAccount2.publicKey], 1, 2);

		delete multiSigTx.asset.multisignature.min;

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.match(/Missing required property: min$/);
			done();
		}, true);
	});

	it('using string min should fail', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + node.eAccount.publicKey, '+' + memberAccount1.publicKey, '+' + memberAccount2.publicKey], 1, 2);

		multiSigTx.asset.multisignature.min = 'inv4lid';

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.match(/Expected type integer but found type string$/);
			done();
		}, true);
	});

	it('using min greater than keysgroup size plus 1 should fail', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + node.eAccount.publicKey, '+' + memberAccount1.publicKey, '+' + memberAccount2.publicKey], 1, 5);

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.equal('Invalid multisignature min. Must be less than or equal to keysgroup size');
			done();
		}, true);
	});

	it('using min greater than maximum acceptable should fail', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + node.eAccount.publicKey, '+' + memberAccount1.publicKey, '+' + memberAccount2.publicKey], 1, 16);

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.match(/Value 16 is greater than maximum 15$/);
			done();
		}, true);
	});

	it('using min less than minimum acceptable should fail', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + node.eAccount.publicKey, '+' + memberAccount1.publicKey, '+' + memberAccount2.publicKey], 1, 0);

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.match(/Value 0 is less than minimum 1$/);
			done();
		}, true);
	});

	it('using negative min should fail', function (done) {
		var multiSigTx = node.lisk.multisignature.createMultisignature(multisigAccount.password, null, ['+' + node.eAccount.publicKey, '+' + memberAccount1.publicKey, '+' + memberAccount2.publicKey], 1, -1);

		sendTransaction(multiSigTx, function (err, res) {
			node.expect(res).to.have.property('success').to.be.not.ok;
			node.expect(res).to.have.property('message').to.match(/Value -1 is less than minimum 1$/);
			done();
		}, true);
	});
});
