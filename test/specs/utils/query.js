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
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('Query class', () => {
	describe('Given a lisk instance', () => {
		beforeEach(given.aLiskInstance);

		describe('Given a query instance', () => {
			beforeEach(given.aQueryInstance);

			describe('#isBlockQuery', () => {
				describe('Given a block ID "5650160629533476718"', () => {
					beforeEach(given.aBlockID);

					describe('When the query instance gets a block using the ID', () => {
						beforeEach(when.theQueryInstanceGetsABlockUsingTheID);

						it('Then the lisk instance should send a request to the blocks/get API endpoint with the block ID', then.theLiskInstanceShouldSendARequestToTheBlocksGetAPIEndpointWithTheBlockID);
					});
				});
			});

			describe('#isAccountQuery', () => {
				describe('Given an address "13782017140058682841L"', () => {
					beforeEach(given.anAddress);

					describe('When the query instance gets an account using the address', () => {
						beforeEach(when.theQueryInstanceGetsAnAccountUsingTheAddress);

						it('Then the lisk instance should send a request to the accounts API endpoint with the address', then.theLiskInstanceShouldSendARequestToTheAccountsAPIEndpointWithTheAddress);
					});
				});
			});

			describe('#isTransactionQuery', () => {
				describe('Given a transaction ID "16388447461355055139"', () => {
					beforeEach(given.aTransactionID);

					describe('When the query instance gets a transaction using the ID', () => {
						beforeEach(when.theQueryInstanceGetsATransactionUsingTheID);

						it('Then the lisk instance should send a request to the transactions/get API endpoint with the transaction ID', then.theLiskInstanceShouldSendARequestToTheTransactionsGetAPIEndpointWithTheTransactionID);
					});
				});
			});

			describe('#isDelegateQuery', () => {
				describe('Given a delegate username "lightcurve"', () => {
					beforeEach(given.aDelegateUsername);

					describe('When the query instance gets a delegate using the username', () => {
						beforeEach(when.theQueryInstanceGetsADelegateUsingTheUsername);

						it('Then the lisk instance should send a request to the delegates/get API endpoint with the username', then.theLiskInstanceShouldSendARequestToTheDelegatesGetAPIEndpointWithTheUsername);
					});
				});
			});
		});
	});
});
