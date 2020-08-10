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

interface RegisteredDelegate {
	readonly username: string;
	readonly address: Buffer;
}

export interface RegisteredDelegates {
	registeredDelegates: RegisteredDelegate[];
}

export interface DelegatePersistedUsernames {
	readonly registeredDelegates: RegisteredDelegate[];
}

export interface UnlockingAccountAsset {
	readonly delegateAddress: Buffer;
	readonly amount: bigint;
	readonly unvoteHeight: number;
}

export interface DPOSAccountProps {
	dpos: {
		delegate: {
			username: string;
			pomHeights: number[];
			consecutiveMissedBlocks: number;
			lastForgedHeight: number;
			isBanned: boolean;
			totalVotesReceived: bigint;
		};
		sentVotes: {
			readonly delegateAddress: Buffer;
			amount: bigint;
		}[];

		unlocking: UnlockingAccountAsset[];
	};
}

export interface UnlockTransactionAssetInput {
	readonly unlockObjects: ReadonlyArray<UnlockingAccountAsset>;
}
