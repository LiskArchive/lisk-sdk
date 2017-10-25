/*
 * LiskHQ/lisky
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

import * as given from '../../steps/1_given';
import * as then from '../../steps/3_then';

describe('transactions util', () => {
	describe('Given a lisk transaction object', () => {
		beforeEach(given.aLiskTransactionObject);
		it('Then it should have the transaction create transaction', then.itShouldHaveTheTransactionCreateTransaction);
		it('Then it should have the transaction sign transaction', then.itShouldHaveTheTransactionSignTransaction);
		it('Then it should have the transaction create multisignature', then.itShouldHaveTheTransactionCreateMultisignature);
		it('Then it should have the transaction create signature', then.itShouldHaveTheTransactionCreateSignature);
		it('Then it should have the transaction create delegate', then.itShouldHaveTheTransactionCreateDelegate);
		it('Then it should have the transaction create vote', then.itShouldHaveTheTransactionCreateVote);
	});
});
