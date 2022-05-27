/*
 * Copyright © 2021 Lisk Foundation
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
import { IterateOptions } from '@liskhq/lisk-db';

export interface StateDBReadWriter {
	get(key: Buffer): Promise<Buffer>;
	has(key: Buffer): Promise<boolean>;
	set(key: Buffer, value: Buffer): Promise<void>;
	del(key: Buffer): Promise<void>;
	range(options?: IterateOptions): Promise<{ key: Buffer; value: Buffer }[]>;
	snapshot(): void;
	restoreSnapshot(): void;
}

interface KeyValue {
	key: Buffer;
	value: Buffer;
}

interface DecodedKeyValue<T> {
	key: Buffer;
	value: T;
}

export class PrefixedStateReadWriter {
	private readonly _readWriter: StateDBReadWriter;
	private readonly _prefix: Buffer;

	public constructor(stateDB: StateDBReadWriter, prefix?: Buffer) {
		this._readWriter = stateDB;
		this._prefix = prefix ?? Buffer.alloc(0);
	}

	public get inner(): StateDBReadWriter {
		return this._readWriter;
	}

	public getStore(moduleID: number, prefix: number): PrefixedStateReadWriter {
		const moduleIDBytes = Buffer.alloc(4);
		moduleIDBytes.writeUInt32BE(moduleID, 0);
		const prefixBytes = Buffer.alloc(2);
		prefixBytes.writeUInt16BE(prefix, 0);
		const nextPrefix = Buffer.concat([this._prefix, moduleIDBytes, prefixBytes]);

		return new PrefixedStateReadWriter(this._readWriter, nextPrefix);
	}

	public async get(key: Buffer): Promise<Buffer> {
		const prefixedKey = this._getKey(key);
		return this._readWriter.get(prefixedKey);
	}

	public async getWithSchema<T>(key: Buffer, schema: Schema): Promise<T> {
		const value = await this.get(key);
		return codec.decode<T>(schema, value);
	}

	public async has(key: Buffer): Promise<boolean> {
		return this._readWriter.has(this._getKey(key));
	}

	public async set(key: Buffer, value: Buffer): Promise<void> {
		return this._readWriter.set(this._getKey(key), value);
	}

	public async setWithSchema(
		key: Buffer,
		// eslint-disable-next-line @typescript-eslint/ban-types
		value: object,
		schema: Schema,
	): Promise<void> {
		const encodedValue = codec.encode(schema, value);
		await this.set(key, encodedValue);
	}

	public async del(key: Buffer): Promise<void> {
		await this._readWriter.del(this._getKey(key));
	}

	public async iterate(options: IterateOptions): Promise<KeyValue[]> {
		const optionsWithKey = {
			...options,
			gte: options.gte ? this._getKey(options.gte) : undefined,
			lte: options.lte ? this._getKey(options.lte) : undefined,
		};
		const result = await this._readWriter.range(optionsWithKey);
		return result.map(kv => ({
			key: kv.key.slice(this._prefix.length),
			value: kv.value,
		}));
	}

	public async iterateWithSchema<T>(
		options: IterateOptions,
		schema: Schema,
	): Promise<DecodedKeyValue<T>[]> {
		const optionsWithKey = {
			...options,
			gte: options.gte ? this._getKey(options.gte) : undefined,
			lte: options.lte ? this._getKey(options.lte) : undefined,
		};
		const result = await this._readWriter.range(optionsWithKey);
		return result.map(kv => ({
			key: kv.key.slice(this._prefix.length),
			value: codec.decode<T>(schema, kv.value),
		}));
	}

	public createSnapshot(): void {
		this._readWriter.snapshot();
	}

	public restoreSnapshot(): void {
		this._readWriter.restoreSnapshot();
	}

	private _getKey(key: Buffer): Buffer {
		return Buffer.concat([this._prefix, key]);
	}
}
