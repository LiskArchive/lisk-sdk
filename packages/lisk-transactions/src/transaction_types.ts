/*
 * Copyright © 2018 Lisk Foundation
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

export interface Account {
	readonly address: string;
	readonly balance: string;
	readonly delegate?: Delegate;
	readonly publicKey: string;
	readonly secondPublicKey?: string;
	readonly multisignatures?: ReadonlyArray<string>;
	readonly multimin?: number;
	readonly multilifetime?: number;
	readonly username?: string;
	readonly votes?: ReadonlyArray<string>;
	readonly isDelegate?: boolean;
}

export interface Delegate {
	readonly username: string;
}

export interface RequiredState {
	readonly accounts: ReadonlyArray<Account>;
	readonly transactions: ReadonlyArray<TransactionJSON>;
}

export interface TransactionJSON {
	readonly amount: string;
	readonly asset: TransactionAsset;
	readonly fee: string;
	readonly id?: string;
	readonly recipientId: string;
	readonly recipientPublicKey?: string;
	readonly senderId?: string;
	readonly senderPublicKey: string;
	readonly signature?: string;
	readonly signatures?: ReadonlyArray<string>;
	readonly signSignature?: string;
	readonly timestamp: number;
	readonly type: number;
	readonly receivedAt?: Date;
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

export type PartialTransaction = Partial<TransactionJSON>;

export type TransactionAsset =
	| TransferAsset
	| SecondSignatureAsset
	| DelegateAsset
	| VoteAsset
	| MultiSignatureAsset
	| DappAsset
	| InTransferAsset
	| OutTransferAsset
	| object;

export interface TransferTransaction extends TransactionJSON {
	readonly asset: TransferAsset;
}

export interface TransferAsset {
	readonly data?: string;
}

export interface SecondSignatureTransaction extends TransactionJSON {
	readonly asset: SecondSignatureAsset;
}

export interface SecondSignatureAsset {
	readonly signature: {
		readonly publicKey: string;
	};
}

export interface DelegateTransaction extends TransactionJSON {
	readonly asset: DelegateAsset;
}

export interface DelegateAsset {
	readonly delegate: {
		readonly username: string;
	};
}

export interface VoteTransaction extends TransactionJSON {
	readonly asset: VoteAsset;
}

export interface VoteAsset {
	readonly votes: ReadonlyArray<string>;
}

export interface MultiSignatureTransaction extends TransactionJSON {
	readonly asset: MultiSignatureAsset;
}

export interface MultiSignatureAsset {
	readonly multisignature: {
		readonly keysgroup: ReadonlyArray<string>;
		readonly lifetime: number;
		readonly min: number;
	};
}

export interface DappTransaction extends TransactionJSON {
	readonly asset: DappAsset;
}

export interface DappAsset {
	readonly dapp: {
		readonly category: number;
		readonly description?: string;
		readonly icon?: string;
		readonly link: string;
		readonly name: string;
		readonly tags?: string;
		readonly type: number;
	};
}

export interface InTransferTransaction extends TransactionJSON {
	readonly asset: InTransferAsset;
}

export interface InTransferAsset {
	readonly inTransfer: {
		readonly dappId: string;
	};
}

export interface OutTransferTransaction extends TransactionJSON {
	readonly asset: OutTransferAsset;
}

export interface OutTransferAsset {
	readonly outTransfer: {
		readonly dappId: string;
		readonly transactionId: string;
	};
}
