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
			'trim elegant oven term access apple obtain error grain excite lawn neck',
		privateKey:
			'8a138c0dd8efe597c8b9c519af69e9821bd1e769cf0fb3490e22209e9cabfb8df1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
		publicKey:
			'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
		address: '10481548956627905381L',
	},
	{
		passphrase:
			'desk deposit crumble farm tip cluster goose exotic dignity flee bring traffic',
		privateKey:
			'ddc8e19d6697d6e5c1dacf6576a7169752810999918212afe14d3978b354f8aa4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
		publicKey:
			'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
		address: '3372320078773139180L',
	},
	{
		passphrase:
			'sugar object slender confirm clock peanut auto spice carbon knife increase estate',
		privateKey:
			'69aa94ea7ade3b7b08e277b18c1a590b2306ce5973ae8462b0b85122b180e89c57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
		publicKey:
			'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
		address: '7745870967079479156L',
	},
	{
		passphrase:
			'faculty inspire crouch quit sorry vague hard ski scrap jaguar garment limb',
		privateKey:
			'ffed38380998a90a2af9501f10182bc2a07922448ab383575b1e34aeddfa5482fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
		publicKey:
			'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
		address: '7086965981385941478L',
	},
];

const sortKeysDescending = publicKeys =>
	publicKeys.sort((publicKeyA, publicKeyB) => {
		// eslint-disable-next-line no-undef, new-cap
		if (BigInt(`0x${publicKeyA}`) < BigInt(`0x${publicKeyB}`)) return 1;
		// eslint-disable-next-line no-undef, new-cap
		if (BigInt(`0x${publicKeyA}`) > BigInt(`0x${publicKeyB}`)) return -1;
		return 0;
	});

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

const assetToBytes = tx => {
	const { mandatoryKeys, optionalKeys, numberOfSignatures } = tx.asset;
	const mandatoryKeysBuffer = Buffer.from(mandatoryKeys.join(''), 'utf8');
	const optionalKeysBuffer = Buffer.from(optionalKeys.join(''), 'utf8');
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
	// publicKey: account.publicKey,
	signature: signData(
		hash(Buffer.concat([hexToBuffer(networkIdentifier), txBuffer])),
		account.passphrase,
	),
});

const findAccountByKey = key =>
	accounts.filter(account => account.publicKey === key);

const generateValidMultisignatureRegistrationTransaction = () => {
	// basic transaction
	const tx = {
		senderPublicKey: accounts[1].publicKey,
		timestamp: 77045780,
		type: 12,
		asset: {
			mandatoryKeys: [accounts[3].publicKey, accounts[2].publicKey],
			optionalKeys: [accounts[4].publicKey, accounts[5].publicKey],
			numberOfSignatures: 3,
		},
	};

	sortKeysDescending(tx.asset.mandatoryKeys);
	sortKeysDescending(tx.asset.optionalKeys);

	const { signatures, ...registrationTx } = tx;
	// Start building buffer
	const transactionTimestamp = Buffer.alloc(4);
	transactionTimestamp.writeIntBE(tx.timestamp, 0, 4);
	let txBuffer = Buffer.concat([
		Buffer.alloc(1, registrationTx.type),
		transactionTimestamp,
		hexToBuffer(tx.senderPublicKey),
		intToBuffer(registrationTx.asset.numberOfSignatures, 1),
		assetToBytes(registrationTx),
	]);

	registrationTx.signatures = [];
	let index = 0;
	// Mandatory keys sign
	registrationTx.asset.mandatoryKeys.forEach(aKey => {
		const account = findAccountByKey(aKey).pop();
		registrationTx.signatures.push({
			...createSignatureObject(txBuffer, account),
			index,
		});
		index += 1;
	});
	// Optional keys sign
	registrationTx.asset.optionalKeys.forEach(aKey => {
		const account = findAccountByKey(aKey).pop();
		registrationTx.signatures.push({
			...createSignatureObject(txBuffer, account),
			index,
		});
		index += 1;
	});
	// Serialize all signatures
	registrationTx.signatures.forEach(aSignature => {
		const signatureBuffer = Buffer.concat([
			Buffer.alloc(1, aSignature.index),
			hexToBuffer(aSignature.signature),
		]);
		txBuffer = Buffer.concat([txBuffer, signatureBuffer]);
	});
	// Sender signs whole transaction
	const signature = signData(
		hash(Buffer.concat([hexToBuffer(networkIdentifier), txBuffer])),
		accounts[0].passphrase,
	);

	const signedRegistrationTx = { ...registrationTx, signature };

	const id = getId(Buffer.concat([txBuffer, Buffer.from(signature, 'hex')]));
	signedRegistrationTx.id = id;

	return {
		input: {
			account: accounts[1],
			networkIdentifier,
			coSigners: [accounts[2], accounts[3], accounts[4], accounts[5]],
			transaction: registrationTx,
		},
		output: signedRegistrationTx,
	};
};

const validTransferSuite = () => ({
	title: 'Valid multi-signature registration',
	summary: 'A valid multi-signature registration',
	config: 'devnet',
	runner: 'multisignature_transaction',
	handler: 'multisignature_transaction',
	testCases: generateValidMultisignatureRegistrationTransaction(),
});

module.exports = BaseGenerator.runGenerator('multisignature_transaction', [
	validTransferSuite,
]);
