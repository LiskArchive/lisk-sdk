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

export interface Proof {
	readonly siblingHashes: Buffer[];
	readonly queries: ProofQuery[];
}

export interface ProofQuery {
	readonly key: Buffer;
	readonly value: Buffer;
	// During calculations bitmap values can change so these are not readonly
	bitmap: Buffer;
	binaryBitmap: string;
}

export interface ProofQueryWithHash extends ProofQuery {
	hash: Buffer;
}

export interface Database {
	get(key: Buffer): Promise<Buffer>;
	set(key: Buffer, value: Buffer): Promise<void>;
	del(key: Buffer): Promise<void>;
}
