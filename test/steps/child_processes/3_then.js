/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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

export function theLiskCommanderInstanceShouldLogTheFirstChildProcessOutputFirst() {
	const { liskCommander, firstChildOutput } = this.test.ctx;
	return expect(liskCommander.log.firstCall).to.be.calledWithExactly(
		firstChildOutput,
	);
}

export function theLiskCommanderInstanceShouldLogTheSecondChildProcessOutputSecond() {
	const { liskCommander, secondChildOutput } = this.test.ctx;
	return expect(liskCommander.log.secondCall).to.be.calledWithExactly(
		secondChildOutput,
	);
}

export function theLiskCommanderInstanceShouldLogTheThirdChildProcessOutputThird() {
	const { liskCommander, thirdChildOutput } = this.test.ctx;
	return expect(liskCommander.log.thirdCall).to.be.calledWithExactly(
		thirdChildOutput,
	);
}

export function theLiskCommanderInstanceShouldLogTheSecondChildProcessErrorSecond() {
	const { liskCommander, secondChildError } = this.test.ctx;
	return expect(liskCommander.log.secondCall).to.be.calledWithExactly(
		secondChildError,
	);
}
