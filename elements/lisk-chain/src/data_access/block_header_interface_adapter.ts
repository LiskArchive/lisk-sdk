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
import { codec, Schema } from '@liskhq/lisk-codec';
import { hash } from '@liskhq/lisk-cryptography';
import { RawBlockHeader, BlockHeader } from '../types';
import { blockHeaderSchema, signingBlockHeaderSchema } from '../schema';

export interface RegisteredBlockHeaders {
	readonly [key: number]: object;
}

export class BlockHeaderInterfaceAdapter {
	private readonly _blockSchemaMap: Map<number, Schema>;

	public constructor(registeredBlocks: RegisteredBlockHeaders = {}) {
		this._blockSchemaMap = new Map<number, Schema>();
		Object.keys(registeredBlocks).forEach(version => {
			this._blockSchemaMap.set(Number(version), registeredBlocks[Number(version)] as Schema);
		});
	}

	public getSchema(version: number): Schema {
		const assetSchema = this._blockSchemaMap.get(version);
		if (!assetSchema) {
			throw new Error(`Asset Schema not found for block version: ${version}.`);
		}
		return assetSchema;
	}

	public decode<T>(buffer: Buffer): BlockHeader<T> {
		const blockHeader = codec.decode<RawBlockHeader>(blockHeaderSchema, buffer);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const assetSchema = this.getSchema(blockHeader.version);
		const asset = codec.decode<T>(assetSchema, blockHeader.asset);
		const id = hash(buffer);

		return { ...blockHeader, asset, id };
	}

	public encode(header: BlockHeader, skipSignature = false): Buffer {
		const assetSchema = this.getSchema(header.version);
		const encodedAsset = codec.encode(assetSchema, header.asset);
		const rawHeader = { ...header, asset: encodedAsset };

		const schema = skipSignature ? signingBlockHeaderSchema : blockHeaderSchema;

		return codec.encode(schema, rawHeader);
	}
}
