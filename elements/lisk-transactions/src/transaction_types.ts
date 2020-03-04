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
// tslint:disable readonly-keyword
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
	voteWeight: bigint;
	nameExist: boolean;
	asset: object;
	votedDelegatesPublicKeys: string[];
	keys: {
		mandatoryKeys: string[];
		optionalKeys: string[];
		numberOfSignatures: number;
	};
	// tslint:disable-next-line:no-mixed-interface
	readonly toJSON: () => object;
}
// tslint:enable readonly-keyword
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
