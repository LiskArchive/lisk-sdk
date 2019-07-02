import os from 'os';
import path from 'path';
import { expect } from 'chai';
import fsExtra from 'fs-extra';
import {
	defaultBackupPath,
	defaultLiskInstancePath,
	defaultLiskPath,
	defaultLiskPm2Path,
	getLiskConfig,
} from '../../../src/utils/core/config';
import * as workerProcess from '../../../src/utils/worker-process';
import { NETWORK } from '../../../src/utils/constants';
import * as liskConfig from './fixtures';
import { SinonStub } from 'sinon';

describe('config core utils', () => {
	it('should return defaultLiskPath constant', () => {
		return expect(defaultLiskPath).to.equal(path.join(os.homedir(), '.lisk'));
	});

	it('should return defaultLiskPm2Path constant', () => {
		return expect(defaultLiskPm2Path).to.equal(
			path.join(`${defaultLiskPath}/pm2`),
		);
	});

	it('should return defaultLiskInstancePath constant', () => {
		return expect(defaultLiskInstancePath).to.equal(
			path.join(`${defaultLiskPath}/instances`),
		);
	});

	it('should return defaultBackupPath constant', () => {
		return expect(defaultBackupPath).to.equal(
			path.join(`${defaultLiskPath}/backup`),
		);
	});

	describe('#getLiskConfig', () => {
		let workerProcessStub: SinonStub;
		beforeEach(() => {
			sandbox.stub(fsExtra, 'writeJSONSync').returns();
			workerProcessStub = sandbox.stub(workerProcess, 'exec');
		});

		it('should return lisk config', async () => {
			workerProcessStub.resolves({
				stdout: JSON.stringify(liskConfig.config),
			});

			const config = await getLiskConfig(
				defaultLiskInstancePath,
				NETWORK.DEVNET,
			);
			return expect(config).to.deep.equal(liskConfig.config);
		});

		it('should throw error if failed to generate config', () => {
			workerProcessStub.resolves({
				stderr: 'Invalid config schema',
			});

			return expect(
				getLiskConfig(defaultLiskInstancePath, NETWORK.DEVNET),
			).to.be.rejectedWith('Invalid config schema');
		});
	});
});
