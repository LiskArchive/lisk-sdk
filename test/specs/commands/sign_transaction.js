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
import { setUpCommandSignTransaction } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('sign transaction command', () => {
	beforeEach(setUpCommandSignTransaction);
	Given('an action "sign transaction"', given.anAction, () => {
		Given(
			'a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"',
			given.aPassphrase,
			() => {
				Given(
					'a transaction in stringified JSON format',
					given.aTransactionInStringifiedJSONFormat,
					() => {
						Given(
							'vorpal is in interactive mode',
							given.vorpalIsInInteractiveMode,
							() => {
								When('the action is called', when.theActionIsCalled, () => {
									Then(
										'it should reject with validation error and message "No transaction was provided."',
										then.itShouldRejectWithValidationErrorAndMessage,
									);
								});
							},
						);
						Given('an error object', given.anErrorObject, () => {
							When(
								'the action is called with the stringified transaction object',
								when.theActionIsCalledWithTheStringifiedErrorObjectViaVorpalStdIn,
								() => {
									Then(
										'it should reject with the error and message "Some error."',
										then.itShouldRejectWithTheErrorMessage,
									);
								},
							);
						});
						Given(
							'the passphrase can be retrieved from its source',
							given.thePassphraseCanBeRetrievedFromItsSource,
							() => {
								Given(
									'vorpal is in non interactive mode',
									given.vorpalIsInNonInteractiveMode,
									() => {
										Given(
											'the transaction is provided via stdIn',
											given.theTransactionIsProvidedViaStdIn,
											() => {
												When(
													'the action is called with the stringified transaction object',
													when.theActionIsCalledWithTheStringifiedTransactionObject,
													() => {
														Then(
															'it should call prepareTransaction with the transaction and the passphrase',
															then.itShouldCallPrepareTransactionWithTheTransactionAndThePassphrase,
														);
													},
												);
											},
										);
									},
								);
								When('the action is called', when.theActionIsCalled, () => {
									Then(
										'it should reject with validation error and message "No transaction was provided."',
										then.itShouldRejectWithValidationErrorAndMessage,
									);
								});
								When(
									'the action is called with the corrupted stringified transaction object',
									when.theActionIsCalledWithTheCorruptedStringifiedTransactionObject,
									() => {
										Then(
											'it should reject with validation error and message "Could not parse transaction JSON."',
											then.itShouldRejectWithValidationErrorAndMessage,
										);
									},
								);
								When(
									'the action is called with the stringified transaction object',
									when.theActionIsCalledWithTheStringifiedTransactionObject,
									() => {
										Then(
											'it should call prepareTransaction with the transaction and the passphrase',
											then.itShouldCallPrepareTransactionWithTheTransactionAndThePassphrase,
										);
									},
								);
								When(
									'the action is called with the stringified transaction object via vorpal stdIn',
									when.theActionIsCalledWithTheStringifiedTransactionObjectViaVorpalStdIn,
									() => {
										Then(
											'it should call prepareTransaction with the transaction and the passphrase',
											then.itShouldCallPrepareTransactionWithTheTransactionAndThePassphrase,
										);
									},
								);
								When(
									'the action is called with the stringified transaction object and options',
									when.theActionIsCalledWithTheStringifiedTransactionObjectAndOptions,
									() => {
										Then(
											'it should call prepareTransaction with the transaction and the passphrase',
											then.itShouldCallPrepareTransactionWithTheTransactionAndThePassphrase,
										);
									},
								);
								When(
									'the action is called with the stringified transaction object via vorpal stdIn and options',
									when.theActionIsCalledWithTheStringifiedTransactionObjectViaVorpalStdInAndOptions,
									() => {
										Then(
											'it should call prepareTransaction with the transaction and the passphrase',
											then.itShouldCallPrepareTransactionWithTheTransactionAndThePassphrase,
										);
									},
								);
								Given(
									'a second passphrase "fame spoil quiz garbage mirror envelope island rapid lend year bike adapt"',
									given.aSecondPassphrase,
									() => {
										Given(
											'an options object with second passphrase set to "secondPassphraseSource"',
											given.anOptionsObjectWithSecondPassphraseSetTo,
											() => {
												Given(
													'an error "Unknown data source type." occurs retrieving the inputs from their sources',
													given.anErrorOccursRetrievingTheInputsFromTheirSources,
													() => {
														When(
															'the action is called with the stringified transaction object and options',
															when.theActionIsCalledWithTheStringifiedTransactionObjectAndOptions,
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
													'the passphrase and second passphrase can be retrieved from their sources',
													given.thePassphraseAndSecondPassphraseCanBeRetrievedFromTheirSources,
													() => {
														When(
															'the action is called with the stringified transaction object and options',
															when.theActionIsCalledWithTheStringifiedTransactionObjectAndOptions,
															() => {
																Then(
																	'it should call prepareTransaction with the transaction and the passphrase and the second passphrase',
																	then.itShouldCallPrepareTransactionWithTheTransactionAndThePassphraseAndTheSecondPassphrase,
																);
															},
														);
														When(
															'the action is called with the stringified transaction object via vorpal stdIn and options',
															when.theActionIsCalledWithTheStringifiedTransactionObjectViaVorpalStdInAndOptions,
															() => {
																Then(
																	'it should call prepareTransaction with the transaction and the passphrase and the second passphrase',
																	then.itShouldCallPrepareTransactionWithTheTransactionAndThePassphraseAndTheSecondPassphrase,
																);
															},
														);
													},
												);
											},
										);
										Given(
											'an options object with passphrase set to "passphraseSource" and second passphrase set to "secondPassphraseSource"',
											given.anOptionsObjectWithPassphraseSetToAndSecondPassphraseSetTo,
											() => {
												Given(
													'the passphrase and second passphrase can be retrieved from their sources',
													given.thePassphraseAndSecondPassphraseCanBeRetrievedFromTheirSources,
													() => {
														When(
															'the action is called with the stringified transaction object and options',
															when.theActionIsCalledWithTheStringifiedTransactionObjectAndOptions,
															() => {
																Then(
																	'it should call prepareTransaction with the transaction and the passphrase and the second passphrase',
																	then.itShouldCallPrepareTransactionWithTheTransactionAndThePassphraseAndTheSecondPassphrase,
																);
															},
														);
														When(
															'the action is called with the stringified transaction object via vorpal stdIn and options',
															when.theActionIsCalledWithTheStringifiedTransactionObjectViaVorpalStdInAndOptions,
															() => {
																Then(
																	'it should call prepareTransaction with the transaction and the passphrase and the second passphrase',
																	then.itShouldCallPrepareTransactionWithTheTransactionAndThePassphraseAndTheSecondPassphrase,
																);
															},
														);
													},
												);
											},
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
});
