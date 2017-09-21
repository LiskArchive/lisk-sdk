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
/* eslint-disable global-require, import/no-dynamic-require */
import os from 'os';
import fse from 'fs-extra';
import set from '../../src/commands/set';
import env from '../../src/utils/env';
import liskInstance from '../../src/utils/liskInstance';
import {
	getCommands,
	getRequiredArgs,
	setUpVorpalWithCommand,
} from './utils';

const configFilePath = `${os.homedir()}/.lisky/config.json`;
const writeConfig = config => fse.writeJsonSync(configFilePath, config, { spaces: '\t' });

const initialConfig = fse.readJsonSync(configFilePath);

const defaultConfig = {
	name: 'lisky',
	json: false,
	liskJS: {
		testnet: false,
	},
};

describe('lisky set command palette', () => {
	let vorpal;
	let capturedOutput = [];

	beforeEach(() => {
		writeConfig(defaultConfig);
		vorpal = setUpVorpalWithCommand(set, capturedOutput);
	});

	afterEach(() => {
		vorpal.ui.removeAllListeners();
		capturedOutput = [];
	});

	after(() => {
		writeConfig(initialConfig);
	});

	describe('setup', () => {
		const commandName = 'set';

		it('should be available', () => {
			const setCommands = getCommands(vorpal, commandName);
			(setCommands).should.have.length(1);
		});

		it('should have 2 required inputs', () => {
			const requiredArgs = getRequiredArgs(vorpal, commandName);
			(requiredArgs).should.have.length(2);
		});
	});

	describe('problems', () => {
		it('should handle unknown config variables', () => {
			const invalidVariableCommand = 'set xxx true';
			return vorpal.exec(invalidVariableCommand, () => {
				(capturedOutput[0]).should.be.equal('Unsupported variable name.');
			});
		});

		describe('without write file permissions', () => {
			const command = 'set json true';
			let writeJsonSyncStub;

			beforeEach(() => {
				writeJsonSyncStub = sinon.stub(fse, 'writeJsonSync').throws('EACCES: permission denied, open \'~/.lisky/config.json\'');
			});

			afterEach(() => {
				writeJsonSyncStub.restore();
			});

			it('should show a warning if the config file is not writable', () => {
				return vorpal.exec(command)
					.then(() => {
						(capturedOutput[0]).should.be.equal(`WARNING: Could not write to \`${configFilePath}\`. Your configuration will not be persisted.`);
					});
			});

			describe('in interactive mode', () => {
				before(() => {
					process.env.NON_INTERACTIVE_MODE = false;
				});

				after(() => {
					delete process.env.NON_INTERACTIVE_MODE;
				});

				it('should inform the user that the option was successfully updated.', () => {
					return vorpal.exec(command)
						.then(() => {
							(capturedOutput[1]).should.be.equal('Successfully set json output to true.');
						});
				});
			});

			describe('in non-interactive mode', () => {
				before(() => {
					process.env.NON_INTERACTIVE_MODE = true;
				});

				after(() => {
					delete process.env.NON_INTERACTIVE_MODE;
				});

				it('should inform the user that the option was not successfully updated.', () => {
					return vorpal.exec(command)
						.then(() => {
							(capturedOutput[1]).should.be.equal('Could not set json output to true.');
						});
				});
			});
		});
	});

	describe('options', () => {
		describe('json option', () => {
			const setJsonTrueCommand = 'set json true';
			const setJsonFalseCommand = 'set json false';
			const invalidValueCommand = 'set json tru';
			const setJsonTrueResult = 'Successfully set json output to true.';
			const setJsonFalseResult = 'Successfully set json output to false.';
			const invalidValueResult = 'Cannot set json output to tru.';
			const jsonProperty = 'json';

			describe('to a non-boolean value', () => {
				beforeEach(() => {
					return vorpal.exec(setJsonTrueCommand)
						.then(vorpal.exec.bind(vorpal, invalidValueCommand));
				});

				it('should not change the value of json in the in-memory config', () => {
					(env)
						.should.have.property(jsonProperty)
						.be.true();
				});

				it('should not change the value of json in the config file', () => {
					const config = fse.readJsonSync(configFilePath);

					(config)
						.should.have.property(jsonProperty)
						.be.true();
				});

				it('should inform the user that the config has not been updated', () => {
					(capturedOutput[1]).should.be.equal(invalidValueResult);
				});
			});

			describe('to true', () => {
				beforeEach(() => {
					return vorpal.exec(setJsonTrueCommand);
				});

				it('should set json to true in the in-memory config', () => {
					(env)
						.should.have.property(jsonProperty)
						.be.true();
				});

				it('should set json to true in the config file', () => {
					const config = fse.readJsonSync(configFilePath);

					(config)
						.should.have.property(jsonProperty)
						.be.true();
				});

				it('should inform the user that the config has been updated to true', () => {
					(capturedOutput[0]).should.be.equal(setJsonTrueResult);
				});
			});

			describe('to false', () => {
				beforeEach(() => {
					return vorpal.exec(setJsonFalseCommand);
				});

				it('should set json to false in the in-memory config', () => {
					(env)
						.should.have.property(jsonProperty)
						.be.false();
				});

				it('should set json to false in the config file', () => {
					const config = fse.readJsonSync(configFilePath);

					(config)
						.should.have.property(jsonProperty)
						.be.false();
				});

				it('should inform the user that the config has been updated to false', () => {
					(capturedOutput[0]).should.be.equal(setJsonFalseResult);
				});
			});
		});

		describe('testnet option', () => {
			const setTestnetTrueCommand = 'set testnet true';
			const setTestnetFalseCommand = 'set testnet false';
			const invalidValueCommand = 'set testnet tru';
			const setTestnetTrueResult = 'Successfully set testnet to true.';
			const setTestnetFalseResult = 'Successfully set testnet to false.';
			const invalidValueResult = 'Cannot set testnet to tru.';
			const testnetProperties = ['liskJS', 'testnet'];

			let setTestnetStub;

			beforeEach(() => {
				setTestnetStub = sinon.stub(liskInstance, 'setTestnet');
			});

			afterEach(() => {
				setTestnetStub.restore();
			});

			describe('to a non-boolean value', () => {
				beforeEach(() => {
					return vorpal.exec(setTestnetTrueCommand)
						.then(vorpal.exec.bind(vorpal, invalidValueCommand));
				});

				it('should not change the value of testnet on the lisk instance', () => {
					(setTestnetStub.calledTwice).should.be.false();
				});

				it('should not change the value of testnet in the config file', () => {
					const config = fse.readJsonSync(configFilePath);

					(config)
						.should.have.property(testnetProperties[0])
						.have.property(testnetProperties[1])
						.be.true();
				});

				it('should not change the value of testnet in the in-memory config', () => {
					(env)
						.should.have.property(testnetProperties[0])
						.have.property(testnetProperties[1])
						.be.true();
				});

				it('should inform the user that the config has not been updated', () => {
					(capturedOutput[1]).should.be.equal(invalidValueResult);
				});
			});

			describe('to true', () => {
				beforeEach(() => {
					return vorpal.exec(setTestnetTrueCommand);
				});

				it('should set testnet to true on the lisk instance', () => {
					(setTestnetStub.calledWithExactly(true)).should.be.true();
				});

				it('should set json to true in the in-memory config', () => {
					(env)
						.should.have.property(testnetProperties[0])
						.have.property(testnetProperties[1])
						.be.true();
				});

				it('should set testnet to true in the config file', () => {
					const config = fse.readJsonSync(configFilePath);

					(config)
						.should.have.property(testnetProperties[0])
						.have.property(testnetProperties[1])
						.be.true();
				});

				it('should inform the user that the config has been updated to true', () => {
					(capturedOutput[0]).should.be.equal(setTestnetTrueResult);
				});
			});

			describe('to false', () => {
				beforeEach(() => {
					return vorpal.exec(setTestnetFalseCommand);
				});

				it('should set testnet to false on the lisk instance', () => {
					(setTestnetStub.calledWithExactly(false)).should.be.true();
				});

				it('should set json to false in the in-memory config', () => {
					(env)
						.should.have.property(testnetProperties[0])
						.have.property(testnetProperties[1])
						.be.false();
				});

				it('should set testnet to false in the config file', () => {
					const config = fse.readJsonSync(configFilePath);

					(config)
						.should.have.property(testnetProperties[0])
						.have.property(testnetProperties[1])
						.be.false();
				});

				it('should inform the user that the config has been updated to false', () => {
					(capturedOutput[0]).should.be.equal(setTestnetFalseResult);
				});
			});
		});
	});
});
