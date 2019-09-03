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

const BaseGenerator = require('../base_generator');
const defaultConfig = require('../../config/devnet');
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
	futureMultisignatureAccount: {
		passphrase:
			'blame address tube insect cost knock major level regret bring april stick',
		privateKey:
			'b92e223981770c716ee54192a0ad028639d28d41221b72e455447bc4767aeb94caff2242b740a733daa3f3f96fc1592303b60c1704a8ac626e2704da039f41ee',
		publicKey:
			'caff2242b740a733daa3f3f96fc1592303b60c1704a8ac626e2704da039f41ee',
		address: '2222471382442610527L',
		balance: '0',
	},

	memberA: {
		passphrase:
			'measure salon trigger series blood mother door wolf agent plate absent lens',
		privateKey:
			'f25255abdd72b6033b860e71bd95696e2da6f7f5f080db9b330303c9b57b9623bed1c99f4a99cd584e886c80b300ef18e9d4265b5158e805bfdb609a77bd163f',
		publicKey:
			'bed1c99f4a99cd584e886c80b300ef18e9d4265b5158e805bfdb609a77bd163f',
		address: '8465920867403822059L',
	},
	memberB: {
		passphrase:
			'spoil taxi price maple steel detect welcome oyster glove alley caution year',
		privateKey:
			'328a236de4b2e877e6ae3e840a6c5513c2c68b62d13d6fcff50f056e60dfdeeaa3642d1c4605499182e5081f864b5a6f1584df336d2f2c3e49b197cbd1f36d78',
		publicKey:
			'a3642d1c4605499182e5081f864b5a6f1584df336d2f2c3e49b197cbd1f36d78',
		address: '1670991471799963578L',
	},
};

const generateTestCasesValidBlockMultisignatureRegistrationTx = () => {
	const chainStateBuilder = new ChainStateBuilder(
		genesisBlock,
		initialAccountsState,
		accounts,
	);

	// Transfer funds from genesis account to one of the delegates
	chainStateBuilder
		.transfer('100')
		.from('16313739661670634666L')
		.to('10881167371402274308L')
		.forge();
	// Fund three accounts
	chainStateBuilder
		.transfer('30')
		.from('10881167371402274308L')
		.to('8465920867403822059L')
		.transfer('30')
		.from('10881167371402274308L')
		.to('1670991471799963578L')
		.transfer('30')
		.from('10881167371402274308L')
		.to('2222471382442610527L')
		.forge();

	// Register multisignature and two co-signers for it
	chainStateBuilder
		.registerMultisignature('2222471382442610527L')
		.addMemberAndSign('8465920867403822059L')
		.addMemberAndSign('1670991471799963578L')
		.finish()
		.forge();

	const chainAndAccountStates = chainStateBuilder.getScenario();

	return {
		initialState: {
			// Given the library chainStateBuilder saves all mutations we use slice here to pick the first accounts state
			chain: chainAndAccountStates.chain.slice(0, 2),
			accounts: chainAndAccountStates.finalAccountsState[4],
		},
		input: chainAndAccountStates.chain.slice(2),
		output: {
			chain: chainAndAccountStates.chain,
			// Given the library chainStateBuilder saves all mutations we use slice here to pick the last account state
			accounts: chainAndAccountStates.finalAccountsState.slice(-1),
		},
	};
};

const validBlockWithMultisignatureRegistrationTx = () => ({
	title: 'Valid block processing',
	summary:
		'A valid block with a multisignature registration transaction processed',
	config: 'mainnet',
	runner: 'block_processing_multisignatures',
	handler: 'valid_block_processing_multisignature_registration_tx',
	testCases: generateTestCasesValidBlockMultisignatureRegistrationTx(),
});

module.exports = BaseGenerator.runGenerator('block_processing_transfers', [
	validBlockWithMultisignatureRegistrationTx,
]);
