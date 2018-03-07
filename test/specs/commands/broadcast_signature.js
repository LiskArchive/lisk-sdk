/*
 * LiskHQ/lisk-commander
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
import { setUpCommandBroadcastSignature } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('broadcast signature command', () => {
	beforeEach(setUpCommandBroadcastSignature);
	Given('a Lisk API instance', given.aLiskAPIInstance, () => {
		Given('an action "broadcast signature"', given.anAction, () => {
			When('the action is called', when.theActionIsCalled, () => {
				Then(
					'it should not broadcast the signature',
					then.itShouldNotBroadcastTheSignature,
				);
				Then(
					'it should reject with validation error and message "No signature was provided."',
					then.itShouldRejectWithValidationErrorAndMessage,
				);
			});
			Given('an error object', given.anErrorObject, () => {
				When(
					'the action is called with the stringified error object via Vorpal stdin',
					when.theActionIsCalledWithTheStringifiedErrorObjectViaVorpalStdIn,
					() => {
						Then(
							'it should not broadcast the signature',
							then.itShouldNotBroadcastTheSignature,
						);
						Then(
							'it should resolve to the error object',
							then.itShouldResolveToTheErrorObject,
						);
					},
				);
			});
			Given(
				'a signature in table format',
				given.aSignatureInTableFormat,
				() => {
					When(
						'the action is called with the signature',
						when.theActionIsCalledWithTheSignature,
						() => {
							Then(
								'it should not broadcast the signature',
								then.itShouldNotBroadcastTheSignature,
							);
							Then(
								'it should reject with validation error and message "Could not parse signature JSON. Did you use the `--json` option?"',
								then.itShouldRejectWithValidationErrorAndMessage,
							);
						},
					);
					When(
						'the action is called with the signature via Vorpal stdin',
						when.theActionIsCalledWithTheSignatureViaVorpalStdIn,
						() => {
							Then(
								'it should not broadcast the signature',
								then.itShouldNotBroadcastTheSignature,
							);
							Then(
								'it should reject with validation error and message "Could not parse signature JSON. Did you use the `--json` option?"',
								then.itShouldRejectWithValidationErrorAndMessage,
							);
						},
					);
				},
			);
			Given(
				'a signature in stringified JSON format',
				given.aSignatureInStringifiedJSONFormat,
				() => {
					When(
						'the action is called with the signature',
						when.theActionIsCalledWithTheSignature,
						() => {
							Then(
								'it should broadcast the signature',
								then.itShouldBroadcastTheSignature,
							);
							Then(
								'it should resolve to the API response',
								then.itShouldResolveToTheAPIResponse,
							);
						},
					);
					When(
						'the action is called with the signature via Vorpal stdin',
						when.theActionIsCalledWithTheSignatureViaVorpalStdIn,
						() => {
							Then(
								'it should broadcast the signature',
								then.itShouldBroadcastTheSignature,
							);
							Then(
								'it should resolve to the API response',
								then.itShouldResolveToTheAPIResponse,
							);
						},
					);
					Given('an error object', given.anErrorObject, () => {
						When(
							'the action is called with the signature and the stringified error object via Vorpal stdin',
							when.theActionIsCalledWithTheSignatureAndTheStringifiedErrorObjectViaVorpalStdIn,
							() => {
								Then(
									'it should broadcast the signature',
									then.itShouldBroadcastTheSignature,
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
