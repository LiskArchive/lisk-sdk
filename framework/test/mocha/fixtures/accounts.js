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
	publicKey: 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
	passphrase:
		'actress route auction pudding shiver crater forum liquid blouse imitate seven front',
	balance: '0',
	delegateName: 'genesis_100',
};

// Genesis account, initially holding 100M total supply
accounts.genesis = {
	address: '16313739661670634666L',
	publicKey: 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
	passphrase:
		'wagon stock borrow episode laundry kitten salute link globe zero feed marble',
	balance: '10000000000000000',
	encryptedPassphrase:
		'iterations=1&salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1',
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
	'vote',
	'voteWeight',
	'rank',
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
		vote: '',
		voteWeight: '',
		rank: null,
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
		this.vote = randomstring.generate({ charset: '123456789', length: 5 });
		this.voteWeight = this.vote;
		this.producedBlocks = producedBlocks || 0;
		this.missedBlocks = missedBlocks || 0;
		this.productivity =
			this.producedBlocks / (this.producedBlocks + this.missedBlocks) || 0;
		this.balance = balance || '0';
		this.asset = asset || {};
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
		rank: null,
		rewards: '0',
		secondPublicKey: null,
		secondSignature: 0,
		username: null,
		vote: '0',
		voteWeight: '0',
		asset: {},
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
