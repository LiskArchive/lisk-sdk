import { Schema } from '@liskhq/lisk-codec';

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
interface Named {
	name: string;
	key: Buffer;
	schema: Schema;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor = new (...args: any) => Named;

interface NamedMap {
	readonly size: number;

	clear(): void;
	delete(key: Constructor): boolean;
	get<K extends Constructor>(key: K): InstanceType<K> | undefined;
	has(key: Constructor): boolean;
	set<K extends Constructor>(key: K, value: InstanceType<K>): this;
	values(): IterableIterator<Named>;
}

export class NamedRegistry {
	private readonly _registry: NamedMap = new Map();

	public register<K extends Constructor>(key: K, value: InstanceType<K>): void {
		this._registry.set(key, value);
	}

	public get<K extends Constructor>(key: K): InstanceType<K> {
		const named = this._registry.get(key);
		if (!named) {
			throw new Error(`Class ${key.name} is not registered.`);
		}
		return named;
	}

	public keys(): Buffer[] {
		const result = [];
		for (const klass of this._registry.values()) {
			result.push(klass.key);
		}
		return result;
	}

	public values(): Named[] {
		const result = [];
		for (const klass of this._registry.values()) {
			result.push({
				name: klass.name,
				key: klass.key,
				schema: klass.schema,
			});
		}
		return result;
	}
}
