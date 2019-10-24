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
	hexToBuffer,
	intToBuffer,
	hash,
	getFirstEightBytesReversed,
	bufferToIntAsString,
	signData,
} = require('@liskhq/lisk-cryptography');
const BaseGenerator = require('../base_generator');

const accounts = [
	{
		passphrase:
			'wear protect skill sentence lift enter wild sting lottery power floor neglect',
		privateKey:
			'8f41ff1e75c4f0f8a71bae4952266928d0e91660fc513566ac694fed61157497efaf1d977897cb60d7db9d30e8fd668dee070ac0db1fb8d184c06152a8b75f8d',
		publicKey:
			'efaf1d977897cb60d7db9d30e8fd668dee070ac0db1fb8d184c06152a8b75f8d',
		address: '2129300327344985743L',
	},
	{
		passphrase:
			'inherit moon normal relief spring bargain hobby join baby flash fog blood',
		privateKey:
			'de4a28610239ceac2ec3f592e36a2ead8ed4ac93cb16aa0d996ab6bb0249da2c0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
		publicKey:
			'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
		address: '18141291412139607230L',
	},
	{
		passphrase:
			'better across runway mansion jar route valid crack panic favorite smooth sword',
		privateKey:
			'de1520f8589408e76a97643ba7d27f20009b06899816c8af20f9b03f4a4bd8a66766ce280eb99e45d2cc7d9c8c852720940dab5d69f480e80477a97b4255d5d8',
		publicKey:
			'6766ce280eb99e45d2cc7d9c8c852720940dab5d69f480e80477a97b4255d5d8',
		address: '13191770412077040757L',
	},
	{
		passphrase:
			'mirror swap middle hunt angle furnace maid scheme amazing box bachelor debris',
		privateKey:
			'ad7462eb8f682b0c3424213ead044381ba0007bb65ce26287fc308027c871d951387d8ec6306807ffd6fe27ea3443985765c1157928bb09904307956f46a9972',
		publicKey:
			'1387d8ec6306807ffd6fe27ea3443985765c1157928bb09904307956f46a9972',
		address: '2443122499609067441L',
	},
];

const networkIdentifier =
	'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

const getId = transactionBytes => {
	const transactionHash = hash(transactionBytes);
	const bufferFromFirstEntriesReversed = getFirstEightBytesReversed(
		transactionHash,
	);
	const transactionId = bufferToIntAsString(bufferFromFirstEntriesReversed);

	return transactionId;
};

const generateValidTransferTransaction = () => {
	const tx = {
		type: 8,
		senderPublicKey: accounts[0].publicKey,
		timestamp: 54316324,
		asset: {
			recipientId: accounts[1].address,
			amount: '1234567890',
			data: 'random data',
		},
	};

	const transactionTimestamp = Buffer.alloc(4);
	transactionTimestamp.writeIntLE(tx.timestamp, 0, 4);
	const txBuffer = Buffer.concat([
		Buffer.alloc(1, tx.type),
		transactionTimestamp,
		hexToBuffer(tx.senderPublicKey),
		intToBuffer(tx.asset.amount, 8, 'big'),
		intToBuffer(tx.asset.recipientId.slice(0, -1), 8),
		Buffer.from(tx.asset.data, 'utf8'),
	]);

	const signature = signData(
		hash(Buffer.concat([hexToBuffer(networkIdentifier), txBuffer])),
		accounts[0].passphrase,
	);

	const id = getId(Buffer.concat([txBuffer, Buffer.from(signature, 'hex')]));

	const signedTransaction = {
		...tx,
		signature,
		id,
	};

	return {
		input: {
			account: accounts[0],
			networkIdentifier,
			transaction: tx,
		},
		output: signedTransaction,
	};
};

