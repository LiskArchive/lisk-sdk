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
import { setUpExecFile } from '../steps/setup';
import * as given from '../steps/1_given';
import * as when from '../steps/2_when';
import * as then from '../steps/3_then';

const validFileContents = `#!/usr/bin/env lisky

# some comment
get delegate lightcurve

# list accounts 123L 456L

create account
list blocks 100 200

`;

describe('execFile', () => {
	beforeEach(setUpExecFile);
	describe('Given a Lisky instance', () => {
		beforeEach(given.aLiskyInstance);
		describe('Given a file path "/path/to/script.lisky"', () => {
			beforeEach(given.aFilePath);
			describe('Given an exit function', () => {
				beforeEach(given.anExitFunction);
				describe('Given the file cannot be read', () => {
					beforeEach(given.theFileCannotBeRead);
					describe('When execFile is called with the Lisky instance, the file path and the exit function', () => {
						beforeEach(when.execFileIsCalledWithTheLiskyInstanceTheFilePathAndTheExitFunction);
						it('Then it should throw error "EACCES: permission denied"', then.itShouldThrowError);
					});
				});
				describe(`Given the file at the file path has contents "${validFileContents}"`, () => {
					beforeEach(given.theFileAtTheFilePathHasContents);
					describe('Given the first child process outputs "{ \'key\': 1 }"', () => {
						beforeEach(given.theFirstChildProcessOutputs);
						describe('Given the second child process exits with error "Something went wrong"', () => {
							beforeEach(given.theSecondChildProcessExitsWithError);
							describe('When execFile is called with the Lisky instance, the file path and the exit function', () => {
								beforeEach(when.execFileIsCalledWithTheLiskyInstanceTheFilePathAndTheExitFunction);
								it('Then it should execute a script executing "get delegate lightcurve" first in a separate child process', then.itShouldExecuteAScriptExecutingFirstInASeparateChildProcess);
								it('Then it should execute a script executing "create account" second in a separate child process', then.itShouldExecuteAScriptExecutingSecondInASeparateChildProcess);
								it('Then it should not execute a third script in a separate child process', then.itShouldNotExecuteAThirdScriptInASeparateChildProcess);
								it('Then the Lisky instance should log the first child process output first', then.theLiskyInstanceShouldLogTheFirstChildProcessOutputFirst);
								it('Then the Lisky instance should log the second child process error second', then.theLiskyInstanceShouldLogTheSecondChildProcessErrorSecond);
								it('Then it should exit with code 1', then.itShouldExitWithCode);
							});
						});
						describe('Given the second child process exits with an error that cannot be trimmed', () => {
							beforeEach(given.theSecondChildProcessExitsWithAnErrorThatCannotBeTrimmed);
							describe('When execFile is called with the Lisky instance, the file path and the exit function', () => {
								beforeEach(when.execFileIsCalledWithTheLiskyInstanceTheFilePathAndTheExitFunction);
								it('Then it should execute a script executing "get delegate lightcurve" first in a separate child process', then.itShouldExecuteAScriptExecutingFirstInASeparateChildProcess);
								it('Then it should execute a script executing "create account" second in a separate child process', then.itShouldExecuteAScriptExecutingSecondInASeparateChildProcess);
								it('Then it should not execute a third script in a separate child process', then.itShouldNotExecuteAThirdScriptInASeparateChildProcess);
								it('Then the Lisky instance should log the first child process output first', then.theLiskyInstanceShouldLogTheFirstChildProcessOutputFirst);
								it('Then the Lisky instance should log the second child process error second', then.theLiskyInstanceShouldLogTheSecondChildProcessErrorSecond);
								it('Then it should exit with code 1', then.itShouldExitWithCode);
							});
						});
						describe('Given the second child process outputs "Something went wrong" to stderr', () => {
							beforeEach(given.theSecondChildProcessOutputsToStdErr);
							describe('When execFile is called with the Lisky instance, the file path and the exit function', () => {
								beforeEach(when.execFileIsCalledWithTheLiskyInstanceTheFilePathAndTheExitFunction);
								it('Then it should execute a script executing "get delegate lightcurve" first in a separate child process', then.itShouldExecuteAScriptExecutingFirstInASeparateChildProcess);
								it('Then it should execute a script executing "create account" second in a separate child process', then.itShouldExecuteAScriptExecutingSecondInASeparateChildProcess);
								it('Then it should not execute a third script in a separate child process', then.itShouldNotExecuteAThirdScriptInASeparateChildProcess);
								it('Then the Lisky instance should log the first child process output first', then.theLiskyInstanceShouldLogTheFirstChildProcessOutputFirst);
								it('Then the Lisky instance should log the second child process error second', then.theLiskyInstanceShouldLogTheSecondChildProcessErrorSecond);
								it('Then it should exit with code 1', then.itShouldExitWithCode);
							});
						});
						describe('Given the second child process outputs "{ \'key\': 2 }"', () => {
							beforeEach(given.theSecondChildProcessOutputs);
							describe('Given the third child process outputs "{ \'key\': 3 }"', () => {
								beforeEach(given.theThirdChildProcessOutputs);
								describe('When execFile is called with the Lisky instance, the file path and the exit function', () => {
									beforeEach(when.execFileIsCalledWithTheLiskyInstanceTheFilePathAndTheExitFunction);
									it('Then it should execute a script executing "get delegate lightcurve" first in a separate child process', then.itShouldExecuteAScriptExecutingFirstInASeparateChildProcess);
									it('Then it should execute a script executing "create account" second in a separate child process', then.itShouldExecuteAScriptExecutingSecondInASeparateChildProcess);
									it('Then it should execute a script executing "list blocks 100 200" third in a separate child process', then.itShouldExecuteAScriptExecutingThirdInASeparateChildProcess);
									it('Then the Lisky instance should log the first child process output first', then.theLiskyInstanceShouldLogTheFirstChildProcessOutputFirst);
									it('Then the Lisky instance should log the second child process output second', then.theLiskyInstanceShouldLogTheSecondChildProcessOutputSecond);
									it('Then the Lisky instance should log the third child process output third', then.theLiskyInstanceShouldLogTheThirdChildProcessOutputThird);
									it('Then it should exit with code 0', then.itShouldExitWithCode);
								});
								describe('Given an array of options, "--json" and "--testnet=false"', () => {
									beforeEach(given.anArrayOfOptions);
									describe('When execFile is called with the Lisky instance, the file path, the options and the exit function', () => {
										beforeEach(when.execFileIsCalledWithTheLiskyInstanceTheFilePathTheOptionsAndTheExitFunction);
										it('Then it should execute a script executing "get delegate lightcurve --json --testnet=false" first in a separate child process', then.itShouldExecuteAScriptExecutingFirstInASeparateChildProcess);
										it('Then it should execute a script executing "create account --json --testnet=false" second in a separate child process', then.itShouldExecuteAScriptExecutingSecondInASeparateChildProcess);
										it('Then it should execute a script executing "list blocks 100 200 --json --testnet=false" third in a separate child process', then.itShouldExecuteAScriptExecutingThirdInASeparateChildProcess);
										it('Then the Lisky instance should log the first child process output first', then.theLiskyInstanceShouldLogTheFirstChildProcessOutputFirst);
										it('Then the Lisky instance should log the second child process output second', then.theLiskyInstanceShouldLogTheSecondChildProcessOutputSecond);
										it('Then the Lisky instance should log the third child process output third', then.theLiskyInstanceShouldLogTheSecondChildProcessOutputSecond);
										it('Then it should exit with code 0', then.itShouldExitWithCode);
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
