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

import { BlockHeader } from '@liskhq/lisk-chain';

export interface RegisteredDelegate {
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
export interface VoteAccountAsset {
	readonly delegateAddress: Buffer;
	// Amount for some delegate can be updated
	amount: bigint;
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
		sentVotes: VoteAccountAsset[];
		unlocking: UnlockingAccountAsset[];
	};
}

export interface UnlockTransactionAssetContext {
	readonly unlockObjects: ReadonlyArray<UnlockingAccountAsset>;
}

export interface RegisterTransactionAssetContext {
	readonly username: string;
}

export interface VoteTransactionAssetContext {
	readonly votes: ReadonlyArray<VoteAccountAsset>;
}

export interface BlockHeaderAssetForDPOS {
	readonly seedReveal: Buffer;
	readonly maxHeightPreviouslyForged: number;
	readonly maxHeightPrevoted: number;
}

export interface PomTransactionAssetContext {
	readonly header1: BlockHeader<BlockHeaderAssetForDPOS>;
	readonly header2: BlockHeader<BlockHeaderAssetForDPOS>;
}

export interface DelegateWeight {
	readonly address: Buffer;
	readonly voteWeight: bigint;
}

export interface VoteWeight {
	readonly round: number;
	readonly delegates: ReadonlyArray<DelegateWeight>;
}

export type VoteWeights = VoteWeight[];

export interface DecodedVoteWeights {
	voteWeights: VoteWeights;
}

type Grow<T, A extends T[]> = ((x: T, ...xs: A) => void) extends (...a: infer X) => void
	? X
	: never;
type GrowToSize<T, A extends T[], N extends number> = {
	readonly 0: A;
	readonly 1: GrowToSize<T, Grow<T, A>, N>;
}[A['length'] extends N ? 0 : 1];

export type FixedLengthArray<T, N extends number> = GrowToSize<T, [], N>;

// Look for a way to define buffer type with fixed size
export type RandomSeed = Buffer;
