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
import childProcess from 'child_process';
import { getFirstQuotedString } from '../utils';

export function theSecondChildProcessExitsWithAnErrorThatCannotBeTrimmed() {
	const error = new Error('myError');
	this.test.ctx.secondChildError = error;
	childProcess.exec.onSecondCall().callsArgWith(1, error, null, null);
}

export function theSecondChildProcessExitsWithError() {
	const error = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.secondChildError = error;
	childProcess.exec.onSecondCall().callsArgWith(1, error, null, null);
}

export function theSecondChildProcessOutputsToStdErr() {
	const error = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.secondChildError = error;
	childProcess.exec.onSecondCall().callsArgWith(1, null, null, error);
}

export function theFirstChildProcessOutputs() {
	const output = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.firstChildOutput = output;
	childProcess.exec.onFirstCall().callsArgWith(1, null, output, null);
}

export function theSecondChildProcessOutputs() {
	const output = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.secondChildOutput = output;
	childProcess.exec.onSecondCall().callsArgWith(1, null, output, null);
}

export function theThirdChildProcessOutputs() {
	const output = getFirstQuotedString(this.test.parent.title);
	this.test.ctx.thirdChildOutput = output;
	childProcess.exec.onThirdCall().callsArgWith(1, null, output, null);
}
