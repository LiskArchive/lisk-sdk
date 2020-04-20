/*
 * Copyright © 2020 Lisk Foundation
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

export type Transaction = TransactionObject & TransactionFunctions;

export interface TransactionObject {
	readonly id: string;
	readonly nonce: bigint;
	readonly fee: bigint;
	readonly minFee: bigint;
	receivedAt?: Date;
	// TODO: Remove unnecessary properties
	readonly senderPublicKey: string;
	readonly asset: {
		[key: string]: string | number | ReadonlyArray<string> | undefined;
	};
	signatures?: ReadonlyArray<string>;
	readonly type: number;
	verifiedOnce?: boolean;
	feePriority?: bigint;
}

export interface TransactionFunctions {
	getBytes: () => Buffer;
}

export enum Status {
	FAIL = 0,
	OK = 1,
}

export enum TransactionStatus {
	INVALID = 0,
	UNPROCESSABLE,
	PROCESSABLE,
}

export interface TransactionError {
	readonly message: string;
	readonly id: string;
	readonly dataPath: string;
	readonly actual?: string | number;
	readonly expected?: string | number;
}

export interface TransactionResponse {
	readonly errors: ReadonlyArray<TransactionError>;
	readonly id: string;
	readonly status: Status;
}
