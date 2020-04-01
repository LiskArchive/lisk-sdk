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

const {
	BIG_ENDIAN,
	hash,
	getPrivateAndPublicKeyBytesFromPassphrase,
	signData,
	signDataWithPrivateKey,
	hexToBuffer,
	intToBuffer,
	LITTLE_ENDIAN,
	getFirstEightBytesReversed,
	bufferToIntAsString,
} = require('@liskhq/lisk-cryptography');

const BaseGenerator = require('../base_generator');

const networkIdentifier =
	'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

const SIZE_INT32 = 4;
const SIZE_INT64 = 8;

const getBytes = block => {
	const blockVersionBuffer = intToBuffer(
		block.version,
		SIZE_INT32,
		LITTLE_ENDIAN,
	);

	const timestampBuffer = intToBuffer(
		block.timestamp,
		SIZE_INT32,
		LITTLE_ENDIAN,
	);

	const previousBlockBuffer = block.previousBlockId
		? intToBuffer(block.previousBlockId, SIZE_INT64, BIG_ENDIAN)
		: Buffer.alloc(SIZE_INT64);

	const seedRevealBuffer = Buffer.from(block.seedReveal, 'hex');

	const heightBuffer = intToBuffer(block.height, SIZE_INT32, LITTLE_ENDIAN);

	const maxHeightPreviouslyForgedBuffer = intToBuffer(
		block.maxHeightPreviouslyForged,
		SIZE_INT32,
		LITTLE_ENDIAN,
	);

	const maxHeightPrevotedBuffer = intToBuffer(
		block.maxHeightPrevoted,
		SIZE_INT32,
		LITTLE_ENDIAN,
	);

	const numTransactionsBuffer = intToBuffer(
		block.numberOfTransactions,
		SIZE_INT32,
		LITTLE_ENDIAN,
	);

	const totalAmountBuffer = intToBuffer(
		block.totalAmount.toString(),
		SIZE_INT64,
		LITTLE_ENDIAN,
	);

	const totalFeeBuffer = intToBuffer(
		block.totalFee.toString(),
		SIZE_INT64,
		LITTLE_ENDIAN,
	);

	const rewardBuffer = intToBuffer(
		block.reward.toString(),
		SIZE_INT64,
		LITTLE_ENDIAN,
	);

	const payloadLengthBuffer = intToBuffer(
		block.payloadLength,
		SIZE_INT32,
		LITTLE_ENDIAN,
	);

	const payloadHashBuffer = hexToBuffer(block.payloadHash);

	const generatorPublicKeyBuffer = hexToBuffer(block.generatorPublicKey);

	const blockSignatureBuffer = block.blockSignature
		? hexToBuffer(block.blockSignature)
		: Buffer.alloc(0);

	return Buffer.concat([
		blockVersionBuffer,
		timestampBuffer,
		previousBlockBuffer,
		seedRevealBuffer,
		heightBuffer,
		maxHeightPreviouslyForgedBuffer,
		maxHeightPrevotedBuffer,
		numTransactionsBuffer,
		totalAmountBuffer,
		totalFeeBuffer,
		rewardBuffer,
		payloadLengthBuffer,
		payloadHashBuffer,
		generatorPublicKeyBuffer,
		blockSignatureBuffer,
	]);
};

const sign = (block, privateKey) =>
	signDataWithPrivateKey(
		hash(
			Buffer.concat([Buffer.from(networkIdentifier, 'hex'), getBytes(block)]),
		),
		Buffer.from(privateKey, 'hex'),
	);

const getId = transactionBytes => {
	const transactionHash = hash(transactionBytes);
	const bufferFromFirstEntriesReversed = getFirstEightBytesReversed(
		transactionHash,
	);
	const transactionId = bufferToIntAsString(bufferFromFirstEntriesReversed);

	return transactionId;
};

const assetToBytes = tx => {
	const { header1, header2 } = tx.asset;

	const assetBuffer = Buffer.concat([getBytes(header1), getBytes(header2)]);

	return assetBuffer;
};

const serialize = tx => {
	const transactionNonce = intToBuffer(tx.nonce.toString(), 8);

	const buf = Buffer.concat([
		Buffer.alloc(1, tx.type),
		transactionNonce,
		hexToBuffer(tx.senderPublicKey),
		intToBuffer(tx.fee.toString(), 8),
		assetToBytes(tx),
	]);

	return buf;
};

const createSignatureObject = (txBuffer, account) => ({
	signature: signData(
		hash(Buffer.concat([hexToBuffer(networkIdentifier), txBuffer])),
		account.passphrase,
	),
});

