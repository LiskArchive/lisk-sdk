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

export interface Account {
	readonly address: string;
	readonly balance: string;
	readonly delegate?: Delegate;
	readonly publicKey?: string;
	readonly secondPublicKey?: string | null;
	readonly secondSignature?: number;
	readonly membersPublicKeys?: ReadonlyArray<string>;
	readonly multiMin?: number;
	readonly multiLifetime?: number;
	readonly username?: string | null;
	readonly votedDelegatesPublicKeys?: ReadonlyArray<string>;
	readonly isDelegate?: number;
	readonly vote?: number;
}

export interface Delegate {
	readonly username: string;
}

export interface TransactionJSON {
	readonly amount: string | number;
	readonly asset: object;
	readonly fee: string | number;
	readonly id?: string;
	readonly blockId?: string;
	readonly height?: number;
	readonly confirmations?: number;
	readonly recipientId: string | null;
	readonly recipientPublicKey?: string;
	readonly senderId?: string;
	readonly senderPublicKey: string;
	readonly signature?: string;
	readonly signatures?: ReadonlyArray<string>;
	readonly signSignature?: string;
	readonly timestamp: number;
	readonly type: number;
	readonly receivedAt?: string;
	readonly relays?: number;
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
