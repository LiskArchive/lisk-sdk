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
	readonly balance: bigint;
	readonly missedBlocks: number;
	readonly producedBlocks: number;
	readonly publicKey: string;
	readonly secondPublicKey: string | null;
	readonly secondSignature: number;
	readonly username: string | null;
	readonly isDelegate: number;
	readonly fees: bigint;
	readonly rewards: bigint;
	// tslint:disable-next-line readonly-keyword
	voteWeight: bigint;
	readonly nameExist: false;
	readonly multiMin: number;
	readonly multiLifetime: number;
	readonly asset: object;
	// tslint:disable-next-line readonly-keyword
	votedDelegatesPublicKeys: string[];
	// tslint:disable-next-line readonly-keyword
	membersPublicKeys: ReadonlyArray<string>;
	// tslint:disable-next-line:no-mixed-interface
	readonly addBalance: (fees: bigint) => void;
}

export interface Delegate {
	readonly username: string;
}

export interface TransactionJSON {
	readonly asset: object;
	readonly id?: string;
	readonly blockId?: string;
	readonly height?: number;
	readonly confirmations?: number;
	readonly senderPublicKey: string;
	readonly signature?: string;
	readonly signatures?: ReadonlyArray<string>;
	readonly signSignature?: string;
	readonly timestamp: number;
	readonly type: number;
	readonly receivedAt?: string;
	readonly networkIdentifier?: string;
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
