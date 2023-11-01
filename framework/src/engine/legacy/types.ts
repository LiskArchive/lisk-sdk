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

import { JSONObject } from '../../types';

export interface LegacyBlockBracket {
	startHeight: number;
	snapshotHeight: number;
	snapshotBlockID: string;
}

export interface LegacyBlockHeader {
	[key: string]: unknown;
	version: number;
	height: number;
	previousBlockID: Buffer;
	transactionRoot: Buffer;
}

export type LegacyBlockHeaderJSON = JSONObject<LegacyBlockHeader>;

export interface RawLegacyBlock {
	header: Buffer;
	payload: Buffer[];
}

export interface LegacyBlock {
	header: LegacyBlockHeader;
	payload: Buffer[];
}

export interface LegacyBlockHeaderWithID extends LegacyBlockHeader {
	id: Buffer;
}

export interface LegacyBlockWithID extends LegacyBlock {
	header: LegacyBlockHeaderWithID;
	payload: Buffer[];
}

export type LegacyBlockJSON = JSONObject<LegacyBlock>;

export interface LegacyTransaction {
	moduleID: number;
	assetID: number;
	nonce: bigint;
	fee: bigint;
	senderPublicKey: Buffer;
	asset: Buffer;
	signatures: Buffer[];
}

export interface LegacyTransactionWithID extends LegacyTransaction {
	id: Buffer;
}

export type LegacyTransactionJSON = JSONObject<LegacyTransactionWithID>;

export interface LegacyChainBracketInfo {
	startHeight: number;
	snapshotBlockHeight: number;
	lastBlockHeight: number;
}

export interface LegacyChainBracketInfoWithSnapshotBlockID extends LegacyChainBracketInfo {
	snapshotBlockID: string;
}

export interface Peer {
	readonly peerId: string;
	readonly options: {
		readonly legacy: string[];
	};
}

export interface RPCLegacyBlocksByIdData {
	readonly blockID: Buffer;
	readonly snapshotBlockID: Buffer;
}
