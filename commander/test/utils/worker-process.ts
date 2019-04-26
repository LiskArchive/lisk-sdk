import { expect } from 'chai';
import * as childProcess from 'child_process';
import { exec } from '../../src/utils/worker-process';

describe('worker process', () => {
	let childProcessStub: any = null;
	beforeEach(() => {
		childProcessStub = sandbox.stub(childProcess, 'exec');
	});

	describe('#exec', () => {
		it('should change directory and execute command', async () => {
			childProcessStub.returns(null, 'manu', null);
			const result = await exec('whoami');

			return expect(result).to.deep.equal({ stdout: 'manu\n', stderr: null });
		});
	});
});
