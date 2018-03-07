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
import childProcess from 'child_process';
import { getFirstQuotedString } from '../utils';

export function itShouldExecuteAScriptExecutingFirstInASeparateChildProcess() {
	const command = getFirstQuotedString(this.test.title);
	return expect(childProcess.exec.firstCall).to.be.calledWithMatch(command);
}

export function itShouldExecuteAScriptExecutingSecondInASeparateChildProcess() {
	const command = getFirstQuotedString(this.test.title);
	return expect(childProcess.exec.secondCall).to.be.calledWithMatch(command);
}

export function itShouldExecuteAScriptExecutingThirdInASeparateChildProcess() {
	const command = getFirstQuotedString(this.test.title);
	return expect(childProcess.exec.thirdCall).to.be.calledWithMatch(command);
}

export function itShouldNotExecuteAThirdScriptInASeparateChildProcess() {
	return expect(childProcess.exec).not.to.be.calledThrice;
}

export function theLiskyInstanceShouldLogTheFirstChildProcessOutputFirst() {
	const { lisky, firstChildOutput } = this.test.ctx;
	return expect(lisky.log.firstCall).to.be.calledWithExactly(firstChildOutput);
}

export function theLiskyInstanceShouldLogTheSecondChildProcessOutputSecond() {
	const { lisky, secondChildOutput } = this.test.ctx;
	return expect(lisky.log.secondCall).to.be.calledWithExactly(
		secondChildOutput,
	);
}

export function theLiskyInstanceShouldLogTheThirdChildProcessOutputThird() {
	const { lisky, thirdChildOutput } = this.test.ctx;
	return expect(lisky.log.thirdCall).to.be.calledWithExactly(thirdChildOutput);
}

export function theLiskyInstanceShouldLogTheSecondChildProcessErrorSecond() {
	const { lisky, secondChildError } = this.test.ctx;
	return expect(lisky.log.secondCall).to.be.calledWithExactly(secondChildError);
}
