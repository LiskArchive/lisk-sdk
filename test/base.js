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

describe('base command', () => {
	let command;
	let errorStub;
	beforeEach(() => {
		command = new BaseCommand();
		sandbox.stub(command, 'parse').returns({});
		errorStub = sandbox.stub(command, 'error');
		sandbox.stub(config, 'getConfig').returns({});
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
	});

	describe('#finally', () => {
		it('should log error with the message', async () => {
			const errorMsg = 'some error';
			const error = new Error(errorMsg);
			await command.finally(error);
			return expect(errorStub).to.be.calledWithExactly(errorMsg);
		});

		it('should log error with input', async () => {
			const errorMsg = 'some error';
			await command.finally(errorMsg);
			return expect(errorStub).to.be.calledWithExactly(errorMsg);
		});

		it('should not log error', async () => {
			await command.finally();
			return expect(errorStub).not.to.be.called;
		});
	});
});
