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
import { setUpCommandShowAccount } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('show account command', () => {
	beforeEach(setUpCommandShowAccount);
	Given('a crypto instance', given.aCryptoInstance, () => {
		Given(
			'a Vorpal instance with a UI and an active command that can prompt',
			given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt,
			() => {
				Given('an action "show account"', given.anAction, () => {
					Given(
						'a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice" with private key "314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588" and public key "7ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588" and address "2167422481642255385L"',
						given.aPassphraseWithPrivateKeyAndPublicKeyAndAddress,
						() => {
							Given(
								'an options object with passphrase set to "passphraseSource"',
								given.anOptionsObjectWithPassphraseSetTo,
								() => {
									Given(
										'an error "Unknown data source type." occurs retrieving the inputs from their sources',
										given.anErrorOccursRetrievingTheInputsFromTheirSources,
										() => {
											When(
												'the action is called with the options',
												when.theActionIsCalledWithTheOptions,
												() => {
													Then(
														'it should reject with the error message',
														then.itShouldRejectWithTheErrorMessage,
													);
												},
											);
										},
									);
									Given(
										'the passphrase can be retrieved from its source',
										given.thePassphraseCanBeRetrievedFromItsSource,
										() => {
											When(
												'the action is called with the options',
												when.theActionIsCalledWithTheOptions,
												() => {
													Then(
														'it should get the inputs from sources using the Vorpal instance',
														then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance,
													);
													Then(
														'it should get the inputs from sources using the passphrase source with a repeating prompt',
														then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt,
													);
													Then(
														'it should resolve to an object with the private key, the public key and the address',
														then.itShouldResolveToAnObjectWithThePrivateKeyThePublicKeyAndTheAddress,
													);
												},
											);
										},
									);
								},
							);
							Given(
								'an empty options object',
								given.anEmptyOptionsObject,
								() => {
									Given(
										'an error "Unknown data source type." occurs retrieving the inputs from their sources',
										given.anErrorOccursRetrievingTheInputsFromTheirSources,
										() => {
											When(
												'the action is called with the options',
												when.theActionIsCalledWithTheOptions,
												() => {
													Then(
														'it should reject with the error message',
														then.itShouldRejectWithTheErrorMessage,
													);
												},
											);
										},
									);
									Given(
										'the passphrase can be retrieved from its source',
										given.thePassphraseCanBeRetrievedFromItsSource,
										() => {
											When(
												'the action is called with the options',
												when.theActionIsCalledWithTheOptions,
												() => {
													Then(
														'it should get the inputs from sources using the Vorpal instance',
														then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance,
													);
													Then(
														'it should get the inputs from sources using the passphrase source with a repeating prompt',
														then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt,
													);
													Then(
														'it should resolve to an object with the private key, the public key and the address',
														then.itShouldResolveToAnObjectWithThePrivateKeyThePublicKeyAndTheAddress,
													);
												},
											);
										},
									);
								},
							);
						},
					);
				});
			},
		);
	});
});
