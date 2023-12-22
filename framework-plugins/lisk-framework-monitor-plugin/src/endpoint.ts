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
import { Plugins, Types } from 'lisk-sdk';
import { SharedState } from './types';
import * as controllers from './controllers';

export class Endpoint extends Plugins.BasePluginEndpoint {
	private _state!: SharedState;
	private _client!: Plugins.BasePlugin['apiClient'];

	public init(state: SharedState, apiClient: Plugins.BasePlugin['apiClient']) {
		this._state = state;
		this._client = apiClient;
	}

	public async getTransactionStats(
		_context: Types.PluginEndpointContext,
	): Promise<controllers.transactions.TransactionStats> {
		return controllers.transactions.getTransactionStats(this._client, this._state);
	}

	public async getBlockStats(
		_context: Types.PluginEndpointContext,
	): Promise<controllers.blocks.BlockStats> {
		return controllers.blocks.getBlockStats(this._client, this._state);
	}

	public async getNetworkStats(
		_context: Types.PluginEndpointContext,
	): Promise<controllers.network.NetworkStats> {
		return controllers.network.getNetworkStats(this._client);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async getForkStats(
		_context: Types.PluginEndpointContext,
	): Promise<controllers.forks.ForkStats> {
		return controllers.forks.getForkStats(this._state);
	}
}
