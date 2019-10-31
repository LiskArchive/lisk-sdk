/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

const {
	transfer,
	registerSecondPassphrase,
	MultisignatureTransaction,
} = require('@liskhq/lisk-transactions');
const BigNum = require('@liskhq/bignum');
const accountFixtures = require('../fixtures/accounts');
const randomUtil = require('./utils/random');
const { getNetworkIdentifier } = require('../common/network_identifier');

const networkIdentifier = getNetworkIdentifier(
	__testContext.config.genesisBlock,
);

const { FEES } = global.constants;

function Multisig(options) {
	if (!options) {
		options = {};
	}

	this.account = randomUtil.account();
	this.members = [];
	this.keysgroup = [];

	if (!options.members) {
		options.members = 3;
	}
	let i;
	let auxAccount;
	for (i = 0; i < options.members - 1; i++) {
		auxAccount = randomUtil.account();
		this.members.push(auxAccount);
		this.keysgroup.push(`${auxAccount.publicKey}`);
	}

	this.minimum = options.min || options.members - 1;
	this.lifetime = options.lifetime || 1;
	this.amount = options.amount || 100000000000;

	// TODO: Remove signRawTransaction on lisk-transactions 3.0.0
	const multisigTrs = new MultisignatureTransaction({
		networkIdentifier,
		type: 12,
		amount: '0',
		fee: new BigNum(FEES.MULTISIGNATURE)
			.times(this.keysgroup.length + 1)
			.toString(),
		asset: {
			keysgroup: this.keysgroup.map(key => `+${key}`),
			lifetime: this.lifetime,
			min: this.minimum,
		},
	});

	multisigTrs.sign(this.account.passphrase);

	this.multiSigTransaction = multisigTrs.toJSON();

	// TODO: Remove signRawTransaction on lisk-transactions 3.0.0
	const multisigSecondSignatureTrs = new MultisignatureTransaction({
		networkIdentifier,
		type: 12,
		amount: '0',
		fee: new BigNum(FEES.MULTISIGNATURE)
			.times(this.keysgroup.length + 1)
			.toString(),
		asset: {
			keysgroup: this.keysgroup.map(key => `+${key}`),
			lifetime: this.lifetime,
			min: this.minimum,
		},
	});

	multisigSecondSignatureTrs.sign(
		this.account.passphrase,
		this.account.secondPassphrase,
	);

	this.multiSigSecondSignatureTransaction = multisigTrs.toJSON();

	this.creditTransaction = transfer({
		networkIdentifier,
		amount: this.amount.toString(),
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: this.account.address,
	});
	this.secondSignatureTransaction = registerSecondPassphrase({
		networkIdentifier,
		passphrase: this.account.passphrase,
		secondPassphrase: this.account.secondPassphrase,
	});
}

module.exports = {
	Multisig,
};
