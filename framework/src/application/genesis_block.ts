/*
 * Copyright © 2019 Lisk Foundation
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
import { GenesisBlock, genesisBlockHeaderAssetSchema } from '@liskhq/lisk-genesis';
import { blockHeaderSchema, blockSchema, baseAccountSchema } from '@liskhq/lisk-chain';
import { objects } from '@liskhq/lisk-utils';
import { Schema, codec } from '@liskhq/lisk-codec';
import { AccountAsset, accountAssetSchema } from './node/account';

export interface GenesisBlockJSON {
	header: {
		readonly id: string;
		readonly version: number;
		readonly timestamp: number;
		readonly height: number;
		readonly previousBlockID: string;
		readonly transactionRoot: string;
		readonly generatorPublicKey: string;
		readonly reward: string;
		readonly signature: string;
		readonly asset: {
			readonly accounts: GenesisAccountStateJSON[];
			readonly initDelegates: string[];
			readonly initRounds: number;
		};
	};
	payload: never[];
}

export interface GenesisAccountStateJSON {
	readonly address: string;
	readonly balance: string;
	readonly nonce: string;
	readonly keys: {
		mandatoryKeys: string[];
		optionalKeys: string[];
		numberOfSignatures: number;
	};
	readonly asset: {
		delegate: {
			username: string;
			pomHeights: number[];
			consecutiveMissedBlocks: number;
			lastForgedHeight: number;
			isBanned: boolean;
			totalVotesReceived: string;
		};
		sentVotes: { delegateAddress: string; amount: string }[];
		unlocking: {
			delegateAddress: string;
			amount: string;
			unvoteHeight: number;
		}[];
	};
}

export const genesisSchema = (accountSchema: object): Schema =>
	objects.mergeDeep(
		{},
		blockSchema,
		{
			$id: '/block/genesis',
			properties: {
				header: objects.mergeDeep({}, blockHeaderSchema, {
					properties: {
						id: {
							dataType: 'bytes',
						},
						asset: genesisBlockHeaderAssetSchema,
					},
				}),
			},
		},
		{
			properties: {
				header: {
					properties: {
						asset: {
							properties: {
								accounts: {
									items: objects.mergeDeep({}, baseAccountSchema, {
										properties: {
											asset: {
												properties: accountSchema,
											},
										},
									}),
								},
							},
						},
					},
				},
			},
		},
	) as Schema;

export const genesisBlockFromJSON = (
	genesis: GenesisBlockJSON,
	accountSchema = accountAssetSchema,
): GenesisBlock<AccountAsset> =>
	codec.fromJSON<GenesisBlock<AccountAsset>>(genesisSchema(accountSchema), genesis);
