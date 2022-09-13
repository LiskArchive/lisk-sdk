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

const { utils, ed, legacy } = require('@liskhq/lisk-cryptography');
const { Codec } = require('@liskhq/lisk-codec');
const { baseTransactionSchema } = require('../../utils/schema');

const BaseGenerator = require('../base_generator');

const codec = new Codec();
const TAG_TRANSACTION = Buffer.from('LSK_TX_', 'utf8');
const TAG_BLOCK_HEADER = Buffer.from('LSK_BH_', 'utf8');
const chainID = Buffer.from('10000000', 'hex');

const pomAsset = {
	$id: '/asset/pom',
	type: 'object',
	properties: {
		header1: { dataType: 'bytes', fieldNumber: 1 },
		header2: { dataType: 'bytes', fieldNumber: 2 },
	},
	required: ['header1', 'header2'],
};

const blockHeaderWithoutSignature = {
	$id: '/asset/header/no-signature',
	type: 'object',
	properties: {
		version: { dataType: 'uint32', fieldNumber: 1 },
		timestamp: { dataType: 'uint32', fieldNumber: 2 },
		height: { dataType: 'uint32', fieldNumber: 3 },
		previousBlockID: { dataType: 'bytes', fieldNumber: 4 },
		transactionRoot: { dataType: 'bytes', fieldNumber: 5 },
		generatorPublicKey: { dataType: 'bytes', fieldNumber: 6 },
		reward: { dataType: 'uint64', fieldNumber: 7 },
		asset: { dataType: 'bytes', fieldNumber: 8 },
		signature: { dataType: 'bytes', fieldNumber: 9 },
	},
	required: [
		'version',
		'timestamp',
		'height',
		'previousBlockID',
		'transactionRoot',
		'generatorPublicKey',
		'reward',
		'asset',
	],
};

const blockHeader = {
	...blockHeaderWithoutSignature,
	$id: '/asset/header',
	properties: {
		...blockHeaderWithoutSignature.properties,
		signature: { dataType: 'bytes', fieldNumber: 9 },
	},
};

const blockAsset = {
	type: 'object',
	$id: '/block/asset',
	properties: {
		maxHeightPreviouslyForged: { dataType: 'uint32', fieldNumber: 1 },
		maxHeightPrevoted: { dataType: 'uint32', fieldNumber: 2 },
		seedReveal: { dataType: 'bytes', fieldNumber: 3 },
	},
	required: ['maxHeightPreviouslyForged', 'maxHeightPrevoted', 'seedReveal'],
};

const sign = (header, privateKey) => {
	const assetBytes = codec.encode(blockAsset, header.asset);
	const blockBytes = codec.encode(blockHeaderWithoutSignature, {
		...header,
		asset: assetBytes,
	});
	// console.log(privateKey);
	return ed.signDataWithPrivateKey(TAG_BLOCK_HEADER, chainID, blockBytes, privateKey);
};

const getAssetBytes = asset => {
	const { header1, header2 } = asset;

	const header1Asset = codec.encode(blockAsset, header1.asset);
	const header1Bytes = codec.encode(blockHeader, {
		...header1,
		asset: header1Asset,
	});
	const header2Asset = codec.encode(blockAsset, header2.asset);
	const header2Bytes = codec.encode(blockHeader, {
		...header2,
		asset: header2Asset,
	});

	return codec.encode(pomAsset, {
		header1: header1Bytes,
		header2: header2Bytes,
	});
};

const getSignBytes = tx => {
	const assetBytes = getAssetBytes(tx.asset);
	const signingTx = {
		...tx,
		asset: assetBytes,
		signatures: [],
	};
	return codec.encode(baseTransactionSchema, signingTx);
};

const encode = tx => {
	const assetBytes = getAssetBytes(tx.asset);
	const txWithAssetBytes = {
		...tx,
		asset: assetBytes,
	};
	return codec.encode(baseTransactionSchema, txWithAssetBytes);
};

const createSignatureObject = (txBuffer, account) => ({
	signature: ed.signData(
		TAG_TRANSACTION,
		chainID,
		txBuffer,
		legacy.getPrivateAndPublicKeyFromPassphrase(account.passphrase).privateKey,
	),
});

