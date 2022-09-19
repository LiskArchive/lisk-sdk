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

import { MethodContext } from '../../state_machine';

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
	blsKey: Buffer;
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
		methodContext: MethodContext,
		aggregateCommit: AggregateCommit,
	) => Promise<boolean>;
	getAggregateCommit: (methodContext: MethodContext) => Promise<AggregateCommit>;
}

export interface ValidatorUpdate {
	preCommitThreshold: bigint;
	certificateThreshold: bigint;
	nextValidators: (Validator & { generatorKey: Buffer })[];
}
