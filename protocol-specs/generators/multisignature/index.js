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
	hexToBuffer,
	intToBuffer,
	hash,
	getFirstEightBytesReversed,
	bufferToIntAsString,
	signData,
} = require('@liskhq/lisk-cryptography');
const BaseGenerator = require('../base_generator');

const networkIdentifier =
	'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

const accounts = {
	targetAccount: {
		passphrase:
			'inherit moon normal relief spring bargain hobby join baby flash fog blood',
		privateKey:
			'de4a28610239ceac2ec3f592e36a2ead8ed4ac93cb16aa0d996ab6bb0249da2c0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
		publicKey:
			'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
		address: '18141291412139607230L',
	},
	mandatoryOne: {
		passphrase:
			'trim elegant oven term access apple obtain error grain excite lawn neck',
		privateKey:
			'8a138c0dd8efe597c8b9c519af69e9821bd1e769cf0fb3490e22209e9cabfb8df1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
		publicKey:
			'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
		address: '10481548956627905381L',
	},
	mandatoryTow: {
		passphrase:
			'desk deposit crumble farm tip cluster goose exotic dignity flee bring traffic',
		privateKey:
			'ddc8e19d6697d6e5c1dacf6576a7169752810999918212afe14d3978b354f8aa4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
		publicKey:
			'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
		address: '3372320078773139180L',
	},
	optionalOne: {
		passphrase:
			'sugar object slender confirm clock peanut auto spice carbon knife increase estate',
		privateKey:
			'69aa94ea7ade3b7b08e277b18c1a590b2306ce5973ae8462b0b85122b180e89c57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
		publicKey:
			'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
		address: '7745870967079479156L',
	},
	optionalTwo: {
		passphrase:
			'faculty inspire crouch quit sorry vague hard ski scrap jaguar garment limb',
		privateKey:
			'ffed38380998a90a2af9501f10182bc2a07922448ab383575b1e34aeddfa5482fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
		publicKey:
			'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
		address: '7086965981385941478L',
	},
};

const sortKeysDescending = publicKeys =>
	publicKeys.sort((publicKeyA, publicKeyB) => {
		// eslint-disable-next-line no-undef, new-cap
		if (BigInt(`0x${publicKeyA}`) > BigInt(`0x${publicKeyB}`)) return 1;
		// eslint-disable-next-line no-undef, new-cap
		if (BigInt(`0x${publicKeyA}`) < BigInt(`0x${publicKeyB}`)) return -1;
		return 0;
	});

const getId = transactionBytes => {
	const transactionHash = hash(transactionBytes);
	const bufferFromFirstEntriesReversed = getFirstEightBytesReversed(
		transactionHash,
	);
	const transactionId = bufferToIntAsString(bufferFromFirstEntriesReversed);

	return transactionId;
};

const assetToBytes = tx => {
	const { mandatoryKeys, optionalKeys, numberOfSignatures } = tx.asset;
	const mandatoryKeysBuffer = Buffer.from(mandatoryKeys.join(''), 'hex');
	const optionalKeysBuffer = Buffer.from(optionalKeys.join(''), 'hex');

	const assetBuffer = Buffer.concat([
		intToBuffer(mandatoryKeys.length, 1),
		mandatoryKeysBuffer,
		intToBuffer(optionalKeys.length, 1),
		optionalKeysBuffer,
		intToBuffer(numberOfSignatures, 1),
	]);
	return assetBuffer;
};

const createSignatureObject = (txBuffer, account) => ({
	signature: signData(
		hash(Buffer.concat([hexToBuffer(networkIdentifier), txBuffer])),
		account.passphrase,
	),
});

const serializeBasicProperties = tx => {
	const transactionTimestamp = Buffer.alloc(4);
	transactionTimestamp.writeIntBE(tx.timestamp, 0, 4);
	const buf = Buffer.concat([
		Buffer.alloc(1, tx.type),
		transactionTimestamp,
		hexToBuffer(tx.senderPublicKey),
		assetToBytes(tx),
	]);

	return buf;
};

