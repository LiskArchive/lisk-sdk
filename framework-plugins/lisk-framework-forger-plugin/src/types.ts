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

export interface Forger {
	readonly forging: boolean;
	readonly address: string;
}

export interface ForgerInfo {
	totalProducedBlocks: number;
	totalReceivedFees: bigint;
	totalReceivedRewards: bigint;
	votesReceived: Voters[];
}

export interface Voters {
	address: Buffer;
	amount: bigint;
}

export interface ForgetSyncInfo {
	syncUptoHeight: number;
}

export interface DPoSAccountJSON {
	pos: {
		validator: {
			username: string;
			totalStakeReceived: string;
			consecutiveMissedBlocks: number;
		};
	};
}
