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
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { KVStore } from '@liskhq/lisk-db';
import {
	ActionsDefinition,
	BasePlugin,
	BaseChannel,
	EventsArray,
	EventInfoObject,
	PluginInfo,
	TransactionJSON,
} from 'lisk-framework';
import {
	constants as transactionConstants,
	VoteTransaction,
	DelegateTransaction,
} from '@liskhq/lisk-transactions';
import { objects } from '@liskhq/lisk-utils';
import * as express from 'express';
import type { Express } from 'express';
import * as cors from 'cors';
import * as rateLimit from 'express-rate-limit';
import * as controllers from './controllers';
import * as middlewares from './middlewares';
import * as config from './defaults';
import { Forger, ForgerInfo, Options, Voters } from './types';
import { DB_KEY_FORGER_INFO } from './constants';
import { forgerInfoSchema } from './schema';

// eslint-disable-next-line
const packageJSON = require('../package.json');

export class ForgerPlugin extends BasePlugin {
	private _forgerPluginDB!: KVStore;
	private _server!: Server;
	private _app!: Express;
	private _channel!: BaseChannel;
	private _forgersList!: ReadonlyArray<Forger>;

	// eslint-disable-next-line @typescript-eslint/class-literal-property-style
	public static get alias(): string {
		return 'forger';
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
	public async load(channel: BaseChannel): Promise<void> {
		this._app = express();
		const options = objects.mergeDeep({}, config.defaultConfig.default, this.options) as Options;
		this._channel = channel;

		this._forgerPluginDB = await this._getDBInstance(options);

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._channel.once('app:ready', async () => {
			this._registerMiddlewares(options);
			this._registerControllers();
			this._registerAfterMiddlewares(options);
			this._subscribeToChannel();
			await this._setForgersInfo();
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

		await this._forgerPluginDB.close();
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
		this._app.get('/v1/hello', controllers.helloController(this._channel));
	}

	// eslint-disable-next-line class-methods-use-this
	private async _getDBInstance(options: Options, dbName = 'forger_plugin.db'): Promise<KVStore> {
		const resolvedPath = options.dataPath.replace('~', os.homedir());
		const dirPath = path.join(resolvedPath, dbName);
		await fs.ensureDir(dirPath);

		return new KVStore(dirPath);
	}

	private _subscribeToChannel(): void {
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._channel.subscribe('app:block:new', async (newBlock: EventInfoObject) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const { header: { generatorPublicKey, reward }, payload } = this.codec.decodeBlock((newBlock.data as any).block);
			const forgerAddress = getAddressFromPublicKey(Buffer.from(generatorPublicKey, 'base64')).toString('base64');
			const forgerInfo = await this._getForgerInfo(forgerAddress);

			if (this._forgersList.find(forger => forger.address === forgerAddress)) {
				forgerInfo.totalProducedBlocks += 1;
				forgerInfo.totalReceivedRewards += BigInt(reward);
				forgerInfo.totalReceivedFees += BigInt(this._getFee(payload));
			}

			for (const trx of payload) {
				if (trx.type === VoteTransaction.TYPE) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-explicit-any
					const votes = (trx.asset as any).votes.filter((vote: any) => {
						if (vote.delegateAddress === forgerAddress) {
							return {
								address: Buffer.from(vote.delegateAddress, 'base64'),
								amount: BigInt(vote.amount),
							};
						}
						return {};
					}) as Voters[];
					forgerInfo.votesReceived.push(...votes);
				}
			}

			await this._setForgerInfo(generatorPublicKey, { ...forgerInfo });
		});

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._channel.subscribe('app:block:delete', async (deleteBlock: EventInfoObject) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const { header: { generatorPublicKey, reward }, payload } = this.codec.decodeBlock((deleteBlock.data as any).block);
			const forgerAddress = getAddressFromPublicKey(Buffer.from(generatorPublicKey, 'base64')).toString('base64');
			const forgerInfo = await this._getForgerInfo(forgerAddress);

			if (this._forgersList.find(forger => forger.address === forgerAddress)) {
				forgerInfo.totalProducedBlocks -= 1;
				forgerInfo.totalReceivedRewards -= BigInt(reward);
				forgerInfo.totalReceivedFees -= BigInt(this._getFee(payload));
			}

			for (const trx of payload) {
				if (trx.type === VoteTransaction.TYPE) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-explicit-any
					for (const vote of (trx.asset as any).votes) {
						if (vote.delegateAddress === forgerAddress) {
							forgerInfo.votesReceived = forgerInfo.votesReceived.filter(vote => vote.address === Buffer.from(forgerAddress, 'base64'));
						}
					}
				}
			}

			await this._setForgerInfo(generatorPublicKey, { ...forgerInfo });
		});
	}

	private async _setForgersInfo(): Promise<void> {
		try {
			const forgingDelegates = await this._channel.invoke<Forger[]>('app:getForgingStatusOfAllDelegates');
			this._forgersList = forgingDelegates.filter(forgers => forgers.forging);
		} catch (error) {
			throw new Error(`Action app:getForgingStatusOfAllDelegates failed with error: ${(error as Error).message}`);
		}
	}

	private async _getForgerInfo(forgerAddress: string): Promise<ForgerInfo> {
		const forgerInfo = await this._forgerPluginDB.get(`${DB_KEY_FORGER_INFO}:${forgerAddress}`);

		return codec.decode<ForgerInfo>(forgerInfoSchema, forgerInfo);
	}

	private async _setForgerInfo(generatorPublicKey: string, forgerInfo: ForgerInfo): Promise<void> {
		const encodedForgerInfo = codec.encode(forgerInfoSchema, forgerInfo);
		await this._forgerPluginDB.put(`${DB_KEY_FORGER_INFO}:${generatorPublicKey}`, encodedForgerInfo);
	}

	// eslint-disable-next-line class-methods-use-this
	private _getFee(payload: ReadonlyArray<TransactionJSON>): BigInt {
		let fee = BigInt(0);

		for (const trx of payload) {
			if (trx.type === DelegateTransaction.TYPE) {
				fee += BigInt(transactionConstants.DELEGATE_NAME_FEE);
			}
			fee += BigInt(transactionConstants.MIN_FEE_PER_BYTE);
			fee *= BigInt(payload);
		}

		return fee;
	}
}
