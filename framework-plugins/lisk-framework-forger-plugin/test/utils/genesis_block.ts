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

import { GenesisBlockJSON } from 'lisk-framework';
import {
	createGenesisBlock,
	genesisBlockHeaderSchema,
	genesisBlockHeaderAssetSchema,
	defaultAccountAssetSchema,
	DefaultAccountAsset,
	GenesisBlock,
} from '@liskhq/lisk-genesis';
import { objects } from '@liskhq/lisk-utils';
import { codec, Schema } from '@liskhq/lisk-codec';
import * as genesisBlockJSON from '../fixtures/genesis_block.json';

export const genesisSchema = objects.mergeDeep(
	{
		$id: '/block/genesis',
		type: 'object',
		required: ['header', 'payload'],
		properties: {
			header: {
				fieldNumber: 1,
				type: 'object',
			},
			payload: { type: 'array', items: { dataType: 'bytes' }, fieldNumber: 2, const: [] },
		},
	},
	{
		properties: {
			header: objects.mergeDeep({}, genesisBlockHeaderSchema, {
				$id: '/block/genesis/header/id',
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
								items: {
									properties: {
										asset: defaultAccountAssetSchema,
									},
								},
							},
						},
					},
				},
			},
		},
	},
) as Schema;

export const getGenesisBlockJSON = ({ timestamp }: { timestamp: number }): GenesisBlockJSON => {
	const genesisBlock = codec.fromJSON<GenesisBlock<DefaultAccountAsset>>(
		genesisSchema,
		genesisBlockJSON,
	);

	const updatedGenesisBlock = createGenesisBlock({
		accounts: genesisBlock.header.asset.accounts,
		initDelegates: genesisBlock.header.asset.initDelegates,
		initRounds: genesisBlock.header.asset.initRounds,
		roundLength: 103,
		timestamp,
	});

	return codec.toJSON(genesisSchema, updatedGenesisBlock);
};
