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
import { setUpCommandUpdateForgingStatus } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('update forging status command', () => {
	beforeEach(setUpCommandUpdateForgingStatus);
	Given('a crypto instance', given.aCryptoInstance, () => {
		Given('a Lisk API Instance instance', given.aLiskAPIInstance, () => {
			Given(
				'a Vorpal instance with a UI and an active command that can prompt',
				given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt,
				() => {
					Given('an action "update forging status"', given.anAction, () => {
						Given(
							'a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"',
							given.aPassphrase,
							() => {
								Given(
									'an empty options object',
									given.anEmptyOptionsObject,
									() => {
										When(
											'the action is called with the status and the public key and the options',
											when.theActionIsCalledWithTheStatusAndThePublicKeyAndTheOptions,
											() => {
												Then(
													'it should reject with validation error and message "Status must be either enable or disable"',
													then.itShouldRejectWithValidationErrorAndMessage,
												);
											},
										);
										Given('a status "enable"', given.aStatus, () => {
											When(
												'the action is called with the status and the public key and the options',
												when.theActionIsCalledWithTheStatusAndThePublicKeyAndTheOptions,
												() => {
													Then(
														'it should reject with validation error and message "Public key must be a hex string"',
														then.itShouldRejectWithValidationErrorAndMessage,
													);
												},
											);
											Given(
												'a public key "randompublickey"',
												given.aPublicKey,
												() => {
													When(
														'the action is called with the status and the public key and the options',
														when.theActionIsCalledWithTheStatusAndThePublicKeyAndTheOptions,
														() => {
															Then(
																'it should reject with validation error and message "Public key must be a hex string"',
																then.itShouldRejectWithValidationErrorAndMessage,
															);
														},
													);
												},
											);
											Given(
												'a public key "314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588"',
												given.aPublicKey,
												() => {
													Given(
														'getForgingStatus resolves with the public key "non-existing public key"',
														given.getForgingStatusResolvesWithPublicKey,
														() => {
															Given(
																'updateForgingStatus resolvess successfully',
																given.updateForgingStatusResolvesSuccessfully,
																() => {
																	Given(
																		'the passphrase can be retrieved from its source',
																		given.thePassphraseCanBeRetrievedFromItsSource,
																		() => {
																			When(
																				'the action is called with the status and the public key and the options',
																				when.theActionIsCalledWithTheStatusAndThePublicKeyAndTheOptions,
																				() => {
																					Then(
																						'it should resolves to the API response',
																						then.itShouldResolveToTheAPIResponse,
																					);
																				},
																			);
																		},
																	);
																},
															);
														},
													);
													Given(
														'getForgingStatus resolves with the public key "314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588"',
														given.getForgingStatusResolvesWithPublicKey,
														() => {
															Given(
																'an error "Unknown data source type." occurs retrieving the inputs from their sources',
																given.anErrorOccursRetrievingTheInputsFromTheirSources,
																() => {
																	When(
																		'the action is called with the status and the public key and the options',
																		when.theActionIsCalledWithTheStatusAndThePublicKeyAndTheOptions,
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
																		'the action is called with the status and the public key and the options',
																		when.theActionIsCalledWithTheStatusAndThePublicKeyAndTheOptions,
																		() => {
																			Then(
																				'it should reject with error and message "The delegate is already enabled"',
																				then.itShouldRejectWithErrorAndMessage,
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
										Given('a status "disable"', given.aStatus, () => {
											Given(
												'a public key "314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc5"',
												given.aPublicKey,
												() => {
													Given(
														'updateForgingStatus resolvess successfully',
														given.updateForgingStatusResolvesSuccessfully,
														() => {
															Given(
																'the passphrase can be retrieved from its source',
																given.thePassphraseCanBeRetrievedFromItsSource,
																() => {
																	When(
																		'the action is called with the status and the public key and the options',
																		when.theActionIsCalledWithTheStatusAndThePublicKeyAndTheOptions,
																		() => {
																			Then(
																				'it should reject with error and message "There is no delegate enabled"',
																				then.itShouldRejectWithErrorAndMessage,
																			);
																		},
																	);
																},
															);
														},
													);
												},
											);
											Given(
												'a public key "314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588"',
												given.aPublicKey,
												() => {
													Given(
														'getForgingStatus resolves with the public key "314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad063010139aaaaaaaaaaaaaaaaaaa"',
														given.getForgingStatusResolvesWithPublicKey,
														() => {
															Given(
																'an error "Unknown data source type." occurs retrieving the inputs from their sources',
																given.anErrorOccursRetrievingTheInputsFromTheirSources,
																() => {
																	When(
																		'the action is called with the status and the public key and the options',
																		when.theActionIsCalledWithTheStatusAndThePublicKeyAndTheOptions,
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
																		'the action is called with the status and the public key and the options',
																		when.theActionIsCalledWithTheStatusAndThePublicKeyAndTheOptions,
																		() => {
																			Then(
																				'it should reject with error and message "There is no delegate enabled"',
																				then.itShouldRejectWithErrorAndMessage,
																			);
																		},
																	);
																},
															);
														},
													);
													Given(
														'getForgingStatus resolves with the public key "314852d7afb0d4c283692fef8a2cb40e30c7a5df2ed79994178c10ac168d6d977ef45cd525e95b7a86244bbd4eb4550914ad06301013958f4dd64d32ef7bc588"',
														given.getForgingStatusResolvesWithPublicKey,
														() => {
															Given(
																'the passphrase can be retrieved from its source',
																given.thePassphraseCanBeRetrievedFromItsSource,
																() => {
																	When(
																		'the action is called with the status and the public key and the options',
																		when.theActionIsCalledWithTheStatusAndThePublicKeyAndTheOptions,
																		() => {
																			Then(
																				'it should resolves to the API Response',
																				then.itShouldResolveToTheAPIResponse,
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
							},
						);
					});
				},
			);
		});
	});
});
