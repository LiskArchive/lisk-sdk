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
										Then('it should throw "create transaction `cast vote` needs vote and/or unvote options"', then.itShouldRejectWithMessage);
									});
								});
								Given('the passphrase can be retrieved from its source', given.thePassphraseCanBeRetrievedFromItsSource, () => {
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
									Given('an options object with unvote set to "e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589,ac09bc40c889f688f9158cca1fcfcdf6320f501242e0f7088d52a5077084ccba"', given.anOptionsObjectWithUnvoteSetTo, () => {
										When('the action is called with the options', when.theActionIsCalledWithTheOptions, () => {
											Then('it should get the inputs from sources using the Vorpal instance', then.itShouldGetTheInputsFromSourcesUsingTheVorpalInstance);
											Then('it should get the inputs from sources using the passphrase source with a repeating prompt', then.itShouldGetTheInputsFromSourcesUsingThePassphraseSourceWithARepeatingPrompt);
											Then('it should not get the inputs from sources using the second passphrase source', then.itShouldNotGetTheInputsFromSourcesUsingTheSecondPassphraseSource);
											Then('it should not get the data using unvote source', then.itShouldNotGetTheDataUsingTheUnvoteSource);
											Then('it should create a cast vote transaction with the passphrase and the public keys prepended with a minus', then.itShouldCreateACastVoteTransactionWithThePassphraseAndThePublicKeysPrependedWithAMinus);
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
											Then('it should not get the data using unvote source', then.itShouldNotGetTheDataUsingTheUnvoteSource);
											Then('it should create a cast vote transaction with the passphrase and the public keys prepended with a minus', then.itShouldCreateACastVoteTransactionWithThePassphraseAndThePublicKeysPrependedWithTheCorrectModifier);
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
													Then('it should create a cast vote transaction with the passphrase and the public keys prepended with a minus', then.itShouldCreateACastVoteTransactionWithThePassphraseAndThePublicKeysPrependedWithTheCorrectModifier);
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
						});
					});
				});
			});
		});
	});
});
