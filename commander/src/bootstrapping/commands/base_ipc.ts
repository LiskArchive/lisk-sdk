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
 *
 */

import { Command, flags as flagParser } from '@oclif/command';
import {
	Application,
	RegisteredSchema,
	apiClient,
	codec,
	PartialApplicationConfig,
	Transaction,
	cryptography,
} from 'lisk-sdk';
import { getDefaultPath, getGenesisBlockAndConfig } from '../../utils/path';
import { flags as commonFlags } from '../../utils/flags';
import { DEFAULT_NETWORK } from '../../constants';
import { PromiseResolvedType, Schema } from '../../types';
import { isApplicationRunning } from '../../utils/application';

interface BaseIPCFlags {
	readonly 'data-path'?: string;
	readonly network: string;
	readonly offline?: boolean;
	readonly pretty?: boolean;
}

export interface Codec {
	decodeAccount: (data: Buffer | string) => Record<string, unknown>;
	decodeBlock: (data: Buffer | string) => Record<string, unknown>;
	decodeTransaction: (data: Buffer | string) => Record<string, unknown>;
	encodeTransaction: (assetSchema: Schema, transactionObject: Record<string, unknown>) => string;
	transactionFromJSON: (
		assetSchema: Schema,
		transactionObject: Record<string, unknown>,
	) => Record<string, unknown>;
	transactionToJSON: (
		assetSchema: Schema,
		transactionObject: Record<string, unknown>,
	) => Record<string, unknown>;
}

const prettyDescription = 'Prints JSON in pretty format rather than condensed.';

export default abstract class BaseIPCCommand extends Command {
	static flags = {
		pretty: flagParser.boolean({
			description: prettyDescription,
		}),
		'data-path': flagParser.string({
			...commonFlags.dataPath,
			env: 'LISK_DATA_PATH',
		}),
		offline: flagParser.boolean({
			...commonFlags.offline,
			default: false,
			hidden: true,
		}),
		network: flagParser.string({
			...commonFlags.network,
			env: 'LISK_NETWORK',
			default: DEFAULT_NETWORK,
			hidden: true,
		}),
	};

	public baseIPCFlags!: BaseIPCFlags;
	protected _client: PromiseResolvedType<ReturnType<typeof apiClient.createIPCClient>> | undefined;
	protected _schema!: RegisteredSchema;

	// eslint-disable-next-line @typescript-eslint/require-await
	async finally(error?: Error | string): Promise<void> {
		if (error) {
			// TODO: replace this logic with isApplicationRunning util and log the error accordingly
			if (/^IPC Socket client connection timeout./.test((error as Error).message)) {
				this.error(
					'Please ensure the app is up and running with ipc enabled before using the command!',
				);
			}
			this.error(error instanceof Error ? error.message : error);
		}
		if (this._client) {
			await this._client.disconnect();
		}
	}

	async init(): Promise<void> {
		const { flags } = this.parse(this.constructor as typeof BaseIPCCommand);
		this.baseIPCFlags = flags;
		const dataPath = this.baseIPCFlags['data-path']
			? this.baseIPCFlags['data-path']
			: getDefaultPath();

		if (this.baseIPCFlags.offline) {
			// Read network genesis block and config from the folder
			const { genesisBlock, config } = await getGenesisBlockAndConfig(this.baseIPCFlags.network);
			const app = this.getApplication(genesisBlock, config);
			this._schema = app.getSchema();
			return;
		}

		if (!isApplicationRunning(dataPath)) {
			throw new Error(`Application at data path ${dataPath} is not running.`);
		}
		this._client = await apiClient.createIPCClient(dataPath);
		this._schema = this._client.schemas;
	}

	printJSON(message?: unknown): void {
		if (this.baseIPCFlags.pretty) {
			this.log(JSON.stringify(message, undefined, '  '));
		} else {
			this.log(JSON.stringify(message));
		}
	}

	protected getAssetSchema(
		moduleID: number,
		assetID: number,
	): RegisteredSchema['transactionsAssets'][0] {
		const assetSchema = this._schema.transactionsAssets.find(
			schema => schema.moduleID === moduleID && schema.assetID === assetID,
		);
		if (!assetSchema) {
			throw new Error(
				`Transaction moduleID:${moduleID} with assetID:${assetID} is not registered in the application.`,
			);
		}
		return assetSchema;
	}

	protected decodeTransaction(transactionHexStr: string): Record<string, unknown> {
		const transactionBytes = Buffer.from(transactionHexStr, 'hex');
		if (this._client) {
			return this._client.transaction.decode(transactionBytes);
		}
		const id = cryptography.hash(transactionBytes);
		const transaction = codec.decode<Transaction>(this._schema.transaction, transactionBytes);
		const assetSchema = this.getAssetSchema(transaction.moduleID, transaction.assetID);
		const asset = codec.decode<Record<string, unknown>>(assetSchema.schema, transaction.asset);
		return {
			...transaction,
			asset,
			id,
		};
	}

	protected encodeTransaction(transaction: Record<string, unknown>): Buffer {
		if (this._client) {
			return this._client.transaction.encode(transaction);
		}
		const assetSchema = this.getAssetSchema(
			transaction.moduleID as number,
			transaction.assetID as number,
		);
		const assetBytes = codec.encode(assetSchema.schema, transaction.asset as object);
		const txBytes = codec.encode(this._schema.transaction, { ...transaction, asset: assetBytes });
		return txBytes;
	}

	protected transactionToJSON(transaction: Record<string, unknown>): Record<string, unknown> {
		if (this._client) {
			return this._client.transaction.toJSON(transaction);
		}
		const assetSchema = this.getAssetSchema(
			transaction.moduleID as number,
			transaction.assetID as number,
		);
		const assetJSON = codec.toJSON(assetSchema.schema, transaction.asset as object);
		const { id, asset, ...txWithoutAsset } = transaction;
		const txJSON = codec.toJSON(this._schema.transaction, txWithoutAsset);
		return {
			...txJSON,
			asset: assetJSON,
			id: Buffer.isBuffer(id) ? id.toString('hex') : undefined,
		};
	}

	abstract getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application;
}
