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
export interface IAccount {
	readonly address: string;
	readonly balance: string;
	readonly delegate: IDelegate;
	readonly publicKey: string;
	readonly secondPublicKey?: string;
	readonly unconfirmedBalance: string;
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

export interface IRequiredState {
	readonly accounts: ReadonlyArray<IAccount>;
	readonly transactions: ReadonlyArray<ITransactionJSON>;
}

export interface ITransactionJSON {
	readonly amount: string;
	readonly asset?: TransactionAsset;
	readonly fee: string;
	readonly id: string;
	readonly recipientId: string;
	readonly recipientPublicKey: string;
	readonly senderId: string;
	readonly senderPublicKey: string;
	readonly signature?: string;
	readonly signatures?: ReadonlyArray<string>;
	readonly signSignature?: string;
	readonly timestamp: number;
	readonly type: number;
}

export type TransactionAsset =
	| ITransferAsset
	| ISecondSignatureAsset
	| IDelegateAsset
	| IVoteAsset
	| IMultiSignatureAsset
	| IDappAsset
	| IInTransferAsset
	| IOutTransferAsset;

export interface ITransferTransaction extends ITransactionJSON {
	readonly asset: ITransferAsset;
}

export interface ITransferAsset {
	readonly data?: string;
}

export interface ISecondSignatureTransaction extends ITransactionJSON {
	readonly asset: ISecondSignatureAsset;
}

export interface ISecondSignatureAsset {
	readonly signature: {
		readonly publicKey: string;
	};
}

export interface IDelegateTransaction extends ITransactionJSON {
	readonly asset: IDelegateAsset;
}

export interface IDelegateAsset {
	readonly delegate: {
		readonly username: string;
	};
}

export interface IVoteTransaction extends ITransactionJSON {
	readonly asset: IVoteAsset;
}

export interface IVoteAsset {
	readonly votes: ReadonlyArray<string>;
}

export interface IMultiSignatureTransaction extends ITransactionJSON {
	readonly asset: IMultiSignatureAsset;
}

export interface IMultiSignatureAsset {
	readonly multisignature: {
		readonly keysgroup: ReadonlyArray<string>;
		readonly lifetime: number;
		readonly min: number;
	};
}

export interface IDappTransaction extends ITransactionJSON {
	readonly asset: IDappAsset;
}

export interface IDappAsset {
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

export interface IInTransferTransaction extends ITransactionJSON {
	readonly asset: IInTransferAsset;
}

export interface IInTransferAsset {
	readonly inTransfer: {
		readonly dappId: string;
	};
}

export interface IOutTransferTransaction extends ITransactionJSON {
	readonly asset: IOutTransferAsset;
}

export interface IOutTransferAsset {
	readonly outTransfer: {
		readonly dappId: string;
		readonly transactionId: string;
	};
}
