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
import {
	setUpFsStubs,
	setUpEnvVariable,
	restoreEnvVariable,
} from '../../steps/utils';
import {
	givenASourceWithoutDelimiter,
	givenASourceWithDelimiter,
	givenAPromptMessage,
	givenAPassphrase,
	givenAVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt,
	givenAPromptDisplayName,
	givenThePassphraseIsProvidedViaThePrompt,
	givenThePassphraseShouldNotBeRepeated,
	givenThePassphraseShouldBeRepeated,
	givenTheVorpalInstanceHasNoUIParent,
	givenTheVorpalInstanceHasAUIParent,
	givenThePassphraseIsNotSuccessfullyRepeated,
	givenThePassphraseIsSuccessfullyRepeated,
	givenSomeData,
	givenNeitherThePassphraseNorTheDataIsProvidedViaStdIn,
	givenThePassphraseIsProvidedViaStdIn,
	givenTheDataIsProvidedViaStdIn,
	givenBothThePassphraseAndTheDataAreProvidedViaStdIn,
	givenThePassphraseIsStoredInEnvironmentalVariable,
	givenEnvironmentalVariableIsNotSet,
	givenAPassphraseFilePath,
	givenTheFileDoesNotExist,
	givenTheFileDoesExist,
	givenTheFileCannotBeRead,
	givenTheFileCanBeRead,
	givenAnUnknownErrorOccursWhenReadingTheFile,
	givenAnUnknownPassphraseSource,
	givenThePassphraseIsProvidedAsPlaintext,
	givenThereIsNoStringAvailable,
	givenThereIsAString,
	givenADataFilePath,
	givenNoDataIsProvided,
	givenDataIsProvidedViaStdIn,
	givenDataIsProvidedAsAnArgument,
	givenDataIsProvidedViaAnUnknownSource,
	givenDataIsProvidedViaAFileSource,
} from '../../steps/1_given';
import {
	whenTheSourceIsSplit,
	whenCreatePromptOptionsIsCalledWithTheMessage,
	whenGetPassphraseFromPromptIsCalled,
	whenGetStdInIsCalledWithTheRelevantOptions,
	whenGetPassphraseFromEnvVariableIsCalled,
	whenGetPassphraseFromFileIsCalledOnThePath,
	whenGetPassphraseFromFileIsCalledOnThePathAndAnUnknownErrorOccurs,
	whenGetPassphraseFromSourceIsCalledWithTheRelevantSource,
	whenGetPassphraseIsPassedAPassphraseDirectly,
	whenGetPassphraseIsPassedASourceButNoPassphrase,
	whenGetPassphraseIsPassedNeitherASourceNorAPassphrase,
	whenGetFirstLineFromStringIsCalledOnTheString,
	whenGetDataFromFileIsCalledWithThePath,
	whenGetDataIsCalled,
} from '../../steps/2_when';
import {
	thenTheResultShouldHaveSourceType,
	thenTheResultShouldHaveAnEmptySourceIdentifier,
	thenTheResultShouldHaveSourceIdentifier,
	thenAnOptionsObjectWithTheMessageShouldBeReturned,
	thenAUIParentShouldBeSet,
	thenTheUIParentShouldBeMaintained,
	thenItShouldPromptForThePassphraseOnce,
	thenItShouldPromptForThePassphraseTwice,
	thenItShouldUseOptionsWithTheMessage,
	thenItShouldResolveToThePassphrase,
	thenItShouldRejectWithMessage,
	thenItShouldReturnAnEmptyObject,
	thenItShouldReturnAnObjectWithThePassphrase,
	thenItShouldReturnAnObjectWithTheData,
	thenItShouldReturnAnObjectWithThePassphraseAndTheData,
	thenItShouldResolveToTheFirstLineOfTheFile,
	thenItShouldReturnNull,
	thenItShouldReturnString,
	thenFsReadFileSyncShouldBeCalledWithThePathAndEncoding,
	thenItShouldResolveToTheDataAsAString,
} from '../../steps/3_then';

const ENV_VARIABLE = 'TEST_PASSPHRASE';

