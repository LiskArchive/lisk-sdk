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
	registerSecondPassphrase,
	SecondSignatureTransaction,
} = require('@liskhq/lisk-transactions');
const { cloneDeep } = require('lodash');
const BigNum = require('@liskhq/bignum');
const BaseGenerator = require('../base_generator');
const defaultConfig = require('../../config/devnet');
const { createBlock } = require('../../utils/blocks');

const { genesisBlock } = defaultConfig;

// Computed within Client application
// TODO: Compute the initial account state here
const initialAccountState = [
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
};

const generateTestCasesValidBlockSecondSignatureTx = () => {
	const amount = '5500000000';
	const transferTx = new TransferTransaction(
		transfer({
			amount,
			passphrase: accounts.genesis.passphrase,
			recipientId: accounts.existingDelegate.address,
		}),
	);

	const block = createBlock(
		defaultConfig,
		initialAccountState,
		genesisBlock,
		1,
		0,
		{
			version: 1,
			transactions: [transferTx],
		},
	);

	const { balance: senderBalance } = initialAccountState.find(
		account => account.address === accounts.genesis.address,
	);

	const { balance: recipientBalance } = initialAccountState.find(
		account => account.address === accounts.existingDelegate.address,
	);

	const resultingAccountState = cloneDeep(initialAccountState);

	resultingAccountState.find(
		account => account.address === accounts.genesis.address,
	).balance = parseInt(
		new BigNum(senderBalance.toString()).sub(amount).toString(),
		10,
	);

	resultingAccountState.find(
		account => account.address === accounts.existingDelegate.address,
	).balance = parseInt(
		new BigNum(recipientBalance.toString()).plus(amount).toString(),
		10,
	);

	const secondSignature =
		'erupt sponsor rude supreme vacant delay salute allow laundry swamp curve brain';
	const secondPassphraseTx = new SecondSignatureTransaction(
		registerSecondPassphrase({
			passphrase: accounts.existingDelegate.passphrase,
			secondPassphrase: secondSignature,
		}),
	);

	const blockWithSecondSignatureRegistered = createBlock(
		defaultConfig,
		resultingAccountState,
		block,
		2,
		0,
		{
			version: 1,
			transactions: [secondPassphraseTx],
		},
	);

	const secondSignatureAccountState = cloneDeep(resultingAccountState);

	secondSignatureAccountState.find(
		account => account.address === accounts.existingDelegate.address,
	).secondPublicKey =
		'62e4d09ce3fa571fb4b073fb229f5ff18b6108ca89357924db887a409f61542c';

	const targetAccount = secondSignatureAccountState.find(
		account => account.address === accounts.existingDelegate.address,
	);

	targetAccount.balance = parseInt(
		new BigNum(targetAccount.balance.toString()).sub(500000000).toString(),
		10,
	);

	return {
		initialState: {
			chain: [block],
			accounts: resultingAccountState,
		},
		input: {
			blockWithSecondSignatureRegistered,
		},
		output: {
			chain: [block, blockWithSecondSignatureRegistered],
			accounts: secondSignatureAccountState,
		},
	};
};

const generateTestCasesinvalidBlockWithSecondSignatureAndFundsTxSuite = () => {
	const amount = '5500000000';
	const transferTx = new TransferTransaction(
		transfer({
			amount,
			passphrase: accounts.genesis.passphrase,
			recipientId: accounts.existingDelegate.address,
		}),
	);

	const secondSignature =
		'erupt sponsor rude supreme vacant delay salute allow laundry swamp curve brain';
	const secondPassphraseTx = new SecondSignatureTransaction(
		registerSecondPassphrase({
			passphrase: accounts.existingDelegate.passphrase,
			secondPassphrase: secondSignature,
		}),
	);

	const block = createBlock(
		defaultConfig,
		initialAccountState,
		genesisBlock,
		1,
		0,
		{
			version: 1,
			transactions: [transferTx, secondPassphraseTx],
		},
	);

	return {
		initialState: {
			chain: [],
			accounts: initialAccountState,
		},
		input: {
			block,
		},
		output: {
			chain: [],
			accounts: initialAccountState,
		},
	};
};

