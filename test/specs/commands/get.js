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
import { setUpCommandGet } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('get command', () => {
	beforeEach(setUpCommandGet);
	Given('an action "get"', given.anAction, () => {
		Given('an options object', given.anOptionsObject, () => {
			Given('an unknown type "random"', given.anUnknownType, () => {
				Given('an input "13133549779353512613L"', given.anInput, () => {
					When(
						'the action is called with the type, the input and the options',
						when.theActionIsCalledWithTheTypeTheInputAndTheOptions,
						() => {
							Then(
								'it should reject with validation error and message "Unsupported type."',
								then.itShouldRejectWithValidationErrorAndMessage,
							);
						},
					);
				});
			});
			Given('a type "account"', given.aType, () => {
				Given('an input "13133549779353512613L"', given.anInput, () => {
					When(
						'the action is called with the type, the input and the options',
						when.theActionIsCalledWithTheTypeTheInputAndTheOptions,
						() => {
							Then(
								'it should resolve to the result of the query',
								then.itShouldResolveToTheResultOfTheQuery,
							);
						},
					);
				});
			});
			Given('a type "address"', given.aType, () => {
				Given('an input "13133549779353512613L"', given.anInput, () => {
					When(
						'the action is called with the type, the input and the options',
						when.theActionIsCalledWithTheTypeTheInputAndTheOptions,
						() => {
							Then(
								'it should resolve to the result of the query',
								then.itShouldResolveToTheResultOfTheQuery,
							);
						},
					);
				});
			});
			Given('a type "block"', given.aType, () => {
				Given('an input "3641049113933914102"', given.anInput, () => {
					When(
						'the action is called with the type, the input and the options',
						when.theActionIsCalledWithTheTypeTheInputAndTheOptions,
						() => {
							Then(
								'it should resolve to the result of the query',
								then.itShouldResolveToTheResultOfTheQuery,
							);
						},
					);
				});
			});
			Given('a type "delegate"', given.aType, () => {
				Given('an input "lightcurve"', given.anInput, () => {
					When(
						'the action is called with the type, the input and the options',
						when.theActionIsCalledWithTheTypeTheInputAndTheOptions,
						() => {
							Then(
								'it should resolve to the result of the query',
								then.itShouldResolveToTheResultOfTheQuery,
							);
						},
					);
				});
			});
			Given('a type "transaction"', given.aType, () => {
				Given('an input "16388447461355055139"', given.anInput, () => {
					When(
						'the action is called with the type, the input and the options',
						when.theActionIsCalledWithTheTypeTheInputAndTheOptions,
						() => {
							Then(
								'it should resolve to the result of the query',
								then.itShouldResolveToTheResultOfTheQuery,
							);
						},
					);
				});
			});
		});
	});
});
