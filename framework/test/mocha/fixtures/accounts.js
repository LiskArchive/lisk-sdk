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

const stampit = require('stampit');
const randomstring = require('randomstring');

const accounts = {};

// Existing delegate account
accounts.existingDelegate = {
	address: '10881167371402274308L',
	publicKey: '32a2f261985252022b8c40b5c64f7588aced08c7cc6e48719b66808b313cacc8',
	passphrase:
		'dream theory eternal recall valid clever mind sell doctor empower bread cage',
	balance: '0',
	delegateName: 'genesis_100',
};

// Genesis account, initially holding 100M total supply
accounts.genesis = {
	address: '11237980039345381032L',
	publicKey: '5c554d43301786aec29a09b13b485176e81d1532347a351aeafe018c199fd7ca',
	passphrase:
		'creek own stem final gate scrub live shallow stage host concert they',
	balance: '10000000000000000',
	encryptedPassphrase:
		'iterations=10&cipherText=fed1fafa3db12ce02edccd2b3fb146fe85efcaced39e65a1d0068ea85c71185d3d4ebba1d15c239bc776bf06f5becf8c4bbe315dea71bd55d78b531f53557a83f85a981a&iv=0cc30f08e077d36733f8a623&salt=30d359df955aaa6686050a07688b001a&tag=16be3c63fd6985a3a5202beb2cca1121&version=1',
	password: 'elephant tree paris dragon chair galaxy',
};

accounts.mem_accountsFields = [
	'username',
	'isDelegate',
	'secondSignature',
	'address',
	'publicKey',
	'secondPublicKey',
	'balance',
	'voteWeight',
	'delegates',
	'multisignatures',
	'multimin',
	'multilifetime',
	'nameexist',
	'producedBlocks',
	'missedBlocks',
	'fees',
	'rewards',
	'asset',
	'membersPublicKeys',
	'votedDelegatesPublicKeys',
];

const Account = stampit({
	props: {
		username: '',
		isDelegate: false,
		secondSignature: false,
		address: '',
		publicKey: '',
		secondPublicKey: null,
		balance: '0',
		voteWeight: '',
		multiMin: 0,
		multiLifetime: 0,
		nameExist: false,
		producedBlocks: 9,
		missedBlocks: 0,
		fees: '0',
		rewards: '0',
		votedDelegatesPublicKeys: null,
		membersPublicKeys: null,
		productivity: 0,
		asset: {},
	},
	init({
		isDelegate,
		username,
		address,
		publicKey,
		secondPublicKey,
		producedBlocks,
		missedBlocks,
		balance,
		asset,
	}) {
		this.isDelegate = isDelegate || this.isDelegate;
		this.username = username || randomstring.generate(10).toLowerCase();
		this.address =
			address ||
			`${randomstring.generate({ charset: 'numeric', length: 20 })}L`;
		this.publicKey =
			publicKey ||
			randomstring
				.generate({ charset: '0123456789ABCDEF', length: 64 })
				.toLowerCase();
		this.secondPublicKey = secondPublicKey || null;
		this.voteWeight = randomstring.generate({
			charset: '123456789',
			length: 5,
		});
		this.producedBlocks = producedBlocks || 0;
		this.missedBlocks = missedBlocks || 0;
		this.productivity =
			this.producedBlocks / (this.producedBlocks + this.missedBlocks) || 0;
		this.balance = balance || '0';
		this.asset = asset || {};
		this.votedDelegatesPublicKeys = null;
		this.membersPublicKeys = null;
	},
});

const dbAccount = stampit({
	props: {
		address: null,
		balance: 0,
		delegates: null,
		fees: '0',
		isDelegate: 0,
		missedBlocks: 0,
		multiLifetime: 0,
		multimin: 0,
		multisignatures: null,
		nameExist: 0,
		producedBlocks: 0,
		publicKey: null,
		rewards: '0',
		secondPublicKey: null,
		secondSignature: 0,
		username: null,
		voteWeight: '0',
		asset: {},
		votedDelegatesPublicKeys: null,
		membersPublicKeys: null,
	},
	init({ address, balance }) {
		this.address = address || this.address;
		this.balance = balance || this.balance;
	},
});

const Delegate = stampit(Account, {
	props: {
		isDelegate: true,
	},
});

const Dependent = stampit({
	init({ accountId, dependentId }) {
		this.accountId = accountId;
		this.dependentId =
			dependentId ||
			randomstring
				.generate({ charset: '0123456789ABCDE', length: 32 })
				.toLowerCase();
	},
});

accounts.Account = Account;
accounts.dbAccount = dbAccount;
accounts.Delegate = Delegate;
accounts.Dependent = Dependent;

module.exports = accounts;