const generateTestCasesInvalidBlockSecondSignatureTxSecondTime = () => {
	const amount = '5500000000';
	const transferTx = new TransferTransaction(
		transfer({
			amount,
			passphrase: accounts.genesis.passphrase,
			recipientId: accounts.existingDelegate.address,
		}),
	);

	const block = createBlock(
		defaultConfig,
		initialAccountState,
		genesisBlock,
		1,
		0,
		{
			version: 1,
			transactions: [transferTx],
		},
	);

	const { balance: senderBalance } = initialAccountState.find(
		account => account.address === accounts.genesis.address,
	);

	const { balance: recipientBalance } = initialAccountState.find(
		account => account.address === accounts.existingDelegate.address,
	);

	const resultingAccountState = cloneDeep(initialAccountState);

	resultingAccountState.find(
		account => account.address === accounts.genesis.address,
	).balance = parseInt(
		new BigNum(senderBalance.toString()).sub(amount).toString(),
		10,
	);

	resultingAccountState.find(
		account => account.address === accounts.existingDelegate.address,
	).balance = parseInt(
		new BigNum(recipientBalance.toString()).plus(amount).toString(),
		10,
	);

	const secondSignature =
		'erupt sponsor rude supreme vacant delay salute allow laundry swamp curve brain';
	const secondPassphraseTx = new SecondSignatureTransaction(
		registerSecondPassphrase({
			passphrase: accounts.existingDelegate.passphrase,
			secondPassphrase: secondSignature,
		}),
	);

	const blockWithSecondSignatureRegistered = createBlock(
		defaultConfig,
		resultingAccountState,
		block,
		2,
		0,
		{
			version: 1,
			transactions: [secondPassphraseTx],
		},
	);

	const secondSignatureAccountState = cloneDeep(resultingAccountState);

	secondSignatureAccountState.find(
		account => account.address === accounts.existingDelegate.address,
	).secondPublicKey =
		'62e4d09ce3fa571fb4b073fb229f5ff18b6108ca89357924db887a409f61542c';

	const targetAccount = secondSignatureAccountState.find(
		account => account.address === accounts.existingDelegate.address,
	);

	targetAccount.balance = parseInt(
		new BigNum(targetAccount.balance.toString()).sub(500000000).toString(),
		10,
	);

	const newSecondPassphraseTx = new SecondSignatureTransaction(
		registerSecondPassphrase({
			passphrase: accounts.existingDelegate.passphrase,
			secondPassphrase: secondSignature,
		}),
	);

	const blockWithNewSecondSignatureNewRegistration = createBlock(
		defaultConfig,
		resultingAccountState,
		block,
		3,
		0,
		{
			version: 1,
			transactions: [newSecondPassphraseTx],
		},
	);

	return {
		initialState: {
			chain: [block, blockWithSecondSignatureRegistered],
			accounts: secondSignatureAccountState,
		},
		input: {
			blockWithNewSecondSignatureNewRegistration,
		},
		output: {
			chain: [block, blockWithSecondSignatureRegistered],
			accounts: secondSignatureAccountState,
		},
	};
};

const validBlockWithSecondSignatureTxSuite = () => ({
	title: 'Valid block processing',
	summary:
		'A valid block with a second signature registration transaction is processed',
	config: 'mainnet',
	runner: 'block_processing_second_signature',
	handler: 'valid_block_processing_one_second_signature_tx',
	testCases: generateTestCasesValidBlockSecondSignatureTx(),
});

const invalidBlockWithSecondSignatureAndFundsTxSuite = () => ({
	title: 'Invalid block processing',
	summary:
		'An invalid block with a second signature registration transaction and funds for the account in same block',
	config: 'mainnet',
	runner: 'block_processing_second_signature',
	handler: 'invalid_block_processing_second_signature_and_funds_tx',
	testCases: generateTestCasesinvalidBlockWithSecondSignatureAndFundsTxSuite(),
});

const invalidBlockWithNewSecondSignatureSuite = () => ({
	title: 'Invalid block processing',
	summary:
		'An invalid block with a second signature registration transaction for an already second signature account',
	config: 'mainnet',
	runner: 'block_processing_second_signature',
	handler: 'invalid_block_processing_second_signature_for_already_registered',
	testCases: generateTestCasesInvalidBlockSecondSignatureTxSecondTime(),
});

module.exports = BaseGenerator.runGenerator(
	'block_processing_second_signature',
	[
		validBlockWithSecondSignatureTxSuite,
		invalidBlockWithSecondSignatureAndFundsTxSuite,
		invalidBlockWithNewSecondSignatureSuite,
	],
);
