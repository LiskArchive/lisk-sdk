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

const randomstring = require('randomstring');
const BigNum = require('@liskhq/bignum');
const {
	getKeys,
	getAddressFromPassphrase,
	getNetworkIdentifier,
} = require('@liskhq/lisk-cryptography');
const { transfer } = require('@liskhq/lisk-transactions');
const { Mnemonic } = require('@liskhq/lisk-passphrase');
const genesisBlock = require('../fixtures/genesis_block.json');
const { genesisAccount } = require('../fixtures/default_account');

const networkIdentifier = getNetworkIdentifier(
	genesisBlock.payloadHash,
	'Lisk',
);

const delegateName = () => {
	const randomLetter = randomstring.generate({
		length: 1,
		charset: 'alphabetic',
		capitalization: 'lowercase',
	});
	const custom = 'abcdefghijklmnopqrstuvwxyz0123456789!@$&_.';
	const username = randomstring.generate({
		length: 19,
		charset: custom,
	});

	return randomLetter.concat(username);
};

const account = (balance = '0', nonDelegate = false) => {
	const passphrase = Mnemonic.generateMnemonic();
	const secondPassphrase = Mnemonic.generateMnemonic();
	return {
		balance,
		passphrase,
		keypair: getKeys(passphrase),
		secondPassphrase,
		username: nonDelegate ? '' : delegateName(),
		publicKey: getKeys(passphrase).publicKey,
		address: getAddressFromPassphrase(passphrase),
		secondPublicKey: getKeys(secondPassphrase).publicKey,
	};
};

const transaction = offset =>
	transfer({
		networkIdentifier,
		amount: '1',
		passphrase: genesisAccount.passphrase,
		recipientId: account().address,
		timeOffset: offset,
	});

const transferInstance = offset => {
	const tx = transaction(offset);
	return {
		...tx,
		fee: new BigNum(tx.fee),
		asset: {
			...tx.asset,
			amount: new BigNum(tx.asset.amount),
		},
	};
};

module.exports = {
	account,
	transaction,
	transferInstance,
};
