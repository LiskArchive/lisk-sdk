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

export interface ModuleConfig {
	maxLengthRevealsMainchain?: number;
}

export interface UsedHashOnion {
	readonly count: number;
	readonly address: Buffer;
	readonly height: number;
}

export interface HashOnionConfig {
	readonly count: number;
	readonly distance: number;
	readonly hashes: Buffer[];
}

export interface UsedHashOnionStoreObject {
	readonly usedHashOnions: UsedHashOnion[];
}

export interface RegisteredDelegate {
	readonly address: Buffer;
	readonly encryptedPassphrase: string;
	readonly hashOnion: {
		readonly count: number;
		readonly distance: number;
		readonly hashes: Buffer[];
	};
}

export interface GeneratorConfig {
	readonly force?: boolean;
	readonly delegates?: ReadonlyArray<RegisteredDelegate>;
	readonly defaultPassword?: string;
	readonly waitThreshold: number;
}
