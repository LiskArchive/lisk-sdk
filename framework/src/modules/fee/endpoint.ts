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

import { ModuleEndpointContext } from '../../types';
import { BaseEndpoint } from '../base_endpoint';
import { GetFeeTokenIDResponse, GetMinFeePerByteResponse, ModuleConfig } from './types';

export class FeeEndpoint extends BaseEndpoint {
	private _config!: ModuleConfig;

	public init(config: ModuleConfig) {
		this._config = config;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getFeeTokenID(_ctx: ModuleEndpointContext): Promise<GetFeeTokenIDResponse> {
		return {
			tokenID: this._config.feeTokenID.toString('hex'),
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getMinFeePerByte(_ctx: ModuleEndpointContext): Promise<GetMinFeePerByteResponse> {
		return {
			minFeePerByte: this._config.minFeePerByte,
		};
	}
}
