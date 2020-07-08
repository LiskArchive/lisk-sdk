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
import { ImplementationMissingError } from '../errors';
import { EventsArray } from '../controller/event';
import { ActionsDefinition } from '../controller/action';
import { BaseChannel } from '../controller/channels';

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

interface BaseTransactionJSON {
	readonly type: number;
	readonly nonce: string;
	readonly fee: string;
	readonly senderPublicKey: string;
	readonly signatures: Array<Readonly<string>>;

	readonly asset: string;
}

interface TransactionJSON {
	readonly type: number;
	readonly nonce: string;
	readonly fee: string;
	readonly senderPublicKey: string;
	readonly signatures: Array<Readonly<string>>;

	readonly id: string;
	readonly asset: object;
}

interface AccountJSON {
	address: string;
	balance: string;
	nonce: string;
	keys: {
		numberOfSignatures: number;
		mandatoryKeys: string[];
		optionalKeys: string[];
	};
	asset: {
		delegate: {
			username: string;
			pomHeights: number[];
			consecutiveMissedBlocks: number;
			lastForgedHeight: number;
			isBanned: boolean;
			totalVotesReceived: string;
		};
		sentVotes: { delegateAddress: string; amount: string }[];
		unlocking: {
			delegateAddress: string;
			amount: string;
			unvoteHeight: number;
		}[];
	};
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
	const decodedAcccount = codec.decodeJSON<AccountJSON>(accountSchema, encodedAccount);

	return {
		...decodedAcccount,
	};
};

export interface PluginCodec {
	decodeTransaction: (data: Buffer | string) => TransactionJSON;
	decodeAccount: (data: Buffer | string) => AccountJSON;
}

export abstract class BasePlugin {
	public readonly options: object;
	public schemas!: {
		account: Schema;
		blockHeader: Schema;
		blockHeadersAssets: {
			[key: number]: Schema;
		};
		baseTransaction: Schema;
		transactionsAssets: {
			[key: number]: Schema;
		};
	};

	public codec: PluginCodec;

	protected constructor(options: object) {
		this.options = options;

		this.codec = {
			decodeTransaction: (data: Buffer | string) => {
				const transactionBuffer: Buffer = Buffer.isBuffer(data)
					? data
					: Buffer.from(data, 'base64');

				return decodeTransactionToJSON(
					transactionBuffer,
					this.schemas.baseTransaction,
					this.schemas.transactionsAssets,
				);
			},
			decodeAccount: (data: Buffer | string) => {
				const accountBuffer: Buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'base64');

				return decodeAccountToJSON(accountBuffer, this.schemas.account);
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
