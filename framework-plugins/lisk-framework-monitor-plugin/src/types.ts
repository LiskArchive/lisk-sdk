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

export interface MonitorPluginConfig {
	readonly port: number;
	readonly host: string;
	readonly whiteList: ReadonlyArray<string>;
	readonly cors: {
		readonly origin: string;
		readonly methods: string[];
	};
	readonly limits: {
		readonly max: number;
		readonly delayMs: number;
		readonly delayAfter: number;
		readonly windowMs: number;
		readonly headersTimeout: number;
		readonly serverSetTimeout: number;
	};
}

interface BlockHeader {
	// eslint-disable-next-line @typescript-eslint/ban-types
	blockHeader: object;
	timeReceived: number;
}

export interface TransactionPropagationStats {
	count: number;
	timeReceived: number;
}

export interface BlockPropagationStats {
	count: number;
	height: number;
}

export interface SharedState {
	forks: {
		forkEventCount: number;
		blockHeaders: Record<string, BlockHeader>;
	};
	transactions: Record<string, TransactionPropagationStats>;
	blocks: { [key: string]: BlockPropagationStats };
}

export interface PeerInfo {
	readonly ipAddress: string;
	readonly port: number;
	readonly chainID: string;
	readonly networkVersion: string;
	readonly nonce: string;
	readonly options: { [key: string]: unknown };
}
