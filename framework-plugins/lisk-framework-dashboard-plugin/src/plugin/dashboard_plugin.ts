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

import { Plugins } from 'lisk-sdk';
import * as express from 'express';
import { join } from 'path';
import { Server } from 'http';
import { configSchema } from './schemas';
import { DashboardPluginConfig } from './types';

export class DashboardPlugin extends Plugins.BasePlugin<DashboardPluginConfig> {
	public configSchema = configSchema;

	private _server!: Server;

	public get nodeModulePath(): string {
		return __filename;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async load(): Promise<void> {
		const config = {
			applicationUrl: this.config.applicationUrl,
			applicationName: this.config.applicationName,
		};
		const app = express();
		app.use(express.static(join(__dirname, '../../build')));
		app.get('/api/config', (_req, res) => res.json(config));
		this._server = app.listen(this.config.port, this.config.host);
	}

	public async unload(): Promise<void> {
		await new Promise<void>((resolve, reject) => {
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
