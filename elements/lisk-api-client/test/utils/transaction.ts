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
import { intToBuffer } from '@liskhq/lisk-cryptography';
import { ModuleMetadata, NodeInfo } from '../../src/types';

export const nodeInfo: NodeInfo = {
	version:
		'3.0.0-beta.2.4-88b24e03bb28925a036293126dd96ac636218e29-6a1742532104af6f5c010e2ae77d3d982d471751.6a17425',
	networkVersion: '2.0',
	networkIdentifier: 'ccb837b25bc4f1b43fc08c2e80b07c6b46b84bf2264f6a37eaa4416fe478a0c5',
	lastBlockID: '57a669f7170239a68460af284eb1ba043839fe828be302b9c0e65fee498c954e',
	height: 276626,
	genesisHeight: 0,
	finalizedHeight: 276489,
	syncing: false,
	unconfirmedTransactions: 2243,
	genesisConfig: {
		blockTime: 10,
		maxTransactionsSize: 15360,
		bftThreshold: 68,
		minFeePerByte: 1000,
		baseFees: [
			{ moduleID: intToBuffer(5, 4), commandID: intToBuffer(0, 4), baseFee: '1000000000' },
		],
		rewards: {
			milestones: ['500000000', '400000000', '300000000', '200000000', '100000000'],
			offset: 2160,
			distance: 3000000,
		},
		communityIdentifier: 'Lisk',
		minRemainingBalance: '5000000',
		activeDelegates: 101,
		standbyDelegates: 2,
		delegateListRoundOffset: 2,
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
		id: intToBuffer(2, 4),
		name: 'token',
		events: [],
		assets: [],
		endpoints: [],
		commands: [
			{
				id: intToBuffer(0, 4),
				name: 'transfer',
				params: {
					$id: '/lisk/transferParams',
					type: 'object',
					required: ['amount', 'recipientAddress', 'data'],
					properties: {
						amount: { dataType: 'uint64', fieldNumber: 1 },
						recipientAddress: { dataType: 'bytes', fieldNumber: 2, minLength: 20, maxLength: 20 },
						data: { dataType: 'string', fieldNumber: 3, minLength: 0, maxLength: 64 },
					},
				},
			},
		],
	},
	{
		id: intToBuffer(4, 4),
		name: 'keys',
		events: [],
		assets: [],
		endpoints: [],
		commands: [
			{
				id: intToBuffer(0, 4),
				name: 'registerMultisignatureGroup',
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
		id: intToBuffer(5, 4),
		name: 'dpos',
		events: [],
		assets: [],
		endpoints: [],
		commands: [
			{
				id: intToBuffer(0, 4),
				name: 'transfer',
				params: {
					$id: '/lisk/dpos/pom',
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
];

export const tx = {
	moduleID: 2,
	commandID: 0,
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
