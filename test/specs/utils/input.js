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
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

const ENV_VARIABLE = 'TEST_PASSPHRASE';

describe('input utils', () => {
	before(setUpEnvVariable(ENV_VARIABLE));

	beforeEach(() => {
		setUpFsStubs();
	});

	after(restoreEnvVariable(ENV_VARIABLE));

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
	describe('#splitSource', () => {
		describe('Given a source without delimiter "someSource"', () => {
			beforeEach(given.aSourceWithoutDelimiter);

			describe('When the source is split', () => {
				beforeEach(when.theSourceIsSplit);

				it('Then the result should have source type "someSource"', then.theResultShouldHaveSourceType);
				it('Then the result should have an empty source identifier', then.theResultShouldHaveAnEmptySourceIdentifier);
			});
		});
		describe('Given a source with delimiter "someSource: this has spaces: and more colons "', () => {
			beforeEach(given.aSourceWithDelimiter);

			describe('When the source is split', () => {
				beforeEach(when.theSourceIsSplit);

				it('Then the result should have source type "someSource"', then.theResultShouldHaveSourceType);
				it('Then the result should have source identifier " this has spaces: and more colons "', then.theResultShouldHaveSourceIdentifier);
			});
		});
	});
	describe('#createPromptOptions', () => {
		describe('Given a prompt message "Some message: "', () => {
			beforeEach(given.aPromptMessage);

			describe('When createPromptOptions is called with the message', () => {
				beforeEach(when.createPromptOptionsIsCalledWithTheMessage);

				it('Then an options object with the message should be returned', then.anOptionsObjectWithTheMessageShouldBeReturned);
			});
		});
	});
	describe('Given a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"', () => {
		beforeEach(given.aPassphrase);

		describe('#getPassphrase', () => {
			describe('When getPassphrase is passed a passphrase directly', () => {
				beforeEach(when.getPassphraseIsPassedAPassphraseDirectly);

				it('Then it should resolve to the passphrase', then.itShouldResolveToThePassphrase);
			});
			describe('Given the passphrase is provided as plaintext', () => {
				beforeEach(given.thePassphraseIsProvidedAsPlaintext);

				describe('When getPassphrase is passed a source but no passphrase', () => {
					beforeEach(when.getPassphraseIsPassedASourceButNoPassphrase);

					it('Then it should resolve to the passphrase', then.itShouldResolveToThePassphrase);
				});
			});
			describe('Given a Vorpal instance with a UI and an active command that can prompt', () => {
				beforeEach(given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt);

				describe('Given the passphrase is provided via the prompt', () => {
					beforeEach(given.thePassphraseIsProvidedViaThePrompt);

					describe('When getPassphrase is passed neither a source nor a passphrase', () => {
						beforeEach(when.getPassphraseIsPassedNeitherASourceNorAPassphrase);

						it('Then it should prompt for the passphrase once', then.itShouldPromptForThePassphraseOnce);
						it('Then it should resolve to the passphrase', then.itShouldResolveToThePassphrase);
					});
				});
			});
		});

		describe('#getPassphraseFromFile', () => {
			describe('Given a passphrase file path "/path/to/the/passphrase.txt"', () => {
				beforeEach(given.aPassphraseFilePath);

				describe('Given the file does not exist', () => {
					beforeEach(given.theFileDoesNotExist);

					describe('When getPassphraseFromFile is called on the path', () => {
						beforeEach(when.getPassphraseFromFileIsCalledOnThePath);

						it('Then it should reject with message "File at /path/to/the/passphrase.txt does not exist."', then.itShouldRejectWithMessage);
					});
				});
				describe('Given the file does exist', () => {
					beforeEach(given.theFileDoesExist);

					describe('Given the file cannot be read', () => {
						beforeEach(given.theFileCannotBeRead);

						describe('When getPassphraseFromFile is called on the path', () => {
							beforeEach(when.getPassphraseFromFileIsCalledOnThePath);

							it('Then it should reject with message "File at /path/to/the/passphrase.txt could not be read."', then.itShouldRejectWithMessage);
						});
					});
					describe('Given the file can be read', () => {
						beforeEach(given.theFileCanBeRead);

						describe('When getPassphraseFromFile is called on the path', () => {
							beforeEach(when.getPassphraseFromFileIsCalledOnThePath);

							it('Then it should resolve to the first line of the file', then.itShouldResolveToTheFirstLineOfTheFile);
						});
						describe('Given an unknown error "Unknown Error" occurs when reading the file', () => {
							beforeEach(given.anUnknownErrorOccursWhenReadingTheFile);

							describe('When getPassphraseFromFile is called on the path', () => {
								beforeEach(when.getPassphraseFromFileIsCalledOnThePathAndAnUnknownErrorOccurs);

								it('Then it should reject with message "Unknown Error"', then.itShouldRejectWithMessage);
							});
						});
					});
				});
			});
		});
		describe('Given a prompt display name "your custom passphrase"', () => {
			beforeEach(given.aPromptDisplayName);

			describe('#getPassphraseFromEnvVariable', () => {
				describe(`Given the passphrase is stored in environmental variable "${ENV_VARIABLE}"`, () => {
					beforeEach(given.thePassphraseIsStoredInEnvironmentalVariable);

					describe('When getPassphraseFromEnvVariable is called with the variable', () => {
						beforeEach(when.getPassphraseFromEnvVariableIsCalled);

						it('Then it should resolve to the passphrase', then.itShouldResolveToThePassphrase);
					});
				});
				describe(`Given environmental variable "${ENV_VARIABLE}" is not set`, () => {
					beforeEach(given.environmentalVariableIsNotSet);

					describe('When getPassphraseFromEnvVariable is called with the variable', () => {
						beforeEach(when.getPassphraseFromEnvVariableIsCalled);

						it('Then it should reject with message "Environmental variable for your custom passphrase not set."', then.itShouldRejectWithMessage);
					});
				});
			});
			describe('#getPassphraseFromPrompt', () => {
				describe('Given a Vorpal instance with a UI and an active command that can prompt', () => {
					beforeEach(given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt);

					describe('Given the passphrase is provided via the prompt', () => {
						beforeEach(given.thePassphraseIsProvidedViaThePrompt);

						describe('Given the passphrase should not be repeated', () => {
							beforeEach(given.thePassphraseShouldNotBeRepeated);

							describe('Given the Vorpal instance has no UI parent', () => {
								beforeEach(given.theVorpalInstanceHasNoUIParent);

								describe('When getPassphraseFromPrompt is called', () => {
									beforeEach(when.getPassphraseFromPromptIsCalled);

									it('Then a UI parent should be set', then.aUIParentShouldBeSet);
									it('Then it should prompt for the passphrase once', then.itShouldPromptForThePassphraseOnce);
									it('Then it should use options with the message "Please enter your custom passphrase: "', then.itShouldUseOptionsWithTheMessage);
									it('Then it should resolve to the passphrase', then.itShouldResolveToThePassphrase);
								});
							});
							describe('Given the Vorpal instance has a UI parent', () => {
								beforeEach(given.theVorpalInstanceHasAUIParent);

								describe('When getPassphraseFromPrompt is called', () => {
									beforeEach(when.getPassphraseFromPromptIsCalled);

									it('Then the UI parent should be maintained', then.theUIParentShouldBeMaintained);
									it('Then it should prompt for the passphrase once', then.itShouldPromptForThePassphraseOnce);
									it('Then it should use options with the message "Please enter your custom passphrase: "', then.itShouldUseOptionsWithTheMessage);
									it('Then it should resolve to the passphrase', then.itShouldResolveToThePassphrase);
								});
							});
						});
						describe('Given the passphrase should be repeated', () => {
							beforeEach(given.thePassphraseShouldBeRepeated);

							describe('Given the passphrase is not successfully repeated', () => {
								beforeEach(given.thePassphraseIsNotSuccessfullyRepeated);

								describe('When getPassphraseFromPrompt is called', () => {
									beforeEach(when.getPassphraseFromPromptIsCalled);

									it('Then it should prompt for the passphrase twice', then.itShouldPromptForThePassphraseTwice);
									it('Then it should use options with the message "Please enter your custom passphrase: "', then.itShouldUseOptionsWithTheMessage);
									it('Then it should use options with the message "Please re-enter your custom passphrase: "', then.itShouldUseOptionsWithTheMessage);
									it('Then it should reject with message "Your custom passphrase was not successfully repeated."', then.itShouldRejectWithMessage);
								});
							});
							describe('Given the passphrase is successfully repeated', () => {
								beforeEach(given.thePassphraseIsSuccessfullyRepeated);

								describe('When getPassphraseFromPrompt is called', () => {
									beforeEach(when.getPassphraseFromPromptIsCalled);

									it('Then it should prompt for the passphrase twice', then.itShouldPromptForThePassphraseTwice);
									it('Then it should use options with the message "Please enter your custom passphrase: "', then.itShouldUseOptionsWithTheMessage);
									it('Then it should use options with the message "Please re-enter your custom passphrase: "', then.itShouldUseOptionsWithTheMessage);
									it('Then it should resolve to the passphrase', then.itShouldResolveToThePassphrase);
								});
							});
						});
					});
				});
			});
			describe('#getPassphraseFromSource', () => {
				describe('Given an unknown passphrase source', () => {
					beforeEach(given.anUnknownPassphraseSource);

					describe('When getPassphraseFromSourceIsCalled with the relevant source', () => {
						beforeEach(when.getPassphraseFromSourceIsCalledWithTheRelevantSource);

						it('Then it should reject with message "Your custom passphrase was provided with an unknown source type. Must be one of `env`, `file`, or `stdin`. Leave blank for prompt."', then.itShouldRejectWithMessage);
					});
				});
				describe(`Given the passphrase is stored in environmental variable "${ENV_VARIABLE}"`, () => {
					beforeEach(given.thePassphraseIsStoredInEnvironmentalVariable);

					describe('When getPassphraseFromSourceIsCalled with the relevant source', () => {
						beforeEach(when.getPassphraseFromSourceIsCalledWithTheRelevantSource);

						it('Then it should resolve to the passphrase', then.itShouldResolveToThePassphrase);
					});
				});
				describe('Given a passphrase file path "/path/to/the/passphrase.txt"', () => {
					beforeEach(given.aPassphraseFilePath);

					describe('Given the file can be read', () => {
						beforeEach(given.theFileCanBeRead);

						describe('When getPassphraseFromSourceIsCalled with the relevant source', () => {
							beforeEach(when.getPassphraseFromSourceIsCalledWithTheRelevantSource);

							it('Then it should resolve to the passphrase', then.itShouldResolveToThePassphrase);
						});
					});
				});
				describe('Given the passphrase is provided as plaintext', () => {
					beforeEach(given.thePassphraseIsProvidedAsPlaintext);

					describe('When getPassphraseFromSourceIsCalled with the relevant source', () => {
						beforeEach(when.getPassphraseFromSourceIsCalledWithTheRelevantSource);

						it('Then it should resolve to the passphrase', then.itShouldResolveToThePassphrase);
					});
				});
			});
		});
		describe('Given some data "This is some text\nthat spans\nmultiple lines"', () => {
			beforeEach(given.someData);

			describe('#getData', () => {
				describe('Given no data is provided', () => {
					beforeEach(given.noDataIsProvided);

					describe('When getData is called', () => {
						beforeEach(when.getDataIsCalled);

						it('Then it should reject with message "No data was provided."', then.itShouldRejectWithMessage);
					});
				});
				describe('Given data is provided via stdin', () => {
					beforeEach(given.dataIsProvidedViaStdIn);

					describe('When getData is called', () => {
						beforeEach(when.getDataIsCalled);

						it('Then it should resolve to the data as a string', then.itShouldResolveToTheDataAsAString);
					});
				});
				describe('Given data is provided as an argument', () => {
					beforeEach(given.dataIsProvidedAsAnArgument);

					describe('When getData is called', () => {
						beforeEach(when.getDataIsCalled);

						it('Then it should resolve to the data as a string', then.itShouldResolveToTheDataAsAString);
					});
				});
				describe('Given data is provided via an unknown source', () => {
					beforeEach(given.dataIsProvidedViaAnUnknownSource);

					describe('When getData is called', () => {
						beforeEach(when.getDataIsCalled);

						it('Then it should reject with message "Unknown data source type. Must be one of `file`, or `stdin`."', then.itShouldRejectWithMessage);
					});
				});
				describe('Given a data file path "/path/to/the/data.txt"', () => {
					beforeEach(given.aDataFilePath);

					describe('Given the file does not exist', () => {
						beforeEach(given.theFileDoesNotExist);

						describe('Given data is provided via a file source', () => {
							beforeEach(given.dataIsProvidedViaAFileSource);

							describe('When getData is called', () => {
								beforeEach(when.getDataIsCalled);

								it('Then it should reject with message "File at /path/to/the/data.txt does not exist."', then.itShouldRejectWithMessage);
							});
						});
					});
					describe('Given the file cannot be read', () => {
						beforeEach(given.theFileCannotBeRead);

						describe('Given data is provided via a file source', () => {
							beforeEach(given.dataIsProvidedViaAFileSource);

							describe('When getData is called', () => {
								beforeEach(when.getDataIsCalled);

								it('Then it should reject with message "File at /path/to/the/data.txt could not be read."', then.itShouldRejectWithMessage);
							});
						});
					});
					describe('Given an unknown error "Unknown error" occurs when reading the file', () => {
						beforeEach(given.anUnknownErrorOccursWhenReadingTheFile);

						describe('Given data is provided via a file source', () => {
							beforeEach(given.dataIsProvidedViaAFileSource);

							describe('When getData is called', () => {
								beforeEach(when.getDataIsCalled);

								it('Then it should reject with message "Unknown error"', then.itShouldRejectWithMessage);
							});
						});
					});
					describe('Given the file can be read', () => {
						beforeEach(given.theFileCanBeRead);

						describe('Given data is provided via a file source', () => {
							beforeEach(given.dataIsProvidedViaAFileSource);

							describe('When getData is called', () => {
								beforeEach(when.getDataIsCalled);

								it('Then it should resolve to the data as a string', then.itShouldResolveToTheDataAsAString);
							});
						});
					});
				});
			});
			describe('#getDataFromFile', () => {
				describe('Given a data file path "/path/to/the/data.txt"', () => {
					beforeEach(given.aDataFilePath);

					describe('Given the file can be read', () => {
						beforeEach(given.theFileCanBeRead);

						describe('When getDataFromFile is called with the path', () => {
							beforeEach(when.getDataFromFileIsCalledWithThePath);

							it('Then fs.readFileSync should be called with the path and encoding', then.fsReadFileSyncShouldBeCalledWithThePathAndEncoding);
							it('Then it should resolve to the data as a string', then.itShouldResolveToTheDataAsAString);
						});
					});
				});
			});
			describe('#getStdIn', () => {
				describe('Given neither the passphrase nor the data is provided via stdin', () => {
					beforeEach(given.neitherThePassphraseNorTheDataIsProvidedViaStdIn);

					describe('When getStdIn is called with the relevant options', () => {
						beforeEach(when.getStdInIsCalledWithTheRelevantOptions);

						it('Then it should return an empty object', then.itShouldReturnAnEmptyObject);
					});
				});
				describe('Given the passphrase is provided via stdin', () => {
					beforeEach(given.thePassphraseIsProvidedViaStdIn);

					describe('When getStdIn is called with the relevant options', () => {
						beforeEach(when.getStdInIsCalledWithTheRelevantOptions);

						it('Then it should return an object with the passphrase', then.itShouldReturnAnObjectWithThePassphrase);
					});
				});
				describe('Given the data is provided via stdin', () => {
					beforeEach(given.theDataIsProvidedViaStdIn);

					describe('When getStdIn is called with the relevant options', () => {
						beforeEach(when.getStdInIsCalledWithTheRelevantOptions);

						it('Then it should return an object with the data', then.itShouldReturnAnObjectWithTheData);
					});
				});
				describe('Given both the passphrase and the data are provided via stdin', () => {
					beforeEach(given.bothThePassphraseAndTheDataAreProvidedViaStdIn);

					describe('When getStdIn is called with the relevant options', () => {
						beforeEach(when.getStdInIsCalledWithTheRelevantOptions);

						it('Then it should return an object with the passphrase and the data', then.itShouldReturnAnObjectWithThePassphraseAndTheData);
					});
				});
			});
		});
	});
});
