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

import { objects } from '@liskhq/lisk-utils';
import {
	ActionsDefinition,
	BasePlugin,
	BaseChannel,
	EventsDefinition,
	PluginInfo,
	SchemaWithDefault,
} from 'lisk-framework';
import * as express from 'express';
import { join } from 'path';
import { Server } from 'http';
import * as defaults from './defaults';
import { dashboardPluginOptions } from './types';

// eslint-disable-next-line
const packageJSON = require('../../package.json');

export class DashboardPlugin extends BasePlugin {
	private _options!: dashboardPluginOptions;
	private _server!: Server;

	// eslint-disable-next-line @typescript-eslint/class-literal-property-style
	public static get alias(): string {
		return 'dashboard';
	}

	// eslint-disable-next-line @typescript-eslint/class-literal-property-style
	public static get info(): PluginInfo {
		return {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			author: packageJSON.author,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			version: packageJSON.version,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			name: packageJSON.name,
		};
	}

	// eslint-disable-next-line class-methods-use-this
	public get defaults(): SchemaWithDefault {
		return defaults.config;
	}

	// eslint-disable-next-line class-methods-use-this
	public get events(): EventsDefinition {
		return [];
	}

	// eslint-disable-next-line class-methods-use-this
	public get actions(): ActionsDefinition {
		return {};
	}

	// eslint-disable-next-line @typescript-eslint/require-await, class-methods-use-this
	public async load(_channel: BaseChannel): Promise<void> {
		this._options = objects.mergeDeep(
			{},
			defaults.config.default,
			this._options,
		) as dashboardPluginOptions;
		const app = express();
		app.use(express.static(join(__dirname, '../../build')));
		this._server = app.listen(this._options.port, this._options.host);
	}

	// eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
	public async unload(): Promise<void> {
		await new Promise((resolve, reject) => {
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
