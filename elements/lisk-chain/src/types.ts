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
import {
	BaseTransaction,
	TransactionJSON,
	TransactionResponse,
} from '@liskhq/lisk-transactions';

export interface AccountVoteJSON {
	readonly delegateAddress: string;
	readonly amount: string;
}

export interface AccountUnlockingJSON {
	readonly delegateAddress: string;
	readonly amount: string;
	readonly unvoteHeight: number;
}

export interface AccountJSON {
	readonly address: string;
	readonly balance: string;
	readonly nonce: string;
	readonly producedBlocks: number;
	readonly publicKey: string | undefined;
	readonly username: string | null;
	readonly fees: string;
	readonly rewards: string;
	readonly totalVotesReceived: string;
	readonly asset: object;
	readonly keys?: {
		readonly mandatoryKeys?: string[];
		readonly optionalKeys?: string[];
		readonly numberOfSignatures?: number;
	};
	readonly votes?: AccountVoteJSON[];
	readonly unlocking?: AccountUnlockingJSON[];
	readonly delegate?: {
		readonly lastForgedHeight: number;
		readonly consecutiveMissedBlocks: number;
		readonly isBanned: boolean;
		readonly pomHeights: number[];
	};

	// TODO: Remove with https://github.com/LiskHQ/lisk-sdk/issues/5058
	readonly missedBlocks: number;
	readonly isDelegate: number;
}

export interface Context {
	readonly blockVersion: number;
	readonly blockHeight: number;
	readonly blockTimestamp: number;
}
export type Contexter = (() => Context) | Context;
export interface BlockHeaderJSON {
	id: string;
	height: number;
	version: number;
	timestamp: number;
	previousBlockId: string;
	seedReveal: string;
	blockSignature: string;
	generatorPublicKey: string;
	numberOfTransactions: number;
	payloadLength: number;
	transactionRoot: string;
	totalAmount: string;
	totalFee: string;
	reward: string;
	maxHeightPreviouslyForged: number;
	maxHeightPrevoted: number;
}

export interface BlockJSON extends BlockHeaderJSON {
	transactions: ReadonlyArray<TransactionJSON>;
}

type Modify<T, R> = Omit<T, keyof R> & R;

// All the block properties excluding transactions
export type BlockHeader = Modify<
	BlockHeaderJSON,
	{
		totalAmount: bigint;
		totalFee: bigint;
		reward: bigint;
	}
>;

export type GenesisBlockJSON = Modify<
	BlockJSON,
	{
		previousBlockId?: string | null;
	}
>;

export type GenesisBlock = Modify<
	BlockInstance,
	{
		previousBlockId?: string | null;
	}
>;

export interface BlockRewardOptions {
	readonly totalAmount: string;
	readonly distance: number;
	readonly rewardOffset: number;
	readonly milestones: ReadonlyArray<string>;
}

export interface BlockInstance extends BlockHeader {
	readonly transactions: BaseTransaction[];
	readonly receivedAt?: number;
}

export interface TempBlock {
	readonly height: number;
	readonly id: string;
	readonly fullBlock: BlockJSON;
}

export type MatcherTransaction = BaseTransaction & {
	readonly matcher: (contexter: Context) => boolean;
};

export interface ChainState {
	readonly key: string;
	readonly value: string;
}

export type WriteableTransactionResponse = {
	-readonly [P in keyof TransactionResponse]: TransactionResponse[P];
};
