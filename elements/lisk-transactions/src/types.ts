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
 *
 */
import { TransactionError } from './errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Account<T = any> {
	readonly address: Buffer;
	balance: bigint;
	nonce: bigint;
	keys: {
		mandatoryKeys: Buffer[];
		optionalKeys: Buffer[];
		numberOfSignatures: number;
	};
	asset: T;
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

export interface BlockHeader {
	readonly id: Buffer;
	readonly version: number;
	readonly timestamp: number;
	readonly height: number;
	readonly previousBlockID: Buffer;
	readonly transactionRoot: Buffer;
	readonly generatorPublicKey: Buffer;
	readonly reward: bigint;
	readonly signature: Buffer;
	readonly asset: {
		readonly seedReveal: Buffer;
		readonly maxHeightPreviouslyForged: number;
		readonly maxHeightPrevoted: number;
	};
}

export interface BlockHeaderJSON {
	readonly id: string;
	readonly version: number;
	readonly timestamp: number;
	readonly height: number;
	readonly previousBlockID: string;
	readonly transactionRoot: string;
	readonly generatorPublicKey: string;
	readonly reward: string;
	readonly signature: string;
	readonly asset: {
		readonly seedReveal: string;
		readonly maxHeightPreviouslyForged: number;
		readonly maxHeightPrevoted: number;
	};
}

export interface TransactionJSON {
	readonly id: string;
	readonly type: number;
	readonly senderPublicKey: string;
	readonly signatures?: ReadonlyArray<string>;
	readonly asset: object;
	readonly nonce: string;
	readonly fee: string;
}

export interface BaseTransactionInput<T = object> {
	readonly id?: Buffer;
	readonly type?: number;
	readonly senderPublicKey: Buffer;
	readonly nonce: bigint;
	readonly fee: bigint;
	readonly asset: T;
	readonly signatures?: Array<Readonly<Buffer>>;
}

export interface IsValidResponse {
	readonly valid: boolean;
	readonly errors?: ReadonlyArray<TransactionError>;
}

export interface IsValidResponseWithError {
	readonly valid: boolean;
	readonly error?: TransactionError;
}

export interface IsVerifiedResponse {
	readonly verified: boolean;
	readonly errors?: ReadonlyArray<TransactionError>;
}
