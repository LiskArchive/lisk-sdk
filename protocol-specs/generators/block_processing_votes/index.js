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
	decryptPassphraseWithPassword,
	parseEncryptedPassphrase,
	getAddressFromPrivateKey,
	getPrivateAndPublicKeyFromPassphrase,
} = require('@liskhq/lisk-cryptography');

const BaseGenerator = require('../base_generator');
const defaultConfig = require('../../config/devnet');
const genesisDelegateAccounts = require('../../config/devnet_genesis_delegates');

const ChainStateBuilder = require('../../utils/chain_state_builder');

const { genesisBlock } = defaultConfig;

// Computed within Client application
// TODO: Compute the initial account state here
const initialAccountsState = [
	{
		address: '16313739661670634666L',
		publicKey:
			'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
		secondPublicKey: null,
		username: null,
		isDelegate: false,
		secondSignature: false,
		balance: 9999899990000000,
		multiMin: 0,
		multiLifetime: 0,
		nameExist: false,
		missedBlocks: 0,
		producedBlocks: 0,
		rank: null,
		fees: 0,
		rewards: 0,
		vote: 0,
		productivity: 0,
	},
	...genesisDelegateAccounts,
];

// Object holding the genesis account information and passphrase as well as
// an existing delegate account for DEVNET
// TODO: Move this to devnet.json config file.
const accounts = {
	// Genesis account, initially holding 100M total supply
	genesis: {
		address: '16313739661670634666L',
		publicKey:
			'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
		passphrase:
			'wagon stock borrow episode laundry kitten salute link globe zero feed marble',
		balance: '10000000000000000',
		encryptedPassphrase:
			'iterations=1&salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1',
		password: 'elephant tree paris dragon chair galaxy',
	},
	votingAccount: {
		passphrase:
			'blame address tube insect cost knock major level regret bring april stick',
		privateKey:
			'b92e223981770c716ee54192a0ad028639d28d41221b72e455447bc4767aeb94caff2242b740a733daa3f3f96fc1592303b60c1704a8ac626e2704da039f41ee',
		publicKey:
			'caff2242b740a733daa3f3f96fc1592303b60c1704a8ac626e2704da039f41ee',
		address: '2222471382442610527L',
		balance: '0',
	},
};

// Decrypt all passwords from delegate genesis and add to accounts array
// eslint-disable-next-line no-restricted-syntax
for (const anAccount of genesisDelegateAccounts) {
	const { encryptedPassphrase } = defaultConfig.forging.delegates.find(
		aDelegate => aDelegate.publicKey === anAccount.publicKey,
	);

	const passphrase = decryptPassphraseWithPassword(
		parseEncryptedPassphrase(encryptedPassphrase),
		defaultConfig.forging.defaultPassword,
	);
	const keys = getPrivateAndPublicKeyFromPassphrase(passphrase);
	const address = getAddressFromPrivateKey(keys.privateKey);

	accounts[`${anAccount.username}_delegate`] = {
		passphrase,
		privateKey: keys.privateKey,
		publicKey: keys.publicKey,
		address,
		balance: '0',
	};
}

