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
import fs from 'fs';
import os from 'os';
import lockfile from 'lockfile';
import { getConfig, setConfig } from '../../src/utils/config';
import * as fsUtils from '../../src/utils/fs';
import logger from '../../src/utils/logger';
import defaultConfig from '../../default_config.json';

describe('config utils', () => {
	const configDirName = '.lisk-commander';
	const configFileName = 'config.json';
	const lockfileName = 'config.lock';

	const defaultPath = `${os.homedir()}/${configDirName}`;

	let writeJSONStub;
	let warnStub;
	let errorStub;
	let processStub;

	beforeEach(() => {
		writeJSONStub = sandbox.stub(fsUtils, 'writeJSONSync');
		warnStub = sandbox.stub(logger, 'warn');
		errorStub = sandbox.stub(logger, 'error');
		processStub = sandbox.stub(process, 'exit');
		return Promise.resolve();
	});

	describe('#getConfig', () => {
		let existsSyncStub;
		let mkdirSyncStub;
		let readJSONStub;

		beforeEach(() => {
			existsSyncStub = sandbox.stub(fs, 'existsSync');
			mkdirSyncStub = sandbox.stub(fs, 'mkdirSync');
			readJSONStub = sandbox
				.stub(fsUtils, 'readJSONSync')
				.returns(defaultConfig);
			return Promise.resolve();
		});

		describe('when config folder does not exist', () => {
			beforeEach(() => {
				return existsSyncStub.returns(false);
			});

			it('should create config folder', () => {
				getConfig(defaultPath);
				return expect(mkdirSyncStub).to.be.calledWithExactly(defaultPath);
			});

			it('should log warn when it fails to write', () => {
				mkdirSyncStub.throws(new Error('failed to create folder'));
				getConfig(defaultPath);
				return expect(warnStub).to.be.calledWithExactly(
					`WARNING: Could not write to \`${defaultPath}\`. Your configuration will not be persisted.`,
				);
			});
		});

		describe('when config file does not exist', () => {
			beforeEach(() => {
				return existsSyncStub.withArgs(defaultPath).returns(true);
			});

			it('should create and return the default config', () => {
				const result = getConfig(defaultPath);
				expect(writeJSONStub).to.be.calledWithExactly(
					`${defaultPath}/${configFileName}`,
					defaultConfig,
				);
				return expect(result).to.be.equal(defaultConfig);
			});

			it('should log warn when it fails to write', () => {
				writeJSONStub.throws(new Error('failed to write to the file'));
				getConfig(defaultPath);
				return expect(warnStub).to.be.calledWithExactly(
					`WARNING: Could not write to \`${defaultPath}/${configFileName}\`. Your configuration will not be persisted.`,
				);
			});
		});

		describe('when config file exists', () => {
			beforeEach(() => {
				return existsSyncStub.returns(true);
			});

			it('should create and return the default config', () => {
				const result = getConfig(defaultPath);
				expect(readJSONStub).to.be.calledWithExactly(
					`${defaultPath}/${configFileName}`,
				);
				return expect(result).to.be.equal(defaultConfig);
			});

			it('should log error when it fails to read and exit', () => {
				readJSONStub.throws(new Error('failed to read to the file'));
				getConfig(defaultPath);
				expect(processStub).to.be.calledWithExactly(1);
				return expect(errorStub).to.be.calledWithExactly(
					`Config file cannot be read or is not valid JSON. Please check ${defaultPath}/${configFileName} or delete the file so we can create a new one from defaults.`,
				);
			});

			it('should log error when it has invalid keys and exit', () => {
				readJSONStub.returns({ random: 'values' });
				getConfig(defaultPath);
				expect(processStub).to.be.calledWithExactly(1);
				return expect(errorStub).to.be.calledWithExactly(
					`Config file seems to be corrupted: missing required keys. Please check ${defaultPath}/${configFileName} or delete the file so we can create a new one from defaults.`,
				);
			});
		});
	});

	describe('#setConfig', () => {
		const newConfigValue = {
			add: 'value',
			some: 'value',
		};

		let checkSyncStub;
		let lockSyncStub;
		let unlockSyncStub;

		beforeEach(() => {
			checkSyncStub = sandbox.stub(lockfile, 'checkSync');
			lockSyncStub = sandbox.stub(lockfile, 'lockSync');
			unlockSyncStub = sandbox.stub(lockfile, 'unlockSync');
			return Promise.resolve();
		});

		describe('when lockfile exists', () => {
			it('should log error and exit', () => {
				checkSyncStub.returns(true);
				setConfig(defaultPath, newConfigValue);
				expect(processStub).to.be.calledWithExactly(1);
				return expect(errorStub).to.be.calledWithExactly(
					`Config lockfile at ${defaultPath}/${lockfileName} found. Are you running Lisk Commander in another process?`,
				);
			});
		});

		describe('when lockfile does not exist', () => {
			beforeEach(() => {
				return checkSyncStub.returns(false);
			});

			it('should write new config to defined file', () => {
				const result = setConfig(defaultPath, newConfigValue);
				expect(writeJSONStub).to.be.calledWithExactly(
					`${defaultPath}/${configFileName}`,
					newConfigValue,
				);
				return expect(result).to.be.true;
			});

			it('should create lock file once', () => {
				setConfig(defaultPath, newConfigValue);
				return expect(lockSyncStub).to.be.calledWithExactly(
					`${defaultPath}/${lockfileName}`,
				);
			});

			it('should unlock file once', () => {
				setConfig(defaultPath, newConfigValue);
				return expect(unlockSyncStub).to.be.calledWithExactly(
					`${defaultPath}/${lockfileName}`,
				);
			});

			it('should log warn if fail to write', () => {
				writeJSONStub.throws(new Error('failed to write to the file'));
				const result = setConfig(defaultPath, newConfigValue);
				return expect(result).to.be.false;
			});
		});
	});
});
