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
	Given('a Lisk API instance', given.aLiskAPIInstance, () => {
		Given(
			'a Vorpal instance with a UI and an active command that can prompt',
			given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt,
			() => {
				Given(
					'a public key "1b5a93c7622c666b0228236a70ee1a31407828b71bfb6daaa29a1509e87d4d3c"',
					given.aPublicKey,
					() => {
						Given('an action "update forging status"', given.anAction, () => {
							Given(
								'an options object with a password set to "randompassword"',
								given.anOptionsObjectWithPasswordSetTo,
								() => {
									Given(
										'the password can be retrived from its source',
										given.thePasswordCanBeRetrievedFromItsSource,
										() => {
											Given('a status "enable"', given.aStatus, () => {
												Given(
													'updateForgingStatus resolves successfully',
													given.updateForgingStatusResolvesSuccessfully,
													() => {
														When(
															'the action is called with the status and the public key and the options',
															when.theActionIsCalledWithTheStatusAndThePublicKeyAndTheOptions,
															() => {
																Then(
																	'it should resolve to the API response',
																	then.itShouldResolveToTheAPIResponse,
																);
																Then(
																	'updateForgingStatus should be called with the public key and the password and forging set to true',
																	then.updateForgingStatusShouldBeCalledWithThePublicKeyAndThePasswordAndForgingSetTo,
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
							Given(
								'a password "minute omit local rare sword knee banner pair rib museum shadow juice"',
								given.aPassword,
								() => {
									Given(
										'an empty options object',
										given.anEmptyOptionsObject,
										() => {
											Given('a status "random"', given.aStatus, () => {
												When(
													'the action is called with the status and the public key and the options',
													when.theActionIsCalledWithTheStatusAndThePublicKeyAndTheOptions,
													() => {
														Then(
															'it should reject error and message "Status must be either enable or disable."',
															then.itShouldRejectWithErrorAndMessage,
														);
													},
												);
											});
											Given('a status "enable"', given.aStatus, () => {
												Given(
													'the password can be retrived from its source',
													given.thePasswordCanBeRetrievedFromItsSource,
													() => {
														Given(
															'updateForgingStatus resolves successfully',
															given.updateForgingStatusResolvesSuccessfully,
															() => {
																When(
																	'the action is called with the status and the public key and the options',
																	when.theActionIsCalledWithTheStatusAndThePublicKeyAndTheOptions,
																	() => {
																		Then(
																			'updateForgingStatus should be called with the public key and the password and forging set to true',
																			then.updateForgingStatusShouldBeCalledWithThePublicKeyAndThePasswordAndForgingSetTo,
																		);
																		Then(
																			'it should resolve to the API response',
																			then.itShouldResolveToTheAPIResponse,
																		);
																	},
																);
															},
														);
														Given(
															'updateForgingStatus rejects with error',
															given.updateForgingStatusRejectsWithError,
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
													},
												);
											});
											Given('a status "disable"', given.aStatus, () => {
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
													'the password can be retrived from its source',
													given.thePasswordCanBeRetrievedFromItsSource,
													() => {
														When(
															'the action is called with the status and the public key and the options',
															when.theActionIsCalledWithTheStatusAndThePublicKeyAndTheOptions,
															() => {
																Then(
																	'updateForgingStatus should be called with the public key and the password and forging set to false',
																	then.updateForgingStatusShouldBeCalledWithThePublicKeyAndThePasswordAndForgingSetTo,
																);
																Then(
																	'it should resolve to the API Response',
																	then.itShouldResolveToTheAPIResponse,
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
			},
		);
	});
});
