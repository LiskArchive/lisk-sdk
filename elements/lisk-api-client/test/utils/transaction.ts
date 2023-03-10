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
 *
 */
import {
	blockAssetSchema,
	blockHeaderSchema,
	blockSchema,
	eventSchema,
	transactionSchema,
} from '@liskhq/lisk-chain';
import { utils } from '@liskhq/lisk-cryptography';
import { ModuleMetadata, NodeInfo } from '../../src/types';

export const nodeInfo: NodeInfo = {
	version:
		'3.0.0-beta.2.4-88b24e03bb28925a036293126dd96ac636218e29-6a1742532104af6f5c010e2ae77d3d982d471751.6a17425',
	networkVersion: '2.0',
	chainID: '00000000',
	lastBlockID: '57a669f7170239a68460af284eb1ba043839fe828be302b9c0e65fee498c954e',
	height: 276626,
	genesisHeight: 0,
	finalizedHeight: 276489,
	syncing: false,
	unconfirmedTransactions: 2243,
	genesis: {
		blockTime: 10,
		maxTransactionsSize: 15360,
		bftBatchSize: 68,
		chainID: '00000000',
	},
	network: {
		port: 8080,
		seedPeers: [],
	},
};

export const schema = {
	block: blockSchema,
	header: blockHeaderSchema,
	transaction: transactionSchema,
	asset: blockAssetSchema,
	event: eventSchema,
};

export const metadata: ModuleMetadata[] = [
	{
		id: utils.intToBuffer(2, 4).toString('hex'),
		name: 'token',
		events: [
			{
				name: 'lock',
				data: {
					$id: '/token/events/lock',
					type: 'object',
					required: ['address', 'module', 'tokenID', 'amount', 'result'],
					properties: {
						address: {
							dataType: 'bytes',
							format: 'lisk32',
							fieldNumber: 1,
						},
						module: {
							dataType: 'string',
							minLength: 1,
							maxLength: 32,
							fieldNumber: 2,
						},
						tokenID: {
							dataType: 'bytes',
							minLength: 8,
							maxLength: 8,
							fieldNumber: 3,
						},
						amount: {
							dataType: 'uint64',
							fieldNumber: 4,
						},
						result: {
							dataType: 'uint32',
							fieldNumber: 5,
						},
					},
				},
			},
		],
		assets: [],
		endpoints: [],
		stores: [],
		commands: [
			{
				id: utils.intToBuffer(0, 4).toString('hex'),
				name: 'transfer',
				params: {
					$id: '/lisk/transferParams',
					type: 'object',
					required: ['amount', 'recipientAddress', 'data'],
					properties: {
						amount: { dataType: 'uint64', fieldNumber: 1 },
						recipientAddress: { dataType: 'bytes', fieldNumber: 2, format: 'lisk32' },
						data: { dataType: 'string', fieldNumber: 3, minLength: 0, maxLength: 64 },
					},
				},
			},
		],
	},
	{
		id: utils.intToBuffer(4, 4).toString('hex'),
		name: 'keys',
		events: [],
		assets: [],
		endpoints: [],
		stores: [],
		commands: [
			{
				id: utils.intToBuffer(0, 4).toString('hex'),
				name: 'registerMultisignature',
				params: {
					$id: '/lisk/keys/register',
					type: 'object',
					required: ['numberOfSignatures', 'optionalKeys', 'mandatoryKeys'],
					properties: {
						numberOfSignatures: { dataType: 'uint32', fieldNumber: 1, minimum: 1, maximum: 64 },
						mandatoryKeys: {
							type: 'array',
							items: { dataType: 'bytes', minLength: 32, maxLength: 32 },
							fieldNumber: 2,
							minItems: 0,
							maxItems: 64,
						},
						optionalKeys: {
							type: 'array',
							items: { dataType: 'bytes', minLength: 32, maxLength: 32 },
							fieldNumber: 3,
							minItems: 0,
							maxItems: 64,
						},
					},
				},
			},
		],
	},
	{
		id: utils.intToBuffer(5, 4).toString('hex'),
		name: 'pos',
		events: [
			{
				name: 'validatorStaked',
				data: {
					$id: '/pos/events/validatorStakedData',
					type: 'object',
					required: ['senderAddress', 'validatorAddress', 'amount', 'result'],
					properties: {
						senderAddress: {
							dataType: 'bytes',
							fieldNumber: 1,
							format: 'lisk32',
						},
						validatorAddress: {
							dataType: 'bytes',
							fieldNumber: 2,
							format: 'lisk32',
						},
						amount: {
							dataType: 'sint64',
							fieldNumber: 3,
						},
						result: {
							dataType: 'uint32',
							fieldNumber: 4,
						},
					},
				},
			},
		],
		assets: [],
		endpoints: [],
		stores: [],
		commands: [
			{
				id: utils.intToBuffer(0, 4).toString('hex'),
				name: 'transfer',
				params: {
					$id: '/lisk/pos/pom',
					type: 'object',
					required: ['header1', 'header2'],
					properties: {
						header1: {
							...blockHeaderSchema,
							fieldNumber: 1,
						},
						header2: {
							...blockHeaderSchema,
							fieldNumber: 2,
						},
					},
				},
			},
		],
	},
	{
		id: utils.intToBuffer(7, 4).toString('hex'),
		name: 'dynamicReward',
		events: [
			{
				name: 'rewardMinted',
				data: {
					$id: '/reward/events/rewardMintedData',
					type: 'object',
					required: ['amount', 'reduction'],
					properties: {
						amount: {
							dataType: 'uint64',
							fieldNumber: 1,
						},
						reduction: {
							dataType: 'uint32',
							fieldNumber: 2,
						},
					},
				},
			},
		],
		assets: [],
		endpoints: [],
		stores: [],
		commands: [],
	},
];

export const tx = {
	module: 'token',
	command: 'transfer',
	nonce: BigInt('54'),
	fee: BigInt('10000000'),
	senderPublicKey: Buffer.from(
		'dd4ff255fe04dd0159a468e9e9c8872c4f4466220f7e326377a0ceb9df2fa21a',
		'hex',
	),
	params: {
		amount: BigInt('10000000'),
		recipientAddress: Buffer.from('654087c2df870402ab0b1996616fd3355d61f62c', 'hex'),
		data: '',
	},
	signatures: [
		Buffer.from(
			'79cb29dca7bb9fce73a1e8ca28264f779074d259c341b536bae9a54c0a2e4713580fcb192f9f15f43730650d69bb1f3dcfb4cb6da7d69ca990a763ed78569700',
			'hex',
		),
	],
	id: 'dd93e4ca5b48d0b604e7cf2e57ce21be43a3163f853c83d88d383032fd830bbf',
};
