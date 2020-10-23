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
import type { ActionsDefinition, BaseChannel, EventsArray, EventInfoObject } from 'lisk-framework';
import * as express from 'express';
import type { Express } from 'express';
import * as cors from 'cors';
import * as rateLimit from 'express-rate-limit';
import * as middlewares from './middlewares';
import * as config from './defaults';
import { Options, SharedState } from './types';
import * as controllers from './controllers';

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
			this._subscribeToEvents();
			this._server = this._app.listen(9000, '0.0.0.0');
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

	private _registerControllers(): void {
		this._app.get(
			'/api/stats/transactions',
			controllers.transactions.getTransactionStats(this._channel, this._state),
		);
	}

	private _subscribeToEvents(): void {
		this._channel.subscribe('app:network:event', (info: EventInfoObject) => {
			const {
				data: { event, data },
			} = info as {
				data: { event: string; data: { transactionIds: string[] } };
			};

			if (event === 'postTransactionsAnnouncement') {
				this._handlePostTransactionAnnounce(data);
			}
		});
	}

	private _handlePostTransactionAnnounce(data: { transactionIds: string[] }) {
		for (const aTransactionId of data.transactionIds) {
			if (this._state.transactions.transactions[aTransactionId]) {
				this._state.transactions.transactions[aTransactionId].count += 1;
			} else {
				this._state.transactions.transactions[aTransactionId] = {
					count: 1,
					timeReceived: new Date().getTime(),
				};
			}
		}
	}
}
