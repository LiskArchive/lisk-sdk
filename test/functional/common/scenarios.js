'use strict';

var lisk = require('lisk-js');

var accountFixtures = require('../../fixtures/accounts');

var randomUtil = require('../../common/utils/random');

function Multisig (options) {
	if (!options) {
		var options = {};
	}

	this.account = randomUtil.account();
	this.members = [];
	this.keysgroup = [];

	if (!options.members) {
		options.members = 3;
	}
	var i, auxAccount;
	for (i = 0; i < options.members - 1; i++) {
		auxAccount = randomUtil.account();
		this.members.push(auxAccount);
		this.keysgroup.push('+' + auxAccount.publicKey);
	}

	this.min = options.min || options.members - 1;
	this.lifetime = options.lifetime || 1;
	this.amount = options.amount || 100000000000;

	this.multiSigTransaction = lisk.multisignature.createMultisignature(this.account.password, null, this.keysgroup, this.lifetime, this.min);
	this.creditTransaction = lisk.transaction.createTransaction(this.account.address, this.amount, accountFixtures.genesis.password);
	this.secondSignatureTransaction = lisk.signature.createSignature(this.account.password, this.account.secondPassword);
}

module.exports = {
	Multisig: Multisig
};