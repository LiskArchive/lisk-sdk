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
import { setUpCommandBroadcastTransaction } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('broadcast transaction command', () => {
	beforeEach(setUpCommandBroadcastTransaction);
	Given('a Lisk API instance', given.aLiskAPIInstance, () => {
		Given('an action "broadcast transaction"', given.anAction, () => {
			When('the action is called', when.theActionIsCalled, () => {
				Then(
					'it should not broadcast the transaction',
					then.itShouldNotBroadcastTheTransaction,
				);
				Then(
					'it should reject with validation error and message "No transaction was provided."',
					then.itShouldRejectWithValidationErrorAndMessage,
				);
			});
			Given('an error object', given.anErrorObject, () => {
				When(
					'the action is called with the stringified error object via Vorpal stdin',
					when.theActionIsCalledWithTheStringifiedErrorObjectViaVorpalStdIn,
					() => {
						Then(
							'it should not broadcast the transaction',
							then.itShouldNotBroadcastTheTransaction,
						);
						Then(
							'it should resolve to the error object',
							then.itShouldResolveToTheErrorObject,
						);
					},
				);
			});
			Given(
				'a transaction in table format',
				given.aTransactionInTableFormat,
				() => {
					When(
						'the action is called with the transaction',
						when.theActionIsCalledWithTheTransaction,
						() => {
							Then(
								'it should not broadcast the transaction',
								then.itShouldNotBroadcastTheTransaction,
							);
							Then(
								'it should reject with validation error and message "Could not parse transaction JSON. Did you use the `--json` option?"',
								then.itShouldRejectWithValidationErrorAndMessage,
							);
						},
					);
					When(
						'the action is called with the transaction via Vorpal stdin',
						when.theActionIsCalledWithTheTransactionViaVorpalStdIn,
						() => {
							Then(
								'it should not broadcast the transaction',
								then.itShouldNotBroadcastTheTransaction,
							);
							Then(
								'it should reject with validation error and message "Could not parse transaction JSON. Did you use the `--json` option?"',
								then.itShouldRejectWithValidationErrorAndMessage,
							);
						},
					);
				},
			);
			Given(
				'a transaction in stringified JSON format',
				given.aTransactionInStringifiedJSONFormat,
				() => {
					When(
						'the action is called with the transaction',
						when.theActionIsCalledWithTheTransaction,
						() => {
							Then(
								'it should broadcast the transaction',
								then.itShouldBroadcastTheTransaction,
							);
							Then(
								'it should resolve to the API response',
								then.itShouldResolveToTheAPIResponse,
							);
						},
					);
					When(
						'the action is called with the transaction via Vorpal stdin',
						when.theActionIsCalledWithTheTransactionViaVorpalStdIn,
						() => {
							Then(
								'it should broadcast the transaction',
								then.itShouldBroadcastTheTransaction,
							);
							Then(
								'it should resolve to the API response',
								then.itShouldResolveToTheAPIResponse,
							);
						},
					);
					Given('an error object', given.anErrorObject, () => {
						When(
							'the action is called with the transaction and the stringified error object via Vorpal stdin',
							when.theActionIsCalledWithTheTransactionAndTheStringifiedErrorObjectViaVorpalStdIn,
							() => {
								Then(
									'it should broadcast the transaction',
									then.itShouldBroadcastTheTransaction,
								);
								Then(
									'it should resolve to the API response',
									then.itShouldResolveToTheAPIResponse,
								);
							},
						);
					});
				},
			);
		});
	});
});