describe('input utils', () => {
	before(setUpEnvVariable(ENV_VARIABLE));

	beforeEach(() => {
		setUpFsStubs();
	});

	after(restoreEnvVariable(ENV_VARIABLE));

	describe('#getFirstLineFromString', () => {
		describe('Given there is no string available', () => {
			beforeEach(givenThereIsNoStringAvailable);

			describe('When getFirstLineFromString is called on the string', () => {
				beforeEach(whenGetFirstLineFromStringIsCalledOnTheString);

				it('Then it should return null', thenItShouldReturnNull);
			});
		});
		describe('Given there is a string "This is some text\nthat spans\nmultiple lines"', () => {
			beforeEach(givenThereIsAString);

			describe('When getFirstLineFromString is called on the string', () => {
				beforeEach(whenGetFirstLineFromStringIsCalledOnTheString);

				it('Then it should return string "This is some text"', thenItShouldReturnString);
			});
		});
	});
	describe('#splitSource', () => {
		describe('Given a source without delimiter "someSource"', () => {
			beforeEach(givenASourceWithoutDelimiter);

			describe('When the source is split', () => {
				beforeEach(whenTheSourceIsSplit);

				it('Then the result should have source type "someSource"', thenTheResultShouldHaveSourceType);
				it('Then the result should have an empty source identifier', thenTheResultShouldHaveAnEmptySourceIdentifier);
			});
		});
		describe('Given a source with delimiter "someSource: this has spaces: and more colons "', () => {
			beforeEach(givenASourceWithDelimiter);

			describe('When the source is split', () => {
				beforeEach(whenTheSourceIsSplit);

				it('Then the result should have source type "someSource"', thenTheResultShouldHaveSourceType);
				it('Then the result should have source identifier " this has spaces: and more colons "', thenTheResultShouldHaveSourceIdentifier);
			});
		});
	});
	describe('#createPromptOptions', () => {
		describe('Given a prompt message "Some message: "', () => {
			beforeEach(givenAPromptMessage);

			describe('When createPromptOptions is called with the message', () => {
				beforeEach(whenCreatePromptOptionsIsCalledWithTheMessage);

				it('Then an options object with the message should be returned', thenAnOptionsObjectWithTheMessageShouldBeReturned);
			});
		});
	});
	describe('Given a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"', () => {
		beforeEach(givenAPassphrase);

		describe('#getPassphrase', () => {
			describe('When getPassphrase is passed a passphrase directly', () => {
				beforeEach(whenGetPassphraseIsPassedAPassphraseDirectly);

				it('Then it should resolve to the passphrase', thenItShouldResolveToThePassphrase);
			});
			describe('Given the passphrase is provided as plaintext', () => {
				beforeEach(givenThePassphraseIsProvidedAsPlaintext);

				describe('When getPassphrase is passed a source but no passphrase', () => {
					beforeEach(whenGetPassphraseIsPassedASourceButNoPassphrase);

					it('Then it should resolve to the passphrase', thenItShouldResolveToThePassphrase);
				});
			});
			describe('Given a Vorpal instance with a UI and an active command that can prompt', () => {
				beforeEach(givenAVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt);

				describe('Given the passphrase is provided via the prompt', () => {
					beforeEach(givenThePassphraseIsProvidedViaThePrompt);

					describe('When getPassphrase is passed neither a source nor a passphrase', () => {
						beforeEach(whenGetPassphraseIsPassedNeitherASourceNorAPassphrase);

						it('Then it should prompt for the passphrase once', thenItShouldPromptForThePassphraseOnce);
						it('Then it should resolve to the passphrase', thenItShouldResolveToThePassphrase);
					});
				});
			});
		});

		describe('#getPassphraseFromFile', () => {
			describe('Given a passphrase file path "/path/to/the/passphrase.txt"', () => {
				beforeEach(givenAPassphraseFilePath);

				describe('Given the file does not exist', () => {
					beforeEach(givenTheFileDoesNotExist);

					describe('When getPassphraseFromFile is called on the path', () => {
						beforeEach(whenGetPassphraseFromFileIsCalledOnThePath);

						it('Then it should reject with message "File at /path/to/the/passphrase.txt does not exist."', thenItShouldRejectWithMessage);
					});
				});
				describe('Given the file does exist', () => {
					beforeEach(givenTheFileDoesExist);

					describe('Given the file cannot be read', () => {
						beforeEach(givenTheFileCannotBeRead);

						describe('When getPassphraseFromFile is called on the path', () => {
							beforeEach(whenGetPassphraseFromFileIsCalledOnThePath);

							it('Then it should reject with message "File at /path/to/the/passphrase.txt could not be read."', thenItShouldRejectWithMessage);
						});
					});
					describe('Given the file can be read', () => {
						beforeEach(givenTheFileCanBeRead);

						describe('When getPassphraseFromFile is called on the path', () => {
							beforeEach(whenGetPassphraseFromFileIsCalledOnThePath);

							it('Then it should resolve to the first line of the file', thenItShouldResolveToTheFirstLineOfTheFile);
						});
						describe('Given an unknown error "Unknown Error" occurs when reading the file', () => {
							beforeEach(givenAnUnknownErrorOccursWhenReadingTheFile);

							describe('When getPassphraseFromFile is called on the path', () => {
								beforeEach(whenGetPassphraseFromFileIsCalledOnThePathAndAnUnknownErrorOccurs);

								it('Then it should reject with message "Unknown Error"', thenItShouldRejectWithMessage);
							});
						});
					});
				});
			});
		});
		describe('Given a prompt display name "your custom passphrase"', () => {
			beforeEach(givenAPromptDisplayName);

			describe('#getPassphraseFromEnvVariable', () => {
				describe(`Given the passphrase is stored in environmental variable "${ENV_VARIABLE}"`, () => {
					beforeEach(givenThePassphraseIsStoredInEnvironmentalVariable);

					describe('When getPassphraseFromEnvVariable is called with the variable', () => {
						beforeEach(whenGetPassphraseFromEnvVariableIsCalled);

						it('Then it should resolve to the passphrase', thenItShouldResolveToThePassphrase);
					});
				});
				describe(`Given environmental variable "${ENV_VARIABLE}" is not set`, () => {
					beforeEach(givenEnvironmentalVariableIsNotSet);

					describe('When getPassphraseFromEnvVariable is called with the variable', () => {
						beforeEach(whenGetPassphraseFromEnvVariableIsCalled);

						it('Then it should reject with message "Environmental variable for your custom passphrase not set."', thenItShouldRejectWithMessage);
					});
				});
			});
			describe('#getPassphraseFromPrompt', () => {
				describe('Given a Vorpal instance with a UI and an active command that can prompt', () => {
					beforeEach(givenAVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt);

					describe('Given the passphrase is provided via the prompt', () => {
						beforeEach(givenThePassphraseIsProvidedViaThePrompt);

						describe('Given the passphrase should not be repeated', () => {
							beforeEach(givenThePassphraseShouldNotBeRepeated);

							describe('Given the Vorpal instance has no UI parent', () => {
								beforeEach(givenTheVorpalInstanceHasNoUIParent);

								describe('When getPassphraseFromPrompt is called', () => {
									beforeEach(whenGetPassphraseFromPromptIsCalled);

									it('Then a UI parent should be set', thenAUIParentShouldBeSet);
									it('Then it should prompt for the passphrase once', thenItShouldPromptForThePassphraseOnce);
									it('Then it should use options with the message "Please enter your custom passphrase: "', thenItShouldUseOptionsWithTheMessage);
									it('Then it should resolve to the passphrase', thenItShouldResolveToThePassphrase);
								});
							});
							describe('Given the Vorpal instance has a UI parent', () => {
								beforeEach(givenTheVorpalInstanceHasAUIParent);

								describe('When getPassphraseFromPrompt is called', () => {
									beforeEach(whenGetPassphraseFromPromptIsCalled);

									it('Then the UI parent should be maintained', thenTheUIParentShouldBeMaintained);
									it('Then it should prompt for the passphrase once', thenItShouldPromptForThePassphraseOnce);
									it('Then it should use options with the message "Please enter your custom passphrase: "', thenItShouldUseOptionsWithTheMessage);
									it('Then it should resolve to the passphrase', thenItShouldResolveToThePassphrase);
								});
							});
						});
						describe('Given the passphrase should be repeated', () => {
							beforeEach(givenThePassphraseShouldBeRepeated);

							describe('Given the passphrase is not successfully repeated', () => {
								beforeEach(givenThePassphraseIsNotSuccessfullyRepeated);

								describe('When getPassphraseFromPrompt is called', () => {
									beforeEach(whenGetPassphraseFromPromptIsCalled);

									it('Then it should prompt for the passphrase twice', thenItShouldPromptForThePassphraseTwice);
									it('Then it should use options with the message "Please enter your custom passphrase: "', thenItShouldUseOptionsWithTheMessage);
									it('Then it should use options with the message "Please re-enter your custom passphrase: "', thenItShouldUseOptionsWithTheMessage);
									it('Then it should reject with message "Your custom passphrase was not successfully repeated."', thenItShouldRejectWithMessage);
								});
							});
							describe('Given the passphrase is successfully repeated', () => {
								beforeEach(givenThePassphraseIsSuccessfullyRepeated);

								describe('When getPassphraseFromPrompt is called', () => {
									beforeEach(whenGetPassphraseFromPromptIsCalled);

									it('Then it should prompt for the passphrase twice', thenItShouldPromptForThePassphraseTwice);
									it('Then it should use options with the message "Please enter your custom passphrase: "', thenItShouldUseOptionsWithTheMessage);
									it('Then it should use options with the message "Please re-enter your custom passphrase: "', thenItShouldUseOptionsWithTheMessage);
									it('Then it should resolve to the passphrase', thenItShouldResolveToThePassphrase);
								});
							});
						});
					});
				});
			});
			describe('#getPassphraseFromSource', () => {
				describe('Given an unknown passphrase source', () => {
					beforeEach(givenAnUnknownPassphraseSource);

					describe('When getPassphraseFromSourceIsCalled with the relevant source', () => {
						beforeEach(whenGetPassphraseFromSourceIsCalledWithTheRelevantSource);

						it('Then it should reject with message "Your custom passphrase was provided with an unknown source type. Must be one of `env`, `file`, or `stdin`. Leave blank for prompt."', thenItShouldRejectWithMessage);
					});
				});
				describe(`Given the passphrase is stored in environmental variable "${ENV_VARIABLE}"`, () => {
					beforeEach(givenThePassphraseIsStoredInEnvironmentalVariable);

					describe('When getPassphraseFromSourceIsCalled with the relevant source', () => {
						beforeEach(whenGetPassphraseFromSourceIsCalledWithTheRelevantSource);

						it('Then it should resolve to the passphrase', thenItShouldResolveToThePassphrase);
					});
				});
				describe('Given a passphrase file path "/path/to/the/passphrase.txt"', () => {
					beforeEach(givenAPassphraseFilePath);

					describe('Given the file can be read', () => {
						beforeEach(givenTheFileCanBeRead);

						describe('When getPassphraseFromSourceIsCalled with the relevant source', () => {
							beforeEach(whenGetPassphraseFromSourceIsCalledWithTheRelevantSource);

							it('Then it should resolve to the passphrase', thenItShouldResolveToThePassphrase);
						});
					});
				});
				describe('Given the passphrase is provided as plaintext', () => {
					beforeEach(givenThePassphraseIsProvidedAsPlaintext);

					describe('When getPassphraseFromSourceIsCalled with the relevant source', () => {
						beforeEach(whenGetPassphraseFromSourceIsCalledWithTheRelevantSource);

						it('Then it should resolve to the passphrase', thenItShouldResolveToThePassphrase);
					});
				});
			});
		});
		describe('Given some data "This is some text\nthat spans\nmultiple lines"', () => {
			beforeEach(givenSomeData);

			describe('#getData', () => {
				describe('Given no data is provided', () => {
					beforeEach(givenNoDataIsProvided);

					describe('When getData is called', () => {
						beforeEach(whenGetDataIsCalled);

						it('Then it should reject with message "No data was provided."', thenItShouldRejectWithMessage);
					});
				});
				describe('Given data is provided via stdin', () => {
					beforeEach(givenDataIsProvidedViaStdIn);

					describe('When getData is called', () => {
						beforeEach(whenGetDataIsCalled);

						it('Then it should resolve to the data as a string', thenItShouldResolveToTheDataAsAString);
					});
				});
				describe('Given data is provided as an argument', () => {
					beforeEach(givenDataIsProvidedAsAnArgument);

					describe('When getData is called', () => {
						beforeEach(whenGetDataIsCalled);

						it('Then it should resolve to the data as a string', thenItShouldResolveToTheDataAsAString);
					});
				});
				describe('Given data is provided via an unknown source', () => {
					beforeEach(givenDataIsProvidedViaAnUnknownSource);

					describe('When getData is called', () => {
						beforeEach(whenGetDataIsCalled);

						it('Then it should reject with message "Unknown data source type. Must be one of `file`, or `stdin`."', thenItShouldRejectWithMessage);
					});
				});
				describe('Given a data file path "/path/to/the/data.txt"', () => {
					beforeEach(givenADataFilePath);

					describe('Given the file does not exist', () => {
						beforeEach(givenTheFileDoesNotExist);

						describe('Given data is provided via a file source', () => {
							beforeEach(givenDataIsProvidedViaAFileSource);

							describe('When getData is called', () => {
								beforeEach(whenGetDataIsCalled);

								it('Then it should reject with message "File at /path/to/the/data.txt does not exist."', thenItShouldRejectWithMessage);
							});
						});
					});
					describe('Given the file cannot be read', () => {
						beforeEach(givenTheFileCannotBeRead);

						describe('Given data is provided via a file source', () => {
							beforeEach(givenDataIsProvidedViaAFileSource);

							describe('When getData is called', () => {
								beforeEach(whenGetDataIsCalled);

								it('Then it should reject with message "File at /path/to/the/data.txt could not be read."', thenItShouldRejectWithMessage);
							});
						});
					});
					describe('Given an unknown error "Unknown error" occurs when reading the file', () => {
						beforeEach(givenAnUnknownErrorOccursWhenReadingTheFile);

						describe('Given data is provided via a file source', () => {
							beforeEach(givenDataIsProvidedViaAFileSource);

							describe('When getData is called', () => {
								beforeEach(whenGetDataIsCalled);

								it('Then it should reject with message "Unknown error"', thenItShouldRejectWithMessage);
							});
						});
					});
					describe('Given the file can be read', () => {
						beforeEach(givenTheFileCanBeRead);

						describe('Given data is provided via a file source', () => {
							beforeEach(givenDataIsProvidedViaAFileSource);

							describe('When getData is called', () => {
								beforeEach(whenGetDataIsCalled);

								it('Then it should resolve to the data as a string', thenItShouldResolveToTheDataAsAString);
							});
						});
					});
				});
			});
			describe('#getDataFromFile', () => {
				describe('Given a data file path "/path/to/the/data.txt"', () => {
					beforeEach(givenADataFilePath);

					describe('Given the file can be read', () => {
						beforeEach(givenTheFileCanBeRead);

						describe('When getDataFromFile is called with the path', () => {
							beforeEach(whenGetDataFromFileIsCalledWithThePath);

							it('Then fs.readFileSync should be called with the path and encoding', thenFsReadFileSyncShouldBeCalledWithThePathAndEncoding);
							it('Then it should resolve to the data as a string', thenItShouldResolveToTheDataAsAString);
						});
					});
				});
			});
			describe('#getStdIn', () => {
				describe('Given neither the passphrase nor the data is provided via stdin', () => {
					beforeEach(givenNeitherThePassphraseNorTheDataIsProvidedViaStdIn);

					describe('When getStdIn is called with the relevant options', () => {
						beforeEach(whenGetStdInIsCalledWithTheRelevantOptions);

						it('Then it should return an empty object', thenItShouldReturnAnEmptyObject);
					});
				});
				describe('Given the passphrase is provided via stdin', () => {
					beforeEach(givenThePassphraseIsProvidedViaStdIn);

					describe('When getStdIn is called with the relevant options', () => {
						beforeEach(whenGetStdInIsCalledWithTheRelevantOptions);

						it('Then it should return an object with the passphrase', thenItShouldReturnAnObjectWithThePassphrase);
					});
				});
				describe('Given the data is provided via stdin', () => {
					beforeEach(givenTheDataIsProvidedViaStdIn);

					describe('When getStdIn is called with the relevant options', () => {
						beforeEach(whenGetStdInIsCalledWithTheRelevantOptions);

						it('Then it should return an object with the data', thenItShouldReturnAnObjectWithTheData);
					});
				});
				describe('Given both the passphrase and the data are provided via stdin', () => {
					beforeEach(givenBothThePassphraseAndTheDataAreProvidedViaStdIn);

					describe('When getStdIn is called with the relevant options', () => {
						beforeEach(whenGetStdInIsCalledWithTheRelevantOptions);

						it('Then it should return an object with the passphrase and the data', thenItShouldReturnAnObjectWithThePassphraseAndTheData);
					});
				});
			});
		});
	});
});
