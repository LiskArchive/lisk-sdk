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
import { setUpCommandCreateTransactionCastVotes } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('create transaction cast votes', () => {
	beforeEach(setUpCommandCreateTransactionCastVotes);
	Given(
		'a Vorpal instance with a UI and an active command that can prompt',
		given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt,
		() => {
			Given('an action "create transaction cast votes"', given.anAction, () => {
				Given(
					'a Lisk object that can create transactions',
					given.aLiskObjectThatCanCreateTransactions,
					() => {
						Given(
							'a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"',
							given.aPassphrase,
							() => {
								Given(
									'a second passphrase "fame spoil quiz garbage mirror envelope island rapid lend year bike adapt"',
									given.aSecondPassphrase,
									() => {
										Given(
											'the passphrase can be retrieved from its source',
											given.thePassphraseCanBeRetrievedFromItsSource,
											() => {
												Given(
													'a public key that should be voted for "1234567812345678123456781234567812345678123456781234567812345678"',
													given.aPublicKeyThatShouldBeVotedFor,
													() => {
														Given(
															'an options object with votes set to "1234567812345678123456781234567812345678123456781234567812345678"',
															given.anOptionsObjectWithVotesSetTo,
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
																			'it should not get the inputs from sources using the second passphrase source',
																			then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource,
																		);
																		Then(
																			'it should not get the data using the votes source',
																			then.itShouldNotGetTheDataUsingTheVotesSource,
																		);
																		Then(
																			'it should not get the data using the unvotes source',
																			then.itShouldNotGetTheDataUsingTheUnvotesSource,
																		);
																		Then(
																			'it should create a cast votes transaction with the passphrase and the public keys added to votes',
																			then.itShouldCreateACastVotesTransactionWithThePassphraseAndThePublicKeysAddedToVotes,
																		);
																		Then(
																			'it should resolve to the created transaction',
																			then.itShouldResolveToTheCreatedTransaction,
																		);
																	},
																);
															},
														);
													},
												);
												Given(
													'public keys that should be unvoted for "1234567812345678123456781234567812345678123456781234567812345678"',
													given.publicKeysThatShouldBeUnvotedFor,
													() => {
														Given(
															'an options object with unvotes set to "1234567812345678123456781234567812345678123456781234567812345678"',
															given.anOptionsObjectWithUnvotesSetTo,
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
																			'it should not get the inputs from sources using the second passphrase source',
																			then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource,
																		);
																		Then(
																			'it should not get the data using the votes source',
																			then.itShouldNotGetTheDataUsingTheVotesSource,
																		);
																		Then(
																			'it should not get the data using the unvotes source',
																			then.itShouldNotGetTheDataUsingTheUnvotesSource,
																		);
																		Then(
																			'it should create a cast votes transaction with the passphrase and the public keys added to unvotes',
																			then.itShouldCreateACastVotesTransactionWithThePassphraseAndThePublicKeysAddedToUnvotes,
																		);
																		Then(
																			'it should resolve to the created transaction',
																			then.itShouldResolveToTheCreatedTransaction,
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
											'public keys that should be voted for "215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca", "922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa"',
											given.publicKeysThatShouldBeVotedFor,
											() => {
												Given(
													'public keys that should be unvoted for "e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589", "ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba"',
													given.publicKeysThatShouldBeUnvotedFor,
													() => {
														Given(
															'an empty options object',
															given.anEmptyOptionsObject,
															() => {
																When(
																	'the action is called with the options',
																	when.theActionIsCalledWithTheOptions,
																	() => {
																		Then(
																			'it should reject with validation error and message "At least one of votes and/or unvotes options must be provided."',
																			then.itShouldRejectWithValidationErrorAndMessage,
																		);
																	},
																);
															},
														);
														Given(
															'an options object with votes set to "file:path/to/votes.txt" and passphrase set to "passphraseSource" and second passphrase set to "secondPassphraseSource"',
															given.anOptionsObjectWithVotesSetToPassphraseSetToAndSecondPassphraseSetTo,
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
															},
														);
														Given(
															'an options object with unvotes set to "file:path/to/unvotes.txt" and passphrase set to "passphraseSource" and second passphrase set to "secondPassphraseSource"',
															given.anOptionsObjectWithUnvotesSetToPassphraseSetToAndSecondPassphraseSetTo,
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
															},
														);
														Given(
															'the passphrase can be retrieved from its source',
															given.thePassphraseCanBeRetrievedFromItsSource,
															() => {
																Given(
																	'an options object with votes set to "file:path/to/votes.txt" and unvotes set to "file:path/to/votes.txt"',
																	given.anOptionsObjectWithVotesSetToAndUnvotesSetTo,
																	() => {
																		When(
																			'the action is called with the options',
																			when.theActionIsCalledWithTheOptions,
																			() => {
																				Then(
																					'it should reject with validation error and message "Votes and unvotes sources must not be the same."',
																					then.itShouldRejectWithValidationErrorAndMessage,
																				);
																			},
																		);
																	},
																);
																Given(
																	'an options object with votes set to "12345678123456781234567812345678123456781234567812345678123456gg"',
																	given.anOptionsObjectWithVotesSetTo,
																	() => {
																		When(
																			'the action is called with the options',
																			when.theActionIsCalledWithTheOptions,
																			() => {
																				Then(
																					'it should reject with validation error and message "Public key 12345678123456781234567812345678123456781234567812345678123456gg bytes length differs from the expected 32 bytes for a public key."',
																					then.itShouldRejectWithValidationErrorAndMessage,
																				);
																			},
																		);
																	},
																);
																Given(
																	'an options object with unvotes set to "12345678123456781234567812345678123456781234567812345678123456gg"',
																	given.anOptionsObjectWithUnvotesSetTo,
																	() => {
																		When(
																			'the action is called with the options',
																			when.theActionIsCalledWithTheOptions,
																			() => {
																				Then(
																					'it should reject with validation error and message "Public key 12345678123456781234567812345678123456781234567812345678123456gg bytes length differs from the expected 32 bytes for a public key."',
																					then.itShouldRejectWithValidationErrorAndMessage,
																				);
																			},
																		);
																	},
																);
																Given(
																	'an options object with votes set to "215b667a32a5cd51a94c9c2046c11,922fbfdd596fa78269bbcadc67ec"',
																	given.anOptionsObjectWithVotesSetTo,
																	() => {
																		When(
																			'the action is called with the options',
																			when.theActionIsCalledWithTheOptions,
																			() => {
																				Then(
																					'it should reject with validation error and message "Error processing public key 215b667a32a5cd51a94c9c2046c11: Invalid hex string."',
																					then.itShouldRejectWithValidationErrorAndMessage,
																				);
																			},
																		);
																	},
																);
																Given(
																	'an options object with unvotes set to "215b667a32a5cd51a94c9c2046c11,922fbfdd596fa78269bbcadc67ec"',
																	given.anOptionsObjectWithUnvotesSetTo,
																	() => {
																		When(
																			'the action is called with the options',
																			when.theActionIsCalledWithTheOptions,
																			() => {
																				Then(
																					'it should reject with validation error and message "Error processing public key 215b667a32a5cd51a94c9c2046c11: Invalid hex string."',
																					then.itShouldRejectWithValidationErrorAndMessage,
																				);
																			},
																		);
																	},
																);
																Given(
																	'an options object with votes set to "\n215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca \n922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa\n\n"',
																	given.anOptionsObjectWithVotesSetTo,
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
																					'it should not get the inputs from sources using the second passphrase source',
																					then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource,
																				);
																				Then(
																					'it should not get the data using the votes source',
																					then.itShouldNotGetTheDataUsingTheVotesSource,
																				);
																				Then(
																					'it should create a cast votes transaction with the passphrase and the public keys added to votes',
																					then.itShouldCreateACastVotesTransactionWithThePassphraseAndThePublicKeysAddedToVotes,
																				);
																				Then(
																					'it should resolve to the created transaction',
																					then.itShouldResolveToTheCreatedTransaction,
																				);
																			},
																		);
																	},
																);
																Given(
																	'an options object with unvotes set to "\ne01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589\n ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba \n"',
																	given.anOptionsObjectWithUnvotesSetTo,
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
																					'it should not get the inputs from sources using the second passphrase source',
																					then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource,
																				);
																				Then(
																					'it should not get the data using the unvotes source',
																					then.itShouldNotGetTheDataUsingTheUnvotesSource,
																				);
																				Then(
																					'it should create a cast votes transaction with the passphrase and the public keys added to unvotes',
																					then.itShouldCreateACastVotesTransactionWithThePassphraseAndThePublicKeysAddedToUnvotes,
																				);
																				Then(
																					'it should resolve to the created transaction',
																					then.itShouldResolveToTheCreatedTransaction,
																				);
																			},
																		);
																	},
																);
																Given(
																	'an options object with votes set to "215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca,922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa"',
																	given.anOptionsObjectWithVotesSetTo,
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
																					'it should not get the inputs from sources using the second passphrase source',
																					then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource,
																				);
																				Then(
																					'it should not get the data using the votes source',
																					then.itShouldNotGetTheDataUsingTheVotesSource,
																				);
																				Then(
																					'it should create a cast votes transaction with the passphrase and the public keys added to votes',
																					then.itShouldCreateACastVotesTransactionWithThePassphraseAndThePublicKeysAddedToVotes,
																				);
																				Then(
																					'it should resolve to the created transaction',
																					then.itShouldResolveToTheCreatedTransaction,
																				);
																			},
																		);
																	},
																);
																Given(
																	'an options object with votes set to "file:path/to/votes.txt"',
																	given.anOptionsObjectWithVotesSetTo,
																	() => {
																		Given(
																			'the votes can be retrieved from their source',
																			given.theVotesCanBeRetrievedFromTheirSource,
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
																							'it should not get the inputs from sources using the second passphrase source',
																							then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource,
																						);
																						Then(
																							'it should get the data using the votes source',
																							then.itShouldGetTheDataUsingTheVotesSource,
																						);
																						Then(
																							'it should create a cast votes transaction with the passphrase and the public keys added to votes',
																							then.itShouldCreateACastVotesTransactionWithThePassphraseAndThePublicKeysAddedToVotes,
																						);
																						Then(
																							'it should resolve to the created transaction',
																							then.itShouldResolveToTheCreatedTransaction,
																						);
																					},
																				);
																			},
																		);
																	},
																);
																Given(
																	'an options object with unvotes set to "e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589,ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba"',
																	given.anOptionsObjectWithUnvotesSetTo,
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
																					'it should not get the inputs from sources using the second passphrase source',
																					then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource,
																				);
																				Then(
																					'it should not get the data using the unvotes source',
																					then.itShouldNotGetTheDataUsingTheUnvotesSource,
																				);
																				Then(
																					'it should create a cast votes transaction with the passphrase and the public keys added to unvotes',
																					then.itShouldCreateACastVotesTransactionWithThePassphraseAndThePublicKeysAddedToUnvotes,
																				);
																				Then(
																					'it should resolve to the created transaction',
																					then.itShouldResolveToTheCreatedTransaction,
																				);
																			},
																		);
																	},
																);
																Given(
																	'an options object with unvotes set to "file:path/to/unvotes.txt"',
																	given.anOptionsObjectWithUnvotesSetTo,
																	() => {
																		Given(
																			'the unvotes can be retrieved from their source',
																			given.theUnvotesCanBeRetrievedFromTheirSource,
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
																							'it should not get the inputs from sources using the second passphrase source',
																							then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource,
																						);
																						Then(
																							'it should get the data using the unvotes source',
																							then.itShouldGetTheDataUsingTheUnvotesSource,
																						);
																						Then(
																							'it should create a cast votes transaction with the passphrase and the public keys added to unvotes',
																							then.itShouldCreateACastVotesTransactionWithThePassphraseAndThePublicKeysAddedToUnvotes,
																						);
																						Then(
																							'it should resolve to the created transaction',
																							then.itShouldResolveToTheCreatedTransaction,
																						);
																					},
																				);
																			},
																		);
																	},
																);
																Given(
																	'an options object with votes set to "215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca,922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa" and unvotes set to "e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589,ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba"',
																	given.anOptionsObjectWithVotesSetToAndUnvotesSetTo,
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
																					'it should not get the inputs from sources using the second passphrase source',
																					then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource,
																				);
																				Then(
																					'it should not get the data using the votes source',
																					then.itShouldNotGetTheDataUsingTheVotesSource,
																				);
																				Then(
																					'it should not get the data using the unvotes source',
																					then.itShouldNotGetTheDataUsingTheUnvotesSource,
																				);
																				Then(
																					'it should create a cast votes transaction with the passphrase and the public keys to corresponding vote keys',
																					then.itShouldCreateACastVoteTransactionWithThePassphraseAndThePublicKeysToCorrespondingVoteKeys,
																				);
																				Then(
																					'it should resolve to the created transaction',
																					then.itShouldResolveToTheCreatedTransaction,
																				);
																			},
																		);
																	},
																);
																Given(
																	'an options object with votes set to "file:path/to/votes.txt" and unvotes set to "file:path/to/unvotes.txt"',
																	given.anOptionsObjectWithVotesSetToAndUnvotesSetTo,
																	() => {
																		Given(
																			'the votes can be retrieved from their source',
																			given.theVotesCanBeRetrievedFromTheirSource,
																			() => {
																				Given(
																					'the unvotes can be retrieved from their source',
																					given.theUnvotesCanBeRetrievedFromTheirSource,
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
																									'it should not get the inputs from sources using the second passphrase source',
																									then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource,
																								);
																								Then(
																									'it should get the data using the votes source',
																									then.itShouldGetTheDataUsingTheVotesSource,
																								);
																								Then(
																									'it should get the data using the unvotes source',
																									then.itShouldGetTheDataUsingTheUnvotesSource,
																								);
																								Then(
																									'it should create a cast votes transaction with the passphrase and the public keys to corresponding vote keys',
																									then.itShouldCreateACastVoteTransactionWithThePassphraseAndThePublicKeysToCorrespondingVoteKeys,
																								);
																								Then(
																									'it should resolve to the created transaction',
																									then.itShouldResolveToTheCreatedTransaction,
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
														Given(
															'an options object with votes set to "file:path/to/votes.txt" and passphrase set to "prompt"',
															given.anOptionsObjectWithVotesSetToAndPassphraseSetTo,
															() => {
																Given(
																	'the passphrase can be retrieved from its source',
																	given.thePassphraseCanBeRetrievedFromItsSource,
																	() => {
																		Given(
																			'the votes can be retrieved from their source',
																			given.theVotesCanBeRetrievedFromTheirSource,
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
																							'it should not get the inputs from sources using the second passphrase source',
																							then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource,
																						);
																						Then(
																							'it should get the data using the votes source',
																							then.itShouldGetTheDataUsingTheVotesSource,
																						);
																						Then(
																							'it should create a cast votes transaction with the passphrase and the public keys added to votes',
																							then.itShouldCreateACastVotesTransactionWithThePassphraseAndThePublicKeysAddedToVotes,
																						);
																						Then(
																							'it should resolve to the created transaction',
																							then.itShouldResolveToTheCreatedTransaction,
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
															'an options object with votes set to "file:path/to/votes.txt" and passphrase set to "file:path/to/my/passphrase.txt" and second passphrase set to "prompt"',
															given.anOptionsObjectWithVotesSetToPassphraseSetToAndSecondPassphraseSetTo,
															() => {
																Given(
																	'the passphrase and the second passphrase can be retrieved from their sources',
																	given.thePassphraseAndSecondPassphraseCanBeRetrievedFromTheirSources,
																	() => {
																		Given(
																			'the votes can be retrieved from their source',
																			given.theVotesCanBeRetrievedFromTheirSource,
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
																							'it should get the inputs from sources using the second passphrase source with a repeating prompt',
																							then.itShouldGetTheInputsFromSourcesUsingTheSecondPassphraseSourceWithARepeatingPrompt,
																						);
																						Then(
																							'it should get the data using the votes source',
																							then.itShouldGetTheDataUsingTheVotesSource,
																						);
																						Then(
																							'it should create a cast votes transaction with the passphrase, the second passphrase and the public keys added to votes',
																							then.itShouldCreateACastVotesTransactionWithThePassphraseTheSecondPassphraseAndThePublicKeysAddedToVotes,
																						);
																						Then(
																							'it should resolve to the created transaction',
																							then.itShouldResolveToTheCreatedTransaction,
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
															'an options object with unvotes set to "file:path/to/unvotes.txt" and passphrase set to "prompt"',
															given.anOptionsObjectWithUnvotesSetToAndPassphraseSetTo,
															() => {
																Given(
																	'the passphrase can be retrieved from its source',
																	given.thePassphraseCanBeRetrievedFromItsSource,
																	() => {
																		Given(
																			'the unvotes can be retrieved from their source',
																			given.theUnvotesCanBeRetrievedFromTheirSource,
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
																							'it should not get the inputs from sources using the second passphrase source',
																							then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource,
																						);
																						Then(
																							'it should get the data using the unvotes source',
																							then.itShouldGetTheDataUsingTheUnvotesSource,
																						);
																						Then(
																							'it should create a cast votes transaction with the passphrase and the public keys added to unvotes',
																							then.itShouldCreateACastVotesTransactionWithThePassphraseAndThePublicKeysAddedToUnvotes,
																						);
																						Then(
																							'it should resolve to the created transaction',
																							then.itShouldResolveToTheCreatedTransaction,
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
															'an options object with unvotes set to "file:path/to/unvotes.txt" and passphrase set to "file:path/to/my/passphrase.txt" and second passphrase set to "prompt"',
															given.anOptionsObjectWithUnvotesSetToPassphraseSetToAndSecondPassphraseSetTo,
															() => {
																Given(
																	'the passphrase and the second passphrase can be retrieved from their sources',
																	given.thePassphraseAndSecondPassphraseCanBeRetrievedFromTheirSources,
																	() => {
																		Given(
																			'the unvotes can be retrieved from their source',
																			given.theUnvotesCanBeRetrievedFromTheirSource,
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
																							'it should get the inputs from sources using the second passphrase source with a repeating prompt',
																							then.itShouldGetTheInputsFromSourcesUsingTheSecondPassphraseSourceWithARepeatingPrompt,
																						);
																						Then(
																							'it should get the data using the unvotes source',
																							then.itShouldGetTheDataUsingTheUnvotesSource,
																						);
																						Then(
																							'it should create a cast votes transaction with the passphrase, the second passphrase and the public keys added to unvotes',
																							then.itShouldCreateACastVotesTransactionWithThePassphraseTheSecondPassphraseAndThePublicKeysAddedToUnvotes,
																						);
																						Then(
																							'it should resolve to the created transaction',
																							then.itShouldResolveToTheCreatedTransaction,
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
							},
						);
						Given(
							'a public key that should be voted for "1234567812345678123456781234567812345678123456781234567812345678"',
							given.aPublicKeyThatShouldBeVotedFor,
							() => {
								Given(
									'an options object with signature set to false and votes set to "1234567812345678123456781234567812345678123456781234567812345678"',
									given.anOptionsObjectWithSignatureSetToAndVotesSetTo,
									() => {
										When(
											'the action is called with the options',
											when.theActionIsCalledWithTheOptions,
											() => {
												Then(
													'it should create a cast votes transaction with the the public keys added to votes',
													then.itShouldCreateACastVotesTransactionWithThePublicKeysAddedToVotes,
												);
												Then(
													'it should resolve to the created transaction',
													then.itShouldResolveToTheCreatedTransaction,
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
