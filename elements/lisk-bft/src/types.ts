/*
 * Copyright © 2019 Lisk Foundation
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
/* eslint-disable max-classes-per-file */

export interface BlockHeader {
	readonly id: Buffer;
	readonly height: number;
	readonly generatorPublicKey: Buffer;
	readonly reward: bigint;
	readonly previousBlockID: Buffer;
	readonly timestamp: number;
	readonly receivedAt?: number;
	readonly asset: {
		readonly seedReveal: Buffer;
		readonly maxHeightPrevoted: number;
		readonly maxHeightPreviouslyForged: number;
	};
	readonly version: number;
}

export interface AccountAsset {
	delegate: DelegateAccountAsset;
	sentVotes: VoteAccountAsset[];
	unlocking: UnlockingAccountAsset[];
}

export interface DelegateAccountAsset {
	username: string;
	pomHeights: number[];
	consecutiveMissedBlocks: number;
	lastForgedHeight: number;
	isBanned: boolean;
	totalVotesReceived: bigint;
}

export interface VoteAccountAsset {
	delegateAddress: Buffer;
	amount: bigint;
}

export interface UnlockingAccountAsset {
	delegateAddress: Buffer;
	amount: bigint;
	unvoteHeight: number;
}

export interface Account {
	readonly address: Buffer;
	balance: bigint;
	asset: {
		delegate: DelegateAccountAsset;
		sentVotes: VoteAccountAsset[];
		unlocking: UnlockingAccountAsset[];
	};
}

export interface StateStore {
	readonly account: {
		readonly get: (primaryValue: Buffer) => Promise<Account>;
		readonly getUpdated: () => ReadonlyArray<Account>;
		// eslint-disable-next-line @typescript-eslint/method-signature-style
		set(key: Buffer, value: Account): void;
	};
	readonly consensus: {
		readonly get: (key: string) => Promise<Buffer | undefined>;
		readonly set: (key: string, value: Buffer) => void;
		readonly lastBlockHeaders: ReadonlyArray<BlockHeader>;
	};
	readonly chain: {
		readonly get: (key: string) => Promise<Buffer | undefined>;
		readonly set: (key: string, value: Buffer) => void;
	};
}

export interface DPoS {
	getMinActiveHeight(
		height: number,
		address: Buffer,
		stateStore: StateStore,
		delegateActiveRoundLimit?: number,
	): Promise<number>;
	isStandbyDelegate(address: Buffer, height: number, stateStore: StateStore): Promise<boolean>;
	isBootstrapPeriod(height: number): boolean;
}

export interface Chain {
	readonly slots: {
		readonly getSlotNumber: (timestamp: number) => number;
		readonly isWithinTimeslot: (slotNumber: number, receivedAt: number | undefined) => boolean;
		readonly timeSinceGenesis: (time?: number) => number;
	};
	readonly dataAccess: {
		getConsensusState(key: string): Promise<Buffer | undefined>;
	};
}

export enum ForkStatus {
	IDENTICAL_BLOCK = 1,
	VALID_BLOCK = 2,
	DOUBLE_FORGING = 3,
	TIE_BREAK = 4,
	DIFFERENT_CHAIN = 5,
	DISCARD = 6,
}

export class BFTError extends Error {}

export class BFTChainDisjointError extends BFTError {
	public constructor() {
		super(
			'Violation of disjointedness condition. If delegate forged a block of higher height earlier and later the block with lower height',
		);
	}
}

export class BFTLowerChainBranchError extends BFTError {
	public constructor() {
		super(
			'Violation of the condition that delegate must choose the branch with largest maxHeightPrevoted',
		);
	}
}

export class BFTForkChoiceRuleError extends BFTError {
	public constructor() {
		super('Violation of fork choice rule, delegate moved to a different chain');
	}
}

export class BFTInvalidAttributeError extends BFTError {}

export interface BFTPersistedValues {
	readonly finalizedHeight: number;
}
