/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
	Given('a transactions object', given.aTransactionsObject, () => {
		Then(
			'it should have a function for creating a type 0 transaction',
			then.itShouldHaveAFunctionForCreatingATypeTransaction,
		);
		Then(
			'it should have a function for creating a type 1 transaction',
			then.itShouldHaveAFunctionForCreatingATypeTransaction,
		);
		Then(
			'it should have a function for creating a type 2 transaction',
			then.itShouldHaveAFunctionForCreatingATypeTransaction,
		);
		Then(
			'it should have a function for creating a type 3 transaction',
			then.itShouldHaveAFunctionForCreatingATypeTransaction,
		);
		Then(
			'it should have a function for creating a type 4 transaction',
			then.itShouldHaveAFunctionForCreatingATypeTransaction,
		);
	});
});
