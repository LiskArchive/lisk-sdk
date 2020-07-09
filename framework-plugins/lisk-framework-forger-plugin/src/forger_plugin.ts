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
import * as Debug from 'debug';
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
import { VoteTransaction } from '@liskhq/lisk-transactions';
import { objects } from '@liskhq/lisk-utils';
import * as express from 'express';
import type { Express } from 'express';
import * as cors from 'cors';
import * as rateLimit from 'express-rate-limit';
import * as controllers from './controllers';
import * as middlewares from './middlewares';
import * as config from './defaults';
import { Forger, ForgerInfo, Options, TransactionFees, Voters } from './types';
import { DB_KEY_FORGER_INFO } from './constants';
import { forgerInfoSchema } from './schema';

interface Data {
	readonly block: string;
}

interface Asset {
	readonly votes: Array<Readonly<Vote>>;
}
interface Vote {
	delegateAddress: string;
	amount: string;
}

// eslint-disable-next-line
const packageJSON = require('../package.json');
// eslint-disable-next-line new-cap
const debug = Debug('plugin:forger');

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
			await this._setForgersList();
			if (this._forgersList.length) {
				this._subscribeToChannel();
			}
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
			const { block } = newBlock.data as Data;
			const {
				header: { generatorPublicKey, reward },
				payload,
			} = this.codec.decodeBlock(block);
			const forgerAddress = getAddressFromPublicKey(
				Buffer.from(generatorPublicKey, 'base64'),
			).toString('base64');
			const forgerInfo = await this._getForgerInfo(forgerAddress);

			if (this._forgersList.find(forger => forger.address === forgerAddress)) {
				forgerInfo.totalProducedBlocks += 1;
				forgerInfo.totalReceivedRewards += BigInt(reward);
				forgerInfo.totalReceivedFees += await this._getFee(payload, block);
			}

			for (const trx of payload) {
				if (trx.type === VoteTransaction.TYPE) {
					for (const vote of (trx.asset as Asset).votes) {
						if (vote.delegateAddress === forgerAddress) {
							forgerInfo.votesReceived.push({
								address: Buffer.from(vote.delegateAddress, 'base64'),
								amount: BigInt(vote.amount),
							});
						}
					}
				}
			}

			if (Object.values(forgerInfo).length) {
				await this._setForgerInfo(forgerAddress, { ...forgerInfo });
			}
		});

		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._channel.subscribe('app:block:delete', async (deleteBlock: EventInfoObject) => {
			const { block } = deleteBlock.data as Data;
			const {
				header: { generatorPublicKey, reward },
				payload,
			} = this.codec.decodeBlock(block);
			const forgerAddress = getAddressFromPublicKey(
				Buffer.from(generatorPublicKey, 'base64'),
			).toString('base64');
			const forgerAddressBuffer = Buffer.from(forgerAddress, 'base64');
			const forgerInfo = await this._getForgerInfo(forgerAddress);

			if (this._forgersList.find(forger => forger.address === forgerAddress)) {
				forgerInfo.totalProducedBlocks -= 1;
				forgerInfo.totalReceivedRewards -= BigInt(reward);
				forgerInfo.totalReceivedFees -= await this._getFee(payload, block);
			}

			const filteredVotes: Voters[] = [];
			for (const trx of payload) {
				if (trx.type === VoteTransaction.TYPE) {
					for (const vote of (trx.asset as Asset).votes) {
						if (vote.delegateAddress === forgerAddress) {
							filteredVotes.push(
								...forgerInfo.votesReceived.filter(
									aVote => !aVote.address.equals(forgerAddressBuffer),
								),
							);
						}
					}
					forgerInfo.votesReceived = filteredVotes;
				}
			}

			if (Object.values(forgerInfo).length) {
				await this._setForgerInfo(forgerAddress, { ...forgerInfo });
			}
		});
	}

	private async _setForgersList(): Promise<void> {
		const forgingDelegates = await this._channel.invoke<Forger[]>(
			'app:getForgingStatusOfAllDelegates',
		);
		this._forgersList = forgingDelegates.filter(forgers => forgers.forging);
	}

	private async _getForgerInfo(forgerAddress: string): Promise<ForgerInfo> {
		let forgerInfo;
		try {
			forgerInfo = await this._forgerPluginDB.get(`${DB_KEY_FORGER_INFO}:${forgerAddress}`);
		} catch (error) {
			debug(`Forger info does not exists for delegate: ${forgerAddress}`);
			return {} as ForgerInfo;
		}

		return codec.decode<ForgerInfo>(forgerInfoSchema, forgerInfo);
	}

	private async _setForgerInfo(forgerAddress: string, forgerInfo: ForgerInfo): Promise<void> {
		const encodedForgerInfo = codec.encode(forgerInfoSchema, forgerInfo);
		await this._forgerPluginDB.put(`${DB_KEY_FORGER_INFO}:${forgerAddress}`, encodedForgerInfo);
	}

	private async _getFee(payload: ReadonlyArray<TransactionJSON>, block: string): Promise<bigint> {
		const { payload: payloadBuffer } = this.codec.decodeRawBlock(block);
		const transactionFees = await this._channel.invoke<TransactionFees>('app:getTransactionsFees');
		let fee = BigInt(0);

		for (let index = 0; index < payload.length; index += 1) {
			const trx = payload[index];
			fee +=
				BigInt(transactionFees[trx.type].baseFee) +
				BigInt(transactionFees[trx.type].minFeePerByte) * BigInt(payloadBuffer[index].length);
		}

		return fee;
	}
}
