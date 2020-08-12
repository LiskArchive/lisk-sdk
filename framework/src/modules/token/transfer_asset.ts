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
/* eslint-disable class-methods-use-this */

import { BaseAsset } from '../base_asset';
import { ApplyAssetInput } from '../../types';

interface Asset {
	readonly amount: bigint;
	readonly recipientAddress: Buffer;
	readonly data: string;
}

export class TransferAsset extends BaseAsset {
	public name = 'transfer';
	public type = 0;
	public assetSchema = {
		$id: 'lisk/transfer-asset',
		title: 'Transfer transaction asset',
		type: 'object',
		required: ['amount', 'recipientAddress', 'data'],
		properties: {
			amount: {
				dataType: 'uint64',
				fieldNumber: 1,
			},
			recipientAddress: {
				dataType: 'bytes',
				fieldNumber: 2,
				minLength: 20,
				maxLength: 20,
			},
			data: {
				dataType: 'string',
				fieldNumber: 3,
				minLength: 0,
				maxLength: 64,
			},
		},
	};

	// eslint-disable-next-line
	public async applyAsset(_input: ApplyAssetInput<Asset>): Promise<void> {}
}
