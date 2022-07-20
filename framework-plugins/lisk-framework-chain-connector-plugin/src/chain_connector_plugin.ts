/*
 * Copyright © 2022 Lisk Foundation
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

import { BasePlugin, PluginInitContext, apiClient } from 'lisk-sdk';
import { CCM_BASED_CCU_FREQUENCY, LIVENESS_BASED_CCU_FREQUENCY } from './constants';
import { configSchema } from './schemas';
import { ChainConnectorPluginConfig, SentCCUs } from './types';

interface CCUFrequencyConfig {
	ccm: number;
	liveness: number;
}

export class ChainConnectorPlugin extends BasePlugin<ChainConnectorPluginConfig> {
	public name = 'chainConnector';
	public configSchema = configSchema;
	private _lastCertifiedHeight!: number;
	private _ccuFrequency!: CCUFrequencyConfig;
	private _mainchainAPIClient!: apiClient.APIClient;
	private _sidechainAPIClient?: apiClient.APIClient;
	private readonly _sentCCUs: SentCCUs = [];

	public get nodeModulePath(): string {
		return __filename;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(context: PluginInitContext): Promise<void> {
		await super.init(context);
		this._ccuFrequency.ccm = this.config.ccmBasedFrequency || CCM_BASED_CCU_FREQUENCY;
		this._ccuFrequency.liveness =
			this.config.livenessBasedFrequency || LIVENESS_BASED_CCU_FREQUENCY;
	}

	public async load(): Promise<void> {
		this._mainchainAPIClient = await apiClient.createIPCClient(this.config.mainchainIPCPath);
		if (this.config.sidechainIPCPath) {
			this._sidechainAPIClient = await apiClient.createIPCClient(this.config.sidechainIPCPath);
		}
		// TODO: After DB issue we need to fetch the last sent CCUs and assign it to _sentCCUs
		// eslint-disable-next-line no-console
		console.log(this._lastCertifiedHeight, this._sentCCUs);
		// TODO: Fetch the certificate height from last sent CCU and update the height
		this._lastCertifiedHeight = 0;
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async unload(): Promise<void> {
		await this._mainchainAPIClient.disconnect();
		if (this._sidechainAPIClient) {
			await this._sidechainAPIClient.disconnect();
		}
	}
}
