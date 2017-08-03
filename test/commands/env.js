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
import fse from 'fs-extra';
import set from '../../src/commands/set';
import env from '../../src/commands/env';
import { setUpVorpalWithCommand } from './utils';

const stringifyConfig = config => JSON.stringify(config, null, '\t');
const writeConfig = (config) => {
	const configString = typeof config === 'string'
		? config
		: stringifyConfig(config);
	fse.writeFileSync('config.json', `${configString}\n`, 'utf8');
};

const initialConfig = stringifyConfig(require('../../config.json'));

const defaultConfig = {
	name: 'lisky',
	json: false,
	liskJS: {
		testnet: false,
	},
};

describe('env command', () => {
	/* eslint-disable no-underscore-dangle */
	let envCommand;
	let capturedOutput = [];
	let vorpal;
	const filterCommand = vorpalCommand => vorpalCommand._name === 'env';

	beforeEach(() => {
		vorpal = setUpVorpalWithCommand(env, capturedOutput);
		envCommand = vorpal.commands.filter(filterCommand)[0];
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
		(envCommand._args).should.be.length(0);
		(envCommand._name).should.be.equal('env');
	});
	/* eslint-enable */

	describe('output env', () => {
		const setJsonTrueCommand = 'set json true';
		const envCommandString = 'env';

		beforeEach(() => {
			writeConfig(defaultConfig);
		});

		it('should print config file', () => {
			return vorpal.exec(envCommandString).then(() => {
				(capturedOutput).should.be.eql([stringifyConfig(defaultConfig)]);
			});
		});

		it('should print updated config file after change', () => {
			vorpal.use(set);

			const expectedUpdatedConfig = {
				name: 'lisky',
				json: true,
				liskJS: {
					testnet: false,
				},
			};

			return vorpal.exec(setJsonTrueCommand).then(() => {
				return vorpal.exec(envCommandString).then(() => {
					(capturedOutput[1]).should.be.eql(stringifyConfig(expectedUpdatedConfig));
				});
			});
		});
	});
});
