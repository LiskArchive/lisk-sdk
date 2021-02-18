/*
 * Copyright © 2021 Lisk Foundation
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
 */

import { TransferAsset } from '../../../src/modules/token';
import { createTransaction } from '../../../src/testing';

describe('Create Transaction', () => {
	const asset = {
		amount: BigInt('1000000000000'),
		recipientAddress: Buffer.from('ab0041a7d3f7b2c290b5b834d46bdc7b7eb85815', 'hex'),
		data: 'moon',
	};

	it('should return a valid transaction', () => {
		expect(createTransaction({ moduleID: 2, assetClass: TransferAsset, asset })).toMatchSnapshot();
	});

	it('should return valid signed transaction with passphrase', () => {
		const transaction = createTransaction({
			moduleID: 2,
			assetClass: TransferAsset,
			asset,
			passphrase: 'pass',
			networkIdentifier: Buffer.alloc(1),
		});

		expect(transaction.signatures).toHaveLength(1);
	});
});
