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

const networkIdentifier =
	'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

const senderAccount = {
	passphrase:
		'lava toe nuclear candy erode present guilt develop include type pluck current',
	publicKey: '8c3d81b1555fbe4692adfa1026ee21c043633b9369924cf2790e2e0fc6b47a66',
	address: '841832338348093031L',
};
const delegateAccounts = [
	{
		passphrase:
			'vivid phrase noble marble puzzle result pony dream loud deliver catch liquid',
		publicKey:
			'5430e775505b3145c124d15dc7c84ca7c751ecb69faf653bfb1e0c91e6e22f8a',
		address: '12957061101390022344L',
	},
	{
		passphrase:
			'lonely good salon icon easy awkward cart tape vanish flee cattle spin',
		publicKey:
			'73a56ce40aa991293250d9bd61471d19111f023cf1827c9be189deed733f9ea2',
		address: '356975984361330918L',
	},
	{
		passphrase:
			'wall stuff hand climb know earn mix type tragic doctor abandon bamboo',
		publicKey:
			'88d1d4e94f2466fe69770a510dc8e6c638875b71e96c02b4791ccc032a2a6472',
		address: '7539210577161571444L',
	},
	{
		passphrase:
			'since feel friend season leaf thunder garage learn clump negative zone actress',
		publicKey:
			'41583c71f266a84200f0bfdee9b3bb984f6d67f3c903ba7288c97f1259bf8ddc',
		address: '15094767118732616261L',
	},
	{
		passphrase:
			'pilot payment morning average bread crucial voice donor exchange egg until elite',
		publicKey:
			'5158379dc110c7fc011cfaf52466016668aecc65e5bfa79c2958e16da30490bd',
		address: '5912821973123214356L',
	},
	{
		passphrase:
			'tuna tide child strategy message snap purpose vibrant erode deputy damage shed',
		publicKey:
			'7cae1f08e4a4a437cffec509951ed1f30451415fff725adaa46a6d8946e95787',
		address: '18070133408355683425L',
	},
	{
		passphrase:
			'pet later deliver cave weekend shell nerve basket barely tip awful fine',
		publicKey:
			'f7b9ea443bdc180cd4116e2a86e302639b4b41659d818d5011bfff0642453c3a',
		address: '3640717344948993040L',
	},
	{
		passphrase:
			'episode topic dance ice garbage admit myself wage slim echo owner rifle',
		publicKey:
			'53efe2e1b66ea35a356e07f99dbfd79965e94e78b3b80087485e38f25ff80b74',
		address: '8010175731603412841L',
	},
	{
		passphrase:
			'enlist garlic noodle green agent upon video hurry donate spy denial dismiss',
		publicKey:
			'4338f8c8417f96f315698ec670e8e9c35caa0830181f5554f618ba8829d436f0',
		address: '9570841103514584989L',
	},
	{
		passphrase:
			'ignore field evidence imitate hood frame hip poverty enrich frozen gossip aspect',
		publicKey:
			'ca8125b3a12a2f8ad47a6d514b00c360766df5785d57203748fb8c63092020fa',
		address: '10981135108497996104L',
	},
	{
		passphrase:
			'lawsuit network mushroom chair call honey core glance acoustic define screen tomorrow',
		publicKey:
			'27b7f01611f9588a2bf43774b9b890cedbdef695f1b844c815873f2fecf1e29e',
		address: '6263383429876179160L',
	},
	{
		passphrase:
			'creek rely million boss share endless sell hungry lawn hurt jungle crater',
		publicKey:
			'6ff4c2b7df013316616b6b6b67ed102894184a4efcee365fd1b459e4d070cca0',
		address: '9439340122733729158L',
	},
	{
		passphrase:
			'shield almost dinner rebel rotate nut harvest candy battle fix pass nut',
		publicKey:
			'e1f20a8b1c64193db5f009fd4d88fde9bd1320b8c921fafe800bacd94c347a2b',
		address: '15206119636421553919L',
	},
	{
		passphrase:
			'lounge basket time economy lounge destroy organ dynamic save auction loud secret',
		publicKey:
			'1eb301328a5681a4d3a002c892644efcc057436985d48d55261133dae0af5c41',
		address: '10189413624252937509L',
	},
	{
		passphrase:
			'entire jungle toilet remain zoo spread combine eternal rug wish display infant',
		publicKey:
			'0355085d4d6cc2565c69a248846e9d1cb7af023f8d3a2b31445a0386a45758a4',
		address: '15682953477545527099L',
	},
	{
		passphrase:
			'upset ivory pigeon dash theory lonely arch flock wrap adapt enable runway',
		publicKey:
			'f740f22ff4413757457cd25b390f5312b5b10dd09f4ed901848a57cb84bc1261',
		address: '4458741937615618075L',
	},
	{
		passphrase:
			'search wild flavor suit culture alcohol energy rate glad trophy angle promote',
		publicKey:
			'09bf0bd593f354f7949cbbf42cedfdc9fabd2d7da5ff24e0f24c4017ebdb7450',
		address: '10182969975768460850L',
	},
	{
		passphrase:
			'quality sniff spice melody royal wide industry parent antique animal inquiry economy',
		publicKey:
			'2998ae5c6b28388fd654262ca19a4d669abf067aa2a28fa2ecb94079d1386ec9',
		address: '16218061708783968021L',
	},
	{
		passphrase:
			'find alcohol buzz emotion holiday forest problem age multiply sadness hen fashion',
		publicKey:
			'f8b282fe76bed11e0048f668e2768f1b5346acd77b3afe2a01c9b3874612fba2',
		address: '12502596496028234907L',
	},
	{
		passphrase:
			'purse erase first gallery drama horror gloom abandon cupboard pill twist bitter',
		publicKey:
			'19528c41f749fb0acd840b5349823afea8d96d9380cf4c674a5cf522417a6946',
		address: '9098130216893659918L',
	},
];