const generateValidTransferTransactionWithSecondSignature = () => {
	const tx = {
		type: 8,
		senderPublicKey: accounts[0].publicKey,
		timestamp: 54316325,
		asset: {
			recipientId: accounts[1].address,
			amount: '1234567890',
			data: 'random data',
		},
	};

	const transactionTimestamp = Buffer.alloc(4);
	transactionTimestamp.writeIntLE(tx.timestamp, 0, 4);
	const txBuffer = Buffer.concat([
		Buffer.alloc(1, tx.type),
		transactionTimestamp,
		hexToBuffer(tx.senderPublicKey),
		intToBuffer(tx.asset.amount, 8, 'big'),
		intToBuffer(tx.asset.recipientId.slice(0, -1), 8),
		Buffer.from(tx.asset.data, 'utf8'),
	]);

	const signature = signData(
		hash(Buffer.concat([hexToBuffer(networkIdentifier), txBuffer])),
		accounts[0].passphrase,
	);

	const signSignature = signData(
		hash(
			Buffer.concat([
				hexToBuffer(networkIdentifier),
				txBuffer,
				Buffer.from(signature, 'hex'),
			]),
		),
		accounts[1].passphrase,
	);

	const id = getId(
		Buffer.concat([
			txBuffer,
			Buffer.from(signature, 'hex'),
			Buffer.from(signSignature, 'hex'),
		]),
	);

	const signedTransaction = {
		...tx,
		signature,
		signSignature,
		id,
	};

	return {
		input: {
			account: accounts[0],
			secondPassphrase: accounts[1].passphrase,
			networkIdentifier,
			transaction: tx,
		},
		output: signedTransaction,
	};
};

const generateValidTransferTransactionWithMultiSignature = () => {
	const tx = {
		type: 8,
		senderPublicKey: accounts[0].publicKey,
		timestamp: 54316325,
		asset: {
			recipientId: accounts[1].address,
			amount: '1234567890',
			data: 'random data',
		},
	};

	const transactionTimestamp = Buffer.alloc(4);
	transactionTimestamp.writeIntLE(tx.timestamp, 0, 4);
	const txBuffer = Buffer.concat([
		Buffer.alloc(1, tx.type),
		transactionTimestamp,
		hexToBuffer(tx.senderPublicKey),
		intToBuffer(tx.asset.amount, 8, 'big'),
		intToBuffer(tx.asset.recipientId.slice(0, -1), 8),
		Buffer.from(tx.asset.data, 'utf8'),
	]);

	const signature = signData(
		hash(Buffer.concat([hexToBuffer(networkIdentifier), txBuffer])),
		accounts[0].passphrase,
	);

	const id = getId(Buffer.concat([txBuffer, Buffer.from(signature, 'hex')]));

	const signatures = [
		signData(
			hash(Buffer.concat([hexToBuffer(networkIdentifier), txBuffer])),
			accounts[2].passphrase,
		),
		signData(
			hash(Buffer.concat([hexToBuffer(networkIdentifier), txBuffer])),
			accounts[3].passphrase,
		),
	];

	const signedTransaction = {
		...tx,
		signature,
		signatures,
		id,
	};

	return {
		input: {
			account: accounts[0],
			coSigners: [accounts[2], accounts[3]],
			networkIdentifier,
			transaction: tx,
		},
		output: signedTransaction,
	};
};

const generateValidTransferTransactionWithSecondAndMultiSignature = () => {
	const tx = {
		type: 8,
		senderPublicKey: accounts[0].publicKey,
		timestamp: 54316325,
		asset: {
			recipientId: accounts[1].address,
			amount: '1234567890',
			data: 'random data',
		},
	};

	const transactionTimestamp = Buffer.alloc(4);
	transactionTimestamp.writeIntLE(tx.timestamp, 0, 4);
	const txBuffer = Buffer.concat([
		Buffer.alloc(1, tx.type),
		transactionTimestamp,
		hexToBuffer(tx.senderPublicKey),
		intToBuffer(tx.asset.amount, 8, 'big'),
		intToBuffer(tx.asset.recipientId.slice(0, -1), 8),
		Buffer.from(tx.asset.data, 'utf8'),
	]);

	const signature = signData(
		hash(Buffer.concat([hexToBuffer(networkIdentifier), txBuffer])),
		accounts[0].passphrase,
	);

	const signSignature = signData(
		hash(
			Buffer.concat([
				hexToBuffer(networkIdentifier),
				txBuffer,
				Buffer.from(signature, 'hex'),
			]),
		),
		accounts[1].passphrase,
	);

	const id = getId(
		Buffer.concat([
			txBuffer,
			Buffer.from(signature, 'hex'),
			Buffer.from(signSignature, 'hex'),
		]),
	);

	const signatures = [
		signData(
			hash(Buffer.concat([hexToBuffer(networkIdentifier), txBuffer])),
			accounts[2].passphrase,
		),
		signData(
			hash(Buffer.concat([hexToBuffer(networkIdentifier), txBuffer])),
			accounts[3].passphrase,
		),
	];

	const signedTransaction = {
		...tx,
		signature,
		signSignature,
		signatures,
		id,
	};

	return {
		input: {
			account: accounts[0],
			secondPassphrase: accounts[1].passphrase,
			coSigners: [accounts[2], accounts[3]],
			networkIdentifier,
			transaction: tx,
		},
		output: signedTransaction,
	};
};

