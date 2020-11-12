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
import { decodeBlock, encodeBlock, getTransactionAssetSchema } from './codec';

export class Block {
	private readonly _channel: Channel;
	private readonly _schemas: RegisteredSchemas;

	public constructor(channel: Channel, registeredSchema: RegisteredSchemas) {
		this._channel = channel;
		this._schemas = registeredSchema;
	}

	public async get(id: Buffer): Promise<Record<string, unknown>> {
		const blockHex = await this._channel.invoke<string>('app:getBlockByID', {
			id: id.toString('hex'),
		});
		const blockBytes = Buffer.from(blockHex, 'hex');
		return decodeBlock(blockBytes, this._schemas);
	}

	public async getByHeight(height: number): Promise<Record<string, unknown>> {
		const blockHex = await this._channel.invoke<string>('app:getBlockByHeight', { height });
		const blockBytes = Buffer.from(blockHex, 'hex');
		return decodeBlock(blockBytes, this._schemas);
	}

	public encode(input: {
		header: Record<string, unknown>;
		payload: Record<string, unknown>[];
	}): Buffer {
		return encodeBlock(input, this._schemas);
	}

	public decode(input: Buffer): Record<string, unknown> {
		return decodeBlock(input, this._schemas);
	}

	public toJSON(
		block: BlockType,
	): {
		header: Record<string, unknown>;
		payload: Record<string, unknown>[];
	} {
		const json = {
			header: {
				asset: {},
			},
			payload: [],
		};
		const { asset, ...headerRoot } = block.header;

		// We need to remove this 'cos schema does not have id
		delete headerRoot.id;

		// decode header
		json.header = { ...codec.toJSON(this._schemas.blockHeader, headerRoot), asset: {} };

		// decode header's asset
		const headerAssetJson = codec.toJSON(
			this._schemas.blockHeadersAssets[block.header.version],
			asset,
		);
		json.header.asset = headerAssetJson;

		// decode transactions
		for (const tx of block.payload) {
			const { asset: txAsset, ...txRoot } = tx;
			delete txRoot.id;

			const schemaAsset = getTransactionAssetSchema(tx, this._schemas);
			const jsonTxAsset = codec.toJSON(schemaAsset, txAsset as object);
			const jsonTxRoot = codec.toJSON(this._schemas.transaction, txRoot);

			const jsonTx = {
				...jsonTxRoot,
				asset: jsonTxAsset,
			};

			json.payload.push(jsonTx as never);
		}

		return json;
	}

	public fromJSON(
		block: BlockType,
	): {
		header: Record<string, unknown>;
		payload: Record<string, unknown>[];
	} {
		const object = {
			header: {
				asset: {},
			},
			payload: [],
		};
		const { asset, ...headerRoot } = block.header;

		// We need to remove this 'cos schema does not have id
		delete headerRoot.id;

		// decode header
		object.header = { ...codec.fromJSON(this._schemas.blockHeader, headerRoot), asset: {} };

		// decode header's asset
		const headerAssetJson = codec.fromJSON(
			this._schemas.blockHeadersAssets[block.header.version],
			asset,
		);
		object.header.asset = headerAssetJson;

		// decode transactions
		for (const tx of block.payload) {
			const { asset: txAsset, ...txRoot } = tx;
			delete txRoot.id;

			const schemaAsset = getTransactionAssetSchema(tx, this._schemas);
			const txAssetObject = codec.fromJSON(schemaAsset, txAsset as object);
			const txRootObject = codec.fromJSON(this._schemas.transaction, txRoot);

			const txObject = {
				...txRootObject,
				asset: txAssetObject,
			};

			object.payload.push(txObject as never);
		}

		return object;
	}
}