const accounts = {
	reporter: {
		address: Buffer.from('aa5414d4c90b66e2147ab4df201a73891c15124a', 'hex'),
		publicKey: Buffer.from(
			'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
			'hex',
		),
		passphrase: 'wagon stock borrow episode laundry kitten salute link globe zero feed marble',
		balance: BigInt('10000000000000000'),
		encryptedPassphrase:
			'iterations=1&salt=e8c7dae4c893e458e0ebb8bff9a36d84&cipherText=c0fab123d83c386ffacef9a171b6e0e0e9d913e58b7972df8e5ef358afbc65f99c9a2b6fe7716f708166ed72f59f007d2f96a91f48f0428dd51d7c9962e0c6a5fc27ca0722038f1f2cf16333&iv=1a2206e426c714091b7e48f6&tag=3a9d9f9f9a92c9a58296b8df64820c15&version=1',
		password: 'elephant tree paris dragon chair galaxy',
	},
	forger: {
		address: Buffer.from('04e600ca12ac019756483f9dc4f7d58079bf21f9', 'hex'),
		publicKey: Buffer.from(
			'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
			'hex',
		),
		passphrase:
			'actress route auction pudding shiver crater forum liquid blouse imitate seven front',
		balance: BigInt('10000000000000000'),
		delegateName: 'genesis_100',
	},
};

const getHexAccount = account => ({
	...account,
	address: account.address,
	publicKey: account.publicKey,
	balance: account.balance,
});

const forgerKeyPair = legacy.getPrivateAndPublicKeyFromPassphrase(accounts.forger.passphrase);

/*
	Scenario 1:

	b1.maxHeightPrevoted==b2.maxHeightPrevoted &&  b1.height>=b2.height
*/

const scenario1Header1 = {
	version: 2,
	timestamp: 2000000,
	previousBlockID: Buffer.from(
		'9696342ed355848b4cd6d7c77093121ae3fc10f449447f41044972174e75bc2b',
		'hex',
	),
	height: 900000,
	reward: BigInt('10000000000'),
	transactionRoot: utils.hash(Buffer.alloc(0)),
	generatorPublicKey: Buffer.from(
		'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
		'hex',
	),
	asset: {
		maxHeightPreviouslyForged: 690000,
		maxHeightPrevoted: 700000,
		seedReveal: Buffer.from('c8c557b5dba8527c0e760124128fd15c', 'hex'),
	},
};

scenario1Header1.signature = sign(scenario1Header1, forgerKeyPair.privateKey);

const scenario1Header2 = {
	version: 2,
	timestamp: 3000000,
	previousBlockID: Buffer.from(
		'9696342ed355848b4cd6d7c77093121ae3fc10f449447f41044972174e75bc2b',
		'hex',
	),
	height: 800000,
	reward: BigInt('10000000000'),
	transactionRoot: utils.hash(Buffer.alloc(0)),
	generatorPublicKey: Buffer.from(
		'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
		'hex',
	),
	asset: {
		maxHeightPreviouslyForged: 700000,
		maxHeightPrevoted: 700000,
		seedReveal: Buffer.from('c8c557b5dba8527c0e760124128fd15c', 'hex'),
	},
};

scenario1Header2.signature = sign(scenario1Header2, forgerKeyPair.privateKey);

const generateValidProofOfMisbehaviorTransactionForScenario1 = () => {
	const unsignedTransaction = {
		moduleID: 5,
		assetID: 5,
		senderPublicKey: accounts.reporter.publicKey,
		nonce: BigInt('1'),
		fee: BigInt('1500000000'),
		asset: {
			header1: scenario1Header1,
			header2: scenario1Header2,
		},
		signatures: [],
	};

	const tx = {
		...unsignedTransaction,
		asset: { ...unsignedTransaction.asset },
		signatures: [],
	};

	const signBytes = getSignBytes(tx);

	tx.signatures.push(createSignatureObject(signBytes, accounts.reporter).signature);

	const encodedTx = encode(tx);

	return {
		description: 'PoM with scenario 1',
		input: {
			reportingAccount: getHexAccount(accounts.reporter),
			targetAccount: getHexAccount(accounts.forger),
			chainID,
		},
		output: {
			transaction: encodedTx,
		},
	};
};

/*
	Scenario 2:

	b1.height>b2.maxHeightPreviouslyForged
*/

const scenario2Header1 = {
	version: 2,
	timestamp: 2000000,
	previousBlockID: Buffer.from(
		'9696342ed355848b4cd6d7c77093121ae3fc10f449447f41044972174e75bc2b',
		'hex',
	),
	height: 800000,
	reward: BigInt('10000000000'),
	transactionRoot: utils.hash(Buffer.alloc(0)),
	generatorPublicKey: Buffer.from(
		'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
		'hex',
	),
	asset: {
		maxHeightPreviouslyForged: 700000,
		maxHeightPrevoted: 700000,
		seedReveal: Buffer.from('c8c557b5dba8527c0e760124128fd15c', 'hex'),
	},
};

scenario2Header1.signature = sign(scenario2Header1, forgerKeyPair.privateKey);