const generateValidSecondSignatureTransaction = () => {
	const tx = {
		type: 9,
		senderPublicKey: accounts[0].publicKey,
		timestamp: 54316325,
		asset: {
			publicKey: accounts[1].publicKey,
		},
	};

	const transactionTimestamp = Buffer.alloc(4);
	transactionTimestamp.writeIntLE(tx.timestamp, 0, 4);
	const txBuffer = Buffer.concat([
		Buffer.alloc(1, tx.type),
		transactionTimestamp,
		hexToBuffer(tx.senderPublicKey),
		hexToBuffer(tx.asset.publicKey),
	]);

	const signature = signData(
		hash(Buffer.concat([hexToBuffer(networkIdentifier), txBuffer])),
		accounts[0].passphrase,
	);

	const id = getId(Buffer.concat([txBuffer, Buffer.from(signature, 'hex')]));

	const signedTransaction = {
		...tx,
		signature,
		id,
	};

	return {
		input: {
			account: accounts[0],
			networkIdentifier,
			transaction: tx,
		},
		output: signedTransaction,
	};
};

const generateValidDelegateTransaction = () => {
	const tx = {
		type: 10,
		senderPublicKey: accounts[0].publicKey,
		timestamp: 54316335,
		asset: {
			username: 'new_delegate',
		},
	};

	const transactionTimestamp = Buffer.alloc(4);
	transactionTimestamp.writeIntLE(tx.timestamp, 0, 4);
	const txBuffer = Buffer.concat([
		Buffer.alloc(1, tx.type),
		transactionTimestamp,
		hexToBuffer(tx.senderPublicKey),
		Buffer.from(tx.asset.username, 'utf8'),
	]);

	const signature = signData(
		hash(Buffer.concat([hexToBuffer(networkIdentifier), txBuffer])),
		accounts[0].passphrase,
	);

	const id = getId(Buffer.concat([txBuffer, Buffer.from(signature, 'hex')]));

	const signedTransaction = {
		...tx,
		signature,
		id,
	};

	return {
		input: {
			account: accounts[0],
			networkIdentifier,
			transaction: tx,
		},
		output: signedTransaction,
	};
};

const generateValidVoteTransaction = () => {
	const tx = {
		type: 11,
		senderPublicKey: accounts[0].publicKey,
		timestamp: 54316326,
		asset: {
			votes: [
				`+${accounts[1].publicKey}`,
				`+${accounts[2].publicKey}`,
				`-${accounts[3].publicKey}`,
			],
		},
	};

	const transactionTimestamp = Buffer.alloc(4);
	transactionTimestamp.writeIntLE(tx.timestamp, 0, 4);
	const txBuffer = Buffer.concat([
		Buffer.alloc(1, tx.type),
		transactionTimestamp,
		hexToBuffer(tx.senderPublicKey),
		Buffer.from(tx.asset.votes.join(''), 'utf8'),
	]);

	const signature = signData(
		hash(Buffer.concat([hexToBuffer(networkIdentifier), txBuffer])),
		accounts[0].passphrase,
	);

	const id = getId(Buffer.concat([txBuffer, Buffer.from(signature, 'hex')]));

	const signedTransaction = {
		...tx,
		signature,
		id,
	};

	return {
		input: {
			account: accounts[0],
			networkIdentifier,
			transaction: tx,
		},
		output: signedTransaction,
	};
};