const serializeMemberSignatures = (tx, txBuffer) => {
	let txBufferCopy = Buffer.alloc(txBuffer.length);
	txBuffer.copy(txBufferCopy);

	tx.signatures.forEach(aSignature => {
		const signatureBuffer = Buffer.concat([hexToBuffer(aSignature)]);
		txBufferCopy = Buffer.concat([txBufferCopy, signatureBuffer]);
	});
	return txBufferCopy;
};

const generateValidMultisignatureRegistrationTransaction = () => {
	// basic transaction
	const tx = {
		senderPublicKey:
			'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
		timestamp: 77045780,
		type: 12,
		asset: {
			mandatoryKeys: [
				'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
				'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
			],
			optionalKeys: [
				'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
				'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
			],
			numberOfSignatures: 4,
		},
		signatures: [],
	};

	sortKeysDescending(tx.asset.mandatoryKeys);
	sortKeysDescending(tx.asset.optionalKeys);

	let txBuffer = serializeBasicProperties(tx);

	// Sender signs
	tx.signatures.push(
		createSignatureObject(txBuffer, accounts.targetAccount).signature,
	);
	// Members sign in order
	tx.signatures.push(
		createSignatureObject(txBuffer, accounts.mandatoryTow).signature,
	);
	tx.signatures.push(
		createSignatureObject(txBuffer, accounts.mandatoryOne).signature,
	);
	tx.signatures.push(
		createSignatureObject(txBuffer, accounts.optionalOne).signature,
	);
	tx.signatures.push(
		createSignatureObject(txBuffer, accounts.optionalTwo).signature,
	);
	txBuffer = serializeMemberSignatures(tx, txBuffer);

	const id = getId(txBuffer);

	tx.id = id;

	return {
		input: {
			account: accounts.targetAccount,
			networkIdentifier,
			coSigners: [
				accounts.mandatoryOne,
				accounts.mandatoryTow,
				accounts.optionalOne,
				accounts.optionalTwo,
			],
			transaction: tx,
		},
		output: tx,
	};
};

const generateValidMultisignatureRegistrationSenderIsMemberTransaction = () => {
	// basic transaction
	const tx = {
		senderPublicKey:
			'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
		timestamp: 77045780,
		type: 12,
		asset: {
			mandatoryKeys: [
				'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
				'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
				'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
			],
			optionalKeys: [
				'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
				'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
			],
			numberOfSignatures: 4,
		},
		signatures: [],
	};

	sortKeysDescending(tx.asset.mandatoryKeys);
	sortKeysDescending(tx.asset.optionalKeys);

	let txBuffer = serializeBasicProperties(tx);

	// Sender signs
	tx.signatures.push(
		createSignatureObject(txBuffer, accounts.targetAccount).signature,
	);
	// Members sign in order
	tx.signatures.push(
		createSignatureObject(txBuffer, accounts.targetAccount).signature,
	);
	// In the case where the Sender is part of mandatory its signature should be included too;
	// in this case given the lexicographical order it happens to be first but could be in different order
	tx.signatures.push(
		createSignatureObject(txBuffer, accounts.mandatoryTow).signature,
	);
	tx.signatures.push(
		createSignatureObject(txBuffer, accounts.mandatoryOne).signature,
	);
	tx.signatures.push(
		createSignatureObject(txBuffer, accounts.optionalOne).signature,
	);
	tx.signatures.push(
		createSignatureObject(txBuffer, accounts.optionalTwo).signature,
	);
	txBuffer = serializeMemberSignatures(tx, txBuffer);

	const id = getId(txBuffer);

	tx.id = id;

	return {
		input: {
			account: accounts.targetAccount,
			networkIdentifier,
			coSigners: [
				accounts.mandatoryOne,
				accounts.mandatoryTow,
				accounts.optionalOne,
				accounts.optionalTwo,
			],
			transaction: tx,
		},
		output: tx,
	};
};

