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
import { Plugins } from 'lisk-sdk';
import * as express from 'express';
import type { Express } from 'express';
import * as cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import * as middlewares from './middlewares';
import { MonitorPluginConfig, SharedState } from './types';
import * as controllers from './controllers';
import { configSchema } from './schemas';
import { Endpoint } from './endpoint';

interface BlockData {
	readonly blockHeader: {
		[key: string]: unknown;
		id: string;
		height: number;
	};
}

export class MonitorPlugin extends Plugins.BasePlugin<MonitorPluginConfig> {
	public configSchema = configSchema;
	public endpoint = new Endpoint();

	private _server!: Server;
	private _app!: Express;
	private _state!: SharedState;

	public get nodeModulePath(): string {
		return __filename;
	}

	public async init(context: Plugins.PluginInitContext): Promise<void> {
		await super.init(context);
		this._state = {
			forks: {
				forkEventCount: 0,
				blockHeaders: {},
			},
			transactions: {},
			blocks: {},
		};
		this.endpoint.init(this._state, this.apiClient);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async load(): Promise<void> {
		this._app = express();

		this._registerMiddlewares(this.config);
		this._registerControllers();
		this._registerAfterMiddlewares(this.config);
		this._subscribeToEvents();
		this._server = this._app.listen(this.config.port, this.config.host);
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

	public get state(): SharedState {
		return this._state;
	}

	private _registerMiddlewares(options: MonitorPluginConfig): void {
		// Register middlewares
		this._app.use(cors(options.cors));
		this._app.use(express.json());
		this._app.use(rateLimit(options.limits));
		this._app.use(middlewares.whiteListMiddleware(options));
	}

	private _registerAfterMiddlewares(_options: MonitorPluginConfig): void {
		this._app.use(middlewares.errorMiddleware());
	}

	private _registerControllers(): void {
		this._app.get(
			'/api/prometheus/metrics',
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			controllers.prometheusExport.getData(this.apiClient, this._state),
		);
	}

	private _subscribeToEvents(): void {
		this.apiClient.subscribe('network_newBlock', (data?: Record<string, unknown>) => {
			const { blockHeader } = data as unknown as BlockData;
			this._handlePostBlock(blockHeader);
		});
		this.apiClient.subscribe('network_newTransaction', (data?: Record<string, unknown>) => {
			const { transactionIds } = data as unknown as { transactionIds: string[] };
			this._handlePostTransactionAnnounce({ transactionIds });
		});

		this.apiClient.subscribe('chain_forked', (data?: Record<string, unknown>) => {
			const { blockHeader } = data as unknown as BlockData;
			this._handleFork(blockHeader);
		});
	}

	private _handlePostTransactionAnnounce(data: { transactionIds: string[] }) {
		for (const aTransactionId of data.transactionIds) {
			if (this._state.transactions[aTransactionId]) {
				this._state.transactions[aTransactionId].count += 1;
			} else {
				this._state.transactions[aTransactionId] = {
					count: 1,
					timeReceived: Date.now(),
				};
				this._cleanUpTransactionStats();
			}
		}
	}

	private _cleanUpTransactionStats() {
		const expiryTime = 600000;
		for (const transactionID of Object.keys(this._state.transactions)) {
			if (Date.now() - this._state.transactions[transactionID].timeReceived > expiryTime) {
				delete this._state.transactions[transactionID];
			}
		}
	}

	private _handleFork(header: BlockData['blockHeader']) {
		this._state.forks.forkEventCount += 1;
		const blockId = header.id;
		if (this._state.forks.blockHeaders[blockId]) {
			this._state.forks.blockHeaders[blockId].timeReceived = Date.now();
		} else {
			this._state.forks.blockHeaders[blockId] = {
				blockHeader: header,
				timeReceived: Date.now(),
			};
		}
	}

	private _handlePostBlock(header: BlockData['blockHeader']) {
		if (!this._state.blocks[header.id]) {
			this._state.blocks[header.id] = {
				count: 0,
				height: header.height,
			};
		}

		this._state.blocks[header.id].count += 1;

		// Clean up blocks older than current height minus 300 blocks
		for (const id of Object.keys(this._state.blocks)) {
			const blockInfo = this._state.blocks[id];
			if (blockInfo.height < header.height - 300) {
				delete this._state.blocks[id];
			}
		}
	}
}
