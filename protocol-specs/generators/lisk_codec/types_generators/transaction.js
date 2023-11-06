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

const protobuf = require('protobufjs');

const prepareProtobuffersBaseTransaction = () =>
	protobuf.loadSync('./generators/lisk_codec/proto_files/block.proto');

const { BaseTransaction, VoteTransaction, MultisigTransaction } =
	prepareProtobuffersBaseTransaction();

const baseTransactionSchema = {
	$id: '/baseTransactionSchema',
	type: 'object',
	properties: {
		moduleID: { dataType: 'uint32', fieldNumber: 1 },
		assetID: { dataType: 'uint32', fieldNumber: 2 },
		nonce: { dataType: 'uint64', fieldNumber: 3 },
		fee: { dataType: 'uint64', fieldNumber: 4 },
		senderPublicKey: { dataType: 'bytes', fieldNumber: 5 },
		asset: { dataType: 'bytes', fieldNumber: 6 },
		signatures: { type: 'array', items: { dataType: 'bytes' }, fieldNumber: 7 },
	},
	required: ['moduleID', 'assetID', 'nonce', 'fee', 'senderPublicKey', 'asset', 'signatures'],
};

const voteAssetSchema = {
	$id: '/voteAssetSchema',
	type: 'object',
	properties: {
		stakes: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				properties: {
					validatorAddress: { dataType: 'bytes', fieldNumber: 1 },
					amount: { dataType: 'sint64', fieldNumber: 2 },
				},
				required: ['validatorAddress', 'amount'],
			},
		},
	},
	required: ['stakes'],
};

const multisigAssetSchema = {
	$id: '/multisigAssetSchema',
	type: 'object',
	properties: {
		numberOfSignatures: { dataType: 'uint32', fieldNumber: 1 },
		mandatoryKeys: { type: 'array', items: { dataType: 'bytes' }, fieldNumber: 2 },
		optionalKeys: { type: 'array', items: { dataType: 'bytes' }, fieldNumber: 3 },
	},
	required: ['numberOfSignatures', 'mandatoryKeys', 'optionalKeys'],
};

const validBaseTransaction = {
	moduleID: 20,
	assetID: 1,
	nonce: '1570179673932370',
	fee: '3156364651',
	senderPublicKey: Buffer.from(
		'8f057d088a585d938c20d63e430a068d4cea384e588aa0b758c68fca21644dbc',
		'hex',
	),
	asset: Buffer.from('f214d75bbc4b2ea89e433f3a45af803725416ec3', 'hex'),
	signatures: [
		Buffer.from(
			'204514eb1152355799ece36d17037e5feb4871472c60763bdafe67eb6a38bec632a8e2e62f84a32cf764342a4708a65fbad194e37feec03940f0ff84d3df2a05',
			'hex',
		),
		Buffer.from(
			'0b6730e5898ca56fe0dc1c73de9363f6fc8b335592ef10725a8463bff101a4943e60311f0b1a439a2c9e02cca1379b80a822f4ec48cf212bff1f1c757e92ec02',
			'hex',
		),
	],
};

const validVoteAsset = {
	stakes: [
		{
			validatorAddress: Buffer.from('cd32c73e9851c7137980063b8af64aa5a31651f8', 'hex'),
			amount: '-12000000000',
		},
		{
			validatorAddress: Buffer.from('9d86ad24a3f030e5522b6598115bb4d70c1692c9', 'hex'),
			amount: '456000000000',
		},
	],
};

const validMultiSigAsset = {
	numberOfSignatures: 2,
	mandatoryKeys: [
		Buffer.from('07d6389be6e2109613699c02e78253148989515c3867e4f490eafd004a95b2b4', 'hex'),
		Buffer.from('3e754d00815b6b248a981520afbaf913153a26d25e2d5283964779c65ceee7e8', 'hex'),
	],
	optionalKeys: [
		Buffer.from('c8b8fbe474a2b63ccb9744a409569b0a465ee1803f80435aec1c5e7fc2d4ee18', 'hex'),
		Buffer.from('6115424fec0ce9c3bac5a81b5c782827d1f956fb95f1ccfa36c566d04e4d7267', 'hex'),
	],
};

const validMultiSigAssetWithEmpty = {
	numberOfSignatures: 2,
	mandatoryKeys: [
		Buffer.from('c8b8fbe474a2b63ccb9744a409569b0a465ee1803f80435aec1c5e7fc2d4ee18', 'hex'),
		Buffer.from('6115424fec0ce9c3bac5a81b5c782827d1f956fb95f1ccfa36c566d04e4d7267', 'hex'),
	],
	optionalKeys: [],
};

const validBaseTransactionEncoded = BaseTransaction.encode(validBaseTransaction).finish();
const validVoteTransactionEncoded = VoteTransaction.encode(validVoteAsset).finish();
const validMultisigTransactionEncoded = MultisigTransaction.encode(validMultiSigAsset).finish();
const validMultisigTransactionWithEmptyEncoded = MultisigTransaction.encode(
	validMultiSigAssetWithEmpty,
).finish();

module.exports = {
	validTransactionEncodingsTestCases: [
		{
			description: 'Encoding of valid base transaction',
			input: { object: validBaseTransaction, schema: baseTransactionSchema },
			output: { value: validBaseTransactionEncoded },
		},
		{
			description: 'Encoding of valid stake asset',
			input: { object: validVoteAsset, schema: voteAssetSchema },
			output: { value: validVoteTransactionEncoded },
		},
		{
			description: 'Encoding of valid multisignature asset',
			input: { object: validMultiSigAsset, schema: multisigAssetSchema },
			output: { value: validMultisigTransactionEncoded },
		},
		{
			description: 'Encoding of valid multisignature asset with empty array',
			input: { object: validMultiSigAssetWithEmpty, schema: multisigAssetSchema },
			output: { value: validMultisigTransactionWithEmptyEncoded },
		},
	],

	validTransactionDecodingsTestCases: [
		{
			description: 'Decoding of valid base transaction',
			input: { value: validBaseTransactionEncoded, schema: baseTransactionSchema },
			output: { object: validBaseTransaction },
		},
		{
			description: 'Decoding of valid stake asset',
			input: { value: validVoteTransactionEncoded, schema: voteAssetSchema },
			output: { object: validVoteAsset },
		},
		{
			description: 'Decoding of valid multisignature asset',
			input: { value: validMultisigTransactionEncoded, schema: multisigAssetSchema },
			output: { object: validMultiSigAsset },
		},
		{
			description: 'Decoding of valid multisignature asset with empty array',
			input: { value: validMultisigTransactionWithEmptyEncoded, schema: multisigAssetSchema },
			output: { object: validMultiSigAssetWithEmpty },
		},
	],
};
