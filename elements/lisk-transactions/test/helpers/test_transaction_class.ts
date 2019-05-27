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
import { BaseTransaction } from '../../src/base_transaction';
import { TransactionJSON } from '../../src/transaction_types';
import { TransactionError } from '../../src/errors';

export class TestTransaction extends BaseTransaction {
	public static TYPE = 0;

	public assetToJSON(): object {
		return {};
	}

	public async prepare() {
		return;
	}

	public assetToBytes(): Buffer {
		return Buffer.alloc(0);
	}

	public validateAsset() {
		return [];
	}

	public applyAsset() {
		return [];
	}

	public undoAsset() {
		return [];
	}

	public verifyAgainstTransactions(
		transactions: ReadonlyArray<TransactionJSON>,
	): ReadonlyArray<TransactionError> {
		transactions.forEach(() => true);

		return [];
	}

	public assetFromSync(raw: any) {
		return { data: raw };
	}
}
