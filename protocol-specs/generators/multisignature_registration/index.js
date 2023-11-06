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

const { ed, legacy, address } = require('@liskhq/lisk-cryptography');
const { Codec } = require('@liskhq/lisk-codec');
const BaseGenerator = require('../base_generator');
const { baseTransactionSchema } = require('../../utils/schema');

const codec = new Codec();

const TAG_TRANSACTION = Buffer.from('LSK_TX_', 'utf8');
const MESSAGE_TAG_MULTISIG_REG = 'LSK_RMSG_';
const chainID = Buffer.from('10000000', 'hex');

const multisigRegMsgSchema = {
	$id: '/auth/command/regMultisigMsg',
	type: 'object',
	required: ['address', 'nonce', 'numberOfSignatures', 'mandatoryKeys', 'optionalKeys'],
	properties: {
		address: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: 20,
			maxLength: 20,
		},
		nonce: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
		numberOfSignatures: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		mandatoryKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
				minLength: 32,
				maxLength: 32,
			},
			fieldNumber: 4,
		},
		optionalKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
				minLength: 32,
				maxLength: 32,
			},
			fieldNumber: 5,
		},
	},
};

const accounts = {
	targetAccount: {
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
	},
	mandatoryOne: {
		passphrase: 'trim elegant oven term access apple obtain error grain excite lawn neck',
		privateKey: Buffer.from(
			'8a138c0dd8efe597c8b9c519af69e9821bd1e769cf0fb3490e22209e9cabfb8df1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
			'hex',
		),
		publicKey: Buffer.from(
			'f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3',
			'hex',
		),
		address: Buffer.from('652bac0f3ef175917844a85c4a0a484fbe2395e4', 'hex'),
	},
	mandatoryTwo: {
		passphrase: 'desk deposit crumble farm tip cluster goose exotic dignity flee bring traffic',
		privateKey: Buffer.from(
			'ddc8e19d6697d6e5c1dacf6576a7169752810999918212afe14d3978b354f8aa4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
			'hex',
		),
		publicKey: Buffer.from(
			'4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39',
			'hex',
		),
		address: Buffer.from('ecb6308c3ee3cc2ed1fa266b85ba127d63a4ee1c', 'hex'),
	},
	optionalOne: {
		passphrase: 'sugar object slender confirm clock peanut auto spice carbon knife increase estate',
		privateKey: Buffer.from(
			'69aa94ea7ade3b7b08e277b18c1a590b2306ce5973ae8462b0b85122b180e89c57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
			'hex',
		),
		publicKey: Buffer.from(
			'57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4',
			'hex',
		),
		address: Buffer.from('74a7c8ec9adc7e6ba5c1cf9410d5c6c6bf6aba7d', 'hex'),
	},
	optionalTwo: {
		passphrase: 'faculty inspire crouch quit sorry vague hard ski scrap jaguar garment limb',
		privateKey: Buffer.from(
			'ffed38380998a90a2af9501f10182bc2a07922448ab383575b1e34aeddfa5482fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
			'hex',
		),
		publicKey: Buffer.from(
			'fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6',
			'hex',
		),
		address: Buffer.from('e661c9ff02f65962ac08bc79a2f5c0d44b312fbc', 'hex'),
	},
};

const outputHexAccount = account => ({
	...account,
	privateKey: account.privateKey,
	publicKey: account.publicKey,
	address: account.address,
});

const multisigRegParams = {
	$id: '/multisignature/registrationParams',
	type: 'object',
	properties: {
		numberOfSignatures: { dataType: 'uint32', fieldNumber: 1 },
		mandatoryKeys: {
			type: 'array',
			items: { dataType: 'bytes' },
			fieldNumber: 2,
		},
		optionalKeys: {
			type: 'array',
			items: { dataType: 'bytes' },
			fieldNumber: 3,
		},
		signatures: {
			type: 'array',
			items: { dataType: 'bytes' },
			fieldNumber: 4,
		},
	},
	required: ['numberOfSignatures', 'mandatoryKeys', 'optionalKeys', 'signatures'],
};

const getParamsBytes = params => codec.encode(multisigRegParams, params);

const getSignBytes = tx => {
	const paramsBytes = getParamsBytes(tx.params);
	const signingTx = {
		...tx,
		params: paramsBytes,
		signatures: [],
	};
	return codec.encode(baseTransactionSchema, signingTx);
};

const encode = tx => {
	const paramsBytes = getParamsBytes(tx.params);
	const txWithAssetBytes = {
		...tx,
		params: paramsBytes,
	};
	return codec.encode(baseTransactionSchema, txWithAssetBytes);
};

