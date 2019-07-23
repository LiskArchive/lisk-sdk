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
import { expect } from 'chai';
import fs from 'fs';
import os from 'os';
import lockfile from 'lockfile';
import { getConfig, setConfig } from '../../src/utils/config';
import * as fsUtils from '../../src/utils/fs';
import * as defaultConfig from '../../src/default_config.json';
import { SinonStub } from 'sinon';

describe('config utils', () => {
	const configDirName = '.lisk';
	const configFileName = 'config.json';
	const lockfileName = 'config.lock';

	const defaultPath = `${os.homedir()}/${configDirName}`;

	let existsSyncStub: SinonStub;
	let mkdirSyncStub: SinonStub;
	let readJSONSyncStub: SinonStub;
	let writeJSONSyncStub: SinonStub;

	beforeEach(() => {
		writeJSONSyncStub = sandbox.stub(fsUtils, 'writeJSONSync');
		return Promise.resolve();
	});

	describe('#getConfig', () => {
		beforeEach(() => {
			existsSyncStub = sandbox.stub(fs, 'existsSync');
			mkdirSyncStub = sandbox.stub(fs, 'mkdirSync');
			readJSONSyncStub = sandbox
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
				return expect(fs.mkdirSync).to.be.calledWithExactly(defaultPath);
			});

			it('should log error when it fails to write', () => {
				mkdirSyncStub.throws(new Error('failed to create folder'));
				return expect(getConfig.bind(null, defaultPath)).to.throw(
					`Could not write to \`${defaultPath}\`. Your configuration will not be persisted.`,
				);
			});
		});

		describe('when only the config directory exists', () => {
			beforeEach(() => {
				return existsSyncStub.withArgs(defaultPath).returns(true);
			});

			it('should create and return the default config', () => {
				const result = getConfig(defaultPath);
				expect(fsUtils.writeJSONSync).to.be.calledWithExactly(
					`${defaultPath}/${configFileName}`,
					defaultConfig,
				);
				return expect(result).to.be.eql(defaultConfig);
			});

			it('should log error when it fails to write', () => {
				writeJSONSyncStub.throws(new Error('failed to write to the file'));
				return expect(getConfig.bind(null, defaultPath)).to.throw(
					`Could not write to \`${defaultPath}/${configFileName}\`. Your configuration will not be persisted.`,
				);
			});
		});

		describe('when config file exists', () => {
			beforeEach(() => {
				return existsSyncStub.returns(true);
			});

			it('should return the custom config when it is valid', () => {
				const customConfig = Object.assign({}, defaultConfig, {
					name: 'custom config',
				});
				readJSONSyncStub.returns(customConfig);
				const result = getConfig(defaultPath);
				expect(fsUtils.readJSONSync).to.be.calledWithExactly(
					`${defaultPath}/${configFileName}`,
				);
				return expect(result).to.be.equal(customConfig);
			});

			it('should log error and exit when it fails to read', () => {
				readJSONSyncStub.throws(new Error('failed to read to the file'));
				return expect(getConfig.bind(null, defaultPath)).to.throw(
					`Config file cannot be read or is not valid JSON. Please check ${defaultPath}/${configFileName} or delete the file so we can create a new one from defaults.`,
				);
			});

			it('should log error and exit when it has invalid keys', () => {
				readJSONSyncStub.returns({ random: 'values' });
				return expect(getConfig.bind(null, defaultPath)).to.throw(
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

		let checkSyncStub: SinonStub;

		beforeEach(() => {
			checkSyncStub = sandbox.stub(lockfile, 'checkSync');
			sandbox.stub(lockfile, 'lockSync');
			sandbox.stub(lockfile, 'unlockSync');
			return Promise.resolve();
		});

		describe('when lockfile exists', () => {
			it('should log error and exit', () => {
				checkSyncStub.returns(true);
				return expect(
					setConfig.bind(null, defaultPath, newConfigValue),
				).to.throw(
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
				expect(fsUtils.writeJSONSync).to.be.calledWithExactly(
					`${defaultPath}/${configFileName}`,
					newConfigValue,
				);
				return expect(result).to.be.true;
			});

			it('should create lock file', () => {
				setConfig(defaultPath, newConfigValue);
				return expect(lockfile.lockSync).to.be.calledWithExactly(
					`${defaultPath}/${lockfileName}`,
				);
			});

			it('should unlock file', () => {
				setConfig(defaultPath, newConfigValue);
				return expect(lockfile.unlockSync).to.be.calledWithExactly(
					`${defaultPath}/${lockfileName}`,
				);
			});

			it('should log error if fail to write', () => {
				writeJSONSyncStub.throws(new Error('failed to write to the file'));
				const result = setConfig(defaultPath, newConfigValue);
				return expect(result).to.be.false;
			});
		});
	});
});
