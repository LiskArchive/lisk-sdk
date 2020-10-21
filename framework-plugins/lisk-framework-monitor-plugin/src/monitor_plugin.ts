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
import { BasePlugin, PluginInfo } from 'lisk-framework';
import { objects } from '@liskhq/lisk-utils';
import type { BaseChannel, EventsArray, ActionsDefinition } from 'lisk-framework';
import * as express from 'express';
import type { Express } from 'express';
import * as cors from 'cors';
import * as rateLimit from 'express-rate-limit';
import * as middlewares from './middlewares';
import * as config from './defaults';
import { Options, SharedState } from './types';

// eslint-disable-next-line
const pJSON = require('../package.json');

export class MonitorPlugin extends BasePlugin {
	private _server!: Server;
	private _app!: Express;
	private _channel!: BaseChannel;
	private _state!: SharedState;

	// eslint-disable-next-line @typescript-eslint/class-literal-property-style
	public static get alias(): string {
		return 'monitor';
	}

	// eslint-disable-next-line @typescript-eslint/class-literal-property-style
	public static get info(): PluginInfo {
		return {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			author: pJSON.author,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			version: pJSON.version,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			name: pJSON.name,
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
	public async load(channel: BaseChannel): Promise<void> {
		this._app = express();
		const options = objects.mergeDeep({}, config.defaultConfig.default, this.options) as Options;
		this._channel = channel;
		this._state = {
			network: {
				outgoing: {
					count: 0,
					networkHeight: {
						majorityHeight: 0,
						numberOfPeers: 0,
					},
					connectStats: {
						connects: 0,
						disconnects: 0,
					},
				},
				incoming: {
					count: 0,
					networkHeight: {
						majorityHeight: 0,
						numberOfPeers: 0,
					},
					connectStats: {
						connects: 0,
						disconnects: 0,
					},
				},
				totalPeers: {
					connected: 0,
					disconnected: 0,
				},
				banning: {
					totalBannedPeers: 0,
					bannedPeers: {},
				},
			},
			forks: {
				forkEventCount: 0,
				blockHeaders: {},
			},
			transactions: {
				transactions: {},
				averageReceivedTransactions: 0,
				connectedPeers: 0,
			},
			blocks: {
				blocks: {},
				averageReceivedBlocks: 0,
				connectedPeers: 0,
			},
		};

		this._channel.once('app:ready', () => {
			this._registerMiddlewares(options);
			this._registerControllers();
			this._registerAfterMiddlewares(options);
			this._server = this._app.listen(options.port, '0.0.0.0');
		});
	}

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

	public get state(): SharedState {
		return this._state;
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

	// eslint-disable-next-line
	private _registerControllers(): void {}
}
