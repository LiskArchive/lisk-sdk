/*
 * Copyright © 2021 Lisk Foundation
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

import { BFTParameters } from '../bft/schemas';
import { BFTHeights } from '../bft/types';
import { BlockHeader, ImmutableAPIContext, APIContext } from '../state_machine';

export interface BFTHeader {
	id: Buffer;
	previousBlockID: Buffer;
	generatorAddress: Buffer;
	timestamp: number;
	height: number;
	maxHeightPrevoted: number;
	maxHeightGenerated: number;
	receivedAt?: number;
}

export interface Validator {
	address: Buffer;
	bftWeight: bigint;
	generatorKey: Buffer;
	blsKey: Buffer;
}

export interface BFTAPI {
	getCurrentValidators: (apiContext: ImmutableAPIContext) => Promise<Validator[]>;
	getValidator: (
		context: ImmutableAPIContext,
		address: Buffer,
		height: number,
	) => Promise<Validator>;
	getBFTHeights: (apiClient: ImmutableAPIContext) => Promise<BFTHeights>;
	getBFTParameters: (apiContext: ImmutableAPIContext, height: number) => Promise<BFTParameters>;
	getNextHeightBFTParameters: (apiContext: ImmutableAPIContext, height: number) => Promise<number>;
	isHeaderContradictingChain: (
		apiClient: ImmutableAPIContext,
		header: BlockHeader,
	) => Promise<boolean>;
	existBFTParameters: (apiContext: ImmutableAPIContext, height: number) => Promise<boolean>;
}

export interface PkSigPair {
	publicKey: Buffer;
	signature: Buffer;
}

export interface AggregateCommit {
	readonly height: number;
	readonly aggregationBits: Buffer;
	readonly certificateSignature: Buffer;
}

export interface CommitPool {
	verifyAggregateCommit: (
		apiContext: APIContext,
		aggregateCommit: AggregateCommit,
	) => Promise<boolean>;
	getAggregateCommit: (apiContext: APIContext) => Promise<AggregateCommit>;
}
