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
	describe('Given a transaction object', () => {
		beforeEach(given.aTransactionsObject);
		it('Then it should have the transaction transfer', then.itShouldHaveTheTransactionTransfer);
		it('Then it should have the transaction register second passphrase', then.itShouldHaveTheTransactionRegisterSecondPassphrase);
		it('Then it should have the transaction register delegate', then.itShouldHaveTheTransactionRegisterDelegate);
		it('Then it should have the transaction cast votes', then.itShouldHaveTheTransactionCastVotes);
		it('Then it should have the transaction register multisignature account', then.itShouldHaveTheTransactionRegisterMultisignatureAccount);
	});
});
