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
import os from 'os';
import BaseCommand, { defaultConfigFolder } from '../src/base';
import * as config from '../src/utils/config';
import * as printUtil from '../src/utils/print';

describe('base command', () => {
	const defaultFlags = {
		some: 'flag',
	};

	const defaultConfig = {
		name: 'lisk-commander',
	};

	let command;
	let envConfigDir;
	let envConfigHome;
	before(() => {
		envConfigDir = process.env.LISK_COMMANDER_CONFIG_DIR;
		envConfigHome = process.env.XDG_CONFIG_HOME;
		return Promise.resolve();
	});

	after(() => {
		if (envConfigDir) {
			process.env.LISK_COMMANDER_CONFIG_DIR = envConfigDir;
		} else {
			delete process.env.LISK_COMMANDER_CONFIG_DIR;
		}
		if (envConfigHome) {
			process.env.XDG_CONFIG_HOME = envConfigHome;
		} else {
			delete process.env.XDG_CONFIG_HOME;
		}
		return Promise.resolve();
	});

	beforeEach(() => {
		command = new BaseCommand();
		sandbox.stub(command, 'parse').returns({ flags: defaultFlags });
		sandbox.stub(command, 'error');
		sandbox.stub(config, 'getConfig').returns(defaultConfig);
		return Promise.resolve();
	});

	describe('#init', () => {
		it('should set XDG_CONFIG_HOME to default value', async () => {
			delete process.env.LISK_COMMANDER_CONFIG_DIR;
			await command.init();
			return expect(process.env.XDG_CONFIG_HOME).to.equal(
				`${os.homedir()}/${defaultConfigFolder}`,
			);
		});

		it('should set XDG_CONFIG_HOME to LISK_COMMANDER_CONFIG_DIR', async () => {
			const configFolder = './some/folder';
			process.env.LISK_COMMANDER_CONFIG_DIR = configFolder;
			await command.init();
			return expect(process.env.XDG_CONFIG_HOME).to.equal(configFolder);
		});

		it('should call getConfig with the config folder set by the environment variable', async () => {
			const configFolder = './some/folder';
			process.env.LISK_COMMANDER_CONFIG_DIR = configFolder;
			await command.init();
			return expect(config.getConfig).to.be.calledWithExactly(configFolder);
		});

		it('should set the flags to the return value of the parse function', async () => {
			await command.init();
			return expect(command.flags).to.equal(defaultFlags);
		});

		it('should set the userConfig to the return value of the getConfig', async () => {
			await command.init();
			return expect(command.userConfig).to.equal(defaultConfig);
		});
	});

	describe('#finally', () => {
		it('should log error with the message', async () => {
			const errorMsg = 'some error';
			const error = new Error(errorMsg);
			await command.finally(error);
			return expect(command.error).to.be.calledWithExactly(errorMsg);
		});

		it('should log error with input', async () => {
			const errorMsg = 'some error';
			await command.finally(errorMsg);
			return expect(command.error).to.be.calledWithExactly(errorMsg);
		});

		it('should do nothing if no error is provided', async () => {
			await command.finally();
			return expect(command.error).not.to.be.called;
		});
	});

	describe('#print', () => {
		const result = {
			some: 'result',
		};
		let tempEnvConfigHome;
		let print;

		before(() => {
			tempEnvConfigHome = process.env.XDG_CONFIG_HOME;
			return Promise.resolve();
		});

		after(() => {
			if (tempEnvConfigHome) {
				process.env.XDG_CONFIG_HOME = tempEnvConfigHome;
			} else {
				delete process.env.XDG_CONFIG_HOME;
			}
			return Promise.resolve();
		});

		beforeEach(() => {
			print = sandbox.stub();
			return sandbox.stub(printUtil, 'default').returns(print);
		});

		it('should call getConfig with the process.env.XDG_CONFIG_HOME when readAgain is true', async () => {
			process.env.XDG_CONFIG_HOME = 'home';
			await command.print(result, true);
			return expect(config.getConfig).to.be.calledWithExactly(
				process.env.XDG_CONFIG_HOME,
			);
		});

		it('should not call getConfig when readAgain is falsy', async () => {
			command.userConfig = {};
			command.print(result);
			return expect(config.getConfig).not.to.be.called;
		});

		it('should call print with the result', async () => {
			command.userConfig = {};
			command.print(result);
			return expect(print).to.be.calledWithExactly(result);
		});

		it('should call printUtil with the userConfig', async () => {
			command.userConfig = {
				json: false,
			};
			command.print(result);
			return expect(printUtil.default).to.be.calledWithExactly({
				json: false,
				pretty: undefined,
			});
		});

		it('should call printUtil with flags overwriting the userConfig', async () => {
			command.userConfig = {
				json: false,
				pretty: true,
			};
			const overwritingFlags = {
				json: true,
				pretty: false,
			};
			command.flags = overwritingFlags;
			command.print(result);
			return expect(printUtil.default).to.be.calledWithExactly(
				overwritingFlags,
			);
		});
	});
});
