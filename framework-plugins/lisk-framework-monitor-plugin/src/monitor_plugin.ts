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
import { Block } from '@liskhq/lisk-chain';
import { validator } from '@liskhq/lisk-validator';
import { BaseChannel, BasePlugin } from 'lisk-framework';
import * as express from 'express';
import type { Express } from 'express';
import * as cors from 'cors';
import * as rateLimit from 'express-rate-limit';
import * as middlewares from './middlewares';
import { MonitorPluginConfig, SharedState } from './types';
import * as controllers from './controllers';
import { transactionAnnouncementSchema, postBlockEventSchema, configSchema } from './schemas';
import { Endpoint } from './endpoint';

interface BlockData {
	readonly block: string;
}

export class MonitorPlugin extends BasePlugin<MonitorPluginConfig> {
	public name = 'monitor';
	public configSchema = configSchema;
	public endpoint = new Endpoint();

	private _server!: Server;
	private _app!: Express;
	private _state!: SharedState;

	public get nodeModulePath(): string {
		return __filename;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async load(_channel: BaseChannel): Promise<void> {
		this._app = express();

		this._state = {
			forks: {
				forkEventCount: 0,
				blockHeaders: {},
			},
			transactions: {},
			blocks: {},
		};

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
			controllers.prometheusExport.getData(this.apiClient, this._state),
		);
	}

	private _subscribeToEvents(): void {
		this.apiClient.subscribe('app_networkEvent', (eventData?: Record<string, unknown>) => {
			const { event, data } = eventData as { event: string; data: unknown };

			if (event === 'postTransactionsAnnouncement') {
				const errors = validator.validate(
					transactionAnnouncementSchema,
					data as Record<string, unknown>,
				);
				if (errors.length > 0) {
					return;
				}
				this._handlePostTransactionAnnounce(data as { transactionIds: string[] });
			}

			if (event === 'postBlock') {
				const errors = validator.validate(postBlockEventSchema, data as Record<string, unknown>);
				if (errors.length > 0) {
					return;
				}
				this._handlePostBlock(data as BlockData);
			}
		});

		this.apiClient.subscribe('app_chainForked', (data?: Record<string, unknown>) => {
			const { block } = (data as unknown) as BlockData;
			this._handleFork(block);
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

	private _handleFork(block: string) {
		this._state.forks.forkEventCount += 1;
		const { header } = Block.fromBytes(Buffer.from(block, 'hex'));
		const blockId = header.id.toString('hex');
		if (this._state.forks.blockHeaders[blockId]) {
			this._state.forks.blockHeaders[blockId].timeReceived = Date.now();
		} else {
			this._state.forks.blockHeaders[blockId] = {
				blockHeader: header,
				timeReceived: Date.now(),
			};
		}
	}

	private _handlePostBlock(data: BlockData) {
		const decodedBlock = Block.fromBytes(Buffer.from(data.block, 'hex'));

		if (!this._state.blocks[decodedBlock.header.id.toString('hex')]) {
			this._state.blocks[decodedBlock.header.id.toString('hex')] = {
				count: 0,
				height: decodedBlock.header.height,
			};
		}

		this._state.blocks[decodedBlock.header.id.toString('hex')].count += 1;

		// Clean up blocks older than current height minus 300 blocks
		for (const id of Object.keys(this._state.blocks)) {
			const blockInfo = this._state.blocks[id];
			if (blockInfo.height < decodedBlock.header.height - 300) {
				delete this._state.blocks[id];
			}
		}
	}
}