const sortKeysAscending = publicKeys =>
	publicKeys.sort((publicKeyA, publicKeyB) => publicKeyA.compare(publicKeyB));

const createSignatureObject = (txBuffer, account) => ({
	signature: ed.signData(
		TAG_TRANSACTION,
		chainID,
		txBuffer,
		legacy.getPrivateAndPublicKeyFromPassphrase(account.passphrase).privateKey,
	),
});

const createSignatureForMultisignature = (messageBytes, account) => ({
	signature: ed.signData(MESSAGE_TAG_MULTISIG_REG, chainID, messageBytes, account.privateKey),
});

const generateValidMultisignatureRegistrationTransaction = () => {
	// basic transaction
	const unsignedTransaction = {
		module: 'auth',
		command: 'registerMultisignature',
		senderPublicKey: Buffer.from(
			'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
			'hex',
		),
		nonce: BigInt('1'),
		fee: BigInt('1500000000'),
		params: {
			mandatoryKeys: [
				Buffer.from('4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39', 'hex'),
				Buffer.from('f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3', 'hex'),
			],
			optionalKeys: [
				Buffer.from('57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4', 'hex'),
				Buffer.from('fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6', 'hex'),
			],
			numberOfSignatures: 4,
			signatures: [],
		},
	};

	const tx = {
		...unsignedTransaction,
		params: { ...unsignedTransaction.params },
		signatures: [],
	};

	sortKeysAscending(tx.params.mandatoryKeys);
	sortKeysAscending(tx.params.optionalKeys);

	// Members sign in order
	const messageBytes = codec.encode(multisigRegMsgSchema, {
		address: address.getAddressFromPublicKey(tx.senderPublicKey),
		nonce: tx.nonce,
		numberOfSignatures: tx.params.numberOfSignatures,
		mandatoryKeys: tx.params.mandatoryKeys,
		optionalKeys: tx.params.optionalKeys,
	});
	tx.params.signatures.push(
		createSignatureForMultisignature(messageBytes, accounts.mandatoryTwo).signature,
	);
	tx.params.signatures.push(
		createSignatureForMultisignature(messageBytes, accounts.mandatoryOne).signature,
	);
	tx.params.signatures.push(
		createSignatureForMultisignature(messageBytes, accounts.optionalOne).signature,
	);
	tx.params.signatures.push(
		createSignatureForMultisignature(messageBytes, accounts.optionalTwo).signature,
	);

	// Sender signs
	const txBuffer = getSignBytes(tx);
	tx.signatures.push(createSignatureObject(txBuffer, accounts.targetAccount).signature);

	const encodedTx = encode(tx);

	return {
		description: 'Both mandatory and optional member group',
		input: {
			account: outputHexAccount(accounts.targetAccount),
			chainID,
			members: {
				mandatoryOne: outputHexAccount(accounts.mandatoryOne),
				mandatoryTwo: outputHexAccount(accounts.mandatoryTwo),
				optionalOne: outputHexAccount(accounts.optionalOne),
				optionalTwo: outputHexAccount(accounts.optionalTwo),
			},
		},
		output: {
			transaction: encodedTx,
		},
	};
};

const generateValidMultisignatureRegistrationSenderIsMemberTransaction = () => {
	// basic transaction
	const unsignedTransaction = {
		senderPublicKey: Buffer.from(
			'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
			'hex',
		),
		nonce: BigInt('1'),
		fee: BigInt('1500000000'),
		module: 'auth',
		command: 'registerMultisignature',
		params: {
			mandatoryKeys: [
				Buffer.from('0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe', 'hex'),
				Buffer.from('4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39', 'hex'),
				Buffer.from('f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3', 'hex'),
			],
			optionalKeys: [
				Buffer.from('57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4', 'hex'),
				Buffer.from('fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6', 'hex'),
			],
			numberOfSignatures: 4,
			signatures: [],
		},
		signatures: [],
	};

	const tx = {
		...unsignedTransaction,
		params: { ...unsignedTransaction.params },
		signatures: [],
	};

	sortKeysAscending(tx.params.mandatoryKeys);
	sortKeysAscending(tx.params.optionalKeys);

	const messageBytes = codec.encode(multisigRegMsgSchema, {
		address: address.getAddressFromPublicKey(tx.senderPublicKey),
		nonce: tx.nonce,
		numberOfSignatures: tx.params.numberOfSignatures,
		mandatoryKeys: tx.params.mandatoryKeys,
		optionalKeys: tx.params.optionalKeys,
	});
	// Members sign in order
	tx.params.signatures.push(
		createSignatureForMultisignature(messageBytes, accounts.targetAccount).signature,
	);
	// In the case where the Sender is part of mandatory its signature should be included too;
	// in this case given the lexicographical order it happens to be first but could be in different order
	tx.params.signatures.push(
		createSignatureForMultisignature(messageBytes, accounts.mandatoryTwo).signature,
	);
	tx.params.signatures.push(
		createSignatureForMultisignature(messageBytes, accounts.mandatoryOne).signature,
	);
	tx.params.signatures.push(
		createSignatureForMultisignature(messageBytes, accounts.optionalOne).signature,
	);
	tx.params.signatures.push(
		createSignatureForMultisignature(messageBytes, accounts.optionalTwo).signature,
	);

	// Sender signs
	const txBuffer = getSignBytes(tx);
	tx.signatures.push(createSignatureObject(txBuffer, accounts.targetAccount).signature);
	const encodedTx = encode(tx);

	return {
		description: 'Sender is a member of the group',
		input: {
			account: outputHexAccount(accounts.targetAccount),
			chainID,
			members: {
				targetAccount: outputHexAccount(accounts.targetAccount),
				mandatoryOne: outputHexAccount(accounts.mandatoryOne),
				mandatoryTwo: outputHexAccount(accounts.mandatoryTwo),
				optionalOne: outputHexAccount(accounts.optionalOne),
				optionalTwo: outputHexAccount(accounts.optionalTwo),
			},
		},
		output: {
			transaction: encodedTx,
		},
	};
};

