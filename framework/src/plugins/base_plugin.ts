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

import { hash } from '@liskhq/lisk-cryptography';
import { codec, Schema } from '@liskhq/lisk-codec';
import { RawBlock } from '@liskhq/lisk-chain';
import { ImplementationMissingError } from '../errors';
import { EventsArray } from '../controller/event';
import { ActionsDefinition } from '../controller/action';
import { BaseChannel } from '../controller/channels';
import {
	AccountJSON,
	BaseTransactionJSON,
	BlockJSON,
	CodecSchema,
	TransactionJSON,
	BaseBlockHeaderJSON,
	BlockAssetJSON,
} from '../types';

export interface PluginInfo {
	readonly author: string;
	readonly version: string;
	readonly name: string;
}

export interface InstantiablePlugin<T, U = object> {
	alias: string;
	info: PluginInfo;
	defaults: object;
	load: () => Promise<void>;
	unload: () => Promise<void>;
	new (...args: U[]): T;
}

const decodeTransactionToJSON = (
	transactionBuffer: Buffer,
	baseSchema: Schema,
	assetsSchemas: { [key: number]: Schema },
): TransactionJSON => {
	const baseTransaction = codec.decodeJSON<BaseTransactionJSON>(baseSchema, transactionBuffer);

	const transactionTypeAssetSchema = assetsSchemas[baseTransaction.type];

	if (!transactionTypeAssetSchema) {
		throw new Error('Transaction type not found.');
	}

	const transactionAsset = codec.decodeJSON<object>(
		transactionTypeAssetSchema,
		Buffer.from(baseTransaction.asset, 'base64'),
	);

	return {
		...baseTransaction,
		id: hash(transactionBuffer).toString('base64'),
		asset: transactionAsset,
	};
};

const decodeAccountToJSON = (encodedAccount: Buffer, accountSchema: Schema): AccountJSON => {
	const decodedAccount = codec.decodeJSON<AccountJSON>(accountSchema, encodedAccount);

	return {
		...decodedAccount,
	};
};

const decodeRawBlock = (blockSchema: Schema, encodedBlock: Buffer): RawBlock =>
	codec.decode<RawBlock>(blockSchema, encodedBlock);

const decodeBlockToJSON = (codecSchema: CodecSchema, encodedBlock: Buffer): BlockJSON => {
	const {
		blockSchema,
		blockHeaderSchema,
		blockHeadersAssets,
		baseTransaction,
		transactionsAssets,
	} = codecSchema;
	const { header, payload } = decodeRawBlock(blockSchema, encodedBlock);

	const baseHeaderJSON = codec.decodeJSON<BaseBlockHeaderJSON>(blockHeaderSchema, header);
	const blockAssetJSON = codec.decodeJSON<BlockAssetJSON>(
		blockHeadersAssets[baseHeaderJSON.version],
		Buffer.from(baseHeaderJSON.asset, 'base64'),
	);
	const payloadJSON = payload.map(transactionBuffer =>
		decodeTransactionToJSON(transactionBuffer, baseTransaction, transactionsAssets),
	);

	return {
		header: { ...baseHeaderJSON, asset: { ...blockAssetJSON } },
		payload: payloadJSON,
	};
};

export interface PluginCodec {
	decodeAccount: (data: Buffer | string) => AccountJSON;
	decodeBlock: (data: Buffer | string) => BlockJSON;
	decodeRawBlock: (data: Buffer | string) => RawBlock;
	decodeTransaction: (data: Buffer | string) => TransactionJSON;
}

export abstract class BasePlugin {
	public readonly options: object;
	public schemas!: CodecSchema;

	public codec: PluginCodec;

	protected constructor(options: object) {
		this.options = options;

		this.codec = {
			decodeAccount: (data: Buffer | string): AccountJSON => {
				const accountBuffer: Buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'base64');

				return decodeAccountToJSON(accountBuffer, this.schemas.account);
			},
			decodeBlock: (data: Buffer | string): BlockJSON => {
				const blockBuffer: Buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'base64');

				return decodeBlockToJSON(this.schemas, blockBuffer);
			},
			decodeRawBlock: (data: Buffer | string): RawBlock => {
				const blockBuffer: Buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'base64');

				return decodeRawBlock(this.schemas.blockSchema, blockBuffer);
			},
			decodeTransaction: (data: Buffer | string): TransactionJSON => {
				const transactionBuffer: Buffer = Buffer.isBuffer(data)
					? data
					: Buffer.from(data, 'base64');

				return decodeTransactionToJSON(
					transactionBuffer,
					this.schemas.baseTransaction,
					this.schemas.transactionsAssets,
				);
			},
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(channel: BaseChannel): Promise<void> {
		channel.once('app:ready', async () => {
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

	// eslint-disable-next-line class-methods-use-this
	public get defaults(): object {
		return {};
	}
	public abstract get events(): EventsArray;
	public abstract get actions(): ActionsDefinition;

	public abstract async load(channel: BaseChannel): Promise<void>;
	public abstract async unload(): Promise<void>;
}
