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

import * as stampit from 'stampit';
import * as randomstring from 'randomstring';

// Existing delegate account
export const existingDelegate = {
	address: '16936666638951007157L',
	publicKey: 'c0ebb5ae59f498718ac5038b6b83fd822b4d1def918c66c05f1709a418a5cf70',
	passphrase:
		'slight wire team gravity finger soul reopen anchor evolve genius charge sing',
	balance: '0',
	delegateName: 'genesis_100',
};

// Genesis account, initially holding 100M total supply
export const genesis = {
	address: '5059876081639179984L',
	publicKey: '0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
	passphrase:
		'peanut hundred pen hawk invite exclude brain chunk gadget wait wrong ready',
	balance: '10000000000000000',
	encryptedPassphrase:
		'iterations=10&cipherText=6541c04d7a46eacd666c07fbf030fef32c5db324466e3422e59818317ac5d15cfffb80c5f1e2589eaa6da4f8d611a94cba92eee86722fc0a4015a37cff43a5a699601121fbfec11ea022&iv=141edfe6da3a9917a42004be&salt=f523bba8316c45246c6ffa848b806188&tag=4ffb5c753d4a1dc96364c4a54865521a&version=1',
	password: 'elephant tree paris dragon chair galaxy',
};

// eslint-disable-next-line camelcase
export const mem_accountsFields = [
	'username',
	'isDelegate',
	'address',
	'publicKey',
	'balance',
	'delegates',
	'multisignatures',
	'multimin',
	'multilifetime',
	'producedBlocks',
	'missedBlocks',
	'fees',
	'rewards',
	'asset',
	'membersPublicKeys',
];

export const Account = stampit.compose({
	props: {
		username: '',
		isDelegate: false,
		address: '',
		publicKey: '',
		balance: '0',
		multiMin: 0,
		multiLifetime: 0,
		producedBlocks: 9,
		missedBlocks: 0,
		fees: '0',
		rewards: '0',
		membersPublicKeys: null,
		productivity: 0,
		asset: {},
	},
	init({
		isDelegate,
		username,
		address,
		publicKey,
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
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		this.producedBlocks = producedBlocks || 0;
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		this.missedBlocks = missedBlocks || 0;
		this.productivity =
			// eslint-disable-next-line
			this.producedBlocks / (this.producedBlocks + this.missedBlocks) || 0;
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		this.balance = balance || '0';
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		this.asset = asset || {};
		this.membersPublicKeys = null;
	},
});

export const dbAccount = stampit.compose({
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
		producedBlocks: 0,
		publicKey: null,
		rewards: '0',
		username: null,
		asset: {},
		membersPublicKeys: null,
	},
	init({ address, balance }) {
		this.address = address || this.address;
		this.balance = balance || this.balance;
	},
});

export const Delegate = stampit.compose(Account, {
	props: {
		isDelegate: true,
	},
});

export const Dependent = stampit.compose({
	init({ accountId, dependentId }) {
		this.accountId = accountId;
		this.dependentId =
			dependentId ||
			randomstring
				.generate({ charset: '0123456789ABCDE', length: 32 })
				.toLowerCase();
	},
});
