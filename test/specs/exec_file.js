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
import { setUpExecFile } from '../steps/setup';
import * as given from '../steps/1_given';
import * as when from '../steps/2_when';
import * as then from '../steps/3_then';

const validFileContents = `#!/usr/bin/env lisk-commander

# some comment
get delegate lightcurve

# list accounts 123L 456L

create account
list blocks 100 200

`;

describe('execFile', () => {
	beforeEach(setUpExecFile);
	Given('a Lisk Commander instance', given.aLiskCommanderInstance, () => {
		Given('a file path "/path/to/script.lisk"', given.aFilePath, () => {
			Given('an exit function', given.anExitFunction, () => {
				Given('the file cannot be read', given.theFileCannotBeRead, () => {
					When(
						'execFile is called with the Lisk Commander instance, the file path and the exit function',
						when.execFileIsCalledWithTheLiskCommanderInstanceTheFilePathAndTheExitFunction,
						() => {
							Then(
								'it should throw file system error "EACCES: permission denied"',
								then.itShouldThrowFileSystemError,
							);
						},
					);
				});
				Given(
					`the file at the file path has contents "${validFileContents}"`,
					given.theFileAtTheFilePathHasContents,
					() => {
						Given(
							'the first child process outputs "{ \'key\': 1 }"',
							given.theFirstChildProcessOutputs,
							() => {
								Given(
									'the second child process exits with error "Something went wrong"',
									given.theSecondChildProcessExitsWithError,
									() => {
										When(
											'execFile is called with the Lisk Commander instance, the file path and the exit function',
											when.execFileIsCalledWithTheLiskCommanderInstanceTheFilePathAndTheExitFunction,
											() => {
												Then(
													'it should execute a script executing "get delegate lightcurve" first in a separate child process',
													then.itShouldExecuteAScriptExecutingFirstInASeparateChildProcess,
												);
												Then(
													'it should execute a script executing "create account" second in a separate child process',
													then.itShouldExecuteAScriptExecutingSecondInASeparateChildProcess,
												);
												Then(
													'it should not execute a third script in a separate child process',
													then.itShouldNotExecuteAThirdScriptInASeparateChildProcess,
												);
												Then(
													'the Lisk Commander instance should log the first child process output first',
													then.theLiskCommanderInstanceShouldLogTheFirstChildProcessOutputFirst,
												);
												Then(
													'the Lisk Commander instance should log the second child process error second',
													then.theLiskCommanderInstanceShouldLogTheSecondChildProcessErrorSecond,
												);
												Then(
													'it should exit with code 1',
													then.itShouldExitWithCode,
												);
											},
										);
									},
								);
								Given(
									'the second child process exits with an error that cannot be trimmed',
									given.theSecondChildProcessExitsWithAnErrorThatCannotBeTrimmed,
									() => {
										When(
											'execFile is called with the Lisk Commander instance, the file path and the exit function',
											when.execFileIsCalledWithTheLiskCommanderInstanceTheFilePathAndTheExitFunction,
											() => {
												Then(
													'it should execute a script executing "get delegate lightcurve" first in a separate child process',
													then.itShouldExecuteAScriptExecutingFirstInASeparateChildProcess,
												);
												Then(
													'it should execute a script executing "create account" second in a separate child process',
													then.itShouldExecuteAScriptExecutingSecondInASeparateChildProcess,
												);
												Then(
													'it should not execute a third script in a separate child process',
													then.itShouldNotExecuteAThirdScriptInASeparateChildProcess,
												);
												Then(
													'the Lisk Commander instance should log the first child process output first',
													then.theLiskCommanderInstanceShouldLogTheFirstChildProcessOutputFirst,
												);
												Then(
													'the Lisk Commander instance should log the second child process error second',
													then.theLiskCommanderInstanceShouldLogTheSecondChildProcessErrorSecond,
												);
												Then(
													'it should exit with code 1',
													then.itShouldExitWithCode,
												);
											},
										);
									},
								);
								Given(
									'the second child process outputs "Something went wrong" to stderr',
									given.theSecondChildProcessOutputsToStdErr,
									() => {
										When(
											'execFile is called with the Lisk Commander instance, the file path and the exit function',
											when.execFileIsCalledWithTheLiskCommanderInstanceTheFilePathAndTheExitFunction,
											() => {
												Then(
													'it should execute a script executing "get delegate lightcurve" first in a separate child process',
													then.itShouldExecuteAScriptExecutingFirstInASeparateChildProcess,
												);
												Then(
													'it should execute a script executing "create account" second in a separate child process',
													then.itShouldExecuteAScriptExecutingSecondInASeparateChildProcess,
												);
												Then(
													'it should not execute a third script in a separate child process',
													then.itShouldNotExecuteAThirdScriptInASeparateChildProcess,
												);
												Then(
													'the Lisk Commander instance should log the first child process output first',
													then.theLiskCommanderInstanceShouldLogTheFirstChildProcessOutputFirst,
												);
												Then(
													'the Lisk Commander instance should log the second child process error second',
													then.theLiskCommanderInstanceShouldLogTheSecondChildProcessErrorSecond,
												);
												Then(
													'it should exit with code 1',
													then.itShouldExitWithCode,
												);
											},
										);
									},
								);
								Given(
									'the second child process outputs "{ \'key\': 2 }"',
									given.theSecondChildProcessOutputs,
									() => {
										Given(
											'the third child process outputs "{ \'key\': 3 }"',
											given.theThirdChildProcessOutputs,
											() => {
												When(
													'execFile is called with the Lisk Commander instance, the file path and the exit function',
													when.execFileIsCalledWithTheLiskCommanderInstanceTheFilePathAndTheExitFunction,
													() => {
														Then(
															'it should execute a script executing "get delegate lightcurve" first in a separate child process',
															then.itShouldExecuteAScriptExecutingFirstInASeparateChildProcess,
														);
														Then(
															'it should execute a script executing "create account" second in a separate child process',
															then.itShouldExecuteAScriptExecutingSecondInASeparateChildProcess,
														);
														Then(
															'it should execute a script executing "list blocks 100 200" third in a separate child process',
															then.itShouldExecuteAScriptExecutingThirdInASeparateChildProcess,
														);
														Then(
															'the Lisk Commander instance should log the first child process output first',
															then.theLiskCommanderInstanceShouldLogTheFirstChildProcessOutputFirst,
														);
														Then(
															'the Lisk Commander instance should log the second child process output second',
															then.theLiskCommanderInstanceShouldLogTheSecondChildProcessOutputSecond,
														);
														Then(
															'the Lisk Commander instance should log the third child process output third',
															then.theLiskCommanderInstanceShouldLogTheThirdChildProcessOutputThird,
														);
														Then(
															'it should exit with code 0',
															then.itShouldExitWithCode,
														);
													},
												);
												Given(
													'an array of options, "--json" and "--testnet=false"',
													given.anArrayOfOptions,
													() => {
														When(
															'execFile is called with the Lisk Commander instance, the file path, the options and the exit function',
															when.execFileIsCalledWithTheLiskCommanderInstanceTheFilePathTheOptionsAndTheExitFunction,
															() => {
																Then(
																	'it should execute a script executing "get delegate lightcurve --json --testnet=false" first in a separate child process',
																	then.itShouldExecuteAScriptExecutingFirstInASeparateChildProcess,
																);
																Then(
																	'it should execute a script executing "create account --json --testnet=false" second in a separate child process',
																	then.itShouldExecuteAScriptExecutingSecondInASeparateChildProcess,
																);
																Then(
																	'it should execute a script executing "list blocks 100 200 --json --testnet=false" third in a separate child process',
																	then.itShouldExecuteAScriptExecutingThirdInASeparateChildProcess,
																);
																Then(
																	'the Lisk Commander instance should log the first child process output first',
																	then.theLiskCommanderInstanceShouldLogTheFirstChildProcessOutputFirst,
																);
																Then(
																	'the Lisk Commander instance should log the second child process output second',
																	then.theLiskCommanderInstanceShouldLogTheSecondChildProcessOutputSecond,
																);
																Then(
																	'the Lisk Commander instance should log the third child process output third',
																	then.theLiskCommanderInstanceShouldLogTheSecondChildProcessOutputSecond,
																);
																Then(
																	'it should exit with code 0',
																	then.itShouldExitWithCode,
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
	});
});
