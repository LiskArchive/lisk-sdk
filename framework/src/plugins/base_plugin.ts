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
import { createLogger, Logger } from '../logger';
import { systemDirs } from '../system_dirs';
import {
	ApplicationConfig,
	PluginOptionsWithApplicationConfig,
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

// type ExtractPluginOptions<P> = P extends BasePlugin<infer T> ? T : PluginOptionsWithApplicationConfig;

export interface InstantiablePlugin<T extends BasePlugin = BasePlugin> {
	new (): T;
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

interface PluginInitContext {
	config: Record<string, unknown>; //plugin config
	channel: BaseChannel;
	options: {
	  readonly dataPath: string;
	  appConfig: Omit<ApplicationConfig, 'plugins'>;
	},
  }

export abstract class BasePlugin<
	T extends PluginOptionsWithApplicationConfig = PluginOptionsWithApplicationConfig
> {
	public options!: T;
	public schemas!: RegisteredSchema;

	public codec!: PluginCodec;
	protected _logger!: Logger;

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(context: PluginInitContext): Promise<void> {

			if (this.configSchema) {
				this.options = objects.mergeDeep(
					{},
					(this.configSchema as SchemaWithDefault).default ?? {},
					context.options,
					context.config,
				) as T;
	
				const errors = validator.validate(this.configSchema, this.options);
				
				if (errors.length) {
					throw new LiskValidationError([...errors]);
				}
			} else {
				this.options = objects.mergeDeep({}, context.options, context.config) as T;
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

		const dirs = systemDirs(this.options.appConfig.label, this.options.appConfig.rootPath);
		this._logger = createLogger({
			consoleLogLevel: this.options.appConfig.logger.consoleLogLevel,
			fileLogLevel: this.options.appConfig.logger.fileLogLevel,
			logFilePath: join(
				dirs.logs,
				`plugin-${((this.constructor as unknown) as typeof BasePlugin).name}.log`,
			),
			module: `plugin:${((this.constructor as unknown) as typeof BasePlugin).name}`,
		});

		context.channel.once(APP_EVENT_READY, async () => {
			this.schemas = await context.channel.invoke('app:getSchema');
		});
	}

	// TODO: To make non-breaking change we have to keep "object" here
	public get configSchema(): SchemaWithDefault | object | undefined {
		return undefined;
	}
	public abstract get nodeModulePath(): string;
	public abstract get events(): EventsDefinition;
	public abstract get actions(): ActionsDefinition;
	public abstract get name(): string;

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

	const pluginInstance = new pluginKlass();

	try {
		// Check if plugin name is an npm package
		// eslint-disable-next-line global-require, import/no-dynamic-require, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
		nodeModule = require(pluginInstance.name);
		nodeModulePath = pluginInstance.name;
	} catch (error) {
		/* Plugin pluginKlass.name is not an npm package */
	}

	if (!nodeModule && pluginInstance.nodeModulePath) {
		try {
			// Check if plugin nodeModulePath is an npm package
			// eslint-disable-next-line global-require, import/no-dynamic-require, @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
			nodeModule = require(pluginInstance.nodeModulePath);
			nodeModulePath = pluginInstance.nodeModulePath;
		} catch (error) {
			/* Plugin nodeModulePath is not an npm package */
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
	PluginObject: BasePlugin,
): void => {

	assert(PluginObject.name, 'Plugin name is required.');
	assert(PluginObject.events, 'Plugin events are required.');
	assert(PluginObject.actions, 'Plugin actions are required.');
	// eslint-disable-next-line @typescript-eslint/unbound-method
	assert(PluginObject.load, 'Plugin load action is required.');
	// eslint-disable-next-line @typescript-eslint/unbound-method
	assert(PluginObject.unload, 'Plugin unload actions is required.');

	if (PluginObject.configSchema) {
		const errors = validator.validateSchema(PluginObject.configSchema);
		if (errors.length) {
			throw new LiskValidationError([...errors]);
		}
	}
};
