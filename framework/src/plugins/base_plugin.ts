/*
 * Copyright © 2019 Lisk Foundation
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

import { RawBlock } from '@liskhq/lisk-chain';
import { codec, Schema } from '@liskhq/lisk-codec';
import { hash } from '@liskhq/lisk-cryptography';
import * as assert from 'assert';
import { join } from 'path';
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { objects } from '@liskhq/lisk-utils';
import { APP_EVENT_READY } from '../constants';
import { ActionsDefinition } from '../controller/action';
import { BaseChannel } from '../controller/channels';
import { EventsDefinition } from '../controller/event';
import { ImplementationMissingError } from '../errors';
import { createLogger, Logger } from '../logger';
import { systemDirs } from '../system_dirs';
import {
	PluginOptionsWithAppConfig,
	RegisteredSchema,
	SchemaWithDefault,
	TransactionJSON,
} from '../types';

interface DefaultAccountJSON {
	[name: string]: { [key: string]: unknown } | undefined;
}

type AccountJSON<T = DefaultAccountJSON> = T & { address: string };

interface BaseTransactionJSON {
	readonly moduleID: number;
	readonly assetID: number;
	readonly nonce: string;
	readonly fee: string;
	readonly senderPublicKey: string;
	readonly signatures: Array<Readonly<string>>;
	readonly asset: string;
}

interface BlockJSON {
	readonly header: BlockHeaderJSON;
	readonly payload: ReadonlyArray<TransactionJSON>;
}

interface BaseBlockHeaderJSON {
	readonly id: string;
	readonly version: number;
	readonly timestamp: number;
	readonly height: number;
	readonly previousBlockID: string;
	readonly transactionRoot: string;
	readonly generatorPublicKey: string;
	readonly reward: string;
	readonly signature: string;
	readonly asset: string;
}

export type BlockHeaderJSON = Omit<BaseBlockHeaderJSON, 'asset'> & { asset: BlockAssetJSON };

interface BlockAssetJSON {
	readonly seedReveal: string;
	readonly maxHeightPreviouslyForged: number;
	readonly maxHeightPrevoted: number;
}

export interface PluginInfo {
	readonly author: string;
	readonly version: string;
	readonly name: string;
	readonly exportPath?: string;
}

type ExtractPluginOptions<P> = P extends BasePlugin<infer T> ? T : PluginOptionsWithAppConfig;

export interface InstantiablePlugin<T extends BasePlugin = BasePlugin> {
	alias: string;
	info: PluginInfo;
	new (args: ExtractPluginOptions<T>): T;
}

const decodeTransactionToJSON = (
	transactionBuffer: Buffer,
	baseSchema: Schema,
	assetsSchemas: RegisteredSchema['transactionsAssets'],
): TransactionJSON => {
	const baseTransaction = codec.decodeJSON<BaseTransactionJSON>(baseSchema, transactionBuffer);

	const transactionTypeAsset = assetsSchemas.find(
		s => s.assetID === baseTransaction.assetID && s.moduleID === baseTransaction.moduleID,
	);

	if (!transactionTypeAsset) {
		throw new Error('Transaction type not found.');
	}

	const transactionAsset = codec.decodeJSON<object>(
		transactionTypeAsset.schema,
		Buffer.from(baseTransaction.asset, 'hex'),
	);

	return {
		...baseTransaction,
		id: hash(transactionBuffer).toString('hex'),
		asset: transactionAsset,
	};
};

const encodeTransactionFromJSON = (
	transaction: TransactionJSON,
	baseSchema: Schema,
	assetsSchemas: RegisteredSchema['transactionsAssets'],
): string => {
	const transactionTypeAsset = assetsSchemas.find(
		s => s.assetID === transaction.assetID && s.moduleID === transaction.moduleID,
	);

	if (!transactionTypeAsset) {
		throw new Error('Transaction type not found.');
	}

	const transactionAssetBuffer = codec.encode(
		transactionTypeAsset.schema,
		codec.fromJSON(transactionTypeAsset.schema, transaction.asset),
	);

	const transactionBuffer = codec.encode(
		baseSchema,
		codec.fromJSON(baseSchema, {
			...transaction,
			asset: transactionAssetBuffer,
		}),
	);

	return transactionBuffer.toString('hex');
};

const decodeAccountToJSON = <T = DefaultAccountJSON>(
	encodedAccount: Buffer,
	accountSchema: Schema,
): AccountJSON<T> => {
	const decodedAccount = codec.decodeJSON<AccountJSON<T>>(accountSchema, encodedAccount);

	return {
		...decodedAccount,
	};
};

const decodeRawBlock = (blockSchema: Schema, encodedBlock: Buffer): RawBlock =>
	codec.decode<RawBlock>(blockSchema, encodedBlock);

const decodeBlockToJSON = (registeredSchema: RegisteredSchema, encodedBlock: Buffer): BlockJSON => {
	const { header, payload } = codec.decode<RawBlock>(registeredSchema.block, encodedBlock);

	const baseHeaderJSON = codec.decodeJSON<BaseBlockHeaderJSON>(
		registeredSchema.blockHeader,
		header,
	);
	const blockAssetJSON = codec.decodeJSON<BlockAssetJSON>(
		registeredSchema.blockHeadersAssets[baseHeaderJSON.version],
		Buffer.from(baseHeaderJSON.asset, 'hex'),
	);
	const payloadJSON = payload.map(transactionBuffer =>
		decodeTransactionToJSON(
			transactionBuffer,
			registeredSchema.transaction,
			registeredSchema.transactionsAssets,
		),
	);

	const blockId = hash(header);

	return {
		header: { ...baseHeaderJSON, asset: { ...blockAssetJSON }, id: blockId.toString('hex') },
		payload: payloadJSON,
	};
};

export interface PluginCodec {
	decodeAccount: <T = DefaultAccountJSON>(data: Buffer | string) => AccountJSON<T>;
	decodeBlock: (data: Buffer | string) => BlockJSON;
	decodeRawBlock: (data: Buffer | string) => RawBlock;
	decodeTransaction: (data: Buffer | string) => TransactionJSON;
	encodeTransaction: (transaction: TransactionJSON) => string;
}

export abstract class BasePlugin<
	T extends PluginOptionsWithAppConfig = PluginOptionsWithAppConfig
> {
	public readonly options: T;
	public schemas!: RegisteredSchema;

	public codec: PluginCodec;
	protected _logger!: Logger;

	public constructor(options: T) {
		if (this.defaults) {
			this.options = objects.mergeDeep(
				{},
				(this.defaults as SchemaWithDefault).default ?? {},
				options,
			) as T;

			const errors = validator.validate(this.defaults, this.options);
			if (errors.length) {
				throw new LiskValidationError([...errors]);
			}
		} else {
			this.options = objects.cloneDeep(options);
		}

		this.codec = {
			decodeAccount: <K = DefaultAccountJSON>(data: Buffer | string): AccountJSON<K> => {
				const accountBuffer: Buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'hex');

				return decodeAccountToJSON(accountBuffer, this.schemas.account);
			},
			decodeBlock: (data: Buffer | string): BlockJSON => {
				const blockBuffer: Buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'hex');

				return decodeBlockToJSON(this.schemas, blockBuffer);
			},
			decodeRawBlock: (data: Buffer | string): RawBlock => {
				const blockBuffer: Buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'hex');

				return decodeRawBlock(this.schemas.block, blockBuffer);
			},
			decodeTransaction: (data: Buffer | string): TransactionJSON => {
				const transactionBuffer: Buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'hex');

				return decodeTransactionToJSON(
					transactionBuffer,
					this.schemas.transaction,
					this.schemas.transactionsAssets,
				);
			},
			encodeTransaction: (transaction: TransactionJSON): string =>
				encodeTransactionFromJSON(
					transaction,
					this.schemas.transaction,
					this.schemas.transactionsAssets,
				),
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(channel: BaseChannel): Promise<void> {
		const dirs = systemDirs(this.options.appConfig.label, this.options.appConfig.rootPath);
		this._logger = createLogger({
			consoleLogLevel: this.options.appConfig.logger.consoleLogLevel,
			fileLogLevel: this.options.appConfig.logger.fileLogLevel,
			logFilePath: join(
				dirs.logs,
				`plugin-${((this.constructor as unknown) as typeof BasePlugin).alias}.log`,
			),
			module: `plugin:${((this.constructor as unknown) as typeof BasePlugin).alias}`,
		});

		channel.once(APP_EVENT_READY, async () => {
			this.schemas = await channel.invoke('app:getSchema');
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public static get alias(): string {
		throw new ImplementationMissingError();
	}
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public static get info(): PluginInfo {
		throw new ImplementationMissingError();
	}

	// TODO: To make non-breaking change we have to keep "object" here
	public get defaults(): SchemaWithDefault | object | undefined {
		return undefined;
	}
	public abstract get events(): EventsDefinition;
	public abstract get actions(): ActionsDefinition;

	public abstract load(channel: BaseChannel): Promise<void>;
	public abstract unload(): Promise<void>;
}

// TODO: Once the issue fixed we can use require.resolve to rewrite the logic
//  https://github.com/facebook/jest/issues/9543
export const getPluginExportPath = (
	pluginKlass: InstantiablePlugin,
	strict = true,
): string | undefined => {
	let nodeModule: Record<string, unknown> | undefined;
	let nodeModulePath: string | undefined;

	try {
		// Check if plugin name is an npm package
		// eslint-disable-next-line global-require, import/no-dynamic-require, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
		nodeModule = require(pluginKlass.info.name);
		nodeModulePath = pluginKlass.info.name;
	} catch (error) {
		/* Plugin info.name is not an npm package */
	}

	if (!nodeModule && pluginKlass.info.exportPath) {
		try {
			// Check if plugin name is an npm package
			// eslint-disable-next-line global-require, import/no-dynamic-require, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
			nodeModule = require(pluginKlass.info.exportPath);
			nodeModulePath = pluginKlass.info.exportPath;
		} catch (error) {
			/* Plugin info.exportPath is not an npm package */
		}
	}

	if (!nodeModule || !nodeModule[pluginKlass.name]) {
		return;
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	if (strict && nodeModule[pluginKlass.name] !== pluginKlass) {
		return;
	}

	// eslint-disable-next-line consistent-return
	return nodeModulePath;
};

export const validatePluginSpec = (
	PluginKlass: InstantiablePlugin,
	options: Record<string, unknown> = {},
): void => {
	const pluginObject = new PluginKlass(options as PluginOptionsWithAppConfig);

	assert(PluginKlass.alias, 'Plugin alias is required.');
	assert(PluginKlass.info.name, 'Plugin name is required.');
	assert(PluginKlass.info.author, 'Plugin author is required.');
	assert(PluginKlass.info.version, 'Plugin version is required.');
	assert(pluginObject.events, 'Plugin events are required.');
	assert(pluginObject.actions, 'Plugin actions are required.');
	// eslint-disable-next-line @typescript-eslint/unbound-method
	assert(pluginObject.load, 'Plugin load action is required.');
	// eslint-disable-next-line @typescript-eslint/unbound-method
	assert(pluginObject.unload, 'Plugin unload actions is required.');

	if (pluginObject.defaults) {
		const errors = validator.validateSchema(pluginObject.defaults);
		if (errors.length) {
			throw new LiskValidationError([...errors]);
		}
	}
};
