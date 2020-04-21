/*
 * LiskHQ/lisk-commander
 * Copyright © 2019 Lisk Foundation
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
import * as sandbox from 'sinon';
import { expect } from 'chai';
import fsExtra from 'fs-extra';
import childProcess from 'child_process';
import { SinonStub } from 'sinon';
import { exec } from '../../src/utils/worker-process';
import { liskInstall } from '../../src/utils/core/commons';

describe('worker process', () => {
	let childProcessStub: SinonStub;
	let fsExtraStub: SinonStub;

	beforeEach(() => {
		childProcessStub = sandbox.stub(childProcess, 'exec');
		fsExtraStub = sandbox.stub(fsExtra, 'writeJSONSync');
	});

	describe('#exec', () => {
		it('should execute command and return stdout and stderr', async () => {
			childProcessStub.yields(null, 'testuser');
			const result = await exec('whoami');

			return expect(result).to.deep.equal({ stdout: 'testuser', stderr: null });
		});

		it('should write error to log file when failed to exec command', async () => {
			childProcessStub.yields('command not found: testcommand', null);
			await exec('testcommand');

			expect(fsExtraStub).to.be.calledOnce;
			return expect(fsExtraStub).to.be.calledWithExactly(
				liskInstall('~/.lisk/instances/error.log'),
				{ error: 'command not found: testcommand', stderr: undefined },
			);
		});
	});
});
