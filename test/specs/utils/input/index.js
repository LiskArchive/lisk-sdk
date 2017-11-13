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
import { setUpUtilInput } from '../../../steps/setup';
import * as given from '../../../steps/1_given';
import * as when from '../../../steps/2_when';
import * as then from '../../../steps/3_then';

describe('input utils', () => {
	describe('#getFirstLineFromString', () => {
		describe('Given there is no string available', () => {
			beforeEach(given.thereIsNoStringAvailable);
			describe('When getFirstLineFromString is called on the string', () => {
				beforeEach(when.getFirstLineFromStringIsCalledOnTheString);
				it('Then it should return null', then.itShouldReturnNull);
			});
		});
		describe('Given there is a string "This is some text\nthat spans\nmultiple lines"', () => {
			beforeEach(given.thereIsAString);
			describe('When getFirstLineFromString is called on the string', () => {
				beforeEach(when.getFirstLineFromStringIsCalledOnTheString);
				it('Then it should return string "This is some text"', then.itShouldReturnString);
			});
		});
	});
	describe('#getInputsFromSource', () => {
		beforeEach(setUpUtilInput);
		describe('Given a Vorpal instance with an active command that can log', () => {
			beforeEach(given.aVorpalInstanceWithAnActiveCommandThatCanLog);
			describe('Given a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"', () => {
				beforeEach(given.aPassphrase);
				describe('Given a second passphrase "fame spoil quiz garbage mirror envelope island rapid lend year bike adapt"', () => {
					beforeEach(given.aSecondPassphrase);
					describe('Given a password "testing123"', () => {
						beforeEach(given.aPassword);
						describe('Given some data "This is some text\nthat spans\nmultiple lines"', () => {
							beforeEach(given.someData);
							describe('Given an empty options object', () => {
								beforeEach(given.anEmptyOptionsObject);
								describe('When getInputsFromSources is called with the Vorpal instance and the options', () => {
									beforeEach(when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions);
									it('Then it should not ask for the passphrase from stdIn', then.itShouldNotAskForThePassphraseFromStdIn);
									it('Then it should not ask for the second passphrase from stdIn', then.itShouldNotAskForTheSecondPassphraseFromStdIn);
									it('Then it should not ask for the password from stdIn', then.itShouldNotAskForThePasswordFromStdIn);
									it('Then it should not ask for the data from stdIn', then.itShouldNotAskForTheDataFromStdIn);
									it('Then it should not get the passphrase', then.itShouldNotGetThePassphrase);
									it('Then it should not get the second passphrase', then.itShouldNotGetTheSecondPassphrase);
									it('Then it should not get the password', then.itShouldNotGetThePassword);
									it('Then it should not get the data', then.itShouldNotGetTheData);
									it('Then it should resolve without the passphrase', then.itShouldResolveWithoutThePassphrase);
									it('Then it should resolve without the second passphrase', then.itShouldResolveWithoutTheSecondPassphrase);
									it('Then it should resolve without the password', then.itShouldResolveWithoutThePassword);
									it('Then it should resolve without the data', then.itShouldResolveWithoutTheData);
								});
							});
							describe('Given an options object', () => {
								beforeEach(given.anOptionsObject);
								describe('passphrase option', () => {
									describe('Given the options object has a "passphrase" field', () => {
										beforeEach(given.theOptionsObjectHasAField);
										describe('Given the passphrase is available from the source', () => {
											beforeEach(given.thePassphraseIsAvailableFromTheSource);
											describe('When getInputsFromSources is called with the Vorpal instance and the options', () => {
												beforeEach(when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions);
												it('Then it should not ask for the passphrase from stdIn', then.itShouldNotAskForThePassphraseFromStdIn);
												it('Then it should not ask for the second passphrase from stdIn', then.itShouldNotAskForTheSecondPassphraseFromStdIn);
												it('Then it should not ask for the password from stdIn', then.itShouldNotAskForThePasswordFromStdIn);
												it('Then it should not ask for the data from stdIn', then.itShouldNotAskForTheDataFromStdIn);
												it('Then it should get the passphrase with a single prompt', then.itShouldGetThePassphraseWithASinglePrompt);
												it('Then it should not get the second passphrase', then.itShouldNotGetTheSecondPassphrase);
												it('Then it should not get the password', then.itShouldNotGetThePassword);
												it('Then it should not get the data', then.itShouldNotGetTheData);
												it('Then it should resolve with the passphrase', then.itShouldResolveWithThePassphrase);
												it('Then it should resolve without the second passphrase', then.itShouldResolveWithoutTheSecondPassphrase);
												it('Then it should resolve without the password', then.itShouldResolveWithoutThePassword);
												it('Then it should resolve without the data', then.itShouldResolveWithoutTheData);
											});
										});
									});
									describe('Given the options object has a "passphrase" field with key "repeatPrompt" set to boolean true', () => {
										beforeEach(given.theOptionsObjectHasAFieldWithKeySetToBoolean);
										describe('Given the passphrase is available from the source', () => {
											beforeEach(given.thePassphraseIsAvailableFromTheSource);
											describe('When getInputsFromSources is called with the Vorpal instance and the options', () => {
												beforeEach(when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions);
												it('Then it should not ask for the passphrase from stdIn', then.itShouldNotAskForThePassphraseFromStdIn);
												it('Then it should not ask for the second passphrase from stdIn', then.itShouldNotAskForTheSecondPassphraseFromStdIn);
												it('Then it should not ask for the password from stdIn', then.itShouldNotAskForThePasswordFromStdIn);
												it('Then it should not ask for the data from stdIn', then.itShouldNotAskForTheDataFromStdIn);
												it('Then it should get the passphrase with a repeated prompt', then.itShouldGetThePassphraseWithARepeatedPrompt);
												it('Then it should not get the second passphrase', then.itShouldNotGetTheSecondPassphrase);
												it('Then it should not get the password', then.itShouldNotGetThePassword);
												it('Then it should not get the data', then.itShouldNotGetTheData);
												it('Then it should resolve with the passphrase', then.itShouldResolveWithThePassphrase);
												it('Then it should resolve without the second passphrase', then.itShouldResolveWithoutTheSecondPassphrase);
												it('Then it should resolve without the password', then.itShouldResolveWithoutThePassword);
												it('Then it should resolve without the data', then.itShouldResolveWithoutTheData);
											});
										});
									});
									describe('Given the options object has a "passphrase" field with key "source" set to string "file:/path/to/passphrase.txt"', () => {
										beforeEach(given.theOptionsObjectHasAFieldWithKeySetToString);
										describe('Given the passphrase is available from the source', () => {
											beforeEach(given.thePassphraseIsAvailableFromTheSource);
											describe('When getInputsFromSources is called with the Vorpal instance and the options', () => {
												beforeEach(when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions);
												it('Then it should not ask for the passphrase from stdIn', then.itShouldNotAskForThePassphraseFromStdIn);
												it('Then it should not ask for the second passphrase from stdIn', then.itShouldNotAskForTheSecondPassphraseFromStdIn);
												it('Then it should not ask for the password from stdIn', then.itShouldNotAskForThePasswordFromStdIn);
												it('Then it should not ask for the data from stdIn', then.itShouldNotAskForTheDataFromStdIn);
												it('Then it should get the passphrase', then.itShouldGetThePassphrase);
												it('Then it should not get the second passphrase', then.itShouldNotGetTheSecondPassphrase);
												it('Then it should not get the password', then.itShouldNotGetThePassword);
												it('Then it should not get the data', then.itShouldNotGetTheData);
												it('Then it should resolve with the passphrase', then.itShouldResolveWithThePassphrase);
												it('Then it should resolve without the second passphrase', then.itShouldResolveWithoutTheSecondPassphrase);
												it('Then it should resolve without the password', then.itShouldResolveWithoutThePassword);
												it('Then it should resolve without the data', then.itShouldResolveWithoutTheData);
											});
										});
									});
									describe('Given the options object has a "passphrase" field with key "source" set to string "stdin"', () => {
										beforeEach(given.theOptionsObjectHasAFieldWithKeySetToString);
										describe('Given the passphrase is provided via stdIn', () => {
											beforeEach(given.thePassphraseIsProvidedViaStdIn);
											describe('When getInputsFromSources is called with the Vorpal instance and the options', () => {
												beforeEach(when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions);
												it('Then it should ask for the passphrase from stdIn', then.itShouldAskForThePassphraseFromStdIn);
												it('Then it should not ask for the second passphrase from stdIn', then.itShouldNotAskForTheSecondPassphraseFromStdIn);
												it('Then it should not ask for the password from stdIn', then.itShouldNotAskForThePasswordFromStdIn);
												it('Then it should not ask for the data from stdIn', then.itShouldNotAskForTheDataFromStdIn);
												it('Then it should not get the passphrase', then.itShouldNotGetThePassphrase);
												it('Then it should not get the second passphrase', then.itShouldNotGetTheSecondPassphrase);
												it('Then it should not get the password', then.itShouldNotGetThePassword);
												it('Then it should not get the data', then.itShouldNotGetTheData);
												it('Then it should resolve with the passphrase', then.itShouldResolveWithThePassphrase);
												it('Then it should resolve without the second passphrase', then.itShouldResolveWithoutTheSecondPassphrase);
												it('Then it should resolve without the password', then.itShouldResolveWithoutThePassword);
												it('Then it should resolve without the data', then.itShouldResolveWithoutTheData);
											});
										});
									});
								});
								describe('second passphrase option', () => {
									describe('Given the options object has a "secondPassphrase" field', () => {
										beforeEach(given.theOptionsObjectHasAField);
										describe('Given the second passphrase is available from the source', () => {
											beforeEach(given.theSecondPassphraseIsAvailableFromTheSource);
											describe('When getInputsFromSources is called with the Vorpal instance and the options', () => {
												beforeEach(when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions);
												it('Then it should not ask for the passphrase from stdIn', then.itShouldNotAskForThePassphraseFromStdIn);
												it('Then it should not ask for the second passphrase from stdIn', then.itShouldNotAskForTheSecondPassphraseFromStdIn);
												it('Then it should not ask for the password from stdIn', then.itShouldNotAskForThePasswordFromStdIn);
												it('Then it should not ask for the data from stdIn', then.itShouldNotAskForTheDataFromStdIn);
												it('Then it should not get the passphrase', then.itShouldNotGetThePassphrase);
												it('Then it should get the second passphrase with a single prompt', then.itShouldGetTheSecondPassphraseWithASinglePrompt);
												it('Then it should not get the password', then.itShouldNotGetThePassword);
												it('Then it should not get the data', then.itShouldNotGetTheData);
												it('Then it should resolve without the passphrase', then.itShouldResolveWithoutThePassphrase);
												it('Then it should resolve with the second passphrase', then.itShouldResolveWithTheSecondPassphrase);
												it('Then it should resolve without the password', then.itShouldResolveWithoutThePassword);
												it('Then it should resolve without the data', then.itShouldResolveWithoutTheData);
											});
										});
									});
									describe('Given the options object has a "secondPassphrase" field with key "repeatPrompt" set to boolean true', () => {
										beforeEach(given.theOptionsObjectHasAFieldWithKeySetToBoolean);
										describe('Given the second passphrase is available from the source', () => {
											beforeEach(given.theSecondPassphraseIsAvailableFromTheSource);
											describe('When getInputsFromSources is called with the Vorpal instance and the options', () => {
												beforeEach(when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions);
												it('Then it should not ask for the passphrase from stdIn', then.itShouldNotAskForThePassphraseFromStdIn);
												it('Then it should not ask for the second passphrase from stdIn', then.itShouldNotAskForTheSecondPassphraseFromStdIn);
												it('Then it should not ask for the password from stdIn', then.itShouldNotAskForThePasswordFromStdIn);
												it('Then it should not ask for the data from stdIn', then.itShouldNotAskForTheDataFromStdIn);
												it('Then it should not get the passphrase', then.itShouldNotGetThePassphrase);
												it('Then it should get the second passphrase with a repeated prompt', then.itShouldGetTheSecondPassphraseWithARepeatedPrompt);
												it('Then it should not get the password', then.itShouldNotGetThePassword);
												it('Then it should not get the data', then.itShouldNotGetTheData);
												it('Then it should resolve without the passphrase', then.itShouldResolveWithoutThePassphrase);
												it('Then it should resolve with the second passphrase', then.itShouldResolveWithTheSecondPassphrase);
												it('Then it should resolve without the password', then.itShouldResolveWithoutThePassword);
												it('Then it should resolve without the data', then.itShouldResolveWithoutTheData);
											});
										});
									});
									describe('Given the options object has a "secondPassphrase" field with key "source" set to string "file:/path/to/passphrase.txt"', () => {
										beforeEach(given.theOptionsObjectHasAFieldWithKeySetToString);
										describe('Given the second passphrase is available from the source', () => {
											beforeEach(given.theSecondPassphraseIsAvailableFromTheSource);
											describe('When getInputsFromSources is called with the Vorpal instance and the options', () => {
												beforeEach(when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions);
												it('Then it should not ask for the passphrase from stdIn', then.itShouldNotAskForThePassphraseFromStdIn);
												it('Then it should not ask for the second passphrase from stdIn', then.itShouldNotAskForTheSecondPassphraseFromStdIn);
												it('Then it should not ask for the password from stdIn', then.itShouldNotAskForThePasswordFromStdIn);
												it('Then it should not ask for the data from stdIn', then.itShouldNotAskForTheDataFromStdIn);
												it('Then it should not get the passphrase', then.itShouldNotGetThePassphrase);
												it('Then it should get the second passphrase', then.itShouldGetTheSecondPassphrase);
												it('Then it should not get the password', then.itShouldNotGetThePassword);
												it('Then it should not get the data', then.itShouldNotGetTheData);
												it('Then it should resolve without the passphrase', then.itShouldResolveWithoutThePassphrase);
												it('Then it should resolve with the second passphrase', then.itShouldResolveWithTheSecondPassphrase);
												it('Then it should resolve without the password', then.itShouldResolveWithoutThePassword);
												it('Then it should resolve without the data', then.itShouldResolveWithoutTheData);
											});
										});
									});
									describe('Given the options object has a "secondPassphrase" field with key "source" set to string "stdin"', () => {
										beforeEach(given.theOptionsObjectHasAFieldWithKeySetToString);
										describe('Given the second passphrase is provided via stdIn', () => {
											beforeEach(given.theSecondPassphraseIsProvidedViaStdIn);
											describe('When getInputsFromSources is called with the Vorpal instance and the options', () => {
												beforeEach(when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions);
												it('Then it should not ask for the passphrase from stdIn', then.itShouldNotAskForThePassphraseFromStdIn);
												it('Then it should ask for the second passphrase from stdIn', then.itShouldAskForTheSecondPassphraseFromStdIn);
												it('Then it should not ask for the password from stdIn', then.itShouldNotAskForThePasswordFromStdIn);
												it('Then it should not ask for the data from stdIn', then.itShouldNotAskForTheDataFromStdIn);
												it('Then it should not get the passphrase', then.itShouldNotGetThePassphrase);
												it('Then it should not get the second passphrase', then.itShouldNotGetTheSecondPassphrase);
												it('Then it should not get the password', then.itShouldNotGetThePassword);
												it('Then it should not get the data', then.itShouldNotGetTheData);
												it('Then it should resolve without the passphrase', then.itShouldResolveWithoutThePassphrase);
												it('Then it should resolve with the second passphrase', then.itShouldResolveWithTheSecondPassphrase);
												it('Then it should resolve without the password', then.itShouldResolveWithoutThePassword);
												it('Then it should resolve without the data', then.itShouldResolveWithoutTheData);
											});
										});
									});
								});
								describe('password option', () => {
									describe('Given the options object has a "password" field', () => {
										beforeEach(given.theOptionsObjectHasAField);
										describe('Given the password is available from the source', () => {
											beforeEach(given.thePasswordIsAvailableFromTheSource);
											describe('When getInputsFromSources is called with the Vorpal instance and the options', () => {
												beforeEach(when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions);
												it('Then it should not ask for the passphrase from stdIn', then.itShouldNotAskForThePassphraseFromStdIn);
												it('Then it should not ask for the second passphrase from stdIn', then.itShouldNotAskForTheSecondPassphraseFromStdIn);
												it('Then it should not ask for the password from stdIn', then.itShouldNotAskForThePasswordFromStdIn);
												it('Then it should not ask for the data from stdIn', then.itShouldNotAskForTheDataFromStdIn);
												it('Then it should not get the passphrase', then.itShouldNotGetThePassphrase);
												it('Then it should not get the second passphrase', then.itShouldNotGetTheSecondPassphrase);
												it('Then it should get the password with a single prompt', then.itShouldGetThePasswordWithASinglePrompt);
												it('Then it should not get the data', then.itShouldNotGetTheData);
												it('Then it should resolve without the passphrase', then.itShouldResolveWithoutThePassphrase);
												it('Then it should resolve without the second passphrase', then.itShouldResolveWithoutTheSecondPassphrase);
												it('Then it should resolve with the password', then.itShouldResolveWithThePassword);
												it('Then it should resolve without the data', then.itShouldResolveWithoutTheData);
											});
										});
									});
									describe('Given the options object has a "password" field with key "repeatPrompt" set to boolean true', () => {
										beforeEach(given.theOptionsObjectHasAFieldWithKeySetToBoolean);
										describe('Given the password is available from the source', () => {
											beforeEach(given.thePasswordIsAvailableFromTheSource);
											describe('When getInputsFromSources is called with the Vorpal instance and the options', () => {
												beforeEach(when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions);
												it('Then it should not ask for the passphrase from stdIn', then.itShouldNotAskForThePassphraseFromStdIn);
												it('Then it should not ask for the second passphrase from stdIn', then.itShouldNotAskForTheSecondPassphraseFromStdIn);
												it('Then it should not ask for the password from stdIn', then.itShouldNotAskForThePasswordFromStdIn);
												it('Then it should not ask for the data from stdIn', then.itShouldNotAskForTheDataFromStdIn);
												it('Then it should not get the passphrase', then.itShouldNotGetThePassphrase);
												it('Then it should not get the second passphrase', then.itShouldNotGetTheSecondPassphrase);
												it('Then it should get the password with a repeated prompt', then.itShouldGetThePasswordWithARepeatedPrompt);
												it('Then it should not get the data', then.itShouldNotGetTheData);
												it('Then it should resolve without the passphrase', then.itShouldResolveWithoutThePassphrase);
												it('Then it should resolve without the second passphrase', then.itShouldResolveWithoutTheSecondPassphrase);
												it('Then it should resolve with the password', then.itShouldResolveWithThePassword);
												it('Then it should resolve without the data', then.itShouldResolveWithoutTheData);
											});
										});
									});
									describe('Given the options object has a "password" field with key "source" set to string "file:/path/to/passphrase.txt"', () => {
										beforeEach(given.theOptionsObjectHasAFieldWithKeySetToString);
										describe('Given the password is available from the source', () => {
											beforeEach(given.thePasswordIsAvailableFromTheSource);
											describe('When getInputsFromSources is called with the Vorpal instance and the options', () => {
												beforeEach(when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions);
												it('Then it should not ask for the passphrase from stdIn', then.itShouldNotAskForThePassphraseFromStdIn);
												it('Then it should not ask for the second passphrase from stdIn', then.itShouldNotAskForTheSecondPassphraseFromStdIn);
												it('Then it should not ask for the password from stdIn', then.itShouldNotAskForThePasswordFromStdIn);
												it('Then it should not ask for the data from stdIn', then.itShouldNotAskForTheDataFromStdIn);
												it('Then it should not get the passphrase', then.itShouldNotGetThePassphrase);
												it('Then it should not get the second passphrase', then.itShouldNotGetTheSecondPassphrase);
												it('Then it should get the password', then.itShouldGetThePassword);
												it('Then it should not get the data', then.itShouldNotGetTheData);
												it('Then it should resolve without the passphrase', then.itShouldResolveWithoutThePassphrase);
												it('Then it should resolve without the second passphrase', then.itShouldResolveWithoutTheSecondPassphrase);
												it('Then it should resolve with the password', then.itShouldResolveWithThePassword);
												it('Then it should resolve without the data', then.itShouldResolveWithoutTheData);
											});
										});
									});
									describe('Given the options object has a "password" field with key "source" set to string "stdin"', () => {
										beforeEach(given.theOptionsObjectHasAFieldWithKeySetToString);
										describe('Given the password is provided via stdIn', () => {
											beforeEach(given.thePasswordIsProvidedViaStdIn);
											describe('When getInputsFromSources is called with the Vorpal instance and the options', () => {
												beforeEach(when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions);
												it('Then it should not ask for the passphrase from stdIn', then.itShouldNotAskForThePassphraseFromStdIn);
												it('Then it should not ask for the second passphrase from stdIn', then.itShouldNotAskForTheSecondPassphraseFromStdIn);
												it('Then it should ask for the password from stdIn', then.itShouldAskForThePasswordFromStdIn);
												it('Then it should not ask for the data from stdIn', then.itShouldNotAskForTheDataFromStdIn);
												it('Then it should not get the passphrase', then.itShouldNotGetThePassphrase);
												it('Then it should not get the second passphrase', then.itShouldNotGetTheSecondPassphrase);
												it('Then it should not get the password', then.itShouldNotGetThePassword);
												it('Then it should not get the data', then.itShouldNotGetTheData);
												it('Then it should resolve without the passphrase', then.itShouldResolveWithoutThePassphrase);
												it('Then it should resolve without the second passphrase', then.itShouldResolveWithoutTheSecondPassphrase);
												it('Then it should resolve with the password', then.itShouldResolveWithThePassword);
												it('Then it should resolve without the data', then.itShouldResolveWithoutTheData);
											});
										});
									});
								});
								describe('data option', () => {
									describe('Given the options object has a "data" field with key "source" set to string "file:/path/to/passphrase.txt"', () => {
										beforeEach(given.theOptionsObjectHasAFieldWithKeySetToString);
										describe('Given the data is available from the source', () => {
											beforeEach(given.theDataIsAvailableFromTheSource);
											describe('When getInputsFromSources is called with the Vorpal instance and the options', () => {
												beforeEach(when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions);
												it('Then it should not ask for the passphrase from stdIn', then.itShouldNotAskForThePassphraseFromStdIn);
												it('Then it should not ask for the second passphrase from stdIn', then.itShouldNotAskForTheSecondPassphraseFromStdIn);
												it('Then it should not ask for the password from stdIn', then.itShouldNotAskForThePasswordFromStdIn);
												it('Then it should not ask for the data from stdIn', then.itShouldNotAskForTheDataFromStdIn);
												it('Then it should not get the passphrase', then.itShouldNotGetThePassphrase);
												it('Then it should not get the second passphrase', then.itShouldNotGetTheSecondPassphrase);
												it('Then it should not get the password', then.itShouldNotGetThePassword);
												it('Then it should get the data', then.itShouldGetTheData);
												it('Then it should resolve without the passphrase', then.itShouldResolveWithoutThePassphrase);
												it('Then it should resolve without the second passphrase', then.itShouldResolveWithoutTheSecondPassphrase);
												it('Then it should resolve without the password', then.itShouldResolveWithoutThePassword);
												it('Then it should resolve with the data', then.itShouldResolveWithTheData);
											});
										});
									});
									describe('Given the options object has a "data" field with key "source" set to string "stdin"', () => {
										beforeEach(given.theOptionsObjectHasAFieldWithKeySetToString);
										describe('Given the data is provided via stdIn', () => {
											beforeEach(given.theDataIsProvidedViaStdIn);
											describe('When getInputsFromSources is called with the Vorpal instance and the options', () => {
												beforeEach(when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions);
												it('Then it should not ask for the passphrase from stdIn', then.itShouldNotAskForThePassphraseFromStdIn);
												it('Then it should not ask for the second passphrase from stdIn', then.itShouldNotAskForTheSecondPassphraseFromStdIn);
												it('Then it should not ask for the password from stdIn', then.itShouldNotAskForThePasswordFromStdIn);
												it('Then it should ask for the data from stdIn', then.itShouldAskForTheDataFromStdIn);
												it('Then it should not get the passphrase', then.itShouldNotGetThePassphrase);
												it('Then it should not get the second passphrase', then.itShouldNotGetTheSecondPassphrase);
												it('Then it should not get the password', then.itShouldNotGetThePassword);
												it('Then it should not get the data', then.itShouldNotGetTheData);
												it('Then it should resolve without the passphrase', then.itShouldResolveWithoutThePassphrase);
												it('Then it should resolve without the second passphrase', then.itShouldResolveWithoutTheSecondPassphrase);
												it('Then it should resolve without the password', then.itShouldResolveWithoutThePassword);
												it('Then it should resolve with the data', then.itShouldResolveWithTheData);
											});
										});
									});
								});
								describe('multiple options integration', () => {
									describe('Given the options object has a "passphrase" field with key "repeatPrompt" set to boolean true', () => {
										beforeEach(given.theOptionsObjectHasAFieldWithKeySetToBoolean);
										describe('Given the options object has a "secondPassphrase" field with key "source" set to string "stdin"', () => {
											beforeEach(given.theOptionsObjectHasAFieldWithKeySetToString);
											describe('Given the options object has a "password" field', () => {
												beforeEach(given.theOptionsObjectHasAField);
												describe('Given the options object has a "data" field with key "source" set to string "stdin"', () => {
													beforeEach(given.theOptionsObjectHasAFieldWithKeySetToString);
													describe('Given the passphrase is available from the source', () => {
														beforeEach(given.thePassphraseIsAvailableFromTheSource);
														describe('Given the password is available from the source', () => {
															beforeEach(given.thePasswordIsAvailableFromTheSource);
															describe('Given the second passphrase and the data are provided via stdIn', () => {
																beforeEach(given.theSecondPassphraseAndTheDataAreProvidedViaStdIn);
																describe('When getInputsFromSources is called with the Vorpal instance and the options', () => {
																	beforeEach(when.getInputsFromSourcesIsCalledWithTheVorpalInstanceAndTheOptions);
																	it('Then it should not ask for the passphrase from stdIn', then.itShouldNotAskForThePassphraseFromStdIn);
																	it('Then it should ask for the second passphrase from stdIn', then.itShouldAskForTheSecondPassphraseFromStdIn);
																	it('Then it should not ask for the password from stdIn', then.itShouldNotAskForThePasswordFromStdIn);
																	it('Then it should ask for the data from stdIn', then.itShouldAskForTheDataFromStdIn);
																	it('Then it should get the passphrase with a repeated prompt', then.itShouldGetThePassphraseWithARepeatedPrompt);
																	it('Then it should not get the second passphrase', then.itShouldNotGetTheSecondPassphrase);
																	it('Then it should get the password with a single prompt', then.itShouldGetThePasswordWithASinglePrompt);
																	it('Then it should not get the data', then.itShouldNotGetTheData);
																	it('Then it should resolve with the passphrase', then.itShouldResolveWithThePassphrase);
																	it('Then it should resolve with the second passphrase', then.itShouldResolveWithTheSecondPassphrase);
																	it('Then it should resolve with the password', then.itShouldResolveWithThePassword);
																	it('Then it should resolve with the data', then.itShouldResolveWithTheData);
																});
															});
														});
													});
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});
});