// Generators
const generateTestCasesValidBlockVotesTx = () => {
	const chainStateBuilder = new ChainStateBuilder(
		genesisBlock,
		initialAccountsState,
		accounts,
	);

	// Give balance from genesis account to delegates just for having account states to compare against
	// As the state builder is pretty basic so far we need to control forging only 25 transactions like this.
	let transactionCount = 0;
	// eslint-disable-next-line no-restricted-syntax
	for (const anAccount of genesisDelegateAccounts) {
		if (transactionCount === 25) {
			chainStateBuilder.forge();
			transactionCount = 0;
		}
		transactionCount += 1;

		chainStateBuilder
			.transfer('99')
			.from('16313739661670634666L')
			.to(anAccount.address);
	}
	// Fund account that will issue votes
	chainStateBuilder
		.transfer('101')
		.from('16313739661670634666L')
		.to('2222471382442610527L');

	// Forge the block so as to have all delegates in the store
	chainStateBuilder.forge();

	// Vote for the 101 delegates with one account
	chainStateBuilder
		.castVotesFrom('2222471382442610527L')
		.voteDelegates(
			genesisDelegateAccounts
				.slice(0, 33)
				.map(aDelegate => aDelegate.publicKey),
		)
		.unvoteDelegates([]);

	chainStateBuilder
		.castVotesFrom('2222471382442610527L')
		.voteDelegates(
			genesisDelegateAccounts
				.slice(33, 66)
				.map(aDelegate => aDelegate.publicKey),
		)
		.unvoteDelegates([]);

	chainStateBuilder
		.castVotesFrom('2222471382442610527L')
		.voteDelegates(
			genesisDelegateAccounts
				.slice(66, 99)
				.map(aDelegate => aDelegate.publicKey),
		)
		.unvoteDelegates([]);

	chainStateBuilder
		.castVotesFrom('2222471382442610527L')
		.voteDelegates(
			genesisDelegateAccounts
				.slice(99, 101)
				.map(aDelegate => aDelegate.publicKey),
		)
		.unvoteDelegates([]);

	chainStateBuilder.forge();

	const chainAndAccountStates = chainStateBuilder.getScenario();
	return {
		initialState: {
			// Given the library chainStateBuilder saves all mutations we use slice here to pick the first accounts state
			chain: chainAndAccountStates.chain.slice(0, 5),
			accounts: chainAndAccountStates.initialAccountsState,
		},
		input: chainAndAccountStates.chain.slice(-1),
		output: {
			chain: chainAndAccountStates.chain,
			// Given the library chainStateBuilder saves all mutations we use slice here to pick the last account state
			accounts: chainAndAccountStates.finalAccountsState.slice(-1),
		},
	};
};

const generateTestCasesInvalidBlockTooManyVotesTx = () => {
	const chainStateBuilder = new ChainStateBuilder(
		genesisBlock,
		initialAccountsState,
		accounts,
	);

	// Give balance from genesis account to delegates just for having account states to compare against
	// As the state builder is pretty basic so far we need to control forging only 25 transactions like this.
	let transactionCount = 0;
	// eslint-disable-next-line no-restricted-syntax
	for (const anAccount of genesisDelegateAccounts) {
		if (transactionCount === 25) {
			chainStateBuilder.forge();
			transactionCount = 0;
		}
		transactionCount += 1;

		chainStateBuilder
			.transfer('99')
			.from('16313739661670634666L')
			.to(anAccount.address);
	}
	// Fund account that will issue votes
	chainStateBuilder
		.transfer('101')
		.from('16313739661670634666L')
		.to('2222471382442610527L');

	// Forge the block so as to have all delegates in the store
	chainStateBuilder.forge();

	// Vote for the 101 delegates with one account
	chainStateBuilder
		.castVotesFrom('2222471382442610527L')
		.voteDelegates(
			genesisDelegateAccounts.map(aDelegate => aDelegate.publicKey),
		)
		.unvoteDelegates([]);

	chainStateBuilder.forgeInvalidInputBlock();

	const chainAndAccountStates = chainStateBuilder.getScenario();

	return {
		initialState: {
			// Given the library chainStateBuilder saves all mutations we use slice here to pick the first accounts state
			chain: chainAndAccountStates.chain,
			accounts: chainAndAccountStates.initialAccountsState,
		},
		input: chainAndAccountStates.inputBlock,
		output: {
			chain: chainAndAccountStates.chain,
			// Given the library chainStateBuilder saves all mutations we use slice here to pick the last account state
			accounts: chainAndAccountStates.finalAccountsState.slice(-1),
		},
	};
};

const validBlockWithVoteTxSuite = () => ({
	title: 'Valid block processing',
	summary: 'A valid block with votes transactions',
	config: 'mainnet',
	runner: 'block_processing_votes',
	handler: 'valid_block_processing_vote_all_delegates',
	testCases: generateTestCasesValidBlockVotesTx(),
});

const invalidBlockWithTooManyVotesTxSuite = () => ({
	title: 'Invalid block processing',
	summary: 'An invalid block with a vote transaction that exceeds max votes',
	config: 'mainnet',
	runner: 'block_processing_votes',
	handler: 'invalid_block_processing_vote_all_delegates_in_one_transaction',
	testCases: generateTestCasesInvalidBlockTooManyVotesTx(),
});

module.exports = BaseGenerator.runGenerator('block_processing_transfers', [
	validBlockWithVoteTxSuite,
	invalidBlockWithTooManyVotesTxSuite,
]);
