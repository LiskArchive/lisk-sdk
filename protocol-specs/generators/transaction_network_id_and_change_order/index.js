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

const { ed, legacy } = require('@liskhq/lisk-cryptography');
const { Codec } = require('@liskhq/lisk-codec');
const BaseGenerator = require('../base_generator');
const { baseTransactionSchema } = require('../../utils/schema');

const codec = new Codec();
const TAG_TRANSACTION = Buffer.from('LSK_TX_', 'utf8');
const accounts = [
	{
		passphrase: 'wear protect skill sentence lift enter wild sting lottery power floor neglect',
		privateKey: Buffer.from(
			'8f41ff1e75c4f0f8a71bae4952266928d0e91660fc513566ac694fed61157497efaf1d977897cb60d7db9d30e8fd668dee070ac0db1fb8d184c06152a8b75f8d',
			'hex',
		),
		publicKey: Buffer.from(
			'efaf1d977897cb60d7db9d30e8fd668dee070ac0db1fb8d184c06152a8b75f8d',
			'hex',
		),
		address: Buffer.from('8f5685bf5dcb8c1d3b9bbc98cffb0d0c6077be17', 'hex'),
		nonce: BigInt(2),
	},
	{
		passphrase: 'inherit moon normal relief spring bargain hobby join baby flash fog blood',
		privateKey: Buffer.from(
			'de4a28610239ceac2ec3f592e36a2ead8ed4ac93cb16aa0d996ab6bb0249da2c0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
			'hex',
		),
		publicKey: Buffer.from(
			'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
			'hex',
		),
		address: Buffer.from('be046d336cd0c2fbde62bc47e20199395d2eeadc', 'hex'),
		nonce: BigInt(2),
	},
	{
		passphrase: 'better across runway mansion jar route valid crack panic favorite smooth sword',
		privateKey: Buffer.from(
			'de1520f8589408e76a97643ba7d27f20009b06899816c8af20f9b03f4a4bd8a66766ce280eb99e45d2cc7d9c8c852720940dab5d69f480e80477a97b4255d5d8',
			'hex',
		),
		publicKey: Buffer.from(
			'6766ce280eb99e45d2cc7d9c8c852720940dab5d69f480e80477a97b4255d5d8',
			'hex',
		),
		address: Buffer.from('75445cfa4b9512b72750a8ba61f0c04f0fbede0d', 'hex'),
		nonce: BigInt(2),
	},
	{
		passphrase: 'mirror swap middle hunt angle furnace maid scheme amazing box bachelor debris',
		privateKey: Buffer.from(
			'ad7462eb8f682b0c3424213ead044381ba0007bb65ce26287fc308027c871d951387d8ec6306807ffd6fe27ea3443985765c1157928bb09904307956f46a9972',
			'hex',
		),
		publicKey: Buffer.from(
			'1387d8ec6306807ffd6fe27ea3443985765c1157928bb09904307956f46a9972',
			'hex',
		),
		address: Buffer.from('b17ff61bf8b6e72155c6aab99e113e2e87696d5b', 'hex'),
		nonce: BigInt(2),
	},
];

const chainID = Buffer.from('10000000', 'hex');

const balanceTransferAsset = {
	type: 'object',
	$id: 'balanceTransferAsset',
	properties: {
		amount: { dataType: 'uint64', fieldNumber: 1 },
		recipientAddress: { dataType: 'bytes', fieldNumber: 2 },
		data: { dataType: 'string', fieldNumber: 3 },
	},
	required: ['amount', 'recipientAddress', 'data'],
};

const validatorRegAsset = {
	$id: 'validatorRegAsset',
	type: 'object',
	properties: { username: { dataType: 'string', fieldNumber: 1 } },
	required: ['username'],
};

const generateValidTransferTransaction = () => {
	const tx = {
		moduleID: 2,
		assetID: 0,
		senderPublicKey: accounts[0].publicKey,
		nonce: BigInt(2),
		fee: BigInt('100000000'),
		asset: {
			recipientAddress: accounts[1].address,
			amount: BigInt('1234567890'),
			data: 'random data',
		},
	};

	const assetBytes = codec.encode(balanceTransferAsset, tx.asset);
	const signingTx = {
		...tx,
		asset: assetBytes,
		signatures: [],
	};
	const signingBytes = codec.encode(baseTransactionSchema, signingTx);

	const signature = ed.signData(
		TAG_TRANSACTION,
		chainID,
		signingBytes,
		legacy.getPrivateAndPublicKeyFromPassphrase(accounts[0].passphrase).privateKey,
	);

	const encodedTx = codec.encode(baseTransactionSchema, {
		...tx,
		asset: assetBytes,
		signatures: [signature],
	});

	return {
		description: 'A valid transfer transaction',
		input: {
			account: {
				...accounts[0],
				nonce: accounts[0].nonce,
				publicKey: accounts[0].publicKey,
				privateKey: accounts[0].privateKey,
				address: accounts[0].address,
			},
			chainID,
		},
		output: {
			transaction: encodedTx,
		},
	};
};

const generateValidValidatorTransaction = () => {
	const tx = {
		moduleID: 5,
		assetID: 0,
		senderPublicKey: accounts[0].publicKey,
		nonce: BigInt('2'),
		fee: BigInt('100000000'),
		asset: {
			username: 'new_validator',
		},
	};

	const assetBytes = codec.encode(validatorRegAsset, tx.asset);
	const signingTx = {
		...tx,
		asset: assetBytes,
		signatures: [],
	};
	const signingBytes = codec.encode(baseTransactionSchema, signingTx);

	const signature = ed.signData(
		TAG_TRANSACTION,
		chainID,
		signingBytes,
		legacy.getPrivateAndPublicKeyFromPassphrase(accounts[0].passphrase).privateKey,
	);

	const encodedTx = codec.encode(baseTransactionSchema, {
		...tx,
		asset: assetBytes,
		signatures: [signature],
	});

	return {
		description: 'A valid validator transaction',
		input: {
			account: {
				...accounts[0],
				nonce: accounts[0].nonce,
				publicKey: accounts[0].publicKey,
				privateKey: accounts[0].privateKey,
				address: accounts[0].address,
			},
			chainID,
		},
		output: {
			transaction: encodedTx,
		},
	};
};

const validTransferSuite = () => ({
	title: 'Valid transfer transaction',
	summary: 'A valid transfer transaction',
	config: { network: 'devnet' },
	runner: 'transaction_network_id_and_change_order',
	handler: 'transfer_transaction_validate',
	testCases: [generateValidTransferTransaction()],
});

const validValidatorSuite = () => ({
	title: 'Valid validator transaction',
	summary: 'A valid validator transaction',
	config: { network: 'devnet' },
	runner: 'transaction_network_id_and_change_order',
	handler: 'validator_transaction_validate',
	testCases: [generateValidValidatorTransaction()],
});

module.exports = BaseGenerator.runGenerator('transaction_network_id_and_change_order', [
	validTransferSuite,
	validValidatorSuite,
]);