const generateValidMultisignatureTransaction = () => {
	const tx = {
		type: 12,
		senderPublicKey: accounts[0].publicKey,
		timestamp: 44316326,
		asset: {
			min: 2,
			lifetime: 22,
			keysgroup: [
				`+${accounts[1].publicKey}`,
				`+${accounts[2].publicKey}`,
				`+${accounts[3].publicKey}`,
			],
		},
	};

	const transactionTimestamp = Buffer.alloc(4);
	transactionTimestamp.writeIntLE(tx.timestamp, 0, 4);
	const txBuffer = Buffer.concat([
		Buffer.alloc(1, tx.type),
		transactionTimestamp,
		hexToBuffer(tx.senderPublicKey),
		Buffer.alloc(1, tx.asset.min),
		Buffer.alloc(1, tx.asset.lifetime),
		Buffer.from(tx.asset.keysgroup.join(''), 'utf8'),
	]);

	const signature = signData(
		hash(Buffer.concat([hexToBuffer(networkIdentifier), txBuffer])),
		accounts[0].passphrase,
	);

	const id = getId(Buffer.concat([txBuffer, Buffer.from(signature, 'hex')]));

	const signatures = [
		signData(
			hash(Buffer.concat([hexToBuffer(networkIdentifier), txBuffer])),
			accounts[1].passphrase,
		),
		signData(
			hash(Buffer.concat([hexToBuffer(networkIdentifier), txBuffer])),
			accounts[2].passphrase,
		),
		signData(
			hash(Buffer.concat([hexToBuffer(networkIdentifier), txBuffer])),
			accounts[3].passphrase,
		),
	];

	const signedTransaction = {
		...tx,
		signature,
		signatures,
		id,
	};

	return {
		input: {
			account: accounts[0],
			networkIdentifier,
			coSigners: [accounts[1], accounts[2], accounts[3]],
			transaction: tx,
		},
		output: signedTransaction,
	};
};

const validTransferSuite = () => ({
	title: 'Valid transfer transaction',
	summary: 'A valid transfer transaction',
	config: 'devnet',
	runner: 'transaction_network_id_and_change_order',
	handler: 'transfer_transaction_validate',
	testCases: generateValidTransferTransaction(),
});

const validTransferWithSecondSignatureSuite = () => ({
	title: 'Valid transfer transaction with second signature',
	summary: 'A valid transfer transaction with second signature',
	config: 'devnet',
	runner: 'transaction_network_id_and_change_order',
	handler: 'transfer_transaction_with_second_signature_validate',
	testCases: generateValidTransferTransactionWithSecondSignature(),
});

const validTransferWithMultisignature = () => ({
	title: 'Valid transfer transaction with multi signature',
	summary: 'A valid transfer transaction with multi signature',
	config: 'devnet',
	runner: 'transaction_network_id_and_change_order',
	handler: 'transfer_transaction_with_multi_signature_validate',
	testCases: generateValidTransferTransactionWithMultiSignature(),
});

const validTransferWithSecondSignatureSuiteAndMultisignature = () => ({
	title: 'Valid transfer transaction with second signature and multi signature',
	summary:
		'A valid transfer transaction with second signature and multi signature',
	config: 'devnet',
	runner: 'transaction_network_id_and_change_order',
	handler: 'transfer_transaction_with_second_and_multi_signature_validate',
	testCases: generateValidTransferTransactionWithSecondAndMultiSignature(),
});

const validSecondSignatureSuite = () => ({
	title: 'Valid second signature transaction',
	summary: 'A valid second signature transaction',
	config: 'devnet',
	runner: 'transaction_network_id_and_change_order',
	handler: 'second_signature_transaction_validate',
	testCases: generateValidSecondSignatureTransaction(),
});

const validDelegateSuite = () => ({
	title: 'Valid delegate transaction',
	summary: 'A valid delegate transaction',
	config: 'devnet',
	runner: 'transaction_network_id_and_change_order',
	handler: 'delegate_transaction_validate',
	testCases: generateValidDelegateTransaction(),
});

const validVoteSuite = () => ({
	title: 'Valid vote transaction',
	summary: 'A valid vote transaction',
	config: 'devnet',
	runner: 'transaction_network_id_and_change_order',
	handler: 'vote_transaction_validate',
	testCases: generateValidVoteTransaction(),
});

const validMultisignatureSuite = () => ({
	title: 'Valid multi signature transaction',
	summary: 'A valid multi signature transaction',
	config: 'devnet',
	runner: 'transaction_network_id_and_change_order',
	handler: 'multi_signature_transaction_validate',
	testCases: generateValidMultisignatureTransaction(),
});

module.exports = BaseGenerator.runGenerator(
	'transaction_network_id_and_change_order',
	[
		validTransferSuite,
		validTransferWithSecondSignatureSuite,
		validTransferWithMultisignature,
		validTransferWithSecondSignatureSuiteAndMultisignature,
		validSecondSignatureSuite,
		validDelegateSuite,
		validVoteSuite,
		validMultisignatureSuite,
	],
);
