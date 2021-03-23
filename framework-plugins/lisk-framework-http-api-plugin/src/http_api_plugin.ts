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
import type { BaseChannel, EventsDefinition, ActionsDefinition } from 'lisk-framework';
import * as express from 'express';
import type { Express } from 'express';
import * as cors from 'cors';
import * as rateLimit from 'express-rate-limit';
import * as controllers from './controllers';
import * as middlewares from './middlewares';
import * as config from './defaults';
import { Options } from './types';

// eslint-disable-next-line
const pJSON = require('../package.json');

export class HTTPAPIPlugin extends BasePlugin {
	private _server!: Server;
	private _app!: Express;
	private _channel!: BaseChannel;

	// eslint-disable-next-line @typescript-eslint/class-literal-property-style
	public static get alias(): string {
		return 'httpApi';
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

	public get defaults(): object {
		return config.defaultConfig;
	}

	public get events(): EventsDefinition {
		return [];
	}

	public get actions(): ActionsDefinition {
		return {};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async load(channel: BaseChannel): Promise<void> {
		this._app = express();
		const options = objects.mergeDeep({}, config.defaultConfig.default, this.options) as Options;
		this._channel = channel;

		this._channel.once('app:ready', () => {
			this._registerMiddlewares(options);
			this._registerControllers();
			this._registerAfterMiddlewares(options);
			this._server = this._app.listen(options.port, options.host);
		});
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
			'/api/transactions/:id',
			controllers.transactions.getTransaction(this._channel, this.codec),
		);
		this._app.post(
			'/api/transactions',
			controllers.transactions.postTransaction(this._channel, this.codec),
		);
		this._app.get(
			'/api/accounts/:address',
			controllers.accounts.getAccount(this._channel, this.codec),
		);
		this._app.get('/api/node/info', controllers.node.getNodeInfo(this._channel));
		this._app.get('/api/blocks/:id', controllers.blocks.getBlockById(this._channel, this.codec));
		this._app.get('/api/blocks', controllers.blocks.getBlockByHeight(this._channel, this.codec));
		this._app.get(
			'/api/node/transactions',
			controllers.node.getTransactions(this._channel, this.codec),
		);
		this._app.get('/api/peers', controllers.peers.getPeers(this._channel));
		this._app.get('/api/delegates', controllers.delegates.getDelegates(this._channel, this.codec));
		this._app.get('/api/forgers', controllers.forgers.getForgers(this._channel, this.codec));
		this._app.get('/api/forging/info', controllers.forging.getForgingStatus(this._channel));
		this._app.patch('/api/forging', controllers.forging.updateForging(this._channel));
	}
}
