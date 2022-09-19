/*
 * Copyright © 2022 Lisk Foundation
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

import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import {
	EVENT_TOPIC_HASH_LENGTH_BYTES,
	EVENT_TOPIC_INDEX_LENGTH_BITS,
	EVENT_TOTAL_INDEX_LENGTH_BYTES,
} from './constants';
import { eventSchema } from './schema';
import { JSONObject } from './types';

export interface EventAttr {
	module: string;
	name: string;
	topics: Buffer[];
	index: number;
	height: number;
	data: Buffer;
}

type EventJSON = JSONObject<EventAttr>;

export class Event {
	private readonly _index: number;
	private readonly _module: string;
	private readonly _name: string;
	private readonly _topics: Buffer[];
	private readonly _data: Buffer;
	private readonly _height: number;

	public constructor({ index, module, name, topics, data, height }: EventAttr) {
		this._index = index;
		this._module = module;
		this._name = name;
		this._topics = topics;
		this._data = data;
		this._height = height;
	}

	public static fromBytes(value: Buffer): Event {
		const decoded = codec.decode<EventAttr>(eventSchema, value);
		return new Event(decoded);
	}

	public id(): Buffer {
		return utils.hash(codec.encode(eventSchema, this.toObject()));
	}

	public getBytes(): Buffer {
		return codec.encode(eventSchema, this._getAllProps());
	}

	public keyPair(): { key: Buffer; value: Buffer }[] {
		const result = [];
		const value = this.getBytes();
		for (let i = 0; i < this._topics.length; i += 1) {
			// eslint-disable-next-line no-bitwise
			const indexBit = (this._index << EVENT_TOPIC_INDEX_LENGTH_BITS) + i;
			const indexBytes = Buffer.alloc(EVENT_TOTAL_INDEX_LENGTH_BYTES);
			indexBytes.writeUIntBE(indexBit, 0, EVENT_TOTAL_INDEX_LENGTH_BYTES);
			const key = Buffer.concat([
				utils.hash(this._topics[i]).slice(0, EVENT_TOPIC_HASH_LENGTH_BYTES),
				indexBytes,
			]);
			result.push({
				key,
				value,
			});
		}
		return result;
	}

	public toJSON(): EventJSON {
		return codec.toJSON(eventSchema, this._getAllProps());
	}

	public toObject(): EventAttr {
		return this._getAllProps();
	}

	private _getAllProps(): EventAttr {
		return {
			data: this._data,
			index: this._index,
			module: this._module,
			name: this._name,
			topics: this._topics,
			height: this._height,
		};
	}
}
