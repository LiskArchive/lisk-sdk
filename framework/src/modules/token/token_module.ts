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

import { BaseModule } from '../base_module';
import { TransferAsset } from './transfer_asset';

export class TokenModule extends BaseModule {
	public name = 'token';
	public type = 2;
	public accountSchema = {
		type: 'object',
		properties: {
			balance: {
				fieldNumber: 1,
				dataType: 'uint64',
			},
		},
		default: {
			balance: BigInt(0),
		},
	};
	public transactionAssets = [new TransferAsset()];
}