const scenario2Header2 = {
	version: 2,
	timestamp: 2000000,
	previousBlockID: Buffer.from(
		'9696342ed355848b4cd6d7c77093121ae3fc10f449447f41044972174e75bc2b',
		'hex',
	),
	height: 800000,
	reward: BigInt('10000000000'),
	transactionRoot: utils.hash(Buffer.alloc(0)),
	generatorPublicKey: Buffer.from(
		'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
		'hex',
	),
	asset: {
		maxHeightPreviouslyForged: 700000,
		maxHeightPrevoted: 650000,
		seedReveal: Buffer.from('c8c557b5dba8527c0e760124128fd15c', 'hex'),
	},
};

scenario2Header2.signature = sign(scenario2Header2, forgerKeyPair.privateKey);

const generateValidProofOfMisbehaviorTransactionForScenario2 = () => {
	const unsignedTransaction = {
		senderPublicKey: accounts.reporter.publicKey,
		nonce: BigInt('1'),
		fee: BigInt('1500000000'),
		type: 15,
		asset: {
			header1: scenario2Header1,
			header2: scenario2Header2,
		},
		signatures: [],
	};

	const tx = {
		...unsignedTransaction,
		asset: { ...unsignedTransaction.asset },
		signatures: [],
	};

	const signBytes = getSignBytes(tx);

	tx.signatures.push(createSignatureObject(signBytes, accounts.reporter).signature);

	const encodedTx = encode(tx);

	return {
		description: 'PoM with scenario 2',
		input: {
			reportingAccount: getHexAccount(accounts.reporter),
			targetAccount: getHexAccount(accounts.forger),
			chainID,
		},
		output: {
			transaction: encodedTx,
		},
	};
};

/*
	Scenario 3:

	b1.maxHeightPrevoted>b2.maxHeightPrevoted
*/

const scenario3Header1 = {
	version: 2,
	timestamp: 2000000,
	previousBlockID: Buffer.from(
		'9696342ed355848b4cd6d7c77093121ae3fc10f449447f41044972174e75bc2b',
		'hex',
	),
	height: 900000,
	reward: BigInt('10000000000'),
	transactionRoot: utils.hash(Buffer.alloc(0)),
	generatorPublicKey: Buffer.from(
		'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
		'hex',
	),
	asset: {
		maxHeightPreviouslyForged: 850000,
		maxHeightPrevoted: 800000,
		seedReveal: Buffer.from('c8c557b5dba8527c0e760124128fd15c', 'hex'),
	},
};

scenario3Header1.signature = sign(scenario3Header1, forgerKeyPair.privateKey);

const scenario3Header2 = {
	version: 2,
	timestamp: 2000000,
	previousBlockID: Buffer.from(
		'9696342ed355848b4cd6d7c77093121ae3fc10f449447f41044972174e75bc2b',
		'hex',
	),
	height: 900000,
	reward: BigInt('10000000000'),
	transactionRoot: utils.hash(Buffer.alloc(0)),
	generatorPublicKey: Buffer.from(
		'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
		'hex',
	),
	asset: {
		maxHeightPreviouslyForged: 900000,
		maxHeightPrevoted: 700000,
		seedReveal: Buffer.from('c8c557b5dba8527c0e760124128fd15c', 'hex'),
	},
};

scenario3Header2.signature = sign(scenario3Header2, forgerKeyPair.privateKey);

const generateValidProofOfMisbehaviorTransactionForScenario3 = () => {
	const unsignedTransaction = {
		senderPublicKey: accounts.reporter.publicKey,
		nonce: BigInt('1'),
		fee: BigInt('1500000000'),
		type: 15,
		asset: {
			header1: scenario3Header1,
			header2: scenario3Header2,
		},
		signatures: [],
	};

	const tx = {
		...unsignedTransaction,
		asset: { ...unsignedTransaction.asset },
		signatures: [],
	};

	const signBytes = getSignBytes(tx);

	tx.signatures.push(createSignatureObject(signBytes, accounts.reporter).signature);

	const encodedTx = encode(tx);

	return {
		description: 'PoM with scenario 3',
		input: {
			reportingAccount: getHexAccount(accounts.reporter),
			targetAccount: getHexAccount(accounts.forger),
			chainID,
		},
		output: {
			transaction: encodedTx,
		},
	};
};

const validProofOfMisbehaviorForScenario1Suite = () => ({
	title: 'Valid proof-of-misbehavior transaction',
	summary: 'A proof-of-misbehavior transaction',
	config: {
		network: 'devnet',
	},
	runner: 'proof_of_misbehavior_transaction',
	handler: 'proof_of_misbehavior_transaction',
	testCases: [
		generateValidProofOfMisbehaviorTransactionForScenario1(),
		generateValidProofOfMisbehaviorTransactionForScenario2(),
		generateValidProofOfMisbehaviorTransactionForScenario3(),
	],
});

module.exports = BaseGenerator.runGenerator('proof_of_misbehavior_transaction', [
	validProofOfMisbehaviorForScenario1Suite,
]);
