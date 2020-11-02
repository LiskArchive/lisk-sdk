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
import { codec } from '@liskhq/lisk-codec';
import { BlockHeader, RawBlock, Transaction } from '@liskhq/lisk-chain';
import {
	getAddressAndPublicKeyFromPassphrase,
	getAddressFromPassphrase,
	signData,
} from '@liskhq/lisk-cryptography';
import {
	ActionsDefinition,
	BasePlugin,
	BaseChannel,
	EventsArray,
	EventInfoObject,
	PluginInfo,
} from 'lisk-framework';
import { objects } from '@liskhq/lisk-utils';
import * as express from 'express';
import type { Express } from 'express';
import * as cors from 'cors';
import * as rateLimit from 'express-rate-limit';
import * as Debug from 'debug';
import {
	getDBInstance,
	saveBlockHeaders,
	getContradictingBlockHeader,
	decodeBlockHeader,
	clearBlockHeaders,
} from './db';
import * as config from './defaults';
import * as middlewares from './middlewares';
import { Options, State } from './types';
import * as controllers from './controllers';

// eslint-disable-next-line
const packageJSON = require('../package.json');
// eslint-disable-next-line new-cap
const debug = Debug('plugin:report-misbehavior');

export class ReportMisbehaviorPlugin extends BasePlugin {
	private _pluginDB!: KVStore;
	private _server!: Server;
	private _app!: Express;
	private _options!: Options;
	private readonly _state: State = { currentHeight: 0 };
	private _channel!: BaseChannel;
	private _clearBlockHeadersInterval!: number;
	private _clearBlockHeadersIntervalId!: NodeJS.Timer | undefined;

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
	public async load(channel: BaseChannel): Promise<void> {
		this._app = express();
		this._channel = channel;
		this._options = objects.mergeDeep({}, config.defaultConfig.default, this.options) as Options;
		this._clearBlockHeadersInterval = this._options.clearBlockHeadersInterval || 60000;
		this._pluginDB = await getDBInstance(this._options.dataPath);

		// Start http server
		this._registerMiddlewares(this._options);
		this._registerControllers();
		this._registerAfterMiddlewares(this._options);
		// Listen to new block and delete block events
		this._subscribeToChannel();
		this._server = this._app.listen(this._options.port, '0.0.0.0');
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this._clearBlockHeadersIntervalId = setInterval(() => {
			clearBlockHeaders(this._pluginDB, this.schemas, this._state.currentHeight).catch(error =>
				debug(error),
			);
		}, this._clearBlockHeadersInterval);
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
					clearInterval(this._clearBlockHeadersIntervalId as NodeJS.Timer);
					resolve();
				});
			});
		}

		await this._pluginDB.close();
	}

	// eslint-disable-next-line
	private _registerControllers(): void {
		this._app.patch('/api/auth', controllers.auth(this._options, this._state));
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

	private _subscribeToChannel(): void {
		this._channel.subscribe('app:network:event', async (info: EventInfoObject) => {
			const {
				data: { event, data },
			} = info as {
				data: { event: string; data: { block: string } };
			};

			if (event === 'postBlock') {
				const { header } = codec.decode<RawBlock>(
					this.schemas.block,
					Buffer.from(data.block, 'hex'),
				);
				try {
					const saved = await saveBlockHeaders(this._pluginDB, this.schemas, header);
					if (!saved) {
						return;
					}
					const decodedBlockHeader = decodeBlockHeader(header, this.schemas);

					// Set new currentHeight
					if (decodedBlockHeader.height > this._state.currentHeight) {
						this._state.currentHeight = decodedBlockHeader.height;
					}

					const contradictingBlock = await getContradictingBlockHeader(
						this._pluginDB,
						decodedBlockHeader,
						this.schemas,
					);
					if (contradictingBlock) {
						const encodedTransaction = await this._createPoMTransaction(
							decodedBlockHeader,
							contradictingBlock,
						);
						const result = await this._channel.invoke<{
							transactionId?: string;
						}>('app:postTransaction', {
							transaction: encodedTransaction,
						});

						debug('Sent Report misbehavior transaction', result.transactionId);
					}
				} catch (error) {
					debug(error);
				}
			}
		});
	}

	private async _createPoMTransaction(
		contradictingBlock: BlockHeader,
		decodedBlockHeader: BlockHeader,
	): Promise<string> {
		// ModuleID:5 (DPoS), AssetID:3 (PoMAsset)
		const pomAssetInfo = this.schemas.transactionsAssets.find(
			({ moduleID, assetID }) => moduleID === 5 && assetID === 3,
		);

		if (!pomAssetInfo) {
			throw new Error('PoM asset schema is not registered in the application.');
		}

		if (!this._state.passphrase) {
			throw new Error('Encrypted passphrase is not set in the config.');
		}

		const encodedAccount = await this._channel.invoke<string>('app:getAccount', {
			address: getAddressFromPassphrase(this._state.passphrase).toString('hex'),
		});

		const {
			sequence: { nonce },
		} = codec.decode<{ sequence: { nonce: bigint } }>(
			this.schemas.account,
			Buffer.from(encodedAccount, 'hex'),
		);

		const pomTransactionAsset = {
			header1: decodedBlockHeader,
			header2: contradictingBlock,
		};

		const { networkIdentifier } = await this._channel.invoke<{ networkIdentifier: string }>(
			'app:getNodeInfo',
		);

		const encodedAsset = codec.encode(
			pomAssetInfo.schema,
			codec.fromJSON(pomAssetInfo.schema, pomTransactionAsset),
		);

		const tx = new Transaction({
			moduleID: pomAssetInfo.moduleID,
			assetID: pomAssetInfo.assetID,
			nonce,
			senderPublicKey:
				this._state.publicKey ??
				getAddressAndPublicKeyFromPassphrase(this._state.passphrase).publicKey,
			fee: BigInt(this._options.fee), // TODO: The static fee should be replaced by fee estimation calculation
			asset: encodedAsset,
			signatures: [],
		});

		(tx.signatures as Buffer[]).push(
			signData(
				Buffer.concat([Buffer.from(networkIdentifier, 'hex'), tx.getSigningBytes()]),
				this._state.passphrase,
			),
		);

		return tx.getBytes().toString('hex');
	}
}
