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

export interface BlockHeader {
	readonly blockId: string;
	readonly height: number;
	readonly maxHeightPreviouslyForged: number;
	readonly maxHeightPrevoted: number;
	readonly delegateMinHeightActive: number;
	readonly delegatePublicKey: string;
}

export interface Block {
	readonly height: number;
	readonly id: string;
	readonly generatorPublicKey: string;
	readonly previousBlockId: string;
	readonly timestamp: number;
	readonly receivedAt?: number;
	readonly maxHeightPrevoted: number;
	readonly maxHeightPreviouslyForged?: number;
	readonly delegateMinHeightActive?: number;
	readonly version: number;
}

export enum ForkStatus {
	IDENTICAL_BLOCK = 1,
	VALID_BLOCK = 2,
	DOUBLE_FORGING = 3,
	TIE_BREAK = 4,
	DIFFERENT_CHAIN = 5,
	DISCARD = 6,
}

export interface Slots {
	readonly getSlotNumber: (timestamp: number) => number;
	readonly isWithinTimeslot: (
		slotNumber: number,
		receivedAt: number | undefined,
	) => boolean;
	readonly getEpochTime: (time?: number) => number;
}

export interface HeightOfDelegates {
	readonly [key: string]: number[];
}

export interface StateStore {
	readonly chainState: {
		readonly set: (key: string | number, value: string | number) => boolean;
		readonly get: (key: string | number) => Promise<string>;
		readonly cache: () => void;
	};
}

export interface BlockEntity {
	readonly get: (
		filters: object,
		options?: object,
		tx?: object,
	) => Promise<Block[]>;
}

export interface ChainState {
	readonly get: (
		filters: object,
		options?: object,
		tx?: object,
	) => Promise<object[]>;
	readonly getKey: (key: string, tx?: object) => Promise<object[]>;
}

export interface Storage {
	readonly entities: {
		readonly Block: BlockEntity;
		readonly ChainState: ChainState;
	};
}

export class BFTError extends Error {}

/* tslint:disable:max-classes-per-file */

export class BFTChainDisjointError extends BFTError {
	public constructor() {
		super(
			'Violation of disjointness condition. If delegate forged a block of higher height earlier and later the block with lower height',
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

export class BFTInvalidAttributeError extends BFTError {
	public constructor(message: string) {
		super(`Invalid BFT attribute: ${message}`);
	}
}

export interface Rounds {
	readonly calcRound: (height: number) => number;
	readonly calcRoundStartHeight: (round: number) => number;
	readonly calcRoundEndHeight: (round: number) => number;
}
