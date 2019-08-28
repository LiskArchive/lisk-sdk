/*
 * Copyright © 2018 Lisk Foundation
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
	TransferTransaction,
	registerDelegate,
	DelegateTransaction,
} = require('@liskhq/lisk-transactions');
const { cloneDeep } = require('lodash');
const BigNum = require('@liskhq/bignum');
const BaseGenerator = require('../base_generator');
const defaultConfig = require('../../config/devnet');
const { createBlock } = require('../../utils/blocks');

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
	{
		address: '10881167371402274308L',
		publicKey:
			'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
		secondPublicKey: null,
		username: 'genesis_100',
		isDelegate: true,
		secondSignature: false,
		balance: 0,
		multiMin: 0,
		multiLifetime: 0,
		nameExist: false,
		missedBlocks: 1,
		producedBlocks: 0,
		rank: 70,
		fees: 0,
		rewards: 0,
		vote: 9999899990000000,
		productivity: 0,
	},
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
	existingDelegate: {
		address: '10881167371402274308L',
		publicKey:
			'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
		passphrase:
			'actress route auction pudding shiver crater forum liquid blouse imitate seven front',
		balance: '0',
		delegateName: 'genesis_100',
	},
	futureDelegate: {
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

const generateTestCasesValidBlockSecondSignatureTx = () => {
	// Send funds to an existing delegate from genesis account
	const amount = '6000000000';
	const delegateFunding = new TransferTransaction(
		transfer({
			amount,
			passphrase: accounts.genesis.passphrase,
			recipientId: accounts.existingDelegate.address,
		}),
	);
	// Forge the block containing the delegate's funding
	const delegateFundingBlock = createBlock(
		defaultConfig,
		initialAccountsState,
		genesisBlock,
		1,
		0,
		{
			version: 1,
			transactions: [delegateFunding],
		},
	);

	// Update account states
	const resultingAccountStateAfterDelegateFunding = cloneDeep(
		initialAccountsState,
	);

	const { balance: senderBalance } = initialAccountsState.find(
		account => account.address === accounts.genesis.address,
	);

	const { balance: recipientBalance } = initialAccountsState.find(
		account => account.address === accounts.existingDelegate.address,
	);

	resultingAccountStateAfterDelegateFunding.find(
		account => account.address === accounts.genesis.address,
	).balance = parseInt(
		new BigNum(senderBalance.toString()).sub(amount).toString(),
		10,
	);

	resultingAccountStateAfterDelegateFunding.find(
		account => account.address === accounts.existingDelegate.address,
	).balance = parseInt(
		new BigNum(recipientBalance.toString()).plus(amount).toString(),
		10,
	);

	// Send funds from an existing delegate to a new account
	const futureDelegateFundingTx = new TransferTransaction(
		transfer({
			amount,
			passphrase: accounts.existingDelegate.passphrase,
			recipientId: accounts.futureDelegate.address,
		}),
	);
	// Forge the block containing the delegate's funding
	const futureDelegateFundingBlock = createBlock(
		defaultConfig,
		resultingAccountStateAfterDelegateFunding,
		delegateFundingBlock,
		2,
		0,
		{
			version: 1,
			transactions: [futureDelegateFundingTx],
		},
	);

	// Update account states
	const accountStatesAfterFundingFutureDelegate = [
		...resultingAccountStateAfterDelegateFunding,
		{
			address: '2222471382442610527L',
			publicKey:
				'caff2242b740a733daa3f3f96fc1592303b60c1704a8ac626e2704da039f41ee',
			secondPublicKey: null,
			username: '',
			isDelegate: false,
			secondSignature: false,
			balance: 0,
			multiMin: 0,
			multiLifetime: 0,
			nameExist: false,
			missedBlocks: 0,
			producedBlocks: 0,
			rank: 0,
			fees: 0,
			rewards: 0,
			vote: 0,
			productivity: 0,
		},
	];

	const {
		balance: senderBalanceToFutureDelegate,
	} = accountStatesAfterFundingFutureDelegate.find(
		account => account.address === accounts.existingDelegate.address,
	);

	const {
		balance: recipientBalanceToFutureDelegate,
	} = accountStatesAfterFundingFutureDelegate.find(
		account => account.address === accounts.futureDelegate.address,
	);

	const targetAccount = accountStatesAfterFundingFutureDelegate.find(
		account => account.address === accounts.existingDelegate.address,
	);

	targetAccount.balance = parseInt(
		new BigNum(senderBalanceToFutureDelegate.toString())
			.sub(500000000)
			.toString(),
		10,
	);

	accountStatesAfterFundingFutureDelegate.find(
		account => account.address === accounts.futureDelegate.address,
	).balance = parseInt(
		new BigNum(recipientBalanceToFutureDelegate.toString())
			.plus(amount)
			.toString(),
		10,
	);

	// Register the new account as delegate
	const newDelegateName = 'OneDelegate';
	const registerDelegateTx = new DelegateTransaction(
		registerDelegate({
			username: newDelegateName,
			passphrase: accounts.futureDelegate.passphrase,
		}),
	);

	const registerDelegateBlock = createBlock(
		defaultConfig,
		initialAccountsState,
		delegateFundingBlock,
		3,
		0,
		{
			version: 1,
			transactions: [registerDelegateTx],
		},
	);

	// Update account states
	const finalAccountsState = cloneDeep(accountStatesAfterFundingFutureDelegate);

	const registeredDelegateAccount = finalAccountsState.find(
		account => account.address === accounts.futureDelegate.address,
	);

	registeredDelegateAccount.username = newDelegateName;
	registeredDelegateAccount.balance = parseInt(
		new BigNum(registeredDelegateAccount.balance.toString())
			.sub(2500000000)
			.toString(),
		10,
	);
	registeredDelegateAccount.isDelegate = true;

	return {
		initialState: {
			chain: [delegateFundingBlock, futureDelegateFundingBlock],
			accounts: resultingAccountStateAfterDelegateFunding,
		},
		input: {
			registerDelegateBlock,
		},
		output: {
			chain: [
				delegateFundingBlock,
				futureDelegateFundingBlock,
				registerDelegateBlock,
			],
			accounts: finalAccountsState,
		},
	};
};

const validBlockWithSecondSignatureTxSuite = () => ({
	title: 'Valid block processing',
	summary: 'A valid block with a delegate registration',
	config: 'mainnet',
	runner: 'block_processing_delegate',
	handler: 'valid_block_processing_delegate_registration_tx',
	testCases: generateTestCasesValidBlockSecondSignatureTx(),
});

module.exports = BaseGenerator.runGenerator('block_processing_delegate', [
	validBlockWithSecondSignatureTxSuite,
]);
