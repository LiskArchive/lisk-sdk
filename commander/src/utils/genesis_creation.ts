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
import { address } from '@liskhq/lisk-cryptography';
import {
	posGenesisStoreSchema,
	PoSModule,
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
		blsProofOfPossession: string;
		blsPrivateKey: string;
	};
}

interface GenesisBlockDefaultAccountInput {
	keysList: Keys[];
	chainID: string;
	tokenDistribution: bigint;
	numberOfValidators: number;
}

export const generateGenesisBlockDefaultPoSAssets = (input: GenesisBlockDefaultAccountInput) => {
	const localID = Buffer.from([0, 0, 0, 0]).toString('hex');
	const tokenID = `${input.chainID}${localID}`;
	input.keysList.sort((a, b) =>
		address
			.getAddressFromLisk32Address(a.address)
			.compare(address.getAddressFromLisk32Address(b.address)),
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
						tokenID,
						totalSupply: (input.tokenDistribution * BigInt(input.keysList.length)).toString(),
					},
				],
				escrowSubstore: [],
				supportedTokensSubstore: [],
			} as Record<string, unknown>,
			schema: tokenGenesisStoreSchema,
		},
		{
			module: new PoSModule().name,
			data: {
				validators: input.keysList.map((v, i) => ({
					address: v.address,
					name: `genesis_${i}`,
					blsKey: v.plain.blsKey,
					proofOfPossession: v.plain.blsProofOfPossession,
					generatorKey: v.plain.generatorKey,
					lastGeneratedHeight: 0,
					isBanned: false,
					reportMisbehaviorHeights: [],
					consecutiveMissedBlocks: 0,
					commission: 0,
					lastCommissionIncreaseHeight: 0,
					sharingCoefficients: [],
				})),
				stakers: [],
				genesisData: {
					initRounds: 3,
					initValidators: input.keysList.slice(0, input.numberOfValidators).map(v => v.address),
				},
			} as Record<string, unknown>,
			schema: posGenesisStoreSchema,
		},
	];

	return {
		genesisAssets,
	};
};
