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
import BigNum from 'browserify-bignum';

export interface IAccount {
	readonly address: string;
	readonly balance: string;
	readonly delegate: ReadonlyArray<IDelegate>;
	readonly publicKey: string;
	readonly secondPublicKey?: string;
	readonly unconfirmedBalance: string;
}
export interface IBaseTransaction {
	readonly amount: BigNum;
	readonly blockId: string;
	readonly confirmations: BigNum;
	readonly fee: BigNum;
	readonly height: string;
	readonly id: string;
	readonly rawTransaction: object;
	readonly recipientId: string;
	readonly recipientPublicKey: string;
	readonly senderId: string;
	readonly senderPublicKey: string;
	readonly signature: string;
	readonly signatures?: ReadonlyArray<string>;
	readonly signSignature?: string;
	readonly timestamp: number;
	readonly transactionJSON: ITransactionJSON;
	readonly type: number;
}

export interface IDelegate {
	readonly approval: number;
	readonly missedBlocks: number;
	readonly producedBlocks: number;
	readonly productivity: number;
	readonly rank: number;
	readonly rewards: number;
	readonly username: string;
	readonly vote: string;
}

export interface IKeyPair {
	readonly privateKey: string;
	readonly publicKey: string;
}

export interface ITransactionJSON {
	readonly amount: number;
	readonly asset?: TransactionAsset;
	readonly blockId: string;
	readonly confirmations: number;
	readonly fee: number;
	readonly height: string;
	readonly id: string;
	readonly recipientId: string;
	readonly recipientPublicKey: string;
	readonly senderId: string;
	readonly senderPublicKey: string;
	readonly signature: string;
	readonly signatures?: ReadonlyArray<string>;
	readonly signSignature?: string;
	readonly timestamp: number;
	readonly type: number;
}

type Partial<T> = { [P in keyof T]?: T[P] };

export type PartialTransaction = Partial<IBaseTransaction>;

export type TransactionAsset =
	| TransferAsset
	| SecondSignatureAsset
	| DelegateAsset
	| VoteAsset
	| MultiSignatureAsset
	| DappAsset
	| InTransferAsset
	| OutTransferAsset;

export interface TransferTransaction extends IBaseTransaction {
	readonly asset: TransferAsset;
}

export interface TransferAsset {
	readonly data?: string;
}

export interface SecondSignatureTransaction extends IBaseTransaction {
	readonly asset: SecondSignatureAsset;
}

export interface SecondSignatureAsset {
	readonly signature: {
		readonly publicKey: string;
	};
}

export interface DelegateTransaction extends IBaseTransaction {
	readonly asset: DelegateAsset;
}

export interface DelegateAsset {
	readonly delegate: {
		readonly username: string;
	};
}

export interface VoteTransaction extends IBaseTransaction {
	readonly asset: VoteAsset;
}

export interface VoteAsset {
	readonly votes: ReadonlyArray<string>;
}

export interface MultiSignatureTransaction extends IBaseTransaction {
	readonly asset: MultiSignatureAsset;
}

export interface MultiSignatureAsset {
	readonly multisignature: {
		readonly keysgroup: ReadonlyArray<string>;
		readonly lifetime: number;
		readonly min: number;
	};
}

export interface DappTransaction extends IBaseTransaction {
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

export interface InTransferTransaction extends IBaseTransaction {
	readonly asset: InTransferAsset;
}

export interface InTransferAsset {
	readonly inTransfer: {
		readonly dappId: string;
	};
}

export interface OutTransferTransaction extends IBaseTransaction {
	readonly asset: OutTransferAsset;
}

export interface OutTransferAsset {
	readonly outTransfer: {
		readonly dappId: string;
		readonly transactionId: string;
	};
}