const generateValidMultisignatureRegistrationOnlyOptionalMembersTransaction = () => {
	// basic transaction
	const unsignedTransaction = {
		senderPublicKey: Buffer.from(
			'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
			'hex',
		),
		nonce: BigInt('1'),
		fee: BigInt('1500000000'),
		module: 'auth',
		command: 'registerMultisignature',
		params: {
			mandatoryKeys: [],
			optionalKeys: [
				Buffer.from('57df5c3811961939f8dcfa858c6eaefebfaa4de942f7e703bf88127e0ee9cca4', 'hex'),
				Buffer.from('fa406b6952d377f0278920e3eb8da919e4cf5c68b02eeba5d8b3334fdc0369b6', 'hex'),
			],
			numberOfSignatures: 1,
			signatures: [],
		},
		signatures: [],
	};

	const tx = {
		...unsignedTransaction,
		params: { ...unsignedTransaction.params },
		signatures: [],
	};

	sortKeysAscending(tx.params.mandatoryKeys);
	sortKeysAscending(tx.params.optionalKeys);

	const messageBytes = codec.encode(multisigRegMsgSchema, {
		address: address.getAddressFromPublicKey(tx.senderPublicKey),
		nonce: tx.nonce,
		numberOfSignatures: tx.params.numberOfSignatures,
		mandatoryKeys: tx.params.mandatoryKeys,
		optionalKeys: tx.params.optionalKeys,
	});
	// Members sign in order
	tx.params.signatures.push(
		createSignatureForMultisignature(messageBytes, accounts.optionalOne).signature,
	);
	tx.params.signatures.push(
		createSignatureForMultisignature(messageBytes, accounts.optionalTwo).signature,
	);

	// Sender signs
	const txBuffer = getSignBytes(tx);
	tx.signatures.push(createSignatureObject(txBuffer, accounts.targetAccount).signature);
	const encodedTx = encode(tx);

	return {
		description: 'Only optional members',
		input: {
			account: outputHexAccount(accounts.targetAccount),
			chainID,
			members: {
				optionalOne: outputHexAccount(accounts.optionalOne),
				optionalTwo: outputHexAccount(accounts.optionalTwo),
			},
		},
		output: {
			transaction: encodedTx,
		},
	};
};

const generateValidMultisignatureRegistrationOnlyMandatoryMembersTransaction = () => {
	// basic transaction
	const unsignedTransaction = {
		senderPublicKey: Buffer.from(
			'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
			'hex',
		),
		nonce: BigInt('1'),
		fee: BigInt('1500000000'),
		module: 'auth',
		command: 'registerMultisignature',
		params: {
			mandatoryKeys: [
				Buffer.from('4a67646a446313db964c39370359845c52fce9225a3929770ef41448c258fd39', 'hex'),
				Buffer.from('f1b9f4ee71b5d5857d3b346d441ca967f27870ebee88569db364fd13e28adba3', 'hex'),
			],
			optionalKeys: [],
			numberOfSignatures: 2,
			signatures: [],
		},
		signatures: [],
	};

	const tx = {
		...unsignedTransaction,
		params: { ...unsignedTransaction.params },
		signatures: [],
	};

	sortKeysAscending(tx.params.mandatoryKeys);
	sortKeysAscending(tx.params.optionalKeys);

	const messageBytes = codec.encode(multisigRegMsgSchema, {
		address: address.getAddressFromPublicKey(tx.senderPublicKey),
		nonce: tx.nonce,
		numberOfSignatures: tx.params.numberOfSignatures,
		mandatoryKeys: tx.params.mandatoryKeys,
		optionalKeys: tx.params.optionalKeys,
	});
	// Members sign in order
	tx.params.signatures.push(
		createSignatureForMultisignature(messageBytes, accounts.mandatoryTwo).signature,
	);
	tx.params.signatures.push(
		createSignatureForMultisignature(messageBytes, accounts.mandatoryOne).signature,
	);

	const txBuffer = getSignBytes(tx);

	// Sender signs
	tx.signatures.push(createSignatureObject(txBuffer, accounts.targetAccount).signature);

	const encodedTx = encode(tx);

	return {
		description: 'Only mandatory members',
		input: {
			account: outputHexAccount(accounts.targetAccount),
			chainID,
			members: {
				mandatoryOne: outputHexAccount(accounts.mandatoryOne),
				mandatoryTwo: outputHexAccount(accounts.mandatoryTwo),
			},
		},
		output: {
			transaction: encodedTx,
		},
	};
};

