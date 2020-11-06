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
import { Channel, RegisteredSchemas } from './types';
import { decodeBlock, encodeBlock } from './codec';

export class Block {
	private readonly _channel: Channel;
	private readonly _schema: RegisteredSchemas;

	public constructor(channel: Channel, registeredSchema: RegisteredSchemas) {
		this._channel = channel;
		this._schema = registeredSchema;
	}

	public async get(id: Buffer): Promise<Record<string, unknown>> {
		const blockHex = await this._channel.invoke<string>('app:getBlockByID', {
			id: id.toString('hex'),
		});
		const blockBytes = Buffer.from(blockHex, 'hex');
		return decodeBlock(blockBytes, this._schema);
	}

	public async getByHeight(height: number): Promise<Record<string, unknown>> {
		const blockHex = await this._channel.invoke<string>('app:getBlockByHeight', { height });
		const blockBytes = Buffer.from(blockHex, 'hex');
		return decodeBlock(blockBytes, this._schema);
	}

	public encode(input: {
		header: Record<string, unknown>;
		payload: Record<string, unknown>[];
	}): Buffer {
		return encodeBlock(input, this._schema);
	}

	public decode(input: Buffer): Record<string, unknown> {
		return decodeBlock(input, this._schema);
	}
}
