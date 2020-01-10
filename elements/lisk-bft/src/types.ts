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
	public constructor() {
		super('Invalid BFT attribute');
	}
}
