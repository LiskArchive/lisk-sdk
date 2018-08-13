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
import { setUpCommandVerifyTransaction } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('verify transaction command', () => {
	beforeEach(setUpCommandVerifyTransaction);
	Given('an action "verify transaction"', given.anAction, () => {
		Given(
			'a transaction in stringified JSON format',
			given.aTransactionInStringifiedJSONFormat,
			() => {
				Given(
					'getData rejects with ValidationError "File not found."',
					given.getDataRejectsWithValidationError,
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
													'it should resolve to result of successfully verifying transaction"',
													then.itShouldResolveToResultOfSuccessfullyVerifyingTransaction,
												);
												Then(
													'it should call VerifyTransaction with the transaction',
													then.itShouldCallVerifyTransactionWithTheTransaction,
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
							'the action is called with the stringified error object via vorpal stdIn',
							when.theActionIsCalledWithTheStringifiedErrorObjectViaVorpalStdIn,
							() => {
								Then(
									'it should reject with validation error and message "No transaction was provided."',
									then.itShouldRejectWithValidationErrorAndMessage,
								);
							},
						);
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
									'it should resolve to result of successfully verifying transaction"',
									then.itShouldResolveToResultOfSuccessfullyVerifyingTransaction,
								);
								Then(
									'it should call VerifyTransaction with the transaction',
									then.itShouldCallVerifyTransactionWithTheTransaction,
								);
							},
						);
						When(
							'the action is called with the stringified transaction object via vorpal stdIn',
							when.theActionIsCalledWithTheStringifiedTransactionObjectViaVorpalStdIn,
							() => {
								Then(
									'it should resolve to result of successfully verifying transaction"',
									then.itShouldResolveToResultOfSuccessfullyVerifyingTransaction,
								);
								Then(
									'it should call VerifyTransaction with the transaction',
									then.itShouldCallVerifyTransactionWithTheTransaction,
								);
							},
						);
					},
				);
				Given(
					'an options object with secondPublicKey set to "790049f919979d5ea42cca7b7aa0812cbae8f0db3ee39c1fe3cef18e25b67951"',
					given.anOptionsObjectWithSecondPublicKeySetTo,
					() => {
						When(
							'the action is called with the transaction and options object contains second public key as file input',
							when.theActionIsCalledWithTheTransactionAndOptionsObjectContainsSecondPublicKeyAsFileInput,
							() => {
								Then(
									'it should resolve to result of successfully verifying transaction"',
									then.itShouldResolveToResultOfSuccessfullyVerifyingTransaction,
								);
								Then(
									'it should call VerifyTransaction with the transaction and second public key',
									then.itShouldCallVerifyTransactionWithTheTransactionAndSecondPublicKey,
								);
							},
						);
						When(
							'the action is called with the transaction via vorpal stdIn and options object contains second public key',
							when.theActionIsCalledWithTheTransactionViaVorpalStdInAndOptionsObjectContainsSecondPublicKey,
							() => {
								Then(
									'it should resolve to result of successfully verifying transaction"',
									then.itShouldResolveToResultOfSuccessfullyVerifyingTransaction,
								);
								Then(
									'it should call VerifyTransaction with the transaction and second public key',
									then.itShouldCallVerifyTransactionWithTheTransactionAndSecondPublicKey,
								);
							},
						);
					},
				);
				Given(
					'an options object with secondPublicKey set to "file:sample.txt"',
					given.anOptionsObjectWithSecondPublicKeySetTo,
					() => {
						Given(
							'getData resolves with "790049f919979d5ea42cca7b7aa0812cbae8f0db3ee39c1fe3cef18e25b67951"',
							given.getDataResolvesWith,
							() => {
								When(
									'the action is called with the transaction and options object contains second public key as file input',
									when.theActionIsCalledWithTheTransactionAndOptionsObjectContainsSecondPublicKeyAsFileInput,
									() => {
										Then(
											'it should resolve to result of successfully verifying transaction"',
											then.itShouldResolveToResultOfSuccessfullyVerifyingTransaction,
										);
										Then(
											'it should call VerifyTransaction with the transaction and second public key supplied by data',
											then.itShouldCallVerifyTransactionWithTheTransactionAndSecondPublicKeySuppliedByData,
										);
									},
								);
								When(
									'the action is called with the transaction via vorpal stdIn and options object contains second public key',
									when.theActionIsCalledWithTheTransactionViaVorpalStdInAndOptionsObjectContainsSecondPublicKey,
									() => {
										Then(
											'it should resolve to result of successfully verifying transaction"',
											then.itShouldResolveToResultOfSuccessfullyVerifyingTransaction,
										);
										Then(
											'it should call VerifyTransaction with the transaction and second public key supplied by data',
											then.itShouldCallVerifyTransactionWithTheTransactionAndSecondPublicKeySuppliedByData,
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
