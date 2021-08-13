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

export const enum NodeType {
	BRANCH = 'branch',
	LEAF = 'leaf',
}
export interface NodeData {
	readonly value: Buffer;
	readonly hash: Buffer;
}
export interface NodeInfo {
	readonly type: NodeType;
	readonly hash: Buffer;
	readonly value: Buffer;
	readonly leftHash: Buffer;
	readonly rightHash: Buffer;
	readonly layerIndex: number;
	readonly nodeIndex: number;
}

export const enum NodeSide {
	LEFT = 0,
	RIGHT,
}

export interface Proof {
	readonly siblingHashes: ReadonlyArray<Buffer>;
	readonly idxs: ReadonlyArray<number>;
	readonly size: number;
}

export interface NodeLocation {
	readonly layerIndex: number;
	readonly nodeIndex: number;
}

export interface Database {
	get(key: Buffer): Promise<Buffer>;
	set(key: Buffer, value: Buffer): Promise<void>;
}

export interface MerkleRootInfo {
	readonly value: Buffer;
	readonly appendPath: Buffer[];
	readonly size: number;
}
