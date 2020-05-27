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

export interface AccountVote {
	readonly delegateAddress: Buffer;
	amount: bigint;
}
export interface AccountUnlocking {
	readonly delegateAddress: Buffer;
	readonly amount: bigint;
	readonly unvoteHeight: number;
}
export interface Account {
	readonly address: Buffer;
	balance: bigint;
	nonce: bigint;
	missedBlocks: number;
	producedBlocks: number;
	publicKey: Buffer;
	username: string | null;
	isDelegate: number;
	fees: bigint;
	rewards: bigint;
	asset: object;
	keys: {
		mandatoryKeys: Array<Readonly<Buffer>>;
		optionalKeys: Array<Readonly<Buffer>>;
		numberOfSignatures: number;
	};
	delegate: {
		lastForgedHeight: number;
		consecutiveMissedBlocks: number;
		isBanned: boolean;
		pomHeights: number[];
	};
	votes: AccountVote[];
	unlocking: AccountUnlocking[];
	totalVotesReceived: bigint;
}
export interface Delegate {
	readonly username: string;
}

export interface BlockHeader {
	readonly height: number;
	readonly version: number;
	readonly timestamp: number;
	readonly previousBlockId?: Buffer | null;
	readonly blockSignature: Buffer;
	readonly generatorPublicKey: Buffer;
	readonly numberOfTransactions: number;
	readonly payloadLength: number;
	readonly transactionRoot: Buffer;
	readonly maxHeightPreviouslyForged: number;
	readonly maxHeightPrevoted: number;
	readonly totalAmount: bigint;
	readonly totalFee: bigint;
	readonly reward: bigint;
	readonly seedReveal: Buffer;
}

export interface BlockHeaderJSON {
	readonly height: number;
	readonly version: number;
	readonly timestamp: number;
	readonly previousBlockId?: string | null;
	readonly blockSignature: string;
	readonly generatorPublicKey: string;
	readonly numberOfTransactions: number;
	readonly payloadLength: number;
	readonly transactionRoot: string;
	readonly maxHeightPreviouslyForged: number;
	readonly maxHeightPrevoted: number;
	readonly totalAmount: bigint;
	readonly totalFee: bigint;
	readonly reward: bigint;
	readonly seedReveal: string;
}

export interface TransactionJSON {
	readonly id?: string;
	readonly type: number;
	readonly senderPublicKey: string;
	readonly signatures?: ReadonlyArray<string>;
	readonly asset: object;
	readonly nonce: string;
	readonly fee: string;
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
