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
import { Schema } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { IterateOptions } from '@liskhq/lisk-db';
import { ImmutableSubStore, SubStore } from '../state_machine/types';

export interface ImmutableOffchainStoreGetter {
	getOffchainStore: (moduleID: Buffer, storePrefix: Buffer) => ImmutableSubStore;
}

export interface OffchainStoreGetter {
	getOffchainStore: (moduleID: Buffer, storePrefix: Buffer) => SubStore;
}

export abstract class BaseOffchainStore<T> {
	private readonly _version: number;
	private readonly _storePrefix: Buffer;
	private readonly _subStorePrefix: Buffer;

	public abstract schema: Schema;

	public get key(): Buffer {
		return Buffer.concat([this._storePrefix, this._subStorePrefix]);
	}

	public get name(): string {
		const name = this.constructor.name.replace('Store', '');
		return name.charAt(0).toLowerCase() + name.substr(1);
	}

	public constructor(moduleName: string, version = 0) {
		this._version = version;
		this._storePrefix = utils.hash(Buffer.from(moduleName, 'utf-8')).subarray(0, 4);
		// eslint-disable-next-line no-bitwise
		this._storePrefix[0] &= 0x7f;
		const versionBuffer = Buffer.alloc(2);
		versionBuffer.writeUInt16BE(this._version, 0);
		this._subStorePrefix = utils
			.hash(Buffer.concat([Buffer.from(this.name, 'utf-8'), versionBuffer]))
			.subarray(0, 2);
	}

	public async get(ctx: ImmutableOffchainStoreGetter, key: Buffer): Promise<T> {
		if (!this.schema) {
			throw new Error('Schema is not set');
		}
		const subStore = ctx.getOffchainStore(this._storePrefix, this._subStorePrefix);
		return subStore.getWithSchema<T>(key, this.schema);
	}

	public async has(ctx: ImmutableOffchainStoreGetter, key: Buffer): Promise<boolean> {
		if (!this.schema) {
			throw new Error('Schema is not set');
		}
		const subStore = ctx.getOffchainStore(this._storePrefix, this._subStorePrefix);
		return subStore.has(key);
	}

	public async iterate(
		ctx: ImmutableOffchainStoreGetter,
		options: IterateOptions,
	): Promise<{ key: Buffer; value: T }[]> {
		if (!this.schema) {
			throw new Error('Schema is not set');
		}
		const subStore = ctx.getOffchainStore(this._storePrefix, this._subStorePrefix);
		return subStore.iterateWithSchema<T>(options, this.schema);
	}

	public async set(ctx: OffchainStoreGetter, key: Buffer, value: T): Promise<void> {
		if (!this.schema) {
			throw new Error('Schema is not set');
		}
		const subStore = ctx.getOffchainStore(this._storePrefix, this._subStorePrefix);
		return subStore.setWithSchema(key, value as Record<string, unknown>, this.schema);
	}

	public async del(ctx: OffchainStoreGetter, key: Buffer): Promise<void> {
		if (!this.schema) {
			throw new Error('Schema is not set');
		}
		const subStore = ctx.getOffchainStore(this._storePrefix, this._subStorePrefix);
		return subStore.del(key);
	}
}
