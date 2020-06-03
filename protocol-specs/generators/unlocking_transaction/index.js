/*
 * Copyright © 2020 Lisk Foundation
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

const { signData } = require('@liskhq/lisk-cryptography');
const { Codec } = require('@liskhq/lisk-codec');
const BaseGenerator = require('../base_generator');

const codec = new Codec();

const networkIdentifier = Buffer.from(
	'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255',
	'hex',
);

const senderAccount = {
	passphrase:
		'lava toe nuclear candy erode present guilt develop include type pluck current',
	publicKey: Buffer.from(
		'8c3d81b1555fbe4692adfa1026ee21c043633b9369924cf2790e2e0fc6b47a66',
		'hex',
	),
	address: Buffer.from('676e0a8193f63d152402c951fe834df656c6de88', 'hex'),
};
const delegateAccounts = [
	{
		publicKey: Buffer.from(
			'5430e775505b3145c124d15dc7c84ca7c751ecb69faf653bfb1e0c91e6e22f8a',
			'hex',
		),
		address: Buffer.from('77bcc56185a43a7b8b4579479e0a6e0cdf13be5b', 'hex'),
	},
	{
		publicKey: Buffer.from(
			'73a56ce40aa991293250d9bd61471d19111f023cf1827c9be189deed733f9ea2',
			'hex',
		),
		address: Buffer.from('e1d6f478a0c47c6bab7ad33690371dc019baeedd', 'hex'),
	},
	{
		publicKey: Buffer.from(
			'88d1d4e94f2466fe69770a510dc8e6c638875b71e96c02b4791ccc032a2a6472',
			'hex',
		),
		address: Buffer.from('5405fe958fb1472ff98dbd46efd78f9499dc6db5', 'hex'),
	},
	{
		publicKey: Buffer.from(
			'41583c71f266a84200f0bfdee9b3bb984f6d67f3c903ba7288c97f1259bf8ddc',
			'hex',
		),
		address: Buffer.from('fc4f22379c7cfd12dbce33d8859115110f0eadfb', 'hex'),
	},
	{
		publicKey: Buffer.from(
			'5158379dc110c7fc011cfaf52466016668aecc65e5bfa79c2958e16da30490bd',
			'hex',
		),
		address: Buffer.from('3276e2db8e4c66a649c9f8ff13710d437c5414d1', 'hex'),
	},
	{
		publicKey: Buffer.from(
			'7cae1f08e4a4a437cffec509951ed1f30451415fff725adaa46a6d8946e95787',
			'hex',
		),
		address: Buffer.from('12b0642d4c11c7ca451e6c5aebf1a9f2969d9cda', 'hex'),
	},
	{
		publicKey: Buffer.from(
			'f7b9ea443bdc180cd4116e2a86e302639b4b41659d818d5011bfff0642453c3a',
			'hex',
		),
		address: Buffer.from('d783366bb87f2bc97dcca55ce5fd790667a816fe', 'hex'),
	},
	{
		publicKey: Buffer.from(
			'53efe2e1b66ea35a356e07f99dbfd79965e94e78b3b80087485e38f25ff80b74',
			'hex',
		),
		address: Buffer.from('c2bd7cd396b7de549b78939112883c90c5f66391', 'hex'),
	},
	{
		publicKey: Buffer.from(
			'4338f8c8417f96f315698ec670e8e9c35caa0830181f5554f618ba8829d436f0',
			'hex',
		),
		address: Buffer.from('cf00e1bf2d12ac6654bc1c63c5a5b915b37f6589', 'hex'),
	},
	{
		publicKey: Buffer.from(
			'ca8125b3a12a2f8ad47a6d514b00c360766df5785d57203748fb8c63092020fa',
			'hex',
		),
		address: Buffer.from('a599435cbe82b5d4ee82f197d7a1f23d8a49a2bc', 'hex'),
	},
	{
		publicKey: Buffer.from(
			'27b7f01611f9588a2bf43774b9b890cedbdef695f1b844c815873f2fecf1e29e',
			'hex',
		),
		address: Buffer.from('ea86b9ee31cdae7dfad2d27cbf2f51b84a615e67', 'hex'),
	},
	{
		publicKey: Buffer.from(
			'6ff4c2b7df013316616b6b6b67ed102894184a4efcee365fd1b459e4d070cca0',
			'hex',
		),
		address: Buffer.from('1e80b91ab7b9d089d104547f8653932d4b39572d', 'hex'),
	},
	{
		publicKey: Buffer.from(
			'e1f20a8b1c64193db5f009fd4d88fde9bd1320b8c921fafe800bacd94c347a2b',
			'hex',
		),
		address: Buffer.from('9a10bc503c35811d440b7b96aade93446d518e16', 'hex'),
	},
	{
		publicKey: Buffer.from(
			'1eb301328a5681a4d3a002c892644efcc057436985d48d55261133dae0af5c41',
			'hex',
		),
		address: Buffer.from('7fa4cdc3149befcee93084876a7410e3be6c344f', 'hex'),
	},
	{
		publicKey: Buffer.from(
			'0355085d4d6cc2565c69a248846e9d1cb7af023f8d3a2b31445a0386a45758a4',
			'hex',
		),
		address: Buffer.from('df74d905fb131e84aee642afb3ce7f1200c5e890', 'hex'),
	},
	{
		publicKey: Buffer.from(
			'f740f22ff4413757457cd25b390f5312b5b10dd09f4ed901848a57cb84bc1261',
			'hex',
		),
		address: Buffer.from('e25b52b4230b492c580d1e092d12936be271ca48', 'hex'),
	},
	{
		publicKey: Buffer.from(
			'09bf0bd593f354f7949cbbf42cedfdc9fabd2d7da5ff24e0f24c4017ebdb7450',
			'hex',
		),
		address: Buffer.from('02c913d9d815de4fd81cfc0f6a148d8e8ea30dd1', 'hex'),
	},
	{
		publicKey: Buffer.from(
			'2998ae5c6b28388fd654262ca19a4d669abf067aa2a28fa2ecb94079d1386ec9',
			'hex',
		),
		address: Buffer.from('d129a4d0a66bd49ee446fa711e4da853f52da085', 'hex'),
	},
	{
		publicKey: Buffer.from(
			'f8b282fe76bed11e0048f668e2768f1b5346acd77b3afe2a01c9b3874612fba2',
			'hex',
		),
		address: Buffer.from('474759b4d28aeb8b52f69c513b8c5c577605e44d', 'hex'),
	},
	{
		publicKey: Buffer.from(
			'19528c41f749fb0acd840b5349823afea8d96d9380cf4c674a5cf522417a6946',
			'hex',
		),
		address: Buffer.from('4444d33d8d96a3d11e962983f5b36c81d9fa4528', 'hex'),
	},
];

const baseSchema = {
	$id: 'baseSchema',
	type: 'object',
	required: ['type', 'nonce', 'fee', 'senderPublicKey', 'asset'],
	properties: {
		type: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		nonce: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
		fee: {
			dataType: 'uint64',
			fieldNumber: 3,
		},
		senderPublicKey: {
			dataType: 'bytes',
			fieldNumber: 4,
		},
		asset: {
			dataType: 'bytes',
			fieldNumber: 5,
		},
		signatures: {
			type: 'array',
			items: {
				dataType: 'bytes',
			},
			fieldNumber: 6,
		},
	},
};

const assetSchema = {
	$id: 'assetSchema',
	type: 'object',
	properties: {
		unlockObjects: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					delegateAddress: { dataType: 'bytes', fieldNumber: 1 },
					amount: { dataType: 'uint64', fieldNumber: 2 },
					unvoteHeight: { dataType: 'uint32', fieldNumber: 3 },
				},
				required: ['delegateAddress', 'amount', 'unvoteHeight'],
			},
		},
		fieldNumber: 1,
	},
	required: ['unlockObjects'],
};

const getAssetBytes = asset => codec.encode(assetSchema, asset);

const getSignBytes = tx => {
	const assetBytes = getAssetBytes(tx.asset);
	const signingTx = {
		...tx,
		asset: assetBytes,
		signatures: [],
	};
	return codec.encode(baseSchema, signingTx);
};

const encode = tx => {
	const assetBytes = getAssetBytes(tx.asset);
	const txWithAssetBytes = {
		...tx,
		asset: assetBytes,
	};
	return codec.encode(baseSchema, txWithAssetBytes);
};

const generateValidUpvoteTransaction = () => {
	const unsignedTransaction = {
		type: 14,
		fee: BigInt('1500000000'),
		nonce: BigInt('3'),
		senderPublicKey: senderAccount.publicKey,
		asset: {
			unlockObjects: [
				{
					delegateAddress: delegateAccounts[0].address,
					amount: BigInt('1000000000'),
					unvoteHeight: 32,
				},
				{
					delegateAddress: delegateAccounts[1].address,
					amount: BigInt('50000000000'),
					unvoteHeight: 12,
				},
				{
					delegateAddress: delegateAccounts[2].address,
					amount: BigInt('320000000000'),
					unvoteHeight: 14,
				},
				{
					delegateAddress: delegateAccounts[0].address,
					amount: BigInt('420000000000'),
					unvoteHeight: 19,
				},
				{
					delegateAddress: delegateAccounts[0].address,
					amount: BigInt('520000000000'),
					unvoteHeight: 50,
				},
				{
					delegateAddress: delegateAccounts[2].address,
					amount: BigInt('620000000000'),
					unvoteHeight: 14,
				},
				{
					delegateAddress: delegateAccounts[2].address,
					amount: BigInt('620000000000'),
					unvoteHeight: 14,
				},
				{
					delegateAddress: delegateAccounts[3].address,
					amount: BigInt('920000000000'),
					unvoteHeight: 33,
				},
				{
					delegateAddress: delegateAccounts[4].address,
					amount: BigInt('140000000000'),
					unvoteHeight: 19,
				},
				{
					delegateAddress: delegateAccounts[5].address,
					amount: BigInt('130000000000'),
					unvoteHeight: 53,
				},
				{
					delegateAddress: delegateAccounts[6].address,
					amount: BigInt('1000000000'),
					unvoteHeight: 32,
				},
				{
					delegateAddress: delegateAccounts[7].address,
					amount: BigInt('50000000000'),
					unvoteHeight: 18,
				},
				{
					delegateAddress: delegateAccounts[8].address,
					amount: BigInt('320000000000'),
					unvoteHeight: 29,
				},
				{
					delegateAddress: delegateAccounts[9].address,
					amount: BigInt('420000000000'),
					unvoteHeight: 6,
				},
				{
					delegateAddress: senderAccount.address,
					amount: BigInt('520000000000'),
					unvoteHeight: 44,
				},
				{
					delegateAddress: delegateAccounts[11].address,
					amount: BigInt('620000000000'),
					unvoteHeight: 41,
				},
				{
					delegateAddress: delegateAccounts[12].address,
					amount: BigInt('820000000000'),
					unvoteHeight: 13,
				},
				{
					delegateAddress: delegateAccounts[13].address,
					amount: BigInt('920000000000'),
					unvoteHeight: 25,
				},
				{
					delegateAddress: delegateAccounts[14].address,
					amount: BigInt('140000000000'),
					unvoteHeight: 31,
				},
				{
					delegateAddress: delegateAccounts[15].address,
					amount: BigInt('130000000000'),
					unvoteHeight: 21,
				},
			],
		},
	};
	const signBytes = getSignBytes(unsignedTransaction);
	const signature = Buffer.from(
		signData(
			Buffer.concat([networkIdentifier, signBytes]),
			senderAccount.passphrase,
		),
		'hex',
	);
	const encodedTx = encode({
		...unsignedTransaction,
		signatures: [signature],
	});

	return {
		description: 'Valid unlock transaction',
		input: {
			account: {
				...senderAccount,
				address: senderAccount.address.toString('base64'),
				publicKey: senderAccount.publicKey.toString('base64'),
			},
			networkIdentifier: networkIdentifier.toString('base64'),
			delegates: delegateAccounts.map(d => ({
				...d,
				address: d.address.toString('base64'),
				publicKey: d.publicKey.toString('base64'),
			})),
		},
		output: {
			transaction: encodedTx.toString('base64'),
		},
	};
};

const validUnlockingSuite = () => ({
	title: 'Valid unlock transaction',
	summary:
		'Valid unlock transaction which includes the unlock for the same account',
	config: {
		network: 'devnet',
	},
	runner: 'unlock_transaction',
	handler: 'unlock_transaction',
	testCases: [generateValidUpvoteTransaction()],
});

module.exports = BaseGenerator.runGenerator('unlock_transaction', [
	validUnlockingSuite,
]);
