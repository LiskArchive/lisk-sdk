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
	readonly id: Buffer;
	readonly nonce: bigint;
	readonly fee: bigint;
	readonly senderPublicKey: Buffer;
	receivedAt?: Date;
	feePriority?: bigint;
}

export interface TransactionFunctions {
	getBytes: () => Buffer;
}

export enum Status {
	FAIL = 0,
	OK = 1,
}

// This enum is matching with framework/src/abi/constants.ts
export enum TransactionStatus {
	INVALID = -1,
	UNPROCESSABLE = 0,
	PROCESSABLE = 1,
}