const generateFormerSecondSignatureTransactioon = () => {
	// Second signature
	const secondSignature = {
		passphrase: 'oyster observe cinnamon elder rose judge baby length again subway pill plate',
		privateKey: Buffer.from(
			'ffa879f56c04b9293bc830ef29c53c8871fb892717be9d7e75fc89b507eba279ff30ef40b7de42114137be46f1009d30e5c19809a73d5a162bc99f7e7681d63d',
			'hex',
		),
		publicKey: Buffer.from(
			'ff30ef40b7de42114137be46f1009d30e5c19809a73d5a162bc99f7e7681d63d',
			'hex',
		),
		address: Buffer.from('0b5c7b4176506010434b80b3207ac965c2649a23', 'hex'),
	};

	// basic transaction
	const unsignedTransaction = {
		senderPublicKey: Buffer.from(
			'0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe',
			'hex',
		),
		nonce: BigInt('1'),
		fee: BigInt('1500000000'),
		module: 'auth',
		command: 'registerMultisignature',
		params: {
			mandatoryKeys: [
				Buffer.from('0b211fce4b615083701cb8a8c99407e464b2f9aa4f367095322de1b77e5fcfbe', 'hex'),
				secondSignature.publicKey,
			],
			optionalKeys: [],
			numberOfSignatures: 2,
			signatures: [],
		},
		signatures: [],
	};

	const tx = {
		...unsignedTransaction,
		params: { ...unsignedTransaction.params },
		signatures: [],
	};

	sortKeysAscending(tx.params.mandatoryKeys);
	sortKeysAscending(tx.params.optionalKeys);

	const messageBytes = codec.encode(multisigRegMsgSchema, {
		address: address.getAddressFromPublicKey(tx.senderPublicKey),
		nonce: tx.nonce,
		numberOfSignatures: tx.params.numberOfSignatures,
		mandatoryKeys: tx.params.mandatoryKeys,
		optionalKeys: tx.params.optionalKeys,
	});
	// Members sign in order
	tx.params.signatures.push(
		createSignatureForMultisignature(messageBytes, accounts.targetAccount).signature,
	);
	tx.params.signatures.push(
		createSignatureForMultisignature(messageBytes, secondSignature).signature,
	);

	const txBuffer = getSignBytes(tx);

	// Sender signs
	tx.signatures.push(createSignatureObject(txBuffer, accounts.targetAccount).signature);

	const encodedTx = encode(tx);

	return {
		description: 'Second signature case',
		input: {
			account: outputHexAccount(accounts.targetAccount),
			chainID,
			members: {
				mandatoryOne: outputHexAccount(accounts.targetAccount),
				mandatoryTwo: outputHexAccount(secondSignature),
			},
		},
		output: {
			transaction: encodedTx,
		},
	};
};

const validMultisignatureRegistrationSuite = () => ({
	title: 'Valid multi-signature registration',
	summary: 'A valid multi-signature registration',
	config: {
		network: 'devnet',
	},
	runner: 'multisignature_registration_transaction',
	handler: 'multisignature_registration_transaction',
	testCases: [
		generateValidMultisignatureRegistrationTransaction(),
		generateValidMultisignatureRegistrationSenderIsMemberTransaction(),
		generateValidMultisignatureRegistrationOnlyOptionalMembersTransaction(),
		generateValidMultisignatureRegistrationOnlyMandatoryMembersTransaction(),
		generateFormerSecondSignatureTransactioon(),
	],
});

module.exports = BaseGenerator.runGenerator('multisignature_registration_transaction', [
	validMultisignatureRegistrationSuite,
]);
