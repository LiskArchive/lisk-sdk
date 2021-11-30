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
 *
 */
import { codec } from '@liskhq/lisk-codec';
import { Block as BlockType, Channel, RegisteredSchemas } from './types';
import { decodeBlock, encodeBlock, getTransactionParamsSchema } from './codec';

export class Block {
	private readonly _channel: Channel;
	private readonly _schemas: RegisteredSchemas;

	public constructor(channel: Channel, registeredSchema: RegisteredSchemas) {
		this._channel = channel;
		this._schemas = registeredSchema;
	}

	public async get(id: Buffer | string): Promise<Record<string, unknown>> {
		const idString: string = Buffer.isBuffer(id) ? id.toString('hex') : id;
		const blockHex = await this._channel.invoke<string>('app_getBlockByID', {
			id: idString,
		});
		const blockBytes = Buffer.from(blockHex, 'hex');
		return decodeBlock(blockBytes, this._schemas);
	}

	public async getByHeight(height: number): Promise<Record<string, unknown>> {
		const blockHex = await this._channel.invoke<string>('app_getBlockByHeight', { height });
		const blockBytes = Buffer.from(blockHex, 'hex');
		return decodeBlock(blockBytes, this._schemas);
	}

	public encode(input: {
		header: Record<string, unknown>;
		transactions: Record<string, unknown>[];
		assets: string[];
	}): Buffer {
		return encodeBlock(input, this._schemas);
	}

	public decode<T = Record<string, unknown>>(input: Buffer | string): T {
		const inputBuffer: Buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'hex');
		return decodeBlock(inputBuffer, this._schemas) as T;
	}

	public toJSON(
		block: BlockType,
	): {
		header: Record<string, unknown>;
		transactions: Record<string, unknown>[];
		assets: string[];
	} {
		const { ...headerRoot } = block.header;

		// We need to do this as our schemas do not include the ID. Keep this.
		const tmpBlockId = headerRoot.id;
		delete headerRoot.id;

		// decode header
		const header = {
			...codec.toJSON(this._schemas.blockHeader, headerRoot),
			id: tmpBlockId?.toString('hex'),
		};

		const assets = block.assets.map(asset => asset.toString('hex'));

		const transactions: Record<string, unknown>[] = [];

		// decode transactions
		for (const tx of block.transactions) {
			const { params: txParams, ...txRoot } = tx;
			// We need to do this as our schemas do not include the ID. Keep this.
			const tmpId = txRoot.id;
			delete txRoot.id;

			const schemaParams = getTransactionParamsSchema(tx, this._schemas);
			const jsonTxParams = codec.toJSON(schemaParams, txParams as object);
			const jsonTxRoot = codec.toJSON(this._schemas.transaction, txRoot);

			const jsonTx = {
				...jsonTxRoot,
				id: tmpId?.toString('hex'),
				params: jsonTxParams,
			};

			transactions.push(jsonTx);
		}

		return { header, transactions, assets };
	}

	public fromJSON(
		block: BlockType<string>,
	): {
		header: Record<string, unknown>;
		assets: Buffer[];
		transactions: Record<string, unknown>[];
	} {
		const { ...headerRoot } = block.header;

		// We need to do this as our schemas do not include the ID. Keep this.
		const tmpBlockId = headerRoot.id ? Buffer.from(headerRoot.id, 'hex') : Buffer.alloc(0);
		delete headerRoot.id;

		// decode header
		const header = {
			...codec.fromJSON(this._schemas.blockHeader, headerRoot),
			id: tmpBlockId,
		};

		// decode header's asset
		const assets = block.assets.map(asset => Buffer.from(asset, 'hex'));

		const transactions: Record<string, unknown>[] = [];
		// decode transactions
		for (const tx of block.transactions) {
			const { params: txParams, ...txRoot } = tx;
			// We need to do this as our schemas do not include the ID. Keep this.
			const tmpId = txRoot.id ? Buffer.from(txRoot.id, 'hex') : Buffer.alloc(0);
			delete txRoot.id;

			const schemaParams = getTransactionParamsSchema(tx, this._schemas);
			const txParamsObject = codec.fromJSON(schemaParams, txParams as object);
			const txRootObject = codec.fromJSON(this._schemas.transaction, txRoot);

			const txObject = {
				...txRootObject,
				id: tmpId,
				params: txParamsObject,
			};

			transactions.push(txObject);
		}

		return { header, transactions, assets };
	}
}
