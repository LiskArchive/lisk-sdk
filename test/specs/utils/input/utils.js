/*
 * LiskHQ/lisk-commander
 * Copyright © 2016–2018 Lisk Foundation
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
	setUpUtilInputUtils,
	tearDownUtilInputUtils,
} from '../../../steps/setup';
import * as given from '../../../steps/1_given';
import * as when from '../../../steps/2_when';
import * as then from '../../../steps/3_then';

const ENV_VARIABLE = 'TEST_PASSPHRASE';

describe('input utils utils', () => {
	beforeEach(setUpUtilInputUtils);
	afterEach(tearDownUtilInputUtils);
	describe('#splitSource', () => {
		Given(
			'a source without delimiter "someSource"',
			given.aSourceWithoutDelimiter,
			() => {
				When('the source is split', when.theSourceIsSplit, () => {
					Then(
						'the result should have source type "someSource"',
						then.theResultShouldHaveSourceType,
					);
					Then(
						'the result should have an empty source identifier',
						then.theResultShouldHaveAnEmptySourceIdentifier,
					);
				});
			},
		);
		Given(
			'a source with delimiter "someSource: this has spaces: and more colons "',
			given.aSourceWithDelimiter,
			() => {
				When('the source is split', when.theSourceIsSplit, () => {
					Then(
						'the result should have source type "someSource"',
						then.theResultShouldHaveSourceType,
					);
					Then(
						'the result should have source identifier " this has spaces: and more colons "',
						then.theResultShouldHaveSourceIdentifier,
					);
				});
			},
		);
	});
	describe('#createPromptOptions', () => {
		Given('a prompt message "Some message: "', given.aPromptMessage, () => {
			When(
				'createPromptOptions is called with the message',
				when.createPromptOptionsIsCalledWithTheMessage,
				() => {
					Then(
						'an options object with the message should be returned',
						then.anOptionsObjectWithTheMessageShouldBeReturned,
					);
				},
			);
		});
	});
	Given(
		'a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"',
		given.aPassphrase,
		() => {
			describe('#getPassphrase', () => {
				Given(
					'the passphrase is provided as plaintext',
					given.thePassphraseIsProvidedAsPlaintext,
					() => {
						When(
							'getPassphrase is passed a source but no passphrase',
							when.getPassphraseIsPassedASourceButNoPassphrase,
							() => {
								Then(
									'it should resolve to the passphrase',
									then.itShouldResolveToThePassphrase,
								);
							},
						);
					},
				);
				Given(
					'a Vorpal instance with a UI and an active command that can prompt',
					given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt,
					() => {
						Given(
							'the passphrase is provided via the prompt',
							given.thePassphraseIsProvidedViaThePrompt,
							() => {
								When(
									'getPassphrase is passed neither a source nor a passphrase',
									when.getPassphraseIsPassedNeitherASourceNorAPassphrase,
									() => {
										Then(
											'it should prompt for the passphrase once',
											then.itShouldPromptForThePassphraseOnce,
										);
										Then(
											'it should resolve to the passphrase',
											then.itShouldResolveToThePassphrase,
										);
									},
								);
							},
						);
					},
				);
			});
			describe('#getPassphraseFromFile', () => {
				Given(
					'a passphrase file path "/path/to/the/passphrase.txt"',
					given.aPassphraseFilePath,
					() => {
						Given('the file does not exist', given.theFileDoesNotExist, () => {
							When(
								'getPassphraseFromFile is called on the path',
								when.getPassphraseFromFileIsCalledOnThePath,
								() => {
									Then(
										'it should reject with file system error and message "File at /path/to/the/passphrase.txt does not exist."',
										then.itShouldRejectWithFileSystemErrorAndMessage,
									);
								},
							);
						});
						Given('the file does exist', given.theFileDoesExist, () => {
							Given(
								'the file cannot be read',
								given.theFileCannotBeRead,
								() => {
									When(
										'getPassphraseFromFile is called on the path',
										when.getPassphraseFromFileIsCalledOnThePath,
										() => {
											Then(
												'it should reject with file system error and message "File at /path/to/the/passphrase.txt could not be read."',
												then.itShouldRejectWithFileSystemErrorAndMessage,
											);
										},
									);
								},
							);
							Given('the file can be read', given.theFileCanBeRead, () => {
								When(
									'getPassphraseFromFile is called on the path',
									when.getPassphraseFromFileIsCalledOnThePath,
									() => {
										Then(
											'it should resolve to the first line of the file',
											then.itShouldResolveToTheFirstLineOfTheFile,
										);
									},
								);
								Given(
									'an unknown error "Unknown Error" occurs when reading the file',
									given.anUnknownErrorOccursWhenReadingTheFile,
									() => {
										When(
											'getPassphraseFromFile is called on the path',
											when.getPassphraseFromFileIsCalledOnThePathAndAnUnknownErrorOccurs,
											() => {
												Then(
													'it should reject with message "Unknown Error"',
													then.itShouldRejectWithMessage,
												);
											},
										);
									},
								);
							});
						});
					},
				);
			});
			Given(
				'a prompt display name "your custom passphrase"',
				given.aPromptDisplayName,
				() => {
					describe('#getPassphraseFromEnvVariable', () => {
						describe(`Given the passphrase is stored in environmental variable "${ENV_VARIABLE}"`, () => {
							beforeEach(given.thePassphraseIsStoredInEnvironmentalVariable);
							When(
								'getPassphraseFromEnvVariable is called with the variable',
								when.getPassphraseFromEnvVariableIsCalled,
								() => {
									Then(
										'it should resolve to the passphrase',
										then.itShouldResolveToThePassphrase,
									);
								},
							);
						});
						describe(`Given environmental variable "${ENV_VARIABLE}" is not set`, () => {
							beforeEach(given.environmentalVariableIsNotSet);
							When(
								'getPassphraseFromEnvVariable is called with the variable',
								when.getPassphraseFromEnvVariableIsCalled,
								() => {
									Then(
										'it should reject with validation error and message "Environmental variable for your custom passphrase not set."',
										then.itShouldRejectWithValidationErrorAndMessage,
									);
								},
							);
						});
					});
					describe('#getPassphraseFromPrompt', () => {
						Given(
							'a Vorpal instance with a UI and an active command that can prompt',
							given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt,
							() => {
								Given(
									'the passphrase is provided via the prompt',
									given.thePassphraseIsProvidedViaThePrompt,
									() => {
										Given(
											'the passphrase should not be repeated',
											given.thePassphraseShouldNotBeRepeated,
											() => {
												Given(
													'the Vorpal instance has no UI parent',
													given.theVorpalInstanceHasNoUIParent,
													() => {
														When(
															'getPassphraseFromPrompt is called',
															when.getPassphraseFromPromptIsCalled,
															() => {
																Then(
																	'a UI parent should be set',
																	then.aUIParentShouldBeSet,
																);
																Then(
																	'it should prompt for the passphrase once',
																	then.itShouldPromptForThePassphraseOnce,
																);
																Then(
																	'it should use options with the message "Please enter your custom passphrase: "',
																	then.itShouldUseOptionsWithTheMessage,
																);
																Then(
																	'it should resolve to the passphrase',
																	then.itShouldResolveToThePassphrase,
																);
															},
														);
													},
												);
												Given(
													'the Vorpal instance has a UI parent',
													given.theVorpalInstanceHasAUIParent,
													() => {
														When(
															'getPassphraseFromPrompt is called',
															when.getPassphraseFromPromptIsCalled,
															() => {
																Then(
																	'the UI parent should be maintained',
																	then.theUIParentShouldBeMaintained,
																);
																Then(
																	'it should prompt for the passphrase once',
																	then.itShouldPromptForThePassphraseOnce,
																);
																Then(
																	'it should use options with the message "Please enter your custom passphrase: "',
																	then.itShouldUseOptionsWithTheMessage,
																);
																Then(
																	'it should resolve to the passphrase',
																	then.itShouldResolveToThePassphrase,
																);
															},
														);
													},
												);
											},
										);
										Given(
											'the passphrase should be repeated',
											given.thePassphraseShouldBeRepeated,
											() => {
												Given(
													'the passphrase is not successfully repeated',
													given.thePassphraseIsNotSuccessfullyRepeated,
													() => {
														When(
															'getPassphraseFromPrompt is called',
															when.getPassphraseFromPromptIsCalled,
															() => {
																Then(
																	'it should prompt for the passphrase twice',
																	then.itShouldPromptForThePassphraseTwice,
																);
																Then(
																	'it should use options with the message "Please enter your custom passphrase: "',
																	then.itShouldUseOptionsWithTheMessage,
																);
																Then(
																	'it should use options with the message "Please re-enter your custom passphrase: "',
																	then.itShouldUseOptionsWithTheMessage,
																);
																Then(
																	'it should reject with validation error and message "Your custom passphrase was not successfully repeated."',
																	then.itShouldRejectWithValidationErrorAndMessage,
																);
															},
														);
													},
												);
												Given(
													'the passphrase is successfully repeated',
													given.thePassphraseIsSuccessfullyRepeated,
													() => {
														When(
															'getPassphraseFromPrompt is called',
															when.getPassphraseFromPromptIsCalled,
															() => {
																Then(
																	'it should prompt for the passphrase twice',
																	then.itShouldPromptForThePassphraseTwice,
																);
																Then(
																	'it should use options with the message "Please enter your custom passphrase: "',
																	then.itShouldUseOptionsWithTheMessage,
																);
																Then(
																	'it should use options with the message "Please re-enter your custom passphrase: "',
																	then.itShouldUseOptionsWithTheMessage,
																);
																Then(
																	'it should resolve to the passphrase',
																	then.itShouldResolveToThePassphrase,
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
					describe('#getPassphraseFromSource', () => {
						Given(
							'an unknown passphrase source',
							given.anUnknownPassphraseSource,
							() => {
								When(
									'getPassphraseFromSourceIsCalled with the relevant source',
									when.getPassphraseFromSourceIsCalledWithTheRelevantSource,
									() => {
										Then(
											'it should reject with validation error and message "Your custom passphrase was provided with an unknown source type. Must be one of `env`, `file`, or `stdin`. Leave blank for prompt."',
											then.itShouldRejectWithValidationErrorAndMessage,
										);
									},
								);
							},
						);
						describe(`Given the passphrase is stored in environmental variable "${ENV_VARIABLE}"`, () => {
							beforeEach(given.thePassphraseIsStoredInEnvironmentalVariable);
							When(
								'getPassphraseFromSourceIsCalled with the relevant source',
								when.getPassphraseFromSourceIsCalledWithTheRelevantSource,
								() => {
									Then(
										'it should resolve to the passphrase',
										then.itShouldResolveToThePassphrase,
									);
								},
							);
						});
						Given(
							'a passphrase file path "/path/to/the/passphrase.txt"',
							given.aPassphraseFilePath,
							() => {
								Given('the file can be read', given.theFileCanBeRead, () => {
									When(
										'getPassphraseFromSourceIsCalled with the relevant source',
										when.getPassphraseFromSourceIsCalledWithTheRelevantSource,
										() => {
											Then(
												'it should resolve to the passphrase',
												then.itShouldResolveToThePassphrase,
											);
										},
									);
								});
							},
						);
						Given(
							'the passphrase is provided as plaintext',
							given.thePassphraseIsProvidedAsPlaintext,
							() => {
								When(
									'getPassphraseFromSourceIsCalled with the relevant source',
									when.getPassphraseFromSourceIsCalledWithTheRelevantSource,
									() => {
										Then(
											'it should resolve to the passphrase',
											then.itShouldResolveToThePassphrase,
										);
									},
								);
							},
						);
					});
				},
			);
			Given(
				'some data "This is some text\nthat spans\nmultiple lines"',
				given.someData,
				() => {
					describe('#getData', () => {
						Given(
							'no data source is provided',
							given.noDataSourceIsProvided,
							() => {
								When(
									'getData is called with the source',
									when.getDataIsCalledWithTheSource,
									() => {
										Then(
											'it should reject with validation error and message "No data was provided."',
											then.itShouldRejectWithValidationErrorAndMessage,
										);
									},
								);
							},
						);
						Given(
							'data is provided via an unknown source',
							given.dataIsProvidedViaAnUnknownSource,
							() => {
								When(
									'getData is called with the source',
									when.getDataIsCalledWithTheSource,
									() => {
										Then(
											'it should reject with validation error and message "Unknown data source type."',
											then.itShouldRejectWithValidationErrorAndMessage,
										);
									},
								);
							},
						);
						Given(
							'a data file path "/path/to/the/data.txt"',
							given.aDataFilePath,
							() => {
								Given(
									'the file does not exist',
									given.theFileDoesNotExist,
									() => {
										Given(
											'data is provided via a file source',
											given.dataIsProvidedViaAFileSource,
											() => {
												When(
													'getData is called with the source',
													when.getDataIsCalledWithTheSource,
													() => {
														Then(
															'it should reject with file system error and message "File at /path/to/the/data.txt does not exist."',
															then.itShouldRejectWithFileSystemErrorAndMessage,
														);
													},
												);
											},
										);
									},
								);
								Given(
									'the file cannot be read',
									given.theFileCannotBeRead,
									() => {
										Given(
											'data is provided via a file source',
											given.dataIsProvidedViaAFileSource,
											() => {
												When(
													'getData is called with the source',
													when.getDataIsCalledWithTheSource,
													() => {
														Then(
															'it should reject with file system error and message "File at /path/to/the/data.txt could not be read."',
															then.itShouldRejectWithFileSystemErrorAndMessage,
														);
													},
												);
											},
										);
									},
								);
								Given(
									'an unknown error "Unknown error" occurs when reading the file',
									given.anUnknownErrorOccursWhenReadingTheFile,
									() => {
										Given(
											'data is provided via a file source',
											given.dataIsProvidedViaAFileSource,
											() => {
												When(
													'getData is called with the source',
													when.getDataIsCalledWithTheSource,
													() => {
														Then(
															'it should reject with message "Unknown error"',
															then.itShouldRejectWithMessage,
														);
													},
												);
											},
										);
									},
								);
								Given('the file can be read', given.theFileCanBeRead, () => {
									Given(
										'data is provided via a file source',
										given.dataIsProvidedViaAFileSource,
										() => {
											When(
												'getData is called with the source',
												when.getDataIsCalledWithTheSource,
												() => {
													Then(
														'it should resolve to the data as a string',
														then.itShouldResolveToTheDataAsAString,
													);
												},
											);
										},
									);
								});
							},
						);
					});
					describe('#getDataFromFile', () => {
						Given(
							'a data file path "/path/to/the/data.txt"',
							given.aDataFilePath,
							() => {
								Given('the file can be read', given.theFileCanBeRead, () => {
									When(
										'getDataFromFile is called with the path',
										when.getDataFromFileIsCalledWithThePath,
										() => {
											Then(
												'fs.readFileSync should be called with the path and encoding',
												then.fsReadFileSyncShouldBeCalledWithThePathAndEncoding,
											);
											Then(
												'it should resolve to the data as a string',
												then.itShouldResolveToTheDataAsAString,
											);
										},
									);
								});
							},
						);
					});
					describe('#getStdIn', () => {
						Given(
							'a second passphrase "fame spoil quiz garbage mirror envelope island rapid lend year bike adapt"',
							given.aSecondPassphrase,
							() => {
								Given('a password "testing 123"', given.aPassword, () => {
									Given(
										'nothing is provided via stdin',
										given.nothingIsProvidedViaStdIn,
										() => {
											When(
												'getStdIn is called with the relevant options',
												when.getStdInIsCalledWithTheRelevantOptions,
												() => {
													Then(
														'it should return an empty object',
														then.itShouldReturnAnEmptyObject,
													);
												},
											);
										},
									);
									Given(
										'the passphrase is provided via stdin',
										given.thePassphraseIsProvidedViaStdIn,
										() => {
											When(
												'getStdIn is called with the relevant options',
												when.getStdInIsCalledWithTheRelevantOptions,
												() => {
													Then(
														'it should return an object with the passphrase',
														then.itShouldReturnAnObjectWithThePassphrase,
													);
												},
											);
										},
									);
									Given(
										'the second passphrase is provided via stdin',
										given.theSecondPassphraseIsProvidedViaStdIn,
										() => {
											When(
												'getStdIn is called with the relevant options',
												when.getStdInIsCalledWithTheRelevantOptions,
												() => {
													Then(
														'it should return an object with the second passphrase',
														then.itShouldReturnAnObjectWithTheSecondPassphrase,
													);
												},
											);
										},
									);
									Given(
										'the password is provided via stdin',
										given.thePasswordIsProvidedViaStdIn,
										() => {
											When(
												'getStdIn is called with the relevant options',
												when.getStdInIsCalledWithTheRelevantOptions,
												() => {
													Then(
														'it should return an object with the password',
														then.itShouldReturnAnObjectWithThePassword,
													);
												},
											);
										},
									);
									Given(
										'the data is provided via stdin',
										given.theDataIsProvidedViaStdIn,
										() => {
											When(
												'getStdIn is called with the relevant options',
												when.getStdInIsCalledWithTheRelevantOptions,
												() => {
													Then(
														'it should return an object with the data',
														then.itShouldReturnAnObjectWithTheData,
													);
												},
											);
										},
									);
									Given(
										'the passphrase, the second passphrase, the password and the data are provided via stdin',
										given.thePassphraseTheSecondPassphraseThePasswordAndTheDataAreProvidedViaStdIn,
										() => {
											When(
												'getStdIn is called with the relevant options',
												when.getStdInIsCalledWithTheRelevantOptions,
												() => {
													Then(
														'it should return an object with the passphrase, the second passphrase, the password and the data',
														then.itShouldReturnAnObjectWithThePassphraseTheSecondPassphraseThePasswordAndTheData,
													);
												},
											);
										},
									);
								});
							},
						);
					});
				},
			);
		},
	);
});
