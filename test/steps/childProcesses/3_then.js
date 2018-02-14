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
import childProcess from 'child_process';
import { getFirstQuotedString } from '../utils';

export function itShouldExecuteAScriptExecutingFirstInASeparateChildProcess() {
	const command = getFirstQuotedString(this.test.title);
	return childProcess.exec.firstCall.should.be.calledWithMatch(command);
}

export function itShouldExecuteAScriptExecutingSecondInASeparateChildProcess() {
	const command = getFirstQuotedString(this.test.title);
	return childProcess.exec.secondCall.should.be.calledWithMatch(command);
}

export function itShouldExecuteAScriptExecutingThirdInASeparateChildProcess() {
	const command = getFirstQuotedString(this.test.title);
	return childProcess.exec.thirdCall.should.be.calledWithMatch(command);
}

export function itShouldNotExecuteAThirdScriptInASeparateChildProcess() {
	return childProcess.exec.should.not.be.calledThrice;
}

export function theLiskyInstanceShouldLogTheFirstChildProcessOutputFirst() {
	const { lisky, firstChildOutput } = this.test.ctx;
	return lisky.log.firstCall.should.be.calledWithExactly(firstChildOutput);
}

export function theLiskyInstanceShouldLogTheSecondChildProcessOutputSecond() {
	const { lisky, secondChildOutput } = this.test.ctx;
	return lisky.log.secondCall.should.be.calledWithExactly(secondChildOutput);
}

export function theLiskyInstanceShouldLogTheThirdChildProcessOutputThird() {
	const { lisky, thirdChildOutput } = this.test.ctx;
	return lisky.log.thirdCall.should.be.calledWithExactly(thirdChildOutput);
}

export function theLiskyInstanceShouldLogTheSecondChildProcessErrorSecond() {
	const { lisky, secondChildError } = this.test.ctx;
	return lisky.log.secondCall.should.be.calledWithExactly(secondChildError);
}
