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
import os from 'os';
import set from '../../src/commands/set';
import env from '../../src/commands/env';
import configObj from '../../src/utils/env';
import {
	readJsonSync,
	writeJsonSync,
} from '../../src/utils/fs';
import {
	getCommands,
	getRequiredArgs,
	setUpVorpalWithCommand,
} from './utils';

const configFilePath = `${os.homedir()}/.lisky/config.json`;
const stringifyConfig = config => JSON.stringify(config, null, '\t');
const writeConfig = config => writeJsonSync(configFilePath, config);

const initialConfig = readJsonSync(configFilePath);

const defaultConfig = {
	name: 'lisky',
	json: false,
	liskJS: {
		testnet: false,
		node: '',
		port: '',
		ssl: false,
	},
};
const defaultConfigString = JSON.stringify(defaultConfig);

describe('env command', () => {
	const commandName = 'env';
	let capturedOutput = [];
	let vorpal;

	beforeEach(() => {
		vorpal = setUpVorpalWithCommand(env, capturedOutput);
	});

	afterEach(() => {
		// See https://github.com/dthree/vorpal/issues/230
		vorpal.ui.removeAllListeners();
		capturedOutput = [];
	});

	after(() => {
		writeConfig(initialConfig);
	});

	it('should be available', () => {
		const envCommands = getCommands(vorpal, commandName);
		(envCommands).should.have.length(1);
	});

	it('should require 0 inputs', () => {
		const requiredArgs = getRequiredArgs(vorpal, commandName);
		(requiredArgs).should.have.length(0);
	});

	describe('output env', () => {
		const setJsonTrueCommand = 'set json true';
		const envCommandString = 'env';

		beforeEach(() => {
			const defaultConfigClone = JSON.parse(defaultConfigString);
			Object.assign(configObj, defaultConfigClone);
			writeConfig(defaultConfig);
		});

		it('should print config file', () => {
			return vorpal.exec(envCommandString).then(() => {
				(capturedOutput).should.be.eql([stringifyConfig(defaultConfig)]);
			});
		});

		it('should print updated config file after change', () => {
			vorpal.use(set);

			const expectedUpdatedConfig = Object.assign({}, JSON.parse(defaultConfigString), {
				json: true,
			});

			return vorpal.exec(setJsonTrueCommand).then(() => {
				return vorpal.exec(envCommandString).then(() => {
					(capturedOutput[1]).should.be.eql(stringifyConfig(expectedUpdatedConfig));
				});
			});
		});
	});
});
