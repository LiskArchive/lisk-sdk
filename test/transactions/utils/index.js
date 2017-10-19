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
	getTimeFromBlockchainEpoch,
	getTimeWithOffset,
	getTransactionBytes,
	prepareTransaction,
} from '../../../src/transactions/utils';

describe('transaction utils', () => {
	describe('exports', () => {
		it('should have getTimeFromBlockchainEpoch', () => {
			getTimeFromBlockchainEpoch.should.be.type('function');
		});

		it('should have getTimeWithOffset', () => {
			getTimeWithOffset.should.be.type('function');
		});

		it('should have getTransactionBytes', () => {
			getTransactionBytes.should.be.type('function');
		});

		it('should have prepareTransaction', () => {
			prepareTransaction.should.be.type('function');
		});
	});
});
