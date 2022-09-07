/*
 * LiskHQ/lisk-commander
 * Copyright © 2021 Lisk Foundation
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
import { Schema } from '@liskhq/lisk-codec';
import {
	dposGenesisStoreSchema,
	DPoSModule,
	tokenGenesisStoreSchema,
	TokenModule,
} from 'lisk-framework';

export const genesisAssetsSchema = {
	$id: '/genesis/asset/0',
	type: 'object',
	required: ['assets'],
	properties: {
		assets: {
			type: 'array',
			items: {
				type: 'object',
				required: ['module', 'data', 'schema'],
				properties: {
					module: {
						type: 'string',
					},
					data: {
						type: 'object',
					},
					schema: {
						type: 'object',
					},
				},
			},
		},
	},
};

export interface GenesisAssetsInput {
	assets: {
		module: string;
		data: Record<string, unknown>;
		schema: Schema;
	}[];
}

interface Keys {
	address: string;
	keyPath: string;
	publicKey: string;
	privateKey: string;
	plain: {
		generatorKeyPath: string;
		generatorKey: string;
		generatorPrivateKey: string;
		blsKeyPath: string;
		blsKey: string;
		blsProofOfPosession: string;
		blsPrivateKey: string;
	};
}

interface GenesisBlockDefaultAccountInput {
	keysList: Keys[];
	chainID: string;
	tokenDistribution: bigint;
	numberOfValidators: number;
}

export const generateGenesisBlockDefaultDPoSAssets = (input: GenesisBlockDefaultAccountInput) => {
	const localID = Buffer.from([0, 0, 0, 0]).toString('hex');
	const nextLocalID = Buffer.from([0, 0, 0, 1]).toString('hex');
	const tokenID = `${input.chainID}${localID}`;
	input.keysList.sort((a, b) =>
		Buffer.from(a.address, 'hex').compare(Buffer.from(b.address, 'hex')),
	);
	const genesisAssets = [
		{
			module: new TokenModule().name,
			data: {
				userSubstore: input.keysList.map(a => ({
					address: a.address,
					tokenID,
					availableBalance: input.tokenDistribution.toString(),
					lockedBalances: [],
				})),
				supplySubstore: [
					{
						localID,
						totalSupply: (input.tokenDistribution * BigInt(input.keysList.length)).toString(),
					},
				],
				escrowSubstore: [],
				availableLocalIDSubstore: {
					nextAvailableLocalID: nextLocalID,
				},
				terminatedEscrowSubstore: [],
			} as Record<string, unknown>,
			schema: tokenGenesisStoreSchema,
		},
		{
			module: new DPoSModule().name,
			data: {
				validators: input.keysList.map((v, i) => ({
					address: v.address,
					name: `genesis_${i}`,
					blsKey: v.plain.blsKey,
					proofOfPossession: v.plain.blsProofOfPosession,
					generatorKey: v.plain.generatorKey,
					lastGeneratedHeight: 0,
					isBanned: false,
					pomHeights: [],
					consecutiveMissedBlocks: 0,
				})),
				voters: [],
				snapshots: [],
				genesisData: {
					initRounds: 3,
					initDelegates: input.keysList.slice(0, input.numberOfValidators).map(v => v.address),
				},
			} as Record<string, unknown>,
			schema: dposGenesisStoreSchema,
		},
	];

	return {
		genesisAssets,
	};
};