const getAssetBytes = asset => {
	const buffers = [];
	for (const unlockingObject of asset.unlockingObjects) {
		const addressBuffer = Buffer.alloc(8);
		addressBuffer.writeBigUInt64BE(
			BigInt(unlockingObject.delegateAddress.slice(0, -1)),
		);
		buffers.push(addressBuffer);
		const amountBuffer = Buffer.alloc(8);
		amountBuffer.writeBigInt64BE(BigInt(unlockingObject.amount));
		buffers.push(amountBuffer);
		const unvoteHeightBuffer = Buffer.alloc(4);
		unvoteHeightBuffer.writeUIntBE(Number(unlockingObject.unvoteHeight), 0, 4);
		buffers.push(amountBuffer);
	}

	return Buffer.concat(buffers);
};

const getSignBytes = tx => {
	const transactionNonce = intToBuffer(tx.nonce, 8);
	const buf = Buffer.concat([
		Buffer.alloc(1, tx.type),
		transactionNonce,
		hexToBuffer(tx.senderPublicKey),
		intToBuffer(tx.fee.toString(), 8),
		getAssetBytes(tx.asset),
	]);

	return buf;
};

const getId = transactionBytes => {
	const transactionHash = hash(transactionBytes);
	const bufferFromFirstEntriesReversed = getFirstEightBytesReversed(
		transactionHash,
	);
	const transactionId = bufferToIntAsString(bufferFromFirstEntriesReversed);

	return transactionId;
};

const generateValidUpvoteTransaction = () => {
	const unsignedTransaction = {
		type: 14,
		fee: '1500000000',
		nonce: '3',
		senderPublicKey: senderAccount.publicKey,
		asset: {
			unlockingObjects: [
				{
					delegateAddress: delegateAccounts[0].address,
					amount: '1000000000',
					unvoteHeight: 32,
				},
				{
					delegateAddress: delegateAccounts[1].address,
					amount: '50000000000',
					unvoteHeight: 12,
				},
				{
					delegateAddress: delegateAccounts[2].address,
					amount: '320000000000',
					unvoteHeight: 14,
				},
				{
					delegateAddress: delegateAccounts[0].address,
					amount: '420000000000',
					unvoteHeight: 19,
				},
				{
					delegateAddress: delegateAccounts[0].address,
					amount: '520000000000',
					unvoteHeight: 50,
				},
				{
					delegateAddress: delegateAccounts[2].address,
					amount: '620000000000',
					unvoteHeight: 14,
				},
				{
					delegateAddress: delegateAccounts[2].address,
					amount: '620000000000',
					unvoteHeight: 14,
				},
				{
					delegateAddress: delegateAccounts[3].address,
					amount: '920000000000',
					unvoteHeight: 33,
				},
				{
					delegateAddress: delegateAccounts[4].address,
					amount: '140000000000',
					unvoteHeight: 19,
				},
				{
					delegateAddress: delegateAccounts[5].address,
					amount: '130000000000',
					unvoteHeight: 53,
				},
				{
					delegateAddress: delegateAccounts[6].address,
					amount: '1000000000',
					unvoteHeight: 32,
				},
				{
					delegateAddress: delegateAccounts[7].address,
					amount: '50000000000',
					unvoteHeight: 18,
				},
				{
					delegateAddress: delegateAccounts[8].address,
					amount: '320000000000',
					unvoteHeight: 29,
				},
				{
					delegateAddress: delegateAccounts[9].address,
					amount: '420000000000',
					unvoteHeight: 6,
				},
				{
					delegateAddress: delegateAccounts[10].address,
					amount: '520000000000',
					unvoteHeight: 44,
				},
				{
					delegateAddress: delegateAccounts[11].address,
					amount: '620000000000',
					unvoteHeight: 41,
				},
				{
					delegateAddress: delegateAccounts[12].address,
					amount: '820000000000',
					unvoteHeight: 13,
				},
				{
					delegateAddress: delegateAccounts[13].address,
					amount: '920000000000',
					unvoteHeight: 25,
				},
				{
					delegateAddress: delegateAccounts[14].address,
					amount: '140000000000',
					unvoteHeight: 31,
				},
				{
					delegateAddress: delegateAccounts[15].address,
					amount: '130000000000',
					unvoteHeight: 21,
				},
			],
		},
	};
	const signBytes = getSignBytes(unsignedTransaction);
	const signature = signData(
		hash(Buffer.concat([hexToBuffer(networkIdentifier), signBytes])),
		senderAccount.passphrase,
	);
	const id = getId(
		Buffer.concat([
			signBytes,
			Buffer.from('01', 'hex'),
			Buffer.from(signature, 'hex'),
		]),
	);

	return {
		input: {
			account: senderAccount,
			networkIdentifier,
			delegates: delegateAccounts,
		},
		output: {
			...unsignedTransaction,
			signatures: [signature],
			id,
		},
	};
};

const validUnlockingSuite = () => ({
	title: 'Valid unlock transaction',
	summary: 'Valid unlock transaction',
	config: {
		network: 'devnet',
	},
	runner: 'unlock_transaction',
	handler: 'unlock_transaction',
	testCases: generateValidUpvoteTransaction(),
});

module.exports = BaseGenerator.runGenerator('unlock_transaction', [
	validUnlockingSuite,
]);
