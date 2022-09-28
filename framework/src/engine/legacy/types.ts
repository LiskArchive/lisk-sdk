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
	transactions: Buffer[];
}

export interface LegacyBlock {
	header: LegacyBlockHeader;
	transactions: Buffer[];
}

export interface LegacyBlockHeaderWithID extends LegacyBlockHeader {
	id: Buffer;
}

export interface LegacyBlockWithID extends LegacyBlock {
	header: LegacyBlockHeaderWithID;
	transactions: Buffer[];
}

export type LegacyBlockJSON = JSONObject<LegacyBlock>;

export interface LegacyChainBracketInfo {
	startHeight: number;
	snapshotBlockHeight: number;
	lastBlockHeight: number;
}
