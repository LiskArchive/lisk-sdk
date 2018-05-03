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
import { setUpCommandVerifyTransaction } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe.only('verify transaction command', () => {
	beforeEach(setUpCommandVerifyTransaction);
	Given('an action "verify transaction"', given.anAction, () => {
		Given(
			'a transaction in stringified JSON format',
			given.aTransactionInStringifiedJSONFormat,
			() => {
				Given(
					'an error object',
					given.anErrorObject,
					() => {
						When(
							'the action is called with the stringified error object via vorpal stdIn',
							when.theActionIsCalledWithTheStringifiedErrorObjectViaVorpalStdIn,
							() => {
							},
						);
					},
				);
				Given(
					'a second public key "790049f919979d5ea42cca7b7aa0812cbae8f0db3ee39c1fe3cef18e25b67951"',
					given.aSecondPublicKey,
					() => {
						When(
							'the action is called with the stringified error object via vorpal stdIn',
							when.theActionIsCalledWithTheStringifiedErrorObjectViaVorpalStdIn,
							() => {
							},
						);
						When(
							'the action is called with the transaction',
							when.theActionIsCalledWithTheTransaction,
							() => {
							},
						);
						When(
							'the action is called with the transaction via vorpal stdIn',
							when.theActionIsCalledWithTheTransactionViaVorpalStdIn,
							() => {
								Then(
									'it should reject with validation error and message "No signature was provided."',
									then.itShouldRejectWithValidationErrorAndMessage,
								);
							},
						);
						When(
							'the action is called with the transaction and second public key',
							when.theActionIsCalledWithTheTransactionAndSecondPublicKey,
							() => {
								Then(
									'it should reject with validation error and message "No message was provided."',
									then.itShouldRejectWithValidationErrorAndMessage,
								);
							},
						);
						When(
							'the action is called with the transaction via vorpal stdIn and second public key as transaction',
							when.theActionIsCalledWithTheTransactionViaVorpalStdAndWithSecondPublicKeyAsTransaction,
							() => {
								Then(
									'it should reject with validation error and message "No message was provided."',
									then.itShouldRejectWithValidationErrorAndMessage,
								);
							},
						);
					},
				);
			},
		);
	});
});
