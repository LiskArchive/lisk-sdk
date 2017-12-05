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
import { setUpCommandCreateTransactionCastVote } from '../../steps/setup';
import * as given from '../../steps/1_given';
import * as when from '../../steps/2_when';
import * as then from '../../steps/3_then';

describe('create transaction cast vote', () => {
	beforeEach(setUpCommandCreateTransactionCastVote);
	Given('a Vorpal instance with a UI and an active command that can prompt', given.aVorpalInstanceWithAUIAndAnActiveCommandThatCanPrompt, () => {
		Given('an action "create transaction cast vote"', given.anAction, () => {
			Given('a passphrase "minute omit local rare sword knee banner pair rib museum shadow juice"', given.aPassphrase, () => {
				Given('a second passphrase "fame spoil quiz garbage mirror envelope island rapid lend year bike adapt"', given.aSecondPassphrase, () => {
					Given('a Lisk object that can create transactions', given.aLiskObjectThatCanCreateTransactions, () => {
						Given('public keys that should be voted for "215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca", "922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa"', given.publicKeysThatShouldBeVotedFor, () => {
							Given('public keys that should be unvoted for "e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589", "ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba"', given.publicKeysThatShouldBeUnvotedFor, () => {
								Given('an empty options object', given.anEmptyOptionsObject, () => {
									When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
										Then('it should reject with message "At least one of vote and/or unvote options must be provided."', then.itShouldRejectWithMessage);
									});
								});
								Given('an options object with vote set to "file:path/to/votes.txt" and passphrase set to "passphraseSource" and second passphrase set to "secondPassphraseSource"', given.anOptionsObjectWithVoteSetToPassphraseSetToAndSecondPassphraseSetTo, () => {
									Given('an error "Unknown data source type. Must be one of `file`, or `stdin`." occurs retrieving the inputs from their sources', given.anErrorOccursRetrievingTheInputsFromTheirSources, () => {
										When('the action is called with the amount, the address and the options', when.theActionIsCalledWithTheAmountTheAddressAndTheOptions, () => {
											Then('it should reject with the error message', then.itShouldRejectWithTheErrorMessage);
										});
									});
								});
								Given('the passphrase can be retrieved from its source', given.thePassphraseCanBeRetrievedFromItsSource, () => {
									Given('an options object with vote set to "file:path/to/votes.txt" and unvote set to "file:path/to/votes.txt"', given.anOptionsObjectWithVoteSetToAndUnvoteSetTo, () => {
										When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
											Then('it should reject with message "Vote and unvote sources must not be the same."', then.itShouldRejectWithMessage);
										});
									});
									Given('an options object with vote set to "12345678123456781234567812345678123456781234567812345678123456gg"', given.anOptionsObjectWithVoteSetTo, () => {
										When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
											Then('it should reject with message "Public key 12345678123456781234567812345678123456781234567812345678123456gg bytes length differs from the expected 32 bytes for a public key."', then.itShouldRejectWithMessage);
										});
									});
									Given('an options object with vote set to "215b667a32a5cd51a94c9c2046c11,922fbfdd596fa78269bbcadc67ec"', given.anOptionsObjectWithVoteSetTo, () => {
										When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
											Then('it should reject with message "Error processing public key 215b667a32a5cd51a94c9c2046c11: Invalid hex string."', then.itShouldRejectWithMessage);
										});
									});
									Given('an options object with unvote set to "215b667a32a5cd51a94c9c2046c11,922fbfdd596fa78269bbcadc67ec"', given.anOptionsObjectWithUnvoteSetTo, () => {
										When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
											Then('it should reject with message "Error processing public key 215b667a32a5cd51a94c9c2046c11: Invalid hex string."', then.itShouldRejectWithMessage);
										});
									});
									Given('an options object with vote set to "215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca,922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa"', given.anOptionsObjectWithVoteSetTo, () => {
										When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
											Then('it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
											Then('it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
											Then('it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
											Then('it should not get the data using vote source', then.itShouldNotGetTheDataUsingTheVoteSource);
											Then('it should create a cast vote transaction with the passphrase and the public keys prepended with a plus', then.itShouldCreateACastVoteTransactionWithThePassphraseAndThePublicKeysPrependedWithAPlus);
											Then('it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
										});
									});
									Given('an options object with vote set to "file:path/to/votes.txt"', given.anOptionsObjectWithVoteSetTo, () => {
										Given('the vote can be retreived from its source', given.theVoteCanBeRetrievedFromItsSource, () => {
											When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
												Then('it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
												Then('it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
												Then('it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
												Then('it should get the data using the vote source', then.itShouldGetTheDataUsingTheVoteSource);
												Then('it should create a cast vote transaction with the passphrase and the public keys prepended with a plus', then.itShouldCreateACastVoteTransactionWithThePassphraseAndThePublicKeysPrependedWithAPlus);
												Then('it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
											});
										});
									});
									Given('an options object with unvote set to "e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589,ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba"', given.anOptionsObjectWithUnvoteSetTo, () => {
										When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
											Then('it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
											Then('it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
											Then('it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
											Then('it should not get the data using vote source', then.itShouldNotGetTheDataUsingTheVoteSource);
											Then('it should not get the data using the unvote source', then.itShouldNotGetTheDataUsingTheUnvoteSource);
											Then('it should create a cast vote transaction with the passphrase and the public keys prepended with a minus', then.itShouldCreateACastVoteTransactionWithThePassphraseAndThePublicKeysPrependedWithAMinus);
											Then('it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
										});
									});
									Given('an options object with unvote set to "file:path/to/unvotes.txt"', given.anOptionsObjectWithUnvoteSetTo, () => {
										Given('the unvote can be retrieved from its sources', given.theUnvoteCanBeRetrievedFromItsSource, () => {
											When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
												Then('it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
												Then('it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
												Then('it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
												Then('it should get the data using the unvote source', then.itShouldGetTheDataUsingTheUnvoteSource);
												Then('it should create a cast vote transaction with the passphrase and the public keys prepended with a minus', then.itShouldCreateACastVoteTransactionWithThePassphraseAndThePublicKeysPrependedWithAMinus);
												Then('it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
											});
										});
									});
									Given('an options object with vote set to "215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca,922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa" and unvote set to "e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589,ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba"', given.anOptionsObjectWithVoteSetToAndUnvoteSetTo, () => {
										When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
											Then('it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
											Then('it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
											Then('it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
											Then('it should not get the data using the vote source', then.itShouldNotGetTheDataUsingTheVoteSource);
											Then('it should not get the data using the unvote source', then.itShouldNotGetTheDataUsingTheUnvoteSource);
											Then('it should create a cast vote transaction with the passphrase and the public keys prepended with the correct modified', then.itShouldCreateACastVoteTransactionWithThePassphraseAndThePublicKeysPrependedWithTheCorrectModifier);
											Then('it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
										});
									});
									Given('an options object with vote set to "file:path/to/votes.txt" unvote set to "file:path/to/unvotes.txt"', given.anOptionsObjectWithVoteSetToAndUnvoteSetTo, () => {
										Given('the votes can be retrieved from their sources', given.theVoteCanBeRetrievedFromItsSource, () => {
											Given('the unvotes can be retrieved from their sources', given.theUnvoteCanBeRetrievedFromItsSource, () => {
												When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
													Then('it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
													Then('it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
													Then('it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
													Then('it should get the data using the vote source', then.itShouldGetTheDataUsingTheVoteSource);
													Then('it should get the data using the unvote source', then.itShouldGetTheDataUsingTheUnvoteSource);
													Then('it should create a cast vote transaction with the passphrase and the public keys prepended with the correct modified', then.itShouldCreateACastVoteTransactionWithThePassphraseAndThePublicKeysPrependedWithTheCorrectModifier);
													Then('it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
												});
											});
										});
									});
								});
								Given('the passphrase and the second passphrase can be retrieved from their sources', given.thePassphraseAndSecondPassphraseCanBeRetrievedFromTheirSources, () => {
									Given('an options object with vote set to "215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca,922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa"', given.anOptionsObjectWithVoteSetTo, () => {
										When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
											Then('it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
											Then('it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
											Then('it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
											Then('it should not get the data using vote source', then.itShouldNotGetTheDataUsingTheVoteSource);
											Then('it should not get the data using the unvote source', then.itShouldNotGetTheDataUsingTheUnvoteSource);
											Then('it should create a cast vote transaction with the passphrase, the second passphrase and the public keys prepended with a plus', then.itShouldCreateACastVoteTransactionWithThePassphraseTheSecondPassphraseAndThePublicKeysPrependedWithAPlus);
											Then('it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
										});
									});
									Given('an options object with vote set to "file:path/to/votes.txt"', given.anOptionsObjectWithVoteSetTo, () => {
										Given('the votes can be retrieved from their sources', given.theVoteCanBeRetrievedFromItsSource, () => {
											When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
												Then('it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
												Then('it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
												Then('it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
												Then('it should get the data using the vote source', then.itShouldGetTheDataUsingTheVoteSource);
												Then('it should create a cast vote transaction with the passphrase, the second passphrase and the public keys prepended with a plus', then.itShouldCreateACastVoteTransactionWithThePassphraseTheSecondPassphraseAndThePublicKeysPrependedWithAPlus);
												Then('it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
											});
										});
									});
									Given('an options object with unvote set to "e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589,ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba"', given.anOptionsObjectWithUnvoteSetTo, () => {
										When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
											Then('it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
											Then('it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
											Then('it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
											Then('it should not get the data using unvote source', then.itShouldNotGetTheDataUsingTheUnvoteSource);
											Then('it should create a cast vote transaction with the passphrase, the second passphrase and the public keys prepended with a minus', then.itShouldCreateACastVoteTransactionWithThePassphraseTheSecondPassphraseAndThePublicKeysPrependedWithAMinus);
											Then('it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
										});
									});
									Given('an options object with unvote set to "file:path/to/unvotes.txt"', given.anOptionsObjectWithUnvoteSetTo, () => {
										Given('the unvotes can be retrieved from their sources', given.theUnvoteCanBeRetrievedFromItsSource, () => {
											When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
												Then('it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
												Then('it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
												Then('it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
												Then('it should get the data using the unvote source', then.itShouldGetTheDataUsingTheUnvoteSource);
												Then('it should create a cast vote transaction with the passphrase, the second passphrase and the public keys prepended with a minus', then.itShouldCreateACastVoteTransactionWithThePassphraseTheSecondPassphraseAndThePublicKeysPrependedWithAMinus);
												Then('it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
											});
										});
									});
									Given('an options object with vote set to "215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452bca,922fbfdd596fa78269bbcadc67ec2a1cc15fc929a19c462169568d7a3df1a1aa" and unvote set to "e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589,ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba"', given.anOptionsObjectWithVoteSetToAndUnvoteSetTo, () => {
										When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
											Then('it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
											Then('it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
											Then('it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
											Then('it should not get the data using unvote source', then.itShouldNotGetTheDataUsingTheUnvoteSource);
											Then('it should create a cast vote transaction with the passphrase, the second passphrase and the public keys prepended with a minus', then.itShouldCreateACastVoteTransactionWithThePassphraseTheSecondPassphraseAndThePublicKeysPrependedWithTheCorrectModifier);
											Then('it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
										});
									});
									Given('an options object with vote set to "file:path/to/votes.txt" unvote set to "file:path/to/unvotes.txt"', given.anOptionsObjectWithVoteSetToAndUnvoteSetTo, () => {
										Given('the votes can be retrieved from their sources', given.theVoteCanBeRetrievedFromItsSource, () => {
											Given('the unvotes can be retrieved from their sources', given.theUnvoteCanBeRetrievedFromItsSource, () => {
												When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
													Then('it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
													Then('it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
													Then('it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
													Then('it should get the data using the unvote source', then.itShouldGetTheDataUsingTheUnvoteSource);
													Then('it should create a cast vote transaction with the passphrase, the second passphrase and the public keys prepended with a minus', then.itShouldCreateACastVoteTransactionWithThePassphraseTheSecondPassphraseAndThePublicKeysPrependedWithTheCorrectModifier);
													Then('it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
												});
											});
										});
									});
								});
							});
							Given('an options object with vote set to "file:path/to/votes.txt" and passphrase set to "prompt"', given.anOptionsObjectWithVoteSetToAndPassphraseSetTo, () => {
								Given('the passphrase can be retrieved from its source', given.thePassphraseCanBeRetrievedFromItsSource, () => {
									Given('the votes can be retrieved from their sources', given.theVoteCanBeRetrievedFromItsSource, () => {
										When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
											Then('it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
											Then('it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
											Then('it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
											Then('it should get the data using the vote source', then.itShouldGetTheDataUsingTheVoteSource);
											Then('it should create a cast vote transaction with the passphrase and the public keys prepended with a plus', then.itShouldCreateACastVoteTransactionWithThePassphraseAndThePublicKeysPrependedWithAPlus);
											Then('it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
										});
									});
								});
							});
							Given('an options object with vote set to "file:path/to/votes.txt" and passphrase set to "file:path/to/my/passphrase.txt" and second passphrase set to "prompt"', given.anOptionsObjectWithVoteSetToPassphraseSetToAndSecondPassphraseSetTo, () => {
								Given('the passphrase and the second passphrase can be retrieved from their sources', given.thePassphraseAndSecondPassphraseCanBeRetrievedFromTheirSources, () => {
									Given('the votes can be retrieved from their sources', given.theVoteCanBeRetrievedFromItsSource, () => {
										When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
											Then('it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
											Then('it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
											Then('it should get the inputs from sources using the second passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingTheSecondPassphraseSourceWithARepeatingPrompt);
											Then('it should get the data using the vote source', then.itShouldGetTheDataUsingTheVoteSource);
											Then('it should create a cast vote transaction with the passphrase, the second passphrase and the public keys prepended with a plus', then.itShouldCreateACastVoteTransactionWithThePassphraseTheSecondPassphraseAndThePublicKeysPrependedWithAPlus);
											Then('it should resolve to the created transaction', then.itShouldResolveToTheCreatedTransaction);
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
