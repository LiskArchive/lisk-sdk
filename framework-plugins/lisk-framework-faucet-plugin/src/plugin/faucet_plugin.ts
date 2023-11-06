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
import { BasePlugin, PluginInitContext } from 'lisk-sdk';
import * as express from 'express';
import { join } from 'path';
import { Server } from 'http';
import { configSchema } from './schemas';
import { FaucetPluginConfig, State } from './types';
import { Endpoint } from './endpoint';

export class FaucetPlugin extends BasePlugin<FaucetPluginConfig> {
	public configSchema = configSchema;
	public endpoint = new Endpoint();

	private _server!: Server;
	private readonly _state: State = {
		publicKey: undefined,
		privateKey: undefined,
		address: undefined,
	};

	public get nodeModulePath(): string {
		return __filename;
	}

	public async init(context: PluginInitContext): Promise<void> {
		await super.init(context);
		this.endpoint.init(this._state, this.apiClient, this.config);
	}

	// eslint-disable-next-line @typescript-eslint/require-await, class-methods-use-this
	public async load(): Promise<void> {
		const app = express();
		app.get('/api/config', (_req, res) => {
			const config = {
				applicationUrl: this.config.applicationUrl,
				amount: this.config.amount,
				tokenPrefix: this.config.tokenPrefix,
				captchaSitekey: this.config.captchaSitekey,
				logoURL: this.config.logoURL,
				faucetAddress: this._state.address,
			};
			res.json(config);
		});
		app.use(express.static(join(__dirname, '../../build')));
		this._server = app.listen(this.config.port, this.config.host);
	}

	public async unload(): Promise<void> {
		return new Promise((resolve, reject) => {
			this._server.close(err => {
				if (err) {
					reject(err);
					return;
				}
				resolve();
			});
		});
	}
}
