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
	readonly delegateAddress: string;
	amount: bigint;
}
export interface AccountUnlocking {
	readonly delegateAddress: string;
	readonly amount: bigint;
	readonly unvoteHeight: number;
}
export interface Account {
	readonly address: string;
	balance: bigint;
	nonce: bigint;
	missedBlocks: number;
	producedBlocks: number;
	publicKey: string | undefined;
	username: string | null;
	isDelegate: number;
	fees: bigint;
	rewards: bigint;
	asset: object;
	keys: {
		mandatoryKeys: string[];
		optionalKeys: string[];
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

type Modify<T, R> = Omit<T, keyof R> & R;

export type BlockHeaderJSON = Modify<
	BlockHeader,
	{
		readonly totalAmount: string;
		readonly totalFee: string;
		readonly reward: string;
	}
>;

export interface TransactionJSON {
	readonly asset: object;
	readonly id?: string;
	readonly blockId?: string;
	readonly height?: number;
	readonly confirmations?: number;
	readonly senderPublicKey: string;
	readonly signatures?: ReadonlyArray<string>;
	readonly type: number;
	readonly receivedAt?: string;
	readonly networkIdentifier?: string;
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
