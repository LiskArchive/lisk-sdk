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
import { expect } from 'chai';
import * as transactions from '../../src/transactions';

describe('transactions', () => {
	describe('exports', () => {
		it('should have BaseTransaction', () => {
			return expect(transactions)
				.to.have.property('BaseTransaction')
				.and.be.a('function');
		});

		it('should have TransferTransaction', () => {
			return expect(transactions)
				.to.have.property('TransferTransaction')
				.and.be.a('function');
        });
    });
});