/*
 * Copyright © 2017 Lisk Foundation
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
import {
	getTransactionBytes,
	prepareTransaction,
	getTimeFromBlockchainEpoch,
	getTimeWithOffset,
} from '../../../src/transactions/utils';

describe('transaction utils', () => {
	describe('exports', () => {
		it('should have getTransactionBytes, prepareTransaction, getTimeFromBlockchainEpoch, getTimeWithOffset', () => {
			(getTransactionBytes).should.be.type('function');
			(prepareTransaction).should.be.type('function');
			(getTimeFromBlockchainEpoch).should.be.type('object');
			(getTimeWithOffset).should.be.type('object');
		});
	});
});
