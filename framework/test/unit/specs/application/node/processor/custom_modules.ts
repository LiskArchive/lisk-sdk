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
/* eslint-disable max-classes-per-file */

import { BaseModule } from '../../../../../../src/modules/base_module';
import { BaseAsset } from '../../../../../../src/modules/base_asset';

export class CustomAsset0 extends BaseAsset {
	public type = 0;
	public name = 'customAsset0';
	public assetSchema = {
		$id: 'lisk/custom-asset-0',
		type: 'object',
		properties: {
			data: {
				dataType: 'string',
				fieldNumber: 1,
			},
		},
	};

	public validateAsset = jest.fn();
	public applyAsset = jest.fn();
}

export class CustomModule0 extends BaseModule {
	public type = 3;
	public name = 'customModule0';
	public transactionAssets = [new CustomAsset0()];
	public reducers = {
		testing: jest.fn(),
	};

	public afterGenesisBlockApply = jest.fn();
	public beforeBlockApply = jest.fn();
	public afterBlockApply = jest.fn();
	public beforeTransactionApply = jest.fn();
	public afterTransactionApply = jest.fn();
}

export class CustomModule1 extends BaseModule {
	public type = 4;
	public name = 'customModule1';

	public beforeBlockApply = jest.fn();
	public afterTransactionApply = jest.fn();
}
