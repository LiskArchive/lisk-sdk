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
import {
	givenALiskInstance,
	givenAQueryInstance,
	givenABlockID,
	givenAnAddress,
	givenATransactionID,
	givenADelegateUsername,
} from '../../steps/1_given';
import {
	whenTheQueryInstanceGetsABlockUsingTheID,
	whenTheQueryInstanceGetsAnAccountUsingTheAddress,
	whenTheQueryInstanceGetsATransactionUsingTheID,
	whenTheQueryInstanceGetsADelegateUsingTheUsername,
} from '../../steps/2_when';
import {
	thenTheLiskInstanceShouldSendARequestToTheBlocksGetAPIEndpointWithTheBlockID,
	thenTheLiskInstanceShouldSendARequestToTheAccountsAPIEndpointWithTheAddress,
	thenTheLiskInstanceShouldSendARequestToTheTransactionsGetAPIEndpointWithTheTransactionID,
	thenTheLiskInstanceShouldSendARequestToTheDelegatesGetAPIEndpointWithTheUsername,
} from '../../steps/3_then';

describe('Query class', () => {
	describe('Given a lisk instance', () => {
		beforeEach(givenALiskInstance);

		describe('Given a query instance', () => {
			beforeEach(givenAQueryInstance);

			describe('#isBlockQuery', () => {
				describe('Given a block ID "5650160629533476718"', () => {
					beforeEach(givenABlockID);

					describe('When the query instance gets a block using the ID', () => {
						beforeEach(whenTheQueryInstanceGetsABlockUsingTheID);

						it('Then the lisk instance should send a request to the blocks/get API endpoint with the block ID', thenTheLiskInstanceShouldSendARequestToTheBlocksGetAPIEndpointWithTheBlockID);
					});
				});
			});

			describe('#isAccountQuery', () => {
				describe('Given an address "13782017140058682841L"', () => {
					beforeEach(givenAnAddress);

					describe('When the query instance gets an account using the address', () => {
						beforeEach(whenTheQueryInstanceGetsAnAccountUsingTheAddress);

						it('Then the lisk instance should send a request to the accounts API endpoint with the address', thenTheLiskInstanceShouldSendARequestToTheAccountsAPIEndpointWithTheAddress);
					});
				});
			});

			describe('#isTransactionQuery', () => {
				describe('Given a transaction ID "16388447461355055139"', () => {
					beforeEach(givenATransactionID);

					describe('When the query instance gets a transaction using the ID', () => {
						beforeEach(whenTheQueryInstanceGetsATransactionUsingTheID);

						it('Then the lisk instance should send a request to the transactions/get API endpoint with the transaction ID', thenTheLiskInstanceShouldSendARequestToTheTransactionsGetAPIEndpointWithTheTransactionID);
					});
				});
			});

			describe('#isDelegateQuery', () => {
				describe('Given a delegate username "lightcurve"', () => {
					beforeEach(givenADelegateUsername);

					describe('When the query instance gets a delegate using the username', () => {
						beforeEach(whenTheQueryInstanceGetsADelegateUsingTheUsername);

						it('Then the lisk instance should send a request to the delegates/get API endpoint with the username', thenTheLiskInstanceShouldSendARequestToTheDelegatesGetAPIEndpointWithTheUsername);
					});
				});
			});
		});
	});
});