const generateValidMultisignatureRegistrationOnlyOptionalMembersTransaction = () => {
	// basic transaction
	const tx = {
		senderPublicKey:
			'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
		timestamp: 77045780,
		type: 12,
		asset: {
			mandatoryKeys: [],
			optionalKeys: [
				'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
				'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
			],
			numberOfSignatures: 1,
		},
		signatures: [],
	};

	sortKeysDescending(tx.asset.mandatoryKeys);
	sortKeysDescending(tx.asset.optionalKeys);

	let txBuffer = serializeBasicProperties(tx);

	// Sender signs
	tx.signatures.push(
		createSignatureObject(txBuffer, accounts.targetAccount).signature,
	);
	// Members sign in order
	tx.signatures.push(
		createSignatureObject(txBuffer, accounts.optionalOne).signature,
	);
	tx.signatures.push(
		createSignatureObject(txBuffer, accounts.optionalTwo).signature,
	);
	txBuffer = serializeMemberSignatures(tx, txBuffer);

	const id = getId(txBuffer);

	tx.id = id;

	return {
		input: {
			account: accounts.targetAccount,
			networkIdentifier,
			coSigners: [
				accounts.mandatoryOne,
				accounts.mandatoryTow,
				accounts.optionalOne,
				accounts.optionalTwo,
			],
			transaction: tx,
		},
		output: tx,
	};
};

const generateValidMultisignatureRegistrationOnlyMandatoryMembersTransaction = () => {
	// basic transaction
	const tx = {
		senderPublicKey:
			'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
		timestamp: 77045780,
		type: 12,
		asset: {
			mandatoryKeys: [
				'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
				'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
			],
			optionalKeys: [],
			numberOfSignatures: 2,
		},
		signatures: [],
	};

	sortKeysDescending(tx.asset.mandatoryKeys);
	sortKeysDescending(tx.asset.optionalKeys);

	let txBuffer = serializeBasicProperties(tx);

	// Sender signs
	tx.signatures.push(
		createSignatureObject(txBuffer, accounts.targetAccount).signature,
	);
	// Members sign in order
	tx.signatures.push(
		createSignatureObject(txBuffer, accounts.optionalOne).signature,
	);
	tx.signatures.push(
		createSignatureObject(txBuffer, accounts.optionalTwo).signature,
	);
	txBuffer = serializeMemberSignatures(tx, txBuffer);

	const id = getId(txBuffer);

	tx.id = id;

	return {
		input: {
			account: accounts.targetAccount,
			networkIdentifier,
			coSigners: [
				accounts.mandatoryOne,
				accounts.mandatoryTow,
				accounts.optionalOne,
				accounts.optionalTwo,
			],
			transaction: tx,
		},
		output: tx,
	};
};

const validMultisignatureRegistrationSuite = () => ({
	title: 'Valid multi-signature registration',
	summary: 'A valid multi-signature registration',
	config: 'devnet',
	runner: 'multisignature_transaction',
	handler: 'multisignature_transaction',
	testCases: generateValidMultisignatureRegistrationTransaction(),
});

const validMultisignatureRegistrationSenderIsMandatoryMemberSuite = () => ({
	title: 'Valid multi-signature registration',
	summary:
		'A valid multi-signature registration sender is member of mandatory key group',
	config: 'devnet',
	runner: 'multisignature_transaction',
	handler: 'multisignature_transaction_sender_is_mandatory_member',
	testCases: generateValidMultisignatureRegistrationSenderIsMemberTransaction(),
});

const validMultisignatureRegistrationOnlyOptionalMembersSuite = () => ({
	title: 'Valid multi-signature registration',
	summary: 'A valid multi-signature registration with only optional keys',
	config: 'devnet',
	runner: 'multisignature_transaction',
	handler: 'multisignature_transaction_only_optional_members',
	testCases: generateValidMultisignatureRegistrationOnlyOptionalMembersTransaction(),
});

const validMultisignatureRegistrationOnlyMandatoryMembersSuite = () => ({
	title: 'Valid multi-signature registration',
	summary: 'A valid multi-signature registration with only mandatory keys',
	config: 'devnet',
	runner: 'multisignature_transaction',
	handler: 'multisignature_transaction_only_mandatory_members',
	testCases: generateValidMultisignatureRegistrationOnlyMandatoryMembersTransaction(),
});

module.exports = BaseGenerator.runGenerator('multisignature_transaction', [
	validMultisignatureRegistrationSuite,
	validMultisignatureRegistrationSenderIsMandatoryMemberSuite,
	validMultisignatureRegistrationOnlyOptionalMembersSuite,
	validMultisignatureRegistrationOnlyMandatoryMembersSuite,
]);
