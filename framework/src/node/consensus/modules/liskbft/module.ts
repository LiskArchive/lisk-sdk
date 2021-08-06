/*
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
 */

import { BlockHeader } from '@liskhq/lisk-chain';
import { codec, Schema } from '@liskhq/lisk-codec';
import { BaseModule } from '../../../../modules';
import { BFTHeader } from '../../type';
import { LiskBFTAPI } from './api';
import { LiskBFTEndpoint } from './endpoint';

// TODO: update after LIP
export const liskBFTModuleID = 9;
export const liskBFTAssetSchema = {
	$id: '/blockHeader/asset/v2',
	type: 'object',
	properties: {
		maxHeightPreviouslyForged: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		maxHeightPrevoted: {
			dataType: 'uint32',
			fieldNumber: 2,
		},
	},
	required: ['maxHeightPreviouslyForged', 'maxHeightPrevoted'],
} as Schema;

interface BlockHeaderAsset {
	maxHeightPrevoted: number;
	maxHeightPreviouslyForged: number;
}

export const getBFTHeader = (header: BlockHeader): BFTHeader => {
	const asset = header.getAsset(liskBFTModuleID);
	const decodedAsset = asset
		? codec.decode<BlockHeaderAsset>(liskBFTAssetSchema, asset)
		: { maxHeightPrevoted: 0, maxHeightPreviouslyForged: 0 };
	return {
		generatorAddress: header.generatorAddress,
		height: header.height,
		id: header.id,
		timestamp: header.timestamp,
		previousBlockID: header.previousBlockID,
		...decodedAsset,
	};
};

export class LiskBFTModule extends BaseModule {
	public id = liskBFTModuleID;
	public name = 'liskBFT';
	public api = new LiskBFTAPI(this.id);
	public endpoint = new LiskBFTEndpoint(this.id);
}
