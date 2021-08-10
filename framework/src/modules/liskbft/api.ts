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

import { codec } from '@liskhq/lisk-codec';
import { BlockHeader } from '@liskhq/lisk-chain';
import { BaseAPI } from '../base_api';
import { GeneratorStore } from '../../node/generator';
import { APIContext } from '../../node/state_machine';
import { BFTHeader } from '../../node/consensus';
import { liskBFTAssetSchema, liskBFTModuleID } from './constants';

interface Validator {
	address: Buffer;
	bftWeight: bigint;
}

export interface BlockHeaderAsset {
	maxHeightPrevoted: number;
	maxHeightPreviouslyForged: number;
}

export class LiskBFTAPI extends BaseAPI {
	public async verifyGeneratorInfo(
		_apiContext: APIContext,
		_generatorStore: GeneratorStore,
		_info: {
			address: Buffer;
			height: number;
			maxHeightPrevoted: number;
			maxHeightPreviouslyForged: number;
			override?: boolean;
		},
		// eslint-disable-next-line @typescript-eslint/no-empty-function
	): Promise<void> {}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getValidators(_apiContext: APIContext): Promise<Validator[]> {
		return [];
	}

	public getBFTHeader(header: BlockHeader): BFTHeader {
		const asset = header.getAsset(liskBFTModuleID);
		const decodedAsset = asset
			? codec.decode<BlockHeaderAsset>(liskBFTAssetSchema, asset)
			: { maxHeightPrevoted: 0, maxHeightPreviouslyForged: 0 };
		return {
			generatorAddress: header.generatorAddress,
			height: header.height,
			id: header?.id,
			timestamp: header.timestamp,
			previousBlockID: header.previousBlockID,
			...decodedAsset,
		};
	}
}