const accounts = {
	reporter: {
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
	forger: {
		address: '10881167371402274308L',
		publicKey:
			'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
		passphrase:
			'actress route auction pudding shiver crater forum liquid blouse imitate seven front',
		balance: '0',
		delegateName: 'genesis_100',
	},
};

const forgerKeyPair = getPrivateAndPublicKeyBytesFromPassphrase(
	accounts.forger.passphrase,
);

/*
	Scenario 1:

	b1.maxHeightPrevoted==b2.maxHeightPrevoted &&  b1.height>=b2.height
*/

const scenario1Header1 = {
	version: 2,
	timestamp: 2000000,
	previousBlockId: '10620616195853047363',
	seedReveal: 'c8c557b5dba8527c0e760124128fd15c',
	height: 200000,
	maxHeightPreviouslyForged: 100000,
	maxHeightPrevoted: 100000,
	numberOfTransactions: 0,
	totalAmount: '0',
	totalFee: '10000000000',
	reward: '10000000000',
	payloadLength: 0,
	payloadHash: hash(Buffer.alloc(0)).toString('hex'),
	generatorPublicKey:
		'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
};

scenario1Header1.blockSignature = sign(
	scenario1Header1,
	forgerKeyPair.privateKeyBytes.toString('hex'),
);

const scenario1Header2 = {
	version: 2,
	timestamp: 3000000,
	previousBlockId: '10620616195853047363',
	seedReveal: 'c8c557b5dba8527c0e760124128fd15c',
	height: 300000,
	maxHeightPreviouslyForged: 100000,
	maxHeightPrevoted: 100000,
	numberOfTransactions: 0,
	totalAmount: '0',
	totalFee: '10000000000',
	reward: '10000000000',
	payloadLength: 0,
	payloadHash: hash(Buffer.alloc(0)).toString('hex'),
	generatorPublicKey:
		'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
};

scenario1Header2.blockSignature = sign(
	scenario1Header2,
	forgerKeyPair.privateKeyBytes.toString('hex'),
);

const generateValidProofOfMisbehaviorTransactionForScenario1 = () => {
	const unsignedTransaction = {
		senderPublicKey: accounts.reporter.publicKey,
		nonce: '1',
		fee: '1500000000',
		type: 15,
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

	const signBytes = serialize(tx);

	tx.signatures.push(
		createSignatureObject(signBytes, accounts.reporter).signature,
	);

	const id = getId(
		Buffer.concat([
			signBytes,
			Buffer.from('01', 'hex'),
			Buffer.from(tx.signatures[0], 'hex'),
		]),
	);

	tx.id = id;

	return {
		input: {
			reportingAccount: accounts.reporter,
			targetAccount: accounts.forger,
			networkIdentifier,
		},
		output: tx,
	};
};

/*
	Scenario 2:

	b1.height>b2.maxHeightPreviouslyForged
*/

const scenario2Header1 = {
	version: 2,
	timestamp: 2000000,
	previousBlockId: '10620616195853047363',
	seedReveal: 'c8c557b5dba8527c0e760124128fd15c',
	height: 200000,
	maxHeightPreviouslyForged: 100000,
	maxHeightPrevoted: 100000,
	numberOfTransactions: 0,
	totalAmount: '0',
	totalFee: '10000000000',
	reward: '10000000000',
	payloadLength: 0,
	payloadHash: hash(Buffer.alloc(0)).toString('hex'),
	generatorPublicKey:
		'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
};

scenario2Header1.blockSignature = sign(
	scenario2Header1,
	forgerKeyPair.privateKeyBytes.toString('hex'),
);

const scenario2Header2 = {
	version: 2,
	timestamp: 2000000,
	previousBlockId: '10620616195853047363',
	seedReveal: 'c8c557b5dba8527c0e760124128fd15c',
	height: 200000,
	maxHeightPreviouslyForged: 100000,
	maxHeightPrevoted: 50000,
	numberOfTransactions: 0,
	totalAmount: '0',
	totalFee: '10000000000',
	reward: '10000000000',
	payloadLength: 0,
	payloadHash: hash(Buffer.alloc(0)).toString('hex'),
	generatorPublicKey:
		'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
};

scenario2Header2.blockSignature = sign(
	scenario2Header2,
	forgerKeyPair.privateKeyBytes.toString('hex'),
);

const generateValidProofOfMisbehaviorTransactionForScenario2 = () => {
	const unsignedTransaction = {
		senderPublicKey: accounts.reporter.publicKey,
		nonce: '1',
		fee: '1500000000',
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

	const signBytes = serialize(tx);

	tx.signatures.push(
		createSignatureObject(signBytes, accounts.reporter).signature,
	);

	const id = getId(
		Buffer.concat([
			signBytes,
			Buffer.from('01', 'hex'),
			Buffer.from(tx.signatures[0], 'hex'),
		]),
	);

	tx.id = id;

	return {
		input: {
			reportingAccount: accounts.reporter,
			targetAccount: accounts.forger,
			networkIdentifier,
		},
		output: tx,
	};
};

/*
	Scenario 3:

	b1.maxHeightPrevoted>b2.maxHeightPrevoted
*/

const scenario3Header1 = {
	version: 2,
	timestamp: 2000000,
	previousBlockId: '10620616195853047363',
	seedReveal: 'c8c557b5dba8527c0e760124128fd15c',
	height: 200000,
	maxHeightPreviouslyForged: 100000,
	maxHeightPrevoted: 100000,
	numberOfTransactions: 0,
	totalAmount: '0',
	totalFee: '10000000000',
	reward: '10000000000',
	payloadLength: 0,
	payloadHash: hash(Buffer.alloc(0)).toString('hex'),
	generatorPublicKey:
		'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
};

scenario3Header1.blockSignature = sign(
	scenario3Header1,
	forgerKeyPair.privateKeyBytes.toString('hex'),
);

const scenario3Header2 = {
	version: 2,
	timestamp: 2000000,
	previousBlockId: '10620616195853047363',
	seedReveal: 'c8c557b5dba8527c0e760124128fd15c',
	height: 300000,
	maxHeightPreviouslyForged: 100000,
	maxHeightPrevoted: 100001,
	numberOfTransactions: 0,
	totalAmount: '0',
	totalFee: '10000000000',
	reward: '10000000000',
	payloadLength: 0,
	payloadHash: hash(Buffer.alloc(0)).toString('hex'),
	generatorPublicKey:
		'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca9',
};

scenario3Header2.blockSignature = sign(
	scenario3Header2,
	forgerKeyPair.privateKeyBytes.toString('hex'),
);

const generateValidProofOfMisbehaviorTransactionForScenario3 = () => {
	const unsignedTransaction = {
		senderPublicKey: accounts.reporter.publicKey,
		nonce: '1',
		fee: '1500000000',
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

	const signBytes = serialize(tx);

	tx.signatures.push(
		createSignatureObject(signBytes, accounts.reporter).signature,
	);

	const id = getId(
		Buffer.concat([
			signBytes,
			Buffer.from('01', 'hex'),
			Buffer.from(tx.signatures[0], 'hex'),
		]),
	);

	tx.id = id;

	return {
		input: {
			reportingAccount: accounts.reporter,
			targetAccount: accounts.forger,
			networkIdentifier,
		},
		output: tx,
	};
};

const validProofOfMisbehaviorForScenario1Suite = () => ({
	title: 'Valid proof-of-misbehavior transaction for scenario 1',
	summary: 'A proof-of-misbehavior transaction',
	config: {
		network: 'devnet',
	},
	runner: 'proof_of_misbehavior_transaction',
	handler: 'proof_of_misbehavior_transaction_scenario_1',
	testCases: generateValidProofOfMisbehaviorTransactionForScenario1(),
});

const validProofOfMisbehaviorForScenario2Suite = () => ({
	title: 'Valid proof-of-misbehavior transaction for scenario 2',
	summary: 'A proof-of-misbehavior transaction',
	config: {
		network: 'devnet',
	},
	runner: 'proof_of_misbehavior_transaction',
	handler: 'proof_of_misbehavior_transaction_scenario_2',
	testCases: generateValidProofOfMisbehaviorTransactionForScenario2(),
});

const validProofOfMisbehaviorForScenario3Suite = () => ({
	title: 'Valid proof-of-misbehavior transaction for scenario 3',
	summary: 'A proof-of-misbehavior transaction',
	config: {
		network: 'devnet',
	},
	runner: 'proof_of_misbehavior_transaction',
	handler: 'proof_of_misbehavior_transaction_scenario_3',
	testCases: generateValidProofOfMisbehaviorTransactionForScenario3(),
});

module.exports = BaseGenerator.runGenerator(
	'proof_of_misbehavior_transaction',
	[
		validProofOfMisbehaviorForScenario1Suite,
		validProofOfMisbehaviorForScenario2Suite,
		validProofOfMisbehaviorForScenario3Suite,
	],
);
