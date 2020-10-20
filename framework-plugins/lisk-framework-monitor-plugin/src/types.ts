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

export interface Options {
	readonly port: number;
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

interface BannedPeer {
	timeUntilUnBan: Date;
	Reason: string;
	banCount: number;
}

interface BlockHeader {
	// eslint-disable-next-line @typescript-eslint/ban-types
	blockHeader: object;
	timeReceived: Date;
}

interface TransactionPropagationStats {
	count: number;
	timeReceived: Date;
}

export interface SharedState {
	network: {
		outgoing: {
			count: number;
			networkHeight: {
				majorityHeight: number;
				numberOfPeers: number;
			};
		};
		incoming: {
			count: number;
			networkHeight: {
				majorityHeight: number;
				numberOfPeers: number;
			};
			connectStats: {
				connects: number;
				disconnects: number;
			};
			totalPeers: {
				connected: number;
				disconnected: number;
			};
			banning: {
				totalBannedPeers: number;
				bannedPeers: Record<string, BannedPeer>;
			};
		};
	};
	forks: {
		forkEventCount: number;
		blockHeaders: Record<string, BlockHeader>;
	};
	transactions: {
		transactions: Record<string, TransactionPropagationStats>;
		averageReceivedTransactions: number;
		connectedPeers: number;
	};
	blocks: {
		blocks: Record<string, number>;
		averageReceivedBlock: number;
		connectedPeers: number;
	};
}
