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

import { Server } from 'http';
import { KVStore } from '@liskhq/lisk-db';
import {
	ActionsDefinition,
	BasePlugin,
	BaseChannel,
	EventsArray,
	PluginInfo,
} from 'lisk-framework';
import { objects } from '@liskhq/lisk-utils';
import * as express from 'express';
import type { Express } from 'express';
import * as cors from 'cors';
import * as rateLimit from 'express-rate-limit';
import { getDBInstance } from './db';
import * as config from './defaults';
import * as middlewares from './middlewares';
import { Options, States } from './types';
import * as controllers from './controllers';

// eslint-disable-next-line
const packageJSON = require('../package.json');

export class ReportMisbehaviorPlugin extends BasePlugin {
	private _pluginDB!: KVStore;
	private _server!: Server;
	private _app!: Express;
	private _options!: Options;
	private readonly _states: States = {};

	// eslint-disable-next-line @typescript-eslint/class-literal-property-style
	public static get alias(): string {
		return 'reportMisbehavior';
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
	public get defaults(): object {
		return config.defaultConfig;
	}

	// eslint-disable-next-line class-methods-use-this
	public get events(): EventsArray {
		return [];
	}

	// eslint-disable-next-line class-methods-use-this
	public get actions(): ActionsDefinition {
		return {};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async load(_channel: BaseChannel): Promise<void> {
		this._app = express();
		this._options = objects.mergeDeep({}, config.defaultConfig.default, this.options) as Options;

		this._pluginDB = await getDBInstance(this._options.dataPath);

		// Start http server
		this._registerMiddlewares(this._options);
		this._registerControllers();
		this._registerAfterMiddlewares(this._options);
		this._server = this._app.listen(this._options.port, '0.0.0.0');
	}

	public async unload(): Promise<void> {
		// eslint-disable-next-line consistent-return
		if (this._server !== undefined) {
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

		await this._pluginDB.close();
	}

	// eslint-disable-next-line
	private _registerControllers(): void {
		this._app.patch('/api/auth', controllers.auth(this._options, this._states));
	}

	private _registerMiddlewares(options: Options): void {
		// Register middlewares
		this._app.use(cors(options.cors));
		this._app.use(express.json());
		this._app.use(rateLimit(options.limits));
		this._app.use(middlewares.whiteListMiddleware(options));
	}

	private _registerAfterMiddlewares(_options: Options): void {
		this._app.use(middlewares.errorMiddleware());
	}
}
