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
import {
	Block as IBlock,
	BlockJSON,
	Channel,
	DecodedBlock,
	DecodedBlockJSON,
	ModuleMetadata,
	RegisteredSchemas,
} from './types';
import { decodeBlock, decodeBlockJSON, encodeBlock, fromBlockJSON, toBlockJSON } from './codec';

export class BlockMethods {
	private readonly _channel: Channel;
	private readonly _schemas: RegisteredSchemas;
	private readonly _metadata: ModuleMetadata[];

	public constructor(
		channel: Channel,
		registeredSchema: RegisteredSchemas,
		moduleMetadata: ModuleMetadata[],
	) {
		this._channel = channel;
		this._schemas = registeredSchema;
		this._metadata = moduleMetadata;
	}

	public async get(id: Buffer | string): Promise<DecodedBlockJSON> {
		const idString: string = Buffer.isBuffer(id) ? id.toString('hex') : id;
		const block = await this._channel.invoke<BlockJSON>('chain_getBlockByID', {
			id: idString,
		});
		return decodeBlockJSON(block, this._metadata);
	}

	public async getByHeight(height: number): Promise<DecodedBlockJSON> {
		const block = await this._channel.invoke<BlockJSON>('chain_getBlockByHeight', { height });
		return decodeBlockJSON(block, this._metadata);
	}

	public encode(input: DecodedBlock): Buffer {
		return encodeBlock(input, this._schemas, this._metadata);
	}

	public decode(input: Buffer | string): DecodedBlock {
		const inputBuffer: Buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'hex');
		return decodeBlock(inputBuffer, this._schemas, this._metadata);
	}

	public toJSON(block: DecodedBlock | IBlock): DecodedBlockJSON {
		return toBlockJSON(block, this._schemas, this._metadata);
	}

	public fromJSON(block: BlockJSON | DecodedBlockJSON): DecodedBlock {
		return fromBlockJSON(block, this._schemas, this._metadata);
	}
}
