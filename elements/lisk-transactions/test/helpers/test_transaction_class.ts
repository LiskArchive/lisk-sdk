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
/* eslint-disable class-methods-use-this,max-classes-per-file,@typescript-eslint/require-await */
import { BaseTransaction } from '../../src/base_transaction';
import { TransactionError } from '../../src/errors';

export class TestTransaction extends BaseTransaction {
	public static TYPE = 8;

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public async prepare(): Promise<void> {}

	public validateAsset(): TransactionError[] {
		return [];
	}

	public async applyAsset(): Promise<TransactionError[]> {
		return [];
	}
}

export class TestTransactionBasicImpl extends BaseTransaction {
	public static TYPE = 1;
	public static ASSET_SCHEMA = {
		$id: 'basic-sample',
		type: 'object',
		properties: {
			foo: {
				dataType: 'string',
				fieldNumber: 1,
			},
		},
	};

	public async applyAsset(): Promise<TransactionError[]> {
		return [];
	}
}
